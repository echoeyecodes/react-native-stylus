import { createContext, use, useReducer, type ReactNode } from "react";
import { menuItem } from "../data/menu";
import { shop } from "../data/shop";
import { lineKey, unitPrice, type Choices, type OrderLine } from "./order-line";

type Action =
  | { type: "added"; itemId: string; choices: Choices; quantity: number }
  | { type: "quantityChanged"; key: string; quantity: number }
  | { type: "cleared" };

function reducer(lines: OrderLine[], action: Action): OrderLine[] {
  switch (action.type) {
    case "added": {
      const key = lineKey(action.itemId, action.choices);
      const existing = lines.find((line) => line.key === key);
      if (existing) {
        return lines.map((line) => (line.key === key ? { ...line, quantity: line.quantity + action.quantity } : line));
      }
      return [...lines, { key, itemId: action.itemId, choices: action.choices, quantity: action.quantity }];
    }
    case "quantityChanged":
      return action.quantity <= 0
        ? lines.filter((line) => line.key !== action.key)
        : lines.map((line) => (line.key === action.key ? { ...line, quantity: action.quantity } : line));
    case "cleared":
      return [];
  }
}

function useOrderState() {
  const [lines, dispatch] = useReducer(reducer, []);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + unitPrice(menuItem(line.itemId), line.choices) * line.quantity, 0);
  const tax = Math.round(subtotal * shop.taxRate * 100) / 100;

  return {
    lines,
    count,
    subtotal,
    tax,
    total: subtotal + tax,
    add: (itemId: string, choices: Choices, quantity = 1) => dispatch({ type: "added", itemId, choices, quantity }),
    setQuantity: (key: string, quantity: number) => dispatch({ type: "quantityChanged", key, quantity }),
    clear: () => dispatch({ type: "cleared" }),
  };
}

const OrderContext = createContext<ReturnType<typeof useOrderState> | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  return <OrderContext value={useOrderState()}>{children}</OrderContext>;
}

export function useOrder() {
  const order = use(OrderContext);
  if (!order) throw new Error("useOrder must be used inside OrderProvider");
  return order;
}

/** How many of an item are in the order, across all its choices. */
export function useQuantityInOrder(itemId: string) {
  return useOrder().lines.reduce((sum, line) => (line.itemId === itemId ? sum + line.quantity : sum), 0);
}
