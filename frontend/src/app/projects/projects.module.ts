import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {AngularSplitModule} from 'angular-split';
import {ModalModule} from 'ng-bootstrap-ext';
import {DndModule} from 'ngx-drag-drop';

import {SharedModule} from '../shared/shared.module';
import {UserModule} from '../user/user.module';
import {DeleteModalComponent} from './components/delete-modal/delete-modal.component';
import {EditMemberComponent} from './components/edit-member/edit-member.component';
import {EditModalComponent} from './components/edit-modal/edit-modal.component';
import {ProjectFormComponent} from './components/project-form/project-form.component';
import {ProjectListComponent} from './components/project-list/project-list.component';
import {ProjectWorkspaceComponent} from './components/project-workspace/project-workspace.component';
import {SettingsComponent} from './components/settings/settings.component';
import {SetupComponent} from './components/setup/setup.component';
import {TransferComponent} from './components/transfer/transfer.component';
import {ProjectsRoutingModule} from './projects-routing.module';
import {ConfigService} from './services/config.service';
import {ContainerService} from './services/container.service';
import {DavClient} from './services/dav-client';
import {FileChangeService} from './services/file-change.service';
import {FileTypeService} from './services/file-type.service';
import {FileService} from './services/file.service';
import {LocalProjectService} from './services/local-project.service';
import {MemberService} from './services/member.service';
import {ProjectService} from './services/project.service';
import {SearchService} from './services/search.service';

@NgModule({
  declarations: [
    DeleteModalComponent,
    EditMemberComponent,
    EditModalComponent,
    ProjectFormComponent,
    ProjectListComponent,
    ProjectWorkspaceComponent,
    SettingsComponent,
    SetupComponent,
    TransferComponent,
  ],
  imports: [
    // Angular
    CommonModule,
    FormsModule,
    // 3rd Party
    DndModule,
    NgbModule,
    AngularSplitModule,
    // Shared
    SharedModule,
    // Routing
    ProjectsRoutingModule,
    // Submodules
    ModalModule,
    UserModule,
  ],
  providers: [
    ConfigService,
    ContainerService,
    DavClient,
    FileService,
    FileChangeService,
    FileTypeService,
    LocalProjectService,
    ProjectService,
    MemberService,
    SearchService,
  ],
})
export class ProjectsModule {
}
