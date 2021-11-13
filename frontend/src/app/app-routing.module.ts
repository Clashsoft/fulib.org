import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {AboutComponent} from './about/about.component';
import {ChangelogComponent} from './changelog/changelog.component';
import {FeedbackComponent} from './feedback/feedback.component';
import {HomeComponent} from './home/home.component';
import {PageNotFoundComponent} from './page-not-found/page-not-found.component';
import {PrivacyComponent} from './privacy/privacy.component';

const routes: Routes = [
  {path: 'editor', loadChildren: () => import('./editor/editor.module').then(m => m.EditorModule)},
  {path: 'assignments', loadChildren: () => import('./assignment/assignment.module').then(m => m.AssignmentModule)},
  {path: 'docs', loadChildren: () => import('./docs/docs.module').then(m => m.DocsModule)},
  {path: 'projects', loadChildren: () => import('./projects/projects.module').then(m => m.ProjectsModule)},
  {path: '', pathMatch: 'full', component: HomeComponent},
  {path: '**', component: PageNotFoundComponent},
  {outlet: 'modal', path: 'feedback', component: FeedbackComponent},
  {outlet: 'modal', path: 'privacy', component: PrivacyComponent},
  {outlet: 'modal', path: 'changelog', component: ChangelogComponent},
  {outlet: 'modal', path: 'about', component: AboutComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    relativeLinkResolution: 'legacy',
    paramsInheritanceStrategy: 'always',
  })],
  exports: [RouterModule],
})
export class AppRoutingModule {
}
