import React from 'react';
import { Component } from 'react';

class InlinePopup extends Component {
  constructor(props, ctx) {
    super(props, ctx);

    this.state = {
      isVisible: false,
    };
  }

  render() {
    const { isVisible } = this.state;
    const { children } = this.props;

    if (!isVisible) return null;

    return (
      <div
        className={`modal-container ${isVisible ? 'is-visible' : ''}`}
        onClick={this.toggleModal}
      >
        <style jsx>{`
          .modal-container {
            position: fixed;
            top: 50px;
            right: 0;
            z-index: 2;
            box-shadow: 0 1px 5px 1px rgba(0, 0, 0, 0.1);
            border: 1px solid #aeaeae;
            background: rgba(255, 255, 255, 0.95);
            transition: transform 300ms ease-in-out;
          }

          .modal-container.is-visible {
          }

          .modal-content {
          }
        `}</style>
        <div className="modal-content">{children}</div>
      </div>
    );
  }

  toggleModal = () => {
    // if (e && !/container/.test(e.target.className)) return;
    this.setState({ isVisible: !this.state.isVisible });
  };
}

export default InlinePopup;
