import {AuthModule} from '@app/keycloak-auth';
import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {ScheduleModule} from '@nestjs/schedule';
import {AssigneeModule} from './assignee/assignee.module';
import {AssignmentModule} from './assignment/assignment.module';
import {CommentModule} from './comment/comment.module';
import {CourseModule} from './course/course.module';
import {environment} from './environment';
import {GradingModule} from './grading/grading.module';
import {SolutionModule} from './solution/solution.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { ClassroomModule } from './classroom/classroom.module';

@Module({
  imports: [
    MongooseModule.forRoot(environment.mongo.uri, environment.mongo.options),
    AuthModule.register(environment.auth),
    ScheduleModule.forRoot(),
    AssignmentModule,
    SolutionModule,
    AssigneeModule,
    GradingModule,
    CommentModule,
    CourseModule,
    EvaluationModule,
    ClassroomModule,
  ],
  controllers: [],
  providers: [],
})
export class AssignmentsModule {
}
