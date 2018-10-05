import jsdom from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom';
import test from 'tape';

import ChromecastButton from './ChromecastButton';

const { JSDOM } = jsdom;

test('<ChromecastButton />', (t) => {
  const { window } = new JSDOM('<!DOCTYPE html><div><div />');
  global.window = window;

  const container = window.document.createElement('div');
  ReactDOM.render(<ChromecastButton />, container);

  t.equals(
    container.innerHTML,
    '<div><google-cast-launcher></google-cast-launcher></div>',
    'it renders the proper html for the chromecast sdk',
  );

  delete global.window;
  t.end();
});
