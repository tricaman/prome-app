-- Il Corso universitario diventa un'entità del catalogo.
--
-- Prima di questa migration l'identità accademica erano due stringhe libere:
-- «Università di Bologna», «UniBo» e «universita di bologna» erano tre atenei
-- diversi, e il corso non era interrogabile affatto. Da qui in avanti si
-- sceglie da un catalogo chiuso, e ogni confronto passa da un identificativo.
--
-- La migration porta con sé due decisioni sui dati, entrambe deliberate e
-- annotate nel punto in cui accadono: la tabula rasa sui profili e la
-- retrocessione a PRIVATO degli spazi riservati all'ateneo.

-- CreateEnum
CREATE TYPE "profilo"."livello_di_corso" AS ENUM ('TRIENNALE', 'MAGISTRALE', 'CICLO_UNICO');

-- CreateTable
CREATE TABLE "profilo"."universita" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeBreve" TEXT NOT NULL,
    "citta" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "universita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profilo"."classe_di_corso" (
    "codice" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "livello" "profilo"."livello_di_corso" NOT NULL,

    CONSTRAINT "classe_di_corso_pkey" PRIMARY KEY ("codice")
);

-- CreateTable
CREATE TABLE "profilo"."corso" (
    "id" TEXT NOT NULL,
    "universitaId" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "classeCodice" TEXT NOT NULL,
    "durataAnni" INTEGER NOT NULL,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "universita_slug_key" ON "profilo"."universita"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "universita_nome_key" ON "profilo"."universita"("nome");

-- CreateIndex
CREATE INDEX "corso_universitaId_nome_idx" ON "profilo"."corso"("universitaId", "nome");

-- CreateIndex
CREATE INDEX "corso_classeCodice_idx" ON "profilo"."corso"("classeCodice");

-- CreateIndex
CREATE UNIQUE INDEX "corso_universitaId_codice_key" ON "profilo"."corso"("universitaId", "codice");

-- AddForeignKey
ALTER TABLE "profilo"."corso" ADD CONSTRAINT "corso_universitaId_fkey" FOREIGN KEY ("universitaId") REFERENCES "profilo"."universita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profilo"."corso" ADD CONSTRAINT "corso_classeCodice_fkey" FOREIGN KEY ("classeCodice") REFERENCES "profilo"."classe_di_corso"("codice") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
-- Tabula rasa sui profili: le due stringhe libere non sono rimappabili su un
-- catalogo che a questo punto è ancora vuoto (la semina gira dopo), e un
-- profilo che si dichiara completo senza corso non vedrebbe più nulla di
-- riservato all'ateneo senza sapere perché. Chi rientra ricompila i quattro
-- dati: sono pochi account, ed è l'unico modo di non lasciare dati a metà.
ALTER TABLE "profilo"."profilo" DROP COLUMN "corso",
DROP COLUMN "universita",
ADD COLUMN     "corsoId" TEXT;

-- CreateIndex
CREATE INDEX "profilo_corsoId_idx" ON "profilo"."profilo"("corsoId");

-- AddForeignKey
ALTER TABLE "profilo"."profilo" ADD CONSTRAINT "profilo_corsoId_fkey" FOREIGN KEY ("corsoId") REFERENCES "profilo"."corso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "profilo"."profilo" SET "onboardingCompletato" = false;

-- Gli spazi riservati all'ateneo tornano privati.
--
-- L'ateneo congelato era un nome e diventa un identificativo: quei nomi non si
-- possono risolvere qui, e uno spazio con visibilità ATENEO e ateneo nullo è
-- visibile **a nessuno**, in silenzio — è il difetto che apps/api/CLAUDE.md
-- descrive per gli spazi nati privati, con il segno peggiore. Una restrizione
-- dichiarata è preferibile a una visibilità che non si può più risolvere: chi
-- li ha creati può riaprirli all'ateneo dopo aver rifatto l'onboarding.
UPDATE "aula_studio"."aula_studio" SET "visibilita" = 'PRIVATO' WHERE "visibilita" = 'ATENEO';
UPDATE "gruppo"."gruppo" SET "visibilita" = 'PRIVATO' WHERE "visibilita" = 'ATENEO';

-- AlterTable
ALTER TABLE "aula_studio"."aula_studio" DROP COLUMN "ateneo",
ADD COLUMN     "ateneoId" TEXT;

-- AlterTable
ALTER TABLE "gruppo"."gruppo" DROP COLUMN "ateneo",
ADD COLUMN     "ateneoId" TEXT;
