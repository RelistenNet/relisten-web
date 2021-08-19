import React from 'react';

const Tag = ({ children }) => (
  <span className="tag">
    <style jsx>{`
      .tag {
        color: #fff;
        font-size: 0.6em;
        border-radius: 2px;
        background: #028f2b;
        padding: 2px 4px;
        display: flex;
        align-items: center;
        font-weight: normal;
        margin: 0 0 0 4px;
      }
    `}</style>
    {children}
  </span>
);

export default Tag;
