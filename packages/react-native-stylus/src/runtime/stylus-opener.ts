import { DevSettings } from "react-native";

let open: (() => void) | null = null;
let menuItemAdded = false;

/**
 * Remembers how to open the mounted `<Stylus>`, and adds "Edit with Stylus" to the dev menu.
 * React Native can't remove menu items, so the item is added once and opens whichever
 * `<Stylus>` mounted last.
 */
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
