import {EventService} from '@mean-stream/nestx';
import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, Types} from 'mongoose';
import {AuthorInfo} from '../solution/solution.schema';
import {SolutionService} from '../solution/solution.service';
import {CourseStudent, CreateCourseDto, UpdateCourseDto} from './course.dto';
import {Course, CourseDocument} from './course.schema';
import {MemberService} from "@app/member";

@Injectable()
export class CourseService {
  constructor(
    @InjectModel(Course.name) private model: Model<Course>,
    private solutionService: SolutionService,
    private eventService: EventService,
    private memberService: MemberService,
  ) {
  }

  async create(dto: CreateCourseDto, userId?: string): Promise<CourseDocument> {
    const created = await this.model.create({
      ...dto,
      createdBy: userId,
    });
    this.emit('created', created);
    return created;
  }

  async findAll(filter: FilterQuery<Course> = {}): Promise<CourseDocument[]> {
    return this.model.find(filter).exec();
  }

  async findOne(id: string): Promise<CourseDocument | null> {
    return this.model.findById(id).exec();
  }

  async getStudents(id: string, user: string): Promise<CourseStudent[]> {
    const course = await this.findOne(id);
    if (!course) {
      return [];
    }

    const userMembers = await this.memberService.findAll({
      parent: {$in: course.assignments.map(a => new Types.ObjectId(a))},
      user,
    });
    const courseAssignmentsWhereUserIsMember = userMembers.map(m => m.parent.toString());
    if (!courseAssignmentsWhereUserIsMember.length) {
      return [];
    }

    const students = new Map<string, CourseStudent>();
    const solutions = await this.solutionService.model.aggregate([
      {$match: {assignment: {$in: courseAssignmentsWhereUserIsMember}}},
      {$addFields: {id: {$toString: '$_id'}}},
      {
        $lookup: {
          from: 'assignees',
          localField: 'id',
          foreignField: 'solution',
          as: '_assignees',
        },
      },
      {$addFields: {assignee: {$first: '$_assignees.assignee'}}},
      {
        $project: {
          assignment: 1,
          _id: 1,
          assignee: 1,
          author: 1,
          points: 1,
          feedback: 1,
        },
      },
      {$sort: {'author.name': 1, 'author.github': 1}},
    ], {
      collation: {
        locale: 'en',
        caseFirst: 'off',
      },
    });

    const keys: (keyof AuthorInfo)[] = ['studentId', 'email', 'github', 'name'];
    for (const solution of solutions) {
      const {assignment, _id, assignee, author, points, feedback} = solution;
      let student: CourseStudent | undefined = undefined;
      for (const key of keys) {
        const value = author[key];
        if (value && (student = students.get(value))) {
          break;
        }
      }
      if (!student) {
        student = {
          author,
          solutions: Array(course.assignments.length).fill(null),
          feedbacks: 0,
        };
      }
      for (const key of keys) {
        const value = author[key];
        if (value) {
          students.set(value, student);
        }
      }

      const index = course.assignments.indexOf(assignment);
      student.solutions[index] = {
        _id: _id.toString(),
        points,
        assignee,
      };
      if (feedback && feedback.appropriate && feedback.helpful && feedback.understandable) {
        student.feedbacks++;
      }
    }
    return Array.from(new Set(students.values()));
  }

  async update(id: string, dto: UpdateCourseDto): Promise<Course | null> {
    const updated = await this.model.findByIdAndUpdate(id, dto, {new: true}).exec();
    updated && this.emit('updated', updated);
    return updated;
  }

  async remove(id: string): Promise<CourseDocument | null> {
    const deleted = await this.model.findByIdAndDelete(id).exec();
    deleted && this.emit('deleted', deleted);
    return deleted;
  }

  private emit(event: string, course: CourseDocument) {
    this.eventService.emit(`courses.${course.id}.${event}`, course);
  }
}
