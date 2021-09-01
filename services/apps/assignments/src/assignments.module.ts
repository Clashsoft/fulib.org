import {AuthModule} from '@app/keycloak-auth';
import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {AssignmentModule} from './assignment/assignment.module';
import {CourseModule} from './course/course.module';
import {environment} from './environment';
import {SolutionModule} from './solution/solution.module';

@Module({
  imports: [
    MongooseModule.forRoot(environment.mongo.uri, environment.mongo.options),
    AuthModule.register(environment.auth),
    AssignmentModule,
    SolutionModule,
    CourseModule,
  ],
  controllers: [],
  providers: [],
})
export class AssignmentsModule {
}
