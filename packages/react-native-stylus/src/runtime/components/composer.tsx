import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from "react-native";
import type { Target } from "../use-stylus";
import { themedStyles, usePalette } from "../theme";
import { ComponentPath } from "./component-path";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";

type ComposerContextValue = {
  draft: string;
  setDraft: (draft: string) => void;
  canSend: boolean;
  running: boolean;
  /** Sends `value` when given, otherwise the draft. */
  submit: (value?: string) => void;
  stop: () => void;
  pathOpen: boolean;
  setPathOpen: (open: boolean) => void;
};

const ComposerContext = createContext<ComposerContextValue | null>(null);

function useComposer() {
  const value = use(ComposerContext);
  if (!value) throw new Error("Composer parts must be used inside Composer");
  return value;
}

type ComposerProps = {
  draft: string;
  onDraftChange: (draft: string) => void;
  /** A turn is streaming, so the button stops it instead of sending. */
  running: boolean;
  /** Nothing can be sent right now, such as while a change is checked on the device. */
  disabled: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  children: ReactNode;
};

export function Composer({ draft, onDraftChange, running, disabled, onSend, onStop, children }: ComposerProps) {
  const styles = useStyles();
  const [pathOpen, setPathOpen] = useState(false);

  const submit = (value = draft) => {
    const message = value.trim();
    if (!message || running || disabled) return;
    onSend(message);
    onDraftChange("");
    setPathOpen(false);
  };

  return (
    <ComposerContext
      value={{
        draft,
        setDraft: onDraftChange,
        canSend: draft.trim() !== "" && !running && !disabled,
        running,
        submit,
        stop: onStop,
        pathOpen,
        setPathOpen,
      }}
    >
      <View style={styles.composer}>{children}</View>
    </ComposerContext>
  );
}

type ComposerPathProps = {
  target: Target | null;
  onSelectLevel: (index: number) => void;
  onPick: () => void;
};

/** The picked element's place in the component tree, shown when its name is tapped. */
export function ComposerPath({ target, onSelectLevel, onPick }: ComposerPathProps) {
  const styles = useStyles();
  const { pathOpen } = useComposer();
  if (!pathOpen) return null;

  return (
    <View style={styles.path}>
      {target ? (
        <ComponentPath target={target} onSelect={onSelectLevel} />
      ) : (
        <Text style={styles.wholeApp}>Requests apply to the whole app</Text>
      )}
      <IconButton
        icon="inspect"
        label={target ? "Pick another element" : "Pick an element"}
        size="small"
        onPress={onPick}
      />
    </View>
  );
}

export function ComposerRow({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.row}>{children}</View>;
}

/** The element the next request is about. */
export function ComposerTarget({ target }: { target: Target | null }) {
  const styles = useStyles();
  const palette = usePalette();
  const { pathOpen, setPathOpen } = useComposer();
  const name = target?.components[target.selected]?.name ?? "Whole app";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, show component path`}
      accessibilityState={{ expanded: pathOpen }}
      hitSlop={6}
      onPress={() => setPathOpen(!pathOpen)}
      style={({ pressed }) => [styles.target, pressed && styles.pressed]}
    >
      <Text numberOfLines={1} style={[styles.targetName, !target && styles.targetNone]}>
        {name}
      </Text>
      <View style={pathOpen && styles.flipped}>
        <Icon name="chevron-down" color={target ? palette.accent : palette.secondary} size={15} />
      </View>
    </Pressable>
  );
}

export function ComposerField({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.field}>{children}</View>;
}

type ComposerInputProps = {
  placeholder: string;
  autoFocus?: boolean;
  /** The field takes focus when this changes after mounting, such as when another element is picked. */
  focusKey?: unknown;
};

export function ComposerInput({ placeholder, autoFocus, focusKey }: ComposerInputProps) {
  const styles = useStyles();
  const palette = usePalette();
  const { draft, setDraft, submit } = useComposer();
  const input = useRef<TextInputInstance>(null);
  const mountedKey = useRef(focusKey);

  useEffect(() => {
    if (focusKey !== mountedKey.current) input.current?.focus();
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
      autoFocus={autoFocus}
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
  const palette = usePalette();
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
      <Icon name={running ? "stop" : "arrow-up"} color={active ? palette.onAccent : palette.tertiary} size={18} />
    </Pressable>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    composer: { gap: 8 },
    path: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 6, paddingTop: 2 },
    wholeApp: { flex: 1, color: palette.tertiary, fontSize: 14 },
    row: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
    target: { flexDirection: "row", alignItems: "center", gap: 2, maxWidth: 132, height: 44, paddingHorizontal: 6 },
    targetName: { flexShrink: 1, color: palette.accent, fontSize: 14.5, fontWeight: "600" },
    targetNone: { color: palette.secondary },
    flipped: { transform: [{ rotate: "180deg" }] },
    field: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
      paddingLeft: 14,
      paddingRight: 5,
      paddingVertical: 5,
      borderRadius: 22,
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
  }),
);
