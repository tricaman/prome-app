-- CreateEnum
CREATE TYPE "profilo"."piattaforma_di_notifica" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateTable
CREATE TABLE "profilo"."preferenze_di_notifica" (
    "utenteId" TEXT NOT NULL,
    "commenti" BOOLEAN NOT NULL DEFAULT true,
    "inviti" BOOLEAN NOT NULL DEFAULT true,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preferenze_di_notifica_pkey" PRIMARY KEY ("utenteId")
);

-- CreateTable
CREATE TABLE "profilo"."dispositivo_di_notifica" (
    "id" TEXT NOT NULL,
    "utenteId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "piattaforma" "profilo"."piattaforma_di_notifica" NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivo_di_notifica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bacheca"."fatto_in_uscita" (
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
CREATE UNIQUE INDEX "dispositivo_di_notifica_token_key" ON "profilo"."dispositivo_di_notifica"("token");

-- CreateIndex
CREATE INDEX "dispositivo_di_notifica_utenteId_idx" ON "profilo"."dispositivo_di_notifica"("utenteId");

-- CreateIndex
CREATE INDEX "fatto_in_uscita_consegnatoIl_prossimoTentativoIl_idx" ON "bacheca"."fatto_in_uscita"("consegnatoIl", "prossimoTentativoIl");

-- CreateIndex
CREATE INDEX "fatto_in_uscita_accadutoIl_idx" ON "bacheca"."fatto_in_uscita"("accadutoIl");

-- AddForeignKey
ALTER TABLE "profilo"."preferenze_di_notifica" ADD CONSTRAINT "preferenze_di_notifica_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "profilo"."profilo"("utenteId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profilo"."dispositivo_di_notifica" ADD CONSTRAINT "dispositivo_di_notifica_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "profilo"."profilo"("utenteId") ON DELETE CASCADE ON UPDATE CASCADE;
