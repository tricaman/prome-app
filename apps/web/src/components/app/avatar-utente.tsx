'use client';

import { useLeggiMioProfilo } from '@prome/api-client';
import { Avatar } from '@/components/ui';

/**
 * L'avatar di chi sta usando l'app, dal profilo vero.
 *
 * Finché il nome non è arrivato mostra il segno neutro: un avatar è fatto di
 * iniziali e di un colore derivato dal nome, quindi un nome di ripiego non
 * darebbe un'attesa ma la faccia di qualcun altro.
 */
export function AvatarUtente({ dimensione = 42 }: { dimensione?: number }) {
  const profilo = useLeggiMioProfilo();
  const nome = [profilo.data?.data.nome, profilo.data?.data.cognome].filter(Boolean).join(' ');

  return <Avatar nome={nome || '?'} dimensione={dimensione} />;
}
