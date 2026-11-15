import { Text, type StyleProp, type TextStyle } from "react-native";
import { formatPrice } from "../order/order-line";
import { colors, type } from "../theme";

type PriceLabelProps = {
  amount: number;
  style?: StyleProp<TextStyle>;
};

export function PriceLabel({ amount, style }: PriceLabelProps) {
  return <Text style={[{ ...type.price, color: colors.ink }, style]}>{formatPrice(amount)}</Text>;
}
