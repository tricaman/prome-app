import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  aggiornaMiaPrivacy,
  getLeggiMioProfiloQueryKey,
  useLeggiMioProfilo,
  type AggiornaPrivacyDtoVisibilita,
  type LeggiMioProfilo200,
} from '@prome/api-client';
import { UTENTE } from '@prome/contenuti';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { QueryBoundary } from '@/components/feedback';
import { Avatar, Button, Card, Icona, Intestazione, Screen, Switch, Text } from '@/components/ui';

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
 * La privacy qui è la stessa del web, dalla stessa API: chi vede quello che
 * scrivi. Il valore mostrato è quello confermato dal server, mai una scelta in
 * attesa — su una decisione di privacy un valore a schermo che non è stato
 * salvato è la bugia peggiore possibile, e questa schermata la diceva: mostrava
 * «Ateneo» a chiunque mentre il valore vero era «Privato».
 *
 * L'altro asse del modello — chi può contattarti — non è qui: l'API lo accetta,
 * ma nessuna regola lo legge ancora (gli inviti viaggiano per indirizzo email,
 * che può non avere un account). Un interruttore che non protegge da niente è
 * peggio di un interruttore che manca.
 */
export default function SchermataImpostazioni() {
  const tema = useTema();
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

  const [notifiche, setNotifiche] = useState<Record<string, boolean>>({
    commenti: true,
    inviti: true,
    promemoria: true,
    materiali: false,
  });

  const righeNotifiche = ['commenti', 'inviti', 'promemoria', 'materiali'] as const;

  return (
    <>
      <Intestazione conIndietro titolo={t('app.impostazioni.titolo')} />

      <Screen scorrevole>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[4] }}>
          <Avatar nome={UTENTE.nome} dimensione={64} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variante="sottotitolo">{UTENTE.nome}</Text>
            <Text variante="didascalia">{UTENTE.corso}</Text>
            <Text variante="didascalia" colore="debole">
              {UTENTE.email}
            </Text>
          </View>
        </Card>

        <QueryBoundary query={profilo}>
          {({ data }) => (
            <SceltaVisibilita
              valore={data.impostazioniPrivacy.visibilita}
              inCorso={salva.isPending}
              onScegli={(visibilita) => salva.mutate(visibilita)}
            />
          )}
        </QueryBoundary>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {righeNotifiche.map((riga, indice) => (
            <View
              key={riga}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: tema.spaziatura[3],
                padding: tema.spaziatura[4],
                borderBottomWidth: indice < righeNotifiche.length - 1 ? 1 : 0,
                borderBottomColor: tema.colori.superficieAlt2,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variante="corpo" style={{ fontSize: 14 }}>
                  {t(`app.impostazioni.notifiche.${riga}`)}
                </Text>
                <Text variante="didascalia">
                  {t(`app.impostazioni.notifiche.${riga}Sub`)}
                </Text>
              </View>
              <Switch
                etichetta={t(`app.impostazioni.notifiche.${riga}`)}
                attivo={notifiche[riga] ?? false}
                onChange={(valore) =>
                  setNotifiche((precedenti) => ({ ...precedenti, [riga]: valore }))
                }
              />
            </View>
          ))}
        </Card>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <RigaAccount etichetta={t('app.impostazioni.scaricaDati')} />
          <RigaAccount etichetta={t('app.impostazioni.esciDaTutti')} ultima />
        </Card>

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

function RigaAccount({ etichetta, ultima = false }: { etichetta: string; ultima?: boolean }) {
  const tema = useTema();

  return (
    <Pressable
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tema.spaziatura[3],
        padding: tema.spaziatura[4],
        borderBottomWidth: ultima ? 0 : 1,
        borderBottomColor: tema.colori.superficieAlt2,
      }}
    >
      <Text variante="corpo" style={{ flex: 1, fontSize: 14 }}>
        {etichetta}
      </Text>
      <Icona nome="avanti" dimensione={17} colore="debole" />
    </Pressable>
  );
}
