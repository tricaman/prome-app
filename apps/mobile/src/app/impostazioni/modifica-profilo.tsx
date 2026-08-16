import { useEffect, useState } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  completaMioProfilo,
  getLeggiMioProfiloQueryKey,
  useElencaCorsiDiUniversita,
  useElencaUniversita,
  useLeggiMioProfilo,
  type CompletaProfiloDto,
  type ProfiloDto,
} from '@prome/api-client';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { SEGNAPOSTO_AVATAR, gestoSospeso } from '@/lib/segnaposto';
import { QueryBoundary } from '@/components/feedback';
import { ElencoCatalogo } from '@/components/app/elenco-catalogo';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Elenco,
  Foglio,
  Icona,
  Input,
  Intestazione,
  RigaElenco,
  Screen,
  Text,
  TitoloSezione,
} from '@/components/ui';

/** Quante voci mostrare: oltre, l'elenco riempie lo schermo del telefono. */
const VOCI_VISIBILI = 6;

const CHIAVI = { PRIVATO: 'privato', ATENEO: 'ateneo', PUBBLICO: 'pubblico' } as const;

/**
 * Modifica profilo.
 *
 * Schermata a sé, staccata dalle impostazioni: qui si cambia **chi sei**, là
 * **come funziona l'app**. Sono due compiti che si affrontano in momenti
 * diversi, ed è la ragione per cui la vecchia lista unica sembrava infinita.
 *
 * Ateneo e corso non sono due dati ma uno: al server arriva il corso, che si
 * porta dietro il proprio ateneo. Il catalogo è chiuso, quindi si sceglie da un
 * elenco — non c'è un campo in cui scrivere il nome di un corso, perché un
 * testo digitato a mano romperebbe il collegamento con la bacheca dell'ateneo.
 *
 * **Qui si conferma, non si applica.** Nelle impostazioni ogni scelta vale
 * appena toccata; questo è un modulo, e un modulo si salva: «Salva» sta in
 * alto a destra e si accende solo con modifiche pendenti. Uscire con modifiche
 * non salvate chiede prima, da tutte e tre le uscite — il tondo indietro, il
 * tasto di sistema e il gesto, quest'ultimo spento nello Stack. Un controllo
 * che copre due uscite su tre non è un controllo.
 *
 * Non si usa `usePreventRemove`: expo-router 57 lo contiene ma non lo esporta,
 * e pescarlo dentro `build/` si rompe al prossimo SDK.
 *
 * SEGNAPOSTO: «Cambia foto» — nel profilo non c'è una foto e non esiste un
 * endpoint per caricarla (`SEGNAPOSTO_AVATAR`). Il selettore del rullino c'è
 * già in `lib/scelta-file.ts`, ma non avrebbe dove mandare i byte.
 */
export default function SchermataModificaProfilo() {
  const t = useT();
  const profilo = useLeggiMioProfilo();

  return (
    <QueryBoundary query={profilo}>{({ data }) => <Modulo profilo={data} t={t} />}</QueryBoundary>
  );
}

