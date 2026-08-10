import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { UTENTE, type Visibilita } from '@prome/contenuti';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { Avatar, Button, Card, Icona, Intestazione, Screen, Switch, Text } from '@/components/ui';

const VISIBILITA: readonly { valore: Visibilita; chiave: 'privato' | 'ateneo' | 'pubblico' }[] = [
  { valore: 'Privato', chiave: 'privato' },
  { valore: 'Ateneo', chiave: 'ateneo' },
  { valore: 'Pubblico', chiave: 'pubblico' },
];

/**
 * Impostazioni.
 *
 * Le due assi di privacy restano separate — chi può contattarti e chi può
 * vedere i tuoi contenuti — perché unirle in un solo "livello" farebbe credere
 * che rendersi raggiungibili significhi anche rendere pubblico ciò che si
 * scrive.
 */
export default function SchermataImpostazioni() {
  const tema = useTema();
  const t = useT();

  const [contatto, setContatto] = useState<Visibilita>('Ateneo');
  const [contenuti, setContenuti] = useState<Visibilita>('Ateneo');
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

        <SceltaVisibilita
          titolo={t('app.impostazioni.contatto.titolo')}
          descrizione={t('app.impostazioni.contatto.testo')}
          valore={contatto}
          descrizioni={{
            privato: t('app.impostazioni.contatto.privato'),
            ateneo: t('app.impostazioni.contatto.ateneo'),
            pubblico: t('app.impostazioni.contatto.pubblico'),
          }}
          onChange={setContatto}
        />

        <SceltaVisibilita
          titolo={t('app.impostazioni.contenuti.titolo')}
          descrizione={t('app.impostazioni.contenuti.testo')}
          valore={contenuti}
          descrizioni={{
            privato: t('app.impostazioni.contenuti.privato'),
            ateneo: t('app.impostazioni.contenuti.ateneo'),
            pubblico: t('app.impostazioni.contenuti.pubblico'),
          }}
          onChange={setContenuti}
        />

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
  titolo,
  descrizione,
  valore,
  descrizioni,
  onChange,
}: {
  titolo: string;
  descrizione: string;
  valore: Visibilita;
  descrizioni: Record<'privato' | 'ateneo' | 'pubblico', string>;
  onChange: (valore: Visibilita) => void;
}) {
  const tema = useTema();

  return (
    <Card style={{ gap: tema.spaziatura[3] }}>
      <View style={{ gap: 4 }}>
        <Text variante="sottotitolo" style={{ fontSize: 15.5 }}>
          {titolo}
        </Text>
        <Text variante="didascalia">{descrizione}</Text>
      </View>

      <View accessibilityRole="radiogroup" style={{ gap: tema.spaziatura[2] }}>
        {VISIBILITA.map((opzione) => {
          const scelta = opzione.valore === valore;
          return (
            <Pressable
              key={opzione.valore}
              accessibilityRole="radio"
              accessibilityState={{ selected: scelta }}
              onPress={() => onChange(opzione.valore)}
              style={{
                borderRadius: tema.raggio.lg,
                borderWidth: 2,
                borderColor: scelta ? tema.colori.primario : tema.colori.bordo,
                backgroundColor: scelta ? tema.colori.primarioTenue : tema.colori.superficie,
                padding: tema.spaziatura[3],
                gap: 3,
              }}
            >
              <Text
                variante="etichetta"
                style={{ color: scelta ? tema.colori.primarioTesto : tema.colori.testo }}
              >
                {opzione.valore}
              </Text>
              <Text variante="didascalia">{descrizioni[opzione.chiave]}</Text>
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
