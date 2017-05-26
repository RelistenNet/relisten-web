export default ({ children }) => (
  <span className="tag">
    <style jsx>{`
      .tag {
        color: #FFF;
        font-size: 0.6em;
        border-radius: 2px;
        background: #028F2B;
        padding: 2px 4px;
        display: flex;
        align-items: center;
        font-weight: normal;
        margin: 0 0 0 4px;
      }
    `}</style>
    {children}
  </span>
)
