// src/types/venda-tipos.ts

// Produto no formulário
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

export type ProdutoComId = Produto & {
  id: string;
};

// Cliente no formulário
export type Cliente = {
  id?: string;
  nome: string;
  segmento: string;
  cnpj: string;
  razaoSocial?: string;
  whatsapp?: string;
};

// Tipo para formulário de venda
export type VendaFormData = {
  cliente: Cliente;
  produtos: Produto[];
  valorTotal: number;
  condicaoPagamento: string;
  vendaRecorrente: boolean;
  nomeRecorrencia?: string;
};

// Tipo temporário para produto da concorrência durante cadastro
export type ProdutoConcorrenciaTemp = {
  valorConcorrencia: number;
  nomeConcorrencia: string;
  icms?: number | null;
  ipi?: number | null;
  objecao?: string | null;
  infoNaoDisponivel?: boolean; 
};

// Tipo para produto da concorrência com ID
export type ProdutoConcorrenciaComId = {
  id: string;
  produtoGarden: Produto;
  valorConcorrencia: number;
  nomeConcorrencia: string;
  icms?: number;
  ipi?: number;
  objecao?: string;
  infoNaoDisponivel?: boolean;
};

// Tipo para formulário de não venda
export type NaoVendaFormData = {
  cliente: Cliente;
  produtosConcorrencia: {
    produtoGarden: Produto;
    valorConcorrencia: number;
    nomeConcorrencia: string;
    icms?: number;
    ipi?: number;
    objecao?: string;
    infoNaoDisponivel?: boolean;
  }[];
  valorTotal: number;
  condicaoPagamento: string;
  objecaoGeral?: string;
};

// Tipo para cliente recorrente - Modificado para garantir que id é obrigatório
export type ClienteRecorrente = {
  id: string; // Agora é explicitamente obrigatório
  nome: string;
  cnpj: string;
  segmento: string;
  razaoSocial?: string;
  whatsapp?: string;
};

// Modo do formulário
export type ModoFormulario = "venda" | "naoVenda";

// Props para o componente VendaUnificadaForm
export type VendaUnificadaFormProps = {
  initialData?: VendaFormData | NaoVendaFormData;
  initialMode?: ModoFormulario;
  isEditing?: boolean;
};