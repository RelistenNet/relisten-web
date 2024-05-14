import { PropsWithChildren } from 'react';

export default function Layout({ children }: PropsWithChildren) {
  return <div className="mx-auto w-full max-w-screen-xl py-8">{children}</div>;
}
