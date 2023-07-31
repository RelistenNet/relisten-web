import { PropsWithChildren } from 'react';

export default function Layout({ children }: PropsWithChildren) {
  return <div className="mx-auto max-w-screen-md py-8">{children}</div>;
}
