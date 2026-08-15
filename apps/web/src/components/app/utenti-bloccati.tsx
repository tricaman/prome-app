'use client';

import { useTranslations } from 'next-intl';
import {
  getElencaBlocchiQueryKey,
  getElencaPostQueryKey,
  sbloccaUtente,
  useElencaBlocchi,
  type BloccatoDto,
} from '@prome/api-client';
import { useApiMutation } from '@/hooks';
import { Avatar, Button, Card } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';

/**
 * Le persone bloccate, e la strada per tornare indietro.
 *
 * Lo sblocco è **senza conferma**: è un gesto reversibile — lo stesso PUT lo
 * rifà — e una conferma su un gesto reversibile insegna solo a premere due
 * volte senza leggere. La conferma sta dove si blocca, che è il gesto con le
 * conseguenze.
 *
 * Chi nel frattempo ha eliminato l'account (o è in cancellazione) compare
 * come «Utente rimosso»: il nome non si mostra più, la riga resta
 * sbloccabile. Quando la sua cancellazione si completa, la riga sparisce da
 * sola — il suo contenuto è ormai anonimo e non riconducibile.
 */
export function UtentiBloccati() {
  const t = useTranslations('app.impostazioni.bloccati');
  const bloccati = useElencaBlocchi({ limit: 100 });

  return (
    <Card padding="md" className="mb-6">
      <p className="text-[15.5px] font-extrabold text-testo">{t('titolo')}</p>
      <p className="mb-3.5 mt-1 text-[13px] leading-relaxed text-testo-tenue">{t('testo')}</p>

      <QueryBoundary query={bloccati}>
        {({ data }) =>
          data.length === 0 ? (
            <p className="text-[13px] font-semibold text-testo-debole">{t('vuoto')}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.map((bloccato) => (
                <li key={bloccato.utenteId}>
                  <RigaBloccato bloccato={bloccato} />
                </li>
              ))}
            </ul>
          )
        }
      </QueryBoundary>
    </Card>
  );
}

function RigaBloccato({ bloccato }: { bloccato: BloccatoDto }) {
  const t = useTranslations('app.impostazioni.bloccati');
  const tComune = useTranslations('comune');
  const nome =
    [bloccato.nome, bloccato.cognome].filter(Boolean).join(' ') || tComune('utenteRimosso');

  const sblocca = useApiMutation({
    mutationFn: () => sbloccaUtente(bloccato.utenteId),
    // Sbloccato, i suoi contenuti tornano alla lettura successiva: si
    // invalida anche il feed, non solo questa lista.
    invalida: [getElencaBlocchiQueryKey() as never, getElencaPostQueryKey() as never],
  });

  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-bordo bg-superficie-alt px-3.5 py-2.5">
      <Avatar nome={nome} dimensione={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-bold text-testo">{nome}</p>
        <p className="text-[11.5px] text-testo-debole">
          {t('dal', { data: new Date(bloccato.bloccatoIl).toLocaleDateString() })}
        </p>
      </div>
      <Button
        variante="contorno"
        size="sm"
        inCaricamento={sblocca.isPending}
        onPress={() => sblocca.mutate(undefined)}
      >
        {t('sblocca')}
      </Button>
    </div>
  );
}
