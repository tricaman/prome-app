import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { rotte } from '@/content';
import { riscuotiDestinazione } from '@/lib/destinazione-in-attesa';
import { useTema } from '@/theme';
import {
  completaMioProfilo,
  useElencaCorsiDiUniversita,
  useElencaUniversita,
  type CompletaProfiloDto,
} from '@prome/api-client';
import { useApiMutation, useT } from '@/hooks';
import { Button, Icona, Input, Intestazione, Screen, Text } from '@/components/ui';
import { ElencoCatalogo } from '@/components/app/elenco-catalogo';

const PASSI_TOTALI = 3;

/** Quante voci mostrare: oltre, l'elenco riempie lo schermo del telefono. */
const VOCI_VISIBILI = 6;

/**
 * Onboarding del profilo, in tre passi.
 *
 * Una domanda per schermata: i passi dell'ateneo e del corso hanno bisogno di
 * spazio verticale per i risultati della ricerca, e stiparli insieme al nome
 * li renderebbe scomodi proprio dove serve precisione.
 *
 * Ateneo e corso sono due passi ma **un dato solo**: al server arriva il
 * corso, che si porta dietro il proprio ateneo. Il catalogo è chiuso — si
 * sceglie da un elenco, non si scrive — e il passo del corso non esiste finché
 * non c'è un ateneo, perché i corsi sono di un ateneo.
 *
 * La barra di avanzamento è continua e non una lista di spunte: comunica
 * progresso senza far sentire l'utente sotto esame.
 */
export default function SchermataProfilo() {
  const tema = useTema();
  const t = useT();
  const [passo, setPasso] = useState(1);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [ricercaAteneo, setRicercaAteneo] = useState('');
  const [ateneo, setAteneo] = useState<string | null>(null);
  const [ricercaCorso, setRicercaCorso] = useState('');
  const [corso, setCorso] = useState<string | null>(null);

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

  const puoProseguire =
    (passo === 1 && nome.trim() && cognome.trim()) || (passo === 2 && ateneo) || (passo === 3 && corso);

  /**
   * I passi sono tre, la scrittura è una.
   *
   * Il server considera l'onboarding completo se e solo se ci sono tutti e
   * quattro i dati, quindi non ha senso mandarli man mano: si raccolgono e si
   * scrivono insieme all'ultimo passo.
   */
  const completa = useApiMutation<unknown, CompletaProfiloDto>({
    mutationFn: (dati: CompletaProfiloDto) => completaMioProfilo(dati),
    // Chi è arrivato da un invito ci torna adesso: è il caso che IA2 chiama
    // normale — si invita anche chi non ha ancora un account, e quel qualcuno
    // arriva qui prima di poter accettare. Mandarlo in bacheca gli farebbe
    // cercare da capo il messaggio da cui era partito.
    onSuccess: () => router.replace(riscuotiDestinazione() ?? rotte.bacheca()),
  });

  const avanti = () => {
    if (passo < PASSI_TOTALI) {
      setPasso((corrente) => corrente + 1);
      return;
    }
    completa.mutate({ nome: nome.trim(), cognome: cognome.trim(), corsoId: corso ?? '' });
  };

  const indietro = () => {
    if (passo > 1) setPasso((corrente) => corrente - 1);
    else router.back();
  };

  return (
    <>
      <Intestazione />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tema.spaziatura[3],
          paddingHorizontal: tema.spaziatura[5],
          paddingBottom: tema.spaziatura[3],
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('app.onboarding.indietro')}
          onPress={indietro}
          style={{
            width: 40,
            height: 40,
            borderRadius: tema.raggio.full,
            backgroundColor: tema.colori.superficieAlt2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icona nome="indietro" colore="testo" />
        </Pressable>

        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: PASSI_TOTALI, now: passo }}
          style={{
            flex: 1,
            height: 8,
            borderRadius: tema.raggio.full,
            backgroundColor: tema.colori.bordo,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${(passo / PASSI_TOTALI) * 100}%`,
              height: '100%',
              borderRadius: tema.raggio.full,
              backgroundColor: tema.colori.primario,
            }}
          />
        </View>

        <Text variante="didascalia" style={{ fontWeight: '800' }}>
          {passo}/{PASSI_TOTALI}
        </Text>
      </View>

      <Screen scorrevole conAreaSicura={false}>
        {passo === 1 ? (
          <>
            <Text variante="titoloGrande" style={{ fontSize: 30 }}>
              {t('app.onboarding.titolo')}
            </Text>
            <NotaPrivacy />
            <Input etichetta="Nome" value={nome} onChangeText={setNome} obbligatorio />
            <Input etichetta="Cognome" value={cognome} onChangeText={setCognome} obbligatorio />
          </>
        ) : null}

        {passo === 2 ? (
          <>
            <Text variante="titoloGrande" style={{ fontSize: 30 }}>
              {t('app.onboarding.titolo')}
            </Text>
            <Text variante="corpoTenue">{t('app.onboarding.sommario')}</Text>
            <ElencoCatalogo
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
                // Cambiare ateneo invalida il corso: quel corso è di un altro
                // ateneo, e tenerlo manderebbe un dato incoerente.
                setCorso(null);
                setRicercaCorso('');
              }}
              autoFocus
            />
            <Text variante="didascalia">{t('app.onboarding.nonTrovi')}</Text>
          </>
        ) : null}

        {passo === 3 ? (
          <>
            <Text variante="titoloGrande" style={{ fontSize: 30 }}>
              {t('app.onboarding.titolo')}
            </Text>
            <Text variante="corpoTenue">{t('app.onboarding.sommario')}</Text>
            <ElencoCatalogo
              etichetta={t('app.onboarding.corso')}
              segnaposto={t('app.onboarding.cercaCorso')}
              vuoto={t('app.onboarding.nessunCorsoTrovato')}
              voci={(corsi.data?.data ?? []).map((voce) => ({
                id: voce.id,
                titolo: voce.nome,
                // Classe e durata distinguono due corsi omonimi dello stesso
                // ateneo: senza, la scelta sarebbe a indovinare.
                dettaglio: `${voce.classe.codice} · ${t('app.onboarding.durataAnni', {
                  numero: String(voce.durataAnni),
                })}`,
              }))}
              sceltaId={corso}
              ricerca={ricercaCorso}
              onRicerca={setRicercaCorso}
              onScelta={(voce) => setCorso(voce.id)}
              autoFocus
            />
            <Text variante="didascalia">{t('app.onboarding.catalogoChiuso')}</Text>
          </>
        ) : null}
      </Screen>

      <View style={{ padding: tema.spaziatura[5], paddingTop: 0 }}>
        <Button
          titolo={t('app.onboarding.continua')}
          dimensione="lg"
          larghezzaPiena
          disabled={!puoProseguire}
          onPress={avanti}
        />
      </View>
    </>
  );
}

/** La nota sul trattamento dati sta sopra i campi: è lì che si decide se fidarsi. */
function NotaPrivacy() {
  const tema = useTema();
  const t = useT();

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: tema.spaziatura[3],
        backgroundColor: tema.colori.primarioTenue,
        borderRadius: tema.raggio.xl,
        padding: tema.spaziatura[4],
      }}
    >
      <Icona nome="lucchetto" colore="accento" />
      <Text variante="didascalia" colore="accento" style={{ flex: 1 }}>
        {t('app.onboarding.privacy')}
      </Text>
    </View>
  );
}
