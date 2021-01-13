import {AfterViewInit, Component, ElementRef, HostBinding, Inject, Input, OnInit, QueryList, ViewChildren} from '@angular/core';
import {NgbDropdown} from '@ng-bootstrap/ng-bootstrap';
import {DndDropEvent} from 'ngx-drag-drop';
import {Observable} from 'rxjs';
import {FileService} from '../file.service';
import {FILE_ROOT} from '../injection-tokens';
import {Container} from '../model/container';
import {File} from '../model/file';
import {ProjectManager} from '../project.manager';

@Component({
  selector: 'app-file-tree',
  templateUrl: './file-tree.component.html',
  styleUrls: ['./file-tree.component.scss'],
})
export class FileTreeComponent implements OnInit, AfterViewInit {
  @Input() file: File;
  @Input() level = 0;

  @ViewChildren('nameInput') nameInput: QueryList<ElementRef>;

  @HostBinding('attr.data-expanded') expanded = false;
  newName?: string;
  currentFile: Observable<File | undefined>;

  constructor(
    private container: Container,
    private fileManager: FileService,
    private projectManager: ProjectManager,
    @Inject(FILE_ROOT) public root: File,
  ) {
  }

  ngOnInit(): void {
    this.currentFile = this.projectManager.currentFile;
    if (!this.file) {
      this.file = this.root;
    }
  }

  ngAfterViewInit(): void {
    this.nameInput.changes.subscribe(() => {
      this.nameInput.first?.nativeElement.focus();
    });
  }

  open(temporary: boolean) {
    this.projectManager.currentFile.next(this.file);

    if (!this.file.directory) {
      this.projectManager.open({file: this.file, temporary});
      return;
    }

    this.expanded = !this.expanded;

    this.fileManager.getChildren(this.container, this.file).subscribe();
  }

  openPreview() {
    this.projectManager.open({file: this.file, temporary: false, preview: true});
  }

  startRenaming() {
    this.newName = this.file.name;
  }

  finishRenaming() {
    if (!this.newName) {
      return;
    }

    this.fileManager.rename(this.container, this.file, this.newName).subscribe(() => {
      this.newName = undefined;
    });
  }

  cancelRenaming() {
    this.newName = undefined;
  }

  delete() {
    if (confirm(`Delete ${this.file.name}?`)) {
      this.fileManager.delete(this.container, this.file).subscribe();
    }
  }

  openContextMenu(event: MouseEvent, dropdown: NgbDropdown) {
    if (event.shiftKey || dropdown.isOpen()) {
      return;
    }

    dropdown.open();
    event.preventDefault();
  }

  createFile() {
    this.addChild('untitled.txt', false);
  }

  createDir() {
    this.addChild('untitled/', true);
  }

  private addChild(name: string, directory: boolean) {
    this.fileManager.createChild(this.container, this.file, name, directory).subscribe();
  }

  onDrop(event: DndDropEvent): void {
    const path: string = event.data;
    const file = this.fileManager.resolve(this.root, path);
    if (file) {
      this.fileManager.move(this.container, file, this.file).subscribe();
    }
  }
}
