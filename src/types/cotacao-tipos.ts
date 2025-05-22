// @/types/cotacao-tipos.ts
import { Cliente } from './venda';

export type StatusCotacao = "pendente" | "finalizada" | "cancelada";

export interface CotacaoBase {
  id?: string;
  clienteId: string;
  valorTotal: number;
  condicaoPagamento: string;
  vendaRecorrente: boolean;
  nomeRecorrencia?: string;
  status: StatusCotacao;
}

export interface CotacaoFormData {
  cliente: {
    nome: string;
    segmento: string;
    cnpj: string;
    razaoSocial?: string;
  };
  produtos: {
    nome: string;
    medida: string;
    quantidade: number;
    valor: number;
    comissao?: number;
    icms?: number;
    ipi?: number;
  }[];
  valorTotal: number;
  condicaoPagamento: string;
  vendaRecorrente: boolean;
  nomeRecorrencia?: string;
  status?: StatusCotacao;
}

export type ProdutoCotacao = {
  id?: string;
  nome: string;
  medida: string;
  quantidade: number;
  valor: number;
  comissao?: number;
  icms?: number;
  ipi?: number;
};

export type Cotacao = {
  id: string;
  codigoCotacao: string;
  cliente: Cliente;
  produtos: ProdutoCotacao[];
  valorTotal: number;
  condicaoPagamento: string;
  vendaRecorrente: boolean;
  nomeRecorrencia?: string;
  status: StatusCotacao;
  vendedorId: string;
  vendedorNome: string;
  createdAt: Date;
  updatedAt: Date;
  editedById?: string;
};