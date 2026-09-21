import type { MDXComponents } from 'mdx/types';
import Footnote from './components/blog/Footnote';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Footnote,
    Bleed: (props: React.ComponentProps<'div'>) => (
      <div {...props} className={`bleed ${props.className ?? ''}`} />
    ),
  };
}
