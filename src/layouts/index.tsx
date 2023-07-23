import React from 'react';
import Navigation from '../components/Navigation';

type IndexProps = {
  children: React.ReactNode;
  navPrefix?: string;
  navSubtitle?: string;
  navURL?: string;
};

const Index = ({ children, ...props }: IndexProps): JSX.Element => (
  <div className="layout">
    <style jsx>{`
      .layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        max-width: 100vw;
        background: #f5f8fa;
      }

      .content {
        overflow-y: auto;
        display: flex;
        flex: 1;
      }

      @media only screen and (min-width: 768px) {
        .layout {
          min-width: 768px;
          max-width: initial;
        }
      }
    `}</style>
    <Navigation {...props} />
    <div className="content">{children}</div>
  </div>
);

export default Index;
