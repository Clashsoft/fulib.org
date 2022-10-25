import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {ModalModule} from 'ng-bootstrap-ext';
import {SharedModule} from '../../../shared/shared.module';
import {SetupRoutingModule} from './setup-routing.module';
import {SetupService} from './setup.service';
import {SetupComponent} from './setup/setup.component';


@NgModule({
  declarations: [
    SetupComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    SetupRoutingModule,
    ModalModule,
  ],
  providers: [
    SetupService,
  ],
  exports: [
    SetupComponent,
  ],
})
export class SetupModule {
}