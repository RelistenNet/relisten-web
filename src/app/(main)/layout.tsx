import { PropsWithChildren } from 'react';
import NavBar from './NavBar';

export default function Layout({ children }: PropsWithChildren) {
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
