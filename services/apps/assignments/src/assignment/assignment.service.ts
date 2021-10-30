import {EventService} from '@app/event';
import {UserToken} from '@app/keycloak-auth';
import {HttpService} from '@nestjs/axios';
import {Injectable} from '@nestjs/common';
import {InjectConnection, InjectModel} from '@nestjs/mongoose';
import {Connection, FilterQuery, Model} from 'mongoose';
import {environment} from '../environment';
import {CreateEvaluationDto} from '../evaluation/evaluation.dto';
import {generateToken, idFilter} from '../utils';
import {CreateAssignmentDto, ReadAssignmentDto, UpdateAssignmentDto} from './assignment.dto';
import {Assignment, AssignmentDocument, Task} from './assignment.schema';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectModel('assignments') private model: Model<Assignment>,
    @InjectConnection() connection: Connection,
    private http: HttpService,
    private eventService: EventService,
  ) {
    connection.once('connected', () => this.migrate());
  }

  async migrate() {
    const result = await this.model.updateMany({}, {
      $rename: {
        userId: 'createdBy',
      },
      $unset: {
        descriptionHtml: 1,
      },
    });
    console.info('Migrated', result.modifiedCount, 'assignments');
  }

  async check(solution: string, {tasks}: Pick<Assignment, 'tasks'>): Promise<CreateEvaluationDto[]> {
    const results = await Promise.all(tasks.map(task => this.checkTasksRecursively(solution, task)));
    return results.flatMap(x => x);
  }

  async checkTasksRecursively(solution: string, task: Task): Promise<CreateEvaluationDto[]> {
    const [first, rest] = await Promise.all([
      this.checkTask(solution, task),
      Promise.all(task.children.map(t => this.checkTasksRecursively(solution, t))),
    ]);
    const flatRest = rest.flatMap(x => x);
    return first ? [first, ...flatRest] : flatRest;
  }

  async checkTask(solution: string, task: Task): Promise<CreateEvaluationDto | undefined> {
    if (!task.verification) {
      return undefined;
    }
    const response = await this.http.post(`${environment.compiler.apiUrl}/runcodegen`, {
      privacy: 'none',
      packageName: 'org.fulib.assignments',
      scenarioFileName: 'Scenario.md',
      scenarioText: `# Solution\n\n${solution}\n\n## Verification\n\n${task.verification}\n\n`,
    }).toPromise();
    return {
      task: task._id,
      author: 'Autograding',
      remark: response?.data.output ?? '',
      points: response?.data.exitCode === 0 ? Math.max(task.points, 0) : Math.min(task.points, 0),
      snippets: [],
    };
  }

  createPointsCache(tasks: Task[], evaluations: Record<string, CreateEvaluationDto>): Record<string, number> {
    const cache = {};
    for (let task of tasks) {
      this.getTaskPoints(task, evaluations, cache);
    }
    return cache;
  }

  private getTaskPoints(task: Task, evaluations: Record<string, CreateEvaluationDto>, cache: Record<string, number>): number {
    return cache[task._id] ??= this.calculateTaskPoints(task, evaluations, cache);
  }

  private calculateTaskPoints(task: Task, evaluations: Record<string, CreateEvaluationDto>, cache: Record<string, number>): number {
    const evaluation = evaluations?.[task._id];
    if (evaluation) {
      // An evaluation overrides children.
      return evaluation.points;
    }

    if (!task.children.length) {
      // A task with positive points but no children defaults to being failed.
      return 0;
    }

    const positiveChildDeduction = task.children.reduce((a, c) => c.points > 0 ? a + c.points : a, 0);
    // A task with children is granted, by default, its total points minus the total of positive children
    const basePoints = task.points - positiveChildDeduction;
    const childSum = task.children.reduce((a, c) => a + this.getTaskPoints(c, evaluations, cache), 0);
    return basePoints + childSum;
  }

  async create(dto: CreateAssignmentDto, userId?: string): Promise<AssignmentDocument> {
    const token = generateToken();
    const created = await this.model.create({
      ...dto,
      token,
      createdBy: userId,
    });
    created && this.emit('created', created._id, created);
    return created;
  }

  async findAll(where: FilterQuery<Assignment> = {}): Promise<ReadAssignmentDto[]> {
    return this.model.find(where).select(['-token', '-solution', '-tasks.verification']).exec();
  }

  async findOne(id: string): Promise<AssignmentDocument | null> {
    return this.model.findOne(idFilter(id)).exec();
  }

  mask(assignment: Assignment): ReadAssignmentDto {
    const {token, solution, tasks, ...rest} = assignment;
    return {
      ...rest,
      tasks: assignment.tasks.map(({verification, ...rest}) => rest),
    } as ReadAssignmentDto;
  }

  async update(id: string, dto: UpdateAssignmentDto): Promise<Assignment | null> {
    const updated = await this.model.findOneAndUpdate(idFilter(id), dto, {new: true}).exec();
    updated && this.emit('updated', id, updated);
    return updated;
  }

  async remove(id: string): Promise<AssignmentDocument | null> {
    const deleted = await this.model.findOneAndDelete(idFilter(id)).exec();
    deleted && this.emit('deleted', id, deleted);
    return deleted;
  }

  isAuthorized(assignment: Assignment, user?: UserToken, token?: string): boolean {
    return assignment.token === token || !!user && user.sub === assignment.createdBy;
  }

  private emit(action: string, id: string, assignment: Assignment) {
    const users = [assignment.token, assignment.createdBy].filter(i => i);
    this.eventService.emit(`assignment.${id}.${action}`, assignment, users);
  }
}
