import {Component, Injector, OnInit, Type, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {switchMap, tap} from 'rxjs/operators';

import {FileTabsComponent} from '../file-tabs/file-tabs.component';
import {FileService} from '../file.service';
import {FILE_ROOT} from '../injection-tokens';
import {File} from '../model/file';
import {Project} from '../model/project';
import {ProjectTreeComponent} from '../project-tree/project-tree.component';
import {ProjectService} from '../project.service';
import {SettingsComponent} from '../settings/settings.component';

interface SidebarItem {
  component: Type<any>;
  name: string;
  icon: string
}

@Component({
  selector: 'app-project-workspace',
  templateUrl: './project-workspace.component.html',
  styleUrls: ['./project-workspace.component.scss'],
})
export class ProjectWorkspaceComponent implements OnInit {
  project: Project;
  fileRoot: File;

  @ViewChild('fileTabs') fileTabs: FileTabsComponent;

  sidebarItems: Record<string, SidebarItem> = {};

  injector: Injector;

  active: string = 'project';

  constructor(
    parentInjector: Injector,
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private fileService: FileService,
  ) {
    this.injector = Injector.create({
      name: 'ProjectWorkspace',
      parent: parentInjector,
      providers: [
        {provide: FILE_ROOT, useFactory: () => this.fileRoot},
        {provide: Project, useFactory: () => this.project},
      ],
    });
  }

  ngOnInit(): void {
    this.route.params.pipe(
      switchMap(params => this.projectService.get(params.id)),
      tap(project => this.project = project),
      switchMap(project => this.fileService.get(project.id, project.rootFileId)),
      tap(rootFile => this.fileRoot = rootFile),
    ).subscribe(_ => {
      this.initSidebar();
    });
  }

  private initSidebar() {
    this.sidebarItems = {
      project: {name: 'Project', icon: 'file-code', component: ProjectTreeComponent},
      settings: {name: 'Settings', icon: 'gear', component: SettingsComponent},
    };
  }
}
