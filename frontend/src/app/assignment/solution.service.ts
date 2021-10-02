import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {forkJoin, Observable, of} from 'rxjs';
import {map, mapTo, switchMap, tap} from 'rxjs/operators';

import Solution from './model/solution';
import {environment} from '../../environments/environment';
import Assignment from './model/assignment';
import {AssignmentService} from './assignment.service';
import Comment from './model/comment';
import {StorageService} from '../storage.service';
import TaskGrading from './model/task-grading';
import {CheckResult, CheckSolution} from './model/check';
import {UserService} from '../user/user.service';

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

  get name(): string | null {
    return this.storageService.get('solutionName');
  }

  set name(value: string | null) {
    this.storageService.set('solutionName', value);
  }

  get studentID(): string | null {
    return this.storageService.get('solutionStudentID');
  }

  set studentID(value: string | null) {
    this.storageService.set('solutionStudentID', value);
  }

  get email(): string | null {
    return this.storageService.get('solutionEmail');
  }

  set email(value: string | null) {
    this.storageService.set('solutionEmail', value);
  }

  getDraft(assignment: Assignment): string | null {
    return this.storageService.get(`solutionDraft/${assignment._id}`);
  }

  setDraft(assignment: Assignment, solution: string | null): void {
    this.storageService.set(`solutionDraft/${assignment._id}`, solution);
  }

  // --------------- Comment Drafts ---------------

  get commentName(): string | null {
    return this.storageService.get('commentName');
  }

  set commentName(value: string | null) {
    this.storageService.set('commentName', value);
  }

  get commentEmail(): string | null {
    return this.storageService.get('commentEmail');
  }

  set commentEmail(value: string | null) {
    this.storageService.set('commentEmail', value);
  }

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

  getOwnWithAssignments(): Observable<[Assignment[], Solution[]]> {
    return this.users.current$.pipe(
      switchMap(user => {
        if (user && user.id) {
          return this.getOwn().pipe(switchMap(solutions => {
            const assignmentIds = [...new Set<string>(solutions.map(s => s.assignment))];
            const assignments = forkJoin(assignmentIds.map(aid => this.assignmentService.get(aid)));

            return forkJoin([assignments, of(solutions)]);
          }));
        } else {
          const compoundIds = this.getOwnIds();
          const assignmentIds = [...new Set<string>(compoundIds.map(id => id.assignment))];

          const assignments = forkJoin(assignmentIds.map(aid => this.assignmentService.get(aid)));
          const solutions = forkJoin(compoundIds.map(cid => this.get(cid.assignment, cid.id)));

          return forkJoin([assignments, solutions]);
        }
      }),
    );
  }

  // --------------- HTTP Methods ---------------

  check(solution: CheckSolution): Observable<CheckResult> {
    return this.http.post<CheckResult>(`${environment.apiURL}/assignments/${solution.assignment._id}/check`, solution);
  }

  submit(solution: Solution): Observable<Solution> {
    return this.http.post<Solution>(`${environment.assignmentsApiUrl}/assignments/${solution.assignment}/solutions`, solution).pipe(
      tap(response => this.setToken(solution.assignment, response._id!, response.token!)),
    );
  }

  get(assignment: Assignment | string, id: string): Observable<Solution> {
    const assignmentID = asID(assignment);
    const headers = {};
    const token = this.addSolutionToken(headers, assignmentID, id);
    this.addAssignmentToken(headers, assignmentID);
    return this.http.get<Solution>(`${environment.assignmentsApiUrl}/assignments/${assignmentID}/solutions/${id}`, {headers}).pipe(
      tap(solution => solution.token = token ?? undefined),
    );
  }

  getAll(assignment: Assignment | string): Observable<Solution[]> {
    const assignmentID = asID(assignment);
    const headers = {};
    this.addAssignmentToken(headers, assignmentID);
    return this.http.get<Solution[]>(`${environment.assignmentsApiUrl}/assignments/${assignmentID}/solutions`, {headers}).pipe(
      tap(solutions => {
        for (const solution of solutions) {
          solution.token = this.getToken(assignmentID, solution._id!) ?? undefined;
        }
      }),
    );
  }

  getOwn(): Observable<Solution[]> {
    return this.http.get<Solution[]>(`${environment.assignmentsApiUrl}/solutions`);
  }

  getComments(assignment: Assignment | string, id: string): Observable<Comment[]> {
    const assignmentID = asID(assignment);
    const headers = {};
    this.addSolutionToken(headers, assignmentID, id);
    this.addAssignmentToken(headers, assignmentID);

    const url = `${environment.assignmentsApiUrl}/assignments/${assignmentID}/solutions/${id}/comments`;
    return this.http.get<Comment[]>(url, {headers});
  }

  postComment(solution: Solution, comment: Comment): Observable<Comment> {
    const assignmentID = solution.assignment;
    const headers = {};
    this.addSolutionToken(headers, assignmentID, solution._id!);
    this.addAssignmentToken(headers, assignmentID);

    const url = `${environment.assignmentsApiUrl}/assignments/${solution.assignment}/solutions/${solution._id}/comments`;
    return this.http.post<Comment>(url, comment, {headers});
  }

  deleteComment(solution: Solution, comment: Comment): Observable<Comment> {
    const url = `${environment.assignmentsApiUrl}/assignments/${solution.assignment}/solutions/${solution._id}/comments/${comment._id}`;
    return this.http.delete<Comment>(url);
  }

  getGradings(assignment: Assignment | string, id: string): Observable<TaskGrading[]> {
    const assignmentID = asID(assignment);
    const headers = {};
    this.addSolutionToken(headers, assignmentID, id);
    this.addAssignmentToken(headers, assignmentID);

    const url = `${environment.assignmentsApiUrl}/assignments/${assignmentID}/solutions/${id}/gradings`;
    return this.http.get<TaskGrading[]>(url, {headers});
  }

  postGrading(grading: TaskGrading): Observable<TaskGrading> {
    const headers = {};
    this.addAssignmentToken(headers, grading.assignment);

    const url = `${environment.assignmentsApiUrl}/assignments/${grading.assignment}/solutions/${grading.solution}/gradings/${grading.task}`;
    return this.http.put<TaskGrading>(url, grading, {headers});
  }

  setAssignee(solution: Solution, assignee: string): Observable<void> {
    const body = {
      assignee,
    };
    const headers = {};
    const assignmentID = solution.assignment;
    this.addAssignmentToken(headers, assignmentID);
    return this.http.put<void>(`${environment.apiURL}/assignments/${assignmentID}/solutions/${solution._id}/assignee`, body, {headers});
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
