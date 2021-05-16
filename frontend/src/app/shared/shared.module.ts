import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {CodemirrorModule} from '@ctrl/ngx-codemirror';
import {NgbDropdownModule, NgbNavModule, NgbTooltipModule} from '@ng-bootstrap/ng-bootstrap';

import {AutothemeCodemirrorComponent} from './autotheme-codemirror/autotheme-codemirror.component';
import {CollapseButtonComponent} from './collapse-button/collapse-button.component';
import {MarkdownComponent} from './markdown/markdown.component';
import {ModalComponent} from './modal/modal.component';
import {ExceptionPipe} from './pipes/exception.pipe';
import {SafeHtmlPipe} from './pipes/safe-html.pipe';
import {SafeResourceUrlPipe} from './pipes/safe-resource-url.pipe';
import {SafeUrlPipe} from './pipes/safe-url.pipe';
import {PreviewComponent} from './preview/preview.component';
import {ProjectConfigFormComponent} from './project-config-form/project-config-form.component';
import {ScenarioCodemirrorComponent} from './scenario-codemirror/scenario-codemirror.component';
import {TabsComponent} from './tabs/tabs.component';

@NgModule({
  declarations: [
    SafeHtmlPipe,
    SafeUrlPipe,
    SafeResourceUrlPipe,
    ExceptionPipe,
    AutothemeCodemirrorComponent,
    CollapseButtonComponent,
    ScenarioCodemirrorComponent,
    PreviewComponent,
    MarkdownComponent,
    ModalComponent,
    ProjectConfigFormComponent,
    TabsComponent,
  ],
  imports: [
    FormsModule,
    CommonModule,
    CodemirrorModule,
    NgbTooltipModule,
    NgbDropdownModule,
    NgbNavModule,
  ],
  exports: [
    SafeHtmlPipe,
    SafeUrlPipe,
    SafeResourceUrlPipe,
    ExceptionPipe,
    AutothemeCodemirrorComponent,
    CollapseButtonComponent,
    ScenarioCodemirrorComponent,
    PreviewComponent,
    MarkdownComponent,
    ModalComponent,
    ProjectConfigFormComponent,
    TabsComponent,
  ],
})
export class SharedModule {
}
