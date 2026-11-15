import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from "react-native";
import type { Target } from "../use-stylus";
import { themedStyles, usePalette } from "../theme";
import { ComponentPath } from "./component-path";
import { TextButton } from "./text-button";

type ComposerContextValue = {
  draft: string;
  setDraft: (draft: string) => void;
  canSend: boolean;
  running: boolean;
  /** Sends `value` when given, otherwise the draft. */
  submit: (value?: string) => void;
  stop: () => void;
};

const ComposerContext = createContext<ComposerContextValue | null>(null);

function useComposer() {
  const value = use(ComposerContext);
  if (!value) throw new Error("Composer parts must be used inside Composer");
  return value;
}

type ComposerProps = {
  /** Text to put back in the field. A new `version` puts it back again. */
  restore: { text: string; version: number };
  /** A turn is streaming, so the button stops it instead of sending. */
  running: boolean;
  /** Nothing can be sent right now, such as while a change is checked on the device. */
  disabled: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  children: ReactNode;
};

export function Composer({ restore, running, disabled, onSend, onStop, children }: ComposerProps) {
  const styles = useStyles();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (restore.version > 0) setDraft(restore.text);
  }, [restore.version, restore.text]);

  const submit = (value = draft) => {
    const message = value.trim();
    if (!message || running || disabled) return;
    onSend(message);
    setDraft("");
  };

  return (
    <ComposerContext
      value={{ draft, setDraft, canSend: draft.trim() !== "" && !running && !disabled, running, submit, stop: onStop }}
    >
      <View style={styles.composer}>{children}</View>
    </ComposerContext>
  );
}

type ComposerTargetProps = {
  target: Target | null;
  onSelectLevel: (index: number) => void;
  onChange: () => void;
};

/** The element the next request is about, with a way to pick another. */
export function ComposerTarget({ target, onSelectLevel, onChange }: ComposerTargetProps) {
  const styles = useStyles();
  return (
    <View style={styles.target}>
      {target ? (
        <ComponentPath target={target} onSelect={onSelectLevel} />
      ) : (
        <Text style={styles.noTarget}>Requests apply to the whole app</Text>
      )}
      <TextButton label={target ? "Change" : "Pick an element"} tone="link" onPress={onChange} />
    </View>
  );
}

export function ComposerField({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.field}>{children}</View>;
}

type ComposerInputProps = {
  placeholder: string;
  /** The field takes focus whenever this changes, such as when a new element is picked. */
  focusKey?: unknown;
};

export function ComposerInput({ placeholder, focusKey }: ComposerInputProps) {
  const styles = useStyles();
  const palette = usePalette();
  const { draft, setDraft, submit } = useComposer();
  const input = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (focusKey !== undefined) input.current?.focus();
  }, [focusKey]);

  return (
    <TextInput
      ref={input}
      value={draft}
      onChangeText={setDraft}
      placeholder={placeholder}
      placeholderTextColor={palette.tertiary}
      selectionColor={palette.accent}
      keyboardAppearance={palette.keyboard}
      multiline
      submitBehavior="submit"
      returnKeyType="send"
      // The last keystroke may not have rendered yet, so the field's own text is sent.
      onSubmitEditing={(event) => submit(event.nativeEvent.text)}
      style={styles.input}
    />
  );
}

/** Sends the draft, or stops the change in progress. */
export function ComposerSubmit() {
  const styles = useStyles();
  const { canSend, running, submit, stop } = useComposer();
  const active = running || canSend;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={running ? "Stop" : "Send"}
      accessibilityState={{ disabled: !active }}
      disabled={!active}
      hitSlop={6}
      onPress={running ? stop : () => submit()}
      style={({ pressed }) => [
        styles.submit,
        active ? styles.submitActive : styles.submitIdle,
        pressed && styles.pressed,
      ]}
    >
      {running ? <View style={styles.stop} /> : <Text style={[styles.arrow, !active && styles.arrowIdle]}>↑</Text>}
    </Pressable>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    composer: { gap: 10 },
    target: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 8 },
    noTarget: { flex: 1, color: palette.tertiary, fontSize: 14 },
    field: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
      paddingLeft: 16,
      paddingRight: 6,
      paddingVertical: 6,
      borderRadius: 24,
      borderCurve: "continuous",
      backgroundColor: palette.surface,
    },
    input: {
      flex: 1,
      minHeight: 34,
      maxHeight: 116,
      paddingTop: 7,
      paddingBottom: 7,
      color: palette.text,
      fontSize: 16,
      lineHeight: 21,
    },
    submit: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
    submitActive: { backgroundColor: palette.accent },
    submitIdle: { backgroundColor: palette.surfaceRaised },
    pressed: { opacity: 0.8, transform: [{ scale: 0.94 }] },
    arrow: { color: palette.onAccent, fontSize: 18, fontWeight: "700", marginTop: -1 },
    arrowIdle: { color: palette.tertiary },
    stop: { width: 11, height: 11, borderRadius: 3, backgroundColor: palette.onAccent },
  }),
);
