import { StyleSheet, Text } from "react-native";
import { customer } from "../data/shop";
import { colors, spacing, type } from "../theme";

function partOfDay() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

export function Greeting() {
  return (
    <Text style={styles.greeting}>
      Good {partOfDay()},{"\n"}
      {customer.firstName}
    </Text>
  );
}

const styles = StyleSheet.create({
  greeting: {
    ...type.display,
    color: colors.ink,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
});
