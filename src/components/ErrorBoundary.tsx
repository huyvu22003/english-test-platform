import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: "2rem", textAlign: "center", maxWidth: 480, margin: "4rem auto" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Đã xảy ra lỗi</h2>
        <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
          Ứng dụng gặp sự cố không mong muốn. Vui lòng tải lại trang.
        </p>
        <pre
          style={{
            background: "#f8fafc",
            padding: "1rem",
            borderRadius: 8,
            fontSize: "0.8rem",
            textAlign: "left",
            overflow: "auto",
            marginBottom: "1.5rem",
          }}
        >
          {this.state.error.message}
        </pre>
        <button className="btn primary" onClick={() => location.reload()}>
          Tải lại trang
        </button>
      </div>
    );
  }
}
