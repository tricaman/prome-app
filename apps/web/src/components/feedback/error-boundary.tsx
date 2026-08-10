'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './error-state';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Vista alternativa; riceve l'errore e la funzione per riprovare. */
  fallback?: (errore: unknown, riprova: () => void) => ReactNode;
  /** Punto in cui agganciare la segnalazione a un servizio esterno. */
  onError?: (errore: unknown, info: ErrorInfo) => void;
  /** Cambiando questo valore il confine si azzera (es. al cambio di rotta). */
  chiaveReset?: unknown;
}

interface StatoErrorBoundary {
  errore: unknown;
}

/**
 * Confine di errore: cattura le eccezioni sollevate mentre React disegna il
 * sottoalbero e mostra una via d'uscita.
 *
 * Senza un confine, un errore in un componente smonta l'intera pagina e
 * l'utente resta davanti a una schermata bianca senza sapere cosa fare.
 *
 * Va messo attorno alle porzioni che possono fallire da sole; per gli errori
 * dell'intera rotta ci pensano i file `error.tsx` e `global-error.tsx`.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, StatoErrorBoundary> {
  state: StatoErrorBoundary = { errore: undefined };

  static getDerivedStateFromError(errore: unknown): StatoErrorBoundary {
    return { errore };
  }

  componentDidUpdate(propsPrecedenti: ErrorBoundaryProps): void {
    // Cambiata la chiave (tipicamente il percorso), si riprova da capo:
    // altrimenti l'utente resterebbe bloccato sull'errore anche navigando.
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
    return <ErrorState errore={errore} onRiprova={this.riprova} />;
  }
}
