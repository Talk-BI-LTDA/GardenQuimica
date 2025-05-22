// components/forms/cotacao/ProdutoVendaForm.tsx
"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import { formatCurrency } from "@/lib/utils";
import type { Produto } from "@/types/venda-tipos";
import type { StatusCotacao } from "@/types/cotacao-tipos";

// Lista de medidas
const medidasOptions = ["Litro", "Kg"];

// Lista de produtos para seleção
const productOptions = [
  "Ácido Esteárico Dupla Pressão Vegetal (Garden AE D - Vegetal)",
  "Ácido Esteárico Dupla Pressão Animal (Garden AE T)",
  "Ácido Esteárico Tripla Pressão Vegetal (Garden AE T - Vegetal)",
  "Ácido Esteárico Tripla Pressão Animal (Garden AE T)",
  "Ácido Glioxílico",
  "Ácido Sulfônico 90 (Garden Pon LAS 90)",
  "Álcool Cereais (Garden Alc Cereais)",
  "Álcool Cetílico",
  "Álcool Ceto Estearílico 30/70",
  "Álcool Ceto Etoxilado (Garden ACE - 200F)",
  "Álcool Etílico Anidro 99 (Garden Alc 99)",
  "Álcool Etílico Hidratado 96 (Garden Alc 96)",
  "Álcool Polivinílico (Garden APV Pó)",
  "Amida 60 (Garden MID DC 60)",
  "Amida 80 (Garden MID DC 80)",
  "Amida 90 (Garden MID DC 90)",
  "Base Amaciante (Garden Quat)",
  "Base Amaciante (Garden Quat Plus)",
  "Base Perolada (Garden Pon BP)",
  "Betaína 30% (Garden Ampho CB Plus)",
  "Cloreto de Sódio Micronizado sem Iodo",
  "Conservante Cosméticos (Garden CC20)",
  "D-Pantenol - Vitamina B5",
  "EDTA Dissídico",
  "Espessante Sintético (Garden Pon APV)",
  "Formol Inibido 37%",
  "Glicerina Bi Destilada Grau USP",
  "Lauril 27% (Garden Pon LESS 27)",
  "Lauril Éter Sulfato de Sódio 70% (Garden Pon LESS 70)",
  "Lauril Éter Sulfossuccinato de Sódio (Garden Pon SGC)",
  "Massa de Vela (Garden MV)",
  "Adicionar Produto não catalogado...",
  "Óleo Mineral",
  "MYRJ",
  "Poliquaternium 7",
  "Substituto da Trietanolamina (ALC 85)",
  "Monoetilenoglicol",
  "Quaternário 16-50 e 16-29",
  "Renex"
];


interface ProdutoVendaFormProps {
  currentProduto: Produto;
  handleChangeProduto: (field: keyof Produto, value: string | number) => void;
  handleAddProdutoVenda: () => void;
  statusCotacao: StatusCotacao;
  temObjecao: boolean;
  setTemObjecao: (value: boolean) => void;
  setShowProdutoNaoCatalogadoDialog: (value: boolean) => void;
}

