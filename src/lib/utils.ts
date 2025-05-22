// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ProdutoConcorrenciaTemp, Produto } from "@/types/venda-tipos";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatarValorBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

export function gerarCodigoVenda(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function formatarCNPJ(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function formatarCPF(cpf: string): string {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

export function removerFormatacao(valor: string): string {
  return valor.replace(/[^\d]/g, '');
}
export const formatCurrency = (value: string): string => {
  // Remove tudo que não for número
  const numericValue = value.replace(/\D/g, "");

  // Se estiver vazio ou for apenas zeros, retorna 0,00
  if (!numericValue || numericValue === "" || parseInt(numericValue) === 1) {
    return "0,00";
  }

  // Converte para número com 2 casas decimais
  const floatValue = parseFloat(numericValue) / 100;

  // Verifica se é um número válido
  if (isNaN(floatValue)) {
    return "0,00";
  }

  // Formata o número com separadores de milhar e decimal corretos
  return floatValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Calcular diferença de valor (para Cotação Cancelada)
export const calcularDiferencaValor = (
  produtoGarden: Produto,
  valorConcorrencia: number,
  infoNaoDisponivel: boolean
): { valor: string; percentual: string; maisCaro: boolean } => {
  if (infoNaoDisponivel) {
    return {
      valor: "N/A",
      percentual: "N/A",
      maisCaro: false
    };
  }
  
  const valorTotalGarden = produtoGarden.valor * produtoGarden.quantidade;
  const valorDiferenca = valorTotalGarden - valorConcorrencia;

  return {
    valor: formatarValorBRL(Math.abs(valorDiferenca)),
    percentual:
      ((Math.abs(valorDiferenca) / valorTotalGarden) * 100).toFixed(2) + "%",
    maisCaro: valorDiferenca > 0,
  };
};



// Reset de produto
export const resetProduto = (): Produto => ({
  nome: "",
  medida: "",
  quantidade: 0,
  valor: 0,
  comissao: 0,
  icms: 0,
  ipi: 0
});

// Reset de produto concorrência
export const resetProdutoConcorrencia = (): ProdutoConcorrenciaTemp => ({
  valorConcorrencia: 0,
  nomeConcorrencia: "",
  icms: 0,
  ipi: 0,
  objecao: null,
  infoNaoDisponivel: false
});
