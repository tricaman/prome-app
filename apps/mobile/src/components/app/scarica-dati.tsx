import { useState } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Condivisione from 'expo-sharing';
import { scaricaMieiDati } from '@prome/api-client';
import { useApiMutation, useT } from '@/hooks';

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
 *
 * È un hook e non una scheda perché il disegno della voce cambia col posto in
 * cui sta — una riga nell'indice delle impostazioni, non più una card — mentre
 * quello che fa non cambia mai.
 */
export function useScaricaDati() {
  const t = useT();
  const [nomeFile] = useState(() => `prome-dati-${new Date().toISOString().slice(0, 10)}.json`);

  return useApiMutation({
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
}
