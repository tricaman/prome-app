'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useElencaCorsiDiUniversita,
  useElencaUniversita,
  type CorsoDto,
  type UniversitaDto,
} from '@prome/api-client';
import { SceltaDalCatalogo, type VoceDelCatalogo } from './scelta-dal-catalogo';

/** Quante voci mostrare sotto al campo: oltre, l'elenco copre la pagina. */
const VOCI_VISIBILI = 5;

/**
 * I due campi dell'identità accademica: prima l'ateneo, poi il suo corso.
 *
 * Sono due campi ma **un dato solo** — il corso, che porta con sé l'ateneo:
 * al form arriva `corsoId` e nient'altro. L'ateneo non si manda, perché
 * mandarlo vorrebbe dire poterlo mandare diverso da quello del corso.
 *
 * Il campo del corso resta **spento finché non c'è un ateneo**: i corsi sono
 * quelli di un ateneo, e offrirne un elenco prima significherebbe mostrare
 * «Ingegneria informatica» dodici volte senza dire di chi è quale.
 *
 * Il catalogo è chiuso e la schermata lo dice: chi non trova il proprio corso
 * non deve restare a fissare un campo che non accetta ciò che scrive.
 */
export function SceltaCorso({
  ateneoIniziale,
  corsoIniziale,
  onCorso,
  errore,
}: {
  ateneoIniziale?: UniversitaDto | null;
  corsoIniziale?: CorsoDto | null;
  onCorso: (corsoId: string) => void;
  errore?: string;
}) {
  const t = useTranslations('app.onboarding');

  const [ateneo, setAteneo] = useState<{ id: string; nome: string } | null>(
    ateneoIniziale ? { id: ateneoIniziale.id, nome: ateneoIniziale.nome } : null,
  );
  const [ricercaAteneo, setRicercaAteneo] = useState(ateneoIniziale?.nome ?? '');
  const [corsoScelto, setCorsoScelto] = useState<string | null>(corsoIniziale?.id ?? null);
  const [ricercaCorso, setRicercaCorso] = useState(corsoIniziale?.nome ?? '');

  const atenei = useElencaUniversita({ ricerca: ricercaAteneo || undefined, limit: VOCI_VISIBILI });
  const corsi = useElencaCorsiDiUniversita(
    ateneo?.id ?? '',
    { ricerca: ricercaCorso || undefined, limit: VOCI_VISIBILI },
    // Senza ateneo la domanda non ha senso: non si chiede.
    { query: { enabled: Boolean(ateneo?.id) } },
  );

  const vociAtenei: VoceDelCatalogo[] = (atenei.data?.data ?? []).map((voce) => ({
    id: voce.id,
    titolo: voce.nome,
    dettaglio: voce.citta,
    sigla: voce.nomeBreve.slice(0, 2).toUpperCase(),
  }));

  const vociCorsi: VoceDelCatalogo[] = (corsi.data?.data ?? []).map((voce) => ({
    id: voce.id,
    titolo: voce.nome,
    // Classe e durata sono ciò che distingue due corsi omonimi dello stesso
    // ateneo: senza, la scelta sarebbe a indovinare.
    dettaglio: `${voce.classe.codice} · ${t('durataAnni', { numero: voce.durataAnni })}`,
    sigla: voce.classe.codice.slice(0, 2).toUpperCase(),
  }));

  return (
    <>
      <SceltaDalCatalogo
        etichetta={t('universita')}
        segnaposto={t('cercaUniversita')}
        nessunRisultato={t('nessunRisultato')}
        inCaricamento={atenei.isLoading}
        voci={vociAtenei}
        sceltaId={ateneo?.id ?? null}
        ricerca={ricercaAteneo}
        onRicerca={setRicercaAteneo}
        onScelta={(voce) => {
          setAteneo({ id: voce.id, nome: voce.titolo });
          setRicercaAteneo(voce.titolo);
          // Cambiare ateneo invalida il corso: quel corso è di un altro
          // ateneo, e lasciarlo a schermo manderebbe un dato incoerente.
          setCorsoScelto(null);
          setRicercaCorso('');
          onCorso('');
        }}
      />

      <SceltaDalCatalogo
        etichetta={t('corso')}
        segnaposto={ateneo ? t('cercaCorso') : t('primaLAteneo')}
        nessunRisultato={t('nessunCorsoTrovato')}
        inCaricamento={corsi.isLoading}
        voci={vociCorsi}
        sceltaId={corsoScelto}
        ricerca={ricercaCorso}
        onRicerca={setRicercaCorso}
        onScelta={(voce) => {
          setCorsoScelto(voce.id);
          setRicercaCorso(voce.titolo);
          onCorso(voce.id);
        }}
        disabilitato={!ateneo}
        aiuto={ateneo ? t('catalogoChiuso') : undefined}
        errore={errore}
      />
    </>
  );
}
