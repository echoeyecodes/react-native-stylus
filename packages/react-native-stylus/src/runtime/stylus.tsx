import type { ReactNode } from "react";
import { StylusRoot } from "./stylus-root";
import { openRegisteredStylus } from "./stylus-opener";

/**
 * Lets you edit the app from the app: hold two fingers on any element, describe a change, and
 * Claude Code makes it while Fast Refresh shows the result. Wrap the root of the app. In
 * production builds it renders its children and nothing else.
 */
export function Stylus({ children }: { children: ReactNode }) {
  if (!__DEV__) return children;
  return <StylusRoot>{children}</StylusRoot>;
}

/**
 * Opens Stylus from your own trigger, such as a dev-only button. Two fingers held on the screen
 * and "Edit with Stylus" in the dev menu do the same. Does nothing in production builds.
 */
export function openStylus() {
  if (__DEV__) openRegisteredStylus();
}
