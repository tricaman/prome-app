import { View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { riempimenti, RIEMPIMENTO_TESTO } from '@prome/design-tokens';
import { useTema } from '@/theme';
import { Text } from './text';

/**
 * Sempre lo stesso colore per la stessa persona: cambia solo se cambia il nome.
 *
 * I riempimenti non seguono il tema — un avatar resta pastello anche di notte —
 * e per questo le iniziali sopra sono sempre scure.
 */
function tintaDi(seme: string): string {
  let somma = 0;
  for (let i = 0; i < seme.length; i += 1) somma += seme.charCodeAt(i);
  return riempimenti[somma % riempimenti.length]!;
}

export interface AvatarProps {
  nome: string;
  /** L'unica cosa che cambia da un posto all'altro. */
  dimensione?: number;
  /**
   * La foto, se quella persona ne ha una. Senza, restano le iniziali — che
   * non sono un ripiego provvisorio: sono il ritratto di chi la foto non la
   * mette, e non deve somigliare a un'immagine che non ha finito di caricare.
   */
  foto?: string | null;
  /** Anello attorno all'avatar: segnala chi sta parlando. */
  evidenziato?: boolean;
  style?: ViewStyle;
}

/**
 * Ritratto di una persona. **Ce n'è uno solo**, e prende la misura in
 * ingresso: dove serve più piccolo si passa un numero più piccolo.
 *
 * Finché non ci sono immagini reali mostra le iniziali su una tinta derivata
 * dal nome: riconoscibile e stabile, senza il grigio anonimo di un segnaposto.
 *
 * Non esiste più la variante senza iniziali: era un disco colorato e muto —
 * nell'intestazione della bacheca e accanto al campo dei commenti si leggeva
 * come un'immagine che non ha finito di caricare, e non diceva di chi fosse.
 * Un avatar che non dice chi è non è un avatar.
 */
export function Avatar({
  nome,
  dimensione = 40,
  foto,
  evidenziato = false,
  style,
}: AvatarProps) {
  const tema = useTema();
  const iniziali = nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      accessibilityLabel={nome}
      style={[
        {
          width: dimensione,
          height: dimensione,
          borderRadius: tema.raggio.full,
          backgroundColor: tintaDi(nome),
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: evidenziato ? 2.5 : 0,
          borderColor: tema.colori.primario,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Le iniziali restano **sotto** la foto, non al suo posto: mentre
          l'immagine arriva si vede già chi è, e non un buco grigio. */}
      {foto ? (
        <Image
          source={{ uri: foto }}
          style={{
            position: 'absolute',
            width: dimensione,
            height: dimensione,
            borderRadius: tema.raggio.full,
          }}
          contentFit="cover"
          // La cache è del disco: la stessa faccia compare in venti schede
          // dello scorrimento, e riscaricarla venti volte è banda di qualcun
          // altro.
          cachePolicy="memory-disk"
          transition={120}
          accessibilityLabel={nome}
        />
      ) : null}

      {/* L'interlinea si ricava dalla dimensione, sempre. Senza, restava
          quella della variante di testo — ventiquattro punti — e a un avatar
          grande le iniziali venivano tagliate in cima: si vedeva solo nel
          profilo, che è l'unico posto dove l'avatar è da novantasei. */}
      <Text
        allineamento="center"
        style={{
          fontSize: dimensione * 0.36,
          lineHeight: dimensione * 0.44,
          fontWeight: tema.tipografia.peso.extra,
          color: RIEMPIMENTO_TESTO,
        }}
      >
        {iniziali}
      </Text>
    </View>
  );
}

/** Avatar sovrapposti: quante persone ci sono, non chi sono. */
export function AvatarGroup({
  nomi,
  dimensione = 28,
}: {
  nomi: readonly string[];
  dimensione?: number;
}) {
  const tema = useTema();

  return (
    <View style={{ flexDirection: 'row' }}>
      {nomi.map((nome, indice) => (
        <View
          key={nome}
          style={{
            marginLeft: indice === 0 ? 0 : -9,
            borderWidth: 2,
            borderColor: tema.colori.superficie,
            borderRadius: tema.raggio.full,
          }}
        >
          <Avatar nome={nome} dimensione={dimensione} />
        </View>
      ))}
    </View>
  );
}
