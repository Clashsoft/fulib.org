import {ApiProperty, ApiPropertyOptional, OmitType, PartialType, PickType} from '@nestjs/swagger';
import {AuthorInfo, Solution} from '../solution/solution.schema';
import {Course} from './course.schema';

export class CreateCourseDto extends OmitType(Course, [
  '_id',
  'createdBy',
] as const) {
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
}

export class SolutionSummary extends PickType(Solution, [
  'points',
] as const) {
  @ApiProperty()
  _id: string;

  @ApiPropertyOptional()
  assignee?: string;
}

export class CourseStudent {
  @ApiProperty()
  author: AuthorInfo;

  @ApiProperty({type: [SolutionSummary]})
  solutions: (SolutionSummary | null)[];

  @ApiProperty()
  feedbacks: number;
}
