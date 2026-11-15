export class MessageQueue<T> implements AsyncIterable<T> {
  #items: T[] = [];
  #wake: (() => void) | null = null;
  #ended = false;

  push(item: T) {
    this.#items.push(item);
    this.#wake?.();
  }

  end() {
    this.#ended = true;
    this.#wake?.();
  }

  async *[Symbol.asyncIterator]() {
    while (true) {
      const item = this.#items.shift();
      if (item !== undefined) {
        yield item;
        continue;
      }
      if (this.#ended) return;
      await new Promise<void>((resolve) => (this.#wake = resolve));
      this.#wake = null;
    }
  }
}
