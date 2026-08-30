import { Component } from "react";
import { cn } from "@/lib/utils";

/**
 * Catches render/runtime errors in its subtree so a single broken section
 * (or a DOM mutation from an in-app translator) can never blank the whole page.
 *
 * Pass `fallback` as a render function `(reset) => ReactNode` for a custom UI,
 * or `section` for the default "recarregar" card scoped to one section.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Breadcrumb only — never rethrow.
    console.error(
      `ErrorBoundary (${this.props.name || "app"}) caught:`,
      error,
      info?.componentStack,
    );
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  reload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (typeof this.props.fallback === "function") {
      return this.props.fallback(this.reset);
    }

    return (
      <div
        translate="no"
        className={cn(
          "flex flex-col items-center justify-center gap-4 px-6 text-center",
          this.props.section ? "min-h-[45vh] py-16" : "min-h-screen",
        )}
      >
        <p className={cn("text-lg font-medium text-[#262626]")}>
          Tivemos um probleminha ao carregar esta parte.
        </p>
        <button
          type="button"
          onClick={this.reload}
          className={cn(
            "rounded-full bg-[#262626] px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-white transition hover:bg-[#ff4582]",
          )}
        >
          Recarregar
        </button>
      </div>
    );
  }
}
