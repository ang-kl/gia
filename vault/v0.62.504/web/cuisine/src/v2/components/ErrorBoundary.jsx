import React from 'react';

// Generic render-error boundary. Wrap any non-critical widget so a throw inside
// it degrades to `fallback` (default: nothing) instead of white-screening the
// whole TMA. componentDidCatch logs the real error so we can still diagnose it.
// (CI has no jsdom render test, so this is our safety net for render-time bugs.)
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ''}]`, error, info && info.componentStack);
  }

  render() {
    if (this.state.failed) return this.props.fallback != null ? this.props.fallback : null;
    return this.props.children;
  }
}
