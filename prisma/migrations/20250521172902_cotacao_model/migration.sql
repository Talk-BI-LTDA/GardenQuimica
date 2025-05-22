-- CreateTable
CREATE TABLE "Cotacao" (
    "id" TEXT NOT NULL,
    "codigoCotacao" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "condicaoPagamento" TEXT NOT NULL,
    "vendaRecorrente" BOOLEAN NOT NULL DEFAULT false,
    "nomeRecorrencia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "editedById" TEXT,

    CONSTRAINT "Cotacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotacaoProduto" (
    "id" TEXT NOT NULL,
    "cotacaoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "medida" TEXT NOT NULL,
    "comissao" DOUBLE PRECISION DEFAULT 0,
    "icms" DOUBLE PRECISION DEFAULT 0,
    "ipi" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "CotacaoProduto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cotacao_codigoCotacao_key" ON "Cotacao"("codigoCotacao");

-- CreateIndex
CREATE INDEX "Cotacao_createdAt_idx" ON "Cotacao"("createdAt");

-- CreateIndex
CREATE INDEX "Cotacao_vendedorId_idx" ON "Cotacao"("vendedorId");

-- CreateIndex
CREATE INDEX "CotacaoProduto_cotacaoId_idx" ON "CotacaoProduto"("cotacaoId");

-- AddForeignKey
ALTER TABLE "Cotacao" ADD CONSTRAINT "Cotacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotacao" ADD CONSTRAINT "Cotacao_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotacao" ADD CONSTRAINT "Cotacao_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotacaoProduto" ADD CONSTRAINT "CotacaoProduto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotacaoProduto" ADD CONSTRAINT "CotacaoProduto_cotacaoId_fkey" FOREIGN KEY ("cotacaoId") REFERENCES "Cotacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
