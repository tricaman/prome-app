-- CreateTable
CREATE TABLE "bacheca"."commento" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "autoreId" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commento_postId_creatoIl_idx" ON "bacheca"."commento"("postId", "creatoIl");

-- CreateIndex
CREATE INDEX "commento_autoreId_idx" ON "bacheca"."commento"("autoreId");
