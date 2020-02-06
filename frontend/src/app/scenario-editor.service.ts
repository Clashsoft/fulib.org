import {Injectable} from '@angular/core';
import Example from "./model/example";
import {ExamplesService} from "./examples.service";

@Injectable({
  providedIn: 'root'
})
export class ScenarioEditorService {
  private persistenceKey = 'storedScenario';
  private defaultScenario = `# My First Scenario

// start typing your scenario or select an example using the dropdown above.

There is a Car with name Herbie.
`;

  private _storedScenario?: string;
  private _selectedExample: Example | null;

  constructor(
    private examplesService: ExamplesService,
  ) {
  }

  get storedScenario(): string {
    return this._storedScenario || localStorage.getItem(this.persistenceKey) || this.defaultScenario;
  }

  set storedScenario(value: string) {
    if (this._storedScenario !== value) {
      this._storedScenario = value;
      localStorage.setItem(this.persistenceKey, value);
    }
  }

  get selectedExample(): Example | null {
    if (this._selectedExample) {
      return this._selectedExample;
    }
    const storedName = localStorage.getItem('selectedExample');
    if (!storedName) {
      return null;
    }
    return this.examplesService.getExampleByName(storedName);
  }

  set selectedExample(example: Example | null) {
    this._selectedExample = example;
    if (example) {
      localStorage.setItem('selectedExample', example.name);
    }
    else {
      localStorage.removeItem('selectedExample');
    }
  }
}
