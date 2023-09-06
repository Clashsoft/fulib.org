import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Params} from '@angular/router';
import {forkJoin, Observable, of} from 'rxjs';
import {map, switchMap, tap} from 'rxjs/operators';
import {environment} from '../../../environments/environment';
import {StorageService} from '../../services/storage.service';
import {UserService} from '../../user/user.service';
import {Assignee} from '../model/assignee';
import Assignment, {ReadAssignmentDto} from '../model/assignment';
import {CheckResult, CheckSolution} from '../model/check';
import Comment from '../model/comment';
import {
  CreateEvaluationDto,
  Evaluation,
  FilterEvaluationParams,
  RemarkDto,
  Snippet,
  UpdateEvaluationDto,
} from '../model/evaluation';

import Solution, {AuthorInfo, EstimatedCosts, ImportSolution} from '../model/solution';
import {AssignmentService} from './assignment.service';
import {observeSSE} from './sse-helper';

function asID(id: { _id?: string, id?: string } | string): string {
  return typeof id === 'string' ? id : id._id! || id.id!;
}

@Injectable({
  providedIn: 'root',
})
export class SolutionService {
  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private assignmentService: AssignmentService,
    private users: UserService,
  ) {
  }

  // --------------- Solution Drafts ---------------

  getAuthor(): AuthorInfo | undefined {
    const json = this.storageService.get('solutionAuthor');
    return json ? JSON.parse(json) : undefined;
  }

  setAuthor(value: AuthorInfo) {
    this.storageService.set('solutionAuthor', JSON.stringify(value));
  }

  getDraft(assignment: string): string | null {
    return this.storageService.get(`solutionDraft/${assignment}`);
  }

  setDraft(assignment: string, solution: string | null): void {
    this.storageService.set(`solutionDraft/${assignment}`, solution);
  }

  // --------------- Comment Drafts ---------------

  getCommentDraft(solution: Solution | string): string | null {
    const solutionID = asID(solution);
    return this.storageService.get(`commentDraft/${solutionID}`);
  }

  setCommentDraft(solution: Solution | string, draft: string | null) {
    const solutionID = asID(solution);
    this.storageService.set(`commentDraft/${solutionID}`, draft);
  }

  // --------------- Tokens ---------------

  getToken(assignment: Assignment | string, id: string): string | null {
    const assignmentID = asID(assignment);
    return this.storageService.get(`solutionToken/${assignmentID}/${id}`);
  }

  setToken(assignment: Assignment | string, id: string, token: string | null): void {
    const assignmentID = asID(assignment);
    this.storageService.set(`solutionToken/${assignmentID}/${id}`, token);
  }

  getOwnIds(assignment?: Assignment | string): { assignment: string, id: string }[] {
    const assignmentID = assignment ? asID(assignment) : null;

    const pattern = /^solutionToken\/(.*)\/(.*)$/;
    const ids: { assignment: string, id: string; }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      const match = pattern.exec(key);
      if (!match) {
        continue;
      }

      const matchedAssignmentID = match[1] as string;
      if (assignmentID && matchedAssignmentID !== assignmentID) {
        continue;
      }

      const id = match[2] as string;
      ids.push({assignment: matchedAssignmentID, id});
    }

    return ids;
  }

  getOwnWithAssignments(): Observable<[ReadAssignmentDto[], Solution[]]> {
    return this.users.getCurrent().pipe(
      switchMap(user => {
        if (user && user.id) {
          return this.getOwn().pipe(switchMap(solutions => {
            const assignmentIds = [...new Set<string>(solutions.map(s => s.assignment))];
            const assignments = this.assignmentService.findAll(assignmentIds);

            return forkJoin([assignments, of(solutions)]);
          }));
        } else {
          const compoundIds = this.getOwnIds();
          const assignmentIds = [...new Set<string>(compoundIds.map(id => id.assignment))];
          const assignments = this.assignmentService.findAll(assignmentIds);
          const solutions = forkJoin(compoundIds.map(cid => this.get(cid.assignment, cid.id)));

          return forkJoin([assignments, solutions]);
        }
      }),
    );
  }

  // --------------- HTTP Methods ---------------

  check(solution: CheckSolution): Observable<CheckResult> {
    return this.http.post<CheckResult>(`${environment.assignmentsApiUrl}/assignments/${solution.assignment._id}/check`, solution);
  }

  submit(solution: Solution): Observable<Solution> {
    return this.http.post<Solution>(`${environment.assignmentsApiUrl}/assignments/${solution.assignment}/solutions`, solution).pipe(
      tap(response => this.setToken(solution.assignment, response._id!, response.token!)),
    );
  }

  previewImport(assignment: string): Observable<ImportSolution[]> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);
    return this.http.get<ImportSolution[]>(`${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/import`, {headers});
  }

  import(assignment: string, files?: File[], usernames?: string[]): Observable<ImportSolution[]> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);
    let body;
    if (files && files.length) {
      const data = new FormData();
      for (let file of files) {
        data.append('files', file, file.name);
      }
      body = data;
    }
    return this.http.post<ImportSolution[]>(`${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/import`, body, {
      headers,
      params: usernames ? {usernames} : undefined,
    });
  }

  estimateCosts(assignment: string): Observable<EstimatedCosts> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);
    return this.http.get<EstimatedCosts>(`${environment.assignmentsApiUrl}/assignments/${assignment}/embeddings`, {headers});
  }

  importEmbeddings(assignment: string): Observable<EstimatedCosts> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);
    return this.http.post<EstimatedCosts>(`${environment.assignmentsApiUrl}/assignments/${assignment}/embeddings`, {}, {headers});
  }

  get(assignment: Assignment | string, id: string): Observable<Solution> {
    const assignmentID = asID(assignment);
    const headers = {};
    this.addSolutionToken(headers, assignmentID, id);
    this.addAssignmentToken(headers, assignmentID);
    return this.http.get<Solution>(`${environment.assignmentsApiUrl}/assignments/${assignmentID}/solutions/${id}`, {headers});
  }

  getAll(assignment: string, search?: string): Observable<Solution[]> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);
    const params: Params = {};
    search && (params.q = search);
    return this.http.get<Solution[]>(`${environment.assignmentsApiUrl}/assignments/${assignment}/solutions`, {
      headers,
      params,
    });
  }

  getOwn(): Observable<Solution[]> {
    return this.http.get<Solution[]>(`${environment.assignmentsApiUrl}/solutions`);
  }

  update(assignment: string, solution: string, dto: Partial<Solution>): Observable<Solution> {
    const headers = {};
    this.addSolutionToken(headers, assignment, solution);
    this.addAssignmentToken(headers, assignment);
    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/${solution}`;
    return this.http.patch<Solution>(url, dto, {headers});
  }

  delete(assignment: string, solution: string): Observable<Solution> {
    const headers = {};
    this.addSolutionToken(headers, assignment, solution);
    this.addAssignmentToken(headers, assignment);
    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/${solution}`;
    return this.http.delete<Solution>(url, {headers});
  }

  deleteAll(assignment: string, solutions: string[]): Observable<Solution> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);
    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/solutions`;
    return this.http.delete<Solution>(url, {headers, params: {ids: solutions}});
  }

  getComments(assignment: string, solution: string): Observable<Comment[]> {
    const headers = {};
    this.addSolutionToken(headers, assignment, solution);
    this.addAssignmentToken(headers, assignment);

    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/${solution}/comments`;
    return this.http.get<Comment[]>(url, {headers});
  }

  postComment(assignment: string, solution: string, comment: Comment): Observable<Comment> {
    const headers = {};
    this.addSolutionToken(headers, assignment, solution);
    this.addAssignmentToken(headers, assignment);

    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/${solution}/comments`;
    return this.http.post<Comment>(url, comment, {headers});
  }

  deleteComment(assignment: string, solution: string, comment: string): Observable<Comment> {
    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/${solution}/comments/${comment}`;
    return this.http.delete<Comment>(url);
  }

  streamComments(assignment: string, solution: string): Observable<{ event: string, comment: Comment }> {
    const token = this.getToken(assignment, solution) || this.assignmentService.getToken(assignment);
    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/${solution}/comments/events?token=${token}`;
    return observeSSE<Comment, 'comment'>(url);
  }

  getEvaluations(assignment: Assignment | string, id?: string, params: FilterEvaluationParams = {}): Observable<Evaluation[]> {
    const assignmentID = asID(assignment);
    const headers = {};
    if (id) {
      this.addSolutionToken(headers, assignmentID, id);
    }
    this.addAssignmentToken(headers, assignmentID);
    const url = `${environment.assignmentsApiUrl}/assignments/${assignmentID}/${id ? `solutions/${id}/` : ''}evaluations`;
    return this.http.get<Evaluation[]>(url, {headers, params: params as any});
  }

  getEvaluationValues<T>(assignment: string, field: keyof Evaluation | string, params: FilterEvaluationParams = {}): Observable<T[]> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);
    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/evaluations/unique/${field}`;
    return this.http.get<T[]>(url, {headers, params: params as any});
  }

  getEvaluationRemarks(assignment: string, params: FilterEvaluationParams = {}): Observable<RemarkDto[]> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);
    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/evaluations/remarks`;
    return this.http.get<RemarkDto[]>(url, {headers, params: params as any});
  }

  streamEvaluations(assignment: string, solution: string): Observable<{ event: string, evaluation: Evaluation }> {
    const token = this.assignmentService.getToken(assignment);
    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/${solution}/evaluations/events?token=${token}`;
    return observeSSE<Evaluation, 'evaluation'>(url);
  }

  getEvaluationByTask(assignent: string, solution: string, task: string): Observable<Evaluation | undefined> {
    return this.getEvaluations(assignent, solution, {task}).pipe(map(([first]) => first));
  }

  getEvaluation(assignment: string, solution: string | undefined, evaluation: string): Observable<Evaluation> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);
    if (solution) {
      this.addSolutionToken(headers, assignment, solution);
    }
    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/${solution ? `solutions/${solution}/` : ''}evaluations/${evaluation}`;
    return this.http.get<Evaluation>(url, {headers});
  }

  createEvaluation(assignment: string, solution: string, dto: CreateEvaluationDto): Observable<Evaluation> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);

    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/${solution}/evaluations`;
    return this.http.post<Evaluation>(url, dto, {headers});
  }

  updateEvaluation(assignment: string, solution: string, id: string, dto: UpdateEvaluationDto): Observable<Evaluation> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);

    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/${solution}/evaluations/${id}`;
    return this.http.patch<Evaluation>(url, dto, {headers});
  }

  deleteEvaluation(assignment: string, solution: string, id: string): Observable<Evaluation> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);

    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/${solution}/evaluations/${id}`;
    return this.http.delete<Evaluation>(url, {headers});
  }

  getAssignees(assignment: string): Observable<Assignee[]> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);
    return this.http.get<Assignee[]>(`${environment.assignmentsApiUrl}/assignments/${assignment}/assignees`, {headers});
  }

  setAssignee(assignment: string, solution: string, assignee: string | undefined): Observable<Assignee> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);
    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/${solution}/assignee`;
    return assignee ? this.http.put<Assignee>(url, {assignee}, {headers}) : this.http.delete<Assignee>(url, {headers});
  }

  getEmbeddingSnippets(assignment: string, solution: string, task: string): Observable<Snippet[]> {
    const headers = {};
    this.addAssignmentToken(headers, assignment);
    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}/solutions/${solution}/embeddings`;
    return this.http.get<any[]>(url, {headers, params: {task}}).pipe(
      map(embeddings => embeddings.map(({file, line, text, _score}) => ({
        file,
        from: {line, character: 0},
        to: {line: line + text.split('\n').length - 2, character: 0},
        comment: '',
        score: _score,
        code: text.substring(text.indexOf('\n') + 2),
      }))),
    );
  }

  private addAssignmentToken(headers: any, assignmentID: string) {
    const assignmentToken = this.assignmentService.getToken(assignmentID);
    if (assignmentToken) {
      headers['Assignment-Token'] = assignmentToken;
    }
  }

  private addSolutionToken(headers: any, assignmentID: string, solutionID: string): string | null {
    const token = this.getToken(assignmentID, solutionID);
    if (token) {
      headers['Solution-Token'] = token;
    }
    return token;
  }
}
