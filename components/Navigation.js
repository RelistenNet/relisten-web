import Link from 'next/link'

const Navigation = () => (
  <div className="navigation">
    <style jsx>{`
      .navigation {
        display: flex;
        flex-direction: row;
        height: 50px;
        border-bottom: 1px solid #bbb;
      }

      .navigation > a {
        height: 100%;
        width: 120px;
        font-size: 1.4em;
        line-height: 50px;
        padding: 0 5px;
        text-transform: uppercase;
        font-weight: bold;
      }
    `}</style>
    <Link href="/" prefetch><a>Relisten</a></Link>
    <Link href="/about" prefetch><a>About</a></Link>
  </div>
)

export default Navigation
