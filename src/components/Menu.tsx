import Column from './Column';
import Row from './Row';

// TODO: replace this with shadcn/radix

const Menu = () => (
  <div className="w-[120px]">
    <Column>
      <Row href="/">Home</Row>
      <Row href="/about">About</Row>
      <Row href="/today">Today</Row>
      <Row href="/recently-played">Live</Row>
      <Row href="/sonos">Sonos</Row>
      <Row href="/ios">iOS</Row>
      <Row href="/chat">Chat</Row>
    </Column>
  </div>
);

export default Menu;
