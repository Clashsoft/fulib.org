import {forwardRef, Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {Member, MemberAuthGuard, MemberSchema, MemberService} from '@app/member';
import {MemberController} from './member.controller';
import {MemberHandler} from "./member.handler";
import {AssignmentModule} from "../assignment/assignment.module";

@Module({
  imports: [
    MongooseModule.forFeature([{name: Member.name, schema: MemberSchema}]),
    forwardRef(() => AssignmentModule),
  ],
  controllers: [MemberController],
  providers: [
    MemberService,
    MemberAuthGuard,
    MemberHandler,
  ],
  exports: [
    MemberService,
    MemberAuthGuard,
  ],
})
export class MemberModule {
}
