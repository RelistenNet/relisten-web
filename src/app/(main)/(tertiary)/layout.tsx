import { PropsWithChildren } from 'react';

export default function Layout({ children }: PropsWithChildren) {
  return <div className="mx-auto w-full max-w-(--breakpoint-xl) py-8">{children}</div>;
}
