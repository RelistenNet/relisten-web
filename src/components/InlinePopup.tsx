import { NextPageContext } from 'next/types';
import React from 'react';
import { Component } from 'react';

type InlinePopupProps = {
  children: React.ReactNode;
};

type InlinePopupState = {
  isVisible: boolean;
};

class InlinePopup extends Component<InlinePopupProps, InlinePopupState> {
  constructor(props: InlinePopupProps) {
    super(props);

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

  toggleModal = (): void => {
    // if (e && !/container/.test(e.target.className)) return;
    this.setState({ isVisible: !this.state.isVisible });
  };
}

export default InlinePopup;
