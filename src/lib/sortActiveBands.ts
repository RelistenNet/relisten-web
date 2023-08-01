// TODO: Update return type
export default (slug?: string, arr = []): unknown[] => {
  // TODO: check if bands have shows in the last 2 years to sort
  if (slug === 'phish') return [...arr].reverse();

  return arr;
};
