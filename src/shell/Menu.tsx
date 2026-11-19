import { Link } from '@timber-js/app/client';
import { ArrowUpRightIcon } from 'lucide-react';
import BlogNewPostDot from '@/features/blog/BlogNewPostDot';
import { accountSection, siteSections } from './siteSections';
import SettingsPanel from './SettingsPanel';

const ITEM = `
  flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap
  text-text-primary transition-colors hover:bg-surface-hover
`;
const SEPARATOR = 'my-1 h-px bg-hairline';

// The nav bar's menu popover. Below xl it holds every link; at xl the listening
// pages, the account link and the settings cog are inline in the nav, so it
// holds only `more`.
const Menu = ({ signedIn, blogHasNew }: { signedIn: boolean; blogHasNew: boolean }) => {
  const account = accountSection(signedIn);
  return (
    <div className="flex flex-col">
      <div className="flex flex-col xl:hidden">
        {siteSections
          .filter((section) => section.group === 'primary')
          .map((section) => (
            <Link key={section.href} className={ITEM} href={section.href} prefetch={false}>
              {section.label}
            </Link>
          ))}
        <div className={SEPARATOR} />
      </div>
      {siteSections
        .filter((section) => section.group === 'more')
        .map((section) => (
          <Link key={section.href} className={ITEM} href={section.href} prefetch={false}>
            {section.label}
            {section.label === 'Blog' && <BlogNewPostDot hasNewPost={blogHasNew} />}
          </Link>
        ))}
      <a
        className={ITEM}
        href="https://github.com/RelistenNet/relisten-web"
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub
        <ArrowUpRightIcon className="ml-auto size-4" aria-label="(opens in a new tab)" />
      </a>
      <div className="flex flex-col xl:hidden">
        <div className={SEPARATOR} />
        <Link className={ITEM} href={account.href} prefetch={false}>
          {account.label}
        </Link>
        <div className={SEPARATOR} />
        <div className="p-2.5">
          <SettingsPanel />
        </div>
      </div>
    </div>
  );
};

export default Menu;
