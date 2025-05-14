// src/validations/nao-venda-schema.ts
import { z } from 'zod';

const clienteSchema = z.object({
  nome: z.string().min(3, 'Nome do cliente é obrigatório'),
  segmento: z.string().min(1, 'Segmento é obrigatório'),
  cnpj: z.string().min(14, 'CNPJ inválido'),
  razaoSocial: z.string().optional(),
});

const produtoGardenSchema = z.object({
  nome: z.string().min(1, 'Nome do produto é obrigatório'),
  medida: z.string().min(1, 'Medida é obrigatória'),
  quantidade: z.number().min(1, 'Quantidade deve ser maior que zero'),
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  recorrencia: z.string().optional(),
});

const produtoConcorrenciaSchema = z.object({
  produtoGarden: produtoGardenSchema,
  valorConcorrencia: z.number().min(0.01, 'Valor da concorrência deve ser maior que zero'),
  nomeConcorrencia: z.string().min(1, 'Nome da concorrência é obrigatório'),
  icms: z.number().optional(),
  objecao: z.string().optional(),
});

export const naoVendaSchema = z.object({
  cliente: clienteSchema,
  produtosConcorrencia: z.array(produtoConcorrenciaSchema).min(1, 'Adicione pelo menos um produto'),
  valorTotal: z.number().min(0.01, 'Valor total deve ser maior que zero'),
  condicaoPagamento: z.string().min(1, 'Condição de pagamento é obrigatória'),
  objecaoGeral: z.string().optional(),
});