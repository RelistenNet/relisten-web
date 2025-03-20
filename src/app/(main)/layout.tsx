import { PropsWithChildren } from 'react';
import parser from 'ua-parser-js';
import NavBar from './NavBar';
import Flex from '../../components/Flex';
import { headers } from 'next/headers';

export const getUserAgent = async () => {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent');

  if (!userAgent) return null;

  return parser(userAgent);
};

export default async function Layout({ children }: PropsWithChildren) {
  return (
    <Flex column className="h-screen">
      <NavBar />
      {children}
    </Flex>
  );
}
