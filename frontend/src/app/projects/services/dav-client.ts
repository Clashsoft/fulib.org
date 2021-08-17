import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map, mapTo} from 'rxjs/operators';
import {DavResource} from '../model/dav-resource';

@Injectable()
export class DavClient {

  constructor(
    private http: HttpClient,
  ) {
  }

  private toResource(doc: Document): DavResource {
    const file = new DavResource();
    const responseNode = doc.createExpression('/D:multistatus/D:response[1]', () => 'DAV:')
      .evaluate(doc, XPathResult.FIRST_ORDERED_NODE_TYPE).singleNodeValue;
    if (responseNode) {
      this.copyToResource(doc, responseNode, file);
    }
    return file;
  }

  private toResources(doc: Document): DavResource[] {
    const responseNodes = doc.createExpression('/D:multistatus/D:response', () => 'DAV:')
      .evaluate(doc, XPathResult.ORDERED_NODE_ITERATOR_TYPE);

    const children: DavResource[] = [];
    for (let responseNode = responseNodes.iterateNext(); responseNode; responseNode = responseNodes.iterateNext()) {
      const resource = new DavResource();
      this.copyToResource(doc, responseNode, resource);
      children.push(resource);
    }

    return children;
  }

  private copyToResource(doc: Document, responseNode: Node, resource: DavResource): void {
    resource.href = doc.evaluate('./D:href/text()', responseNode, () => 'DAV:', XPathResult.STRING_TYPE).stringValue;
    resource.modified = new Date(doc.evaluate('./D:propstat/D:prop/D:getlastmodified/text()', responseNode, () => 'DAV:',
      XPathResult.STRING_TYPE).stringValue);
  }

  mkcol(url: string): Observable<void> {
    return this.http.request<void>('MKCOL', url);
  }

  propFind(url: string): Observable<DavResource> {
    return this.http.request('PROPFIND', url, {responseType: 'text'}).pipe(
      map(text => new DOMParser().parseFromString(text, 'text/xml')),
      map(document => this.toResource(document)),
    );
  }

  propFindAll(url: string): Observable<DavResource[]> {
    return this.http.request('PROPFIND', url, {
      responseType: 'text',
      headers: {Depth: '1'},
    }).pipe(
      map(text => new DOMParser().parseFromString(text, 'text/xml')),
      map(doc => this.toResources(doc)),
    );
  }

  delete(url: string): Observable<void> {
    return this.http.delete<void>(url);
  }

  move(from: string, to: string): Observable<void> {
    return this.http.request<void>('MOVE', from, {
      headers: {Destination: to},
    });
  }

  get(url: string): Observable<string> {
    return this.http.get(url, {responseType: 'text'});
  }

  put(url: string, content: string | File): Observable<void> {
    return this.http.put(url, content, {responseType: 'text'}).pipe(mapTo(undefined));
  }
}
