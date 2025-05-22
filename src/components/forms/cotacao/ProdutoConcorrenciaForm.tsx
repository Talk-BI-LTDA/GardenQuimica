// components/forms/cotacao/ProdutoConcorrenciaForm.tsx
"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, ChevronDown, X, Tag } from "lucide-react";

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
import { FormLabel, FormItem, FormControl } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

import { formatCurrency } from "@/lib/utils"
import type { Produto } from "@/types/venda-tipos";
import type { ProdutoConcorrenciaTemp } from "@/types/venda-tipos";

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
];

// Lista de objeções
const objOptions = [
  "Falta de produto em estoque",
  "Prazo de entrega",
  "Preço da concorrência",
  "Logística",
  "Cliente inapto para compra",
  "Produto que não trabalhamos",
  "Outro",
];

interface ProdutoConcorrenciaFormProps {
  currentProduto: Produto;
  produtoConcorrencia: ProdutoConcorrenciaTemp;
  handleChangeProduto: (field: keyof Produto, value: string | number) => void;
  handleChangeProdutoConcorrencia: (field: keyof ProdutoConcorrenciaTemp, value: string | number | boolean | null) => void;
  handleAddProdutoNaoVenda: () => void;
  setShowProdutoNaoCatalogadoDialog: (value: boolean) => void;
}

