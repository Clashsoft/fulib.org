import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

import {ExamplesService} from '../examples.service';
import Request from '../model/codegen/request';
import Response from '../model/codegen/response';
import Example from '../model/example';

import ExampleCategory from '../model/example-category';
import {PrivacyService} from '../privacy.service';
import {Marker, ScenarioEditorService} from '../scenario-editor.service';

@Component({
  selector: 'app-four-pane-editor',
  templateUrl: './four-pane-editor.component.html',
  styleUrls: ['./four-pane-editor.component.scss'],
})
export class FourPaneEditorComponent implements OnInit {
  _selectedExample: Example | null;
  scenarioText: string;
  response: Response | null;
  markers: Marker[] = [];
  javaCode = '// Loading...';
  submitting: boolean;

  exampleCategories: ExampleCategory[];
  _activeObjectDiagramTab = 1;

  constructor(
    private examplesService: ExamplesService,
    private scenarioEditorService: ScenarioEditorService,
    private privacyService: PrivacyService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {
  }

  ngOnInit() {
    this.exampleCategories = this.examplesService.getCategories();

    this.activatedRoute.queryParams.subscribe(queryParams => {
      const exampleName = queryParams.example;
      if (exampleName) {
        this.selectedExample = this.examplesService.getExampleByName(exampleName);
      } else {
        this.selectedExample = this.scenarioEditorService.selectedExample;
      }
    });
  }

  submit(): void {
    if (!this.selectedExample) {
      this.scenarioEditorService.storedScenario = this.scenarioText;
    }

    this.submitting = true;
    const request: Request = {
      privacy: this.privacyService.privacy ?? 'none',
      packageName: this.scenarioEditorService.packageName,
      scenarioFileName: this.scenarioEditorService.scenarioFileName,
      scenarioText: this.scenarioText,
      selectedExample: this.selectedExample?.name,
    };
    this.scenarioEditorService.submit(request).subscribe(response => {
      this.submitting = false;
      this.response = response;
      this.javaCode = this.renderJavaCode();
      this.markers = this.scenarioEditorService.lint(response);
    });
  }

  private renderJavaCode(): string {
    if (!this.response) {
      return '';
    }

    let javaCode = '';
    if (this.response.exitCode !== 0) {
      const outputLines = this.response.output.split('\n');
      javaCode += this.scenarioEditorService.foldInternalCalls(outputLines).map(line => `// ${line}\n`).join('');
    }

    for (const testMethod of this.response.testMethods ?? []) {
      javaCode += `// --------------- ${testMethod.name} in class ${testMethod.className} ---------------\n\n`;
      javaCode += testMethod.body;
      javaCode += '\n';
    }

    return javaCode;
  }

  toolSuccess(index: number) {
    return this.response && (this.response.exitCode === 0 || (this.response.exitCode % 4) > index);
  }

  get activeObjectDiagramTab(): number {
    const numDiagrams = this.response?.objectDiagrams?.length ?? 0;
    return Math.min(this._activeObjectDiagramTab, numDiagrams);
  }

  set activeObjectDiagramTab(value: number) {
    this._activeObjectDiagramTab = value;
  }

  get selectedExample() {
    return this._selectedExample;
  }

  set selectedExample(value: Example | null) {
    this._selectedExample = value;
    this.loadExample(value);
  }

  selectExample(value: Example | null): void {
    this.scenarioEditorService.selectedExample = value;
    this.router.navigate([], {queryParams: {example: value?.name}});
  }

  private loadExample(value: Example | null): void {
    if (value) {
      this.response = null;
      this.scenarioText = '// Loading Example...';
      this.examplesService.getScenario(value).subscribe(scenario => {
        this.scenarioText = scenario;
        this.submit();
      });
    } else {
      this.scenarioText = this.scenarioEditorService.storedScenario;
      this.submit();
    }
  }

  get autoSubmit(): boolean {
    return this.scenarioEditorService.autoSubmit;
  }

  set autoSubmit(value: boolean) {
    this.scenarioEditorService.autoSubmit = value;
  }
}
