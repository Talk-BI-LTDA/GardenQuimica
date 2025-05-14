-- CreateTable
CREATE TABLE "CatalogoProduto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "CatalogoProduto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoMedida" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "CatalogoMedida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoRecorrencia" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "CatalogoRecorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoSegmento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "CatalogoSegmento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoPagamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "CatalogoPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoObjecao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "CatalogoObjecao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoProduto_nome_key" ON "CatalogoProduto"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoMedida_nome_key" ON "CatalogoMedida"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoRecorrencia_nome_key" ON "CatalogoRecorrencia"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoSegmento_nome_key" ON "CatalogoSegmento"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoPagamento_nome_key" ON "CatalogoPagamento"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoObjecao_nome_key" ON "CatalogoObjecao"("nome");

-- AddForeignKey
ALTER TABLE "CatalogoProduto" ADD CONSTRAINT "CatalogoProduto_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoMedida" ADD CONSTRAINT "CatalogoMedida_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoRecorrencia" ADD CONSTRAINT "CatalogoRecorrencia_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoSegmento" ADD CONSTRAINT "CatalogoSegmento_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoPagamento" ADD CONSTRAINT "CatalogoPagamento_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoObjecao" ADD CONSTRAINT "CatalogoObjecao_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
