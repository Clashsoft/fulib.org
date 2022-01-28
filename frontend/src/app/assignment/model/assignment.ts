import Task from './task';

export default class Assignment {
  _id: string;
  token?: string;

  title: string;
  description: string;
  createdBy?: string;
  author: string;
  email: string;
  deadline?: Date | string;

  classroom?: {
    org?: string;
    prefix?: string;
    token?: string;
    codeSearch?: boolean;
  };

  tasks: Task[];
  solution: string;
  templateSolution: string;

  static comparator = (a: Assignment, b: Assignment) => a.title.localeCompare(b.title) || a._id.localeCompare(b._id);
}

export type CreateAssignmentDto = Omit<Assignment, '_id' | 'token' | 'createdBy'>;

export interface UpdateAssignmentDto extends Partial<CreateAssignmentDto> {
  token?: true;
}
