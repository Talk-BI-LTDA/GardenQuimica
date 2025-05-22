// src/validations/nao-venda-schema.ts
import { z } from 'zod';

// Schema para o produto Garden (opcional para campos de comissão, ICMS, IPI)
const produtoGardenSchema = z.object({
  nome: z.string().min(1, 'Nome do produto é obrigatório'),
  medida: z.string().min(1, 'Medida é obrigatória'),
  quantidade: z.number().min(1, 'Quantidade deve ser maior que zero'),
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  comissao: z.number().min(0).max(100).optional().default(0),
  icms: z.number().min(0).max(100).optional().default(0),
  ipi: z.number().min(0).max(100).optional().default(0),
  recorrencia: z.string().optional(),
});

// Schema para produto da concorrência
const produtoConcorrenciaSchema = z.object({
  produtoGarden: produtoGardenSchema,
  valorConcorrencia: z.number().min(0, 'Valor da concorrência deve ser maior ou igual a zero')
    .refine(val => val !== undefined, {
      message: 'Valor da concorrência é obrigatório',
    }),
  nomeConcorrencia: z.string().min(1, 'Nome da concorrência é obrigatório')
    .or(z.literal('Não disponível')),
  icms: z.number().min(0).max(100).nullable().optional(),
  ipi: z.number().min(0).max(100).nullable().optional(),
  objecao: z.string().nullable().optional(),
  infoNaoDisponivel: z.boolean().optional().default(false),
});

// Schema para cliente
const clienteSchema = z.object({
  nome: z.string().min(3, 'Nome do cliente é obrigatório'),
  segmento: z.string().min(1, 'Segmento é obrigatório'),
  cnpj: z.string().min(14, 'CNPJ inválido'),
  razaoSocial: z.string().optional(),
  whatsapp: z.string().optional(),
});

// Schema principal para não venda (cotação cancelada)
export const naoVendaSchema = z.object({
  cliente: clienteSchema,
  produtosConcorrencia: z.array(produtoConcorrenciaSchema).min(1, 'Adicione pelo menos um produto'),
  valorTotal: z.number().min(0.01, 'Valor total deve ser maior que zero'),
  condicaoPagamento: z.string().min(1, 'Condição de pagamento é obrigatória'),
  objecaoGeral: z.string().optional(),
  // Campos adicionais para edição
  id: z.string().optional(),
  status: z.enum(['pendente', 'finalizada', 'cancelada']).optional(),
  vendedorId: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Tipo inferido
export type NaoVendaSchemaType = z.infer<typeof naoVendaSchema>;