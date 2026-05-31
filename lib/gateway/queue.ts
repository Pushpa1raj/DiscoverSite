type QueueTask<T> = () => Promise<T>;

const DEFAULT_TASK_TIMEOUT_MS = 300_000; // 5 minutes

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Queue task timed out after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((reason) => {
        clearTimeout(timer);
        reject(reason);
      });
  });
}

class AsyncQueue {
  private running = 0;
  private readonly concurrency: number;
  private readonly taskTimeoutMs: number;
  private readonly queue: Array<{
    task: QueueTask<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  constructor(concurrency = 2, taskTimeoutMs = DEFAULT_TASK_TIMEOUT_MS) {
    this.concurrency = concurrency;
    this.taskTimeoutMs = taskTimeoutMs;
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
    withTimeout(next.task(), this.taskTimeoutMs)
      .then(next.resolve)
      .catch(next.reject)
      .finally(() => {
        this.running -= 1;
        this.runNext();
      });
  }
}

export const pipelineQueue = new AsyncQueue();
