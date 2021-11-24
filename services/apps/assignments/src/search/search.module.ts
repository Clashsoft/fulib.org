import {Module} from '@nestjs/common';
import {ElasticsearchModule} from '@nestjs/elasticsearch';
import {AssignmentModule} from '../assignment/assignment.module';
import {environment} from '../environment';
import {SearchController} from './search.controller';
import {SearchService} from './search.service';

@Module({
  imports: [
    ElasticsearchModule.register(environment.elasticsearch),
    AssignmentModule,
  ],
  providers: [
    SearchService,
  ],
  controllers: [
    SearchController,
  ],
  exports: [
    SearchService,
  ],
})
export class SearchModule {
}
