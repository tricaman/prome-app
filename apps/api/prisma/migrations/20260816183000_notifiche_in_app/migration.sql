-- CreateEnum
CREATE TYPE "profilo"."tipo_di_notifica" AS ENUM ('COMMENTO', 'INVITO_AULA', 'INVITO_GRUPPO');

-- CreateEnum
CREATE TYPE "profilo"."risorsa_di_notifica" AS ENUM ('POST', 'INVITO_AULA', 'INVITO_GRUPPO');

-- CreateTable
CREATE TABLE "profilo"."notifica" (
    "id" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "tipo" "profilo"."tipo_di_notifica" NOT NULL,
    "risorsaTipo" "profilo"."risorsa_di_notifica" NOT NULL,
    "risorsaId" TEXT NOT NULL,
    "chiaveDeduplicazione" TEXT NOT NULL,
    "lettaIl" TIMESTAMP(3),
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifica_destinatarioId_creatoIl_idx" ON "profilo"."notifica"("destinatarioId", "creatoIl");

-- CreateIndex
CREATE INDEX "notifica_destinatarioId_lettaIl_idx" ON "profilo"."notifica"("destinatarioId", "lettaIl");

-- CreateIndex
CREATE UNIQUE INDEX "notifica_destinatarioId_chiaveDeduplicazione_key" ON "profilo"."notifica"("destinatarioId", "chiaveDeduplicazione");

-- AddForeignKey
ALTER TABLE "profilo"."notifica" ADD CONSTRAINT "notifica_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "profilo"."profilo"("utenteId") ON DELETE CASCADE ON UPDATE CASCADE;
