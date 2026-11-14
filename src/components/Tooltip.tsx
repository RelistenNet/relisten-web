'use client';

import cn from '@/lib/cn';
import { buildAnchorStyles, type Placement } from 'css-anchor-kit';
import {
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
  Component,
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
  className?: string;
  contentClassName?: string;
  align?: 'left' | 'right' | 'top' | 'bottom';
};

const placementMap = {
  top: 'top',
  bottom: 'bottom',
  left: 'bottom-start',
  right: 'bottom-end',
} as const satisfies Record<string, Placement>;

export const TooltipThemeContext = createContext<'light' | 'dark' | 'auto'>('auto');

type Shown = {
  content: ReactNode;
  placement: Placement;
  contentClassName?: string;
  theme: 'light' | 'dark' | 'auto';
};

type TooltipApi = {
  show: (trigger: HTMLElement, shown: Shown) => void;
  hide: (trigger?: HTMLElement) => void;
};

const TooltipApiContext = createContext<TooltipApi | null>(null);

// Only one tooltip is ever open, so the app has a single tooltip element, and
// a trigger hands it content on hover or focus. List rows each have a
// tooltip, and rendering a popover per row (with its own state and anchor
// styles) was a large share of those pages' HTML and SSR time.
const ANCHOR_NAME = '--tooltip-anchor';

// Browsers without the Popover API (Safari < 17, Firefox < 125) get no
// tooltips: calling showPopover there throws, and since TooltipHost wraps the
// whole app in Providers, that error unmounts everything, player included.
const supportsPopover = () =>
  typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';

// The popover mounts when a tooltip is shown and unmounts when it's hidden
// (which closes it), so showing it on attach is all it needs. A tooltip must
// never take the page down, so failures (e.g. InvalidStateError) are swallowed.
const showOnAttach = (popover: HTMLDivElement | null) => {
  if (!popover || popover.matches(':popover-open')) return;
  try {
    popover.showPopover();
  } catch {
    // Not worth an error boundary: the tooltip just doesn't show.
  }
};

/**
 * Contains a failing tooltip. TooltipHost sits above the whole app, so an error
 * that escaped it would remount everything, including PlayerManager, which
 * reloads the queue and restarts the song. On error this renders nothing and
 * tries again once `resetKey` changes (the next tooltip shown).
 */
type BoundaryProps = { children: ReactNode; resetKey: unknown };
type BoundaryState = { failed: boolean; resetKey: unknown };

class TooltipBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState) {
    return props.resetKey === state.resetKey ? null : { failed: false, resetKey: props.resetKey };
  }

  componentDidCatch(error: unknown) {
    console.error('Tooltip failed to render:', error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Renders the app's one tooltip. Mount once, around everything that uses `<Tooltip>`. */
export function TooltipHost({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const id = useId();

  const api = useMemo<TooltipApi>(() => {
    // Anchoring happens in the triggers' event handlers: the anchor name and
    // description move to whichever trigger is current.
    const detach = () => {
      const trigger = triggerRef.current;
      trigger?.style.removeProperty('anchor-name');
      trigger?.removeAttribute('aria-describedby');
      triggerRef.current = null;
    };
    return {
      show(trigger, next) {
        if (!supportsPopover()) return;
        detach();
        trigger.style.setProperty('anchor-name', ANCHOR_NAME);
        trigger.setAttribute('aria-describedby', id);
        triggerRef.current = trigger;
        setShown(next);
      },
      hide(trigger) {
        if (trigger && trigger !== triggerRef.current) return;
        detach();
        setShown(null);
      },
    };
  }, [id]);

  const [side, alignment = 'center'] = shown?.placement.split('-') ?? [];

  return (
    <TooltipApiContext.Provider value={api}>
      {children}
      <TooltipBoundary resetKey={shown}>
        {shown && (
          <div
            ref={showOnAttach}
            id={id}
            // `hint` closes on Escape without closing other popovers. Browsers
            // without it treat the value as `manual`; triggers handle Escape too.
            popover="hint"
            onToggle={(e) => e.newState === 'closed' && api.hide()}
            role="tooltip"
            style={{
              // Undo the UA popover's `inset: 0`, which would pin the unanchored sides.
              inset: 'auto',
              ...buildAnchorStyles(ANCHOR_NAME, {
                placement: shown.placement,
                offset: 4,
              }).floating,
            }}
            // `anchored-safe` keeps the tooltip clear of the notch / home indicator.
            data-side={side}
            data-align={alignment}
            className={cn(
              shown.contentClassName,
              // Non-interactive: the tooltip often overlaps the next row's trigger, and
              // if it caught the pointer, hovering that trigger would never open its tooltip.
              'anchored-safe pointer-events-none rounded-sm border p-2 text-sm shadow-lg',
              shown.theme === 'light'
                ? 'border-gray-200 bg-white text-gray-900'
                : 'border-foreground-muted/20 bg-surface-raised text-text-primary'
            )}
          >
            {shown.content}
          </div>
        )}
      </TooltipBoundary>
    </TooltipApiContext.Provider>
  );
}

/** Shows `content` in the app's tooltip while `children` is hovered or focused. */
export default function Tooltip({
  children,
  content,
  contentClassName,
  className,
  align = 'bottom',
}: TooltipProps) {
  const api = useContext(TooltipApiContext);
  const theme = useContext(TooltipThemeContext);

  const show = (e: SyntheticEvent<HTMLDivElement>) =>
    api?.show(e.currentTarget, {
      content,
      placement: placementMap[align],
      contentClassName,
      theme,
    });
  const hide = (e: SyntheticEvent<HTMLDivElement>) => api?.hide(e.currentTarget);
  // A trigger that unmounts while shown gets no pointerleave or blur (e.g. a
  // list row replaced under the pointer), so dismiss its tooltip on detach.
  // Stable, so it doesn't detach and reattach on every render.
  const hideOnDetach = useCallback(
    (trigger: HTMLDivElement | null) => () => {
      if (trigger) api?.hide(trigger);
    },
    [api]
  );

  return (
    <div
      ref={hideOnDetach}
      className={className}
      onPointerEnter={(e) => e.pointerType !== 'touch' && show(e)}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => e.key === 'Escape' && hide(e)}
    >
      {children}
    </div>
  );
}
