import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEsci, type Portata } from '@prome/app-core';
import {
  aggiornaMiaPrivacy,
  getLeggiMioProfiloQueryKey,
  useLeggiMioProfilo,
  type AggiornaPrivacyDtoVisibilita,
  type LeggiMioProfilo200,
  type ProfiloDto,
} from '@prome/api-client';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { QueryBoundary } from '@/components/feedback';
import { Avatar, Button, Card, Icona, Intestazione, Screen, Text } from '@/components/ui';

const OPZIONI: readonly {
  valore: AggiornaPrivacyDtoVisibilita;
  chiave: 'privato' | 'ateneo' | 'pubblico';
}[] = [
  { valore: 'PRIVATO', chiave: 'privato' },
  { valore: 'ATENEO', chiave: 'ateneo' },
  { valore: 'PUBBLICO', chiave: 'pubblico' },
];

/**
 * Impostazioni.
 *
 * La privacy è la stessa del web e viene dalla stessa API: chi vede quello che
 * scrivi. Il valore mostrato è quello confermato dal server, mai una scelta in
 * attesa — su una decisione di privacy un valore a schermo che non è stato
 * salvato è la bugia peggiore possibile, e questa schermata la diceva: mostrava
 * «Ateneo» a chiunque mentre il valore vero era «Privato».
 *
 * L'altro asse del modello — chi può contattarti — non è qui: l'API lo accetta,
 * ma nessuna regola lo legge ancora (gli inviti viaggiano per indirizzo email,
 * che può non avere un account). Un interruttore che non protegge da niente è
 * peggio di un interruttore che manca.
 *
 * Sono spariti per la stessa ragione gli interruttori delle notifiche, il
 * download dei dati e l'uscita da tutti i dispositivi: nessuno dei tre ha
 * qualcosa dietro, e in una schermata di impostazioni credere di aver messo a
 * posto una cosa è indistinguibile dall'averlo fatto davvero.
 */
export default function SchermataImpostazioni() {
  const t = useT();
  const queryClient = useQueryClient();
  const profilo = useLeggiMioProfilo();

  const salva = useApiMutation({
    mutationFn: (visibilita: AggiornaPrivacyDtoVisibilita) => aggiornaMiaPrivacy({ visibilita }),
    // In cache va il profilo che il server ha appena confermato, non una
    // previsione; l'invalidazione serve alle altre schermate che lo leggono.
    onSuccess: (risposta) => {
      queryClient.setQueryData<LeggiMioProfilo200>(getLeggiMioProfiloQueryKey(), risposta);
    },
    invalida: [getLeggiMioProfiloQueryKey() as never],
  });

  return (
    <>
      <Intestazione conIndietro titolo={t('app.impostazioni.titolo')} />

      <Screen scorrevole>
        <QueryBoundary query={profilo}>
          {({ data }) => (
            <>
              <SchedaProfilo profilo={data} />
              <SceltaVisibilita
                valore={data.impostazioniPrivacy.visibilita}
                inCorso={salva.isPending}
                onScegli={(visibilita) => salva.mutate(visibilita)}
              />
            </>
          )}
        </QueryBoundary>

        <SessioneAccount />

        <Button
          titolo={t('app.impostazioni.elimina.titolo')}
          variante="contorno"
          larghezzaPiena
          onPress={() => router.push(rotte.eliminaAccount())}
        />
      </Screen>
    </>
  );
}

/**
 * Uscire da Prome.
 *
 * Due righe e non una, perché rispondono a due domande diverse: «ho finito»
 * (questo telefono) e «qualcuno potrebbe essere entrato» (tutti i
 * dispositivi). La seconda non è la prima fatta meglio — chiude sessioni che
 * chi preme non ha in mano — quindi dice a parole cosa sta per succedere.
 *
 * Nessuna conferma: uscire è sempre annullabile con un altro codice, e una
 * conferma su un gesto reversibile insegna solo a premere due volte senza
 * leggere. Il ritorno al benvenuto lo fa la guardia in `_layout`, che vede la
 * sessione sparire: qui non si naviga, così esiste un modo solo di uscire.
 */
