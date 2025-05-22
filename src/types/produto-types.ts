// types/produto-types.ts

/**
 * Tipo base para produtos
 */
export interface ProdutoBase {
    id?: string;
    nome: string;
    medida: string;
    quantidade: number;
    valor: number;
    comissao?: number;
    icms?: number;
    ipi?: number;
  }
  
  /**
   * Tipo para produto com objeção
   */
  export interface ProdutoComObjecao extends ProdutoBase {
    objecaoId?: string;
    objecaoTexto?: string | null;
  }
  
  /**
   * Tipo para produto da concorrência
   */
  export interface ProdutoConcorrenciaType {
    produtoGarden: ProdutoBase;
    valorConcorrencia: number;
    nomeConcorrencia: string;
    icms?: number | null;
    ipi?: number | null;
    objecao?: string | null;
    infoNaoDisponivel?: boolean;
  }
  
  /**
   * Tipo para converter campos de formulário
   */
  export interface CampoFormulario<T> {
    name: string;
    value: T;
    onChange: (value: T) => void;
  }
  
  /**
   * Converter com segurança um produto para ProdutoComId
   */
  export function converterParaProdutoComId<T extends ProdutoBase>(
    produto: T
  ): T & { id: string } {
    return {
      ...produto,
      id: produto.id || `produto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    };
  }
  
  /**
   * Converter com segurança produto da concorrência para um com ID
   */
  export function converterParaProdutoConcorrenciaComId<T extends ProdutoConcorrenciaType>(
    produto: T
  ): T & { id: string } {
    return {
      ...produto,
      id: `concorrencia_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    };
  }