export class Evaluation {
  assignment: string;
  solution: string;
  task: string;
  _id: string;

  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  author: string;
  remark: string;
  points: number;
  snippets: never[]; // TODO
}

export type CreateEvaluationDto = Omit<Evaluation, '_id' | 'assignment' | 'solution' | 'createdAt' | 'createdBy' | 'updatedAt'>;

export type UpdateEvaluationDto = Partial<CreateEvaluationDto>;