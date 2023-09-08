import {ApiProperty, PickType} from "@nestjs/swagger";
import {ArrayMaxSize, ArrayMinSize, IsIn, IsInt, IsMongoId, IsNumber, IsString} from "class-validator";

export class EmbeddingEstimate {
  @ApiProperty()
  @IsInt()
  tokens: number;

  @ApiProperty()
  @IsNumber({maxDecimalPlaces: 2})
  estimatedCost: number;
}

export class EmbeddableBase {
  @ApiProperty()
  id: string;

  @ApiProperty()
  @IsIn(['task', 'snippet'])
  type: string;

  @ApiProperty()
  @IsMongoId()
  assignment: string;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty()
  @IsNumber({}, {each: true})
  @ArrayMinSize(1536)
  @ArrayMaxSize(1536)
  embedding: number[];
}

export class TaskEmbeddable extends EmbeddableBase {
  @ApiProperty()
  type: 'task';

  @ApiProperty()
  @IsMongoId()
  task: string;
}

export class SnippetEmbeddable extends EmbeddableBase {
  @ApiProperty()
  type: 'snippet';

  @ApiProperty()
  @IsMongoId()
  solution: string;

  @ApiProperty()
  @IsString()
  file: string;

  @ApiProperty()
  @IsInt()
  line: number;
}

export type Embeddable = TaskEmbeddable | SnippetEmbeddable;

export type EmbeddableSearch = Partial<Embeddable>;
