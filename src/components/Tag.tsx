import React, { type JSX } from 'react';
import Flex from './Flex';

type TagProps = {
  children: React.ReactNode;
};

const Tag = ({ children }: TagProps): JSX.Element => (
  <Flex className="rounded-xs ml-1 items-center bg-[#028f2b] px-1 py-[2px] text-[0.6em] font-normal text-gray-100">
    {children}
  </Flex>
);

export default Tag;
