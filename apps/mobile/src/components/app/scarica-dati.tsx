import { useState } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Condivisione from 'expo-sharing';
import { scaricaMieiDati } from '@prome/api-client';
import { useApiMutation, useT } from '@/hooks';
import { Button, Card, Text } from '@/components/ui';

/**
 * «Scarica i tuoi dati» sul telefono.
 *
 * Il documento **si compone qui**, come sul web e per la stessa ragione: un
 * collegamento aperto verso l'endpoint non porterebbe con sé il token della
 * sessione, e salverebbe su disco un 401 chiamandolo «i tuoi dati». Si chiede
 * con il client, si scrive nella cache dell'app e si passa al foglio di
 * condivisione, da cui la persona sceglie dove tenerlo — File, un'altra app,
 * la posta.
 *
 * Il file **si sovrascrive** (`overwrite`): il nome porta la data del giorno,
 * quindi il secondo scaricamento nella stessa giornata troverebbe un file già
 * esistente e fallirebbe — un errore per una cosa che deve solo rifarsi.
 *
 * Nessun avviso di riuscita: il foglio di condivisione **è** l'esito, e un
 * messaggio sopra sarebbe rumore. L'errore invece passa dall'avviso standard,
 * perché tutto sta dentro la mutazione.
 */
export function ScaricaDati() {
  const t = useT();
  const [nomeFile] = useState(() => `prome-dati-${new Date().toISOString().slice(0, 10)}.json`);

  const scarica = useApiMutation({
    mutationFn: async () => {
      const risposta = await scaricaMieiDati();
      const documento = JSON.stringify(risposta.data, null, 2);

      const file = new File(Paths.cache, nomeFile);
      file.create({ overwrite: true });
      file.write(documento);

      if (await Condivisione.isAvailableAsync()) {
        await Condivisione.shareAsync(file.uri, {
          mimeType: 'application/json',
          UTI: 'public.json',
          dialogTitle: t('app.impostazioni.dati.titolo'),
        });
      }
    },
    mostraAvvisoSuccesso: false,
  });

  return (
    <Card>
      <Text variante="sottotitolo">{t('app.impostazioni.dati.titolo')}</Text>
      <Text variante="corpoTenue" style={{ marginTop: 4 }}>
        {t('app.impostazioni.dati.testo')}
      </Text>
      <Text variante="didascalia" style={{ marginTop: 8 }}>
        {t('app.impostazioni.dati.nonMiei')}
      </Text>
      <Button
        titolo={
          scarica.isPending
            ? t('app.impostazioni.dati.inCorso')
            : t('app.impostazioni.dati.azione')
        }
        variante="contorno"
        larghezzaPiena
        inCaricamento={scarica.isPending}
        onPress={() => scarica.mutate(undefined)}
        style={{ marginTop: 12 }}
      />
    </Card>
  );
}
