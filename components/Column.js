import Row from './Row'

export default ({ children, heading, loading, loadingAmount = 20 }) => (
  <div className="column">
    <style jsx>{`
      .column {
        display: flex;
        flex-direction: column;
        flex: 1 1 0;
        word-break: break-word;
        padding: 0 16px;
        height: 100%;
      }

      .heading {
        background: #279BBC;
        min-height: 32px;
        width: 100%;
        color: #FFF;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .content {
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
      }
    `}</style>
    {heading && <div className="heading">{heading}</div>}
    {loading && new Array(loadingAmount).fill(null).map((i, idx) => <Row key={idx} loading />)}
    <div className="content">{children}</div>
  </div>
)
