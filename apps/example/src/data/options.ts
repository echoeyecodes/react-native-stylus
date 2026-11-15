export type OptionChoice = {
  id: string;
  label: string;
  detail?: string;
  priceDelta: number;
};

export type OptionGroup = {
  id: string;
  title: string;
  choices: OptionChoice[];
};

export const SIZE: OptionGroup = {
  id: "size",
  title: "Size",
  choices: [
    { id: "regular", label: "Regular", detail: "12 oz", priceDelta: 0 },
    { id: "large", label: "Large", detail: "16 oz", priceDelta: 0.6 },
  ],
};

export const MILK: OptionGroup = {
  id: "milk",
  title: "Milk",
  choices: [
    { id: "whole", label: "Whole", priceDelta: 0 },
    { id: "oat", label: "Oat", priceDelta: 0.6 },
    { id: "almond", label: "Almond", priceDelta: 0.6 },
    { id: "skim", label: "Skim", priceDelta: 0 },
  ],
};

export const WARMING: OptionGroup = {
  id: "warming",
  title: "How you'd like it",
  choices: [
    { id: "as-is", label: "As it is", priceDelta: 0 },
    { id: "warmed", label: "Warmed", priceDelta: 0 },
  ],
};
