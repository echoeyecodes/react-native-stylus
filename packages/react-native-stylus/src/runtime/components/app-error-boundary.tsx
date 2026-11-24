import { Component, type ErrorInfo, type ReactNode } from "react";
import type { AppHealth } from "../app-health";

type Props = {
  health: AppHealth;
  fallback: (error: Error) => ReactNode;
  children: ReactNode;
};

type State = { error: Error | null };

/** Keeps app render errors from taking Stylus down. */
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

  /** Fast Refresh only retries a crashed boundary after applying an update, so Stylus retries too. */
  retry = () => {
    this.props.health.recovered();
    this.setState({ error: null });
  };

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}
