import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {AboutComponent} from './about/about.component';
import {ChangelogComponent} from './changelog/changelog.component';
import {FeedbackComponent} from './feedback/feedback.component';
import {HomeComponent} from './home/home.component';
import {PageNotFoundComponent} from './page-not-found/page-not-found.component';
import {PrivacyComponent} from './privacy/privacy.component';

const routes: Routes = [
  {path: 'scenarios', loadChildren: () => import('./editor/editor.module').then(m => m.EditorModule)},
  {path: 'assignments', loadChildren: () => import('./assignment/assignment.module').then(m => m.AssignmentModule)},
  {path: 'docs', loadChildren: () => import('./docs/docs.module').then(m => m.DocsModule)},
  {path: 'projects', loadChildren: () => import('./projects/projects.module').then(m => m.ProjectsModule)},
  {path: 'editor', redirectTo: 'scenarios'},
  {path: '', pathMatch: 'full', component: HomeComponent, data: {title: 'Home'}},
  {path: '**', component: PageNotFoundComponent, data: {title: '404'}},
  {outlet: 'modal', path: 'feedback', component: FeedbackComponent, data: {title: 'Feedback'}},
  {outlet: 'modal', path: 'privacy', component: PrivacyComponent, data: {title: 'Privacy'}},
  {outlet: 'modal', path: 'changelog', component: ChangelogComponent, data: {title: 'Changelog'}},
  {outlet: 'modal', path: 'about', component: AboutComponent, data: {title: 'About'}},
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
