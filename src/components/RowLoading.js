import React from 'react';

export default () => (
  <div className="loading content">
    <style jsx>{`
      .loading {
        height: 100%;
      }

      .loading-title {
        width: 40%;
      }

      .loading-desc {
        width: 15%;
      }

      .loading-bar {
        width: 100%;
        height: 1em;
        background: #DDD;
      }

      .loading-bar-small {
        height: 0.7em;
      }

    `}</style>
    <div className="loading-title">
      <div className="loading-bar" />
    </div>
    <div className="loading-desc">
      <div className="loading-bar loading-bar-small" />
      <div className="loading-bar loading-bar-small" />
    </div>
  </div>
);
