import Row from './Row';

// TODO: replace this with shadcn/radix

const Menu = () => (
  <div className="mt-2 mr-2 w-[120px] rounded-sm border border-hairline bg-surface shadow-lg">
    <Row href="/">Home</Row>
    <Row href="/blog">Blog</Row>
    <Row href="/about">About</Row>
    <Row href="/today">Today</Row>
    <Row href="/recently-played">Live</Row>
    <Row href="/app">Apps</Row>
    <Row href="/chat">Chat</Row>
    <a
      href="https://github.com/relistennet/relisten-web"
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-[56px] items-center border-b border-hairline p-2 hover:bg-surface-hover lg:min-h-[46px] lg:p-1"
    >
      GitHub
    </a>
  </div>
);

export default Menu;
