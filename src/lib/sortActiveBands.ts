// TODO: Update return type
export default <T>(slug: string, arr: T[]): T[] => {
  // TODO: check if bands have shows in the last 2 years to sort
  if (slug === 'phish') return [...arr].reverse();

  return arr;
};
