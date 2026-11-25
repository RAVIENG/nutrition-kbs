// Which food diet types may a user with a given preference eat?
const ALLOWED = {
  vegan: ["vegan"],
  vegetarian: ["vegan", "vegetarian"],
  eggetarian: ["vegan", "vegetarian", "eggetarian"],
  non_vegetarian: ["vegan", "vegetarian", "eggetarian", "non_vegetarian"],
};

export const allowedDietTypes = (preference) => ALLOWED[preference] ?? [];

export const isDietCompatible = (preference, foodDietType) =>
  allowedDietTypes(preference).includes(foodDietType);
