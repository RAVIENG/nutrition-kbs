export const foodRegionFilter = (region) => {
  if (!region) return undefined;
  return region === "Pan-India" ? region : { $in: [region, "Pan-India"] };
};
