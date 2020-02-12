import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import Solution, {CheckResult, CheckSolution} from './model/solution';
import {environment} from '../../environments/environment';
import Assignment from './model/assignment';

@Injectable({
  providedIn: 'root'
})
export class SolutionService {
  private _name?: string | null;
  private _studentID?: string | null;
  private _email?: string | null;
  private _drafts = new Map<string, string | null>();

  constructor(
    private http: HttpClient,
  ) {
  }

  get name(): string | null {
    if (typeof this._name === 'undefined') {
      this._name = localStorage.getItem('solutionName');
    }
    return this._name
  }

  set name(value: string | null) {
    this._name = value;
    if (value) {
      localStorage.setItem('solutionName', value);
    }
    else {
      localStorage.removeItem('solutionName');
    }
  }

  get studentID(): string | null {
    if (typeof this._studentID === 'undefined') {
      this._studentID = localStorage.getItem('solutionStudentID');
    }
    return this._studentID
  }

  set studentID(value: string | null) {
    this._studentID = value;
    if (value) {
      localStorage.setItem('solutionStudentID', value);
    }
    else {
      localStorage.removeItem('solutionStudentID');
    }
  }

  get email(): string | null {
    if (typeof this._email === 'undefined') {
      this._email = localStorage.getItem('solutionEmail');
    }
    return this._email
  }

  set email(value: string | null) {
    this._email = value;
    if (value) {
      localStorage.setItem('solutionEmail', value);
    }
    else {
      localStorage.removeItem('solutionEmail');
    }
  }

  getDraft(assignment: Assignment): string | null {
    let draft = this._drafts.get(assignment.id);
    if (typeof draft === 'undefined') {
      draft = localStorage.getItem(`solutionDraft/${assignment.id}`);
      this._drafts.set(assignment.id, draft);
    }
    return draft;
  }

  setDraft(assignment: Assignment, solution: string | null): void {
    this._drafts.set(assignment.id, solution);
    const key = `solutionDraft/${assignment.id}`;
    if (solution) {
      localStorage.setItem(key, solution);
    }
    else {
      localStorage.removeItem(key);
    }
  }

  check(solution: CheckSolution): Observable<CheckResult> {
    return this.http.post<CheckResult>(`${environment.apiURL}/assignments/${solution.assignment.id}/check`, solution);
  }

  submit(solution: Solution): Observable<Solution> {
    return this.http.post<Solution>(`${environment.apiURL}/assignments/${solution.assignment.id}/solutions`, solution).pipe(
      map(partialResult => {
        const result = new Solution();
        Object.assign(result, solution);
        Object.assign(result, partialResult);
        return result;
      })
    );
  }
}
