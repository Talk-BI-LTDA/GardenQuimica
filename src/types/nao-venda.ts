// src/types/nao-venda.ts
import { Cliente, Produto } from '@/types/venda';

export type ProdutoConcorrencia = {
  produtoGarden: Produto;
  valorConcorrencia: number;
  nomeConcorrencia: string;
  icms?: number | null; // Alterado para aceitar null ou undefined
  objecao?: string | null; // Alterado para aceitar null ou undefined
};

export type NaoVenda = {
  id?: string;
  codigoVenda: string;
  cliente: Cliente;
  produtosConcorrencia: ProdutoConcorrencia[];
  valorTotal: number;
  condicaoPagamento: string;
  objecaoGeral?: string | null; // Alterado para aceitar null ou undefined
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
  objecaoGeral?: string | null; // Alterado para aceitar null ou undefined
};