import { Linking, View } from 'react-native';
import { EMAIL_PRIVACY, PRIVACY_IN_BREVE, PRIVACY_SEZIONI, paginaDelSito } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { useI18n } from '@/i18n/i18n-provider';
import { AzioneTonda, Button, Card, Intestazione, Screen, Text } from '@/components/ui';

/**
 * La privacy policy dentro l'app.
 *
 * Mancava del tutto, e la revisione degli store la vuole raggiungibile senza
 * uscire: adesso si arriva qui da tre punti — il piè della tab Profilo, il
 * gruppo Informazioni delle impostazioni e il fondo della schermata Privacy —
 * perché è dove la si cerca.
 *
 * **Questa schermata non contiene nemmeno una parola propria.** I testi stanno
 * in `@prome/contenuti`, gli stessi che il sito pubblica: sono l'unico posto
 * dove è scritto cosa Prome fa dei dati, e una seconda copia qui divergerebbe
 * al primo aggiornamento. Il documento è nativo e non una webview perché
 * rispetta la dimensione di testo di sistema, che una pagina incorporata no.
 *
 * L'indirizzo a cui si scrive è `EMAIL_PRIVACY` e non una casella su
 * `prome.app`: quel dominio non ha un server di posta, quindi una richiesta di
 * accesso o cancellazione mandata lì verrebbe accettata e persa.
 */
export default function SchermataPrivacyPolicy() {
  const tema = useTema();
  const t = useT();
  const { lingua } = useI18n();

  return (
    <>
      <Intestazione
        conIndietro
        titolo={t('app.privacy.titolo')}
        azioni={
          <AzioneTonda
            icona="condividi"
            etichetta={t('app.privacy.condividi')}
            onPress={() => {
              void Linking.openURL(paginaDelSito('/privacy', lingua));
            }}
          />
        }
      />

      <Screen scorrevole conAreaSicura={false}>
        <Text variante="didascalia" style={{ fontWeight: tema.tipografia.peso.grassetto }}>
          {t('pagine.privacy.vigore')}
        </Text>

        {/* Il documento è redatto in italiano soltanto: un testo legale
            tradotto a macchina è peggio di un testo legale assente, e chi
            naviga in un'altra lingua ha diritto di saperlo prima di leggerlo. */}
        {lingua === 'it' ? null : (
          <Card
            style={{
              backgroundColor: tema.tinte.ambra.velo,
              borderColor: tema.tinte.ambra.bordo,
            }}
          >
            <Text variante="didascalia" style={{ color: tema.tinte.ambra.testo }}>
              {t('pagine.privacy.soloItaliano')}
            </Text>
          </Card>
        )}

        {/* Due livelli di lettura: il riepilogo serve a essere capiti, il testo
            completo a essere conformi. Nessuno dei due sostituisce l'altro. */}
        <Card
          style={{
            backgroundColor: tema.tinte.menta.velo,
            borderColor: tema.tinte.menta.bordo,
            gap: tema.spaziatura[3],
          }}
        >
          <Text variante="sottotitolo" style={{ color: tema.tinte.menta.testo }}>
            {t('pagine.privacy.inBreve')}
          </Text>
          {PRIVACY_IN_BREVE.map((punto) => (
            <View
              key={punto}
              style={{ flexDirection: 'row', gap: tema.spaziatura[3], alignItems: 'flex-start' }}
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
                  style={{
                    fontSize: 11,
                    fontWeight: tema.tipografia.peso.extra,
                    color: tema.tinte.menta.testo,
                  }}
                >
                  ✓
                </Text>
              </View>
              <Text
                variante="corpo"
                style={{ flex: 1, fontSize: 13, color: tema.tinte.menta.testo }}
              >
                {punto}
              </Text>
            </View>
          ))}
        </Card>

        {PRIVACY_SEZIONI.map((sezione) => (
          <View key={sezione.id} style={{ gap: tema.spaziatura[2] }}>
            <Text variante="sottotitolo" style={{ fontSize: 17 }}>
              {sezione.titolo}
            </Text>
            <Text variante="corpo" colore="corpo" style={{ fontSize: 14 }}>
              {sezione.corpo}
            </Text>
          </View>
        ))}

        <Card style={{ backgroundColor: tema.colori.superficieAlt2 }}>
          <Text variante="sottotitolo" style={{ fontSize: 15 }}>
            {t('pagine.privacy.contatto.titolo')}
          </Text>
          <Text variante="corpoTenue">{t('pagine.privacy.contatto.testo')}</Text>
          <Button
            titolo={EMAIL_PRIVACY}
            larghezzaPiena
            onPress={() => {
              void Linking.openURL(`mailto:${EMAIL_PRIVACY}`);
            }}
            style={{ marginTop: tema.spaziatura[2] }}
          />
        </Card>
      </Screen>
    </>
  );
}
