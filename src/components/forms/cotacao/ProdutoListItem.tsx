// components/forms/cotacao/ProdutoListItemTipado.tsx
"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatarValorBRL } from "@/lib/utils";
import { ProdutoComId } from "@/types/venda-tipos";

type ObjecaoIndividual = {
  produtoId: string;
  objecao: string | null;
  tipoObjecao: string;
};

interface ProdutoListItemProps {
  produto: ProdutoComId;
  index: number;
  realIndex: number;
  handleRemoveProduto: (index: number) => void;
  handleAddObjecaoIndividual: (produtoId: string) => void;
  objecoesIndividuais: ObjecaoIndividual[];
  allowObjecao: boolean;
}

export function ProdutoListItemTipado({
  produto,
  index,
  realIndex,
  handleRemoveProduto,
  handleAddObjecaoIndividual,
  objecoesIndividuais,
  allowObjecao
}: ProdutoListItemProps) {
  // Verificar se o produto tem objeção
  const temObjecao = objecoesIndividuais.some(
    obj => obj.produtoId === produto.id
  );
  
  const objecaoText = temObjecao 
    ? objecoesIndividuais.find(obj => obj.produtoId === produto.id)?.objecao 
    : null;

  return (
    <motion.div
      key={produto.id || index}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="mb-3">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div>
                <p className="font-medium">
                  {produto.nome}
                </p>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span>
                    {produto.quantidade} {produto.medida}
                  </span>
                  <span>
                    {formatarValorBRL(produto.valor * produto.quantidade)}
                  </span>
                  {produto.comissao !== undefined && produto.comissao > 0 && (
                    <span className="flex items-center">
                      {produto.comissao.toFixed(2)}%
                    </span>
                  )}
                  {produto.icms !== undefined && produto.icms > 0 && (
                    <span>
                      ICMS: {produto.icms.toFixed(2)}%
                    </span>
                  )}
                  {produto.ipi !== undefined && produto.ipi > 0 && (
                    <span>
                      IPI: {produto.ipi.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {allowObjecao && (
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => handleAddObjecaoIndividual(produto.id || "")}
                  className="text-orange-500"
                >
                  <AlertCircle className="h-4 w-4" />
                </Button>
              )}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => handleRemoveProduto(realIndex)}
                >
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </Button>
              </motion.div>
            </div>
          </div>
          
          {/* Mostrar objeção se existir */}
          {temObjecao && objecaoText && (
            <div className="mt-2 pt-2 border-t border-orange-200 bg-orange-50 px-3 py-2 rounded-md">
              <p className="text-sm text-orange-800 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="font-medium">Objeção:</span> {objecaoText}
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}