import type { PrismaClient } from '@prisma/client';
import type { CatalogoDaSeminare } from '../src/modules/profilo/catalogo/dati/catalogo';
import { seminaCatalogo } from '../src/modules/profilo/catalogo/semina-catalogo';

/**
 * Il catalogo che le suite usano per completare un onboarding.
 *
 * È **separato da quello del prodotto**: i corsi veri cambiano — se ne
 * aggiungono, se ne ritirano — e una suite che ci si appoggiasse si
 * romperebbe per una modifica a un file di dati, con un errore che non
 * parlerebbe del difetto. Gli atenei hanno quindi nomi propri, che si
 * riconoscono a colpo d'occhio anche dentro un'asserzione.
 *
 * Le **classi** invece sono le stesse (stesso codice ministeriale, stesso
 * nome): sono l'elenco del ministero, non un dato nostro, e due definizioni
 * dello stesso codice sarebbero una contraddizione a seconda di chi semina per
 * ultimo.
 *
 * `assicuraCatalogoDiProva` è idempotente e si può chiamare da ogni `beforeAll`:
 * le suite girano in parallelo sullo stesso database.
 */
const CATALOGO_DI_PROVA: CatalogoDaSeminare = {
  classi: [
    { codice: 'L-8', nome: 'Ingegneria dell\'informazione', livello: 'TRIENNALE' },
    { codice: 'L-9', nome: 'Ingegneria industriale', livello: 'TRIENNALE' },
    { codice: 'L-10', nome: 'Lettere', livello: 'TRIENNALE' },
  ],
  universita: [
    {
      slug: 'universita-di-prova',
      nome: 'Università di Prova',
      nomeBreve: 'UniProva',
      citta: 'Prova',
      corsi: [
        // Due corsi nello stesso ateneo: servono a provare che la visibilità
        // «Ateneo» guarda l'ateneo e non il corso.
        { codice: 'PROVA-INF', nome: 'Ingegneria informatica', classeCodice: 'L-8', durataAnni: 3 },
        { codice: 'PROVA-LET', nome: 'Lettere moderne', classeCodice: 'L-10', durataAnni: 3 },
      ],
    },
    {
      slug: 'politecnico-di-prova',
      nome: 'Politecnico di Prova',
      nomeBreve: 'PoliProva',
      citta: 'Prova',
      corsi: [
        { codice: 'PROVA-GES', nome: 'Ingegneria gestionale', classeCodice: 'L-9', durataAnni: 3 },
      ],
    },
    {
      // L'ateneo verso cui ci si trasferisce nei test sul cambio di università.
      slug: 'ateneo-di-passaggio',
      nome: 'Ateneo di Passaggio',
      nomeBreve: 'Passaggio',
      citta: 'Altrove',
      corsi: [
        { codice: 'PROVA-INF', nome: 'Ingegneria informatica', classeCodice: 'L-8', durataAnni: 3 },
      ],
    },
  ],
};

export interface CatalogoDiProva {
  /** Università di Prova — l'ateneo di partenza della maggior parte dei test. */
  ateneoId: string;
  corsoInformatica: string;
  /** Stesso ateneo, corso diverso: la visibilità di ateneo non deve cambiare. */
  corsoLettere: string;
  /** Politecnico di Prova: un secondo ateneo, per chi non deve vedere. */
  altroAteneoId: string;
  altroCorso: string;
  /** Ateneo di Passaggio: dove ci si trasferisce a metà test. */
  ateneoDiPassaggioId: string;
  corsoDiPassaggio: string;
}

export const NOME_ATENEO = 'Università di Prova';

export async function assicuraCatalogoDiProva(prisma: PrismaClient): Promise<CatalogoDiProva> {
  await seminaCatalogo(prisma, CATALOGO_DI_PROVA);

  const corso = async (slug: string, codice: string): Promise<{ id: string; ateneoId: string }> => {
    const riga = await prisma.corso.findFirst({
      where: { codice, universita: { slug } },
      select: { id: true, universitaId: true },
    });
    if (!riga) throw new Error(`Catalogo di prova incompleto: ${slug}/${codice}`);
    return { id: riga.id, ateneoId: riga.universitaId };
  };

  const [informatica, lettere, gestionale, passaggio] = await Promise.all([
    corso('universita-di-prova', 'PROVA-INF'),
    corso('universita-di-prova', 'PROVA-LET'),
    corso('politecnico-di-prova', 'PROVA-GES'),
    corso('ateneo-di-passaggio', 'PROVA-INF'),
  ]);

  return {
    ateneoId: informatica.ateneoId,
    corsoInformatica: informatica.id,
    corsoLettere: lettere.id,
    altroAteneoId: gestionale.ateneoId,
    altroCorso: gestionale.id,
    ateneoDiPassaggioId: passaggio.ateneoId,
    corsoDiPassaggio: passaggio.id,
  };
}
