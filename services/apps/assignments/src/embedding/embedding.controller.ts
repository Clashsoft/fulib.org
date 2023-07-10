import {Controller, Get, Param, Query} from '@nestjs/common';
import {ApiExtraModels, ApiOkResponse, ApiTags, refs} from "@nestjs/swagger";
import {AssignmentAuth} from "../assignment/assignment-auth.decorator";
import {Embeddable, SnippetEmbeddable, TaskEmbeddable} from "./embedding.dto";
import {EmbeddingService} from "./embedding.service";
import {notFound} from "@mean-stream/nestx";

@Controller('assignment/:assignment')
@ApiTags('Embeddings')
export class EmbeddingController {
  constructor(
    private readonly embeddingService: EmbeddingService,
  ) {
  }

  @Get('solutions/:solution/embeddings')
  @ApiExtraModels(TaskEmbeddable, SnippetEmbeddable)
  @ApiOkResponse({schema: {oneOf: refs(TaskEmbeddable, SnippetEmbeddable)}})
  @AssignmentAuth({forbiddenResponse: 'You are not allowed to view this solution.'})
  async getSolutionEmbeddings(
    @Param('assignment') assignment: string,
    @Param('solution') solution: string,
    @Query('task') task: string,
  ): Promise<Embeddable[]> {
    const taskEmbedding = await this.embeddingService.find(task) || notFound(task);
    return this.embeddingService.getNearest({
      assignment,
      solution,
      embedding: taskEmbedding.embedding,
    });
  }
}
