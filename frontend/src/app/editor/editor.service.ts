import {Injectable} from '@angular/core';
import {PrivacyService} from '../privacy.service';
import {Panel} from './model/panel';

@Injectable({providedIn: 'root'})
export class EditorService {
  private readonly defaultScenario = `# My First Scenario

// start typing your scenario or select an example using the dropdown above.

There is a Car with name Herbie.
`;

  private _panels?: Record<string, Panel>;
  private _storedScenario?: string;
  private _autoSubmit?: boolean;

  constructor(
    private privacyService: PrivacyService,
  ) {
  }

  get panels(): Record<string, Panel> {
    const panels: Record<string, Panel> = this._panels ?? JSON.parse(this.privacyService.getStorage('panels') ?? '{}');
    if (!panels.scenario) {
      panels.scenario = {x: 0, y: 0, rows: 6, cols: 4};
    }
    if (!panels.output) {
      panels.output = {x: 4, y: 0, rows: 6, cols: 4};
    }
    if (!panels.java) {
      panels.java = {x: 8, y: 0, rows: 6, cols: 4};
    }
    if (!panels.markdown) {
      panels.markdown = {x: 0, y: 6, rows: 6, cols: 4};
    }
    if (!panels.classDiagram) {
      panels.classDiagram = {x: 4, y: 6, rows: 6, cols: 4};
    }
    if (!panels.objectDiagrams) {
      panels.objectDiagrams = {x: 8, y: 6, rows: 6, cols: 4};
    }
    return panels;
  }

  set panels(value: Record<string, Panel>) {
    this._panels = value;
    this.privacyService.setStorage('panels', JSON.stringify(value));
  }

  get storedScenario(): string {
    return this._storedScenario ?? this.privacyService.getStorage('storedScenario') ?? this.defaultScenario;
  }

  set storedScenario(value: string) {
    if (this._storedScenario !== value) {
      this._storedScenario = value;
      this.privacyService.setStorage('storedScenario', value);
    }
  }

  get autoSubmit(): boolean {
    if (typeof this._autoSubmit === 'undefined') {
      this._autoSubmit = this.privacyService.getStorage('autoSubmit') !== 'false';
    }
    return this._autoSubmit;
  }

  set autoSubmit(value: boolean) {
    this._autoSubmit = value;
    this.privacyService.setStorage('autoSubmit', '' + value);
  }
}
