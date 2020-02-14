import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CreateComponent} from './create/create.component';
import {SolveComponent} from './solve/solve.component';
import {SolutionListComponent} from './solution-list/solution-list.component';
import {SolutionComponent} from './solution/solution.component';

const routes: Routes = [
  {path: 'create', component: CreateComponent},
  {path: ':id', component: SolveComponent},
  {path: ':id/solutions', component: SolutionListComponent},
  {path: ':aid/solutions/:sid', component: SolutionComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AssignmentRoutingModule {
}