function SessioneAccount() {
  const t = useT();
  const { esci, inCorso } = useEsci();

  const righe: readonly { chiave: 'esci' | 'esciDaTutti'; portata: Portata }[] = [
    { chiave: 'esci', portata: 'questo-dispositivo' },
    { chiave: 'esciDaTutti', portata: 'tutti-i-dispositivi' },
  ];

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {righe.map((riga, indice) => (
        <RigaSessione
          key={riga.chiave}
          etichetta={t(`app.impostazioni.${riga.chiave}`)}
          dettaglio={t(`app.impostazioni.${riga.chiave}Sub`)}
          inCorso={inCorso}
          ultima={indice === righe.length - 1}
          onPremi={() => void esci(riga.portata)}
        />
      ))}
    </Card>
  );
}

function RigaSessione({
  etichetta,
  dettaglio,
  inCorso,
  ultima,
  onPremi,
}: {
  etichetta: string;
  dettaglio: string;
  inCorso: boolean;
  ultima: boolean;
  onPremi: () => void;
}) {
  const tema = useTema();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inCorso }}
      // Spente entrambe mentre una lavora: la sessione sta per cadere, e un
      // secondo gesto partirebbe con un token che fra un istante non vale più.
      disabled={inCorso}
      onPress={onPremi}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tema.spaziatura[3],
        padding: tema.spaziatura[4],
        borderBottomWidth: ultima ? 0 : 1,
        borderBottomColor: tema.colori.superficieAlt2,
        opacity: inCorso ? 0.6 : 1,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variante="corpo" style={{ fontSize: 14 }}>
          {etichetta}
        </Text>
        <Text variante="didascalia">{dettaglio}</Text>
      </View>
      <Icona nome="esci" dimensione={18} colore="debole" />
    </Pressable>
  );
}

/**
 * Chi sei. Senza email: la sessione porta solo un identificativo, e il profilo
 * non la espone — mostrarla vorrebbe dire farla uscire da Accesso.
 */
function SchedaProfilo({ profilo }: { profilo: ProfiloDto }) {
  const tema = useTema();
  const t = useT();

  const nome = [profilo.nome, profilo.cognome].filter(Boolean).join(' ');
  const studi = [profilo.corso, profilo.universita].filter(Boolean).join(' · ');

  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[4] }}>
      <Avatar nome={nome || '?'} dimensione={64} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variante="sottotitolo">{nome || t('app.impostazioni.senzaNome')}</Text>
        {studi ? <Text variante="didascalia">{studi}</Text> : null}
      </View>
    </Card>
  );
}

function SceltaVisibilita({
  valore,
  inCorso,
  onScegli,
}: {
  valore: AggiornaPrivacyDtoVisibilita;
  inCorso: boolean;
  onScegli: (valore: AggiornaPrivacyDtoVisibilita) => void;
}) {
  const tema = useTema();
  const t = useT();

  return (
    <Card style={{ gap: tema.spaziatura[3] }}>
      <View style={{ gap: 4 }}>
        <Text variante="sottotitolo" style={{ fontSize: 15.5 }}>
          {t('app.impostazioni.contenuti.titolo')}
        </Text>
        <Text variante="didascalia">{t('app.impostazioni.contenuti.testo')}</Text>
      </View>

      <View accessibilityRole="radiogroup" style={{ gap: tema.spaziatura[2] }}>
        {OPZIONI.map((opzione) => {
          const scelta = opzione.valore === valore;
          return (
            <Pressable
              key={opzione.valore}
              accessibilityRole="radio"
              accessibilityState={{ selected: scelta, disabled: inCorso }}
              disabled={inCorso}
              // Riscegliere ciò che è già scelto non è un cambio: evita una
              // richiesta e un avviso che confermerebbe una cosa già vera.
              onPress={() => !scelta && onScegli(opzione.valore)}
              style={{
                borderRadius: tema.raggio.lg,
                borderWidth: 2,
                borderColor: scelta ? tema.colori.primario : tema.colori.bordo,
                backgroundColor: scelta ? tema.colori.primarioTenue : tema.colori.superficie,
                padding: tema.spaziatura[3],
                gap: 3,
                opacity: inCorso ? 0.6 : 1,
              }}
            >
              <Text
                variante="etichetta"
                style={{ color: scelta ? tema.colori.primarioTesto : tema.colori.testo }}
              >
                {t(`app.impostazioni.visibilita.${opzione.chiave}`)}
              </Text>
              <Text variante="didascalia">{t(`app.impostazioni.contenuti.${opzione.chiave}`)}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
