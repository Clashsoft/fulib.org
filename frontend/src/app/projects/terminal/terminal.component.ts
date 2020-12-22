import {Component, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {KeycloakService} from 'keycloak-angular';
import {NgTerminal} from 'ng-terminal';
import {BehaviorSubject, EMPTY, Observable} from 'rxjs';
import {fromPromise} from 'rxjs/internal-compatibility';
import {filter, map, switchMap, withLatestFrom} from 'rxjs/operators';
import {webSocket, WebSocketSubject} from 'rxjs/webSocket';
import {Project} from '../model/project';

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.scss'],
})
export class TerminalComponent implements OnInit, OnDestroy {
  @ViewChild('term', { static: true }) terminal: NgTerminal;

  project$ = new BehaviorSubject<Project | undefined>(undefined);
  output$: Observable<string>;

  command = '';
  output: string[] = [];

  wss: WebSocketSubject<any>;

  constructor(
    private keycloakService: KeycloakService,
  ) {
  }

  get project(): Project | undefined {
    return this.project$.getValue();
  }

  @Input()
  set project(project: Project | undefined) {
    this.project$.next(project);
  }

  ngOnInit(): void {
    this.output$ = this.project$.pipe(
      withLatestFrom(fromPromise(this.keycloakService.getToken())),
      switchMap(([project, token]) => {
        if (project) {
          return (this.wss = webSocket<any>(`ws://localhost:4567/ws/projects/${project.id}?token=${token}`)).asObservable();
        } else {
          return EMPTY;
        }
      }),
      filter(message => message.output),
      map(message => message.output),
    );
  }

  ngOnDestroy(): void {
    this.project = undefined;
    this.project$.unsubscribe();
  }

  execCommand() {
    this.wss.next({exec: this.command});
    this.command = '';
  }
}
