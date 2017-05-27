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
      }

      @media only screen
        and (max-device-width: 736px)
        and (-webkit-min-device-pixel-ratio: 2) {
          .column {
            padding: 0;
          }

          .column-content {
            padding-left: 8px;
          }
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

      .column-content {
        flex: 1 1 0;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overflow-x: hidden;
      }
    `}</style>
    {heading && <div className="heading">{heading}</div>}
    <div className="column-content">{loading ? new Array(loadingAmount).fill(null).map((i, idx) => <Row key={idx} loading />) : children}</div>
  </div>
)
