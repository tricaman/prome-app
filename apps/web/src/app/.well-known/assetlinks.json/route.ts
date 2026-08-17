import { associazioneAndroid } from '@/lib/link-app';

/**
 * `/.well-known/assetlinks.json` — la metà Android della stessa dichiarazione.
 *
 * Android la verifica **all'installazione**: se il file manca o l'impronta
 * non corrisponde, i collegamenti non si aprono nell'app e restano al
 * browser. È una degradazione silenziosa e corretta, ed è il motivo per cui
 * `autoVerify` nel manifesto non è un rischio finché questo file non c'è.
 */
export const dynamic = 'force-dynamic';

export function GET(): Response {
  const associazione = associazioneAndroid();
  if (!associazione) return new Response(null, { status: 404 });

  return new Response(JSON.stringify(associazione), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=3600',
    },
  });
}
