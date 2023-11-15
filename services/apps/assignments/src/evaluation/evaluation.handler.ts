import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {SolutionDocument} from '../solution/solution.schema';
import {EvaluationService} from './evaluation.service';
import {Types} from "mongoose";

@Injectable()
export class EvaluationHandler {
  constructor(
    private evaluationService: EvaluationService,
  ) {
  }

  @OnEvent('assignments.*.solutions.*.deleted')
  async onSolutionDeleted(solution: SolutionDocument) {
    await this.evaluationService.removeAll({
      assignment: new Types.ObjectId(solution.assignment),
      solution: solution._id,
    });
  }
}
