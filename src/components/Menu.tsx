import Column from './Column';
import Row from './Row';

// TODO: replace this with shadcn/radix

const Menu = () => (
  <div className="w-[120px]">
    <Column>
      <Row baseHrefOverride="/">Home</Row>
      <Row baseHrefOverride="/about">About</Row>
      <Row baseHrefOverride="/today">Today</Row>
      <Row baseHrefOverride="/recently-played">Live</Row>
      <Row baseHrefOverride="/sonos">Sonos</Row>
      <Row baseHrefOverride="/ios">iOS</Row>
      <Row baseHrefOverride="/chat">Chat</Row>
    </Column>
  </div>
);

export default Menu;
