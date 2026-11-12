// A show's venue as a pill (a map pin and the name), linking to the venue's
// page: the browse view's show header and the show page share the look.
// A plain module, not the client header's, so server pages can use it too.

export const VENUE_PILL = `
  flex min-w-0 items-center gap-1 self-start rounded bg-text-primary/5 px-1.5 py-1 text-xs
  text-text-primary transition-colors
`;
