export default (slug, arr = []) => {
  // TODO: check if bands have shows in the last 2 years to sort
  if (slug === 'phish') return [...arr].reverse();

  return arr;
};
