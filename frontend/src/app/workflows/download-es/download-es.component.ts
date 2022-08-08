import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

import {ToastService} from 'ng-bootstrap-ext';
import {ExportOptions} from '../model/ExportOptions';
import {PrivacyService} from '../../services/privacy.service';
import {WorkflowsService} from '../workflows.service';

@Component({
  selector: 'app-download-es',
  templateUrl: './download-es.component.html',
  styleUrls: ['./download-es.component.scss']
})
export class DownloadESComponent implements OnInit {
  private yamlContent!: string | null;

  exportOptions: ExportOptions = {
    yaml: false,
    board: true,
    pages: false,
    objects: false,
    class: false,
    fxmls: false,
  };

  constructor(
    public route: ActivatedRoute,
    private workflowsService: WorkflowsService,
    private privacyService: PrivacyService,
    private toastService: ToastService,
  ) {
  }

  ngOnInit() {
    // TODO doesn't download examples if selected
    this.yamlContent = this.privacyService.getStorage('workflows');
  }

  selectAll() {
    this.exportOptions = {
      yaml: true,
      board: true,
      pages: true,
      objects: true,
      class: true,
      fxmls: true,
    };
  }

  deselectAll() {
    this.exportOptions = {
      yaml: false,
      board: false,
      pages: false,
      objects: false,
      class: false,
      fxmls: false,
    };
  }

  download() {
    if (this.yamlContent) {
      this.workflowsService.downloadZip(this.yamlContent, this.exportOptions);
    } else {
      this.toastService.error('Download Files', 'Editor Content does not exist');
    }
  }
}
