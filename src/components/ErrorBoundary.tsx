import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("ErrorBoundary capturó un error DOM:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 40, textAlign: "center", color: "white" }}>
          <p>😵 Ocurrió un error inesperado.</p>
          <button onClick={this.handleRetry} style={{ marginTop: 16, padding: "8px 20px", background: "#3b82f6", border: "none", borderRadius: 8, color: "white", fontWeight: "bold", cursor: "pointer" }}>
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;