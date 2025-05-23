// src/validations/venda-schema.ts
import { z } from "zod";

// Certifique-se de que o esquema de produto inclua as propriedades comissao, icms e ipi
export const produtoSchema = z.object({
  nome: z.string().min(1, "Nome do produto é obrigatório"),
  medida: z.string().min(1, "Medida é obrigatória"),
  quantidade: z.number().min(1, "Quantidade deve ser maior que zero"),
  valor: z.number().min(0.01, "Valor deve ser maior que zero"),
  // Adicione essas propriedades como opcionais
  comissao: z.number().optional().default(0),
  icms: z.number().optional().default(0),
  ipi: z.number().optional().default(0),
  recorrencia: z.string().optional()
});

export const clienteSchema = z.object({
  nome: z.string().min(1, "Nome do cliente é obrigatório"),
  segmento: z.string().min(1, "Segmento é obrigatório"),
  cnpj: z.string().min(14, "CNPJ inválido"),
  razaoSocial: z.string().optional(),
  whatsapp: z.string().optional(),
  recorrente: z.boolean().optional(),
});

export const vendaSchema = z.object({
  cliente: clienteSchema,
  produtos: z.array(produtoSchema).min(1, "Adicione pelo menos um produto"),
  valorTotal: z.number().min(0.01, "Valor total deve ser maior que zero"),
  condicaoPagamento: z.string().min(1, "Condição de pagamento é obrigatória"),
  vendaRecorrente: z.boolean().default(false),
  nomeRecorrencia: z.string().optional(),
  
});

export type ProdutoSchema = z.infer<typeof produtoSchema>;
export type ClienteSchema = z.infer<typeof clienteSchema>;
export type VendaSchema = z.infer<typeof vendaSchema>;