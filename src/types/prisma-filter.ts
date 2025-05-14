// src/types/prisma-filters.ts

// Tipos para restrições de busca no Prisma
export type DateFilter = {
    gte?: Date;
    lte?: Date;
  };
  
  export type StringFilter = {
    equals?: string;
    contains?: string;
    mode?: 'insensitive' | 'default';
    startsWith?: string;
    endsWith?: string;
  };
  
  export type NumberFilter = {
    equals?: number;
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
  };
  
  export type BooleanFilter = {
    equals?: boolean;
  };
  
  export type RelationFilter<T> = {
    some?: T;
    every?: T;
    none?: T;
  };
  
  // Cliente Filter
  export type ClienteWhereInput = {
    id?: string;
    nome?: StringFilter;
    segmento?: StringFilter;
    cnpj?: StringFilter;
    razaoSocial?: StringFilter;
    AND?: ClienteWhereInput[];
    OR?: ClienteWhereInput[];
  };
  
  // Produto Filter
  export type ProdutoWhereInput = {
    id?: string;
    nome?: StringFilter;
    medida?: StringFilter;
    AND?: ProdutoWhereInput[];
    OR?: ProdutoWhereInput[];
  };
  
  // VendaProduto Filter
  export type VendaProdutoWhereInput = {
    produtoId?: string;
    produto?: ProdutoWhereInput;
    AND?: VendaProdutoWhereInput[];
    OR?: VendaProdutoWhereInput[];
  };
  
  // NaoVendaProduto Filter
  export type NaoVendaProdutoWhereInput = {
    produtoId?: string;
    produto?: ProdutoWhereInput;
    nomeConcorrencia?: StringFilter;
    valorConcorrencia?: NumberFilter;
    AND?: NaoVendaProdutoWhereInput[];
    OR?: NaoVendaProdutoWhereInput[];
  };
  
  // Venda Filter
  export type VendaWhereInput = {
    id?: string;
    vendedorId?: string;
    clienteId?: string;
    cliente?: ClienteWhereInput;
    codigoVenda?: StringFilter;
    createdAt?: DateFilter;
    updatedAt?: DateFilter;
    valorTotal?: NumberFilter;
    condicaoPagamento?: StringFilter;
    vendaRecorrente?: BooleanFilter;
    produtos?: RelationFilter<VendaProdutoWhereInput>;
    OR?: VendaWhereInput[];
    AND?: VendaWhereInput[];
  };
  
  // NaoVenda Filter
  export type NaoVendaWhereInput = {
    id?: string;
    vendedorId?: string;
    clienteId?: string;
    cliente?: ClienteWhereInput;
    codigoVenda?: StringFilter;
    createdAt?: DateFilter;
    updatedAt?: DateFilter;
    valorTotal?: NumberFilter;
    condicaoPagamento?: StringFilter;
    objecaoGeral?: StringFilter;
    produtos?: RelationFilter<NaoVendaProdutoWhereInput>;
    OR?: NaoVendaWhereInput[];
    AND?: NaoVendaWhereInput[];
  };
  
  // User Filter
  export type UserWhereInput = {
    id?: string;
    name?: StringFilter;
    email?: StringFilter;
    role?: StringFilter;
    OR?: UserWhereInput[];
    AND?: UserWhereInput[];
  };