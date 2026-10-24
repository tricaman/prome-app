import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { AppState, Platform, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  NESSUN_AGGIORNAMENTO,
  avviaAggiornamento,
  azzeraScaricamento,
  completaAggiornamento,
  controllaAggiornamento,
  leggiScaricamento,
  osservaScaricamento,
  type FaseScaricamento,
} from '@/lib/aggiornamento-nativo';
import { useTema } from '@/theme';
import { useT } from '@/i18n/i18n-provider';
import { Button, Foglio, Text } from '@/components/ui';

interface ValoreAggiornamento {
  /** An update is waiting or downloading: the tab header shows its button. */
  disponibile: boolean;
  /** Opens the sheet. */
  apri: () => void;
}

const ContestoAggiornamento = createContext<ValoreAggiornamento>({
  disponibile: false,
  apri: () => {},
});

const CHIAVE = ['aggiornamento-store'];

/** How long an answer from the store counts as fresh. */
const VALIDITA_MS = 30 * 60 * 1000;

const NATIVA = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * The "update available" notice.
 *
 * **No popup.** A new version is good news, not an interruption: the tab
 * header grows a button (`SchermataTab`) and the sheet opens only from there.
 * Nothing is remembered between launches, because there is nothing to nag
 * about and no dismissed version to store.
 *
 * **Optional only.** No version is ever blocked: the server never tells an
 * old client to update (AGENTS.md, "Build di distribuzione").
 *
 * Fail-open: while the check runs, or when it cannot, nothing shows.
 */
export function AggiornamentoProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const controllo = useQuery({
    queryKey: CHIAVE,
    queryFn: controllaAggiornamento,
    enabled: NATIVA,
    staleTime: VALIDITA_MS,
  });
  const scaricamento = useSyncExternalStore(osservaScaricamento, leggiScaricamento);
  const [aperto, setAperto] = useState(false);

  // Asks again on the way back to the foreground, not only at launch, so a
  // release that came out while Prome sat in the background shows up on the
  // first return. Only when the last answer is stale: the store is not worth
  // a request every time the phone is unlocked.
  useEffect(() => {
    if (!NATIVA) return;

    const ascoltatore = AppState.addEventListener('change', (stato) => {
      if (stato === 'active') void queryClient.refetchQueries({ queryKey: CHIAVE, stale: true });
    });

    return () => ascoltatore.remove();
  }, [queryClient]);

  // The last answer the store gave: a check that failed since then does not
  // erase it (see `controllaAggiornamento`).
  const aggiornamento = controllo.data ?? NESSUN_AGGIORNAMENTO;
  // A download in flight keeps button and sheet alive even though a check run
  // meanwhile finds nothing (Play reports the update as already under way):
  // the bar, "restart" and "retry" must stay reachable until it is over.
  const disponibile = aggiornamento.disponibile || scaricamento.fase !== 'fermo';

  const chiudi = () => {
    setAperto(false);
    // A failed download starts over next time; a finished one stays, so the
    // sheet still offers "restart" when it is opened again.
    if (scaricamento.fase === 'fallito') azzeraScaricamento();
  };

  const aggiorna = () => {
    if (aggiornamento.disponibile) {
      void avviaAggiornamento(aggiornamento);
      // Off to the store: nothing left for the sheet to show.
      if (!aggiornamento.inApp) setAperto(false);

      return;
    }

    // "Retry" after a check that found nothing to install: start over from a
    // fresh one rather than leave a button that does nothing.
    setAperto(false);
    azzeraScaricamento();
    void controllo.refetch();
  };

  return (
    <ContestoAggiornamento.Provider value={{ disponibile, apri: () => setAperto(true) }}>
      {children}
      <FoglioAggiornamento
        aperto={disponibile && aperto}
        fase={scaricamento.fase}
        avanzamento={scaricamento.avanzamento}
        onChiudi={chiudi}
        onAggiorna={aggiorna}
      />
    </ContestoAggiornamento.Provider>
  );
}

export function useAggiornamento(): ValoreAggiornamento {
  return useContext(ContestoAggiornamento);
}

/** The copy of each phase, kept literal so `t()` stays type-checked. */
const TESTI = {
  fermo: ['app.aggiornamento.disponibileTitolo', 'app.aggiornamento.disponibileTesto'],
  inCorso: ['app.aggiornamento.scaricamentoTitolo', 'app.aggiornamento.scaricamentoTesto'],
  pronto: ['app.aggiornamento.prontoTitolo', 'app.aggiornamento.prontoTesto'],
  installazione: ['app.aggiornamento.prontoTitolo', 'app.aggiornamento.prontoTesto'],
  fallito: ['app.aggiornamento.fallitoTitolo', 'app.aggiornamento.fallitoTesto'],
} as const satisfies Record<FaseScaricamento, readonly [string, string]>;

/**
 * One sheet for the whole life of the update: on offer, downloading (the bar),
 * downloaded ("restart"), failed ("retry"). It can always be closed: Play
 * keeps downloading, and the header button brings the sheet back as it was.
 */
function FoglioAggiornamento({
  aperto,
  fase,
  avanzamento,
  onChiudi,
  onAggiorna,
}: {
  aperto: boolean;
  fase: FaseScaricamento;
  avanzamento: number;
  onChiudi: () => void;
  onAggiorna: () => void;
}) {
  const tema = useTema();
  const t = useT();
  const [titolo, testo] = TESTI[fase];
  const percentuale = Math.round(Math.min(Math.max(avanzamento, 0), 1) * 100);

  return (
    <Foglio aperto={aperto} titolo={t(titolo)} onChiudi={onChiudi}>
      <Text variante="corpoTenue">{t(testo)}</Text>

      {fase === 'inCorso' ? (
        <View style={{ gap: tema.spaziatura[2] }}>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ now: percentuale, min: 0, max: 100 }}
            style={{
              height: 6,
              borderRadius: tema.raggio.full,
              backgroundColor: tema.colori.superficieAlt2,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${percentuale}%`,
                height: '100%',
                backgroundColor: tema.colori.primario,
              }}
            />
          </View>
          <Text variante="didascalia">{`${percentuale}%`}</Text>
        </View>
      ) : null}

      {fase === 'fermo' || fase === 'fallito' ? (
        <Button
          titolo={t(fase === 'fermo' ? 'app.aggiornamento.aggiorna' : 'comune.riprova')}
          larghezzaPiena
          dimensione="lg"
          onPress={onAggiorna}
        />
      ) : null}

      {fase === 'pronto' || fase === 'installazione' ? (
        <Button
          titolo={t('app.aggiornamento.riavvia')}
          larghezzaPiena
          dimensione="lg"
          inCaricamento={fase === 'installazione'}
          onPress={completaAggiornamento}
        />
      ) : null}
    </Foglio>
  );
}
