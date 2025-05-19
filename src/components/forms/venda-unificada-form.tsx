"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import CurrencyInput from "react-currency-input-field";
import {
  Plus,
  Trash2,
  Save,
  X,
  Package,
  Loader2,
  User,
  Building,
  CreditCard,
  Repeat,
  AlertCircle,
  ThumbsDown,
  ThumbsUp,
  Tag,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Importar os validadores e tipos de Zod
import { vendaSchema } from "@/validations/venda-schema";
import { naoVendaSchema } from "@/validations/nao-venda-schema";
import type { z } from "zod";

// Importar os tipos
import {
  Produto,
  VendaFormData,
  NaoVendaFormData,
  ProdutoConcorrenciaTemp,
  VendaUnificadaFormProps,
  ClienteRecorrente,
  ModoFormulario,
  ProdutoComId,
  ProdutoConcorrenciaComId,
} from "@/types/venda-tipos";

// Importar ações
import { criarVenda, atualizarVenda } from "@/actions/venda-actions";
import { criarNaoVenda, atualizarNaoVenda } from "@/actions/nao-venda-actions";
import { formatarValorBRL } from "@/lib/utils";
import { type SubmitHandler } from "react-hook-form";

// Usando inferência de tipos para o Zod
type VendaSchemaType = z.infer<typeof vendaSchema>;
type NaoVendaSchemaType = z.infer<typeof naoVendaSchema>;

// Tipo seguro para ProdutoConcorrencia
type ProdutoConcorrenciaSchema = {
  produtoGarden: Produto;
  valorConcorrencia: number;
  nomeConcorrencia: string;
  icms?: number;
  objecao?: string;
};

// Lista de objeções
const objOptions = [
  "Falta de produto em estoque",
  "Prazo de entrega",
  "Preço da concorrência",
  "Logística",
  "Cliente inapto para compra",
  "Produto que não trabalhamos",
  "Outro",
];

// Lista de recorrências
const recorrenciaOptions = [
  "7 dias",
  "14 dias",
  "21 dias",
  "28 dias",
  "35 dias",
  "42 dias",
  "49 dias",
  "56 dias", // 8 semanas
  "63 dias", // 9 semanas
  "70 dias", // 10 semanas
  "77 dias", // 11 semanas
  "84 dias", // 12 semanas / 3 meses
  "91 dias", // 13 semanas
  "98 dias", // 14 semanas
  "105 dias", // 15 semanas
  "112 dias", // 16 semanas
  "119 dias", // 17 semanas
  "Outro",
];

// Lista de segmentos
const segmentoOptions = [
  "Home Care (Saneantes)",
  "Personal Care (Cosméticos)",
  "Plásticos, Borrachas e Papéis",
  "Pet",
  "Automotivo",
  "Alimentos",
  "Tratamento de Água",
  "Têxtil",
  "Especialidades",
  "Químicos",
  "Agro",
  "Farma",
  "Tintas e Vernizes",
  "Oil e Gás",
  "Lubrificantes",
];
const productOptions = [
  "Ácido Esteárico Dupla Pressão Vegetal (Garden AE D - Vegetal)",
  "Ácido Esteárico Dupla Pressão Animal (Garden AE T)",
  "Ácido Esteárico Tripla Pressão Vegetal (Garden AE T - Vegetal)",
  "Ácido Esteárico Tripla Pressão Animal (Garden AE T)",
  "Ácido Glioxílico",
  "Ácido Sulfônico 90 (Garden Pon LAS 90)",
  "Álcool Cereais (Garden Alc Cereais)",
  "Álcool Cetílico",
  "Álcool Ceto Estearílico 30/70",
  "Álcool Ceto Etoxilado (Garden ACE - 200F)",
  "Álcool Etílico Anidro 99 (Garden Alc 99)",
  "Álcool Etílico Hidratado 96 (Garden Alc 96)",
  "Álcool Polivinílico (Garden APV Pó)",
  "Amida 60 (Garden MID DC 60)",
  "Amida 80 (Garden MID DC 80)",
  "Amida 90 (Garden MID DC 90)",
  "Base Amaciante (Garden Quat)",
  "Base Amaciante (Garden Quat Plus)",
  "Base Perolada (Garden Pon BP)",
  "Betaína 30% (Garden Ampho CB Plus)",
  "Cloreto de Sódio Micronizado sem Iodo",
  "Conservante Cosméticos (Garden CC20)",
  "D-Pantenol - Vitamina B5",
  "EDTA Dissídico",
  "Espessante Sintético (Garden Pon APV)",
  "Formol Inibido 37%",
  "Glicerina Bi Destilada Grau USP",
  "Lauril 27% (Garden Pon LESS 27)",
  "Lauril Éter Sulfato de Sódio 70% (Garden Pon LESS 70)",
  "Lauril Éter Sulfossuccinato de Sódio (Garden Pon SGC)",
  "Massa de Vela (Garden MV)",
];
// Lista de medidas
const medidasOptions = ["Litro", "Galão", "Caixa", "Unidade", "Kg"];

// Lista de condições de pagamento
const condicoesPagamentoOptions = [
  "À vista",
  "30 dias",
  "30/60 dias",
  "30/60/90 dias",
  "Boleto",
  "PIX",
  "Outro",
];

// Função para formatar CNPJ
const formatCNPJ = (value: string): string => {
  // Remove todos os caracteres não numéricos
  const numericValue = value.replace(/\D/g, "");

  // Aplica a máscara de CNPJ: 00.000.000/0000-00
  return numericValue
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .substring(0, 18);
};

// Tipos para resolver problemas de tipagem com o zodResolver
type CustomResolver<T> = (
  data: T,
  context?: object
) => Promise<{
  values: T;
  errors: Record<string, { message: string }>;
}>;

// Função para resolver problema de tipagem com SubmitHandler
function createTypedSubmitHandler<T>(
  handler: (data: T) => Promise<void>
): SubmitHandler<T> {
  return handler as SubmitHandler<T>;
}
const formatCurrency = (value: string): string => {
  // Remove tudo que não for número
  const numericValue = value.replace(/\D/g, "");

  // Converte para número com 2 casas decimais
  const floatValue = parseFloat(numericValue) / 100;

  // Formata o número com separadores de milhar e decimal corretos
  return floatValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
export function VendaUnificadaFormTipado({
  initialData,
  initialMode = "venda",
  isEditing = false,
}: VendaUnificadaFormProps) {
  // Modo do formulário (venda ou Venda-Perdida)
  const [formMode, setFormMode] = useState<ModoFormulario>(initialMode);

  // Estado de carregamento
  const [loading, setLoading] = useState<boolean>(false);

  // Estados para diálogo de recorrência (vendas)
  const [showRecorrenciaDialog, setShowRecorrenciaDialog] =
    useState<boolean>(false);
  const [nomeRecorrencia, setNomeRecorrencia] = useState<string>("");

  // Estado para os produtos sendo adicionados
  const [currentProduto, setCurrentProduto] = useState<Produto>({
    nome: "",
    medida: "",
    quantidade: 0,
    valor: 0,
    recorrencia: "",
  });

  // Estado para produto da concorrência (Venda-Perdidas)
  const [produtoConcorrencia, setProdutoConcorrencia] =
    useState<ProdutoConcorrenciaTemp>({
      valorConcorrencia: 0,
      nomeConcorrencia: "",
      icms: null,
      objecao: null,
    });

  // Estado para exibir dropdown de objeção
  const [objecaoInputOpen, setObjecaoInputOpen] = useState<boolean>(false);

  // Estado para clientes recorrentes
  const [clientesRecorrentes] = useState<ClienteRecorrente[]>([]);

  // Definir valores padrão do formulário para venda
  const defaultVendaValues: VendaSchemaType =
    formMode === "venda" && initialData
      ? (initialData as VendaSchemaType)
      : {
          cliente: {
            nome: "",
            segmento: "",
            cnpj: "",
            razaoSocial: "",
          },
          produtos: [],
          valorTotal: 0,
          condicaoPagamento: "",
          vendaRecorrente: false,
        };

  // Definir valores padrão do formulário para Venda-Perdida
  const defaultNaoVendaValues: NaoVendaSchemaType =
    formMode === "naoVenda" && initialData
      ? (initialData as NaoVendaSchemaType)
      : {
          cliente: {
            nome: "",
            segmento: "",
            cnpj: "",
            razaoSocial: "",
          },
          produtosConcorrencia: [],
          valorTotal: 0,
          condicaoPagamento: "",
          objecaoGeral: "",
        };

  // Formulário de venda com tipagem correta usando resolver personalizado
  const vendaForm = useForm<VendaSchemaType>({
    resolver: zodResolver(vendaSchema) as CustomResolver<VendaSchemaType>,
    defaultValues: defaultVendaValues,
  });

  // Nao-Venda form com tipagem correta
  const naoVendaForm = useForm<NaoVendaSchemaType>({
    resolver: zodResolver(naoVendaSchema) as CustomResolver<NaoVendaSchemaType>,
    defaultValues: defaultNaoVendaValues,
  });

  // Arrays de produtos com tipagem correta
  const {
    fields: vendaFields,
    append: vendaAppend,
    remove: vendaRemove,
  } = useFieldArray({
    control: vendaForm.control,
    name: "produtos",
  });

  const {
    fields: naoVendaFields,
    append: naoVendaAppend,
    remove: naoVendaRemove,
  } = useFieldArray({
    control: naoVendaForm.control,
    name: "produtosConcorrencia",
  });

  // Efeito para sincronizar informações de cliente entre os formulários
  useEffect(() => {
    if (formMode === "venda") {
      const clienteData = naoVendaForm.getValues("cliente");
      if (clienteData.nome || clienteData.cnpj) {
        vendaForm.setValue("cliente", clienteData);
      }
    } else {
      const clienteData = vendaForm.getValues("cliente");
      if (clienteData.nome || clienteData.cnpj) {
        naoVendaForm.setValue("cliente", clienteData);
      }

      // Também podemos sincronizar condição de pagamento
      const condicaoVenda = vendaForm.getValues("condicaoPagamento");
      if (condicaoVenda) {
        naoVendaForm.setValue("condicaoPagamento", condicaoVenda);
      }
    }
  }, [formMode, naoVendaForm, vendaForm]);

  // Manipulação do produto atual
  const handleChangeProduto = (
    field: keyof Produto,
    value: string | number
  ) => {
    setCurrentProduto((prev) => ({ ...prev, [field]: value }));
  };

  // Manipulação do produto da concorrência
  const handleChangeProdutoConcorrencia = (
    field: keyof ProdutoConcorrenciaTemp,
    value: string | number | null
  ) => {
    setProdutoConcorrencia((prev) => ({ ...prev, [field]: value }));
  };

  // Handler para seleção de objeção
  const handleObjecaoSelect = (objValue: string) => {
    if (objValue === "Outro") {
      setProdutoConcorrencia((prev) => ({ ...prev, objecao: "" }));
    } else {
      setProdutoConcorrencia((prev) => ({ ...prev, objecao: objValue }));
      setObjecaoInputOpen(false);
    }
  };

  // Handler para alteração manual da objeção
  const handleCustomObjecaoChange = (value: string) => {
    setProdutoConcorrencia((prev) => ({ ...prev, objecao: value }));
  };

  // Adicionar produto à lista de vendas
  const handleAddProdutoVenda = () => {
    // Validação básica
    if (
      !currentProduto.nome ||
      !currentProduto.medida ||
      currentProduto.quantidade <= 0 ||
      currentProduto.valor <= 0
    ) {
      toast.error("Preencha todos os campos obrigatórios do produto");
      return;
    }

    // Verificar duplicidade exata
    const isDuplicate = vendaFields.some(
      (produto) =>
        produto.nome === currentProduto.nome &&
        produto.medida === currentProduto.medida &&
        produto.quantidade === currentProduto.quantidade &&
        produto.valor === currentProduto.valor &&
        produto.recorrencia === currentProduto.recorrencia
    );

    if (isDuplicate) {
      toast.error("Este produto já foi adicionado com as mesmas informações");
      return;
    }

    // Adicionar à lista
    vendaAppend(currentProduto);

    // Resetar campos
    setCurrentProduto({
      nome: "",
      medida: "",
      quantidade: 0,
      valor: 0,
      recorrencia: "",
    });

    // Atualizar valor total sugerido
    const valorAtual = vendaForm.getValues("valorTotal") || 0;
    const valorProduto = currentProduto.valor * currentProduto.quantidade;
    vendaForm.setValue("valorTotal", valorAtual + valorProduto);
  };

  // Adicionar produto à lista de Venda-Perdidas
  const handleAddProdutoNaoVenda = () => {
    // Validação básica para produto Garden
    if (
      !currentProduto.nome ||
      !currentProduto.medida ||
      currentProduto.quantidade <= 0 ||
      currentProduto.valor <= 0
    ) {
      toast.error("Preencha todos os campos obrigatórios do produto Garden");
      return;
    }
  
    // CORREÇÃO: Pegar o valor da concorrência do formulário principal
    const valorConcorrencia = naoVendaForm.getValues("valorTotal");
  
    // Validação básica para produto concorrência
    if (
      !produtoConcorrencia.nomeConcorrencia ||
      valorConcorrencia <= 0
    ) {
      toast.error(
        "Preencha todos os campos obrigatórios do produto da concorrência"
      );
      return;
    }
  
    // Verificar duplicidade exata
    const isDuplicate = naoVendaFields.some((item) => {
      const pc = item as unknown as ProdutoConcorrenciaSchema;
      return (
        pc.produtoGarden?.nome === currentProduto.nome &&
        pc.produtoGarden?.medida === currentProduto.medida &&
        pc.produtoGarden?.quantidade === currentProduto.quantidade &&
        pc.valorConcorrencia === valorConcorrencia &&
        pc.nomeConcorrencia === produtoConcorrencia.nomeConcorrencia
      );
    });
  
    if (isDuplicate) {
      toast.error(
        "Esta comparação de produtos já foi adicionada com as mesmas informações"
      );
      return;
    }
  
    // Criar objeto de produto concorrência com tipagem correta
    const novoProdutoConcorrencia: ProdutoConcorrenciaSchema = {
      produtoGarden: currentProduto,
      valorConcorrencia: valorConcorrencia, // CORREÇÃO: Usar o valor do formulário
      nomeConcorrencia: produtoConcorrencia.nomeConcorrencia,
      icms:
        produtoConcorrencia.icms !== null
          ? (produtoConcorrencia.icms as number)
          : undefined,
      objecao:
        produtoConcorrencia.objecao !== null
          ? (produtoConcorrencia.objecao as string)
          : undefined,
    };
  
    // Adicionar à lista com tipagem segura
    naoVendaAppend(
      novoProdutoConcorrencia as unknown as NaoVendaSchemaType["produtosConcorrencia"][0]
    );
  
    // Resetar campos
    setCurrentProduto({
      nome: "",
      medida: "",
      quantidade: 0,
      valor: 0,
      recorrencia: "",
    });
  
    setProdutoConcorrencia({
      valorConcorrencia: 0,
      nomeConcorrencia: "",
      icms: null,
      objecao: null,
    });

    // Atualizar valor total sugerido
    const valorAtual = naoVendaForm.getValues("valorTotal") || 0;
    const valorProduto = currentProduto.valor * currentProduto.quantidade;
    naoVendaForm.setValue("valorTotal", valorAtual + valorProduto);
  };

  // Remover produto da lista de vendas
  const handleRemoveProdutoVenda = (index: number) => {
    // Atualizar valor total sugerido
    const produto = vendaForm.getValues(`produtos.${index}`);
    const valorAtual = vendaForm.getValues("valorTotal") || 0;
    const valorProduto = produto.valor * produto.quantidade;
    vendaForm.setValue("valorTotal", valorAtual - valorProduto);

    // Remover da lista
    vendaRemove(index);
  };

  // Remover produto da lista de Venda-Perdidas
  const handleRemoveProdutoNaoVenda = (index: number) => {
    // Obter o produto
    const produtos = naoVendaForm.getValues("produtosConcorrencia");
    if (produtos.length <= index) return;

    // Obter o produto da lista usando uma tipagem mais segura
    const produto = produtos[index] as unknown as ProdutoConcorrenciaSchema;

    // Atualizar valor total sugerido
    const valorAtual = naoVendaForm.getValues("valorTotal") || 0;
    const valorProduto =
      produto.produtoGarden.valor * produto.produtoGarden.quantidade;
    naoVendaForm.setValue("valorTotal", valorAtual - valorProduto);

    // Remover da lista
    naoVendaRemove(index);
  };

  // Calcular valor total sugerido para vendas
  const calcularValorSugeridoVenda = (): number => {
    const produtos = vendaForm.getValues("produtos");
    return produtos.reduce((acumulador: number, produto: Produto) => {
      return acumulador + produto.valor * produto.quantidade;
    }, 0);
  };

  // Calcular valor total sugerido para Venda-Perdidas
  const calcularValorSugeridoNaoVenda = (): number => {
    const produtos = naoVendaForm.getValues("produtosConcorrencia");
    return produtos.reduce((acumulador: number, item) => {
      const produto = item as unknown as ProdutoConcorrenciaSchema;
      return (
        acumulador +
        produto.produtoGarden.valor * produto.produtoGarden.quantidade
      );
    }, 0);
  };

  // Calcular diferença de valor (para Venda-Perdidas)
  const calcularDiferencaValor = (
    produtoGarden: Produto,
    valorConcorrencia: number
  ): { valor: string; percentual: string; maisCaro: boolean } => {
    const valorTotalGarden = produtoGarden.valor * produtoGarden.quantidade;
    const valorDiferenca = valorTotalGarden - valorConcorrencia;

    return {
      valor: formatarValorBRL(Math.abs(valorDiferenca)),
      percentual:
        ((Math.abs(valorDiferenca) / valorTotalGarden) * 100).toFixed(2) + "%",
      maisCaro: valorDiferenca > 0,
    };
  };

  // Carregar dados do cliente recorrente
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleClienteRecorrenteChange = (idCliente: string): void => {
    // Implementar lógica para buscar cliente recorrente
    // e preencher os campos do formulário
    toast.info("Funcionalidade em desenvolvimento");
  };

  // Manipular envio do formulário de venda
  const onSubmitVenda = async (data: VendaSchemaType) => {
    // Verificar se há ao menos um produto
    if (data.produtos.length === 0) {
      toast.error("Adicione pelo menos um produto");
      return;
    }

    // Verificar recorrência
    if (data.vendaRecorrente && !nomeRecorrencia) {
      setShowRecorrenciaDialog(true);
      return;
    }

    setLoading(true);

    try {
      // Usar a action diretamente para criar ou atualizar a venda
      const formData = {
        ...data,
        nomeRecorrencia: data.vendaRecorrente ? nomeRecorrencia : undefined,
      };

      let result;
      if (isEditing && initialData?.id) {
        result = await atualizarVenda(
          initialData.id,
          formData as VendaFormData
        );
      } else {
        result = await criarVenda(formData as VendaFormData);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          isEditing
            ? "Venda atualizada com sucesso!"
            : "Venda cadastrada com sucesso!"
        );
        vendaForm.reset(defaultVendaValues);
        setCurrentProduto({
          nome: "",
          medida: "",
          quantidade: 0,
          valor: 0,
          recorrencia: "",
        });
      }
    } catch (error) {
      console.error("Erro ao processar venda:", error);
      toast.error("Ocorreu um erro ao processar a venda");
    } finally {
      setLoading(false);
    }
  };

  // Manipular envio do formulário de Venda-Perdida
  const onSubmitNaoVenda = async (data: NaoVendaSchemaType) => {
    // Verificar se há ao menos um produto
    if (data.produtosConcorrencia.length === 0) {
      toast.error("Adicione pelo menos um produto");
      return;
    }

    setLoading(true);

    try {
      // Usar a action diretamente para criar ou atualizar a Venda-Perdida
      let result;
      if (isEditing && initialData?.id) {
        result = await atualizarNaoVenda(
          initialData.id,
          data as unknown as NaoVendaFormData
        );
      } else {
        result = await criarNaoVenda(data as unknown as NaoVendaFormData);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          isEditing
            ? "Venda-Perdida atualizada com sucesso!"
            : "Venda-Perdida cadastrada com sucesso!"
        );
        naoVendaForm.reset(defaultNaoVendaValues);
        setCurrentProduto({
          nome: "",
          medida: "",
          quantidade: 0,
          valor: 0,
          recorrencia: "",
        });
        setProdutoConcorrencia({
          valorConcorrencia: 0,
          nomeConcorrencia: "",
          icms: null,
          objecao: null,
        });
      }
    } catch (error) {
      console.error("Erro ao processar Venda-Perdida:", error);
      toast.error("Ocorreu um erro ao processar a Venda-Perdida");
    } finally {
      setLoading(false);
    }
  };

  // Alternar entre os modos de formulário
  const toggleFormMode = (): void => {
    // Transferir dados do cliente entre formulários
    if (formMode === "venda") {
      const clienteData = vendaForm.getValues("cliente");
      const condicaoPagamento = vendaForm.getValues("condicaoPagamento");

      naoVendaForm.setValue("cliente", clienteData);
      naoVendaForm.setValue("condicaoPagamento", condicaoPagamento);

      setFormMode("naoVenda");
    } else {
      const clienteData = naoVendaForm.getValues("cliente");
      const condicaoPagamento = naoVendaForm.getValues("condicaoPagamento");

      vendaForm.setValue("cliente", clienteData);
      vendaForm.setValue("condicaoPagamento", condicaoPagamento);

      setFormMode("venda");
    }
  };

  // Verificar se estamos no modo de edição e definir o título correto
  const formTitle = isEditing
    ? formMode === "venda"
      ? "Editar Venda"
      : "Editar Venda-Perdida"
    : formMode === "venda"
    ? "Registrar Nova Venda"
    : "Registrar Nova Venda-Perdida";

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <motion.h2
          className="text-2xl font-semibold"
          key={formTitle}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {formTitle}
        </motion.h2>

        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={formMode}
              initial={{ opacity: 0, x: formMode === "venda" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: formMode === "venda" ? 20 : -20 }}
              transition={{ duration: 0.2 }}
            >
              <Badge
                className={`px-3 py-1 ${
                  formMode === "venda"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {formMode === "venda" ? "Modo Venda" : "Modo Venda-Perdida"}
              </Badge>
            </motion.div>
          </AnimatePresence>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              onClick={toggleFormMode}
              className={
                formMode === "venda"
                  ? "text-red-600 border-red-300 hover:bg-red-50"
                  : "text-green-600 border-green-300 hover:bg-green-50"
              }
            >
              {formMode === "venda" ? (
                <>
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  Alternar para Venda-Perdida
                </>
              ) : (
                <>
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Alternar para Venda
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {formMode === "venda" ? (
          <motion.div
            key="venda-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
          >
            <Form {...vendaForm}>
              <form
                onSubmit={vendaForm.handleSubmit(
                  createTypedSubmitHandler(onSubmitVenda)
                )}
                className="space-y-8"
              >
                {/* Cliente Recorrente (apenas para novas vendas) */}
                {!isEditing && (
                  <motion.div
                    className="bg-gray-50 p-4 rounded-lg"
                    initial={{ opacity: 0, y: 7 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                  >
                    <h3 className="text-lg font-medium mb-4">
                      Cliente Recorrente
                    </h3>
                    <Select onValueChange={handleClienteRecorrenteChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente recorrente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientesRecorrentes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 mt-2">
                      Selecione um cliente recorrente para preencher
                      automaticamente os dados
                    </p>
                  </motion.div>
                )}

                {/* Informações do Cliente */}
                <motion.div
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.2 }}
                >
                  <h3 className="text-lg font-medium mb-4">
                    Informações do Cliente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Campo para nome do cliente */}
                    <FormField
                      control={vendaForm.control}
                      name="cliente.nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Cliente*</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <Input {...field} placeholder="Nome do cliente" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Campo para segmento */}
                    <FormField
                      control={vendaForm.control}
                      name="cliente.segmento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Segmento da Empresa*</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Building className="w-4 h-4 text-gray-400" />
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o segmento" />
                                </SelectTrigger>
                                <SelectContent>
                                  {segmentoOptions.map((segmento) => (
                                    <SelectItem key={segmento} value={segmento}>
                                      {segmento}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Campo para CNPJ com máscara */}
                    <FormField
                      control={vendaForm.control}
                      name="cliente.cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ*</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="00.000.000/0000-00"
                              value={formatCNPJ(field.value)}
                              onChange={(e) => field.onChange(e.target.value)}
                              maxLength={18}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Campo para Razão Social */}
                    <FormField
                      control={vendaForm.control}
                      name="cliente.razaoSocial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razão Social</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Razão social (opcional)"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>

                {/* Produtos */}
                <motion.div
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.2 }}
                >
                  <h3 className="text-lg font-medium mb-4">Produtos</h3>

                  {/* Formulário de adição de produto */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className="md:col-span-1">
                          <FormLabel className="mb-1">Nome*</FormLabel>
                          <Select
                            value={currentProduto.nome}
                            onValueChange={(value) =>
                              handleChangeProduto("nome", value)
                            }
                          >
                            <SelectTrigger className="">
                              <SelectValue placeholder="Produto" />
                            </SelectTrigger>
                            <SelectContent>
                              {productOptions.map((produto) => (
                                <SelectItem key={produto} value={produto}>
                                  {produto}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <FormLabel className="mb-1">Medida*</FormLabel>
                          <Select
                            value={currentProduto.medida}
                            onValueChange={(value) =>
                              handleChangeProduto("medida", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Medida" />
                            </SelectTrigger>
                            <SelectContent>
                              {medidasOptions.map((medida) => (
                                <SelectItem key={medida} value={medida}>
                                  {medida}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <FormLabel className="mb-1">Quantidade*</FormLabel>
                          <Input
                            type="number"
                            min="1"
                            value={currentProduto.quantidade || ""}
                            onChange={(e) =>
                              handleChangeProduto(
                                "quantidade",
                                Number(e.target.value)
                              )
                            }
                            className="w-full"
                          />
                        </div>

                        <div>
                          <FormLabel className="mb-1">Valor*</FormLabel>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-gray-500">
                              R$
                            </span>
                            <Input
                              className="px-8 h-10 rounded-md border border-input bg-background w-full"
                              value={formatCurrency(
                                currentProduto.valor.toString()
                              )}
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(
                                  /\D/g,
                                  ""
                                );
                                const numValue = rawValue
                                  ? parseInt(rawValue, 10) / 100
                                  : 0;
                                handleChangeProduto("valor", numValue);
                              }}
                              placeholder="0,00"
                            />
                          </div>
                        </div>

                        <div>
                          <FormLabel className="mb-1">Recorrência</FormLabel>
                          <Select
                            value={currentProduto.recorrencia || ""}
                            onValueChange={(value) =>
                              handleChangeProduto("recorrencia", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {recorrenciaOptions.map((recorrencia) => (
                                <SelectItem
                                  key={recorrencia}
                                  value={recorrencia}
                                >
                                  {recorrencia}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <Button type="button" onClick={handleAddProdutoVenda}>
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar Produto
                          </Button>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lista de produtos adicionados */}
                  {vendaFields.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      <h4 className="font-medium">
                        Produtos Adicionados ({vendaFields.length})
                      </h4>
                      <AnimatePresence>
                        {vendaFields.map((field, index) => {
                          const produto = field as unknown as ProdutoComId;
                          return (
                            <motion.div
                              key={produto.id || index}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Card>
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex items-center">
                                    <Package className="h-5 w-5 text-[#00446A] mr-3" />
                                    <div>
                                      <p className="font-medium">
                                        {produto.nome}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        {produto.quantidade} {produto.medida} -{" "}
                                        {formatarValorBRL(produto.valor)}
                                        {produto.recorrencia &&
                                          ` - ${produto.recorrencia}`}
                                      </p>
                                    </div>
                                  </div>
                                  <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      type="button"
                                      onClick={() =>
                                        handleRemoveProdutoVenda(index)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </motion.div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Valor total dos produtos:{" "}
                          <span className="font-medium">
                            {formatarValorBRL(calcularValorSugeridoVenda())}
                          </span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 border border-dashed rounded-lg text-center text-gray-500">
                      Nenhum produto adicionado
                    </div>
                  )}
                </motion.div>

                {/* Condições de Pagamento e Valor Total */}
                <motion.div
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <FormField
                    control={vendaForm.control}
                    name="condicaoPagamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="mb-1">
                          Condição de Pagamento*
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {condicoesPagamentoOptions.map((condicao) => (
                                  <SelectItem key={condicao} value={condicao}>
                                    {condicao}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={vendaForm.control}
                    name="valorTotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Total*</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center">
                            <span className="absolute left-3  text-gray-500">
                              R$
                            </span>
                            <CurrencyInput
                              className="px-8 h-10 rounded-md border border-input bg-background w-full"
                              value={field.value}
                              onValueChange={(value) =>
                                field.onChange(Number(value || 0))
                              }
                              decimalsLimit={2}
                              decimalSeparator=","
                              groupSeparator="."
                              allowNegativeValue={false}
                              placeholder="0,00"
                            />
                          </div>
                        </FormControl>
                        <p className="text-xs text-gray-500 mt-1">
                          Valor sugerido:{" "}
                          {formatarValorBRL(calcularValorSugeridoVenda())} (Soma
                          de todos os produtos)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={vendaForm.control}
                    name="vendaRecorrente"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="flex items-center">
                            <Repeat className="w-4 h-4 mr-2 text-gray-400" />
                            Venda Recorrente
                          </FormLabel>
                          <p className="text-xs text-gray-500">
                            Marque esta opção para salvar como cliente
                            recorrente
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* Botões */}
                <motion.div
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.2 }}
                  className="flex justify-end space-x-4 mt-8"
                >
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button variant="outline" type="button">
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button
                      variant="outline"
                      type="button"
                      onClick={toggleFormMode}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <ThumbsDown className="mr-2 h-4 w-4" />
                      Registrar como Venda-Perdida
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {isEditing ? "Atualizar Venda" : "Registrar Venda"}
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </form>
            </Form>
          </motion.div>
        ) : (
          <motion.div
            key="nao-venda-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
          >
            <Form {...naoVendaForm}>
              <form
                onSubmit={naoVendaForm.handleSubmit(
                  createTypedSubmitHandler(onSubmitNaoVenda)
                )}
                className="space-y-8"
              >
                {/* Informações do Cliente */}
                <motion.div
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                >
                  <h3 className="text-lg font-medium mb-4">
                    Informações do Cliente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={naoVendaForm.control}
                      name="cliente.nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Cliente*</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <Input {...field} placeholder="Nome do cliente" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={naoVendaForm.control}
                      name="cliente.segmento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Segmento da Empresa*</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Building className="w-4 h-4 text-gray-400" />
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o segmento" />
                                </SelectTrigger>
                                <SelectContent>
                                  {segmentoOptions.map((segmento) => (
                                    <SelectItem key={segmento} value={segmento}>
                                      {segmento}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={naoVendaForm.control}
                      name="cliente.cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ*</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="00.000.000/0000-00"
                              value={formatCNPJ(field.value)}
                              onChange={(e) => field.onChange(e.target.value)}
                              maxLength={18}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={naoVendaForm.control}
                      name="cliente.razaoSocial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razão Social</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Razão social (opcional)"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>

                {/* Produtos */}
                <motion.div
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.2 }}
                >
                  <h3 className="text-lg font-medium mb-4">
                    Produtos Garden vs Concorrência
                  </h3>

                  {/* Formulário de adição de produto Garden */}
                  <Card className="mb-6">
                    <CardContent className="pt-6">
                      <h4 className="font-medium mb-4 text-[#00446A]">
                        Produto (Garden)
                      </h4>
                      <div className="flex w-fit gap-4">
                        <div className="md:col-span-1">
                          <FormLabel>Nome*</FormLabel>
                          <Select
                            value={currentProduto.nome}
                            onValueChange={(value) =>
                              handleChangeProduto("nome", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Produto" />
                            </SelectTrigger>
                            <SelectContent>
                              {productOptions.map((produto) => (
                                <SelectItem key={produto} value={produto}>
                                  {produto}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <FormLabel>Medida*</FormLabel>
                          <Select
                            value={currentProduto.medida}
                            onValueChange={(value) =>
                              handleChangeProduto("medida", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Medida" />
                            </SelectTrigger>
                            <SelectContent>
                              {medidasOptions.map((medida) => (
                                <SelectItem key={medida} value={medida}>
                                  {medida}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <FormLabel>Quantidade*</FormLabel>
                          <Input
                            type="number"
                            min="1"
                            value={currentProduto.quantidade || ""}
                            onChange={(e) =>
                              handleChangeProduto(
                                "quantidade",
                                Number(e.target.value)
                              )
                            }
                            className="w-full"
                          />
                        </div>

                        <div>
                          <div>
                            <FormLabel>Valor*</FormLabel>
                            <div className="relative flex items-center">
                              <span className="absolute left-3  text-gray-500">
                                R$
                              </span>
                              <Input
                                className="px-8 h-10 rounded-md border border-input bg-background w-full"
                                value={formatCurrency(
                                  currentProduto.valor.toString()
                                )}
                                onChange={(e) => {
                                  const rawValue = e.target.value.replace(
                                    /\D/g,
                                    ""
                                  );
                                  const numValue = rawValue
                                    ? parseInt(rawValue, 10) / 100
                                    : 0;
                                  handleChangeProduto("valor", numValue);
                                }}
                                placeholder="0,00"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <FormLabel>Recorrência</FormLabel>
                          <Select
                            value={currentProduto.recorrencia || ""}
                            onValueChange={(value) =>
                              handleChangeProduto("recorrencia", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {recorrenciaOptions.map((recorrencia) => (
                                <SelectItem
                                  key={recorrencia}
                                  value={recorrencia}
                                >
                                  {recorrencia}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Formulário de adição de produto da concorrência */}
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-medium mb-4 text-red-600">
                        Produto (Concorrência)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <FormLabel>Nome da Concorrência*</FormLabel>
                          <Input
                            value={produtoConcorrencia.nomeConcorrencia || ""}
                            onChange={(e) =>
                              handleChangeProdutoConcorrencia(
                                "nomeConcorrencia",
                                e.target.value
                              )
                            }
                            placeholder="Nome da empresa concorrente"
                          />
                        </div>

                        <div>
                          <FormField
                            control={naoVendaForm.control}
                            name="valorTotal"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Valor Total*</FormLabel>
                                <FormControl>
                                  <div className="relative flex items-center">

                                    <span className="absolute left-3  text-gray-500">
                                      R$
                                    </span>
                                    <Input
                                      className="px-8 h-10 rounded-md border border-input bg-background w-full"
                                      value={formatCurrency(
                                        field.value.toString()
                                      )}
                                      onChange={(e) => {
                                        const rawValue = e.target.value.replace(
                                          /\D/g,
                                          ""
                                        );
                                        const numValue = rawValue
                                          ? parseInt(rawValue, 10) / 100
                                          : 0;
                                        field.onChange(numValue);
                                      }}
                                      placeholder="0,00"
                                    />
                                  </div>
                                </FormControl>
                                <p className="text-xs text-gray-500 mt-1">
                                  Valor sugerido:{" "}
                                  {formatarValorBRL(
                                    calcularValorSugeridoNaoVenda()
                                  )}{" "}
                                  (Soma de todos os produtos Garden)
                                </p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div>
                          <FormLabel>ICMS (%)</FormLabel>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={produtoConcorrencia.icms || ""}
                            onChange={(e) =>
                              handleChangeProdutoConcorrencia(
                                "icms",
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value)
                              )
                            }
                            placeholder="Porcentagem de ICMS"
                          />
                        </div>

                        <div>
                          <FormLabel>Objeção</FormLabel>
                          <div className="relative">
                            <Popover
                              open={objecaoInputOpen}
                              onOpenChange={setObjecaoInputOpen}
                            >
                              <PopoverTrigger asChild>
                                <div className="flex items-center space-x-2 w-full border border-input rounded-md px-3 py-2 h-10 cursor-pointer">
                                  {produtoConcorrencia.objecao ? (
                                    <Badge className="px-2 py-1 bg-gray-100 text-gray-800 flex items-center gap-1">
                                      <Tag className="h-3 w-3" />
                                      {produtoConcorrencia.objecao}
                                      <X
                                        className="h-3 w-3 ml-1 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setProdutoConcorrencia((prev) => ({
                                            ...prev,
                                            objecao: null,
                                          }));
                                        }}
                                      />
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-500 flex-1">
                                      Selecione ou digite uma objeção
                                    </span>
                                  )}
                                  <ChevronDown className="h-4 w-4 opacity-50" />
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-[220px] p-0">
                                <div className="py-2 px-3">
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                      Selecione uma objeção
                                    </p>
                                    <div className="border rounded-md">
                                      <Input
                                        placeholder="Buscar objeção..."
                                        className="h-9"
                                        onChange={() => {
                                          // Implementar filtro opcional
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-[200px] overflow-auto mt-2">
                                    {objOptions.map((obj) => (
                                      <div
                                        key={obj}
                                        onClick={() => handleObjecaoSelect(obj)}
                                        className="text-sm px-2 py-1.5 hover:bg-slate-100 rounded cursor-pointer"
                                      >
                                        {obj}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="border-t p-2 mt-2">
                                    <Input
                                      placeholder="Digite uma objeção personalizada"
                                      value={
                                        (produtoConcorrencia.objecao as string) ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleCustomObjecaoChange(
                                          e.target.value
                                        )
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          setObjecaoInputOpen(false);
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <Button
                            type="button"
                            onClick={handleAddProdutoNaoVenda}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar Comparação
                          </Button>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lista de produtos adicionados */}
                  {naoVendaFields.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      <h4 className="font-medium">
                        Comparações Adicionadas ({naoVendaFields.length})
                      </h4>
                      <AnimatePresence>
                        {naoVendaFields.map((field, index) => {
                          // Converter com segurança para o tipo correto
                          const item =
                            field as unknown as ProdutoConcorrenciaComId;
                          const diferenca = calcularDiferencaValor(
                            item.produtoGarden,
                            item.valorConcorrencia
                          );

                          return (
                            <motion.div
                              key={item.id || index}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Card>
                                <CardContent className="p-4">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                                    <div className="flex items-center mb-3 sm:mb-0">
                                      <Package className="h-5 w-5 text-[#00446A] mr-3" />
                                      <div>
                                        <p className="font-medium">
                                          {item.produtoGarden.nome}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                          {item.produtoGarden.quantidade}{" "}
                                          {item.produtoGarden.medida} -{" "}
                                          {formatarValorBRL(
                                            item.produtoGarden.valor
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        type="button"
                                        onClick={() =>
                                          handleRemoveProdutoNaoVenda(index)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </motion.div>
                                  </div>

                                  <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="flex flex-col sm:flex-row justify-between">
                                      <div>
                                        <p className="text-sm font-medium">
                                          Concorrência: {item.nomeConcorrencia}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          Valor:{" "}
                                          {formatarValorBRL(
                                            item.valorConcorrencia
                                          )}
                                        </p>
                                        {item.icms && (
                                          <p className="text-sm text-gray-600">
                                            ICMS: {item.icms}%
                                          </p>
                                        )}
                                      </div>

                                      <div className="mt-3 sm:mt-0 text-right">
                                        <p className="text-sm font-medium">
                                          Diferença: {diferenca.valor} (
                                          {diferenca.percentual})
                                        </p>
                                        <p
                                          className={`text-sm ${
                                            diferenca.maisCaro
                                              ? "text-red-500"
                                              : "text-green-500"
                                          }`}
                                        >
                                          Garden é{" "}
                                          {diferenca.maisCaro
                                            ? "mais cara"
                                            : "mais barata"}
                                        </p>
                                      </div>
                                    </div>

                                    {item.objecao && (
                                      <div className="mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">
                                            Objeção:
                                          </span>{" "}
                                          {item.objecao}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Valor total dos produtos Garden:{" "}
                          <span className="font-medium">
                            {formatarValorBRL(calcularValorSugeridoNaoVenda())}
                          </span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 border border-dashed rounded-lg text-center text-gray-500">
                      Nenhuma comparação adicionada
                    </div>
                  )}
                </motion.div>

                {/* Condições de Pagamento, Valor Total e Objeção Geral */}
                <motion.div
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <FormField
                    control={naoVendaForm.control}
                    name="condicaoPagamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condição de Pagamento*</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {condicoesPagamentoOptions.map((condicao) => (
                                  <SelectItem key={condicao} value={condicao}>
                                    {condicao}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={naoVendaForm.control}
                    name="valorTotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Total*</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 text-gray-500">
                              R$
                            </span>
                            <Input
                              className="px-8 h-10 rounded-md border border-input bg-background w-full"
                              value={formatCurrency(field.value.toString())}
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(
                                  /\D/g,
                                  ""
                                );
                                const numValue = rawValue
                                  ? parseInt(rawValue, 10) / 100
                                  : 0;
                                field.onChange(numValue);
                              }}
                              placeholder="0,00"
                            />
                          </div>
                        </FormControl>
                        <p className="text-xs text-gray-500 mt-1">
                          Valor sugerido:{" "}
                          {formatarValorBRL(calcularValorSugeridoVenda())} (Soma
                          de todos os produtos)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={naoVendaForm.control}
                    name="objecaoGeral"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2 text-gray-400" />
                          Objeção Geral
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="w-full">
                                  <Textarea
                                    value={field.value || ""}
                                    onChange={(e) =>
                                      field.onChange(e.target.value)
                                    }
                                    placeholder="Clique para selecionar ou descreva a objeção geral para a Venda-Perdida"
                                    rows={4}
                                  />
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0">
                                <div className="py-2 px-3">
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                      Selecione uma objeção
                                    </p>
                                    <div className="border rounded-md">
                                      <Input
                                        placeholder="Buscar objeção..."
                                        className="h-9"
                                        onChange={() => {
                                          // Implementar filtro opcional
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-[200px] overflow-auto mt-2">
                                    {objOptions.map((obj) => (
                                      <div
                                        key={obj}
                                        onClick={() => field.onChange(obj)}
                                        className="text-sm px-2 py-1.5 hover:bg-slate-100 rounded cursor-pointer"
                                      >
                                        {obj}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* Botões */}
                <motion.div
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.2 }}
                  className="flex justify-end space-x-4 mt-8"
                >
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button variant="outline" type="button">
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button
                      variant="outline"
                      type="button"
                      onClick={toggleFormMode}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      <ThumbsUp className="mr-2 h-4 w-4" />
                      Registrar como Venda
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {isEditing
                            ? "Atualizar Venda-Perdida"
                            : "Registrar Venda-Perdida"}
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </form>
            </Form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog para nome da recorrência */}
      <Dialog
        open={showRecorrenciaDialog}
        onOpenChange={setShowRecorrenciaDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nomeie este cliente recorrente</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Digite um nome para identificar este cliente recorrente para
              futuras vendas.
            </p>
            <Input
              value={nomeRecorrencia}
              onChange={(e) => setNomeRecorrencia(e.target.value)}
              placeholder="Ex: Cliente A - Mensal"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRecorrenciaDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!nomeRecorrencia) {
                  toast.error("O nome da recorrência é obrigatório");
                  return;
                }
                setShowRecorrenciaDialog(false);
                void vendaForm.handleSubmit(
                  createTypedSubmitHandler(onSubmitVenda)
                )();
              }}
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
