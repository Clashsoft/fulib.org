import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model} from 'mongoose';
import {SearchService} from '../search/search.service';
import {CreateEvaluationDto, UpdateEvaluationDto} from './evaluation.dto';
import {CodeSearchInfo, Evaluation, EvaluationDocument, Snippet} from './evaluation.schema';

@Injectable()
export class EvaluationService {
  constructor(
    @InjectModel('evaluations') private model: Model<Evaluation>,
    private searchService: SearchService,
  ) {
  }

  async create(assignment: string, solution: string, dto: CreateEvaluationDto, createdBy?: string): Promise<Evaluation> {
    const {codeSearch, ...rest} = dto;
    const evaluation = await this.model.create({
      assignment,
      solution,
      createdBy,
      ...rest,
    });
    if (codeSearch && dto.snippets.length) {
      evaluation.codeSearch = await this.codeSearchCreate(assignment, evaluation._id, dto);
    }
    return evaluation;
  }

  async findAll(where: FilterQuery<Evaluation> = {}): Promise<Evaluation[]> {
    return this.model.find(where).exec();
  }

  async findOne(id: string): Promise<Evaluation | null> {
    return this.model.findById(id).exec();
  }

  async update(id: string, dto: UpdateEvaluationDto): Promise<Evaluation | null> {
    const {codeSearch, ...rest} = dto;
    const evaluation = await this.model.findByIdAndUpdate(id, rest, {new: true}).exec();
    if (evaluation && codeSearch && dto.snippets && dto.snippets.length) {
      evaluation.codeSearch = {
        ...evaluation.codeSearch,
        ...await this.codeSearchUpdate(evaluation.assignment, id, dto),
      };
    }
    return evaluation;
  }

  async remove(id: string): Promise<Evaluation | null> {
    const deleted = await this.model.findByIdAndDelete(id).exec();
    if (deleted) {
      deleted.codeSearch = await this.codeSearchDelete(deleted);
    }
    return deleted;
  }

  private async codeSearch(assignment: string, snippets: Snippet[]): Promise<[string, Snippet[] | undefined][]> {
    const resultss = await Promise.all(snippets.map(snippet => this.searchService.find(assignment, snippet.code)));
    const solutions: Record<string, Snippet[][]> = {};
    for (let results of resultss) {
      for (let result of results) {
        (solutions[result.solution] ??= []).push(result.snippets);
      }
    }
    return Object.entries(solutions)
      .map(([solution, snippetss]) => {
        if (snippetss.find(snippets => !snippets.length)) {
          // remove solutions where any original snippet was not found
          return [solution, undefined];
        }
        return [solution, snippetss.flat()];
      })
    ;
  }

  private async codeSearchCreate(assignment: string, origin: string, dto: CreateEvaluationDto): Promise<CodeSearchInfo> {
    const solutions = await this.codeSearch(assignment, dto.snippets);
    const result = await this.model.bulkWrite(solutions.filter(s => s[1]).map(([solution, snippets]) => {
      const filter: FilterQuery<Evaluation> = {
        assignment,
        solution,
        task: dto.task,
      };
      const newEvaluation: Partial<Evaluation> = {
        ...dto,
        assignment,
        solution,
        author: 'Code Search',
        snippets: snippets!,
        codeSearch: {origin},
      };
      return {
        updateOne: {
          filter,
          update: {$setOnInsert: newEvaluation},
          upsert: true,
        },
      };
    }));
    return {created: result.upsertedCount};
  }

  private async codeSearchUpdate(assignment: string, origin: string, dto: UpdateEvaluationDto): Promise<Partial<CodeSearchInfo>> {
    const solutions = await this.codeSearch(assignment, dto.snippets!);
    const result = await this.model.bulkWrite(solutions.map(([solution, snippets]) => {
      const filter: FilterQuery<Evaluation> = {
        assignment,
        solution,
        task: dto.task,
        author: 'Code Search',
        'codeSearch.origin': origin,
      };

      if (!snippets) {
        return {deleteOne: {filter}};
      }

      const updatedEvaluation: UpdateEvaluationDto = {
        ...dto,
        snippets,
      };
      return {
        updateOne: {
          filter,
          update: {$set: updatedEvaluation},
        },
      };
    }));
    return {updated: result.modifiedCount, deleted: result.deletedCount};
  }

  private async codeSearchDelete(evaluation: EvaluationDocument): Promise<Partial<CodeSearchInfo>> {
    const result = await this.model.deleteMany({
      assignment: evaluation.assignment,
      task: evaluation.task,
      author: 'Code Search',
      'codeSearch.origin': evaluation.id,
    }).exec();
    return {deleted: result.deletedCount};
  }
}
