import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type ScrollViewInstance,
} from "react-native";
import type { Target } from "../use-stylus";
import { themedStyles, usePalette } from "../theme";
import { EdgeFade } from "./edge-fade";

type Props = {
  target: Target;
  onSelect: (index: number) => void;
};

/** Shown outermost first; `target.components` is innermost first. */
export function ComponentPath({ target, onSelect }: Props) {
  const styles = useStyles();
  const palette = usePalette();
  const scroll = useRef<ScrollViewInstance>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });
  const selected = target.components[target.selected];
  const outerFirst = target.components.map((component, index) => ({ component, index })).reverse();

  const measure = ({ contentOffset, contentSize, layoutMeasurement }: NativeScrollEvent) => {
    const left = contentOffset.x > 1;
    const right = contentOffset.x + layoutMeasurement.width < contentSize.width - 1;
    setOverflow((current) => (current.left === left && current.right === right ? current : { left, right }));
  };

  return (
    <View style={styles.container}>
      <View>
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(event) => measure(event.nativeEvent)}
          // The innermost components matter most, so the path starts scrolled to its end.
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={styles.path}
        >
          {outerFirst.map(({ component, index }, position) => (
            <View key={index} style={styles.step}>
              {position > 0 && <Text style={styles.separator}>›</Text>}
              <Pressable accessibilityRole="button" hitSlop={6} onPress={() => onSelect(index)}>
                <Text style={[styles.name, index === target.selected && styles.selected]}>{component.name}</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
        {overflow.left && <EdgeFade side="left" color={palette.sheet} />}
        {overflow.right && <EdgeFade side="right" color={palette.sheet} />}
      </View>
      {selected && (
        <Text numberOfLines={1} style={styles.location}>
          {fileName(selected.location.file)}, line {selected.location.line}
        </Text>
      )}
    </View>
  );
}

function fileName(file: string) {
  return file.slice(file.lastIndexOf("/") + 1);
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    container: { flex: 1, gap: 1 },
    path: { alignItems: "center" },
    step: { flexDirection: "row", alignItems: "center" },
    separator: { color: palette.tertiary, fontSize: 14, marginHorizontal: 5 },
    name: { color: palette.secondary, fontSize: 14, fontWeight: "500" },
    selected: { color: palette.text, fontWeight: "600" },
    location: { color: palette.tertiary, fontSize: 12 },
  }),
);
