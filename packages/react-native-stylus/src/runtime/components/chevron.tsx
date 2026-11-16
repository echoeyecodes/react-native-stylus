import { View } from "react-native";
import { usePalette } from "../theme";
import { Icon } from "./icon";

export function Chevron({ expanded }: { expanded: boolean }) {
  const palette = usePalette();
  return (
    <View style={expanded && { transform: [{ rotate: "180deg" }] }}>
      <Icon name="chevron-down" color={palette.tertiary} size={15} />
    </View>
  );
}
