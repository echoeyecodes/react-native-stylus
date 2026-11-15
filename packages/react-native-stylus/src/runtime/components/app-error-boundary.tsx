import { Component, type ErrorInfo, type ReactNode } from "react";
import type { AppHealth } from "../app-health";

type Props = {
  health: AppHealth;
  /** Drawn in place of the app while it is crashed. */
  fallback: (error: Error) => ReactNode;
  children: ReactNode;
};

type State = { error: Error | null };

/** Catches render errors in the app so they can't take Stylus down with it. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  #detach: (() => void) | null = null;

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidMount() {
    this.props.health.recovered();
    this.#detach = this.props.health.attach(this.retry);
  }

  componentWillUnmount() {
    this.#detach?.();
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.health.crashed(error, info.componentStack ?? "");
  }

  /** Fast Refresh only retries a crashed boundary once it has applied an update, so Stylus retries it too. */
  retry = () => {
    this.props.health.recovered();
    this.setState({ error: null });
  };

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}
