import React from 'react';
import Flex from './Flex';

type TagProps = {
  children: React.ReactNode;
};

const Tag = ({ children }: TagProps): JSX.Element => (
  <Flex className="ml-1 items-center rounded-sm bg-[#028f2b] px-1 py-[2px] text-[0.6em] font-normal text-white">
    {children}
  </Flex>
);

export default Tag;
