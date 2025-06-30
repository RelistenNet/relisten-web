import React, { type JSX } from 'react';
import Flex from './Flex';

type TagProps = {
  children: React.ReactNode;
};

const Tag = ({ children }: TagProps): JSX.Element => (
  <Flex className="ml-1 items-center rounded-xs bg-emerald-500 px-1 py-0 text-[0.6em] leading-0 font-normal text-white">
    {children}
  </Flex>
);

export default Tag;
