import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';

import {saveAs} from 'file-saver';
import {Observable, of} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {environment} from '../../../environments/environment';
import {UserService} from '../../user/user.service';
import Course, {CourseStudent, CreateCourseDto, UpdateCourseDto} from '../model/course';
import {StorageService} from "../../services/storage.service";

@Injectable()
export class CourseService {
  constructor(
    private http: HttpClient,
    private userService: UserService,
    private storageService: StorageService,
  ) {
  }

  // --------------- Draft ---------------

  get draft(): CreateCourseDto | null {
    const json = this.storageService.get('courseDraft');
    return json ? JSON.parse(json) : null;
  }

  set draft(value: CreateCourseDto | null) {
    this.storageService.set('courseDraft', value ? JSON.stringify(value) : null);
  }

  // --------------- Import/Export ---------------

  download(course: Course | CreateCourseDto): void {
    const json = JSON.stringify(course, undefined, '  ');
    saveAs(new Blob([json], {type: 'application/json'}), course.title + '.json');
  }

  upload(file: File): Observable<Course> {
    return new Observable(subscriber => {
      const reader = new FileReader();
      reader.onload = _ => {
        const text = reader.result as string;
        const course: Course = {...JSON.parse(text)};
        subscriber.next(course);
      };
      reader.readAsText(file);
    });
  }

  // --------------- HTTP Methods ---------------

  get(id: string): Observable<Course> {
    return this.http.get<Course>(`${environment.assignmentsApiUrl}/courses/${id}`);
  }

  getStudents(id: string): Observable<CourseStudent[]> {
    return this.http.get<CourseStudent[]>(`${environment.assignmentsApiUrl}/courses/${id}/students`);
  }

  create(course: CreateCourseDto): Observable<Course> {
    return this.http.post<Course>(`${environment.assignmentsApiUrl}/courses`, course);
  }

  update(id: string, update: UpdateCourseDto): Observable<Course> {
    return this.http.patch<Course>(`${environment.assignmentsApiUrl}/courses/${id}`, update);
  }

  delete(id: string): Observable<Course> {
    return this.http.delete<Course>(`${environment.assignmentsApiUrl}/courses/${id}`);
  }

  getOwn(): Observable<Course[]> {
    return this.userService.getCurrent().pipe(
      switchMap(user => user ? this.http.get<Course[]>(`${environment.assignmentsApiUrl}/courses`, {params: {createdBy: user.id!}}) : of([])),
    );
  }
}
