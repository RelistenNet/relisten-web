import { PropsWithChildren } from 'react';

export default function BlogLayout({ children }: PropsWithChildren) {
  return <div className="my-8">{children}</div>;
}
