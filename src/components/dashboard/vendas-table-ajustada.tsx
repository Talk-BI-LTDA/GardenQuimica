// src/components/dashboard/vendas-table-ajustada.tsx

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Eye,
  Edit,
  Trash2,
  Filter,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  MoreVertical,
  CheckCircle,
  XCircle,
  FileText,
  ThumbsUp,
  Clock,
  Info,
  User,
  PackageOpen,
} from "lucide-react";
import { toast } from "sonner";
import { FiltrosVenda, FiltrosCotacao } from "@/types/filtros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import FiltroDialog from "@/components/FiltroDialog";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCotacoes, excluirCotacao } from "@/actions/cotacao-actions";
import { Cotacao } from "@/types/cotacao-tipos";
import { formatarValorBRL } from "@/lib/utils";
import { excluirVenda } from "@/actions/venda-actions";
import { excluirNaoVenda } from "@/actions/nao-venda-actions";
import { Venda } from "@/types/venda";
import { NaoVenda } from "@/types/nao-venda";
import { ExportModal } from "@/components/export-modal";
import { getCatalogoItens } from "@/actions/catalogo-actions";
import { getVendedores } from "@/actions/vendedores-actions";
import { getVendas } from "@/actions/venda-actions";
import { getNaoVendas } from "@/actions/nao-venda-actions";

// Tipo para as estatísticas
interface Estatisticas {
  totalOrcamentos?: number;
  totalVendas?: number;
  totalNaoVendas?: number;
  totalCotacoesPendentes?: number;
  valorTotalVendas?: number;
  valorTotalNaoVendas?: number;
  valorTotalCotacoesPendentes?: number;
}

// Tipo para os vendedores
interface Vendedor {
  id: string;
  nome: string;
}

// Tipo para os produtos
interface ProdutoOption {
  id: string;
  nome: string;
}

// Tipo para os filtros
interface Filtros {
  segmento: string;
  nomeCliente: string;
  vendedor: string;
  dataInicio: string;
  dataFim: string;
  valorMinimo: string;
  valorMaximo: string;
  produto?: string;
  produtos?: string[];
  objecao: string;
  clienteRecorrente: string;
  empresaConcorrente: string;
  valorConcorrenciaMin: string;
  valorConcorrenciaMax: string;
}

type VendasTableProps = {
  initialVendas?: Venda[];
  initialNaoVendas?: NaoVenda[];
  initialEstatisticas?: Estatisticas;
  initialCotacoes?: Cotacao[];
  isAdmin?: boolean;
};

