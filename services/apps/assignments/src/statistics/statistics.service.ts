import {Injectable, NotFoundException} from '@nestjs/common';
import {AssignmentDocument, Task} from '../assignment/assignment.schema';
import {AssignmentService} from '../assignment/assignment.service';
import {CommentService} from '../comment/comment.service';
import {EvaluationService} from '../evaluation/evaluation.service';
import {SolutionService} from '../solution/solution.service';
import {TelemetryService} from '../telemetry/telemetry.service';
import {AssignmentStatistics, EvaluationStatistics, SolutionStatistics, TaskStatistics} from './statistics.dto';

const outlierDurationMillis = 60 * 1000;

@Injectable()
export class StatisticsService {
  constructor(
    private assignmentService: AssignmentService,
    private solutionService: SolutionService,
    private evaluationService: EvaluationService,
    private commentService: CommentService,
    private telemetryService: TelemetryService,
  ) {
  }

  private buildTaskMap(tasks: Task[], map: Map<string, Task>): void {
    for (const task of tasks) {
      map.set(task._id, task);
      this.buildTaskMap(task.children, map);
    }
  }

  async getAssignmentStatistics(assignment: string): Promise<AssignmentStatistics> {
    const assignmentDoc = await this.assignmentService.findOne(assignment);
    if (!assignmentDoc) {
      throw new NotFoundException(assignment);
    }

    const tasks = new Map<string, Task>();
    this.buildTaskMap(assignmentDoc.tasks, tasks);

    const taskStats = new Map<string, TaskStatistics>();
    for (const task of tasks.keys()) {
      taskStats.set(task, {
        task,
        points: this.createEmptyEvaluationStatistics(),
        count: this.createEmptyEvaluationStatistics(),
        timeAvg: 0,
      });
    }

    const evaluationStatistics = this.createEmptyEvaluationStatistics();
    const weightedEvaluationStatistics = this.createEmptyEvaluationStatistics();
    for await (const {
      codeSearch,
      points,
      task,
      author,
    } of this.evaluationService.model.find({assignment}).select('codeSearch points task author')) {
      const taskStat = taskStats.get(task);
      if (!taskStat) { // orphaned, ignore
        continue;
      }

      let key: keyof EvaluationStatistics;
      if (codeSearch?.origin) {
        if (author === 'Code Search') {
          key = 'codeSearch';
        } else {
          key = 'editedCodeSearch';
        }
      } else {
        key = 'manual';
      }

      const pointsWeight = Math.abs(tasks.get(task)?.points ?? 0);
      evaluationStatistics[key]++;
      evaluationStatistics.total++;
      weightedEvaluationStatistics[key] += pointsWeight;
      weightedEvaluationStatistics.total += pointsWeight;
      taskStat.points[key] += points;
      taskStat.points.total += points;
      taskStat.count[key]++;
      taskStat.count.total++;
    }

    let eventCount = 0;
    let totalTime = 0;
    let weightedTime = 0;
    let codeSearchSavings = 0;
    for (const result of await this.telemetryService.model.aggregate([
      {$match: {assignment, action: {$in: ['openEvaluation', 'submitEvaluation']}}},
      {$sort: {timestamp: 1}},
      {$group: {_id: {s: '$solution', t: '$task'} as any, events: {$push: '$$ROOT'}}},
      {
        // end = events.filter(e => e.action === 'submitEvaluation')
        $addFields: {
          end: {
            $last: {
              $filter: {
                input: '$events', cond: {
                  $eq: ['$$this.action', 'submitEvaluation'],
                },
              },
            } as any, // TODO rejected by Mongoose types for some reason
          },
        },
      },
      {
        // start = events.filter(e => e.action === 'openEvaluation' && e.timestamp < end.timestamp)
        $addFields: {
          start: {
            $last: {
              $filter: {
                input: '$events',
                cond: {
                  $and: [
                    {$eq: ['$$this.action', 'openEvaluation']},
                    {$lt: ['$$this.timestamp', '$end.timestamp']},
                  ],
                },
              },
            } as any, // TODO rejected by Mongoose types for some reason
          },
        },
      },
      {$project: {duration: {$subtract: ['$end.timestamp', '$start.timestamp']}}},
      {$match: {duration: {$lt: outlierDurationMillis}}},
      {$group: {_id: '$_id.t' as any, time: {$sum: '$duration'}, count: {$sum: 1}}},
    ])) {
      const {_id, time, count} = result;
      const taskStat = taskStats.get(_id);
      if (taskStat) {
        taskStat.timeAvg = time / count;
        codeSearchSavings += taskStat.count.codeSearch * taskStat.timeAvg;
      }
      eventCount += count;
      totalTime += time;
      weightedTime += time / Math.abs(tasks.get(_id)?.points ?? 1);
    }

    const comments = await this.commentService.model.find({
      assignment,
    }).count().exec();

    return {
      solutions: await this.solutionStatistics(assignmentDoc),
      evaluations: evaluationStatistics,
      weightedEvaluations: weightedEvaluationStatistics,
      time: {
        evaluationTotal: totalTime,
        evaluationAvg: totalTime / eventCount,
        pointsAvg: weightedTime / eventCount,
        codeSearchSavings,
      },
      comments,
      tasks: Array.from(taskStats.values()),
    };
  }

  private createEmptyEvaluationStatistics() {
    return {codeSearch: 0, editedCodeSearch: 0, manual: 0, total: 0};
  }

  private async solutionStatistics(assignment: AssignmentDocument): Promise<SolutionStatistics> {
    const passingMin = assignment.tasks.reduce((a, c) => c.points > 0 ? a + c.points : a, 0) / 2;
    let pointsTotal = 0;
    let graded = 0;
    let total = 0;
    let passed = 0;
    for await (const {points} of this.solutionService.model.find({assignment: assignment.id}).select('points')) {
      total++;

      if (points === undefined) {
        continue;
      }

      pointsTotal += points;
      graded++;

      if (points < passingMin) {
        continue;
      }
      passed++;
    }
    const evaluated = (await this.evaluationService.findUnique('solution', {assignment: assignment.id})).length;
    return {
      total,
      evaluated,
      graded,
      passed,
      pointsAvg: pointsTotal / graded,
    };
  }
}
