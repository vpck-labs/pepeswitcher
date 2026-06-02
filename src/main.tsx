import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

// Surface render errors as text instead of a blank window.
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { message?: string }
> {
  state: { message?: string } = {};
  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : String(error) };
  }
  render() {
    if (this.state.message) {
      return (
        <pre style={{ padding: 16, color: "#f0a0a0", whiteSpace: "pre-wrap" }}>
          {this.state.message}
        </pre>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
