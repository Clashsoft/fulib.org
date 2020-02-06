import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

import Example from "./model/example";
import {ExamplesService} from "./examples.service";
import Request from "./model/codegen/request";
import Response from "./model/codegen/response";
import ProjectZipRequest from "./model/project-zip-request";
import {PrivacyService} from "./privacy.service";

@Injectable({
  providedIn: 'root'
})
export class ScenarioEditorService {
  private apiUrl = 'http://localhost:4567';

  private defaultScenario = `# My First Scenario

// start typing your scenario or select an example using the dropdown above.

There is a Car with name Herbie.
`;

  public readonly defaultPackageName = 'org.example';
  public readonly defaultProjectName = 'scenario';
  public readonly defaultProjectVersion = '0.1.0';
  public readonly defaultScenarioFileName = 'Scenario.md';

  private _storedScenario?: string;

  private _packageName: string | null;
  private _projectName: string | null;
  private _projectVersion: string | null;
  private _scenarioFileName: string | null;

  private _selectedExample: Example | null;

  constructor(
    private examplesService: ExamplesService,
    private privacyService: PrivacyService,
    private http: HttpClient,
  ) {
  }

  get storedScenario(): string {
    return this._storedScenario || this.privacyService.getStorage('storedScenario') || this.defaultScenario;
  }

  set storedScenario(value: string) {
    if (this._storedScenario !== value) {
      this._storedScenario = value;
      this.privacyService.setStorage('storedScenario', value);
    }
  }

  get selectedExample(): Example | null {
    if (this._selectedExample) {
      return this._selectedExample;
    }
    const storedName = this.privacyService.getStorage('selectedExample');
    if (!storedName) {
      return null;
    }
    return this.examplesService.getExampleByName(storedName);
  }

  set selectedExample(example: Example | null) {
    this._selectedExample = example;
    if (example) {
      this.privacyService.setStorage('selectedExample', example.name);
    }
    else {
      localStorage.removeItem('selectedExample');
    }
  }

  get packageName(): string {
    return this._packageName || this.privacyService.getStorage('packageName') || this.defaultPackageName;
  }

  set packageName(value: string) {
    if (this._packageName !== value) {
      this._packageName = value;
      this.privacyService.setStorage('packageName', value);
    }
  }

  get projectName(): string {
    return this._projectName || this.privacyService.getStorage('projectName') || this.defaultProjectName;
  }

  set projectName(value: string) {
    if (this._projectName !== value) {
      this._projectName = value;
      this.privacyService.setStorage('projectName', value);
    }
  }

  get projectVersion(): string {
    return this._projectVersion || this.privacyService.getStorage('projectVersion') || this.defaultProjectVersion;
  }

  set projectVersion(value: string) {
    if (this._projectVersion !== value) {
      this._projectVersion = value;
      this.privacyService.setStorage('projectVersion', value);
    }
  }

  get scenarioFileName(): string {
    return this._scenarioFileName || this.privacyService.getStorage('scenarioFileName') || this.defaultScenarioFileName;
  }

  set scenarioFileName(value: string) {
    if (this._scenarioFileName !== value) {
      this._scenarioFileName = value;
      this.privacyService.setStorage('scenarioFileName', value);
    }
  }

  submit(codeGenRequest: Request): Observable<Response> {
    return this.http.post<Response>(this.apiUrl + '/runcodegen', codeGenRequest);
  }

  downloadZip(projectZipRequest: ProjectZipRequest): Observable<Blob> {
    return this.http.post(this.apiUrl + '/projectzip', projectZipRequest, {responseType: "blob"});
  }
}
