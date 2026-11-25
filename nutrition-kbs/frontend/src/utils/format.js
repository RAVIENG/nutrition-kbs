// "non_vegetarian" -> "Non vegetarian", "tree_nuts" -> "Tree nuts"
export const prettify = (value) =>
  value ? value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "";

export const DIET_COLOR = {
  vegan: "success",
  vegetarian: "success",
  eggetarian: "warning",
  non_vegetarian: "danger",
};