function Modulo({ profilo, t }: { profilo: ProfiloDto; t: ReturnType<typeof useT> }) {
  const tema = useTema();

  const [nome, setNome] = useState(profilo.nome ?? '');
  const [cognome, setCognome] = useState(profilo.cognome ?? '');
  const [ateneo, setAteneo] = useState<string | null>(profilo.universita?.id ?? null);
  const [ricercaAteneo, setRicercaAteneo] = useState(profilo.universita?.nome ?? '');
  const [corso, setCorso] = useState<string | null>(profilo.corso?.id ?? null);
  const [ricercaCorso, setRicercaCorso] = useState(profilo.corso?.nome ?? '');
  const [chiedeDiUscire, setChiedeDiUscire] = useState(false);

  const atenei = useElencaUniversita({
    ricerca: ricercaAteneo.trim() || undefined,
    limit: VOCI_VISIBILI,
  });
  const corsi = useElencaCorsiDiUniversita(
    ateneo ?? '',
    { ricerca: ricercaCorso.trim() || undefined, limit: VOCI_VISIBILI },
    // Senza ateneo la domanda non ha senso: non si chiede.
    { query: { enabled: Boolean(ateneo) } },
  );

  const salva = useApiMutation<unknown, CompletaProfiloDto>({
    mutationFn: (valori: CompletaProfiloDto) => completaMioProfilo(valori),
    invalida: [getLeggiMioProfiloQueryKey() as never],
    onSuccess: () => router.back(),
  });

  const completi = Boolean(nome.trim() && cognome.trim() && corso);
  const modificate =
    nome.trim() !== (profilo.nome ?? '') ||
    cognome.trim() !== (profilo.cognome ?? '') ||
    corso !== (profilo.corso?.id ?? null);

  const esci = () => {
    if (modificate) setChiedeDiUscire(true);
    else router.back();
  };

  // Il tasto indietro di Android: senza questo il modulo si abbandona da lì
  // senza che nessuno chieda niente.
  useEffect(() => {
    if (!modificate) return;
    const iscrizione = BackHandler.addEventListener('hardwareBackPress', () => {
      setChiedeDiUscire(true);
      return true;
    });
    return () => iscrizione.remove();
  }, [modificate]);

  const conferma = () =>
    salva.mutate({ nome: nome.trim(), cognome: cognome.trim(), corsoId: corso ?? '' });

  return (
    <>
      <Intestazione
        conIndietro
        onIndietro={esci}
        titolo={t('app.impostazioni.modificaProfilo.titolo')}
        azioni={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('comune.salva')}
            accessibilityState={{ disabled: !modificate || !completi || salva.isPending }}
            disabled={!modificate || !completi || salva.isPending}
            onPress={conferma}
            hitSlop={10}
          >
            <Text
              variante="etichetta"
              colore="accento"
              style={{ fontSize: 15, opacity: modificate && completi ? 1 : 0.4 }}
            >
              {t('comune.salva')}
            </Text>
          </Pressable>
        }
      />

      <Screen scorrevole>
        <View style={{ alignItems: 'center', gap: tema.spaziatura[3] }}>
          <View>
            <Avatar nome={[nome, cognome].filter(Boolean).join(' ') || '?'} dimensione={96} />
            <View
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 34,
                height: 34,
                borderRadius: tema.raggio.full,
                backgroundColor: tema.colori.superficieAlt2,
                borderWidth: 3,
                borderColor: tema.colori.sfondo,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.55,
              }}
            >
              <Icona nome="fotocamera" dimensione={16} colore="tenue" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[2] }}>
            <Button
              titolo={t('app.impostazioni.modificaProfilo.cambiaFoto')}
              variante="contorno"
              disabled
              onPress={gestoSospeso(SEGNAPOSTO_AVATAR)}
            />
            <Chip tono="ambra">{t('comune.presto')}</Chip>
          </View>
        </View>

        <Card style={{ gap: tema.spaziatura[3] }}>
          <Input
            etichetta={t('app.onboarding.nome')}
            value={nome}
            onChangeText={setNome}
            autoComplete="given-name"
          />
          <Input
            etichetta={t('app.onboarding.cognome')}
            value={cognome}
            onChangeText={setCognome}
            autoComplete="family-name"
          />
        </Card>

        <TitoloSezione>{t('app.impostazioni.modificaProfilo.studi')}</TitoloSezione>
        <Card style={{ gap: tema.spaziatura[3] }}>
          <ElencoCatalogo
            etichetta={t('app.onboarding.universita')}
            segnaposto={t('app.onboarding.cercaUniversita')}
            vuoto={t('app.onboarding.nessunRisultato')}
            voci={(atenei.data?.data ?? []).map((voce) => ({
              id: voce.id,
              titolo: voce.nome,
              dettaglio: voce.citta,
            }))}
            sceltaId={ateneo}
            ricerca={ricercaAteneo}
            onRicerca={setRicercaAteneo}
            onScelta={(voce) => {
              setAteneo(voce.id);
              setRicercaAteneo(voce.titolo);
              // Cambiare ateneo invalida il corso: quel corso è di un altro
              // ateneo, e tenerlo manderebbe un dato incoerente.
              setCorso(null);
              setRicercaCorso('');
            }}
          />

          <ElencoCatalogo
            etichetta={t('app.onboarding.corso')}
            segnaposto={ateneo ? t('app.onboarding.cercaCorso') : t('app.onboarding.primaLAteneo')}
            vuoto={
              ateneo ? t('app.onboarding.nessunCorsoTrovato') : t('app.onboarding.primaLAteneo')
            }
            voci={(corsi.data?.data ?? []).map((voce) => ({
              id: voce.id,
              titolo: voce.nome,
              dettaglio: `${voce.classe.codice} · ${t('app.onboarding.durataAnni', {
                numero: String(voce.durataAnni),
              })}`,
            }))}
            sceltaId={corso}
            ricerca={ricercaCorso}
            onRicerca={setRicercaCorso}
            onScelta={(voce) => {
              setCorso(voce.id);
              setRicercaCorso(voce.titolo);
            }}
          />

          {/* Le conseguenze del cambio di ateneo si dicono **prima** che
              avvenga: cosa cambia subito e cosa resta com'è. */}
          <View
            style={{
              flexDirection: 'row',
              gap: tema.spaziatura[3],
              alignItems: 'flex-start',
              backgroundColor: tema.colori.superficieAlt2,
              borderRadius: tema.raggio.lg,
              padding: tema.spaziatura[3],
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: tema.raggio.full,
                backgroundColor: tema.colori.superficie,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                variante="didascalia"
                style={{ fontSize: 12, fontWeight: tema.tipografia.peso.extra }}
              >
                i
              </Text>
            </View>
            <Text variante="didascalia" style={{ flex: 1 }}>
              {t('app.impostazioni.profilo.testo')}
            </Text>
          </View>
        </Card>

        {/* Non «Profilo pubblico», che era il titolo del disegno: un profilo
            pubblico non esiste e non esisterà. Qui si va a decidere chi vede
            quello che scrivi, dentro Prome. */}
        <TitoloSezione>{t('app.impostazioni.privacy')}</TitoloSezione>
        <Elenco>
          <RigaElenco
            icona="scudo"
            tinta="menta"
            etichetta={t('app.impostazioni.modificaProfilo.chiVede')}
            sottotitolo={t('app.impostazioni.modificaProfilo.chiVedeSub')}
            valore={t(
              `app.impostazioni.visibilita.${CHIAVI[profilo.impostazioniPrivacy.visibilita]}`,
            )}
            onPress={() => router.push(rotte.privacy())}
          />
        </Elenco>
      </Screen>

      <Foglio
        aperto={chiedeDiUscire}
        titolo={t('app.impostazioni.modificaProfilo.nonSalvate.titolo')}
        onChiudi={() => setChiedeDiUscire(false)}
      >
        <Text variante="corpoTenue">{t('app.impostazioni.modificaProfilo.nonSalvate.testo')}</Text>
        <Button
          titolo={t('comune.salva')}
          larghezzaPiena
          dimensione="lg"
          inCaricamento={salva.isPending}
          disabled={!completi}
          onPress={() => {
            setChiedeDiUscire(false);
            conferma();
          }}
        />
        <Button
          titolo={t('app.impostazioni.modificaProfilo.nonSalvate.esci')}
          variante="fantasma"
          larghezzaPiena
          onPress={() => {
            setChiedeDiUscire(false);
            router.back();
          }}
        />
      </Foglio>
    </>
  );
}
