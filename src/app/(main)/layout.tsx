import { PropsWithChildren } from 'react';
import NavBar from './NavBar';
import Flex from '../../components/Flex';

export default function Layout({ children }: PropsWithChildren) {
  return (
    <Flex column className="h-screen">
      <NavBar />
      {children}
    </Flex>
  );
}
