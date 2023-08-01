'use client';

import Link from 'next/link';
import Flex from '../../components/Flex';
import { SimplePopover } from '../../components/Popover';
import Menu from '../../components/Menu';
import Player from '../../components/Player';

export default function NavBar() {
  // TODO: secondary nav
  return (
    <Flex className="relative h-[50px] max-h-[50px] min-h-[50px] justify-between border-b-[1px] border-b-[#aeaeae] bg-white text-[#333333]">
      <Flex className="left font-bold lg:flex-[2]">
        <Link href="/" legacyBehavior prefetch={false}>
          <a className="ml-1 hidden h-full items-center text-center lg:flex">RELISTEN</a>
        </Link>
        <Link href="/" className="hidden" legacyBehavior prefetch={false}>
          <Flex as={'a'} className="items-center px-2 lg:hidden">
            Re
          </Flex>
        </Link>
        {/* {this.secondaryNavTitle} */}
      </Flex>
      <div className="min-w-[80%] text-center md:min-w-[60%] lg:min-w-[42vw]">
        {/* <Player /> */}
      </div>
      <SimplePopover content={<Menu />}>
        <Flex className="flex-2 h-full cursor-pointer content-end items-center text-center font-bold lg:hidden">
          <div className="flex h-full items-center px-1 active:relative active:top-[1px] active:text-[#333333]">
            MENU
          </div>
        </Flex>
      </SimplePopover>
      <div className="nav hidden h-full flex-[2] cursor-pointer items-center justify-end text-center font-bold lg:flex">
        <div className="h-full px-1">
          <Link href="/today" legacyBehavior prefetch={false}>
            <a className="nav-btn">TIH</a>
          </Link>
        </div>
        <div>
          <Link href="/recently-played" legacyBehavior prefetch={false}>
            <a className="nav-btn">RECENTLY PLAYED</a>
          </Link>
        </div>
        <div>
          <Link href="/chat" legacyBehavior prefetch={false}>
            <a className="nav-btn">CHAT</a>
          </Link>
        </div>
        <div>
          <Link href="/ios" legacyBehavior prefetch={false}>
            <a className="nav-btn">iOS</a>
          </Link>
        </div>
        <div>
          <Link href="/sonos" legacyBehavior prefetch={false}>
            <a className="nav-btn">SONOS</a>
          </Link>
        </div>
        <div>
          <Link href="/about" legacyBehavior prefetch={false}>
            <a className="nav-btn">ABOUT</a>
          </Link>
        </div>
      </div>
    </Flex>
  );
}
