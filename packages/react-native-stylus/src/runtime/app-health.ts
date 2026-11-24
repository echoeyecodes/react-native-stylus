export type AppProblem = {
  message: string;
  /** Component stack for render errors, call stack otherwise. */
  stack: string;
  at: number;
};

/** Lets Stylus tell whether its own change broke the app. */
export class AppHealth {
  /** The render error behind the crash screen. */
  crash: AppProblem | null = null;
  #lastError: AppProblem | null = null;
  #retry: (() => void) | null = null;

  attach(retry: () => void) {
    this.#retry = retry;
    return () => {
      if (this.#retry === retry) this.#retry = null;
    };
  }

  /** Re-renders the crashed app so a fix that just landed takes effect. */
  retry() {
    if (this.crash) this.#retry?.();
  }

  crashed(error: Error, componentStack: string) {
    this.crash = { message: error.message, stack: componentStack, at: Date.now() };
  }

  recovered() {
    this.crash = null;
  }

  failed(error: unknown) {
    const reported = error instanceof Error ? error : new Error(String(error));
    this.#lastError = { message: reported.message, stack: reported.stack ?? "", at: Date.now() };
  }

  /** The crash on screen, or an error thrown at or after `since`. */
  problemSince(since: number): AppProblem | null {
    if (this.crash) return this.crash;
    return this.#lastError && this.#lastError.at >= since ? this.#lastError : null;
  }
}
