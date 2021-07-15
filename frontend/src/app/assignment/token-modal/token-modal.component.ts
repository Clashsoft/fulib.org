import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core';

import {NgbModal} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-token-modal',
  templateUrl: './token-modal.component.html',
  styleUrls: ['./token-modal.component.scss'],
})
export class TokenModalComponent {
  @ViewChild('tokenModal', {static: true}) tokenModal;

  @Input() solution: boolean;
  @Output() submitTokens = new EventEmitter<{ solutionToken?: string; assignmentToken: string; }>();

  solutionToken: string;
  assignmentToken: string;

  constructor(
    private modalService: NgbModal,
  ) {
  }

  open(): void {
    this.modalService.open(this.tokenModal, {ariaLabelledBy: 'tokenModalLabel'});
  }

  submit(): void {
    this.submitTokens.emit({
      solutionToken: this.solution ? this.solutionToken : undefined,
      assignmentToken: this.assignmentToken,
    });
  }
}
