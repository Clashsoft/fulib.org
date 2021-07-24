import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {CodemirrorComponent} from '@ctrl/ngx-codemirror';
import {ThemeService} from 'ng-bootstrap-darkmode';
import {of, Subscription} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {Marker} from '../model/marker';

@Component({
  selector: 'app-autotheme-codemirror',
  templateUrl: './autotheme-codemirror.component.html',
  styleUrls: ['./autotheme-codemirror.component.scss'],
})
export class AutothemeCodemirrorComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() content: string;
  @Output() contentChange = new EventEmitter<string>();

  @Input() options: any;

  private _markers: Marker[] = [];

  @ViewChild('ngxCodemirror') ngxCodemirror: CodemirrorComponent;

  private subscription: Subscription;

  constructor(
    private themeService: ThemeService,
    private zone: NgZone,
  ) {
  }

  get markers(): Marker[] {
    return this._markers;
  }

  @Input()
  set markers(value: Marker[]) {
    this._markers = value;
    this.options.lint ??= {
      lintOnChange: false,
      getAnnotations: () => this._markers,
    };
    (this.options.gutters ??= []).push('CodeMirror-lint-markers');
    this.performLint();
  }

  ngOnInit() {
    this.subscription = this.themeService.theme$.pipe(
      switchMap(theme => theme === 'auto' ? this.themeService.detectedTheme$ : of(theme)),
    ).subscribe(theme => this.updateEditorThemes(theme));
  }

  ngAfterViewInit() {
    this.refreshCodeMirror();
    if (this.markers) {
      this.performLint();
    }
  }

  private performLint() {
    this.zone.runOutsideAngular(() => {
      this.ngxCodemirror?.codeMirror?.performLint();
    });
  }

  private refreshCodeMirror() {
    this.zone.runOutsideAngular(() => {
      this.ngxCodemirror?.codeMirror?.refresh();
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private updateEditorThemes(theme: string | null): void {
    this.options.theme = theme === 'dark' ? 'darcula' : 'idea';
  }

  setContent(value: string) {
    this.content = value;
    this.contentChange.emit(value);
  }
}
