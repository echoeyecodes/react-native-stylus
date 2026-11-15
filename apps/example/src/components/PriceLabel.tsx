import { StyleProp, Text, TextStyle } from "react-native";

type PriceLabelProps = {
  amount: number;
  style?: StyleProp<TextStyle>;
};

export function PriceLabel({ amount, style }: PriceLabelProps) {
  return <Text style={[{ fontVariant: ["tabular-nums"] }, style]}>${amount.toFixed(2)}</Text>;
}
