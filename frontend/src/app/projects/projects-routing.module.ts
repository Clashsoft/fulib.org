import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ProjectListComponent} from './project-list/project-list.component';
import {ProjectWorkspaceComponent} from './project-workspace/project-workspace.component';
import {TransferComponent} from './transfer/transfer.component';

const routes: Routes = [
  {
    path: '',
    component: ProjectListComponent,
    children: [
      {path: 'transfer/:id', component: TransferComponent, data: {back: '../..'}},
    ],
  },
  {
    path: ':id',
    component: ProjectWorkspaceComponent,
    children: [
      {path: 'transfer', component: TransferComponent, data: {back: '..'}},
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProjectsRoutingModule {
}
