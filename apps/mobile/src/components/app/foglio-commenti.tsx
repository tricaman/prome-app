import { useT } from '@/hooks';
import { Foglio } from '@/components/ui';
import { Commenti } from './commenti';

export interface FoglioCommentiProps {
  postId?: string;
  onChiudi: () => void;
}

/**
 * I commenti di un post, senza lasciare la bacheca.
 *
 * Aprire una schermata intera per leggere due righe e risponderne una
 * significa perdere il posto nello scorrimento: si torna indietro e la
 * bacheca è dove l'hai lasciata, ma la testa no. Il foglio tiene il post
 * visibile sotto, e chiuderlo non è una navigazione — è alzare il dito.
 *
 * Il dettaglio resta e non è in concorrenza: **toccando il post** ci si va, e
 * lì c'è il testo intero con gli allegati. Due gesti, due destinazioni
 * diverse — che è esattamente ciò che distingueva l'icona dei commenti dal
 * resto della scheda, e che prima non faceva alcuna differenza.
 *
 * Senza `postId` non si monta affatto: il foglio non deve tenere in vita la
 * lettura dei commenti di un post che nessuno sta guardando.
 */
export function FoglioCommenti({ postId, onChiudi }: FoglioCommentiProps) {
  const t = useT();

  return (
    <Foglio
      aperto={Boolean(postId)}
      titolo={t('app.post.titoloCommenti')}
      onChiudi={onChiudi}
      altezza="alto"
    >
      {postId ? <Commenti postId={postId} scorrevole /> : null}
    </Foglio>
  );
}
