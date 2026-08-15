'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { scaricaMieiDati } from '@prome/api-client';
import { useApiMutation } from '@/hooks';
import { Button, Card } from '@/components/ui';

/**
 * «Scarica i tuoi dati».
 *
 * La privacy policy la promette **per nome** — «dall'app trovi la funzione
 * "Scarica i tuoi dati" per ottenere una copia completa in formato leggibile»
 * — e per mesi non è esistita: c'era una riga che non faceva niente, e
 * toglierla ha lasciato il documento a nominare una funzione assente. Questa è
 * quella funzione.
 *
 * Il file si compone nel browser dalla risposta dell'API invece di arrivare
 * come allegato dal server: la richiesta porta il token nell'intestazione, e
 * un `<a download>` verso l'endpoint non lo porterebbe — scaricherebbe un 401
 * salvato su disco.
 */
export function ScaricaDati() {
  const t = useTranslations('app.impostazioni.dati');
  const [nomeFile] = useState(() => `prome-dati-${new Date().toISOString().slice(0, 10)}.json`);

  const scarica = useApiMutation({
    mutationFn: () => scaricaMieiDati(),
    onSuccess: (risposta) => {
      const documento = JSON.stringify(risposta.data, null, 2);
      const indirizzo = URL.createObjectURL(
        new Blob([documento], { type: 'application/json' }),
      );
      const collegamento = document.createElement('a');
      collegamento.href = indirizzo;
      collegamento.download = nomeFile;
      collegamento.click();
      // Senza revoca il blob resta in memoria finché la pagina non si chiude.
      URL.revokeObjectURL(indirizzo);
    },
  });

  return (
    <Card padding="md" className="mb-6">
      <p className="text-[15px] font-extrabold text-testo">{t('titolo')}</p>
      <p className="mb-1.5 mt-1 text-[12.5px] leading-relaxed text-testo-tenue">{t('testo')}</p>
      <p className="mb-3.5 text-[12px] text-testo-debole">{t('nonMiei')}</p>

      <Button
        variante="contorno"
        className="h-10 rounded-xl px-4 text-[13px]"
        inCaricamento={scarica.isPending}
        onPress={() => scarica.mutate(undefined)}
      >
        {scarica.isPending ? t('inCorso') : t('azione')}
      </Button>
    </Card>
  );
}
