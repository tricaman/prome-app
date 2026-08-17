-- CreateTable
CREATE TABLE "aula_studio"."materiale_salvato" (
    "utenteId" TEXT NOT NULL,
    "materialeId" TEXT NOT NULL,
    "salvatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiale_salvato_pkey" PRIMARY KEY ("utenteId","materialeId")
);

-- CreateIndex
CREATE INDEX "materiale_salvato_utenteId_salvatoIl_idx" ON "aula_studio"."materiale_salvato"("utenteId", "salvatoIl" DESC);

-- AddForeignKey
ALTER TABLE "aula_studio"."materiale_salvato" ADD CONSTRAINT "materiale_salvato_materialeId_fkey" FOREIGN KEY ("materialeId") REFERENCES "aula_studio"."allegato_di_aula_studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
