import { PropsWithChildren } from 'react';

export default function BlogLayout({ children }: PropsWithChildren) {
  return <div className="blog-post">{children}</div>;
}
