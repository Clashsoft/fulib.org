import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {forkJoin, Subscription} from 'rxjs';
import {map, switchMap, tap} from 'rxjs/operators';
import {ReadAssignmentDto} from '../../../model/assignment';
import {Evaluation} from '../../../model/evaluation';
import Solution from '../../../model/solution';
import {AssignmentService} from '../../../services/assignment.service';
import {SolutionService} from '../../../services/solution.service';
import {TaskService} from '../../../services/task.service';
import {EvaluationService} from "../../../services/evaluation.service";

@Component({
  selector: 'app-solution-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
})
export class SolutionTasksComponent implements OnInit, OnDestroy {
  assignment?: ReadAssignmentDto;
  solution?: Solution;
  points?: Record<string, number>;
  evaluations?: Record<string, Evaluation>;

  subscription?: Subscription;

  constructor(
    private assignmentService: AssignmentService,
    private evaluationService: EvaluationService,
    private solutionService: SolutionService,
    private taskService: TaskService,
    private route: ActivatedRoute,
  ) {
  }

  ngOnInit(): void {
    this.route.params.pipe(
      switchMap(({aid, sid}) => this.solutionService.get(aid, sid)),
    ).subscribe(solution => this.solution = solution);

    this.route.params.pipe(
      switchMap(({aid, sid}) => forkJoin([
        this.assignmentService.get(aid).pipe(tap(assignment => this.assignment = assignment)),
        this.evaluationService.findAll(aid, sid).pipe(map(evaluations => {
          this.evaluations = {};
          for (const evaluation of evaluations) {
            this.evaluations[evaluation.task] = evaluation;
          }
          return this.evaluations;
        })),
      ])),
    ).subscribe(([assignment, evaluations]) => {
      this.points = this.taskService.createPointsCache(assignment.tasks, evaluations);
    });

    this.subscription = this.route.params.pipe(
      switchMap(({aid, sid}) => this.evaluationService.stream(aid, sid)),
    ).subscribe(({event, evaluation}) => {
      if (!this.assignment || !this.evaluations) {
        return;
      }

      const task = evaluation.task;
      if (event === 'deleted') {
        delete this.evaluations[task];
      } else {
        this.evaluations[task] = evaluation;
      }

      if (!this.points) {
        return;
      }

      // Clear cache for affected tasks
      const tasks = this.taskService.findWithParents(this.assignment.tasks, task);
      for (let task of tasks) {
        delete this.points[task._id];
      }

      // Restore cache
      for (let task of this.assignment.tasks) {
        this.taskService.getTaskPoints(task, this.evaluations, this.points);
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}
