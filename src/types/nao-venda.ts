// src/types/nao-venda.ts
import { Cliente, Produto } from '@/types/venda';

export type ProdutoConcorrencia = {
  produtoGarden: Produto;
  valorConcorrencia: number;
  nomeConcorrencia: string;
  icms?: number | null;
  ipi?: number | null;
  objecao?: string | null;
  infoNaoDisponivel?: boolean;
};

export type NaoVenda = {
  id?: string;
  codigoVenda: string;
  cliente: Cliente;
  produtosConcorrencia: ProdutoConcorrencia[];
  valorTotal: number;
  condicaoPagamento: string;
  objecaoGeral?: string | null;
  vendedorId: string;
  vendedorNome: string;
  createdAt: Date;
  updatedAt: Date;
  editedById?: string;
};

export type NaoVendaFormData = {
  cliente: Cliente;
  produtosConcorrencia: ProdutoConcorrencia[];
  valorTotal: number;
  condicaoPagamento: string;
  objecaoGeral?: string | null;
};