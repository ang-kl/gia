import React from 'react';

// Clipboard TMA render-error boundary. A throw in any child previously left a
// silent BLACK screen (no console available inside Telegram). This surfaces the
// actual error message + a reload button using inline styles (so it renders even
// if the theme/CSS failed), and logs the full stack for diagnosis.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }

  static getDerivedStateFromError(err) {
    return { err };
  }

  componentDidCatch(err, info) {
    try { console.error('[Clipboard-TMA] render crash:', err, info && info.componentStack); } catch { /* noop */ }
  }

  render() {
    if (this.state.err) {
      const wrap = { padding: '24px', minHeight: '100vh', boxSizing: 'border-box', fontFamily: '-apple-system, system-ui, sans-serif', color: '#ffffff', background: '#13243B' };
      return (
        <div style={wrap}>
          <div style={{ fontSize: '20px', marginBottom: '8px' }}>📋 Clipboard hit a snag</div>
          <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '14px', wordBreak: 'break-word' }}>
            {String((this.state.err && this.state.err.message) || this.state.err)}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #378ADD', background: 'transparent', color: '#fff', fontSize: '14px' }}
          >↻ Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
