'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, Heading } from '@/components/ui';
import { Container } from '@/components/layout';

/**
 * Errore non gestito dentro questa lingua: sostituisce solo il contenuto della
 * pagina, lasciando in piedi il layout. L'utente vede una via d'uscita invece
 * di una schermata bianca.
 */
export default function ErroreDiPagina({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  useEffect(() => {
    console.error('[prome] errore di pagina', error);
  }, [error]);

  return (
    <Container larghezza="stretta" className="flex min-h-[70vh] items-center justify-center py-16">
      <Card padding="lg" className="w-full text-center">
        <Heading livello={1} taglia="lg">
          {t('errori.generico.titolo')}
        </Heading>
        <p className="mt-3 text-testo-tenue">{t('errori.generico.descrizione')}</p>
        <Button variante="primaria" className="mt-6" onPress={() => reset()}>
          {t('comune.riprova')}
        </Button>
        {/* Il digest è l'unico aggancio ai log del server: va mostrato, ma in
            secondo piano rispetto a cosa può fare l'utente. */}
        {error.digest ? (
          <p className="mt-4 text-xs text-testo-debole">
            {t('errori.riferimento', { id: error.digest })}
          </p>
        ) : null}
      </Card>
    </Container>
  );
}
