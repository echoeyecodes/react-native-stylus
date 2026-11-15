export type AppProblem = {
  message: string;
  /** A component stack for render errors, a call stack for other errors. */
  stack: string;
  at: number;
};

/** What has gone wrong in the app, so Stylus can tell whether its own change broke it. */
export class AppHealth {
  /** The render error the app is showing the crash screen for. */
  crash: AppProblem | null = null;
  #lastError: AppProblem | null = null;
  #retry: (() => void) | null = null;

  /** Lets the error boundary be asked to render the app again. */
  attach(retry: () => void) {
    this.#retry = retry;
    return () => {
      if (this.#retry === retry) this.#retry = null;
    };
  }

  /** Renders the crashed app again, so a fix that just landed can take effect. */
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
