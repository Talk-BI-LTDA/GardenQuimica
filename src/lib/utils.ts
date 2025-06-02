// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ProdutoConcorrenciaTemp, Produto } from "@/types/venda-tipos";
import { prisma } from "@/lib/supabase/prisma";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
export const aplicarMascaraTelefone = (valor: string): string => {
  // Remove todos os caracteres não numéricos
  const apenasNumeros = valor.replace(/\D/g, '');
  
  // Aplica a máscara conforme a quantidade de dígitos
  if (apenasNumeros.length <= 2) {
    return apenasNumeros.replace(/^(\d{0,2})/, '($1');
  } else if (apenasNumeros.length <= 6) {
    return apenasNumeros.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  } else if (apenasNumeros.length <= 10) {
    return apenasNumeros.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  } else {
    // Para celular (11 dígitos)
    return apenasNumeros.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').slice(0, 16);
  }
};

export async function gerarEtiquetasParaCliente(clienteId: string, cotacaoId: string) {
  try {
    // Buscar produtos da cotação
    const cotacao = await prisma.cotacao.findUnique({
      where: { id: cotacaoId },
      include: {
        produtos: {
          include: {
            produto: true
          }
        }
      }
    });

    if (!cotacao) {
      // Tentar buscar como venda
      const venda = await prisma.venda.findUnique({
        where: { id: cotacaoId },
        include: {
          produtos: {
            include: {
              produto: true
            }
          }
        }
      });

      if (!venda) {
        return { error: "Cotação ou venda não encontrada" };
      }

      // Gerar etiquetas a partir dos produtos da venda
      const etiquetas = venda.produtos.map(produto => ({
        nome: produto.produto.nome.replace(/\s+/g, '_').toLowerCase(),
        clienteId
      }));

      // Remover etiquetas duplicadas
      const etiquetasUnicas = etiquetas.filter((etiqueta, index, self) => 
        self.findIndex(e => e.nome === etiqueta.nome) === index
      );

      // Criar etiquetas no banco
      const promises = etiquetasUnicas.map(etiqueta => 
        prisma.etiquetaCliente.upsert({
          where: {
            nome_clienteId: {
              nome: etiqueta.nome,
              clienteId: etiqueta.clienteId
            }
          },
          update: {},
          create: etiqueta
        })
      );

      await Promise.all(promises);
      return { success: true, etiquetas: etiquetasUnicas };
    }

    // Gerar etiquetas a partir dos produtos da cotação
    const etiquetas = cotacao.produtos.map(produto => ({
      nome: produto.produto.nome.replace(/\s+/g, '_').toLowerCase(),
      clienteId
    }));

    // Remover etiquetas duplicadas
    const etiquetasUnicas = etiquetas.filter((etiqueta, index, self) => 
      self.findIndex(e => e.nome === etiqueta.nome) === index
    );

    // Criar etiquetas no banco
    const promises = etiquetasUnicas.map(etiqueta => 
      prisma.etiquetaCliente.upsert({
        where: {
          nome_clienteId: {
            nome: etiqueta.nome,
            clienteId: etiqueta.clienteId
          }
        },
        update: {},
        create: etiqueta
      })
    );

    await Promise.all(promises);

    return { success: true, etiquetas: etiquetasUnicas };
  } catch (error) {
    console.error("Erro ao gerar etiquetas para cliente:", error);
    return { error: "Ocorreu um erro ao gerar as etiquetas" };
  }
}

export function formatarDataHoraBR(data: Date | string): string {
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  return format(dataObj, "dd/MM/yyyy HH:mm", { locale: ptBR });
}