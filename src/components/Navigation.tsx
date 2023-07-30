import Link from 'next/link';
import { Component, Fragment } from 'react';
import { connect } from 'react-redux';

import { Artist, Meta } from '../types';
import Menu from './Menu';
import Player from './Player';
import { SimplePopover } from './Popover';
import Flex from './Flex';

type NavigationProps = {
  artists?: {
    data: Artist[];
    meta: Meta;
  };
  // TODO: Update type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app?: any;
  navPrefix?: string;
  navSubtitle?: string;
  navURL?: string;
};

class Navigation extends Component<NavigationProps> {
  // TODO: Update type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modal: any;
  render() {
    return (
      <Flex className="relative h-[50px] max-h-[50px] min-h-[50px] justify-between border-b-[1px] border-b-[#aeaeae] bg-white text-[#333333]">
        <Flex className="left font-bold lg:flex-[2]">
          <Link href="/" legacyBehavior>
            <a className="ml-1 hidden h-full items-center text-center lg:flex">RELISTEN</a>
          </Link>
          <Link href="/" className="hidden" legacyBehavior>
            <Flex as={'a'} className="items-center px-2 lg:hidden">
              Re
            </Flex>
          </Link>
          {this.secondaryNavTitle}
        </Flex>
        <div className="min-w-[80%] text-center md:min-w-[60%] lg:min-w-[42vw]">
          <Player />
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
            <Link href="/today" legacyBehavior>
              <a className="nav-btn">TIH</a>
            </Link>
          </div>
          <div>
            <Link href="/live" legacyBehavior>
              <a className="nav-btn">LIVE</a>
            </Link>
          </div>
          <div>
            <Link href="/chat" legacyBehavior>
              <a className="nav-btn">CHAT</a>
            </Link>
          </div>
          <div>
            <Link href="/ios" legacyBehavior>
              <a className="nav-btn">iOS</a>
            </Link>
          </div>
          <div>
            <Link href="/sonos" legacyBehavior>
              <a className="nav-btn">SONOS</a>
            </Link>
          </div>
          <div>
            <Link href="/about" legacyBehavior>
              <a className="nav-btn">ABOUT</a>
            </Link>
          </div>
        </div>
      </Flex>
    );
  }

  get secondaryNavTitle() {
    const { artists, app, navPrefix, navSubtitle, navURL } = this.props;

    if (navSubtitle) {
      return (
        <Fragment>
          <Flex as={'span'} className="h-full items-center text-center">
            {navPrefix}
          </Flex>
          <Link href="/" as={navURL} legacyBehavior>
            <a className="hidden w-auto uppercase lg:inline">{navSubtitle}</a>
          </Link>
        </Fragment>
      );
    }

    if (artists) {
      return (
        <Fragment>
          {artists.data[app.artistSlug] && (
            <span className="hidden h-full items-center text-center lg:flex">TO</span>
          )}
          {artists.data[app.artistSlug] && (
            <Link href="/" as={`/${app.artistSlug}`} legacyBehavior>
              <a className="hidden h-full w-auto items-center px-1 text-center uppercase active:relative active:top-[1px] lg:flex">
                {artists.data[app.artistSlug].the ? 'THE ' : ''}
                {artists.data[app.artistSlug].name}
              </a>
            </Link>
          )}
        </Fragment>
      );
    } else {
      return null;
    }
  }
}

const mapStateToProps = ({ app, artists }: NavigationProps): NavigationProps => {
  return {
    app,
    artists,
  };
};

export default connect(mapStateToProps)(Navigation) as any;
