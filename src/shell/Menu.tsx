import Row from '@/ui/base/Row';
import { siteSections } from './siteSections';

// The site sections, for the nav bar's menu popover below xl.
const Menu = () => (
  <>
    <Row href="/">Home</Row>
    {siteSections.map((section) => (
      <Row key={section.href} href={section.href}>
        {section.label}
      </Row>
    ))}
    <a
      href="https://github.com/relistennet/relisten-web"
      target="_blank"
      rel="noopener noreferrer"
      className="
        flex min-h-[56px] items-center border-b border-hairline p-2 hover:bg-surface-hover
        lg:min-h-[46px] lg:p-1
      "
    >
      GitHub
    </a>
  </>
);

export default Menu;
