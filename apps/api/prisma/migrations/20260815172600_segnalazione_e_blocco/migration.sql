-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "segnalazione";

-- CreateEnum
CREATE TYPE "segnalazione"."tipo_di_soggetto_segnalato" AS ENUM ('POST', 'COMMENTO');

-- CreateEnum
CREATE TYPE "segnalazione"."motivo_di_segnalazione" AS ENUM ('SPAM', 'MOLESTIE', 'CONTENUTO_INAPPROPRIATO');

-- AlterTable
ALTER TABLE "cancellazione"."richiesta_di_cancellazione" ADD COLUMN     "segnalazioniEliminateIl" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "profilo"."blocco" (
    "bloccanteId" TEXT NOT NULL,
    "bloccatoId" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocco_pkey" PRIMARY KEY ("bloccanteId","bloccatoId")
);

-- CreateTable
CREATE TABLE "segnalazione"."segnalazione" (
    "id" TEXT NOT NULL,
    "segnalanteId" TEXT NOT NULL,
    "tipo" "segnalazione"."tipo_di_soggetto_segnalato" NOT NULL,
    "soggettoId" TEXT NOT NULL,
    "motivo" "segnalazione"."motivo_di_segnalazione" NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segnalazione_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blocco_bloccatoId_idx" ON "profilo"."blocco"("bloccatoId");

-- CreateIndex
CREATE INDEX "segnalazione_creatoIl_idx" ON "segnalazione"."segnalazione"("creatoIl");

-- CreateIndex
CREATE UNIQUE INDEX "segnalazione_segnalanteId_tipo_soggettoId_key" ON "segnalazione"."segnalazione"("segnalanteId", "tipo", "soggettoId");

-- AddForeignKey
ALTER TABLE "profilo"."blocco" ADD CONSTRAINT "blocco_bloccanteId_fkey" FOREIGN KEY ("bloccanteId") REFERENCES "profilo"."profilo"("utenteId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profilo"."blocco" ADD CONSTRAINT "blocco_bloccatoId_fkey" FOREIGN KEY ("bloccatoId") REFERENCES "profilo"."profilo"("utenteId") ON DELETE CASCADE ON UPDATE CASCADE;
