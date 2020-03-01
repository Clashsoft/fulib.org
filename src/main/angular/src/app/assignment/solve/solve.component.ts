import {Component, OnInit, OnDestroy, AfterViewInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {zip} from 'rxjs';
import {debounceTime, distinctUntilChanged, flatMap} from 'rxjs/operators';

import {NgbModal} from '@ng-bootstrap/ng-bootstrap';

import Course from '../model/course';
import {CourseService} from '../course.service';
import Assignment from '../model/assignment';
import {AssignmentService} from '../assignment.service';
import Solution from '../model/solution';
import {SolutionService} from '../solution.service';
import TaskResult from '../model/task-result';

@Component({
  selector: 'app-solve',
  templateUrl: './solve.component.html',
  styleUrls: ['./solve.component.scss']
})
export class SolveComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('successModal', {static: true}) successModal;
  @ViewChild('solutionInput', {static: true}) solutionInput;

  course?: Course;
  assignment: Assignment;
  solution: string;
  name: string;
  studentID: string;
  email: string;

  checking = false;
  results?: TaskResult[];

  // TODO does not work with Angular Universal
  baseURL = window.location.origin;
  id: string;
  token: string;
  timeStamp: Date;

  submitting: boolean;

  nextAssignment?: Assignment | null;

  constructor(
    private courseService: CourseService,
    private assignmentService: AssignmentService,
    private solutionService: SolutionService,
    private route: ActivatedRoute,
    private modalService: NgbModal,
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const assignment$ = this.assignmentService.get(params.aid);
      assignment$.subscribe(result => {
        this.assignment = result;
        this.loadDraft();
      });

      const course$ = this.courseService.get(params.cid);
      if (params.cid) {
        course$.subscribe(result => {
          this.course = result;
        });

        zip(course$, assignment$).pipe(
          flatMap(([course, assignment]) => this.assignmentService.getNext(course, assignment)),
        ).subscribe(result => {
          this.nextAssignment = result;
        });
      }
    });
  }

  ngAfterViewInit() {
    this.solutionInput.contentChange.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
    ).subscribe(() => {
      this.check();
    });
  }

  ngOnDestroy() {
    this.solutionInput.contentChange.unsubscribe();
  }

  getSolution(): Solution {
    return {
      assignment: this.assignment,
      id: this.id,
      token: this.token,
      name: this.name,
      studentID: this.studentID,
      email: this.email,
      solution: this.solution,
      timeStamp: this.timeStamp,
      results: this.results,
    };
  }

  setSolution(result: Solution): void {
    this.id = result.id;
    this.token = result.token;
    this.assignment = result.assignment;
    this.name = result.name;
    this.studentID = result.studentID;
    this.email = result.email;
    this.solution = result.solution;
    this.timeStamp = result.timeStamp;
    this.results = result.results;
  }

  loadDraft(): void {
    this.name = this.solutionService.name || '';
    this.studentID = this.solutionService.studentID || '';
    this.email = this.solutionService.email || '';
    this.solution = this.solutionService.getDraft(this.assignment) || this.assignment.templateSolution;
  }

  saveDraft(): void {
    this.solutionService.name = this.name;
    this.solutionService.studentID = this.studentID;
    this.solutionService.email = this.email;
    this.solutionService.setDraft(this.assignment, this.solution);
  }

  check() {
    this.saveDraft();
    this.checking = true;

    this.solutionService.check({assignment: this.assignment, solution: this.solution}).subscribe(result => {
      this.checking = false;
      this.results = result.results;
    });
  }

  submit() {
    this.submitting = true;
    this.solutionService.submit(this.getSolution()).subscribe(result => {
      this.setSolution(result);
      this.modalService.open(this.successModal, {ariaLabelledBy: 'successModalLabel', size: 'xl'});
      this.submitting = false;
    })
  }
}
