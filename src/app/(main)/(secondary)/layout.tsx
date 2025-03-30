import { PropsWithChildren } from 'react';

export default function Layout({ children }: PropsWithChildren) {
  return <div className="mx-auto max-w-(--breakpoint-md) py-8">{children}</div>;
}
