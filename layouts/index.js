import Player from '../components/Player'

export default ({ children, ...props }) => (
  <div {...props}>
    <Player />
    {children}
  </div>
)