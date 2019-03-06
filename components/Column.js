import Row from './Row'
import { Component } from 'react';

class Column extends Component {
  componentDidMount() {
    Array.prototype.forEach.call(document.querySelectorAll('.column .active'), activeRow => {
      activeRow.scrollIntoView({
        block: 'center',
      });
    });
  }

  render() {
    const loadingAmount = this.props.loadingAmount ? this.props.loadingAmount : 20;
    return <div className={`column ${this.props.className}`}>
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

      .column.let-flow .column-content {
        overflow-x: initial;
        overflow-y: initial;
      }
    `}</style>
    {this.props.heading && <div className="heading">{this.props.heading}</div>}
    <div className="column-content">{this.props.loading ? new Array(loadingAmount).fill(null).map((i, idx) => <Row key={idx} loading />) : this.props.children}</div>
  </div>;
  }
}

export default Column;