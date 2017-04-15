export default ({ children, heading }) => (
  <div className="column">
    <style jsx>{`
      .column {
        display: flex;
        flex-direction: column;
        flex: 1;
        padding: 0 16px;
        height: 100%;      }

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
    <div className="content">{children}</div>
  </div>
)
