import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {Snippet} from '../../model/evaluation';
import {AssignmentService} from '../../services/assignment.service';

interface SelectionDto {
  assignment: string;
  solution: string;
  author: string;
  snippet: Snippet;
}

@Injectable({
  providedIn: 'root',
})
export class SelectionService {
  constructor(
    private assignmentService: AssignmentService,
  ) {
  }

  stream(assignment: string, solution?: string): Observable<{ event: string, selection: SelectionDto }> {
    const token = this.assignmentService.getToken(assignment);
    const url = `${environment.assignmentsApiUrl}/assignments/${assignment}${solution ? '/solutions/' + solution : ''}/selections/events?token=${token}`;
    return new Observable(observer => {
      const eventSource = new EventSource(url);
      eventSource.addEventListener('message', event => observer.next(JSON.parse(event.data)));
      eventSource.addEventListener('error', error => observer.error(error));
      return () => eventSource.close();
    });
  }
}