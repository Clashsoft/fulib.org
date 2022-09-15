import {Pipe, PipeTransform} from '@angular/core';
import Assignment from '../../../model/assignment';
import Solution from '../../../model/solution';

@Pipe({
  name: 'githubLink',
})
export class GithubLinkPipe implements PipeTransform {
  transform(assignment: Assignment, solution: Solution, commit = false): string {
    const org = assignment.classroom?.org;
    const prefix = assignment.classroom?.prefix;
    const user = solution.author.github;
    return `https://github.com/${org}/${prefix}-${user}${commit && solution.commit ? `/tree/${solution.commit}` : ''}`;
  }
}
