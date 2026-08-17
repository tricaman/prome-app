import { useState } from 'react';
import { Linking, View } from 'react-native';
import { router } from 'expo-router';
import { useEsci } from '@prome/app-core';
import { useLeggiPreferenzeNotifiche, useLeggiMioProfilo } from '@prome/api-client';
import { paginaDelSito, rotte } from '@/content';
import { useSceltaTema, useTema, SCELTE_TEMA } from '@/theme';
import { useT } from '@/hooks';
import { useI18n } from '@/i18n/i18n-provider';
import { SEGNAPOSTO_DISPOSITIVI, SEGNAPOSTO_EMAIL } from '@/lib/segnaposto';
import { useScaricaDati } from '@/components/app/scarica-dati';
import {
  Button,
  Elenco,
  Foglio,
  Icona,
  Intestazione,
  RigaElenco,
  SceltaRadio,
  Screen,
  Text,
  TitoloSezione,
} from '@/components/ui';
import { VersioneApp } from '@/components/app/versione-app';

const CHIAVI = { PRIVATO: 'privato', ATENEO: 'ateneo', PUBBLICO: 'pubblico' } as const;

/** Le tre risposte, con la chiave che le nomina in entrambe le lingue. */
const ETICHETTA_TEMA = {
  sistema: 'app.impostazioni.temaSistema',
  chiaro: 'app.impostazioni.temaChiaro',
  scuro: 'app.impostazioni.temaScuro',
} as const;

const DESCRIZIONE_TEMA = {
  sistema: 'app.impostazioni.temaSistemaSub',
  chiaro: 'app.impostazioni.temaChiaroSub',
  scuro: 'app.impostazioni.temaScuroSub',
} as const;

/**
 * Impostazioni: un indice, non un pannello.
 *
 * Il difetto della lista di prima era che tutti i controlli stavano aperti
 * nella stessa colonna — scelte di privacy, interruttori, righe di navigazione
 * e azioni distruttive — e la schermata sembrava infinita. Qui i controlli
 * veri vivono ognuno nella sua schermata, e questa diventa quattro gruppi
 * corti: account, privacy e avvisi, informazioni, i tuoi dati.
 *
 * **Ogni riga porta a destra il valore corrente.** È quello che rende un
 * indice migliore di una lista di controlli: quasi sempre chi apre le
 * impostazioni vuole verificare, non cambiare, e se il valore si legge qui non
 * apre niente. Il valore è sempre quello che il server ha confermato: su una
 * decisione di privacy un valore a schermo non salvato è la bugia peggiore.
 *
 * «Esci» sta in fondo e fuori dai gruppi perché è un'azione, non
 * un'impostazione. Restano due modi di uscire, come prima, perché rispondono a
 * due domande diverse — «ho finito» e «qualcuno potrebbe essere entrato» — ma
 * il secondo è una riga dentro Account, accanto ai dispositivi: è lì che uno
 * ci pensa. Nessuna conferma su nessuno dei due: uscire è annullabile con un
 * altro codice, e una conferma su un gesto reversibile insegna solo a premere
 * due volte senza leggere.
 *
 * SEGNAPOSTO: email e password, dispositivi collegati. Il profilo non espone
 * l'email di proposito e l'accesso è a codice, quindi non c'è nemmeno una
 * password; i dispositivi si registrano ma non esiste un `GET` che li elenchi.
 */
