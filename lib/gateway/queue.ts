type QueueTask<T> = () => Promise<T>;

class AsyncQueue {
  private running = 0;
  private readonly concurrency: number;
  private readonly queue: Array<{
    task: QueueTask<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  constructor(concurrency = 2) {
    this.concurrency = concurrency;
  }

  enqueue<T>(task: QueueTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        task,
        resolve: resolve as (value: unknown) => void,
        reject
      });
      this.runNext();
    });
  }

  private runNext(): void {
    if (this.running >= this.concurrency) {
      return;
    }

    const next = this.queue.shift();
    if (!next) {
      return;
    }

    this.running += 1;
    next.task()
      .then(next.resolve)
      .catch(next.reject)
      .finally(() => {
        this.running -= 1;
        this.runNext();
      });
  }
}

export const pipelineQueue = new AsyncQueue();
