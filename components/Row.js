import Link from 'next/link'

export default ({ children, href }) => (
  <div className="row">
    <style jsx>{`
      .row {
        min-height: 32px;
        width: 100%;
        margin-left: 8px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid #F7F7F7;
      }

      .row a {
        width: 100%;
      }
    `}</style>
    <Link href="/" as={href}><a>{children}</a></Link>
  </div>
)
