import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { STORAGE_KEY } from "@/features/prototype/storage";
import { reportError } from "@/lib/analytics";

/**
 * Last-resort screen for unexpected rendering errors, so a crash never leaves a blank page.
 * The error goes to the browser console and, when analytics is configured, to PostHog
 * error tracking (message scrubbed, no component text).
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DoRoboty.ai: nieoczekiwany błąd", error, info.componentStack);
    reportError(error);
  }

  private restoreSample = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable: a reload is still the best next step */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="prototype-section max-w-2xl" role="alert">
        <h1>Coś poszło nie tak</h1>
        <p className="mt-4">
          Prototyp napotkał nieoczekiwany błąd. Odśwież stronę. Jeśli błąd wraca, przywróć
          przykładowe dane (Twoje zmiany w scenariuszu zostaną usunięte) i zgłoś problem na kanale
          kursu.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => window.location.reload()}>
            Odśwież stronę
          </Button>
          <Button type="button" variant="outline" onClick={this.restoreSample}>
            Przywróć przykładowe dane
          </Button>
        </div>
      </main>
    );
  }
}
