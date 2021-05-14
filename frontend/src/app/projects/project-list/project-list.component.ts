import {Component, OnDestroy, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {KeycloakService} from 'keycloak-angular';
import {combineLatest} from 'rxjs';
import {LocalProject, Project, ProjectStub} from '../model/project';
import {ProjectService} from '../project.service';

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss'],
})
export class ProjectListComponent implements OnInit, OnDestroy {
  @ViewChild('editModal', {static: true}) editModal: TemplateRef<any>;

  loggedIn = false;

  openModal?: NgbModalRef;

  projects: Project[] = [];

  editing?: Project | ProjectStub;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private keycloak: KeycloakService,
    private ngbModal: NgbModal,
  ) {
  }

  ngOnInit(): void {
    this.keycloak.isLoggedIn().then(loggedIn => this.loggedIn = loggedIn);

    combineLatest([
      this.projectService.getOwn(),
      this.route.queryParams,
    ]).subscribe(([projects, {edit, local}]) => {
      this.projects = projects;
      if (edit === 'new') {
        this.create(!!local);
      } else if (edit) {
        const project = projects.find(p => p.id === edit);
        if (project) {
          this.edit(project);
        }
      } else {
        this.editing = undefined;
        this.openModal?.dismiss();
        this.openModal = undefined;
      }
    });
  }

  ngOnDestroy(): void {
    this.openModal?.dismiss();
  }

  login(): void {
    this.keycloak.login().then();
  }

  create(local?: boolean): void {
    this.edit({
      name: '',
      description: '',
      local,
    });
  }

  edit(project: Project | ProjectStub): void {
    this.editing = project;

    if (this.openModal) {
      return;
    }
    this.openModal = this.ngbModal.open(this.editModal, {
      ariaLabelledBy: 'edit-modal-title',
    });
    this.openModal.hidden.subscribe(() => {
      this.router.navigate([], {queryParams: {edit: undefined}});
    });
  }

  save(): void {
    if (!this.editing) {
      return;
    }
    if ('id' in this.editing) {
      this.projectService.update(this.editing).subscribe();
    } else {
      this.projectService.create(this.editing).subscribe(project => this.projects.push(project));
    }
  }

  convert(localProject: LocalProject) {
    this.projectService.delete(localProject);
    this.projectService.create({...localProject, local: false}).subscribe(persistentProject => {
      const index = this.projects.indexOf(localProject);
      if (index >= 0) {
        this.projects[index] = persistentProject;
      }
      if (localProject === this.editing) {
        this.editing = persistentProject;
      }
    });
  }

  delete(project: Project) {
    if (!confirm(`Are you sure you want to delete '${project.name}'? This action cannot be undone.`)) {
      return;
    }

    this.projectService.delete(project).subscribe(() => {
      const index = this.projects.indexOf(project);
      if (index >= 0) {
        this.projects.splice(index, 1);
      }
    });
  }
}
