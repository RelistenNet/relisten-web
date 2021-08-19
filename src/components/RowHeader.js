import React from 'react';

const RowHeader = ({ height, children }) => (
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

export default RowHeader;
