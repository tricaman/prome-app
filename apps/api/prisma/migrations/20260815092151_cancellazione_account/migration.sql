-- AlterTable
ALTER TABLE "profilo"."profilo" ADD COLUMN     "inCancellazioneDal" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "cancellazione"."richiesta_di_cancellazione" (
    "utenteId" TEXT NOT NULL,
    "richiestaIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eseguibileDal" TIMESTAMP(3) NOT NULL,
    "scadenza" TIMESTAMP(3) NOT NULL,
    "bachecaAnonimizzataIl" TIMESTAMP(3),
    "profiloEliminatoIl" TIMESTAMP(3),
    "accessoEliminatoIl" TIMESTAMP(3),
    "ultimaVerificaIl" TIMESTAMP(3),
    "ultimoResiduoRecord" INTEGER,
    "ultimoResiduoFile" INTEGER,
    "verificataATotaleIl" TIMESTAMP(3),
    "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "richiesta_di_cancellazione_pkey" PRIMARY KEY ("utenteId")
);

-- CreateIndex
CREATE INDEX "richiesta_di_cancellazione_eseguibileDal_idx" ON "cancellazione"."richiesta_di_cancellazione"("eseguibileDal");

-- CreateIndex
CREATE INDEX "richiesta_di_cancellazione_verificataATotaleIl_idx" ON "cancellazione"."richiesta_di_cancellazione"("verificataATotaleIl");
