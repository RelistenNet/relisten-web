import Column from './Column'
import Row from './Row'

export default () => (
  <div className="menu">
    <style jsx>{`
      .menu {
        display: flex;
        width: 100vw;
        height: 100vh;
        max-width: 414px;
      }
    `}</style>
    <Column heading="Menu">
      <Row baseHrefOverride="/about">About</Row>
      <Row baseHrefOverride="/ios">iOS</Row>
      <Row baseHrefOverride="/today">Today</Row>
      <Row baseHrefOverride="/live">Live</Row>
    </Column>
  </div>
)
