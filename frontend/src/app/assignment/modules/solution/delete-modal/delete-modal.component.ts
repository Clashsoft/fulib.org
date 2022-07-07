import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ToastService} from 'ng-bootstrap-ext';
import {switchMap} from 'rxjs/operators';
import Solution from '../../../model/solution';
import {CommentRepo} from '../../../services/comment-repo';
import {SolutionService} from '../../../services/solution.service';
import {SolutionNamePipe} from '../../shared/pipes/solution-name.pipe';

@Component({
  selector: 'app-delete-modal',
  templateUrl: './delete-modal.component.html',
  styleUrls: ['./delete-modal.component.scss'],
})
export class DeleteModalComponent implements OnInit {
  solution?: Solution;
  comments = 0;
  evaluations = 0;

  expectedTitle = '';
  title = '';

  constructor(
    public route: ActivatedRoute,
    private solutionService: SolutionService,
    private commentRepo: CommentRepo,
    private toastService: ToastService,
  ) {
  }

  ngOnInit(): void {
    this.route.params.pipe(
      switchMap(({aid, sid}) => this.solutionService.get(aid, sid)),
    ).subscribe(solution => {
      this.solution = solution;
      this.expectedTitle = new SolutionNamePipe().transform(solution);
    });

    this.route.params.pipe(
      switchMap(({aid, sid}) => this.commentRepo.findAll({assignment: aid, solution: sid})),
    ).subscribe(comments => this.comments = comments.length);

    this.route.params.pipe(
      switchMap(({aid, sid}) => this.solutionService.getEvaluations(aid, sid)),
    ).subscribe(evaluations => this.evaluations = evaluations.length);
  }

  delete() {
    const {aid, sid} = this.route.snapshot.params;
    this.solutionService.delete(aid, sid).subscribe(() => {
      this.toastService.warn('Solution', 'Successfully deleted solution');
    }, error => {
      this.toastService.error('Solution', 'Failed to delete solution', error);
    });
  }
}
