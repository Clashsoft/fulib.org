import {identity, Observable} from 'rxjs';

export interface Event<T> {
  event: string;
  data: T;
}

export interface EventSource {
  listen<T>(): Observable<Event<T>>;
}

export class ServerSentEventSource {
  constructor(
    private url: string,
    private parser: (message: string) => any = JSON.parse,
    private extractor: (obj: any) => Event<any> = identity,
  ) {
  }

  listen<T>(): Observable<Event<T>> {
    return new Observable<Event<T>>(subscriber => {
      const eventSource = new EventSource(this.url);
      eventSource.onmessage = message => {
        const obj = this.parser(message.data);
        const event = this.extractor(obj);
        subscriber.next(event);
      };
      eventSource.onerror = err => subscriber.error(err);
      return () => eventSource.close();
    });
  }
}
