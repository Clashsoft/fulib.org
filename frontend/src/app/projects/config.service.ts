import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {forkJoin, Observable} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {DavClient} from './dav-client';
import {Container} from './model/container';

@Injectable({providedIn: 'root'})
export class ConfigService {
  constructor(
    private http: HttpClient,
    private dav: DavClient,
  ) {
  }

  private getUrl(container: Container, namespace: string, id: string) {
    return `${container.url}/dav/projects/${container.projectId}/.fulib/${namespace}/${id}`;
  }

  getObjects<T>(container: Container, namespace: string): Observable<T[]> {
    return this.dav.propFindChildren(this.getUrl(container, namespace, '')).pipe(
      map(resources => resources.map(resource => resource.href.substring(resource.href.lastIndexOf('/') + 1))),
      switchMap(ids => forkJoin(ids.map(id => this.getObject<T>(container, namespace, id)))),
    );
  }

  getObject<T>(container: Container, namespace: string, id: string): Observable<T> {
    return this.http.get<T>(this.getUrl(container, namespace, id));
  }

  putObject<T extends { id: string }>(container: Container, namespace: string, obj: T): Observable<void> {
    return this.http.put<void>(this.getUrl(container, namespace, obj.id), obj);
  }
}