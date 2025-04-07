import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type StaggerProps = React.PropsWithChildren<{
  enabled?: boolean;
  /**
   * The direction of the enter animation.
   *
   * -1 means the animation will start from the last child and go to the first child.
   *
   * 1 means the animation will start from the first child and go to the last child.
   */
  enterDirection?: -1 | 1;
  duration?: number;
  style?: React.CSSProperties;
  /**
   * Custom animation variants for entering
   */
  entering?: () => any;
  /**
   * Custom animation variants for exiting
   */
  exiting?: () => any;

  onEnterFinished?: () => void;
  onExitFinished?: () => void;
}>;

export function Stagger({
  children,
  enabled = true,
  enterDirection = 1,
  duration = 0.4,
  style,
  entering = () => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  }),
  exiting = () => ({
    opacity: 0,
    y: 10,
    transition: { duration: 0.4 },
  }),
  onEnterFinished,
  onExitFinished,
}: StaggerProps) {
  const [state, setState] = React.useState(0);

  const incrementIndex = React.useCallback(() => {
    setState((i) => Math.min(i + 1, React.Children.count(children)));
  }, [children]);

  if (!children) {
    return null;
  }

  if (!enabled) {
    return <div style={style}>{children}</div>;
  }

  return (
    <motion.div style={style} layout className="flex flex-col gap-2">
      <AnimatePresence onExitComplete={onExitFinished}>
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) {
            return null;
          }

          if (enterDirection === -1) {
            const isVisible = state >= React.Children.count(children) - 1 - index;
            if (!isVisible) return null;
          } else {
            const isVisible = state >= index;
            if (!isVisible) return null;
          }

          const isLastEnter =
            index === (enterDirection === 1 ? React.Children.count(children) - 1 : 0);

          return (
            <motion.div
              key={child.key ?? index}
              layout
              initial={{ opacity: 0, y: 10 }}
              onAnimationComplete={(def) => {
                console.log('complete!', index, def);
                incrementIndex();
                if (isLastEnter && onEnterFinished) {
                  onEnterFinished();
                }
              }}
              animate={{
                ...entering(),
                transition: {
                  duration,
                  // delay: staggerDelay,
                  onComplete: () => {},
                },
              }}
              exit={{
                ...exiting(),
                transition: {
                  duration,
                },
              }}
            >
              {child}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
