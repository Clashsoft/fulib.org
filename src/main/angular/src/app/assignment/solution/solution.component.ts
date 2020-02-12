import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

import {SolutionService} from '../solution.service';
import {AssignmentService} from '../assignment.service';

import Assignment from '../model/assignment';
import Solution from '../model/solution';
import Comment from '../model/comment';

@Component({
  selector: 'app-solution',
  templateUrl: './solution.component.html',
  styleUrls: ['./solution.component.scss']
})
export class SolutionComponent implements OnInit {
  assignment?: Assignment;
  solution?: Solution;

  comments?: Comment[];

  commentName: string;
  commentEmail: string;
  commentBody: string;

  constructor(
    private route: ActivatedRoute,
    private assignmentService: AssignmentService,
    private solutionService: SolutionService,
  ) {
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const assignmentID = params.aid;
      const solutionID = params.sid;
      this.assignmentService.get(assignmentID).subscribe(assignment => {
        this.assignment = assignment;
      });
      this.solutionService.get(assignmentID, solutionID).subscribe(solution => {
        this.solution = solution;
      });
      this.solutionService.getComments(assignmentID, solutionID).subscribe(comments => {
        this.comments = comments;
      });
    });
  }

  submitComment(): void {
    this.solution.assignment = this.assignment;
    const comment: Comment = {
      parent: this.solution.id,
      author: this.commentName,
      email: this.commentEmail,
      markdown: this.commentBody,
    };
    this.solutionService.postComment(this.solution, comment).subscribe(result => {
      if (!this.comments) {
        this.comments = [];
      }
      this.comments.push(result);
      this.commentBody = '';
    });
  }
}
