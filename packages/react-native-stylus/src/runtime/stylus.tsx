import type { ReactNode } from "react";
import { StylusRoot } from "./stylus-root";
import { openRegisteredStylus } from "./stylus-opener";

/** Wrap the app's root. Renders only its children in production builds. */
export function Stylus({ children }: { children: ReactNode }) {
  if (!__DEV__) return children;
  return <StylusRoot>{children}</StylusRoot>;
}

/** Opens Stylus from your own trigger. Does nothing in production builds. */
export function openStylus() {
  if (__DEV__) openRegisteredStylus();
}
