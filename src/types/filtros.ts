// src/types/filtros.ts

export interface FiltrosBase {
    dataInicio?: string | Date;
    dataFim?: string | Date;
    searchTerm?: string;
    sortDirection?: 'asc' | 'desc';
  }
  
  export interface FiltrosVenda extends FiltrosBase {
    vendedorId?: string;
    clienteId?: string;
    segmento?: string;
    valorMinimo?: number;
    valorMaximo?: number;
    produtoId?: string;
    vendaRecorrente?: boolean;
    condicaoPagamento?: string;
  }
  
  export interface FiltrosNaoVenda extends FiltrosVenda {
    objecao?: string;
    empresaConcorrente?: string;
    valorConcorrenciaMin?: number;
    valorConcorrenciaMax?: number;
  }
  
  export interface FiltroPeriodo {
    label: string;
    value: string;
    dataInicio: Date;
    dataFim: Date;
  }
  
  export const periodosPreDefinidos: FiltroPeriodo[] = [
    {
      label: 'Hoje',
      value: 'hoje',
      dataInicio: new Date(new Date().setHours(0, 0, 0, 0)),
      dataFim: new Date(new Date().setHours(23, 59, 59, 999))
    },
    {
      label: 'Últimos 7 dias',
      value: 'ultimos7dias',
      dataInicio: new Date(new Date().setDate(new Date().getDate() - 7)),
      dataFim: new Date()
    },
    {
      label: 'Últimos 30 dias',
      value: 'ultimos30dias',
      dataInicio: new Date(new Date().setDate(new Date().getDate() - 30)),
      dataFim: new Date()
    },
    {
      label: 'Este mês',
      value: 'esteMes',
      dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      dataFim: new Date()
    },
    {
      label: 'Mês passado',
      value: 'mesPassado',
      dataInicio: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      dataFim: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
    },
    {
      label: 'Este ano',
      value: 'esteAno',
      dataInicio: new Date(new Date().getFullYear(), 0, 1),
      dataFim: new Date()
    },
    {
      label: 'Todos os períodos',
      value: 'todos',
      dataInicio: new Date(2000, 0, 1),
      dataFim: new Date()
    }
  ];