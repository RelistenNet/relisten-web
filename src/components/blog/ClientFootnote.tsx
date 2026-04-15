'use client';

import {
  autoPlacement,
  safePolygon,
  useFloating,
  useHover,
  useInteractions,
} from '@floating-ui/react';
import {
  AnimatePresence,
  type AnimationGeneratorType,
  LazyMotion,
  domAnimation,
  m,
  useAnimate,
} from 'framer-motion';
import React, { useState } from 'react';

export interface Props {
  content: React.ReactNode;
  children?: React.ReactNode;
  index: number;
}

const ClientFootnote = ({ index, content, children }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [ref, animate] = useAnimate();

  const { refs, floatingStyles, context } = useFloating({
    middleware: [autoPlacement()],
    open: isOpen,
    onOpenChange: setIsOpen,
  });

  const hover = useHover(context, {
    handleClose: safePolygon(),
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  const onClick = async () => {
    await animate(ref.current, {
      scale: 1.1,
      textShadow: 'rgba(0,186,218, 0.8) 1px 0 8px',
    });
    await animate(
      ref.current,
      {
        textShadow: 'rgba(0,186,218, 0) 1px 0 4px',
        scale: 1,
      },
      { duration: 2 }
    );
  };

  return (
    <>
      <span className="group/footnote inline">
        <sup
          className="
            footnote-index relative cursor-pointer text-xs
            after:absolute after:-inset-2 after:content-['']
          "
          id={`footnote-${index}`}
          ref={refs.setReference}
          onClick={onClick}
          style={{ anchorName: `--fn-${index}` } as React.CSSProperties}
          {...getReferenceProps()}
        >
          {index}
        </sup>

        <LazyMotion features={domAnimation}>
          <AnimatePresence>
            {isOpen && (
              <m.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'ease-in-out' as AnimationGeneratorType, duration: 0.2 }}
                ref={refs.setFloating}
                style={floatingStyles}
                className="
                  z-50 inline-flex max-w-72 rounded-lg border border-gray-300 bg-white p-2
                  text-foreground shadow-lg
                  xl:hidden
                "
                {...getFloatingProps()}
              >
                &nbsp; <span>{content || children}</span>
              </m.span>
            )}
          </AnimatePresence>
        </LazyMotion>
        <span
          className="
            footnote-content hidden border-l-3 border-l-relisten/0 p-2 pt-2 transition-colors
            group-hover/footnote:border-l-relisten/65
            xl:flex
          "
          ref={ref}
          style={
            {
              anchorName: `--fn-content-${index}`,
              top:
                index === 1
                  ? `anchor(--fn-${index} top)`
                  : `max(anchor(--fn-${index} top), calc(anchor(--fn-content-${index - 1} bottom) + 0.5rem))`,
            } as React.CSSProperties
          }
        >
          <sup className="footnote-index mt-0.5 text-xs">{index}</sup>
          &nbsp; <span className="text-left text-sm text-foreground-muted">{content || children}</span>
        </span>
      </span>
    </>
  );
};

export default ClientFootnote;
