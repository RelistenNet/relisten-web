import 'server-only';
import { cache } from 'react';
import ClientFootnote, { type Props } from './ClientFootnote';

const map = cache(() => ({ idx: 0 }));

export const footnotes = cache(() => [] as Props[]);

export default function Footnote(props: Omit<Props, 'index'>) {
  const idx = ++map().idx;

  footnotes().push({ ...props, index: idx });

  return <ClientFootnote {...props} index={idx} />;
}
