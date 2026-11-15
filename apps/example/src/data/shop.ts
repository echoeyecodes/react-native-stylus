export const shop = {
  name: "Daybreak Coffee",
  location: "Mill Street",
  address: "14 Mill Street",
  pickupMinutes: 8,
  taxRate: 0.08,
};

export const customer = {
  firstName: "Alex",
  avatar: "https://i.pravatar.cc/200?img=12",
  usuals: ["flat-white", "oat-cortado", "croissant", "cold-brew"],
  payment: "Apple Pay",
};

export const stories = {
  featured: {
    itemId: "flat-white",
    image: require("../../assets/menu/hero.jpg"),
    kicker: "On bar this week",
    title: "Washed Ethiopia Guji, as a flat white",
    action: "Order one",
  },
  roastery: {
    itemId: "batch-filter",
    image: require("../../assets/menu/story.jpg"),
    kicker: "Roasted on Tuesday",
    title: "Jasmine, peach and black tea in the cup",
    action: "Try it as filter",
  },
};