export function ProdutoVendaForm({
  currentProduto,
  handleChangeProduto,
  handleAddProdutoVenda,
  temObjecao,
  setTemObjecao,
  setShowProdutoNaoCatalogadoDialog,
}: ProdutoVendaFormProps) {
  const [produtoSearchTerm, setProdutoSearchTerm] = useState<string>("");
  const selectProdutoRef = useRef<HTMLInputElement>(null);

  // Filtrar produtos baseado na busca
  const filteredProducts = productOptions.filter((product) =>
    product.toLowerCase().includes(produtoSearchTerm.toLowerCase())
  );

  const handleProductSelect = (value: string) => {
    if (value === "Adicionar Produto não catalogado...") {
      setShowProdutoNaoCatalogadoDialog(true);
      return;
    }
    handleChangeProduto("nome", value);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between gap-4">
            <div className="w-full">
              <FormLabel className="mb-1">Nome*</FormLabel>
              <Select
                value={currentProduto.nome}
                onValueChange={handleProductSelect}
              >
                <SelectTrigger className="">
                  <SelectValue placeholder="Produto" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-3 py-2">
                    <Input
                      placeholder="Buscar produto..."
                      value={produtoSearchTerm}
                      onChange={(e) => setProdutoSearchTerm(e.target.value)}
                      ref={selectProdutoRef}
                      className="mb-2"
                    />
                  </div>
                  {filteredProducts.map((produto) => (
                    <SelectItem key={produto} value={produto}>
                      {produto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-1/2">
              <FormLabel className="mb-1">Medida*</FormLabel>
              <Select
                value={currentProduto.medida}
                onValueChange={(value) => handleChangeProduto("medida", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Medida" />
                </SelectTrigger>
                <SelectContent>
                  {medidasOptions.map((medida) => (
                    <SelectItem key={medida} value={medida}>
                      {medida}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between gap-4">
            <div className="w-1/3">
              <FormLabel className="mb-1">Quantidade*</FormLabel>
              <Input
                type="number"
                min="1"
                value={currentProduto.quantidade || ""}
                onChange={(e) =>
                  handleChangeProduto("quantidade", Number(e.target.value))
                }
                className="w-full"
              />
            </div>

            <div className="w-1/3">
              <FormLabel className="mb-1">Valor*</FormLabel>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-500">R$</span>
                <Input
                  className="px-8 h-10 rounded-md border border-input bg-background w-full"
                  value={
                    currentProduto.valor === 0
                      ? "0,00"
                      : formatCurrency(
                          Math.round(
                            (currentProduto.valor || 0) * 100
                          ).toString()
                        )
                  }
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, "");

                    // Trata explicitamente o zero
                    if (rawValue === "" || rawValue === "0") {
                      handleChangeProduto("valor", 0);
                      return;
                    }

                    const numValue = parseInt(rawValue, 10) / 100;
                    handleChangeProduto("valor", numValue);
                  }}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="w-1/3">
              <FormLabel className="mb-1">Comissão (%)</FormLabel>
              <div className="relative flex items-center">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={currentProduto.comissao || ""}
                  onChange={(e) =>
                    handleChangeProduto("comissao", Number(e.target.value))
                  }
                  className="pr-8 w-full"
                  placeholder="0.00"
                />
                <span className="absolute right-3 text-gray-500">%</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-4">
            <div className="w-1/2">
              <FormLabel className="mb-1">ICMS (%)</FormLabel>
              <div className="relative flex items-center">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={currentProduto.icms || ""}
                  onChange={(e) =>
                    handleChangeProduto("icms", Number(e.target.value))
                  }
                  className="pr-8 w-full"
                  placeholder="0.00"
                />
                <span className="absolute right-3 text-gray-500">%</span>
              </div>
            </div>

            <div className="w-1/2">
              <FormLabel className="mb-1">IPI (%)</FormLabel>
              <div className="relative flex items-center">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={currentProduto.ipi || ""}
                  onChange={(e) =>
                    handleChangeProduto("ipi", Number(e.target.value))
                  }
                  className="pr-8 w-full"
                  placeholder="0.00"
                />
                <span className="absolute right-3 text-gray-500">%</span>
              </div>
            </div>
          </div>

          {/* Opção para adicionar objeção individual ao produto */}
          <div className="flex items-center mt-2">
            <Checkbox
              id="tem-objecao"
              className="mr-2"
              checked={temObjecao}
              onCheckedChange={(checked) => {
                setTemObjecao(checked === true);
              }}
            />
            <label
              htmlFor="tem-objecao"
              className="text-sm cursor-pointer flex items-center"
            >
              <span>Produto com objeção</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 ml-1 cursor-help text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Marque esta opção quando o cliente realizou a compra, mas
                      com alguma objeção específica para este produto.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button type="button" onClick={handleAddProdutoVenda}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Produto
            </Button>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
