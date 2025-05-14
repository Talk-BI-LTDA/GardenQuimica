export type Produto = {
    id?: string;
    nome: string;
    medida: string;
    quantidade: number;
    valor: number;
    recorrencia?: string;
  };
  
  // Tipo para cliente
  export type Cliente = {
    id?: string;
    nome: string;
    segmento: string;
    cnpj: string;
    razaoSocial?: string;
  };
  
  // Tipos relacionados a Vendas
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
  
  // Tipos relacionados a Não-Vendas
  export type ProdutoConcorrencia = {
    produtoGarden: Produto;
    valorConcorrencia: number;
    nomeConcorrencia: string;
    icms?: number | null;
    objecao?: string | null;
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
  
  // Tipo para uso com useFieldArray do React Hook Form
  export interface ProdutoComId extends Produto {
    id: string;
  }
  
  export interface ProdutoConcorrenciaComId extends ProdutoConcorrencia {
    id: string;
  }
  
  // Tipos para o Resolver do Zod
  export type ZodFormResolver<T> = (data: unknown) => Promise<{
    values: T;
    errors: Record<string, { message: string }>;
  }>;
  
  // Tipos para estados temporários (usados no formulário)
  export type ProdutoConcorrenciaTemp = {
    valorConcorrencia: number;
    nomeConcorrencia: string;
    icms: number | null;
    objecao: string | null;
  };
  
  // Tipo para dados de clientes recorrentes
  export interface ClienteRecorrente {
    id: string;
    nome: string;
    cnpj: string;
    segmento: string;
    razaoSocial?: string;
    condicaoPagamento: string;
    produtos: Produto[];
  }
  
  // Tipo para diferenciar entre modo de venda
  export type ModoFormulario = 'venda' | 'naoVenda';
  
  // Tipo para as props do formulário unificado
  export type VendaUnificadaFormProps = {
    initialData?: Venda | NaoVenda;
    initialMode?: ModoFormulario;
    isEditing?: boolean;
  };

  