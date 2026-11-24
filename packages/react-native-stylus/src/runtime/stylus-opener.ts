import { DevSettings } from "react-native";

let open: (() => void) | null = null;
let menuItemAdded = false;

/** React Native can't remove menu items, so the item is added once and opens the latest `<Stylus>`. */
export function registerOpener(opener: () => void) {
  open = opener;
  if (menuItemAdded) return;
  menuItemAdded = true;
  DevSettings.addMenuItem("Edit with Stylus", () => open?.());
}

export function unregisterOpener(opener: () => void) {
  if (open === opener) open = null;
}

export function openRegisteredStylus() {
  open?.();
}
