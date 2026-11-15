import { Image } from "expo-image";
import { StyleSheet, type ImageStyle, type StyleProp } from "react-native";
import { menuPhotos } from "../data/menu-photos";
import { colors } from "../theme";

type MenuPhotoProps = {
  itemId: string;
  style?: StyleProp<ImageStyle>;
};

export function MenuPhoto({ itemId, style }: MenuPhotoProps) {
  return (
    <Image
      source={menuPhotos[itemId]}
      contentFit="cover"
      transition={180}
      style={[styles.photo, style]}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  photo: { backgroundColor: colors.surfaceMuted },
});
