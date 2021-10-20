import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {
  IsAlphanumeric,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {Document} from 'mongoose';

export class Location {
  @Prop()
  @ApiProperty({type: 'integer', minimum: 0})
  @IsInt()
  @Min(0)
  line: number;

  @Prop()
  @ApiProperty({type: 'integer', minimum: 0})
  @IsInt()
  @Min(0)
  character: number;
}

export class Snippet {
  @Prop()
  @ApiProperty()
  @IsString()
  file: string;

  @Prop()
  @ApiProperty()
  @ValidateNested()
  @Type(() => Location)
  from: Location;

  @Prop()
  @ApiProperty()
  @ValidateNested()
  @Type(() => Location)
  to: Location;

  @Prop()
  @ApiProperty()
  @IsString()
  code: string;

  @Prop()
  @ApiProperty()
  @IsString()
  comment: string;
}

@Schema({timestamps: true})
export class Evaluation {
  @Prop()
  @ApiProperty()
  @IsMongoId()
  assignment: string;

  @Prop()
  @ApiProperty()
  @IsMongoId()
  solution: string;

  @Prop()
  @ApiProperty()
  @IsAlphanumeric()
  @IsNotEmpty()
  task: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @Prop()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  createdBy?: string;

  @Prop()
  @ApiProperty()
  @IsString()
  author: string;

  @Prop()
  @ApiProperty()
  @IsString()
  remark: string;

  @Prop()
  @ApiProperty()
  @IsNumber()
  points: number;

  @Prop()
  @ApiProperty({type: [Snippet]})
  @ValidateNested({each: true})
  @Type(() => Snippet)
  snippets: Snippet[];
}

export type EvaluationDocument = Evaluation & Document;

export const EvaluationSchema = SchemaFactory.createForClass(Evaluation)
  .index({assignment: 1, solution: 1})
  .index({assignment: 1, solution: 1, 'snippets.file': 1})
  .index({assignment: 1, solution: 1, task: 1}, {unique: true})
;
