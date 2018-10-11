import React from 'react';

class ChromecastButton extends React.Component {
  static defaultProps = {
    context: global.window,
    initializerNamespace: '__onGCastApiAvailable',
    scriptSrc: 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1',
    uniqueScriptId: 'relisten-chromecast',
  }

  constructor(props) {
    super(props);

    this.initializeChromecast = this.initializeChromecast.bind(this);
    this.installPlayerScript = this.installPlayerScript.bind(this);
    this.mountChromecastInitializer = this.mountChromecastInitializer.bind(this);
  }
  
  componentDidMount() {
    this.mountChromecastInitializer();
    this.installPlayerScript();
  }
  
  mountChromecastInitializer() {
    this.props.context[this.props.initializerNamespace] = this.initializeChromecast;
  }
  
  initializeChromecast(isChromecastAvailable) {
    if (isChromecastAvailable) {
      const { cast, chrome } = this.props.context;

      cast.framework.CastContext.getInstance().setOptions({
        receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
      });
    }
  }

  installPlayerScript() {
    const script = this.props.context.document.createElement('script');
    script.id = this.props.uniqueScriptId;
    script.src = this.props.scriptSrc;
    this.props.context.document.head.appendChild(script);
  }

  render() {
    return (
      <div className='chromecast-button'>
        <style jsx>{`
          .chromecast-button {
            align-items: center;
            cursor: pointer;
            display: flex;
            width: 20px;
          }
        `}</style>
        <div
          dangerouslySetInnerHTML={{
            __html: '<google-cast-launcher></google-cast-launcher>'
          }}
        />
      </div>
    );
  }
};

export default ChromecastButton;
