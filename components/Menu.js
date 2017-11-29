import Column from './Column'
import Row from './Row'

export default () => (
  <div className="menu">
    <style jsx>{`
      .menu {
        width: 120px;
      }
    `}</style>
    <Column className="let-flow">
      <Row baseHrefOverride="/about">About</Row>
      <Row baseHrefOverride="/ios">iOS</Row>
      <Row baseHrefOverride="/today">Today</Row>
      <Row baseHrefOverride="/live">Live</Row>
    </Column>
  </div>
)
