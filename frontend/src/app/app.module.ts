import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { CodemirrorModule } from '@ctrl/ngx-codemirror';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './component/app.component';
import { FourPaneEditorComponent } from './component/four-pane-editor/four-pane-editor.component';

@NgModule({
  declarations: [
    AppComponent,
    FourPaneEditorComponent
  ],
  imports: [
    BrowserModule,
    CodemirrorModule,
    AppRoutingModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
