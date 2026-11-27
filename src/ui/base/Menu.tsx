'use client';

import { Menu } from '@base-ui/react/menu';
import { ChevronRightIcon, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import cn from '@/lib/cn';

// The site's menus (a row's ⋯, Add to Playlist, the editor's, Publish), on Base
// UI's Menu: its Root, Trigger and SubmenuRoot as they are, and the parts that
// carry the look. An item's look is the `menu-item` utility (globals.css): items,
// link items and submenu triggers all wear it.

export const MenuRoot = Menu.Root;
export const MenuTrigger = Menu.Trigger;
export const MenuSubmenuRoot = Menu.SubmenuRoot;
/** Makes the Root or SubmenuRoot it wraps filterable: add a <MenuInput> and put the items in a <MenuList>. */
export const MenuFilterProvider = Menu.FilterProvider;
export const useMenuFilter = Menu.useFilter;

/**
 * A menu's popup, in its portal beside the trigger. Capped (never wider than the
 * screen), so a long label (a song's name, a playlist's) ends in an ellipsis
 * instead of stretching it: put labels in a `min-w-0 truncate` span.
 */
export function MenuContent({
  align,
  className,
  children,
}: {
  align?: ComponentProps<typeof Menu.Positioner>['align'];
  className?: string;
  children: ReactNode;
}) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} sideOffset={4} className="z-50 outline-none">
        <Menu.Popup
          className={cn(
            `
              max-w-[min(18rem,calc(100vw-2rem))] min-w-44 origin-(--transform-origin) rounded-lg
              bg-surface-raised p-1 text-text-primary shadow-lg ring-1 ring-hairline
              transition-[scale,opacity] outline-none data-ending-style:scale-95
              data-ending-style:opacity-0 data-starting-style:scale-95
              data-starting-style:opacity-0 dark:shadow-none
            `,
            className
          )}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

/** An item's icon, muted, before its label. */
function Icon({ icon: Glyph }: { icon?: LucideIcon }) {
  return Glyph ? <Glyph size={16} className="shrink-0 text-text-muted" aria-hidden /> : null;
}

export function MenuItem({
  icon,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Menu.Item>, 'className'> & {
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Menu.Item className={cn('menu-item', className)} {...props}>
      <Icon icon={icon} />
      {children}
    </Menu.Item>
  );
}

/** A link. Closes the menu when followed (Base UI leaves it open, for full page loads). */
export function MenuLinkItem({
  icon,
  className,
  closeOnClick = true,
  children,
  ...props
}: Omit<ComponentProps<typeof Menu.LinkItem>, 'className'> & {
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Menu.LinkItem className={cn('menu-item', className)} closeOnClick={closeOnClick} {...props}>
      <Icon icon={icon} />
      {children}
    </Menu.LinkItem>
  );
}

/** Opens a submenu: its label fills the row, with a chevron at the end. */
export function MenuSubmenuTrigger({ icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <Menu.SubmenuTrigger className="menu-item">
      <Icon icon={icon} />
      <span className="flex-1">{children}</span>
      <ChevronRightIcon size={14} className="shrink-0 text-text-muted" aria-hidden />
    </Menu.SubmenuTrigger>
  );
}

/**
 * A filterable menu's search field, at the top of the popup. Arrow keys move the
 * highlight through the list while it keeps focus.
 */
export function MenuInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Menu.Input>, 'className'> & { className?: string }) {
  return (
    <div className="mb-1 border-b border-hairline px-1 pb-1">
      <Menu.Input
        className={cn(
          `
            w-full rounded-md bg-transparent px-1.5 py-1.5 text-base outline-none
            placeholder:text-text-muted data-highlighted:bg-surface-hover sm:text-sm
          `,
          className
        )}
        {...props}
      />
    </div>
  );
}

/** A filterable menu's items, under its <MenuInput>. */
export function MenuList({
  className,
  ...props
}: Omit<ComponentProps<typeof Menu.List>, 'className'> & { className?: string }) {
  return <Menu.List className={cn('outline-none', className)} {...props} />;
}

export function MenuSeparator({ className }: { className?: string }) {
  return <Menu.Separator className={cn('mx-2 my-1 h-px bg-hairline', className)} />;
}
