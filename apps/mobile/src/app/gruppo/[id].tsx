import { useLocalSearchParams } from 'expo-router';
import { DettaglioGruppo } from '@/components/dettagli/dettaglio-gruppo';

/**
 * The gruppo as a screen of its own: on a phone, or opened from a link. On a
 * tablet the same component also lives in the pane next to the list.
 */
export default function Schermata() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DettaglioGruppo id={id} />;
}
