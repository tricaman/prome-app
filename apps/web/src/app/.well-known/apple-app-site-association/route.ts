import { associazioneApple } from '@/lib/link-app';

/**
 * `/.well-known/apple-app-site-association` — chi lo legge è iOS, non una persona.
 *
 * Tre vincoli che vengono da Apple e non si negoziano: l'indirizzo è quello,
 * **senza estensione**; la risposta è `application/json`; e non ci devono
 * essere redirezioni davanti — per questo il riconoscimento della lingua non
 * tocca questo percorso (il `matcher` di `proxy.ts` esclude gli indirizzi che
 * contengono un punto, e `.well-known` ne ha uno).
 *
 * `force-dynamic` perché la risposta dipende dall'ambiente del processo che
 * serve: generata in anticipo, resterebbe quella del momento della build —
 * cioè un 404 congelato anche dopo aver messo il Team ID.
 */
export const dynamic = 'force-dynamic';

export function GET(): Response {
  const associazione = associazioneApple();
  // 404 e non un file vuoto: «non c'è» è la verità, e iOS la tratta come
  // «questo dominio non ha un'app», che è esattamente lo stato di oggi.
  if (!associazione) return new Response(null, { status: 404 });

  return new Response(JSON.stringify(associazione), {
    headers: {
      'content-type': 'application/json',
      // Apple lo rilegge di rado e passa dalla propria CDN: un'ora è il
      // compromesso fra il non chiederlo a ogni installazione e il non
      // restare appesi a una versione vecchia il giorno che cambia.
      'cache-control': 'public, max-age=3600',
    },
  });
}
