import { useEffect, useState } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";

export type KeyboardState = {
  height: number;
  /** Keyboard animation length in ms. */
  duration: number;
};

const SHOW = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const HIDE = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

export function useKeyboard(): KeyboardState {
  const [keyboard, setKeyboard] = useState<KeyboardState>({ height: 0, duration: 0 });

  useEffect(() => {
    const show = Keyboard.addListener(SHOW, (event: KeyboardEvent) =>
      setKeyboard({ height: event.endCoordinates.height, duration: event.duration || 250 }),
    );
    const hide = Keyboard.addListener(HIDE, (event: KeyboardEvent) =>
      setKeyboard({ height: 0, duration: event.duration || 250 }),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return keyboard;
}
