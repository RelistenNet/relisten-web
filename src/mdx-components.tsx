import type { MDXComponents } from 'mdx/types';
import Footnote from './components/blog/Footnote';
import PieChart from './components/blog/PieChart';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Footnote,
    PieChart,
    Bleed: (props: React.ComponentProps<'div'>) => (
      <div {...props} className={`bleed ${props.className ?? ''}`} />
    ),
  };
}
