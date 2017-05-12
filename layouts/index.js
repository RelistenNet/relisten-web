import Navigation from '../components/Navigation'
import GaplessPlayer from '../components/GaplessPlayer'

export default ({ children, ...props }) => (
  <div {...props} className="layout">
    <style jsx>{`
      .layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        min-width: 768px;
      }
    `}</style>
    <Navigation />
    {children}
    <GaplessPlayer />
  </div>
)