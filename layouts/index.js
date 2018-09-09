import Navigation from '../components/Navigation'
import Player from '../components/Player'

export default ({ children, ...props }) => (
  <div className="layout">
    <style jsx>{`
      .layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        max-width: 100vw;
        background: #F5F8FA;
      }

      .content {
        overflow-y: auto;
        display: flex;
        flex: 1;
      }

      @media only screen
        and (min-width: 768px) {
          .layout {
            min-width: 768px;
            max-width: initial;
          }
      }
    `}</style>
    <Navigation {...props} />
    <div className="content">{children}</div>
  </div>
)