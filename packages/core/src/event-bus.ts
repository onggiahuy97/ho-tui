import { CoreEvent } from './events';

type Resolver<T> = (value: IteratorResult<T>) => void;

class AsyncQueue<T> implements AsyncIterable<T>, AsyncIterator<T> {
  private readonly buffer: T[] = [];
  private readonly resolvers: Resolver<T>[] = [];
  private closed = false;

  constructor(private readonly onDispose?: () => void) {}

  push(value: T): void {
    if (this.closed) {
      return;
    }

    const resolve = this.resolvers.shift();
    if (resolve) {
      resolve({ value, done: false });
      return;
    }

    this.buffer.push(value);
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    while (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift();
      resolve?.({ value: undefined as unknown as T, done: true });
    }

    this.onDispose?.();
  }

  next(): Promise<IteratorResult<T>> {
    if (this.buffer.length > 0) {
      const value = this.buffer.shift() as T;
      return Promise.resolve({ value, done: false });
    }

    if (this.closed) {
      return Promise.resolve({ value: undefined as unknown as T, done: true });
    }

    return new Promise<IteratorResult<T>>((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  return(): Promise<IteratorResult<T>> {
    this.close();
    return Promise.resolve({ value: undefined as unknown as T, done: true });
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this;
  }
}

export class EventBus {
  private readonly subscribers = new Set<AsyncQueue<CoreEvent>>();

  emit(event: CoreEvent): void {
    for (const subscriber of this.subscribers) {
      subscriber.push(event);
    }
  }

  subscribe(): AsyncIterable<CoreEvent> {
    const queue = new AsyncQueue<CoreEvent>(() => {
      this.subscribers.delete(queue);
    });

    this.subscribers.add(queue);
    return queue;
  }

  complete(): void {
    for (const subscriber of this.subscribers) {
      subscriber.close();
    }

    this.subscribers.clear();
  }
}
