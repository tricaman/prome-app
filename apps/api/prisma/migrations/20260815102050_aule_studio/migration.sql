-- CreateEnum
CREATE TYPE "aula_studio"."visibilita_aula_studio" AS ENUM ('PRIVATO', 'ATENEO', 'PUBBLICO');

-- CreateEnum
CREATE TYPE "aula_studio"."tipo_allegato_aula_studio" AS ENUM ('PDF', 'IMMAGINE', 'TESTO');

-- CreateEnum
CREATE TYPE "aula_studio"."stato_invito" AS ENUM ('IN_ATTESA', 'ACCETTATO', 'SCADUTO');

-- CreateTable
CREATE TABLE "aula_studio"."aula_studio" (
    "id" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "visibilita" "aula_studio"."visibilita_aula_studio" NOT NULL DEFAULT 'PRIVATO',
    "ateneo" TEXT,
    "dataOraInizio" TIMESTAMP(3),
    "gruppoId" TEXT,
    "versione" INTEGER NOT NULL DEFAULT 0,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aula_studio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aula_studio"."partecipante" (
    "aulaStudioId" TEXT NOT NULL,
    "utenteId" TEXT NOT NULL,
    "moderatore" BOOLEAN NOT NULL DEFAULT false,
    "parlare" BOOLEAN NOT NULL DEFAULT false,
    "scrivere" BOOLEAN NOT NULL DEFAULT false,
    "caricare" BOOLEAN NOT NULL DEFAULT false,
    "ammessoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partecipante_pkey" PRIMARY KEY ("aulaStudioId","utenteId")
);

-- CreateTable
CREATE TABLE "aula_studio"."argomento" (
    "id" TEXT NOT NULL,
    "aulaStudioId" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "testo" TEXT,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "argomento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aula_studio"."allegato_di_aula_studio" (
    "id" TEXT NOT NULL,
    "aulaStudioId" TEXT NOT NULL,
    "argomentoId" TEXT,
    "caricatoDa" TEXT NOT NULL,
    "chiave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "aula_studio"."tipo_allegato_aula_studio" NOT NULL,
    "dimensione" INTEGER NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allegato_di_aula_studio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aula_studio"."invito" (
    "id" TEXT NOT NULL,
    "aulaStudioId" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "invitatoDa" TEXT NOT NULL,
    "stato" "aula_studio"."stato_invito" NOT NULL DEFAULT 'IN_ATTESA',
    "scadeIl" TIMESTAMP(3) NOT NULL,
    "emessoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chiusoIl" TIMESTAMP(3),
    "accettatoDa" TEXT,

    CONSTRAINT "invito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aula_studio"."fatto_in_uscita" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "aggregatoId" TEXT NOT NULL,
    "versione" INTEGER NOT NULL DEFAULT 1,
    "accadutoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "consegnatoIl" TIMESTAMP(3),
    "tentativi" INTEGER NOT NULL DEFAULT 0,
    "prossimoTentativoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nonConsegnabileIl" TIMESTAMP(3),

    CONSTRAINT "fatto_in_uscita_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aula_studio_creatoIl_idx" ON "aula_studio"."aula_studio"("creatoIl" DESC);

-- CreateIndex
CREATE INDEX "aula_studio_gruppoId_idx" ON "aula_studio"."aula_studio"("gruppoId");

-- CreateIndex
CREATE INDEX "partecipante_utenteId_idx" ON "aula_studio"."partecipante"("utenteId");

-- CreateIndex
CREATE INDEX "argomento_aulaStudioId_creatoIl_idx" ON "aula_studio"."argomento"("aulaStudioId", "creatoIl");

-- CreateIndex
CREATE UNIQUE INDEX "allegato_di_aula_studio_chiave_key" ON "aula_studio"."allegato_di_aula_studio"("chiave");

-- CreateIndex
CREATE INDEX "allegato_di_aula_studio_aulaStudioId_creatoIl_idx" ON "aula_studio"."allegato_di_aula_studio"("aulaStudioId", "creatoIl");

-- CreateIndex
CREATE INDEX "allegato_di_aula_studio_argomentoId_idx" ON "aula_studio"."allegato_di_aula_studio"("argomentoId");

-- CreateIndex
CREATE INDEX "allegato_di_aula_studio_caricatoDa_idx" ON "aula_studio"."allegato_di_aula_studio"("caricatoDa");

-- CreateIndex
CREATE INDEX "invito_aulaStudioId_idx" ON "aula_studio"."invito"("aulaStudioId");

-- CreateIndex
CREATE INDEX "invito_destinatario_idx" ON "aula_studio"."invito"("destinatario");

-- CreateIndex
CREATE INDEX "invito_stato_scadeIl_idx" ON "aula_studio"."invito"("stato", "scadeIl");

-- CreateIndex
CREATE INDEX "fatto_in_uscita_consegnatoIl_prossimoTentativoIl_idx" ON "aula_studio"."fatto_in_uscita"("consegnatoIl", "prossimoTentativoIl");

-- CreateIndex
CREATE INDEX "fatto_in_uscita_accadutoIl_idx" ON "aula_studio"."fatto_in_uscita"("accadutoIl");

-- AddForeignKey
ALTER TABLE "aula_studio"."partecipante" ADD CONSTRAINT "partecipante_aulaStudioId_fkey" FOREIGN KEY ("aulaStudioId") REFERENCES "aula_studio"."aula_studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
