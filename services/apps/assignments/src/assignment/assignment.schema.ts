import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {Transform, Type} from 'class-transformer';
import {
  IsAlphanumeric,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString, IsUrl,
  ValidateNested,
} from 'class-validator';
import {Document} from 'mongoose';

export class Task {
  @Prop()
  @ApiProperty()
  @IsAlphanumeric()
  @IsNotEmpty()
  _id: string;

  @Prop()
  @ApiProperty()
  @IsString()
  description: string;

  @Prop()
  @ApiProperty()
  @IsNumber()
  points: number;

  @Prop()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  verification?: string;

  @Prop()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  glob?: string;

  @Prop({default: []})
  @ApiProperty({type: [Task]})
  @ValidateNested({each: true})
  @Type(() => Task)
  children: Task[];
}

export class ClassroomInfo {
  @Prop()
  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  org?: string;

  @Prop()
  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  prefix?: string;

  @Prop()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  token?: string;

  @Prop()
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  webhook?: string;

  @Prop()
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  codeSearch?: boolean;
}

@Schema({
  toJSON: {
    transform: (doc, ret) => {
      delete ret.classroom?.token;
      return ret;
    },
  },
})
export class Assignment {
  @Prop()
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @Prop()
  @ApiProperty()
  token: string;

  @Prop()
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @Prop()
  @ApiProperty()
  @IsString()
  description: string;

  @Prop({index: 1})
  @ApiPropertyOptional()
  createdBy?: string;

  @Prop()
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  author: string;

  @Prop()
  @ApiProperty()
  @IsEmail()
  email: string;

  @Prop({index: 1})
  @ApiProperty({required: false})
  @IsOptional()
  @IsDate()
  @Transform(({value}) => typeof value === 'string' ? new Date(value) : value)
  deadline?: Date;

  @Prop()
  @ApiProperty({required: false})
  @IsOptional()
  @ValidateNested()
  @Type(() => ClassroomInfo)
  classroom?: ClassroomInfo;

  @Prop()
  @ApiProperty({type: [Task]})
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => Task)
  tasks: Task[];

  @Prop()
  @ApiProperty()
  @IsString()
  solution: string;

  @Prop()
  @ApiProperty()
  @IsString()
  templateSolution: string;
}

export type AssignmentDocument = Assignment & Document;

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);
