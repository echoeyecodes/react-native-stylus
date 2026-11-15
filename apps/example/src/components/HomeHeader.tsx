import { Image } from "expo-image";
import { ChevronDown, MapPin } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { customer, shop } from "../data/shop";
import { colors, spacing, type } from "../theme";

export function HomeHeader() {
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" hitSlop={8} style={styles.location}>
        <View style={styles.pin}>
          <MapPin size={16} strokeWidth={2.2} color={colors.caramel} />
        </View>
        <View>
          <View style={styles.locationRow}>
            <Text style={styles.locationName}>{shop.location}</Text>
            <ChevronDown size={16} strokeWidth={2.4} color={colors.ink} />
          </View>
          <Text style={styles.locationDetail}>Pickup in about {shop.pickupMinutes} min</Text>
        </View>
      </Pressable>
      <Image source={{ uri: customer.avatar }} accessibilityLabel={customer.firstName} style={styles.avatar} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  location: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.caramelSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: spacing.xxs },
  locationName: { ...type.label, color: colors.ink },
  locationDetail: { ...type.caption, color: colors.inkSecondary },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted },
});
