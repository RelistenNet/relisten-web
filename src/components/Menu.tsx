import Column from './Column';
import Row from './Row';

// TODO: replace this with shadcn/radix

const Menu = () => (
  <div className="mt-2 mr-2 w-[120px] rounded-sm border bg-white shadow-lg">
    <Row href="/">Home</Row>
    <Row href="/about">About</Row>
    <Row href="/today">Today</Row>
    <Row href="/recently-played">Live</Row>
    <Row href="/sonos">Sonos</Row>
    <Row href="/app">App</Row>
    <Row href="/chat">Chat</Row>
  </div>
);

export default Menu;
