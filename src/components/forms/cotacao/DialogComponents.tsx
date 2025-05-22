// components/forms/cotacao/DialogComponents.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// Define os tipos mais específicos
interface ProdutoNaoCatalogadoData {
  nome: string;
  medida: string;
  quantidade?: number;
  valor?: number;
  comissao?: number;
  icms?: number;
  ipi?: number;
  objecao?: string | null;
}

interface RecorrenciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nomeRecorrencia: string;
  setNomeRecorrencia: (nome: string) => void;
  onSubmit: () => void;
}

export function RecorrenciaDialog({
  open,
  onOpenChange,
  nomeRecorrencia,
  setNomeRecorrencia,
  onSubmit
}: RecorrenciaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nomeie este cliente recorrente</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-500 mb-4">
            Digite um nome para identificar este cliente recorrente para
            futuras vendas.
          </p>
          <Input
            value={nomeRecorrencia}
            onChange={(e) => setNomeRecorrencia(e.target.value)}
            placeholder="Ex: Cliente A - Mensal"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button onClick={onSubmit}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProdutoNaoCatalogadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtoNaoCatalogado: ProdutoNaoCatalogadoData;
  medidasOptions: string[];
  setProdutoNaoCatalogado: (produto: ProdutoNaoCatalogadoData) => void;
  onSave: () => void;
}

export function ProdutoNaoCatalogadoDialog({
  open,
  onOpenChange,
  produtoNaoCatalogado,
  medidasOptions,
  setProdutoNaoCatalogado,
  onSave
}: ProdutoNaoCatalogadoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar produto não catalogado</DialogTitle>
          <DialogDescription>
            Preencha os dados do produto que não está na lista de produtos catalogados.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <FormLabel>Nome do Produto*</FormLabel>
            <Input
              value={produtoNaoCatalogado.nome}
              onChange={(e) => setProdutoNaoCatalogado({
                ...produtoNaoCatalogado, 
                nome: e.target.value
              })}
              placeholder="Nome do produto"
            />
          </div>
          <div>
            <FormLabel>Medida*</FormLabel>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={produtoNaoCatalogado.medida}
              onChange={(e) => setProdutoNaoCatalogado({
                ...produtoNaoCatalogado,
                medida: e.target.value
              })}
            >
              {medidasOptions.map((medida) => (
                <option key={medida} value={medida}>
                  {medida}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button onClick={onSave}>
            Adicionar Produto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ObjecaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentObjecao: string | null;
  setCurrentObjecao: (objecao: string | null) => void;
  objOptions: string[];
  onSave: () => void;
}

export function ObjecaoDialog({
  open,
  onOpenChange,
  currentObjecao,
  setCurrentObjecao,
  objOptions,
  onSave
}: ObjecaoDialogProps) {
  const [customObjecao, setCustomObjecao] = useState<string>("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar objeção ao produto</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-500 mb-4">
            Selecione ou digite uma objeção para este produto específico.
          </p>
          <div className="space-y-4">
            <div>
              <FormLabel>Objeção</FormLabel>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={currentObjecao || ""}
                onChange={(e) => {
                  if (e.target.value === "Outro") {
                    setCurrentObjecao("");
                    setCustomObjecao("");
                  } else {
                    setCurrentObjecao(e.target.value);
                  }
                }}
              >
                <option value="">Selecione uma objeção</option>
                {objOptions.map((obj) => (
                  <option key={obj} value={obj}>{obj}</option>
                ))}
              </select>
            </div>
            
            {currentObjecao === "Outro" && (
              <div>
                <FormLabel>Descreva a objeção</FormLabel>
                <Input
                  value={customObjecao}
                  onChange={(e) => {
                    setCustomObjecao(e.target.value);
                    setCurrentObjecao(e.target.value);
                  }}
                  placeholder="Digite a objeção personalizada"
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button onClick={onSave}>
            Salvar Objeção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}