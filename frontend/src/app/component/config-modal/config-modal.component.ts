import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-config-modal',
  templateUrl: './config-modal.component.html',
  styleUrls: ['./config-modal.component.scss']
})
export class ConfigModalComponent implements OnInit {
  packageName: string;
  projectName: any;
  version: any;
  scenarioFileName: any;

  constructor() {
  }

  ngOnInit() {
  }

  private save(): void {

  }

  private downloadProjectZip(): void {

  }
}
