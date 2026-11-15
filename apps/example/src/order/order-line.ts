import type { MenuItem } from "../data/menu";

/** The choice made in each of an item's option groups, by group id. */
export type Choices = Record<string, string>;

export type OrderLine = {
  key: string;
  itemId: string;
  choices: Choices;
  quantity: number;
};

export function defaultChoices(item: MenuItem): Choices {
  const choices: Choices = {};
  for (const group of item.options) {
    const [first] = group.choices;
    if (first) choices[group.id] = first.id;
  }
  return choices;
}

/** The same item with the same choices is one line in the order. */
export function lineKey(itemId: string, choices: Choices) {
  const parts = Object.keys(choices)
    .sort()
    .map((group) => `${group}:${choices[group]}`);
  return [itemId, ...parts].join("|");
}

export function unitPrice(item: MenuItem, choices: Choices) {
  return item.options.reduce((price, group) => {
    const choice = group.choices.find((candidate) => candidate.id === choices[group.id]);
    return price + (choice?.priceDelta ?? 0);
  }, item.price);
}

/** The choices that differ from an item's defaults, such as "Large · Oat". */
export function describeChoices(item: MenuItem, choices: Choices) {
  const defaults = defaultChoices(item);
  return item.options
    .filter((group) => choices[group.id] !== defaults[group.id])
    .map((group) => group.choices.find((choice) => choice.id === choices[group.id])?.label)
    .filter(Boolean)
    .join(" · ");
}

export function formatPrice(amount: number) {
  return `$${amount.toFixed(2)}`;
}