export function ProdutoConcorrenciaForm({
  currentProduto,
  produtoConcorrencia,
  handleChangeProduto,
  handleChangeProdutoConcorrencia,
  handleAddProdutoNaoVenda,
  setShowProdutoNaoCatalogadoDialog
}: ProdutoConcorrenciaFormProps) {
  const [produtoSearchTerm, setProdutoSearchTerm] = useState<string>("");
  const [objecaoInputOpen, setObjecaoInputOpen] = useState<boolean>(false);
  const selectProdutoRef = useRef<HTMLInputElement>(null);

  // Filtrar produtos baseado na busca
  const filteredProducts = productOptions.filter(
    (product) => product.toLowerCase().includes(produtoSearchTerm.toLowerCase())
  );

  const handleProductSelect = (value: string) => {
    if (value === "Adicionar Produto não catalogado...") {
      setShowProdutoNaoCatalogadoDialog(true);
      return;
    }
    handleChangeProduto("nome", value);
  };

  // Handler para seleção de objeção
  const handleObjecaoSelect = (objValue: string) => {
    if (objValue === "Outro") {
      handleChangeProdutoConcorrencia("objecao", "");
    } else {
      handleChangeProdutoConcorrencia("objecao", objValue);
      setObjecaoInputOpen(false);
    }
  };

  // Handler para alteração manual da objeção
  const handleCustomObjecaoChange = (value: string) => {
    handleChangeProdutoConcorrencia("objecao", value);
  };

  return (
    <>
      {/* Formulário de adição de produto Garden */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-4 text-[#00446A]">
            Produto (Garden)
          </h4>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between gap-4">
              <div className="w-full">
                <FormLabel>Nome*</FormLabel>
                <Select
                  value={currentProduto.nome}
                  onValueChange={handleProductSelect}
                >
                  <SelectTrigger>
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
                <FormLabel>Medida*</FormLabel>
                <Select
                  value={currentProduto.medida}
                  onValueChange={(value) =>
                    handleChangeProduto("medida", value)
                  }
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
                <FormLabel>Quantidade*</FormLabel>
                <Input
                  type="number"
                  min="1"
                  value={currentProduto.quantidade || ""}
                  onChange={(e) =>
                    handleChangeProduto(
                      "quantidade",
                      Number(e.target.value)
                    )
                  }
                  className="w-full"
                />
              </div>

              <div className="w-1/3">
                <FormLabel>Valor*</FormLabel>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-gray-500">
                    R$
                  </span>
                  <Input
                    className="px-8 h-10 rounded-md border border-input bg-background w-full"
                    value={formatCurrency(
                      currentProduto.valor.toString()
                    )}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(
                        /\D/g,
                        ""
                      );
                      const numValue = rawValue
                        ? parseInt(rawValue, 10) / 100
                        : 0;
                      handleChangeProduto("valor", numValue);
                    }}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="w-1/3">
                <FormLabel>ICMS (%)</FormLabel>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={currentProduto.icms || ""}
                    onChange={(e) =>
                      handleChangeProduto(
                        "icms",
                        Number(e.target.value)
                      )
                    }
                    className="pr-8"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 text-gray-500">
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-4">
              <div className="w-1/2">
                <FormLabel>IPI (%)</FormLabel>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={currentProduto.ipi || ""}
                    onChange={(e) =>
                      handleChangeProduto(
                        "ipi",
                        Number(e.target.value)
                      )
                    }
                    className="pr-8"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 text-gray-500">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
      
          <div className="mt-4 flex justify-end">
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Button
                type="button"
                onClick={handleAddProdutoNaoVenda}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Comparação
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de adição de produto da concorrência */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-medium mb-4 text-red-600">
            Produto (Concorrência)
          </h4>
          
          <div className="mb-4">
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={produtoConcorrencia.infoNaoDisponivel}
                  onCheckedChange={(checked) => 
                    handleChangeProdutoConcorrencia("infoNaoDisponivel", checked === true)
                  }
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Informações da concorrência não disponíveis
                </FormLabel>
                <p className="text-xs text-gray-500">
                  Marque esta opção caso não tenha dados específicos da concorrência
                </p>
              </div>
            </FormItem>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${produtoConcorrencia.infoNaoDisponivel ? "opacity-50 pointer-events-none" : ""}`}>
            <div>
              <FormLabel>Nome da Concorrência*</FormLabel>
              <Input
                value={produtoConcorrencia.nomeConcorrencia || ""}
                onChange={(e) =>
                  handleChangeProdutoConcorrencia(
                    "nomeConcorrencia",
                    e.target.value
                  )
                }
                placeholder="Nome da empresa concorrente"
              />
            </div>

            <div>
              <FormLabel>Valor da Concorrência*</FormLabel>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-500">
                  R$
                </span>
                <Input
                  className="px-8 h-10 rounded-md border border-input bg-background w-full"
                  value={formatCurrency(
                    produtoConcorrencia.valorConcorrencia.toString()
                  )}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(
                      /\D/g,
                      ""
                    );
                    const numValue = rawValue
                      ? parseInt(rawValue, 10) / 100
                      : 0;
                    handleChangeProdutoConcorrencia("valorConcorrencia", numValue);
                  }}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <FormLabel>ICMS (%)</FormLabel>
              <div className="relative flex items-center">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={produtoConcorrencia.icms || ""}
                  onChange={(e) =>
                    handleChangeProdutoConcorrencia(
                      "icms",
                      e.target.value === ""
                        ? 0
                        : Number(e.target.value)
                    )
                  }
                  className="pr-8"
                  placeholder="0.00"
                />
                <span className="absolute right-3 text-gray-500">
                  %
                </span>
              </div>
            </div>

            <div>
              <FormLabel>IPI (%)</FormLabel>
              <div className="relative flex items-center">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={produtoConcorrencia.ipi || ""}
                  onChange={(e) =>
                    handleChangeProdutoConcorrencia(
                      "ipi",
                      e.target.value === ""
                        ? 0
                        : Number(e.target.value)
                    )
                  }
                  className="pr-8"
                  placeholder="0.00"
                />
                <span className="absolute right-3 text-gray-500">
                  %
                </span>
              </div>
            </div>

            <div className="md:col-span-2">
              <FormLabel>Objeção</FormLabel>
              <div className="relative">
                <Popover
                  open={objecaoInputOpen}
                  onOpenChange={setObjecaoInputOpen}
                >
                  <PopoverTrigger asChild>
                    <div className="flex items-center space-x-2 w-full border border-input rounded-md px-3 py-2 h-10 cursor-pointer">
                      {produtoConcorrencia.objecao ? (
                        <Badge className="px-2 py-1 bg-gray-100 text-gray-800 flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {produtoConcorrencia.objecao}
                          <X
                            className="h-3 w-3 ml-1 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChangeProdutoConcorrencia("objecao", null);
                            }}
                          />
                        </Badge>
                      ) : (
                        <span className="text-gray-500 flex-1">
                          Selecione ou digite uma objeção
                        </span>
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0">
                    <div className="py-2 px-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          Selecione uma objeção
                        </p>
                        <div className="border rounded-md">
                          <Input
                            placeholder="Buscar objeção..."
                            className="h-9"
                            onChange={() => {
                              // Implementar filtro opcional
                            }}
                          />
                        </div>
                      </div>
                      <div className="max-h-[200px] overflow-auto mt-2">
                        {objOptions.map((obj) => (
                          <div
                            key={obj}
                            onClick={() => handleObjecaoSelect(obj)}
                            className="text-sm px-2 py-1.5 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            {obj}
                          </div>
                        ))}
                      </div>
                      <div className="border-t p-2 mt-2">
                        <Input
                          placeholder="Digite uma objeção personalizada"
                          value={
                            (produtoConcorrencia.objecao as string) ||
                            ""
                          }
                          onChange={(e) =>
                            handleCustomObjecaoChange(
                              e.target.value
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setObjecaoInputOpen(false);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}