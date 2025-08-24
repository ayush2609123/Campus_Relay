import { Component, ReactNode } from "react";

type Props = { children: ReactNode; label?: string };
type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950 p-4">
          <div className="font-semibold mb-1">
            {(this.props.label || "Section")} crashed
          </div>
          <pre className="text-xs overflow-auto">{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
