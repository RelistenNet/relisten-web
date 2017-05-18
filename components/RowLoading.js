import Link from 'next/link'

/*

  .loading-bar {
    animation-duration: 1s;
    animation-fill-mode: forwards;
    animation-iteration-count: infinite;
    animation-name: placeHolderShimmer;
    animation-timing-function: linear;
    background: #f6f7f8;
    background: linear-gradient(to right, #eeeeee 8%, #dddddd 18%, #eeeeee 33%);
    background-size: 800px 104px;
    height: 96px;
    position: relative;
  }

  @keyframes placeHolderShimmer{
    0%{
      background-position: -468px 0;
    }
    100%{
      background-position: 468px 0;
    }
  }

*/

export default () => (
  <div className="loading content">
    <style jsx>{`
      .loading {
        height: 100%;
      }

      .loading-title {
        width: 40%;
      }

      .loading-desc {
        width: 15%;
      }

      .loading-bar {
        width: 100%;
        height: 1em;
        background: #DDD;
      }

      .loading-bar-small {
        height: 0.7em;
      }

    `}</style>
    <div className="loading-title">
      <div className="loading-bar" />
    </div>
    <div className="loading-desc">
      <div className="loading-bar loading-bar-small" />
      <div className="loading-bar loading-bar-small" />
    </div>
  </div>
)