export default function SchermataImpostazioni() {
  const tema = useTema();
  const t = useT();
  const { lingua } = useI18n();
  const { esci, inCorso } = useEsci();
  const profilo = useLeggiMioProfilo();
  const preferenze = useLeggiPreferenzeNotifiche();
  const scarica = useScaricaDati();
  const { scelta, imposta } = useSceltaTema();
  const [sceltaAperta, setSceltaAperta] = useState(false);

  const visibilita = profilo.data?.data.impostazioniPrivacy.visibilita;
  const avvisiAccesi = preferenze.data
    ? Number(preferenze.data.data.commenti) + Number(preferenze.data.data.inviti)
    : undefined;

  const riassuntoAvvisi =
    avvisiAccesi === undefined
      ? undefined
      : avvisiAccesi === 0
        ? t('app.impostazioni.nessunaAttiva')
        : avvisiAccesi === 1
          ? t('app.impostazioni.unaAttiva')
          : t('app.impostazioni.attive', { numero: String(avvisiAccesi) });

  const apriSulSito = (percorso: string) => () => {
    void Linking.openURL(paginaDelSito(percorso, lingua));
  };

  return (
    <>
      <Intestazione conIndietro titolo={t('app.impostazioni.titolo')} />

      <Screen scorrevole conAreaSicura={false}>
        <TitoloSezione>{t('app.impostazioni.gruppi.account')}</TitoloSezione>
        <Elenco>
          <RigaElenco
            icona="matita"
            tinta="menta"
            etichetta={t('app.impostazioni.voci.profilo')}
            sottotitolo={t('app.impostazioni.voci.profiloSub')}
            onPress={() => router.push(rotte.modificaProfilo())}
          />
          <RigaElenco
            icona="posta"
            etichetta={t('app.impostazioni.voci.email')}
            sottotitolo={t('app.impostazioni.voci.emailSub')}
            presto={SEGNAPOSTO_EMAIL}
          />
          <RigaElenco
            icona="dispositivo"
            etichetta={t('app.impostazioni.voci.dispositivi')}
            sottotitolo={t('app.impostazioni.voci.dispositiviSub')}
            presto={SEGNAPOSTO_DISPOSITIVI}
          />
          <RigaElenco
            icona="esci"
            etichetta={t('app.impostazioni.esciDaTutti')}
            sottotitolo={t('app.impostazioni.esciDaTuttiSub')}
            disabilitato={inCorso}
            onPress={() => void esci('tutti-i-dispositivi')}
          />
        </Elenco>

        <TitoloSezione>{t('app.impostazioni.gruppi.privacyNotifiche')}</TitoloSezione>
        <Elenco>
          <RigaElenco
            icona="scudo"
            tinta="menta"
            etichetta={t('app.impostazioni.privacy')}
            sottotitolo={t('app.impostazioni.voci.privacySub')}
            valore={visibilita ? t(`app.impostazioni.visibilita.${CHIAVI[visibilita]}`) : undefined}
            onPress={() => router.push(rotte.privacy())}
          />
          <RigaElenco
            icona="campana"
            tinta="ambra"
            etichetta={t('app.impostazioni.notifiche.titolo')}
            sottotitolo={t('app.impostazioni.voci.notificheSub')}
            valore={riassuntoAvvisi}
            onPress={() => router.push(rotte.impostazioniNotifiche())}
          />
          {/* L'aspetto è l'unica impostazione che **non** viaggia al server:
              è una scelta di questo telefono, e sincronizzarla vorrebbe dire
              scurire il portatile perché si è scurito il cellulare. */}
          <RigaElenco
            icona={scelta === 'chiaro' ? 'sole' : 'luna'}
            etichetta={t('app.impostazioni.aspetto')}
            sottotitolo={t('app.impostazioni.voci.aspettoSub')}
            valore={t(ETICHETTA_TEMA[scelta])}
            onPress={() => setSceltaAperta(true)}
          />
        </Elenco>

        <TitoloSezione>{t('app.impostazioni.gruppi.informazioni')}</TitoloSezione>
        <Elenco>
          <RigaElenco
            icona="documento"
            etichetta={t('app.privacy.titolo')}
            sottotitolo={t('app.impostazioni.voci.privacyPolicySub')}
            onPress={() => router.push(rotte.privacyPolicy())}
          />
          <RigaElenco
            icona="documento"
            etichetta={t('app.impostazioni.voci.termini')}
            sottotitolo={t('app.impostazioni.voci.apreIlSito')}
            onPress={apriSulSito('/termini')}
          />
          <RigaElenco
            icona="documento"
            etichetta={t('app.impostazioni.voci.lineeGuida')}
            sottotitolo={t('app.impostazioni.voci.apreIlSito')}
            onPress={apriSulSito('/linee-guida')}
          />
        </Elenco>

        <TitoloSezione>{t('app.impostazioni.gruppi.tuoiDati')}</TitoloSezione>
        <Elenco>
          <RigaElenco
            icona="scarica"
            tinta="blu"
            etichetta={t('app.impostazioni.dati.titolo')}
            sottotitolo={
              scarica.isPending
                ? t('app.impostazioni.dati.inCorso')
                : t('app.impostazioni.dati.nonMiei')
            }
            disabilitato={scarica.isPending}
            onPress={() => scarica.mutate(undefined)}
          />
          <RigaElenco
            icona="cestino"
            distruttiva
            etichetta={t('app.impostazioni.elimina.titolo')}
            sottotitolo={t('app.impostazioni.voci.eliminaSub')}
            onPress={() => router.push(rotte.eliminaAccount())}
          />
        </Elenco>

        <View style={{ gap: tema.spaziatura[4], marginTop: tema.spaziatura[2] }}>
          <Button
            titolo={t('app.impostazioni.esci')}
            variante="contorno"
            larghezzaPiena
            // Spento mentre una uscita lavora: la sessione sta per cadere, e un
            // secondo gesto partirebbe con un token che fra un istante non vale.
            disabled={inCorso}
            iconaSinistra={<Icona nome="esci" dimensione={18} colore="tenue" />}
            onPress={() => void esci('questo-dispositivo')}
          />
          <Text variante="didascalia" allineamento="center">
            {t('app.impostazioni.esciSubTelefono')}
          </Text>
          <VersioneApp />
        </View>
      </Screen>

      <Foglio
        aperto={sceltaAperta}
        titolo={t('app.impostazioni.aspetto')}
        onChiudi={() => setSceltaAperta(false)}
      >
        <SceltaRadio
          etichetta={t('app.impostazioni.aspetto')}
          valore={scelta}
          conPallino
          opzioni={SCELTE_TEMA.map((valore) => ({
            valore,
            etichetta: t(ETICHETTA_TEMA[valore]),
            descrizione: t(DESCRIZIONE_TEMA[valore]),
          }))}
          // Il foglio **resta aperto**: il tema cambia sotto le dita, e si
          // sceglie guardando. Chiudendosi al primo tocco costringerebbe a
          // riaprirlo per provare l'altro, che è esattamente ciò che si vuole
          // fare davanti a una scelta d'aspetto.
          onScegli={imposta}
        />
      </Foglio>
    </>
  );
}
