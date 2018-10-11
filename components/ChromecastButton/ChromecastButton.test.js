import jsdom from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom';
import test from 'tape';

import ChromecastButton from './ChromecastButton';

const { JSDOM } = jsdom;

test('<ChromecastButton />', (t) => {
  const { window } = new JSDOM('<!DOCTYPE html><div><div />');
  global.window = window;

  const initializerNamespace = '__test';
  const scriptSrc = 'https://localhost/test.js';
  const uniqueScriptId = 'test-id';

  const container = window.document.createElement('div');
  ReactDOM.render(
    <ChromecastButton
      initializerNamespace={initializerNamespace}
      context={window}
      scriptSrc={scriptSrc}
      uniqueScriptId={uniqueScriptId}
    />,
    container
  );
  t.true(
    container.innerHTML.includes(
      '<google-cast-launcher></google-cast-launcher>',
    ),
    'it renders the proper html for the chromecast sdk',
  );
  
  const script = window.document.querySelector(`#${uniqueScriptId}`);
  t.equals(
    script.src,
    scriptSrc,
    'it loads the supplied script from props.scriptSrc',
  );

  const initializeChromecast = window[initializerNamespace];
  t.equals(
    typeof initializeChromecast,
    'function',
    'it adds a function into the supplied initializer namespace',
  );

  let receiverApplicationId;
  window.chrome = {
    cast: {
      media: {
        DEFAULT_MEDIA_RECEIVER_APP_ID: 'test-id',
      },
    },
  };
  window.cast = {
    framework: {
      CastContext: {
        getInstance() {
          return {
            setOptions(options) {
              receiverApplicationId = options.receiverApplicationId;
            },
          };
        },
      },
    },
  };
  initializeChromecast(false);
  t.false(
    receiverApplicationId,
    'it does not initialize chromecast when the sdk signals that the api is unavailable',
  );

  initializeChromecast(true);
  t.equals(
    receiverApplicationId,
    window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
    'it does initialize chromecast with the default receiver when the sdk signals that the api is available',
  );

  delete global.window;
  t.end();
});
