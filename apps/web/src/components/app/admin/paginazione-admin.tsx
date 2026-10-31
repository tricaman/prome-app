'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';

/** Previous and next for the admin lists; the server says how many pages there are. */
export function PaginazioneAdmin({
  pagina,
  pagine,
  totale,
  onCambia,
}: {
  pagina: number;
  pagine: number;
  totale: number;
  onCambia: (pagina: number) => void;
}) {
  const t = useTranslations('app.admin');
  const tComune = useTranslations('comune');

  return (
    <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-testo-tenue">
        {t('pagina', { pagina: String(pagina), pagine: String(pagine), totale: String(totale) })}
      </p>
      <div className="flex gap-2">
        <Button
          variante="contorno"
          size="sm"
          isDisabled={pagina <= 1}
          onPress={() => onCambia(pagina - 1)}
        >
          {tComune('indietro')}
        </Button>
        <Button
          variante="contorno"
          size="sm"
          isDisabled={pagina >= pagine}
          onPress={() => onCambia(pagina + 1)}
        >
          {tComune('avanti')}
        </Button>
      </div>
    </footer>
  );
}
