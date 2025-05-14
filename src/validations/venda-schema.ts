// src/validations/venda-schema.ts
import { z } from 'zod';

const clienteSchema = z.object({
  nome: z.string().min(3, 'Nome do cliente é obrigatório'),
  segmento: z.string().min(1, 'Segmento é obrigatório'),
  cnpj: z.string().min(14, 'CNPJ inválido'),
  razaoSocial: z.string().optional(),
});

const produtoSchema = z.object({
  nome: z.string().min(1, 'Nome do produto é obrigatório'),
  medida: z.string().min(1, 'Medida é obrigatória'),
  quantidade: z.number().min(1, 'Quantidade deve ser maior que zero'),
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  recorrencia: z.string().optional(),
});

export const vendaSchema = z.object({
  cliente: clienteSchema,
  produtos: z.array(produtoSchema).min(1, 'Adicione pelo menos um produto'),
  valorTotal: z.number().min(0.01, 'Valor total deve ser maior que zero'),
  condicaoPagamento: z.string().min(1, 'Condição de pagamento é obrigatória'),
  vendaRecorrente: z.boolean().default(false),
  nomeRecorrencia: z.string().optional(),
});