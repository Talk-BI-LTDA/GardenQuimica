// src/types/venda.ts
export type Produto = {
  id?: string;
  nome: string;
  medida: string;
  quantidade: number;
  valor: number;
  comissao?: number;
  icms?: number;
  ipi?: number;
};

export type Cliente = {
  id?: string;
  nome: string;
  segmento: string;
  cnpj: string;
  razaoSocial?: string;
};

export type Venda = {
  id?: string;
  codigoVenda: string;
  cliente: Cliente;
  produtos: Produto[];
  valorTotal: number;
  condicaoPagamento: string;
  vendaRecorrente: boolean;
  nomeRecorrencia?: string;
  vendedorId: string;
  vendedorNome: string;
  createdAt: Date;
  updatedAt: Date;
  editedById?: string;
};

export type VendaFormData = {
  cliente: Cliente;
  produtos: Produto[];
  valorTotal: number;
  condicaoPagamento: string;
  vendaRecorrente: boolean;
  nomeRecorrencia?: string;
};