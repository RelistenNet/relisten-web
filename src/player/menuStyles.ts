// The player's menus (a row's ⋯, Add to Playlist) look alike.

export const MENU_ITEM = `
  flex cursor-default items-center gap-2 rounded-md py-2.5 pr-3 pl-2.5 text-base outline-none
  select-none data-highlighted:bg-surface-hover data-disabled:text-text-muted sm:py-1.5 sm:pr-2.5
  sm:pl-2 sm:text-sm
`;

// Capped (never wider than the screen), so a long label (a song's name, a
// playlist's) ends in an ellipsis instead of stretching the menu: put labels in a
// `min-w-0 truncate` span.
export const MENU_POPUP = `
  max-w-[min(18rem,calc(100vw-2rem))] min-w-44 origin-(--transform-origin) rounded-lg bg-surface-raised p-1 text-text-primary
  shadow-lg ring-1 ring-hairline transition-[transform,opacity] outline-none
  data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95
  data-starting-style:opacity-0 dark:shadow-none
`;
