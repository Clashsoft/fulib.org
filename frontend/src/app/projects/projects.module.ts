import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {AngularSplitModule} from 'angular-split';
import {DndModule} from 'ngx-drag-drop';

import {SharedModule} from '../shared/shared.module';
import {EditorModule} from './editor/editor.module';
import {FileRevisionsComponent} from './file-revisions/file-revisions.component';
import {FileTabsComponent} from './file-tabs/file-tabs.component';
import {FileTreeComponent} from './file-tree/file-tree.component';
import {LaunchModule} from './launch/launch.module';
import {ProjectFormComponent} from './project-form/project-form.component';
import {ProjectListComponent} from './project-list/project-list.component';
import {ProjectTreeComponent} from './project-tree/project-tree.component';
import {ProjectWorkspaceComponent} from './project-workspace/project-workspace.component';
import {ProjectsRoutingModule} from './projects-routing.module';
import {SettingsComponent} from './settings/settings.component';
import {SetupModule} from './setup/setup.module';
import {SplitPanelComponent} from './split-panel/split-panel.component';
import {TerminalModule} from './terminal/terminal.module';
import {TransferComponent} from './transfer/transfer.component';
import { EditModalComponent } from './edit-modal/edit-modal.component';

@NgModule({
  declarations: [
    FileRevisionsComponent,
    FileTabsComponent,
    FileTreeComponent,
    ProjectFormComponent,
    ProjectListComponent,
    ProjectTreeComponent,
    ProjectWorkspaceComponent,
    SettingsComponent,
    SplitPanelComponent,
    TransferComponent,
    EditModalComponent,
  ],
  imports: [
    // Angular
    CommonModule,
    FormsModule,
    HttpClientModule,
    // 3rd Party
    DndModule,
    NgbModule,
    AngularSplitModule,
    // Shared
    SharedModule,
    // Routing
    ProjectsRoutingModule,
    // Submodules
    EditorModule,
    LaunchModule,
    SetupModule,
    TerminalModule,
  ],
})
export class ProjectsModule {
}
