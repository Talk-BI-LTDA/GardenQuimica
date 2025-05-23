// @/components/forms/venda-unificada-form.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { atualizarVenda, criarVenda } from "@/actions/venda-actions";
import { getCatalogoItens } from "@/actions/catalogo-actions";
import { atualizarNaoVenda } from "@/actions/nao-venda-actions";
import {
  Save,
  Loader2,
  AlertCircle,
  ThumbsDown,
  ThumbsUp,
  Search,
  ArrowLeft,
  Trash2,
  CreditCard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

// Componentes divididos
import { ClienteForm } from "./cotacao/ClienteForm";
import { ProdutoVendaForm } from "./cotacao/ProdutoVendaForm";
import { ProdutoConcorrenciaForm } from "./cotacao/ProdutoConcorrenciaForm";

// Importar os validadores e tipos de Zod
import { vendaSchema } from "@/validations/venda-schema";
import { naoVendaSchema } from "@/validations/nao-venda-schema";
import type { z } from "zod";
import { useRouter } from "next/navigation";

// Importar os tipos
import {
  Produto,
  VendaFormData,
  NaoVendaFormData,
  ProdutoConcorrenciaTemp,
  ClienteRecorrente,
  ModoFormulario,
  ProdutoComId,
  ProdutoConcorrenciaComId,
} from "@/types/venda-tipos";
import type { Vendedor, Cliente } from "@/types/usuario-tipos";

// Importar ações
import { criarNaoVenda } from "@/actions/nao-venda-actions";
import { Cotacao } from "@/types/cotacao-tipos";
import { getClientesRecorrentes } from "@/actions/clientes-actions";

import {
  criarCotacao,
  atualizarCotacao,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  finalizarCotacao,
  cancelarCotacao,
  converterCotacao,
  CotacaoFormData,
  StatusCotacao,
} from "@/actions/cotacao-actions";
import { getVendedores } from "@/actions/vendedores-actions";
import { getProdutos } from "@/actions/produtos-actions";
import { formatarValorBRL, formatCurrency } from "@/lib/utils";
import { type SubmitHandler } from "react-hook-form";

// Utils compartilhados
import { resetProduto, resetProdutoConcorrencia } from "@/lib/utils";

// Usando inferência de tipos para o Zod
export type VendaSchemaType = z.infer<typeof vendaSchema>;
export type NaoVendaSchemaType = z.infer<typeof naoVendaSchema>;

// Atualizar a interface VendaUnificadaFormProps
interface VendaUnificadaFormProps {
  initialData?: (VendaFormData | NaoVendaFormData | Cotacao) & {
    id?: string;
    status?: StatusCotacao;
  };
  initialMode?: ModoFormulario;
  isEditing?: boolean;
}

// Tipo seguro para ProdutoConcorrencia
type ProdutoConcorrenciaSchema = {
  produtoGarden: Produto;
  valorConcorrencia: number;
  nomeConcorrencia: string;
  icms?: number | null;
  ipi?: number | null;
  objecao?: string | null;
  infoNaoDisponivel?: boolean;
};

// Tipo para produto não catalogado
type ProdutoNaoCatalogado = {
  nome: string;
  medida: string;
  quantidade: number;
  valor: number;
  comissao?: number;
  icms?: number;
  ipi?: number;
  objecao?: string | null;
};

// Tipo para definir objeção individual do produto
type ObjecaoIndividual = {
  produtoId: string;
  objecao: string | null;
  tipoObjecao: string;
};

// Tipo para produto aguardando dados de concorrência
type ProdutoMigrado = {
  produto: ProdutoEstendido;
  concorrenciaAdicionada: boolean;
  index: number;
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

// Versão estendida do tipo Produto para garantir compatibilidade em todos os lugares
export type ProdutoEstendido = {
  id?: string;
  nome: string;
  medida: string;
  quantidade: number;
  valor: number;
  comissao: number;
  icms: number;
  ipi: number;
  recorrencia?: string;
};

export function VendaUnificadaFormTipado({
  initialData,
  initialMode = "venda",
  isEditing = false,
}: VendaUnificadaFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Obter o status da URL se disponível
  const statusParam = searchParams.get("status") as StatusCotacao | null;

  // Modo do formulário (venda ou naoVenda)
  const [formMode, setFormMode] = useState<ModoFormulario>(initialMode);

  // Status da cotação (pendente, finalizada, cancelada)
  const [statusCotacao, setStatusCotacao] = useState<StatusCotacao>(
    statusParam || (initialData?.status as StatusCotacao) || "pendente"
  );

  // Estado de carregamento
  const [loading, setLoading] = useState<boolean>(false);

  // NOVOS ESTADOS PARA CONTROLE DE FORMULÁRIO
  const [canSubmitForm, setCanSubmitForm] = useState<boolean>(true);
  const [hasPendingMigratedProducts, setHasPendingMigratedProducts] =
    useState<boolean>(false);

  // Estados para diálogo de recorrência (vendas)
  const [showRecorrenciaDialog, setShowRecorrenciaDialog] =
    useState<boolean>(false);
  const [nomeRecorrencia, setNomeRecorrencia] = useState<string>(
    isEditing && initialData && "nomeRecorrencia" in initialData
      ? initialData.nomeRecorrencia || ""
      : ""
  );

  // Estado para o diálogo de produto para objeção
  const [showObjecaoProdutoDialog, setShowObjecaoProdutoDialog] =
    useState<boolean>(false);
  const [nomeProdutoObjecao, setNomeProdutoObjecao] = useState<string>("");

  // Estado para os produtos sendo adicionados
  const [currentProduto, setCurrentProduto] = useState<ProdutoEstendido>(
    resetProduto() as ProdutoEstendido
  );

  // Estado para produto da concorrência (naoVenda)
  const [produtoConcorrencia, setProdutoConcorrencia] =
    useState<ProdutoConcorrenciaTemp>(resetProdutoConcorrencia());

  // Estado para produtos não catalogados
  const [showProdutoNaoCatalogadoDialog, setShowProdutoNaoCatalogadoDialog] =
    useState<boolean>(false);
  const [produtoNaoCatalogado, setProdutoNaoCatalogado] =
    useState<ProdutoNaoCatalogado>({
      nome: "",
      medida: "Kg",
      quantidade: 0,
      valor: 0,
      comissao: 0,
      icms: 0,
      ipi: 0,
      objecao: null,
    });

  // Estado para objeções individuais
  const [objecoesIndividuais, setObjecoesIndividuais] = useState<
    ObjecaoIndividual[]
  >([]);
  const [showObjecaoDialog, setShowObjecaoDialog] = useState<boolean>(false);
  const [currentProdutoComObjecao, setCurrentProdutoComObjecao] =
    useState<string>("");
  const [currentObjecao, setCurrentObjecao] = useState<string | null>(null);

  // Estado para edição de concorrência de produto migrado
  const [showConcorrenciaDialog, setShowConcorrenciaDialog] =
    useState<boolean>(false);
  const [currentProdutoMigradoIndice, setCurrentProdutoMigradoIndice] =
    useState<number>(-1);
  const [currentConcorrencia, setCurrentConcorrencia] =
    useState<ProdutoConcorrenciaTemp>(resetProdutoConcorrencia());
  const [produtoAtual, setProdutoAtual] = useState<ProdutoEstendido | null>(
    null
  );

  // Estado para clientes recorrentes
  const [clientesRecorrentes, setClientesRecorrentes] = useState<
    ClienteRecorrente[]
  >([]);

  // Estado para busca de produtos
  const [produtoAddedSearchTerm, setProdutoAddedSearchTerm] =
    useState<string>("");

  // Estado para controlar se precisa migrar produtos
  const [precisaMigrarProdutos, setPrecisaMigrarProdutos] =
    useState<boolean>(false);

  // Estado para rastrear produtos originais quando migrar para cotação cancelada
  const [produtosMigrados, setProdutosMigrados] = useState<ProdutoMigrado[]>(
    []
  );

  // Estado para acompanhar erros do formulário
  const [formErros, setFormErros] = useState<string | null>(null);

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
            whatsapp: "",
          },
          produtos: [],
          valorTotal: 0,
          condicaoPagamento: "",
          vendaRecorrente: false,
        };

  // Definir valores padrão do formulário para naoVenda
  const defaultNaoVendaValues: NaoVendaSchemaType =
    formMode === "naoVenda" && initialData
      ? (initialData as NaoVendaSchemaType)
      : {
          cliente: {
            nome: "",
            segmento: "",
            cnpj: "",
            razaoSocial: "",
            whatsapp: "",
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

  // NOVO EFEITO PARA VERIFICAR PRODUTOS MIGRADOS PENDENTES
  useEffect(() => {
    const produtosPendentes = produtosMigrados.filter(
      (p) => !p.concorrenciaAdicionada
    );
    setHasPendingMigratedProducts(produtosPendentes.length > 0);

    // Se há produtos pendentes, não permitir submissão automática
    if (produtosPendentes.length > 0) {
      setCanSubmitForm(false);
    } else {
      setCanSubmitForm(true);
    }
  }, [produtosMigrados]);

  // NOVO COMPONENTE DE AVISO PARA PRODUTOS PENDENTES
  const ProdutosPendentesWarning = () => {
    if (!hasPendingMigratedProducts) return null;

    const produtosPendentes = produtosMigrados.filter(
      (p) => !p.concorrenciaAdicionada
    );

    return (
      <div className=" border border-orange-400 text-orange-800 p-4 rounded-lg mb-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <div>
            <p className="font-medium">Produtos pendentes</p>
            <p className="text-sm">
              Você ainda precisa adicionar informações de concorrência para{" "}
              {produtosPendentes.length} produto(s). Complete essas informações
              antes de salvar a cotação.
            </p>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (initialData && isEditing) {
      // Determinar o tipo de dados baseado na estrutura
      const hasProductosConcorrencia = "produtosConcorrencia" in initialData;
      const hasStatus = "status" in initialData;

      // Se tem produtosConcorrencia, é uma cotação cancelada
      if (hasProductosConcorrencia) {
        setFormMode("naoVenda");
        setStatusCotacao("cancelada");

        // Carregar dados no formulário de não venda
        const naoVendaData = initialData as NaoVendaFormData;
        naoVendaForm.reset({
          cliente: naoVendaData.cliente,
          produtosConcorrencia: naoVendaData.produtosConcorrencia || [],
          valorTotal: naoVendaData.valorTotal,
          condicaoPagamento: naoVendaData.condicaoPagamento,
          objecaoGeral: naoVendaData.objecaoGeral || "",
        });
        console.log("Initial data cliente:", initialData?.cliente);
      } else {
        // Se tem status e é pendente, é uma cotação
        if (hasStatus && (initialData as Cotacao).status === "pendente") {
          setFormMode("venda");
          setStatusCotacao("pendente");
        } else {
          // Caso contrário, é uma venda finalizada
          setFormMode("venda");
          setStatusCotacao("finalizada");
        }

        // Carregar dados no formulário de venda
        const vendaData = initialData as VendaFormData;
        vendaForm.reset({
          cliente: vendaData.cliente,
          produtos: vendaData.produtos || [],
          valorTotal: vendaData.valorTotal,
          condicaoPagamento: vendaData.condicaoPagamento,
          vendaRecorrente: vendaData.vendaRecorrente || false,
        });

        // Se é venda recorrente, carregar o nome da recorrência
        if (vendaData.vendaRecorrente && vendaData.nomeRecorrencia) {
          setNomeRecorrencia(vendaData.nomeRecorrencia);
        }
      }
    }
  }, [initialData, isEditing, naoVendaForm, vendaForm]);
  // Efeito para carregar produtos e clientes do banco de dados
  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Buscar produtos cadastrados no banco
        const produtosResult = await getProdutos();
        if (produtosResult.success) {
          // Aqui você poderia atualizar a lista de produtos
          // Se a API retornar produtos, você poderia atualizar productOptions
        }

        // Buscar vendedores para obter clientes recorrentes
        const vendedoresResult = await getVendedores();
        if (vendedoresResult.success && vendedoresResult.vendedores) {
          // Extrair clientes recorrentes dos vendedores
          const clientes: ClienteRecorrente[] = [];

          // Iterar sobre vendedores e seus clientes
          vendedoresResult.vendedores.forEach((vendedor: Vendedor) => {
            if (vendedor.clientes && Array.isArray(vendedor.clientes)) {
              vendedor.clientes.forEach((cliente: Cliente) => {
                if (cliente.recorrente) {
                  clientes.push({
                    id: cliente.id || "",
                    nome: cliente.nome,
                    cnpj: cliente.cnpj,
                    segmento: cliente.segmento,
                    razaoSocial: cliente.razaoSocial || "",
                    whatsapp: cliente.whatsapp || "",
                  });
                }
              });
            }
          });

          setClientesRecorrentes(clientes);
        } else {
          // Usar dados mockados para desenvolvimento
          setClientesRecorrentes([
            {
              id: "1",
              nome: "Empresa ABC Ltda",
              cnpj: "12.345.678/0001-90",
              segmento: "Químicos",
              razaoSocial: "ABC Indústria Química Ltda",
            },
            {
              id: "2",
              nome: "Indústria XYZ S.A.",
              cnpj: "98.765.432/0001-10",
              segmento: "Têxtil",
              razaoSocial: "XYZ Indústria Têxtil S.A.",
            },
            {
              id: "3",
              nome: "Farmacêutica 123",
              cnpj: "45.678.901/0001-23",
              segmento: "Farma",
              razaoSocial: "Laboratórios 123 S.A.",
            },
          ]);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        // Usar dados mockados em caso de erro
        setClientesRecorrentes([
          {
            id: "1",
            nome: "Empresa ABC Ltda",
            cnpj: "12.345.678/0001-90",
            segmento: "Químicos",
            razaoSocial: "ABC Indústria Química Ltda",
          },
          {
            id: "2",
            nome: "Indústria XYZ S.A.",
            cnpj: "98.765.432/0001-10",
            segmento: "Têxtil",
            razaoSocial: "XYZ Indústria Têxtil S.A.",
          },
          {
            id: "3",
            nome: "Farmacêutica 123",
            cnpj: "45.678.901/0001-23",
            segmento: "Farma",
            razaoSocial: "Laboratórios 123 S.A.",
          },
        ]);
      }
    };

    carregarDados();
  }, []);

  // Efeito para verificar e migrar produtos quando o modo muda para naoVenda
  useEffect(() => {
    if (formMode === "naoVenda" && precisaMigrarProdutos) {
      // Obter produtos do formulário de venda
      const produtos = vendaForm.getValues("produtos");

      // Criar lista de produtos migrados aguardando informações de concorrência
      const produtosMigradosArray: ProdutoMigrado[] = produtos.map(
        (produto, index) => {
          // Garantir que o produto tenha campos obrigatórios
          const produtoCompleto: ProdutoEstendido = {
            ...produto,
            comissao: produto.comissao || 0,
            icms: produto.icms || 0,
            ipi: produto.ipi || 0,
          };

          return {
            produto: produtoCompleto,
            concorrenciaAdicionada: false,
            index: index,
          };
        }
      );

      setProdutosMigrados(produtosMigradosArray);

      // Limpar o formulário de naoVenda
      naoVendaForm.setValue("produtosConcorrencia", []);

      // Atualizar valor total
      naoVendaForm.setValue("valorTotal", vendaForm.getValues("valorTotal"));

      // Resetar o flag para não migrar novamente
      setPrecisaMigrarProdutos(false);
    }
  }, [formMode, precisaMigrarProdutos, naoVendaForm, vendaForm]);

  // Efeito para sincronizar informações de cliente entre os formulários
  useEffect(() => {
    if (formMode === "venda") {
      const clienteData = naoVendaForm.getValues("cliente");
      if (clienteData.nome || clienteData.cnpj) {
        vendaForm.setValue("cliente", {
          ...clienteData,
          whatsapp: clienteData.whatsapp || "",
        });
      }
    } else {
      const clienteData = vendaForm.getValues("cliente");
      if (clienteData.nome || clienteData.cnpj) {
        naoVendaForm.setValue("cliente", {
          ...clienteData,
          whatsapp: clienteData.whatsapp || "",
        });
      }

      // Também sincronizar condição de pagamento
      const condicaoVenda = vendaForm.getValues("condicaoPagamento");
      if (condicaoVenda) {
        naoVendaForm.setValue("condicaoPagamento", condicaoVenda);
      }
    }
  }, [formMode, naoVendaForm, vendaForm]);

  // Filtrar produtos adicionados baseado na busca
  const filteredVendaFields = produtoAddedSearchTerm
    ? vendaFields.filter((field) => {
        const produto = field as unknown as ProdutoComId;
        return produto.nome
          .toLowerCase()
          .includes(produtoAddedSearchTerm.toLowerCase());
      })
    : vendaFields;

  const filteredNaoVendaFields = produtoAddedSearchTerm
    ? naoVendaFields.filter((field) => {
        const item = field as unknown as ProdutoConcorrenciaComId;
        return item.produtoGarden.nome
          .toLowerCase()
          .includes(produtoAddedSearchTerm.toLowerCase());
      })
    : naoVendaFields;

  // Manipulação do produto atual
  const handleChangeProduto = (
    field: keyof ProdutoEstendido,
    value: string | number
  ) => {
    if (field === "nome" && value === "Adicionar Produto não catalogado...") {
      setShowProdutoNaoCatalogadoDialog(true);
      return;
    }
    setCurrentProduto((prev) => ({ ...prev, [field]: value }));
  };

  // Manipulação do produto da concorrência
  const handleChangeProdutoConcorrencia = (
    field: keyof ProdutoConcorrenciaTemp,
    value: string | number | boolean | null
  ) => {
    setProdutoConcorrencia((prev) => ({ ...prev, [field]: value }));
  };

  // FUNÇÃO CORRIGIDA - Manipulação da concorrência de produto migrado
  const handleChangeConcorrencia = (
    field: keyof ProdutoConcorrenciaTemp,
    value: string | number | boolean | null
  ) => {
    setCurrentConcorrencia((prev) => ({ ...prev, [field]: value }));
    // REMOVIDO: concorrenciaForm.setValue que estava causando conflito
  };

  // Handler para abrir o diálogo de objeção de produto novo
  const handleAbrirObjecaoProduto = () => {
    // Verificar se os campos obrigatórios do produto estão preenchidos
    if (!currentProduto.medida || currentProduto.quantidade <= 0) {
      // Mostrar toast com campos faltantes
      const camposFaltantes = [];
      if (!currentProduto.medida) camposFaltantes.push("Medida");
      if (currentProduto.quantidade <= 0) camposFaltantes.push("Quantidade");

      toast.error(
        `Preencha os campos obrigatórios primeiro: ${camposFaltantes.join(
          ", "
        )}`
      );
      return;
    }

    setShowObjecaoProdutoDialog(true);
  };

  // Handler para salvar o produto com objeção
  const handleSalvarObjecaoProduto = () => {
    if (!nomeProdutoObjecao) {
      toast.error("Digite o nome do produto para adicionar a objeção");
      return;
    }

    // Atualizar o nome do produto atual
    const produtoComObjecao: ProdutoEstendido = {
      ...currentProduto,
      nome: nomeProdutoObjecao,
      id: `produto_obj_${Date.now()}`,
    };

    // Adicionar à lista de produtos
    vendaAppend(produtoComObjecao);

    // Adicionar a objeção para este produto
    setObjecoesIndividuais((prev) => [
      ...prev,
      {
        produtoId: produtoComObjecao.id as string,
        objecao: "Produto que não trabalhamos",
        tipoObjecao: "padrao",
      },
    ]);

    // Limpar e fechar o diálogo
    setNomeProdutoObjecao("");
    setShowObjecaoProdutoDialog(false);

    // Atualizar valor total sugerido
    const valorAtual = vendaForm.getValues("valorTotal") || 0;
    const valorProduto = produtoComObjecao.valor * produtoComObjecao.quantidade;
    vendaForm.setValue(
      "valorTotal",
      Number((valorAtual + valorProduto).toFixed(2))
    );

    toast.success("Produto adicionado com objeção");
  };

  // Handler para registrar objeção individual em um produto
  const handleAddObjecaoIndividual = (produtoId: string) => {
    setCurrentProdutoComObjecao(produtoId);
    // Se já registrou objection antes, abre o dialog diretamente
    if (objecoesIndividuais.some((obj) => obj.produtoId === produtoId)) {
      setShowObjecaoDialog(true);
      const objecao = objecoesIndividuais.find(
        (obj) => obj.produtoId === produtoId
      );
      if (objecao) {
        setCurrentObjecao(objecao.objecao);
      }
    } else {
      // Adiciona diretamente com o valor padrão "Produto que não trabalhamos"
      setObjecoesIndividuais((prev) => [
        ...prev,
        {
          produtoId,
          objecao: "Produto que não trabalhamos",
          tipoObjecao: "padrao",
        },
      ]);
      toast.success("Objeção adicionada ao produto");
    }
  };

  // Handler para salvar objeção individual
  const handleSaveObjecaoIndividual = () => {
    if (!currentProdutoComObjecao || !currentObjecao) {
      toast.error("Selecione um produto e uma objeção");
      return;
    }

    // Verificar se já existe objeção para este produto
    const existeObjecao = objecoesIndividuais.findIndex(
      (obj) => obj.produtoId === currentProdutoComObjecao
    );

    if (existeObjecao >= 0) {
      // Atualizar objeção existente
      const novasObjecoes = [...objecoesIndividuais];
      novasObjecoes[existeObjecao] = {
        ...novasObjecoes[existeObjecao],
        objecao: currentObjecao,
        tipoObjecao: currentObjecao === "Outro" ? "custom" : "padrao",
      };
      setObjecoesIndividuais(novasObjecoes);
    } else {
      // Adicionar nova objeção
      setObjecoesIndividuais([
        ...objecoesIndividuais,
        {
          produtoId: currentProdutoComObjecao,
          objecao: currentObjecao,
          tipoObjecao: currentObjecao === "Outro" ? "custom" : "padrao",
        },
      ]);
    }

    setShowObjecaoDialog(false);
    setCurrentProdutoComObjecao("");
    setCurrentObjecao(null);

    toast.success("Objeção adicionada ao produto");
  };

  // FUNÇÃO CORRIGIDA - Handler para abrir o diálogo de concorrência para produto migrado
  const handleAbrirConcorrenciaDialog = (indice: number) => {
    const produtoMigrado = produtosMigrados[indice];
    if (produtoMigrado) {
      // Resetar o estado de concorrência atual
      const concorrenciaDefault = resetProdutoConcorrencia();
      setCurrentConcorrencia(concorrenciaDefault);
      // REMOVIDO: concorrenciaForm.reset que estava causando conflito

      setCurrentProdutoMigradoIndice(indice);
      setProdutoAtual(produtoMigrado.produto);
      setShowConcorrenciaDialog(true);
    }
  };

  // FUNÇÃO CORRIGIDA - Handler para salvar a concorrência de produto migrado
  const handleSalvarConcorrencia = () => {
    if (currentProdutoMigradoIndice < 0 || !produtoAtual) {
      toast.error("Produto não encontrado");
      return;
    }

    // Validar dados de concorrência
    if (!currentConcorrencia.infoNaoDisponivel) {
      if (
        !currentConcorrencia.nomeConcorrencia ||
        currentConcorrencia.valorConcorrencia <= 0
      ) {
        toast.error(
          "Preencha todos os dados da concorrência ou marque 'Informações não disponíveis'"
        );
        return;
      }
    }

    // Garantir que o produto tem um ID
    const produtoComId: ProdutoEstendido = {
      ...produtoAtual,
      id:
        produtoAtual.id ||
        `produto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      comissao: produtoAtual.comissao || 0,
      icms: produtoAtual.icms || 0,
      ipi: produtoAtual.ipi || 0,
    };

    // Garantir todos os campos necessários no objeto de concorrência
    const novoProdutoConcorrencia = {
      id: `conc_${Date.now()}`, // Adicionar ID único para o item de concorrência
      produtoGarden: produtoComId,
      valorConcorrencia: currentConcorrencia.infoNaoDisponivel
        ? 0
        : currentConcorrencia.valorConcorrencia,
      nomeConcorrencia: currentConcorrencia.infoNaoDisponivel
        ? "Não disponível"
        : currentConcorrencia.nomeConcorrencia,
      icms: currentConcorrencia.infoNaoDisponivel
        ? null
        : currentConcorrencia.icms,
      ipi: currentConcorrencia.infoNaoDisponivel
        ? null
        : currentConcorrencia.ipi,
      objecao: currentConcorrencia.infoNaoDisponivel
        ? null
        : currentConcorrencia.objecao,
      infoNaoDisponivel: currentConcorrencia.infoNaoDisponivel || false,
    };

    // Adicionar ao formulário de não venda
    naoVendaAppend(novoProdutoConcorrencia);

    // Atualizar o produto migrado para indicar que a concorrência foi adicionada
    const novosProdutosMigrados = [...produtosMigrados];
    novosProdutosMigrados[currentProdutoMigradoIndice].concorrenciaAdicionada =
      true;
    setProdutosMigrados(novosProdutosMigrados);

    // Atualizar valor total do formulário
    const valorAtual = naoVendaForm.getValues("valorTotal") || 0;
    const valorProduto = produtoAtual.valor * produtoAtual.quantidade;
    naoVendaForm.setValue(
      "valorTotal",
      Number((valorAtual + valorProduto).toFixed(2))
    );

    // Fechar o diálogo e limpar o estado
    setShowConcorrenciaDialog(false);
    setCurrentProdutoMigradoIndice(-1);
    setProdutoAtual(null);
    setCurrentConcorrencia(resetProdutoConcorrencia());

    toast.success("Informações de concorrência adicionadas com sucesso");

    // REMOVIDO: NÃO submeter o formulário automaticamente
    // O usuário deve escolher quando submeter clicando no botão principal
  };

  const medidasOptions = ["Litro", "Kg"];

  const calcularDiferencaValor = (
    produtoGarden: Produto,
    valorConcorrencia: number,
    infoNaoDisponivel: boolean
  ) => {
    // Se informações da concorrência não estão disponíveis, retorna objeto default
    if (infoNaoDisponivel) {
      return {
        valor: "N/A",
        percentual: "N/A",
        maisCaro: false,
      };
    }

    // Verificar se temos valores válidos
    if (
      !produtoGarden ||
      !produtoGarden.valor ||
      !produtoGarden.quantidade ||
      valorConcorrencia <= 0
    ) {
      return {
        valor: "N/A",
        percentual: "N/A",
        maisCaro: false,
      };
    }

    // Calcula o valor total do produto Garden
    const valorTotalGarden = produtoGarden.valor * produtoGarden.quantidade;

    // Calcula o valor total da concorrência (assumindo mesma quantidade)
    const valorTotalConcorrencia = valorConcorrencia * produtoGarden.quantidade;

    // Calcula a diferença
    const diferenca = valorTotalGarden - valorTotalConcorrencia;

    // Evita divisão por zero
    if (valorTotalConcorrencia === 0) {
      return {
        valor: formatarValorBRL(Math.abs(diferenca)),
        percentual: "100%",
        maisCaro: diferenca > 0,
      };
    }

    // Calcula o percentual de diferença
    const percentual =
      ((Math.abs(diferenca) / valorTotalConcorrencia) * 100).toFixed(2) + "%";

    // Formata a diferença de valor
    const valorFormatado = formatarValorBRL(Math.abs(diferenca));

    // Determina se Garden é mais caro
    const maisCaro = diferenca > 0;

    return {
      valor: valorFormatado,
      percentual: percentual,
      maisCaro: maisCaro,
    };
  };

  // Adicionar produto não catalogado
  const handleAddProdutoNaoCatalogado = () => {
    if (!produtoNaoCatalogado.nome || !produtoNaoCatalogado.medida) {
      toast.error("Preencha o nome e a medida do produto");
      return;
    }

    // Adicionar produto não catalogado à lista atual
    setCurrentProduto({
      nome: produtoNaoCatalogado.nome,
      medida: produtoNaoCatalogado.medida,
      quantidade: 0,
      valor: 0,
      comissao: 0,
      icms: 0,
      ipi: 0,
    });

    // Fechar diálogo
    setShowProdutoNaoCatalogadoDialog(false);

    // Resetar estado
    setProdutoNaoCatalogado({
      nome: "",
      medida: "Kg",
      quantidade: 0,
      valor: 0,
    });

    toast.success("Produto adicionado à seleção");
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
    const isDuplicate = vendaFields.some((produto) => {
      const prod = produto as unknown as ProdutoComId;
      return (
        prod.nome === currentProduto.nome &&
        prod.medida === currentProduto.medida &&
        prod.quantidade === currentProduto.quantidade &&
        prod.valor === currentProduto.valor
      );
    });

    if (isDuplicate) {
      toast.error("Este produto já foi adicionado com as mesmas informações");
      return;
    }

    // Gerar ID temporário para o produto
    const produtoId = `produto_${Date.now()}`;

    // Adicionar à lista com ID e garantindo os campos obrigatórios
    const novoProduto: ProdutoEstendido = {
      ...currentProduto,
      id: produtoId,
      comissao: currentProduto.comissao || 0,
      icms: currentProduto.icms || 0,
      ipi: currentProduto.ipi || 0,
    };

    vendaAppend(novoProduto);

    // Resetar campos
    setCurrentProduto(resetProduto() as ProdutoEstendido);

    // Atualizar valor total sugerido
    const valorAtual = vendaForm.getValues("valorTotal") || 0;
    const valorProduto = currentProduto.valor * currentProduto.quantidade;
    vendaForm.setValue(
      "valorTotal",
      Number((valorAtual + valorProduto).toFixed(2))
    );
  };

  // Adicionar produto à lista de Cancelado
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

    // Se informações não disponíveis estiver marcado, não precisa validar concorrência
    if (!produtoConcorrencia.infoNaoDisponivel) {
      // Validação básica para produto concorrência
      if (
        !produtoConcorrencia.nomeConcorrencia ||
        produtoConcorrencia.valorConcorrencia <= 0
      ) {
        toast.error(
          "Preencha todos os campos obrigatórios do produto da concorrência"
        );
        return;
      }
    }

    // Verificar duplicidade exata
    const isDuplicate = naoVendaFields.some((item) => {
      const pc = item as unknown as ProdutoConcorrenciaSchema;
      return (
        pc.produtoGarden?.nome === currentProduto.nome &&
        pc.produtoGarden?.medida === currentProduto.medida &&
        pc.produtoGarden?.quantidade === currentProduto.quantidade &&
        pc.valorConcorrencia === produtoConcorrencia.valorConcorrencia &&
        pc.nomeConcorrencia === produtoConcorrencia.nomeConcorrencia
      );
    });

    if (isDuplicate) {
      toast.error(
        "Esta comparação de produtos já foi adicionada com as mesmas informações"
      );
      return;
    }

    // Gerar ID temporário para o produto
    const produtoId = `produto_concorrencia_${Date.now()}`;

    // Criar objeto de produto concorrência com tipagem correta
    const novoProdutoConcorrencia: ProdutoConcorrenciaSchema = {
      produtoGarden: {
        ...currentProduto,
        id: produtoId,
        icms: currentProduto.icms || 0,
        ipi: currentProduto.ipi || 0,
        comissao: currentProduto.comissao || 0,
      },
      valorConcorrencia: produtoConcorrencia.infoNaoDisponivel
        ? 0
        : produtoConcorrencia.valorConcorrencia,
      nomeConcorrencia: produtoConcorrencia.infoNaoDisponivel
        ? "Não disponível"
        : produtoConcorrencia.nomeConcorrencia,
      icms: produtoConcorrencia.infoNaoDisponivel
        ? null
        : produtoConcorrencia.icms,
      ipi: produtoConcorrencia.infoNaoDisponivel
        ? null
        : produtoConcorrencia.ipi,
      objecao: produtoConcorrencia.infoNaoDisponivel
        ? null
        : produtoConcorrencia.objecao,
      infoNaoDisponivel: produtoConcorrencia.infoNaoDisponivel,
    };

    // Adicionar à lista com tipagem segura
    naoVendaAppend(
      novoProdutoConcorrencia as unknown as NaoVendaSchemaType["produtosConcorrencia"][0]
    );

    // Resetar campos
    setCurrentProduto(resetProduto() as ProdutoEstendido);
    setProdutoConcorrencia(resetProdutoConcorrencia());

    // Atualizar valor total sugerido
    const valorAtual = naoVendaForm.getValues("valorTotal") || 0;
    const valorProduto = currentProduto.valor * currentProduto.quantidade;
    naoVendaForm.setValue(
      "valorTotal",
      Number((valorAtual + valorProduto).toFixed(2))
    );
  };

  // Remover produto da lista de vendas
  const handleRemoveProdutoVenda = (index: number) => {
    // Atualizar valor total sugerido
    const produto = vendaForm.getValues(`produtos.${index}`);
    const valorAtual = vendaForm.getValues("valorTotal") || 0;
    const valorProduto = produto.valor * produto.quantidade;
    vendaForm.setValue(
      "valorTotal",
      Number((valorAtual - valorProduto).toFixed(2))
    );

    // Remover da lista
    vendaRemove(index);
  };

  // Remover produto da lista de Cancelado
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
    naoVendaForm.setValue(
      "valorTotal",
      Number((valorAtual - valorProduto).toFixed(2))
    );

    // Se o produto era migrado, atualizar para permitir readição
    if (produto.produtoGarden.id) {
      const produtoMigradoIndex = produtosMigrados.findIndex(
        (p) => p.produto.id === produto.produtoGarden.id
      );

      if (produtoMigradoIndex >= 0) {
        const novosProdutosMigrados = [...produtosMigrados];
        novosProdutosMigrados[produtoMigradoIndex].concorrenciaAdicionada =
          false;
        setProdutosMigrados(novosProdutosMigrados);
      }
    }

    // Remover da lista
    naoVendaRemove(index);
  };

  // Calcular valor total sugerido para vendas
  const calcularValorSugeridoVenda = (): number => {
    const produtos = vendaForm.getValues("produtos");
    return Number(
      produtos
        .reduce((acumulador: number, produto: Produto) => {
          return acumulador + produto.valor * produto.quantidade;
        }, 0)
        .toFixed(2)
    );
  };

  // Calcular valor total sugerido para Cancelado
  const calcularValorSugeridoNaoVenda = (): number => {
    const produtos = naoVendaForm.getValues("produtosConcorrencia");
    return Number(
      produtos
        .reduce((acumulador: number, item) => {
          const produto = item as unknown as ProdutoConcorrenciaSchema;
          return (
            acumulador +
            produto.produtoGarden.valor * produto.produtoGarden.quantidade
          );
        }, 0)
        .toFixed(2)
    );
  };

  // Carregar dados do cliente recorrente
  const handleClienteRecorrenteChange = (idCliente: string): void => {
    const clienteSelecionado = clientesRecorrentes.find(
      (cliente) => cliente.id === idCliente
    );

    if (clienteSelecionado) {
      const dadosCliente = {
        nome: clienteSelecionado.nome,
        segmento: clienteSelecionado.segmento,
        cnpj: clienteSelecionado.cnpj,
        razaoSocial: clienteSelecionado.razaoSocial || "",
        whatsapp: clienteSelecionado.whatsapp || "",
        recorrente: true,
      };
      console.log("Dados do cliente:", dadosCliente);
      if (formMode === "venda") {
        vendaForm.setValue("cliente", dadosCliente);
        vendaForm.setValue("vendaRecorrente", true);
        setNomeRecorrencia(clienteSelecionado.nome);
      } else {
        naoVendaForm.setValue("cliente", dadosCliente);
      }

      toast.success(
        `Cliente ${clienteSelecionado.nome} carregado com sucesso!`
      );
    } else {
      toast.error("Cliente não encontrado");
    }
  };

  // Manipular envio do formulário de venda
  const onSubmitVenda = async (data: VendaSchemaType) => {
    // Verificar se há ao menos um produto
    if (data.produtos.length === 0) {
      toast.error("Adicione pelo menos um produto");
      return;
    }

    // Verificar recorrência
    if (
      data.vendaRecorrente &&
      !nomeRecorrencia &&
      !(
        isEditing &&
        initialData &&
        "nomeRecorrencia" in initialData &&
        initialData.nomeRecorrencia
      )
    ) {
      setShowRecorrenciaDialog(true);
      return;
    }

    setLoading(true);
    setFormErros(null);

    try {
      // Preparar dados do formulário
      const formData = {
        ...data,
        valorTotal: Number(data.valorTotal.toFixed(2)),
        nomeRecorrencia: data.vendaRecorrente ? nomeRecorrencia : undefined,
      };

      let result: { error?: string; success?: boolean; id?: string } = {};

      if (isEditing && initialData && "id" in initialData) {
        // Usar a função de conversão
        result = await converterCotacao(
          initialData.id as string,
          statusCotacao,
          formData as VendaFormData
        );
      } else {
        // Nova cotação
        if (statusCotacao === "pendente") {
          result = await criarCotacao({
            ...formData,
            status: statusCotacao,
          } as CotacaoFormData);
        } else if (statusCotacao === "finalizada") {
          result = await criarVenda(formData as VendaFormData);
        }
      }

      if (result.error) {
        toast.error(result.error);
        setFormErros(result.error);
      } else {
        const mensagem = isEditing
          ? statusCotacao === "finalizada"
            ? "Cotação finalizada atualizada com sucesso!"
            : "Cotação atualizada com sucesso!"
          : "Cotação registrada com sucesso!";

        toast.success(mensagem);

        // Resetar formulários apenas se não estiver editando
        if (!isEditing) {
          vendaForm.reset(defaultVendaValues);
          setCurrentProduto(resetProduto() as ProdutoEstendido);
          setObjecoesIndividuais([]);
        }

        // Navegar de volta à página de vendas após sucesso
        router.push("/vendas");
      }
    } catch (error) {
      console.error("Erro ao processar cotação:", error);
      toast.error("Ocorreu um erro ao processar a cotação");
      setFormErros(
        "Ocorreu um erro ao processar a cotação. Verifique o console para mais detalhes."
      );
    } finally {
      setLoading(false);
    }
  };

  // FUNÇÃO CORRIGIDA - Manipular envio do formulário de Cotação Cancelada
  const onSubmitNaoVenda = async (data: NaoVendaSchemaType) => {
    // NOVA VALIDAÇÃO: Verificar se há produtos migrados pendentes
    if (hasPendingMigratedProducts) {
      toast.error(
        "Adicione as informações de concorrência para todos os produtos antes de continuar"
      );
      return;
    }

    // Verificar se há ao menos um produto
    if (data.produtosConcorrencia.length === 0) {
      toast.error("Adicione pelo menos um produto");
      return;
    }

    // NOVA VALIDAÇÃO: Verificar se o formulário pode ser submetido
    if (!canSubmitForm) {
      toast.error("Finalize a adição de produtos antes de salvar");
      return;
    }

    setLoading(true);
    setFormErros(null);

    try {
      // Preparar os dados para envio
      const formData: NaoVendaFormData = {
        cliente: data.cliente,
        produtosConcorrencia: data.produtosConcorrencia.map((item) => ({
          produtoGarden: {
            nome: item.produtoGarden.nome,
            medida: item.produtoGarden.medida,
            quantidade: item.produtoGarden.quantidade,
            valor: item.produtoGarden.valor,
            comissao: item.produtoGarden.comissao || 0,
            icms:
              item.produtoGarden.icms !== null
                ? item.produtoGarden.icms
                : undefined,
            ipi:
              item.produtoGarden.ipi !== null
                ? item.produtoGarden.ipi
                : undefined,
          },
          valorConcorrencia: item.valorConcorrencia,
          nomeConcorrencia: item.nomeConcorrencia,
          icms: item.icms !== null ? item.icms : undefined,
          ipi: item.ipi !== null ? item.ipi : undefined,
          objecao: item.objecao !== null ? item.objecao : undefined,
          infoNaoDisponivel: item.infoNaoDisponivel || false,
        })),
        valorTotal: Number(data.valorTotal.toFixed(2)),
        condicaoPagamento: data.condicaoPagamento,
        objecaoGeral: data.objecaoGeral || "",
      };

      let result: { error?: string; success?: boolean; id?: string } = {};

      if (statusCotacao === "pendente") {
        // Se for uma cotação pendente, criar como cotação
        const cotacaoData: CotacaoFormData = {
          cliente: { ...formData.cliente, whatsapp: "" },
          produtos: formData.produtosConcorrencia.map((item) => ({
            nome: item.produtoGarden.nome,
            medida: item.produtoGarden.medida,
            quantidade: item.produtoGarden.quantidade,
            valor: item.produtoGarden.valor,
            comissao: item.produtoGarden.comissao,
            icms: item.produtoGarden.icms,
            ipi: item.produtoGarden.ipi,
          })),
          valorTotal: formData.valorTotal,
          condicaoPagamento: formData.condicaoPagamento,
          vendaRecorrente: false,
          status: statusCotacao,
        };

        if (isEditing && initialData && "id" in initialData) {
          result = await atualizarCotacao(
            initialData.id as string,
            cotacaoData
          );
        } else {
          result = await criarCotacao(cotacaoData);
        }
      } else if (statusCotacao === "cancelada") {
        // Cancelar cotação ou atualizar não venda
        if (isEditing && initialData && "id" in initialData) {
          // Se está editando uma cotação pendente, cancelar
          if ("status" in initialData && initialData.status === "pendente") {
            result = await cancelarCotacao(initialData.id as string, formData);
          } else {
            // Se está editando uma não venda, atualizar
            result = await atualizarNaoVenda(
              initialData.id as string,
              formData
            );
          }
        } else {
          // Criar nova não venda
          result = await criarNaoVenda(formData);
        }
      }

      if (result.error) {
        toast.error(result.error);
        setFormErros(result.error);
      } else {
        const mensagem = isEditing
          ? statusCotacao === "cancelada"
            ? "Cotação cancelada atualizada com sucesso!"
            : "Cotação atualizada com sucesso!"
          : "Cotação registrada com sucesso!";

        toast.success(mensagem);

        // Resetar formulários apenas se não estiver editando
        if (!isEditing) {
          naoVendaForm.reset(defaultNaoVendaValues);
          setCurrentProduto(resetProduto() as ProdutoEstendido);
          setProdutoConcorrencia(resetProdutoConcorrencia());
          setProdutosMigrados([]);
        }

        // Navegar de volta à página de vendas após sucesso
        router.push("/vendas");
      }
    } catch (error) {
      console.error("Erro ao processar Cotação Cancelada:", error);
      toast.error("Ocorreu um erro ao processar a Cotação Cancelada");
      setFormErros(
        "Ocorreu um erro ao processar a Cotação Cancelada. Verifique o console para mais detalhes."
      );
    } finally {
      setLoading(false);
    }
  };
  const toggleFormMode = (): void => {
    // Transferir dados do cliente entre formulários
    if (formMode === "venda") {
      const clienteData = vendaForm.getValues("cliente");
      const condicaoPagamento = vendaForm.getValues("condicaoPagamento");

      naoVendaForm.setValue("cliente", clienteData);
      naoVendaForm.setValue("condicaoPagamento", condicaoPagamento);

      // Verificar se temos produtos na venda para migrar para naoVenda
      const produtosVenda = vendaForm.getValues("produtos");
      if (produtosVenda && produtosVenda.length > 0) {
        setPrecisaMigrarProdutos(true);
      }

      setFormMode("naoVenda");
      setStatusCotacao("cancelada");
    } else {
      const clienteData = naoVendaForm.getValues("cliente");
      const condicaoPagamento = naoVendaForm.getValues("condicaoPagamento");

      vendaForm.setValue("cliente", clienteData);
      vendaForm.setValue("condicaoPagamento", condicaoPagamento);

      setFormMode("venda");
      setStatusCotacao("finalizada");
    }
  };
  // Definir o status da cotação
  const definirStatusCotacao = (status: StatusCotacao): void => {
    setStatusCotacao(status);

    if (status === "cancelada" && formMode !== "naoVenda") {
      // Se mudar para cancelada, alterar o modo do formulário também
      toggleFormMode();
    } else if (status === "finalizada" && formMode !== "venda") {
      // Se mudar para finalizada, alterar o modo do formulário também
      toggleFormMode();
    }

    toast.info(
      `Status da cotação alterado para ${status}. Salve para confirmar a alteração.`
    );
  };

  // Voltar para página de vendas
  const handleCancelar = () => {
    router.push("/vendas");
  };

  // Verificar se estamos no modo de edição e definir o título correto
  let formTitle = "Nova Cotação";
  if (isEditing) {
    if (statusCotacao === "pendente") {
      formTitle = "Editar Cotação";
    } else if (statusCotacao === "finalizada") {
      formTitle = "Editar Cotação Finalizada";
    } else if (statusCotacao === "cancelada") {
      formTitle = "Editar Cotação Cancelada";
    }
  } else {
    if (statusCotacao === "finalizada") {
      formTitle = "Registrar Cotação Finalizada";
    } else if (statusCotacao === "cancelada") {
      formTitle = "Registrar Cotação Cancelada";
    }
  }

  const [isLoadingClientes, setIsLoadingClientes] = useState<boolean>(false);

  const carregarClientesRecorrentes = useCallback(async () => {
    if (clientesRecorrentes.length > 0 || isLoadingClientes) return;

    setIsLoadingClientes(true);
    try {
      const result = await getClientesRecorrentes();
      if (result.success && result.clientes) {
        setClientesRecorrentes(result.clientes);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes recorrentes:", error);
      // Dados mockados em caso de erro
      setClientesRecorrentes([
        // Dados mockados
      ]);
    } finally {
      setIsLoadingClientes(false);
    }
  }, [clientesRecorrentes.length, isLoadingClientes]);

  const [catalogoCondicoesPagamento, setCatalogoCondicoesPagamento] = useState<
    string[]
  >(condicoesPagamentoOptions);
  useEffect(() => {
    const carregarCondicoesPagamento = async () => {
      try {
        const resultado = await getCatalogoItens("pagamento");
        if (resultado.success && resultado.itens) {
          const condicoesDoSistema = resultado.itens.map((item) => item.nome);
          // Combinar com as condições padrão, remover duplicatas
          const todasCondicoes = [
            ...new Set([...condicoesPagamentoOptions, ...condicoesDoSistema]),
          ];
          setCatalogoCondicoesPagamento(todasCondicoes);
        }
      } catch (error) {
        console.error("Erro ao carregar condições de pagamento:", error);
        // Manter as opções padrão em caso de erro
      }
    };

    carregarCondicoesPagamento();
  }, []);

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
              key={statusCotacao}
              initial={{ opacity: 0, x: formMode === "venda" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: formMode === "venda" ? 20 : -20 }}
              transition={{ duration: 0.2 }}
            >
              <Badge
                className={`px-3 py-1 ${
                  statusCotacao === "finalizada"
                    ? "bg-green-100 text-green-800"
                    : statusCotacao === "cancelada"
                    ? "bg-red-100 text-red-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {statusCotacao === "finalizada"
                  ? "Modo Cotação Finalizada"
                  : statusCotacao === "cancelada"
                  ? "Modo Cotação Cancelada"
                  : "Modo Cotação"}
              </Badge>
            </motion.div>
          </AnimatePresence>

          {isEditing && statusCotacao === "pendente" && (
            <div className="flex flex-col gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  onClick={() => definirStatusCotacao("finalizada")}
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Definir como Finalizada
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  onClick={() => definirStatusCotacao("cancelada")}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  Definir como Cancelada
                </Button>
              </motion.div>
            </div>
          )}

          {isEditing && statusCotacao !== "pendente" && (
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
                    Alternar para Cotação Cancelada
                  </>
                ) : (
                  <>
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    Alternar para Cotação Finalizada
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {formErros && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
          <p className="font-medium">Erro ao salvar formulário:</p>
          <p>{formErros}</p>
        </div>
      )}

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
                {/* Componente de Cliente */}
                <ClienteForm
                  formMode={formMode}
                  vendaForm={vendaForm}
                  naoVendaForm={naoVendaForm}
                  clientesRecorrentes={clientesRecorrentes}
                  isEditing={isEditing}
                  handleClienteRecorrenteChange={handleClienteRecorrenteChange}
                  carregarClientesRecorrentes={carregarClientesRecorrentes}
                  isLoadingClientes={isLoadingClientes}
                />

                {/* Produtos */}
                <motion.div
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Produtos</h3>
                  </div>

                  {/* ProdutoVendaForm Component */}
                  <div className="flex mb-4 justify-between mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAbrirObjecaoProduto}
                      className="text-orange-500 border-orange-300 hover:bg-orange-50 shadow-md"
                    >
                      <AlertCircle className="mr-2 h-4 w-4 " />
                      Garden não trabalha com o produto
                    </Button>
                  </div>
                  <div>
                    <ProdutoVendaForm
                      currentProduto={currentProduto}
                      handleChangeProduto={handleChangeProduto}
                      handleAddProdutoVenda={handleAddProdutoVenda}
                      statusCotacao={statusCotacao}
                      temObjecao={false}
                      setTemObjecao={function (): void {
                        throw new Error("Function not implemented.");
                      }}
                    />
                  </div>

                  {/* Lista de produtos adicionados */}
                  {vendaFields.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">
                          Produtos Adicionados ({vendaFields.length})
                        </h4>
                        {vendaFields.length > 4 && (
                          <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                              placeholder="Buscar produto adicionado"
                              className="pl-9"
                              value={produtoAddedSearchTerm}
                              onChange={(e) =>
                                setProdutoAddedSearchTerm(e.target.value)
                              }
                            />
                          </div>
                        )}
                      </div>
                      <ScrollArea
                        className={vendaFields.length > 4 ? "h-80" : "h-auto"}
                      >
                        <AnimatePresence>
                          {filteredVendaFields.map((field, index) => {
                            const produto = field as unknown as ProdutoComId;
                            const realIndex = vendaFields.findIndex((f) => {
                              const p = f as unknown as ProdutoComId;
                              return p.id === produto.id;
                            });

                            // Verificar se o produto tem objeção
                            const temObjecao = objecoesIndividuais.some(
                              (obj) => obj.produtoId === produto.id
                            );
                            const objecaoText = temObjecao
                              ? objecoesIndividuais.find(
                                  (obj) => obj.produtoId === produto.id
                                )?.objecao
                              : null;

                            return (
                              <motion.div
                                key={produto.id || index}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Card className="mb-3">
                                  <div className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center">
                                        <div>
                                          <p className="font-medium">
                                            {produto.nome}
                                          </p>
                                          <div className="flex items-center gap-6 text-sm text-gray-500">
                                            <span>
                                              {produto.quantidade}{" "}
                                              {produto.medida}
                                            </span>
                                            <span>
                                              {formatarValorBRL(
                                                produto.valor *
                                                  produto.quantidade
                                              )}
                                            </span>
                                            {produto.comissao !== undefined &&
                                              produto.comissao > 0 && (
                                                <span className="flex items-center">
                                                  {produto.comissao.toFixed(2)}%
                                                </span>
                                              )}
                                            {produto.icms !== undefined &&
                                              produto.icms > 0 && (
                                                <span>
                                                  ICMS:{" "}
                                                  {produto.icms.toFixed(2)}%
                                                </span>
                                              )}
                                            {produto.ipi !== undefined &&
                                              produto.ipi > 0 && (
                                                <span>
                                                  IPI: {produto.ipi.toFixed(2)}%
                                                </span>
                                              )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          type="button"
                                          onClick={() =>
                                            handleAddObjecaoIndividual(
                                              produto.id || ""
                                            )
                                          }
                                          className="text-orange-500"
                                        ></Button>
                                        <motion.div
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            type="button"
                                            onClick={() =>
                                              handleRemoveProdutoVenda(
                                                realIndex
                                              )
                                            }
                                          >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                          </Button>
                                        </motion.div>
                                      </div>
                                    </div>

                                    {/* Mostrar objeção se existir */}
                                    {temObjecao && objecaoText && (
                                      <div className="mt-2 pt-2 border-t border-orange-200 bg-orange-50 px-3 py-2 rounded-md">
                                        <p className="text-sm text-orange-800 flex items-center">
                                          <AlertCircle className="h-4 w-4 mr-2" />
                                          <span className="font-medium">
                                            Objeção:
                                          </span>{" "}
                                          {objecaoText}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </ScrollArea>

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
                        <FormLabel className="mb-1 flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          Condição de Pagamento*
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione uma condição de pagamento" />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogoCondicoesPagamento.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            <Input
                              className="px-8 h-10 rounded-md border border-input bg-background w-full"
                              value={
                                field.value === 0
                                  ? "0,00"
                                  : formatCurrency(
                                      Math.round(
                                        (field.value || 0) * 100
                                      ).toString()
                                    )
                              }
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(
                                  /\D/g,
                                  ""
                                );

                                // Trata explicitamente o zero
                                let numValue = 0;
                                if (rawValue !== "" && rawValue !== "0") {
                                  numValue = parseInt(rawValue, 10) / 100;
                                }

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
                          <FormLabel>Cliente Recorrente</FormLabel>
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
                  className="flex justify-between space-x-4 mt-8"
                >
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button
                      variant="outline"
                      type="button"
                      onClick={handleCancelar}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>
                  </motion.div>

                  <div className="flex space-x-4">
                    {isEditing && statusCotacao !== "cancelada" && (
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => definirStatusCotacao("cancelada")}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <ThumbsDown className="mr-2 h-4 w-4" />
                          Registrar como Cotação Cancelada
                        </Button>
                      </motion.div>
                    )}

                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Button
                        type="submit"
                        disabled={loading}
                        className={`${
                          statusCotacao === "finalizada"
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
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
                              ? "Atualizar Cotação"
                              : statusCotacao === "finalizada"
                              ? "Finalizar Cotação"
                              : "Salvar Cotação"}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>
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
                {/* Componente de Cliente */}
                <ClienteForm
                  formMode={formMode}
                  vendaForm={vendaForm}
                  naoVendaForm={naoVendaForm}
                  clientesRecorrentes={clientesRecorrentes}
                  isEditing={isEditing}
                  handleClienteRecorrenteChange={handleClienteRecorrenteChange}
                  carregarClientesRecorrentes={carregarClientesRecorrentes}
                  isLoadingClientes={isLoadingClientes}
                />

                {/* SEÇÃO CORRIGIDA - Produtos Migrados que Necessitam de Concorrência */}
                {produtosMigrados.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 7 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.2 }}
                    className="mb-8"
                  >
                    <h3 className="text-lg font-medium mb-4">
                      Produtos da Cotação Original
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Abaixo estão os produtos da cotação original. Adicione as
                      informações de concorrência para cada um.
                    </p>

                    {/* NOVO COMPONENTE DE AVISO */}
                    <ProdutosPendentesWarning />

                    <ScrollArea
                      className={
                        produtosMigrados.length > 3 ? "h-80" : "h-auto"
                      }
                    >
                      <div className="space-y-4">
                        {produtosMigrados.map((produtoMigrado, index) => (
                          <Card
                            key={index}
                            className={`mb-4 ${
                              produtoMigrado.concorrenciaAdicionada
                                ? "bg-gray-50"
                                : "border-[#00436a0e] bg-[#00436a09]"
                            }`}
                          >
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">
                                  {produtoMigrado.produto.nome}
                                </h4>
                                <Badge
                                  className={
                                    produtoMigrado.concorrenciaAdicionada
                                      ? "bg-green-100 text-green-800"
                                      : "bg-orange-100 text-orange-800"
                                  }
                                >
                                  {produtoMigrado.concorrenciaAdicionada
                                    ? "Concorrência Adicionada"
                                    : "Pendente"}
                                </Badge>
                              </div>

                              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                                <span>
                                  Quantidade:{" "}
                                  {produtoMigrado.produto.quantidade}{" "}
                                  {produtoMigrado.produto.medida}
                                </span>
                                <span>
                                  Valor:{" "}
                                  {formatarValorBRL(
                                    produtoMigrado.produto.valor *
                                      produtoMigrado.produto.quantidade
                                  )}
                                </span>
                                {produtoMigrado.produto.icms !== undefined &&
                                  produtoMigrado.produto.icms > 0 && (
                                    <span>
                                      ICMS:{" "}
                                      {produtoMigrado.produto.icms.toFixed(2)}%
                                    </span>
                                  )}
                                {produtoMigrado.produto.ipi !== undefined &&
                                  produtoMigrado.produto.ipi > 0 && (
                                    <span>
                                      IPI:{" "}
                                      {produtoMigrado.produto.ipi.toFixed(2)}%
                                    </span>
                                  )}
                              </div>

                              <Button
                                onClick={() =>
                                  handleAbrirConcorrenciaDialog(index)
                                }
                                variant={
                                  produtoMigrado.concorrenciaAdicionada
                                    ? "outline"
                                    : "default"
                                }
                                className={
                                  produtoMigrado.concorrenciaAdicionada
                                    ? "border-gray-200 text-gray-700"
                                    : "bg-[#00446A] hover:bg-[#003455]"
                                }
                                disabled={produtoMigrado.concorrenciaAdicionada}
                              >
                                {produtoMigrado.concorrenciaAdicionada
                                  ? "Concorrência já adicionada"
                                  : "Adicionar informações de concorrência"}
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </motion.div>
                )}

                {/* Produtos */}
                <motion.div
                  className="mt-6"
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.2 }}
                >
                  <h3 className="text-lg font-medium mb-4">
                    Produtos Garden vs Concorrência
                  </h3>

                  {/* Formulário de adição de produto Garden vs Concorrência */}
                  <ProdutoConcorrenciaForm
                    currentProduto={currentProduto}
                    produtoConcorrencia={produtoConcorrencia}
                    handleChangeProduto={handleChangeProduto}
                    handleChangeProdutoConcorrencia={
                      handleChangeProdutoConcorrencia
                    }
                    handleAddProdutoNaoVenda={handleAddProdutoNaoVenda}
                  />

                  {/* Lista de produtos adicionados */}
                  {naoVendaFields.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">
                          Comparações Adicionadas ({naoVendaFields.length})
                        </h4>
                        {naoVendaFields.length > 4 && (
                          <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                              placeholder="Buscar produto adicionado"
                              className="pl-9"
                              value={produtoAddedSearchTerm}
                              onChange={(e) =>
                                setProdutoAddedSearchTerm(e.target.value)
                              }
                            />
                          </div>
                        )}
                      </div>
                      <ScrollArea
                        className={
                          naoVendaFields.length > 4 ? "h-80" : "h-auto"
                        }
                      >
                        <AnimatePresence>
                          {filteredNaoVendaFields.map((field, index) => {
                            // Converter com segurança para o tipo correto
                            const item =
                              field as unknown as ProdutoConcorrenciaComId;
                            const realIndex = naoVendaFields.findIndex((f) => {
                              const p =
                                f as unknown as ProdutoConcorrenciaComId;
                              return p.id === item.id;
                            });

                            const diferenca = calcularDiferencaValor(
                              item.produtoGarden,
                              item.valorConcorrencia,
                              item.infoNaoDisponivel || false
                            );

                            return (
                              <motion.div
                                key={item.id || index}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.2 }}
                                className="mb-3"
                              >
                                <Card>
                                  <div className="p-4">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                                      <div className="flex items-center mb-3 sm:mb-0">
                                        <div>
                                          <p className="font-medium">
                                            {item.produtoGarden.nome}
                                          </p>
                                          <div className="flex items-center gap-6 text-sm text-gray-500">
                                            <span>
                                              {item.produtoGarden.quantidade}{" "}
                                              {item.produtoGarden.medida}
                                            </span>
                                            <span>
                                              {formatarValorBRL(
                                                item.produtoGarden.valor *
                                                  item.produtoGarden.quantidade
                                              )}
                                            </span>
                                            {item.produtoGarden.icms !==
                                              undefined &&
                                              item.produtoGarden.icms > 0 && (
                                                <span>
                                                  ICMS:{" "}
                                                  {item.produtoGarden.icms.toFixed(
                                                    2
                                                  )}
                                                  %
                                                </span>
                                              )}
                                            {item.produtoGarden.ipi !==
                                              undefined &&
                                              item.produtoGarden.ipi > 0 && (
                                                <span>
                                                  IPI:{" "}
                                                  {item.produtoGarden.ipi.toFixed(
                                                    2
                                                  )}
                                                  %
                                                </span>
                                              )}
                                          </div>
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
                                            handleRemoveProdutoNaoVenda(
                                              realIndex
                                            )
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
                                            Concorrência:{" "}
                                            {item.infoNaoDisponivel
                                              ? "Não disponível"
                                              : item.nomeConcorrencia}
                                          </p>
                                          <p className="text-sm text-gray-600">
                                            Valor:{" "}
                                            {item.infoNaoDisponivel
                                              ? "Não disponível"
                                              : formatarValorBRL(
                                                  item.valorConcorrencia
                                                )}
                                          </p>
                                        </div>

                                        {item.icms &&
                                          !item.infoNaoDisponivel && (
                                            <p className="text-sm text-gray-600">
                                              ICMS: {item.icms}%
                                            </p>
                                          )}

                                        {item.ipi &&
                                          !item.infoNaoDisponivel && (
                                            <p className="text-sm text-gray-600">
                                              IPI: {item.ipi}%
                                            </p>
                                          )}
                                      </div>

                                      {!item.infoNaoDisponivel && (
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
                                      )}

                                      {item.objecao &&
                                        !item.infoNaoDisponivel && (
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
                                  </div>
                                </Card>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </ScrollArea>

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
                        <FormLabel className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          Condição de Pagamento*
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione uma condição de pagamento" />
                            </SelectTrigger>
                            <SelectContent>
                              {condicoesPagamentoOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                              value={
                                field.value === 0
                                  ? "0,00"
                                  : formatCurrency(
                                      Math.round(
                                        (field.value || 0) * 100
                                      ).toString()
                                    )
                              }
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(
                                  /\D/g,
                                  ""
                                );

                                // Trata explicitamente o zero
                                let numValue = 0;
                                if (rawValue !== "" && rawValue !== "0") {
                                  numValue = parseInt(rawValue, 10) / 100;
                                }

                                field.onChange(numValue);
                              }}
                              placeholder="0,00"
                            />
                          </div>
                        </FormControl>
                        <p className="text-xs text-gray-500 mt-1">
                          Valor sugerido:{" "}
                          {formatarValorBRL(calcularValorSugeridoNaoVenda())}{" "}
                          (Soma de todos os produtos Garden)
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
                          <Textarea
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="Descreva a objeção geral para a Cotação Cancelada"
                            rows={4}
                          />
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
                  className="flex justify-between space-x-4 mt-8"
                >
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button
                      variant="outline"
                      type="button"
                      onClick={handleCancelar}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>
                  </motion.div>

                  <div className="flex space-x-4">
                    {isEditing && statusCotacao !== "finalizada" && (
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => definirStatusCotacao("finalizada")}
                          className="text-green-600 border-green-300 hover:bg-green-50"
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          Registrar como Cotação Finalizada
                        </Button>
                      </motion.div>
                    )}

                    {/* BOTÃO CORRIGIDO COM VALIDAÇÕES */}
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Button
                        type="submit"
                        disabled={loading || hasPendingMigratedProducts}
                        className={`bg-red-600 hover:bg-red-700 ${
                          hasPendingMigratedProducts
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
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
                              ? "Atualizar Cotação Cancelada"
                              : "Registrar Cotação Cancelada"}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>
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

      {/* Dialog para produto não catalogado */}
      <Dialog
        open={showProdutoNaoCatalogadoDialog}
        onOpenChange={setShowProdutoNaoCatalogadoDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar produto não catalogado</DialogTitle>
            <DialogDescription>
              Preencha os dados do produto que não está na lista de produtos
              catalogados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <FormLabel>Nome do Produto*</FormLabel>
              <Input
                value={produtoNaoCatalogado.nome}
                onChange={(e) =>
                  setProdutoNaoCatalogado((prev) => ({
                    ...prev,
                    nome: e.target.value,
                  }))
                }
                placeholder="Nome do produto"
              />
            </div>
            <div>
              <FormLabel>Medida*</FormLabel>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={produtoNaoCatalogado.medida}
                onChange={(e) =>
                  setProdutoNaoCatalogado((prev) => ({
                    ...prev,
                    medida: e.target.value,
                  }))
                }
              >
                {medidasOptions.map((medida) => (
                  <option key={medida} value={medida}>
                    {medida}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProdutoNaoCatalogadoDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddProdutoNaoCatalogado}>
              Adicionar Produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar produto com objeção */}
      <Dialog
        open={showObjecaoProdutoDialog}
        onOpenChange={setShowObjecaoProdutoDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Produto com Objeção</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Digite o nome do produto que terá a objeção Produto que não
              trabalhamos.
            </p>
            <Input
              value={nomeProdutoObjecao}
              onChange={(e) => setNomeProdutoObjecao(e.target.value)}
              placeholder="Nome do produto"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowObjecaoProdutoDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvarObjecaoProduto}>
              Adicionar Produto com Objeção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar objeção individual */}
      <Dialog open={showObjecaoDialog} onOpenChange={setShowObjecaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar objeção ao produto</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Selecione ou digite uma objeção para este produto específico.
            </p>
            <div className="space-y-4">
              <div>
                <FormLabel>Objeção</FormLabel>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={currentObjecao || ""}
                  onChange={(e) => {
                    if (e.target.value === "Outro") {
                      setCurrentObjecao("");
                    } else {
                      setCurrentObjecao(e.target.value);
                    }
                  }}
                >
                  <option value="">Selecione uma objeção</option>
                  {objOptions.map((obj) => (
                    <option key={obj} value={obj}>
                      {obj}
                    </option>
                  ))}
                </select>
              </div>

              {currentObjecao === "Outro" && (
                <div>
                  <FormLabel>Descreva a objeção</FormLabel>
                  <Input
                    value={
                      typeof currentObjecao === "string" ? currentObjecao : ""
                    }
                    onChange={(e) => setCurrentObjecao(e.target.value)}
                    placeholder="Digite a objeção personalizada"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowObjecaoDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveObjecaoIndividual}>
              Salvar Objeção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar informações de concorrência a produto migrado */}
      <Dialog
        open={showConcorrenciaDialog}
        onOpenChange={setShowConcorrenciaDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Informações de Concorrência</DialogTitle>
            <DialogDescription>
              Adicione as informações da concorrência para o produto:{" "}
              {produtoAtual?.nome}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Informações do produto original (somente leitura) */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Produto Original (Garden)</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>
                  <span className="font-medium">Nome:</span>{" "}
                  {produtoAtual?.nome}
                </p>
                <p>
                  <span className="font-medium">Medida:</span>{" "}
                  {produtoAtual?.medida}
                </p>
                <p>
                  <span className="font-medium">Quantidade:</span>{" "}
                  {produtoAtual?.quantidade}
                </p>
                <p>
                  <span className="font-medium">Valor unitário:</span>{" "}
                  {produtoAtual ? formatarValorBRL(produtoAtual.valor) : "N/A"}
                </p>
                <p>
                  <span className="font-medium">Valor total:</span>{" "}
                  {produtoAtual
                    ? formatarValorBRL(
                        produtoAtual.valor * produtoAtual.quantidade
                      )
                    : "N/A"}
                </p>
                {produtoAtual?.icms !== undefined && produtoAtual.icms > 0 && (
                  <p>
                    <span className="font-medium">ICMS:</span>{" "}
                    {produtoAtual.icms}%
                  </p>
                )}
                {produtoAtual?.ipi !== undefined && produtoAtual.ipi > 0 && (
                  <p>
                    <span className="font-medium">IPI:</span> {produtoAtual.ipi}
                    %
                  </p>
                )}
              </div>
            </div>

            {/* Informações não disponíveis toggle */}
            <div className="mb-4">
              <div className="flex flex-row items-center space-x-3 space-y-0">
                <Checkbox
                  checked={currentConcorrencia.infoNaoDisponivel}
                  onCheckedChange={(checked) => {
                    handleChangeConcorrencia(
                      "infoNaoDisponivel",
                      checked === true
                    );
                  }}
                />
                <div className="space-y-1 leading-none">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Informações da concorrência não disponíveis
                  </label>
                  <p className="text-xs text-gray-500">
                    Marque esta opção caso não tenha dados específicos da
                    concorrência
                  </p>
                </div>
              </div>
            </div>

            {/* Dados da concorrência */}
            <div
              className={`space-y-4 ${
                currentConcorrencia.infoNaoDisponivel
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
            >
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Nome da Concorrência*
                </label>
                <Input
                  value={currentConcorrencia.nomeConcorrencia || ""}
                  onChange={(e) => {
                    handleChangeConcorrencia(
                      "nomeConcorrencia",
                      e.target.value
                    );
                  }}
                  placeholder="Nome da empresa concorrente"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Valor da Concorrência*
                </label>
                <div className="relative flex items-center mt-1">
                  <span className="absolute left-3 text-gray-500">R$</span>
                  <Input
                    className="px-8 h-10 rounded-md border border-input bg-background w-full"
                    value={
                      currentConcorrencia.valorConcorrencia === 0
                        ? "0,00"
                        : formatCurrency(
                            Math.round(
                              (currentConcorrencia.valorConcorrencia || 0) * 100
                            ).toString()
                          )
                    }
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, "");

                      // Trata explicitamente o zero
                      let numValue = 0;
                      if (rawValue !== "" && rawValue !== "0") {
                        numValue = parseInt(rawValue, 10) / 100;
                      }

                      handleChangeConcorrencia("valorConcorrencia", numValue);
                    }}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    ICMS (%)
                  </label>
                  <div className="relative flex items-center mt-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={currentConcorrencia.icms || ""}
                      onChange={(e) => {
                        const value =
                          e.target.value === "" ? 0 : Number(e.target.value);
                        handleChangeConcorrencia("icms", value);
                      }}
                      className="pr-8"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 text-gray-500">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    IPI (%)
                  </label>
                  <div className="relative flex items-center mt-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={currentConcorrencia.ipi || ""}
                      onChange={(e) => {
                        const value =
                          e.target.value === "" ? 0 : Number(e.target.value);
                        handleChangeConcorrencia("ipi", value);
                      }}
                      className="pr-8"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 text-gray-500">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Objeção
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                  value={(currentConcorrencia.objecao as string) || ""}
                  onChange={(e) => {
                    const valor = e.target.value || null;
                    handleChangeConcorrencia("objecao", valor);
                  }}
                >
                  <option value="">Selecione uma objeção (opcional)</option>
                  {objOptions.map((obj) => (
                    <option key={obj} value={obj}>
                      {obj}
                    </option>
                  ))}
                </select>
              </div>

              {currentConcorrencia.objecao === "Outro" && (
                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Descreva a objeção
                  </label>
                  <Input
                    value={(currentConcorrencia.objecao as string) || ""}
                    onChange={(e) => {
                      const valor = e.target.value;
                      handleChangeConcorrencia("objecao", valor);
                    }}
                    placeholder="Digite a objeção personalizada"
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowConcorrenciaDialog(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSalvarConcorrencia();
              }}
            >
              Salvar Informações de Concorrência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
