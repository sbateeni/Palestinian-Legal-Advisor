import React, { ReactNode, Component, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// FIX: Explicitly inherit from Component with generics and declare state/props to ensure TypeScript recognition.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Explicitly declare the props and state property. This resolves the "Property 'state'/'props' does not exist" error.
  public props: ErrorBoundaryProps;
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  // FIX: Constructor to pass props to the base class and assign it locally to satisfy the TypeScript compiler.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  // FIX: Correct signature for getDerivedStateFromError return type.
  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // FIX: Explicitly type ErrorInfo in componentDidCatch.
  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Critical Application Error:", error, errorInfo);
  }

  render() {
    // FIX: this.state is now correctly recognized.
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          direction: 'rtl',
          backgroundColor: '#f9fafb',
          color: '#1f2937',
          padding: '20px'
        }}>
          <h1 style={{ color: '#dc2626', fontSize: '1.5rem', marginBottom: '1rem' }}>
            عذراً، حدث خطأ غير متوقع
          </h1>
          <p style={{ marginBottom: '1rem', color: '#4b5563' }}>
            يرجى محاولة تحديث الصفحة.
          </p>
          <pre style={{
            direction: 'ltr',
            textAlign: 'left',
            background: '#e5e7eb',
            padding: '15px',
            borderRadius: '8px',
            overflow: 'auto',
            maxHeight: '200px',
            maxWidth: '100%',
            fontSize: '0.875rem'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '20px',
              padding: '10px 24px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            تحديث الصفحة
          </button>
        </div>
      );
    }

    // FIX: this.props.children is now correctly recognized due to explicit member declaration above.
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("FATAL: Could not find root element '#root' to mount React app.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);