import React from 'react';
import { Component } from 'react';

class Modal extends Component {
  constructor(props, ctx) {
    super(props, ctx);

    this.state = {
      isVisible: false,
    };
  }

  render() {
    const { isVisible } = this.state;
    const { children } = this.props;

    return (
      <div className={`modal-container ${isVisible ? 'is-visible' : ''}`} onClick={this.toggleModal}>
        <style jsx>{`
          .modal-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.95);
            z-index: 2;
            transition: transform 300ms ease-in-out;
            transform: translate(0, 100vh);
          }

          .modal-container.is-visible {
            transform: translate(0, 0);
          }

          .modal-content {
            transform: translate(-50%, -50%);
            position: absolute;
            top: 50%;
            left: 50%;
          }
        `}</style>
        <div className="modal-content">{children}</div>
      </div>
    );
  }

  toggleModal = () => {
    // if (e && !/container/.test(e.target.className)) return;
    this.setState({ isVisible: !this.state.isVisible });
  }
}

export default Modal;