export function VendasTableAjustada({
  initialVendas = [],
  initialNaoVendas = [],
  initialCotacoes = [],
  initialCotacoes: initialCotacoesFromProps = [],
  initialEstatisticas = {},
  isAdmin = false,
}: VendasTableProps) {
  const router = useRouter();
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<
    Venda | NaoVenda | null
  >(null);
  const [initialCotacoesLoadAttempted, setInitialCotacoesLoadAttempted] =
    useState(false);
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState(false);
  const [itemTipo, setItemTipo] = useState<"venda" | "naoVenda" | "cotacao">(
    "venda"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("painel");

  // Estados para dados reais
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [segmentos, setSegmentos] = useState<string[]>([]);
  const [produtos, setProdutos] = useState<ProdutoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Estados para filtros
  const [filtros, setFiltros] = useState<Filtros>({
    segmento: "",
    nomeCliente: "",
    vendedor: "",
    dataInicio: "",
    dataFim: "",
    valorMinimo: "",
    valorMaximo: "",
    produto: "",
    produtos: [],
    objecao: "",
    clienteRecorrente: "",
    empresaConcorrente: "",
    valorConcorrenciaMin: "",
    valorConcorrenciaMax: "",
  });

  // Estado para o calendário

  // Dados
  const [vendas, setVendas] = useState<Venda[]>(initialVendas);
  const [naoVendas, setNaoVendas] = useState<NaoVenda[]>(initialNaoVendas);
  const [estatisticas] = useState<Estatisticas>(initialEstatisticas);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>(initialCotacoes);
  const [dataInicio] = useState<Date | undefined>(undefined);
  const [dataFim] = useState<Date | undefined>(undefined);
  const [filtroAplicado, setFiltroAplicado] = useState(false);
  // Carregar dados reais quando o componente é montado
  useEffect(() => {
    const carregarDados = async () => {
      setDataLoading(true);
      try {
        // Carregar vendedores (apenas para admin)
        if (isAdmin) {
          const resVendedores = await getVendedores();
          if (resVendedores.success && resVendedores.vendedores) {
            const vendedoresFormatados = resVendedores.vendedores.map((v) => ({
              id: v.id,
              nome: v.nome,
            }));
            setVendedores(vendedoresFormatados);
          }
        }

        // Carregar segmentos do catálogo
        const resSegmentos = await getCatalogoItens("segmento");
        if (resSegmentos.success && resSegmentos.itens) {
          setSegmentos(resSegmentos.itens.map((item) => item.nome));
        }

        // Carregar produtos do catálogo
        const resProdutos = await getCatalogoItens("produto");
        if (resProdutos.success && resProdutos.itens) {
          setProdutos(
            resProdutos.itens.map((item) => ({
              id: item.id,
              nome: item.nome,
            }))
          );
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Falha ao carregar dados do sistema");
      } finally {
        setDataLoading(false);
      }
    };

    carregarDados();
  }, [isAdmin]);

  // Calcular totais dinâmicos
  const totalCotacoes = vendas.length + naoVendas.length + cotacoes.length;
  const valorTotalCotacoesPendentes = cotacoes.reduce(
    (total, cotacao) => total + cotacao.valorTotal,
    0
  );

  // Ordenar dados
  const toggleSortDirection = () => {
    const newDirection = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(newDirection);

    // Ordenar vendas por data
    const sortedVendas = [...vendas].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return newDirection === "asc" ? dateA - dateB : dateB - dateA;
    });

    setVendas(sortedVendas);

    // Ordenar Cotações canceladas por data
    const sortedNaoVendas = [...naoVendas].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return newDirection === "asc" ? dateA - dateB : dateB - dateA;
    });

    setNaoVendas(sortedNaoVendas);

    // Ordenar cotações pendentes por data
    const sortedCotacoes = [...cotacoes].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return newDirection === "asc" ? dateA - dateB : dateB - dateA;
    });

    setCotacoes(sortedCotacoes);
  };

  // Pesquisar dados
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    if (!term) {
      // Se o termo de busca estiver vazio, restaurar os dados iniciais
      if (filtroAplicado) {
        // Se o filtro estiver aplicado, mantenha os dados filtrados
        return;
      } else {
        // Se não houver filtro aplicado, restaurar os dados iniciais
        setVendas(initialVendas);
        setNaoVendas(initialNaoVendas);
        setCotacoes(initialCotacoes);
        return;
      }
    }

    // Filtrar vendas com busca ampliada
    const filteredVendas = (filtroAplicado ? vendas : initialVendas).filter(
      (venda) => {
        // Buscar em diversos campos
        return (
          // Informações básicas
          venda.cliente.nome.toLowerCase().includes(term) ||
          venda.codigoVenda.toLowerCase().includes(term) ||
          venda.vendedorNome.toLowerCase().includes(term) ||
          venda.cliente.cnpj.toLowerCase().includes(term) ||
          // Buscar também no valor
          venda.valorTotal.toString().includes(term) ||
          // Informações adicionais do cliente
          (venda.cliente.razaoSocial &&
            venda.cliente.razaoSocial.toLowerCase().includes(term)) ||
          (venda.cliente.whatsapp &&
            venda.cliente.whatsapp.toLowerCase().includes(term)) ||
          venda.cliente.segmento.toLowerCase().includes(term) ||
          // Informações de pagamento
          venda.condicaoPagamento.toLowerCase().includes(term) ||
          // Buscar em produtos
          venda.produtos.some(
            (p) =>
              p.nome.toLowerCase().includes(term) ||
              p.medida.toLowerCase().includes(term)
          )
        );
      }
    );

    setVendas(filteredVendas);

    // Filtrar Cotações canceladas com busca ampliada
    const filteredNaoVendas = (
      filtroAplicado ? naoVendas : initialNaoVendas
    ).filter((naoVenda) => {
      // Buscar em diversos campos
      return (
        // Informações básicas
        naoVenda.cliente.nome.toLowerCase().includes(term) ||
        naoVenda.codigoVenda.toLowerCase().includes(term) ||
        naoVenda.vendedorNome.toLowerCase().includes(term) ||
        naoVenda.cliente.cnpj.toLowerCase().includes(term) ||
        // Buscar também no valor
        naoVenda.valorTotal.toString().includes(term) ||
        // Informações adicionais do cliente
        (naoVenda.cliente.razaoSocial &&
          naoVenda.cliente.razaoSocial.toLowerCase().includes(term)) ||
        (naoVenda.cliente.whatsapp &&
          naoVenda.cliente.whatsapp.toLowerCase().includes(term)) ||
        naoVenda.cliente.segmento.toLowerCase().includes(term) ||
        // Informações de pagamento
        naoVenda.condicaoPagamento.toLowerCase().includes(term) ||
        // Buscar em objeção geral
        (naoVenda.objecaoGeral &&
          naoVenda.objecaoGeral.toLowerCase().includes(term)) ||
        // Buscar em produtos e concorrência
        naoVenda.produtosConcorrencia.some(
          (p) =>
            p.produtoGarden.nome.toLowerCase().includes(term) ||
            (p.nomeConcorrencia &&
              p.nomeConcorrencia.toLowerCase().includes(term)) ||
            (p.objecao && p.objecao.toLowerCase().includes(term))
        )
      );
    });

    setNaoVendas(filteredNaoVendas);

    // Filtrar cotações pendentes com busca ampliada
    const filteredCotacoes = (
      filtroAplicado ? cotacoes : initialCotacoes
    ).filter((cotacao) => {
      // Buscar em diversos campos
      return (
        // Informações básicas
        cotacao.cliente.nome.toLowerCase().includes(term) ||
        cotacao.codigoCotacao.toLowerCase().includes(term) ||
        cotacao.vendedorNome.toLowerCase().includes(term) ||
        cotacao.cliente.cnpj.toLowerCase().includes(term) ||
        // Buscar também no valor
        cotacao.valorTotal.toString().includes(term) ||
        // Informações adicionais do cliente
        (cotacao.cliente.razaoSocial &&
          cotacao.cliente.razaoSocial.toLowerCase().includes(term)) ||
        (cotacao.cliente.whatsapp &&
          cotacao.cliente.whatsapp.toLowerCase().includes(term)) ||
        cotacao.cliente.segmento.toLowerCase().includes(term) ||
        // Informações de pagamento
        cotacao.condicaoPagamento.toLowerCase().includes(term) ||
        // Buscar em produtos
        cotacao.produtos.some(
          (p) =>
            p.nome.toLowerCase().includes(term) ||
            p.medida.toLowerCase().includes(term)
        )
      );
    });

    setCotacoes(filteredCotacoes);
  };

  // Função para mapear o resultado da API para o tipo Cotacao correto

  // Atualizar filtros quando as datas mudam
  useEffect(() => {
    if (dataInicio) {
      setFiltros((prev) => ({
        ...prev,
        dataInicio: dataInicio.toISOString().split("T")[0],
      }));
    }

    if (dataFim) {
      setFiltros((prev) => ({
        ...prev,
        dataFim: dataFim.toISOString().split("T")[0],
      }));
    }
  }, [dataInicio, dataFim]);

  // Resetar filtros
  const resetarFiltros = async () => {
    setFiltros({
      segmento: "",
      nomeCliente: "",
      vendedor: "",
      dataInicio: "",
      dataFim: "",
      valorMinimo: "",
      valorMaximo: "",
      produto: "",
      produtos: [],
      objecao: "",
      clienteRecorrente: "",
      empresaConcorrente: "",
      valorConcorrenciaMin: "",
      valorConcorrenciaMax: "",
    });

    setFiltroAplicado(false);
    setLoading(true);
    try {
      // Buscar dados iniciais novamente
      const [resVendas, resNaoVendas, resCotacoes] = await Promise.all([
        getVendas(),
        getNaoVendas(),
        getCotacoes(), // Esta função já retorna Cotacao[] formatado
      ]);

      // Atualizar estados com os resultados
      if (resVendas.success && resVendas.vendas) {
        setVendas(resVendas.vendas);
      } else {
        setVendas(initialVendas); // Fallback para dados iniciais
        console.error(
          "Erro ao buscar vendas ao resetar filtros:",
          resVendas.error
        );
      }

      if (resNaoVendas.success && resNaoVendas.naoVendas) {
        setNaoVendas(resNaoVendas.naoVendas);
      } else {
        setNaoVendas(initialNaoVendas); // Fallback
        console.error(
          "Erro ao buscar não vendas ao resetar filtros:",
          resNaoVendas.error
        );
      }

      // CORREÇÃO PRINCIPAL AQUI:
      // Os dados de resCotacoes.cotacoes já estão no formato Cotacao[]
      // devido às correções na server action getCotacoes.
      // Não é mais necessário mapear aqui.
      if (resCotacoes.success && resCotacoes.cotacoes) {
        setCotacoes(resCotacoes.cotacoes);
      } else {
        setCotacoes(initialCotacoes); // Fallback
        console.error(
          "Erro ao buscar cotações ao resetar filtros:",
          resCotacoes.error
        );
      }

      toast.success("Filtros resetados com sucesso");
    } catch (error) {
      console.error("Erro ao resetar filtros:", error);
      toast.error("Erro ao resetar filtros");
      // Restaurar para os dados iniciais em caso de erro na chamada da API
      setVendas(initialVendas);
      setNaoVendas(initialNaoVendas);
      setCotacoes(initialCotacoes);
    } finally {
      setLoading(false);
    }
  };

  // Ver detalhes
  const verDetalhes = (
    item: Venda | NaoVenda | Cotacao,
    tipo: "venda" | "naoVenda" | "cotacao"
  ) => {
    if (tipo === "cotacao") {
      const cotacaoAdaptada = {
        ...item,
        codigoVenda: (item as Cotacao).codigoCotacao,
      } as unknown as Venda | NaoVenda;

      setVendaSelecionada(cotacaoAdaptada);
    } else {
      setVendaSelecionada(item as Venda | NaoVenda);
    }

    setItemTipo(tipo);
    setDetalhesAbertos(true);
  };

  // Editar item
  const editarItem = (
    item: Venda | NaoVenda | Cotacao,
    tipo: "venda" | "naoVenda" | "cotacao"
  ) => {
    if (tipo === "venda") {
      router.push(`/vendas/${item.id}/editar?modo=finalizada`);
    } else if (tipo === "naoVenda") {
      router.push(`/vendas/${item.id}/editar?modo=cancelada`);
    } else {
      router.push(`/vendas/${item.id}/editar?modo=pendente`);
    }
  };

  // Excluir item
  const confirmarExclusao = (
    item: Venda | NaoVenda | Cotacao,
    tipo: "venda" | "naoVenda" | "cotacao"
  ) => {
    if (tipo === "cotacao") {
      // Adaptar cotação para o formato esperado
      const cotacaoAdaptada = {
        ...item,
        codigoVenda: (item as Cotacao).codigoCotacao,
      } as unknown as Venda | NaoVenda;

      setVendaSelecionada(cotacaoAdaptada);
    } else {
      setVendaSelecionada(item as Venda | NaoVenda);
    }

    setItemTipo(tipo);
    setConfirmacaoExclusao(true);
  };

  const excluirItemSelecionado = async () => {
    if (!vendaSelecionada) return;

    setLoading(true);

    try {
      let resultado;

      if (itemTipo === "venda") {
        resultado = await excluirVenda(vendaSelecionada.id as string);

        if (resultado.success) {
          toast.success("Cotação finalizada excluída com sucesso");
          setVendas(vendas.filter((v) => v.id !== vendaSelecionada.id));
        } else {
          toast.error(resultado.error || "Erro ao excluir cotação finalizada");
        }
      } else if (itemTipo === "naoVenda") {
        resultado = await excluirNaoVenda(vendaSelecionada.id as string);

        if (resultado.success) {
          toast.success("Cotação cancelada excluída com sucesso");
          setNaoVendas(naoVendas.filter((v) => v.id !== vendaSelecionada.id));
        } else {
          toast.error(resultado.error || "Erro ao excluir cotação cancelada");
        }
      } else if (itemTipo === "cotacao") {
        // Nova lógica para excluir cotações pendentes
        resultado = await excluirCotacao(vendaSelecionada.id as string);

        if (resultado.success) {
          toast.success("Cotação pendente excluída com sucesso");
          setCotacoes(cotacoes.filter((c) => c.id !== vendaSelecionada.id));
        } else {
          toast.error(resultado.error || "Erro ao excluir cotação pendente");
        }
      }
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      const tipoMensagem =
        itemTipo === "venda"
          ? "cotação finalizada"
          : itemTipo === "naoVenda"
          ? "cotação cancelada"
          : "cotação pendente";

      toast.error(`Erro ao excluir ${tipoMensagem}`);
    } finally {
      setConfirmacaoExclusao(false);
      setVendaSelecionada(null);
      setLoading(false);
    }
  };

  // Renderizar ícone de ordenação
  const renderSortIcon = () => {
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  // Função para combinar e ordenar todos os itens para a tab "Todas as Cotações"
  const getAllItems = () => {
    const allItems: Array<{
      item: Venda | NaoVenda | Cotacao;
      tipo: "venda" | "naoVenda" | "cotacao";
      data: Date;
    }> = [];

    // Adicionar vendas
    vendas.forEach((venda) => {
      allItems.push({
        item: venda,
        tipo: "venda",
        data: new Date(venda.createdAt),
      });
    });

    // Adicionar não vendas
    naoVendas.forEach((naoVenda) => {
      allItems.push({
        item: naoVenda,
        tipo: "naoVenda",
        data: new Date(naoVenda.createdAt),
      });
    });

    // Adicionar cotações pendentes
    cotacoes.forEach((cotacao) => {
      allItems.push({
        item: cotacao,
        tipo: "cotacao",
        data: new Date(cotacao.createdAt),
      });
    });

    // Ordenar por data
    return allItems.sort((a, b) => {
      return sortDirection === "asc"
        ? a.data.getTime() - b.data.getTime()
        : b.data.getTime() - a.data.getTime();
    });
  };

  const aplicarFiltros = async () => {
    setLoading(true);
    try {
      setFiltroAplicado(true);

      const filtrosCotacao: FiltrosCotacao = {
        segmento: filtros.segmento || undefined,
        nomeCliente: filtros.nomeCliente || undefined,
        vendedor: filtros.vendedor || undefined,
        dataInicio: filtros.dataInicio || undefined,
        dataFim: filtros.dataFim || undefined,
        valorMinimo: filtros.valorMinimo || undefined,
        valorMaximo: filtros.valorMaximo || undefined,
        produto: filtros.produto || undefined,
        produtos:
          filtros.produtos && filtros.produtos.length > 0
            ? filtros.produtos
            : filtros.produto
            ? [filtros.produto]
            : undefined,
        objecao: filtros.objecao || undefined,
        clienteRecorrente: filtros.clienteRecorrente || undefined,
        empresaConcorrente: filtros.empresaConcorrente || undefined,
        valorConcorrenciaMin: filtros.valorConcorrenciaMin || undefined,
        valorConcorrenciaMax: filtros.valorConcorrenciaMax || undefined,
      };

      const filtrosVenda: FiltrosVenda = {
        segmento: filtros.segmento || undefined,
        dataInicio: filtros.dataInicio || undefined,
        dataFim: filtros.dataFim || undefined,
        valorMinimo: filtros.valorMinimo
          ? parseFloat(filtros.valorMinimo)
          : undefined,
        valorMaximo: filtros.valorMaximo
          ? parseFloat(filtros.valorMaximo)
          : undefined,
        vendedorId: filtros.vendedor || undefined,
        produtoId: filtros.produto || undefined,
        // Adicionando outros campos de FiltrosCotacao que também são válidos para FiltrosVenda
        nomeCliente: filtros.nomeCliente || undefined,
        produtos:
          filtros.produtos && filtros.produtos.length > 0
            ? filtros.produtos
            : filtros.produto
            ? [filtros.produto]
            : undefined,
        clienteRecorrente: filtros.clienteRecorrente || undefined,
      };

      const [resVendas, resNaoVendas, resCotacoes] = await Promise.all([
        getVendas(filtrosVenda),
        getNaoVendas(filtrosVenda), // Assumindo que getNaoVendas também aceita FiltrosVenda
        getCotacoes(filtrosCotacao),
      ]);

      if (resVendas.success && resVendas.vendas) {
        setVendas(resVendas.vendas);
      } else {
        setVendas([]);
        console.error("Erro ao aplicar filtros em vendas:", resVendas.error);
      }

      if (resNaoVendas.success && resNaoVendas.naoVendas) {
        setNaoVendas(resNaoVendas.naoVendas);
      } else {
        setNaoVendas([]);
        console.error(
          "Erro ao aplicar filtros em não vendas:",
          resNaoVendas.error
        );
      }

      // CORREÇÃO PRINCIPAL AQUI:
      // Remover a chamada a mapToCotacao, pois getCotacoes já retorna Cotacao[]
      if (resCotacoes.success && resCotacoes.cotacoes) {
        setCotacoes(resCotacoes.cotacoes);
      } else {
        setCotacoes([]);
        console.error(
          "Erro ao aplicar filtros em cotações:",
          resCotacoes.error
        );
      }

      toast.success("Filtros aplicados com sucesso");
    } catch (error) {
      console.error("Erro ao aplicar filtros:", error);
      toast.error("Erro ao aplicar filtros");
    } finally {
      setLoading(false);
    }
  };

  // para verificar o estado filtroAplicado
  const loadCotacoes = useCallback(async () => {
    // Só executa se nenhum filtro estiver aplicado E a carga inicial de cotações não foi tentada.
    if (!filtroAplicado && !initialCotacoesLoadAttempted) {
      // Indicar que estamos iniciando o processo de carregamento dos dados da tabela de cotações
      setDataLoading(true);
      // setLoading(true); // Use setLoading se for um indicador de loading mais geral para todas as ações

      if (initialCotacoesFromProps.length > 0) {
        // Se houver cotações iniciais das props, usa elas.
        setCotacoes(initialCotacoesFromProps);
        setInitialCotacoesLoadAttempted(true); // Marca que a carga inicial (via props) foi feita
        setDataLoading(false);
        // setLoading(false);
      } else {
        // Não há cotações iniciais via props, então busca da API.
        try {
          const response = await getCotacoes(); // Presume que getCotacoes já retorna Cotacao[] formatado
          if (response.success && response.cotacoes) {
            setCotacoes(response.cotacoes);
          } else {
            console.error(
              "Erro ao carregar cotações iniciais:",
              response.error
            );
            setCotacoes([]); // Define como vazio se a API falhar ou não retornar cotações
            if (response.error) {
              // Só mostra toast se houver mensagem de erro da API
              toast.error(`Falha ao carregar cotações: ${response.error}`);
            } else {
              toast.error("Falha ao carregar cotações.");
            }
          }
        } catch (error) {
          console.error("Erro crítico ao carregar cotações:", error);
          setCotacoes([]); // Define como vazio em caso de exceção
          toast.error("Erro crítico ao carregar cotações.");
        } finally {
          setInitialCotacoesLoadAttempted(true);
          setDataLoading(false);
        }
      }
    } else if (!filtroAplicado && initialCotacoesLoadAttempted) {
      setDataLoading(false);
    }
  }, [initialCotacoesFromProps, filtroAplicado, initialCotacoesLoadAttempted]);

  useEffect(() => {
    loadCotacoes();
  }, [loadCotacoes]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho e filtros */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <h2 className="text-2xl font-semibold">Painel de Cotações</h2>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="relative flex-grow md:flex-grow-0 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar..."
              className="pl-9"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          <Button
            variant="outline"
            onClick={toggleSortDirection}
            size="icon"
            className="px-2"
          >
            {renderSortIcon()}
            <span className="sr-only">Ordenar</span>
          </Button>

          <Button variant="outline" onClick={() => setFiltroAberto(true)}>
            <Filter className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Filtros</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Gerar Relatório</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsExportModalOpen(true)}>
                Exportar Relatório Personalizado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <FiltroDialog
        open={filtroAberto}
        onOpenChange={setFiltroAberto}
        filtros={filtros}
        setFiltros={setFiltros}
        aplicarFiltros={aplicarFiltros}
        resetarFiltros={resetarFiltros}
        loading={loading}
        vendedores={vendedores}
        segmentos={segmentos}
        produtos={produtos}
        isAdmin={isAdmin}
      />
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-500">Total de Cotações</p>
                </div>
                <h3 className="text-2xl pl-12 font-bold mt-1">
                  {totalCotacoes}
                </h3>
                <p className="text-xs text-gray-400 pl-12 mt-1">
                  {formatarValorBRL(
                    (estatisticas.valorTotalVendas || 0) +
                      (estatisticas.valorTotalNaoVendas || 0) +
                      valorTotalCotacoesPendentes
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="bg-orange-100 p-2 rounded-full">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <p className="text-sm text-gray-500">Cotações Pendentes</p>
                </div>
                <h3 className="text-2xl pl-12 font-bold mt-1">
                  {cotacoes.length}
                </h3>
                <p className="text-sm text-gray-400 pl-12 mt-1">
                  {formatarValorBRL(valorTotalCotacoesPendentes)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 p-2 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-500">Cotações Finalizadas</p>
                </div>
                <h3 className="text-2xl pl-12 font-bold mt-1">
                  {estatisticas.totalVendas || 0}
                </h3>
                <p className="text-xs text-gray-400 pl-12 mt-1">
                  {formatarValorBRL(estatisticas.valorTotalVendas || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="bg-red-100 p-2 rounded-full">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <p className="text-sm text-gray-500">Cotações Canceladas</p>
                </div>
                <h3 className="text-2xl pl-12 font-bold mt-1">
                  {estatisticas.totalNaoVendas || 0}
                </h3>
                <p className="text-xs text-gray-400 pl-12 mt-1">
                  {formatarValorBRL(estatisticas.valorTotalNaoVendas || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-center gap-4 bg-slate-50 py-6 px-4 md:px-8 rounded-lg">
        <div className="flex-1 text-center">
          <h3 className="text-lg font-semibold text-[#001f31] mb-4">
            Registrar Nova Cotação
          </h3>
          <div className="flex gap-3 justify-center">
            <Link href="/vendas/nova">
              <Button className="bg-green-600 px-4 md:!px-10 h-12 text-md hover:bg-green-700">
                <ThumbsUp className="h-5 w-5 md:h-10 md:w-10 mr-2" />
                Nova Cotação
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Registre cotações finalizadas ou cotações canceladas para análise
            comparativa
          </p>
        </div>
      </div>

      {/* Tabs e Tabela */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="bg-gray-100 p-1 w-full overflow-x-auto flex-nowrap whitespace-nowrap">
          <TabsTrigger value="painel" className="flex-1">
            Todas as Cotações
          </TabsTrigger>
          <TabsTrigger value="cotacoes" className="flex-1">
            Cotações Pendentes
          </TabsTrigger>
          <TabsTrigger value="vendas" className="flex-1">
            Cotações Finalizadas
          </TabsTrigger>
          <TabsTrigger value="naovendas" className="flex-1">
            Cotações Canceladas
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo da Tab Painel - TODAS AS COTAÇÕES */}
        <TabsContent value="painel">
          <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Contato
                  </TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-32">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00446A]"></div>
                        <span className="ml-2">Carregando dados...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : getAllItems().length > 0 ? (
                  getAllItems().map(({ item, tipo }, index) => (
                    <TableRow key={`${tipo}-${item.id}-${index}`}>
                      <TableCell className="font-medium">
                        {tipo === "cotacao"
                          ? (item as Cotacao).codigoCotacao
                          : (item as Venda | NaoVenda).codigoVenda}
                      </TableCell>
                      <TableCell>{item.vendedorNome}</TableCell>
                      <TableCell>{item.cliente.nome}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {item.cliente.cnpj}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {item.cliente.whatsapp}
                      </TableCell>

                      <TableCell>{formatarValorBRL(item.valorTotal)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            tipo === "venda"
                              ? "bg-green-100 text-green-800"
                              : tipo === "naoVenda"
                              ? "bg-red-100 text-red-800"
                              : "bg-orange-100 text-orange-800"
                          }
                        >
                          {tipo === "venda"
                            ? "Finalizada"
                            : tipo === "naoVenda"
                            ? "Cancelada"
                            : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.createdAt), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => verDetalhes(item, tipo)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => editarItem(item, tipo)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() => confirmarExclusao(item, tipo)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center h-32 text-gray-500"
                    >
                      Nenhuma cotação encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Conteúdo da Tab Vendas */}
        <TabsContent value="vendas">
          <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Contato
                  </TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-32">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00446A]"></div>
                        <span className="ml-2">Carregando dados...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : vendas.length > 0 ? (
                  vendas.map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-medium">
                        {venda.codigoVenda}
                      </TableCell>
                      <TableCell>{venda.vendedorNome}</TableCell>
                      <TableCell>{venda.cliente.nome}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {venda.cliente.cnpj}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {venda.cliente.whatsapp}
                      </TableCell>
                      <TableCell>
                        {formatarValorBRL(venda.valorTotal)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(venda.createdAt), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => verDetalhes(venda, "venda")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => editarItem(venda, "venda")}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() =>
                                  confirmarExclusao(venda, "venda")
                                }
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center h-32 text-gray-500"
                    >
                      Nenhuma cotação finalizada encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Conteúdo da Tab Cotações canceladas */}
        <TabsContent value="naovendas">
          <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Contato
                  </TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Objeção</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-32">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00446A]"></div>
                        <span className="ml-2">Carregando dados...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : naoVendas.length > 0 ? (
                  naoVendas.map((naoVenda) => (
                    <TableRow key={naoVenda.id}>
                      <TableCell className="font-medium">
                        {naoVenda.codigoVenda}
                      </TableCell>
                      <TableCell>{naoVenda.vendedorNome}</TableCell>
                      <TableCell>{naoVenda.cliente.nome}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {naoVenda.cliente.cnpj}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {naoVenda.cliente.whatsapp}
                      </TableCell>

                      <TableCell>
                        {formatarValorBRL(naoVenda.valorTotal)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-100">
                          {naoVenda.objecaoGeral ? "Possui" : "Não possui"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(naoVenda.createdAt), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => verDetalhes(naoVenda, "naoVenda")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => editarItem(naoVenda, "naoVenda")}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() =>
                                  confirmarExclusao(naoVenda, "naoVenda")
                                }
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center h-32 text-gray-500"
                    >
                      Nenhuma cotação cancelada encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Conteúdo da Tab Cotações Pendentes */}
        <TabsContent value="cotacoes">
          <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-32">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00446A]"></div>
                        <span className="ml-2">Carregando dados...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : cotacoes.length > 0 ? (
                  cotacoes.map((cotacao) => (
                    <TableRow key={cotacao.id}>
                      <TableCell className="font-medium">
                        {cotacao.codigoCotacao}
                      </TableCell>
                      <TableCell>{cotacao.vendedorNome}</TableCell>
                      <TableCell>{cotacao.cliente.nome}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {cotacao.cliente.cnpj}
                      </TableCell>
                      <TableCell>
                        {formatarValorBRL(cotacao.valorTotal)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-orange-100 text-orange-800"
                        >
                          Pendente
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(cotacao.createdAt), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => verDetalhes(cotacao, "cotacao")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => editarItem(cotacao, "cotacao")}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() =>
                                  confirmarExclusao(cotacao, "cotacao")
                                }
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center h-32 text-gray-500"
                    >
                      Nenhuma cotação pendente encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de Filtros */}

      {/* Dialog de Detalhes */}
      {vendaSelecionada && (
        <Dialog open={detalhesAbertos} onOpenChange={setDetalhesAbertos}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {itemTipo === "venda" ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Detalhes da Cotação Finalizada
                  </>
                ) : itemTipo === "naoVenda" ? (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    Detalhes da Cotação Cancelada
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 text-orange-600" />
                    Detalhes da Cotação Pendente
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <FileText className="h-4 w-4 text-[#00446A]" />
                  Informações Gerais
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Código:</span>
                    <span className="font-medium">
                      {vendaSelecionada.codigoVenda}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Data:</span>
                    <span className="font-medium">
                      {format(
                        new Date(vendaSelecionada.createdAt),
                        "dd/MM/yyyy",
                        { locale: ptBR }
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vendedor:</span>
                    <span className="font-medium">
                      {vendaSelecionada.vendedorNome}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valor Total:</span>
                    <span className="font-medium">
                      {formatarValorBRL(vendaSelecionada.valorTotal)}
                    </span>
                  </div>
                  {itemTipo !== "cotacao" && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Condição de Pagamento:
                      </span>
                      <span className="font-medium">
                        {vendaSelecionada.condicaoPagamento}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <User className="h-4 w-4 text-[#00446A]" />
                  Dados do Cliente
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nome:</span>
                    <span className="font-medium">
                      {vendaSelecionada.cliente.nome}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">CNPJ:</span>
                    <span className="font-medium">
                      {vendaSelecionada.cliente.cnpj}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Segmento:</span>
                    <span className="font-medium">
                      {vendaSelecionada.cliente.segmento}
                    </span>
                  </div>
                  {vendaSelecionada.cliente.razaoSocial && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Razão Social:</span>
                      <span className="font-medium">
                        {vendaSelecionada.cliente.razaoSocial}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                <PackageOpen className="h-4 w-4 text-[#00446A]" />
                {itemTipo === "venda"
                  ? "Produtos"
                  : itemTipo === "naoVenda"
                  ? "Produtos Garden vs Concorrência"
                  : "Produtos"}
              </h4>

              {itemTipo === "venda" ? (
                // Produtos para venda
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(vendaSelecionada as Venda).produtos?.map(
                    (produto, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 p-3 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">{produto.nome}</p>
                          <p className="text-sm text-gray-500">
                            {produto.quantidade} {produto.medida} x{" "}
                            {formatarValorBRL(produto.valor)}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatarValorBRL(produto.quantidade * produto.valor)}
                        </p>
                      </div>
                    )
                  ) || <p>Nenhum produto encontrado</p>}
                </div>
              ) : itemTipo === "naoVenda" ? (
                // Produtos para Cotação cancelada (comparação com concorrência)
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {(vendaSelecionada as NaoVenda).produtosConcorrencia?.map(
                    (item, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <p className="font-medium">
                              {item.produtoGarden.nome}
                            </p>
                            <p className="text-sm text-gray-500">
                              {item.produtoGarden.quantidade}{" "}
                              {item.produtoGarden.medida} x{" "}
                              {formatarValorBRL(item.produtoGarden.valor)}
                            </p>
                          </div>
                          <p className="font-medium">
                            {formatarValorBRL(
                              item.produtoGarden.quantidade *
                                item.produtoGarden.valor
                            )}
                          </p>
                        </div>

                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex justify-between items-center">
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
                                  : formatarValorBRL(item.valorConcorrencia)}
                              </p>
                            </div>

                            {!item.infoNaoDisponivel && item.icms && (
                              <p className="text-sm text-gray-600">
                                ICMS: {item.icms}%
                              </p>
                            )}
                          </div>

                          {!item.infoNaoDisponivel && item.objecao && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Objeção:</span>{" "}
                              {item.objecao}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  ) || <p>Nenhuma informação de concorrência encontrada</p>}
                </div>
              ) : (
                // Produtos para cotação pendente
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(vendaSelecionada as unknown as Cotacao).produtos?.map(
                    (produto, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 p-3 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">{produto.nome}</p>
                          <p className="text-sm text-gray-500">
                            {produto.quantidade} {produto.medida} x{" "}
                            {formatarValorBRL(produto.valor)}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatarValorBRL(produto.quantidade * produto.valor)}
                        </p>
                      </div>
                    )
                  ) || <p>Nenhum produto encontrado</p>}
                </div>
              )}
            </div>

            {/* Exibir objeção geral se for Cotação Cancelada */}
            {itemTipo === "naoVenda" &&
              (vendaSelecionada as NaoVenda).objecaoGeral && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Info className="h-4 w-4 text-[#00446A]" />
                    Objeção Geral
                  </h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-700">
                      {(vendaSelecionada as NaoVenda).objecaoGeral}
                    </p>
                  </div>
                </div>
              )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setDetalhesAbertos(false)}
              >
                Fechar
              </Button>
              <Button
                onClick={() => editarItem(vendaSelecionada, itemTipo)}
                className="bg-[#00446A] hover:bg-[#00345A]"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={confirmacaoExclusao} onOpenChange={setConfirmacaoExclusao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              {itemTipo === "venda"
                ? "esta cotação finalizada"
                : itemTipo === "naoVenda"
                ? "esta cotação cancelada"
                : "esta cotação pendente"}
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmacaoExclusao(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={excluirItemSelecionado}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ExportModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        filters={filtros}
        activeTab={activeTab}
      />
    </div>
  );
}
