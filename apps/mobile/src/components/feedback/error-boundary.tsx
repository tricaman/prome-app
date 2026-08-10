import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Screen } from '@/components/ui';
import { ErrorState } from './error-state';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (errore: unknown, riprova: () => void) => ReactNode;
  onError?: (errore: unknown, info: ErrorInfo) => void;
  /** Cambiando questo valore il confine si azzera (es. al cambio di schermata). */
  chiaveReset?: unknown;
}

interface StatoErrorBoundary {
  errore: unknown;
}

/**
 * Confine di errore: cattura le eccezioni sollevate mentre React disegna il
 * sottoalbero e mostra una via d'uscita.
 *
 * Su mobile è ancora più importante che sul web: senza confine l'app resta
 * su una schermata bianca e l'unico rimedio è chiuderla e riaprirla.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, StatoErrorBoundary> {
  state: StatoErrorBoundary = { errore: undefined };

  static getDerivedStateFromError(errore: unknown): StatoErrorBoundary {
    return { errore };
  }

  componentDidUpdate(propsPrecedenti: ErrorBoundaryProps): void {
    if (this.state.errore !== undefined && propsPrecedenti.chiaveReset !== this.props.chiaveReset) {
      this.setState({ errore: undefined });
    }
  }

  componentDidCatch(errore: Error, info: ErrorInfo): void {
    this.props.onError?.(errore, info);
    console.error('[prome] errore non gestito nell’interfaccia', errore, info.componentStack);
  }

  private riprova = (): void => {
    this.setState({ errore: undefined });
  };

  render(): ReactNode {
    const { errore } = this.state;
    if (errore === undefined) return this.props.children;
    if (this.props.fallback) return this.props.fallback(errore, this.riprova);

    return (
      <Screen centrato>
        <ErrorState errore={errore} onRiprova={this.riprova} />
      </Screen>
    );
  }
}
