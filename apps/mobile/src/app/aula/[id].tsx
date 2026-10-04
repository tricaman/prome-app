import { useLocalSearchParams } from 'expo-router';
import { DettaglioAula } from '@/components/dettagli/dettaglio-aula';

/**
 * The aula as a screen of its own: on a phone, or opened from a link. On a
 * tablet the same component also lives in the pane next to the list.
 */
export default function Schermata() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DettaglioAula id={id} />;
}
