import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {KeycloakService} from 'keycloak-angular';
import Assignment from '../../../model/assignment';
import Task from '../../../model/task';
import {AssignmentContext} from '../../../services/assignment.context';
import {AssignmentService} from '../../../services/assignment.service';

@Component({
  selector: 'app-edit-assignment-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss'],
})
export class PreviewComponent implements OnInit {
  assignment: Assignment;

  loggedIn = false;
  submitting = false;

  constructor(
    private assignmentService: AssignmentService,
    private router: Router,
    private keycloakService: KeycloakService,
    context: AssignmentContext,
  ) {
    this.assignment = context.assignment;
  }

  ngOnInit(): void {
  }

  submit(): void {
    this.submitting = true;
    const assignment = this.getAssignment();
    const operation = assignment._id ? this.assignmentService.update(assignment) : this.assignmentService.create(assignment);
    operation.subscribe(result => {
      this.router.navigate(['/assignments', result._id, 'solutions'], {queryParams: {tab: 'share'}});
    });
  }

  private getAssignment(): Assignment {
    return {
      ...this.assignment,
      tasks: this.getTasks(this.assignment.tasks),
    };
  }

  private getTasks(tasks: Task[]): Task[] {
    return tasks.filter(t => !t.deleted).map(({deleted, collapsed, children, ...rest}) => ({
      ...rest,
      children: this.getTasks(children),
    }));
  }

  login(): void {
    this.keycloakService.login().then();
  }
}
