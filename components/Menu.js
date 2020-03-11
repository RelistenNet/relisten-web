import React from 'react';
import Column from './Column';
import Row from './Row';

export default () => (
  <div className="menu">
    <style jsx>{`
      .menu {
        width: 160px;
      }
    `}</style>
    <Column className="let-flow">
      <Row baseHrefOverride="/about">About</Row>
      <Row baseHrefOverride="/today">Today</Row>
      <Row baseHrefOverride="/recent-streams">Recent Streams</Row>
      <Row baseHrefOverride="/sonos">Sonos</Row>
      <Row baseHrefOverride="/ios">iOS</Row>
      <Row baseHrefOverride="/chat">Chat</Row>
    </Column>
  </div>
);
