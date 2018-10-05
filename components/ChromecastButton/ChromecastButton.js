import React from 'react';

const ChromecastButton = () => (
  <div
    dangerouslySetInnerHTML={{
    __html: '<google-cast-launcher></google-cast-launcher>'
    }}
  />
);

export default ChromecastButton;
