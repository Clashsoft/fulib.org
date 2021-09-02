import {OmitType, PartialType} from '@nestjs/swagger';
import {Solution} from './solution.schema';

export class CreateSolutionDto extends OmitType(Solution, [
  'token',
  'assignment',
  'creator',
  'timestamp',
  'results',
] as const) {
}

export class UpdateSolutionDto extends PartialType(OmitType(CreateSolutionDto, [
  'solution',
] as const)) {
}

export class ReadSolutionDto extends OmitType(Solution, [
  'token',
]) {
  /*
  @Prop()
  @ApiProperty()
  @IsString()
  assignee: string;
   */
}
