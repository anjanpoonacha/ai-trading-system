/**
 * Async Queue — serializes async operations
 *
 * Ensures only one operation runs at a time on the WebSocket.
 * Callers await their turn; operations execute FIFO.
 */

export class AsyncQueue {
  private chain: Promise<void> = Promise.resolve();
  private _pending = 0;

  /** Number of items waiting or executing */
  get pending(): number {
    return this._pending;
  }

  /** Enqueue an async operation. Returns when it completes. */
  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    this._pending++;
    return new Promise<T>((resolve, reject) => {
      this.chain = this.chain.then(async () => {
        try {
          const result = await fn();
          this._pending--;
          resolve(result);
        } catch (err) {
          this._pending--;
          reject(err);
        }
      });
    });
  }
}
