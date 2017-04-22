import Link from 'next/link'

export default ({ height, children, href, active }) => (
  <div className="row" style={{ minHeight: height }}>
    <style jsx>{`
      .row {
        min-height: 34px;
        display: flex;
        flex-direction: column;
        align-items: center;
        border-bottom: 1px solid #F1F1F1;
      }

      .row .content {
        flex: 1;
        width: 100%;
        padding: 4px 0;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }

      .row .content.active {
        background: #333;
      }

      .row .content > :global(div) {
        align-self: stretch;
        display: flex;
        padding: 0 2px;
        justify-content: space-around;
        flex-direction: column;
      }

      .row .content :global(.subtext), .row .content > :global(div:nth-child(2)) {
        color: #979797;
        font-size: 0.7em;
      }

      .row .content > :global(div:nth-child(2)) {
        text-align: right;
      }

      .row .content.active :global(div) {
        color: #FFF;
      }

      .row .content.active :global(.label) {
        color: #EEE;
      }
    `}</style>
    {href ? <Link href="/" as={href}><a className={`${active ? 'active' : ''} content`}>{children}</a></Link> : <div className="content">{children}</div>}
  </div>
)
