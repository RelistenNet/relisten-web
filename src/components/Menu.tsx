import React from 'react';
import Column from './Column';
import Row from './Row';

const Menu = (): JSX.Element => (
  <div className="menu">
    <style jsx>{`
      .menu {
        width: 120px;
      }
    `}</style>
    <Column className="let-flow">
      <Row baseHrefOverride="/about">About</Row>
      <Row baseHrefOverride="/today">Today</Row>
      <Row baseHrefOverride="/live">Live</Row>
      <Row baseHrefOverride="/sonos">Sonos</Row>
      <Row baseHrefOverride="/ios">iOS</Row>
      <Row baseHrefOverride="/chat">Chat</Row>
    </Column>
  </div>
);

export default Menu;
