// types/cliente.ts

export interface Cliente {
  id: string;
  nome: string;
  segmento: string;
  cnpj: string;
  razaoSocial?: string;
  valorTotal: number;
  valorMedio: number;
  ultimaCompra: Date | null;
  quantidadeVendas: number;
  recorrente: boolean;
  produtoMaisComprado?: string;
  dataCadastro: Date;
  freqCompra?: number;
  maiorValor: number;
  diasDesdeUltimaCompra: number;
  score: number;
whatsapp?: string;
  origem: string;
  user_ns?: string;
  email?: string;
  EtiquetaCliente?: { id: string; nome: string }[];
}

// Tipo para representar filtros de clientes
export interface ClienteFiltros {
  recorrencia: "todos" | "recorrentes" | "naoRecorrentes";
  dataInicio?: Date;
  dataFim?: Date;
  segmento?: string;
  classificacao?: string[];
  searchTerm?: string;
  ordenacao: {
    campo: keyof Cliente;
    ordem: "asc" | "desc";
  };
  itensPorPagina?: number;
  pagina: number;
}

// Tipo para representar parâmetros de criação/edição de clientes
export interface ClienteParams {
  whatsapp?: string;
  nome: string;
  segmento: string;
  cnpj: string;
  razaoSocial?: string;
  email?: string;
  origem?: string;
  user_ns?: string;
}

// Tipo para representar estatísticas gerais de clientes
export interface EstatisticasClientes {
  totalClientes: number;
  clientesRecorrentes: number;
  clientesNaoRecorrentes: number;
  valorTotal: number;
  valorMedio: number;
  clientesMaisValiosos: {
    id: string;
    nome: string;
    valorTotal: number;
  }[];
  segmentos: {
    nome: string;
    quantidadeClientes: number;
    valorTotal: number;
  }[];
  clientesInativos: number;
  frequenciaMedia: number;
  clientesNovos30Dias: number;
}

// Tipo para representar uma venda
export interface Venda {
  id: string;
  codigo: string;
  data: Date;
  clienteId: string;
  clienteNome: string;
  vendedorNome: string;
  cnpj: string;
  valorTotal: number;
  status: "aprovada" | "pendente" | "recusada";
  produtos: {
    id: string;
    nome: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }[];
}
