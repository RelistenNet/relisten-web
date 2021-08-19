import React from 'react';

export default ({ height, children }) => (
  <div className="header" style={{ minHeight: !children ? 16 : height }}>
    <style jsx>{`
      .header {
        min-height: 24px;
        background: #f0eff4;
        display: flex;
        color: #696969;
        font-size: 0.7em;
        padding: 0 4px;
        align-items: center;
        justify-content: space-between;
      }
    `}</style>
    {children}
  </div>
);
