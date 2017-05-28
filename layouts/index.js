import Navigation from '../components/Navigation'
import Player from '../components/Player'

export default ({ children, ...props }) => (
  <div {...props} className="layout">
    <style jsx>{`
      .layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        min-width: 768px;
      }

      @media only screen
        and (max-device-width: 736px)
        and (-webkit-min-device-pixel-ratio: 2) {
          .layout {
            min-width: initial;
          }
      }
    `}</style>
    <Navigation />
    {children}
  </div>
)