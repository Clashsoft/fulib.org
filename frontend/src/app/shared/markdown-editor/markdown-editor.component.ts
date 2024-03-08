import {Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {MarkdownService} from "../../services/markdown.service";

@Component({
  selector: 'app-markdown-editor',
  templateUrl: './markdown-editor.component.html',
  styleUrl: './markdown-editor.component.scss'
})
export class MarkdownEditorComponent {
  @Input({required: true}) content: string;
  @Input() textareaId?: string;
  @Input() rows?: number;
  @Input() placeholder = '';

  @Output() contentChange = new EventEmitter<string>();
  /** "onchange" */
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() change = new EventEmitter<string>();
  /** Ctrl-Enter */
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() submit = new EventEmitter<string>();

  @ViewChild('textarea', {static: false}) textarea?: ElementRef<HTMLTextAreaElement>;

  preview = false;

  constructor(
    private markdownService: MarkdownService,
  ) {
  }

  paste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text/html');
    if (text && event.isTrusted) {
      event.preventDefault();
      const md = this.markdownService.parseMarkdown(text);
      document.execCommand('insertText', false, md);
    }
  }

  span(before: string, after: string) {
    if (!this.textarea) {
      return;
    }
    const textarea = this.textarea.nativeElement;

    const selection = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    const extendedSelection = textarea.value.substring(textarea.selectionStart - before.length, textarea.selectionEnd + after.length);
    if (selection.startsWith(before) && selection.endsWith(after)) {
      // Remove the before and after text from the selection
      textarea.setRangeText(selection.substring(before.length, selection.length - after.length), textarea.selectionStart, textarea.selectionEnd, 'select');
    } else if (extendedSelection.startsWith(before) && extendedSelection.endsWith(after)) {
      // Remove the before and after text from the extended selection
      textarea.setRangeText(extendedSelection.substring(before.length, extendedSelection.length - after.length), textarea.selectionStart - before.length, textarea.selectionEnd + after.length, 'select');
    } else {
      // Insert the before and after text around the selection
      textarea.setRangeText(before + selection + after, textarea.selectionStart, textarea.selectionEnd, 'select');
    }

    this.content = textarea.value;
    this.contentChange.emit(textarea.value);
    textarea.focus();
  }
}
