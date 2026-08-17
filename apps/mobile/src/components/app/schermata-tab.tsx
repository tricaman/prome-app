import { useState, type ReactNode } from 'react';
import { RefreshControl, View } from 'react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import type { OpzioniStatoQuery } from '@prome/app-core';
import { useTema } from '@/theme';
import { QueryBoundary } from '@/components/feedback';
import { Intestazione, Screen, Text } from '@/components/ui';

/** Di una lettura qui serve una cosa sola: saperla rileggere. */
type Rileggibile = Pick<UseQueryResult<unknown, unknown>, 'refetch'>;

export interface SchermataTabProps<TDati> extends OpzioniStatoQuery<TDati> {
  /** Il nome della scheda, grande in alto. */
  titolo: string;
  /** Riga sopra al titolo: il saluto della bacheca, un contesto breve. */
  sopraTitolo?: string;
  /** Azioni in alto a destra: una campana, un ingranaggio, un avatar. */
  azioni?: ReactNode;
  /** Una riga che spiega la scheda, sopra al contenuto e sempre visibile. */
  descrizione?: string;
  /**
   * La lettura che governa la scheda: decide attesa, errore e vuoto, e il
   * trascinamento la rilegge.
   */
  query?: UseQueryResult<TDati, unknown>;
  /**
   * Le altre letture della stessa scheda. Non decidono cosa si vede, ma il
   * trascinamento le rilegge **insieme** alla principale e l'indicatore si
   * spegne quando hanno finito tutte: aggiornare una scheda a metà lascerebbe
   * in pagina due momenti diversi dello stesso schermo.
   */
  ancheQuery?: Rileggibile[];
  caricamento?: ReactNode;
  vuoto?: ReactNode;
  errore?: (errore: unknown, riprova: () => void) => ReactNode;
  /** Il pulsante fluttuante della scheda, se ne ha uno. */
  azione?: ReactNode;
  /**
   * Con una `query` e una funzione, i dati arrivano già risolti dal confine di
   * query. Con un nodo il contenuto si disegna comunque, e la `query` serve
   * solo all'aggiornamento: è il caso di una scheda che resta utile anche se
   * una delle sue letture fallisce.
   */
  children: ReactNode | ((dati: TDati) => ReactNode);
}

/**
 * La cornice delle quattro schede.
 *
 * Esiste perché le schede erano quattro cornici diverse: chi metteva
 * l'intestazione e poi `Screen` prendeva il margine del notch due volte —
 * l'intestazione una e `Screen` un'altra — e si ritrovava una sessantina di
 * punti di vuoto sotto al titolo, mentre la bacheca, che quella cornice non la
 * usava affatto, li aveva a dodici e i lati stretti di quattro punti. Erano
 * differenze che nessuno aveva scelto.
 *
 * Adesso la misura è una sola e sta qui: intestazione, contenuto scorrevole,
 * spazio in fondo per il pulsante fluttuante quando c'è.
 *
 * **L'aggiornamento si tira giù**, ed è il gesto che tutti provano per primo su
 * un elenco. L'indicatore resta acceso finché tutte le letture della scheda non
 * hanno finito: spegnerlo prima direbbe che i dati sono nuovi mentre stanno
 * ancora arrivando. Le letture non spariscono mentre si aggiornano — il confine
 * di query tiene i dati vecchi in pagina finché arrivano i nuovi, perché un
 * trascinamento non deve svuotare lo schermo che si stava leggendo.
 */
export function SchermataTab<TDati>({
  titolo,
  sopraTitolo,
  azioni,
  descrizione,
  query,
  ancheQuery,
  eVuoto,
  caricamento,
  vuoto,
  errore,
  azione,
  children,
}: SchermataTabProps<TDati>) {
  const tema = useTema();
  const [inAggiornamento, setInAggiornamento] = useState(false);

  const letture: Rileggibile[] = [...(query ? [query] : []), ...(ancheQuery ?? [])];

  const aggiorna = async () => {
    setInAggiornamento(true);
    try {
      await Promise.all(letture.map((lettura) => lettura.refetch()));
    } finally {
      setInAggiornamento(false);
    }
  };

  const contenuto =
    query && typeof children === 'function' ? (
      <QueryBoundary
        query={query}
        eVuoto={eVuoto}
        caricamento={caricamento}
        vuoto={vuoto}
        errore={errore}
      >
        {children}
      </QueryBoundary>
    ) : (
      (children as ReactNode)
    );

  return (
    <View style={{ flex: 1, backgroundColor: tema.colori.sfondo }}>
      {/* Altezza costante: le quattro schede si guardano l'una dopo l'altra, e
          un titolo che cambia riga a seconda di ciò che gli sta intorno si
          vede come un sobbalzo a ogni cambio di scheda. */}
      <Intestazione
        titolo={titolo}
        sopraTitolo={sopraTitolo}
        azioni={azioni}
        altezzaCostante
      />

      <Screen
        scorrevole
        // I margini di sistema li hanno già presi l'intestazione, sopra, e la
        // barra delle schede, sotto.
        conAreaSicura={false}
        style={{
          // In fondo serve aria perché il pulsante fluttuante non copra
          // l'ultima scheda dell'elenco.
          paddingBottom: azione ? tema.spaziatura[20] : tema.spaziatura[6],
        }}
        refreshControl={
          letture.length ? (
            <RefreshControl
              refreshing={inAggiornamento}
              onRefresh={() => void aggiorna()}
              tintColor={tema.colori.primario}
            />
          ) : undefined
        }
      >
        {descrizione ? <Text variante="corpoTenue">{descrizione}</Text> : null}
        {contenuto}
      </Screen>

      {azione}
    </View>
  );
}
