import {UserToken} from '@app/keycloak-auth';
import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common';
import {Request} from 'express';
import {Observable} from 'rxjs';
import {notFound} from '@mean-stream/nestx';
import {CourseService} from "./course.service";

@Injectable()
export class CourseAuthGuard implements CanActivate {
  constructor(
    private courseService: CourseService,
  ) {
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest() as Request;
    const id = req.params.course ?? req.params.id;
    const user = (req as any).user;
    return user && this.checkAuth(id, user);
  }

  async checkAuth(id: string, user: UserToken): Promise<boolean> {
    const course = await this.courseService.findOne(id) ?? notFound(id);
    return course.createdBy === user.sub;
  }
}
