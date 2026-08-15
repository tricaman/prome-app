-- CreateEnum
CREATE TYPE "gruppo"."visibilita_gruppo" AS ENUM ('PRIVATO', 'ATENEO', 'PUBBLICO');

-- CreateEnum
CREATE TYPE "gruppo"."stato_invito_al_gruppo" AS ENUM ('IN_ATTESA', 'ACCETTATO', 'SCADUTO');

-- CreateTable
CREATE TABLE "gruppo"."gruppo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "visibilita" "gruppo"."visibilita_gruppo" NOT NULL DEFAULT 'PRIVATO',
    "ateneo" TEXT,
    "creatoDa" TEXT NOT NULL,
    "versione" INTEGER NOT NULL DEFAULT 0,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gruppo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gruppo"."membro" (
    "gruppoId" TEXT NOT NULL,
    "utenteId" TEXT NOT NULL,
    "moderatore" BOOLEAN NOT NULL DEFAULT false,
    "entratoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membro_pkey" PRIMARY KEY ("gruppoId","utenteId")
);

-- CreateTable
CREATE TABLE "gruppo"."invito_al_gruppo" (
    "id" TEXT NOT NULL,
    "gruppoId" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "invitatoDa" TEXT NOT NULL,
    "stato" "gruppo"."stato_invito_al_gruppo" NOT NULL DEFAULT 'IN_ATTESA',
    "scadeIl" TIMESTAMP(3) NOT NULL,
    "emessoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chiusoIl" TIMESTAMP(3),
    "accettatoDa" TEXT,

    CONSTRAINT "invito_al_gruppo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gruppo"."fatto_in_uscita" (
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
CREATE INDEX "gruppo_creatoIl_idx" ON "gruppo"."gruppo"("creatoIl" DESC);

-- CreateIndex
CREATE INDEX "membro_utenteId_idx" ON "gruppo"."membro"("utenteId");

-- CreateIndex
CREATE INDEX "invito_al_gruppo_gruppoId_idx" ON "gruppo"."invito_al_gruppo"("gruppoId");

-- CreateIndex
CREATE INDEX "invito_al_gruppo_destinatario_idx" ON "gruppo"."invito_al_gruppo"("destinatario");

-- CreateIndex
CREATE INDEX "invito_al_gruppo_stato_scadeIl_idx" ON "gruppo"."invito_al_gruppo"("stato", "scadeIl");

-- CreateIndex
CREATE INDEX "fatto_in_uscita_consegnatoIl_prossimoTentativoIl_idx" ON "gruppo"."fatto_in_uscita"("consegnatoIl", "prossimoTentativoIl");

-- CreateIndex
CREATE INDEX "fatto_in_uscita_accadutoIl_idx" ON "gruppo"."fatto_in_uscita"("accadutoIl");

-- AddForeignKey
ALTER TABLE "gruppo"."membro" ADD CONSTRAINT "membro_gruppoId_fkey" FOREIGN KEY ("gruppoId") REFERENCES "gruppo"."gruppo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
