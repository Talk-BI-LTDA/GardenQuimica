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
  X,
  Search,
  Calendar,
  RefreshCcw,
  Download,
  Lock,
  MoreVertical,
  CheckCircle,
  XCircle,
  FileText,
  ThumbsUp,
  Clock,
  Info,
  DollarSign,
  User,
  Users,
  PackageOpen,
  CalendarRange
} from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCotacoes, excluirCotacao } from "@/actions/cotacao-actions";
import { Cotacao, StatusCotacao } from "@/types/cotacao-tipos";
import { formatarValorBRL } from "@/lib/utils";
import { getVendas, excluirVenda } from "@/actions/venda-actions";
import { getNaoVendas, excluirNaoVenda } from "@/actions/nao-venda-actions";
import { Venda } from "@/types/venda";
import { NaoVenda } from "@/types/nao-venda";
import { ExportModal } from "@/components/export-modal";
import { getCatalogoItens } from "@/actions/catalogo-actions";
import { getClientesRecorrentes } from "@/actions/clientes-actions";
import { Cliente } from "@/types/venda";

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
interface CotacaoApiResponse {
  id: string;
  codigoCotacao: string;
  cliente: {
    id: string;
    nome: string;
    segmento: string;
    cnpj: string;
    razaoSocial: string | null;
    whatsapp: string | null;
    recorrente: boolean;
  };
  produtos?: Array<{
    id?: string;
    nome: string;
    medida: string;
    quantidade: number;
    valor: number;
    icms?: number;
    ipi?: number;
  }>;
  valorTotal: number;
  condicaoPagamento: string;
  vendaRecorrente: boolean;
  nomeRecorrencia?: string | null;
  status?: string | null;
  vendedorId: string;
  vendedor?: {
    name: string;
    id?: string;  // Tornando id opcional
  } | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  editedById?: string | null;
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
  produto: string;
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
  initialEstatisticas = {},
  isAdmin = false,
}: VendasTableProps) {
  const router = useRouter();
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<
    Venda | NaoVenda | null
  >(null);
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
  const [, setSegmentos] = useState<string[]>([]);
  const [, setProdutos] = useState<ProdutoOption[]>([]);
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
    objecao: "",
    clienteRecorrente: "",
    empresaConcorrente: "",
    valorConcorrenciaMin: "",
    valorConcorrenciaMax: "",
  });

  // Estado para o calendário
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [filtroAplicado, setFiltroAplicado] = useState(false);

  // Dados
  const [vendas, setVendas] = useState<Venda[]>(initialVendas);
  const [naoVendas, setNaoVendas] = useState<NaoVenda[]>(initialNaoVendas);
  const [estatisticas] = useState<Estatisticas>(initialEstatisticas);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>(initialCotacoes);

  // Carregar dados reais quando o componente é montado
  useEffect(() => {
    const carregarDados = async () => {
      setDataLoading(true);
      try {
        // Carregar vendedores (apenas para admin)
        if (isAdmin) {
          const resClientes = await getClientesRecorrentes();
          if (resClientes.success && resClientes.clientes) {
            // Usar apenas os IDs e nomes dos clientes recorrentes como "vendedores" para demonstração
            // Em um caso real, você usaria uma API real de vendedores
            const vendedoresFromClientes = resClientes.clientes.map(c => ({
              id: c.id,
              nome: c.nome
            }));
            setVendedores(vendedoresFromClientes);
          }
        }

        // Carregar segmentos do catálogo
        const resSegmentos = await getCatalogoItens("segmento");
        if (resSegmentos.success && resSegmentos.itens) {
          setSegmentos(resSegmentos.itens.map(item => item.nome));
        }

        // Carregar produtos do catálogo
        const resProdutos = await getCatalogoItens("produto");
        if (resProdutos.success && resProdutos.itens) {
          setProdutos(resProdutos.itens.map(item => ({
            id: item.id,
            nome: item.nome
          })));
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
      setVendas(initialVendas);
      setNaoVendas(initialNaoVendas);
      setCotacoes(initialCotacoes);
      return;
    }

    // Filtrar vendas
    const filteredVendas = initialVendas.filter(
      (venda) =>
        venda.cliente.nome.toLowerCase().includes(term) ||
        venda.codigoVenda.toLowerCase().includes(term)
    );

    setVendas(filteredVendas);

    // Filtrar Cotações canceladas
    const filteredNaoVendas = initialNaoVendas.filter(
      (naoVenda) =>
        naoVenda.cliente.nome.toLowerCase().includes(term) ||
        naoVenda.codigoVenda.toLowerCase().includes(term)
    );

    setNaoVendas(filteredNaoVendas);

    // Filtrar cotações pendentes
    const filteredCotacoes = initialCotacoes.filter(
      (cotacao) =>
        cotacao.cliente.nome.toLowerCase().includes(term) ||
        cotacao.codigoCotacao.toLowerCase().includes(term)
    );

    setCotacoes(filteredCotacoes);
  };

  // Função para mapear o resultado da API para o tipo Cotacao correto
  const mapToCotacao = (cotacao: CotacaoApiResponse): Cotacao => {
    // Converter cliente.razaoSocial de null para undefined se necessário
    const cliente: Cliente = {
      id: cotacao.cliente.id,
      nome: cotacao.cliente.nome,
      segmento: cotacao.cliente.segmento,
      cnpj: cotacao.cliente.cnpj,
      razaoSocial: cotacao.cliente.razaoSocial || undefined,
      whatsapp: cotacao.cliente.whatsapp || undefined,
      recorrente: cotacao.cliente.recorrente || false
    };
  
    // Garantir que produtos exista mesmo que seja um array vazio
    const produtos = cotacao.produtos || [];
  
    return {
      id: cotacao.id,
      codigoCotacao: cotacao.codigoCotacao,
      cliente: cliente,
      produtos: produtos,
      valorTotal: cotacao.valorTotal,
      condicaoPagamento: cotacao.condicaoPagamento,
      vendaRecorrente: cotacao.vendaRecorrente,
      nomeRecorrencia: cotacao.nomeRecorrencia || undefined,
      status: (cotacao.status || "pendente") as StatusCotacao,
      vendedorId: cotacao.vendedorId,
      vendedorNome: cotacao.vendedor?.name || "Sem vendedor",
      createdAt: new Date(cotacao.createdAt),
      updatedAt: new Date(cotacao.updatedAt),
      editedById: cotacao.editedById || undefined,
    };
  };
  

  const loadCotacoes = useCallback(async () => {
    if (cotacoes.length === 0 && !filtroAplicado) {
      try {
        setLoading(true);
        const response = await getCotacoes();
        if (response.success && response.cotacoes) {
          // Usar o mapeador para garantir tipos corretos
          const cotacoesFormatadas = response.cotacoes.map(mapToCotacao);
          setCotacoes(cotacoesFormatadas);
        }
      } catch (error) {
        console.error("Erro ao carregar cotações:", error);
        toast.error("Erro ao carregar cotações");
      } finally {
        setLoading(false);
      }
    }
  }, [cotacoes.length, filtroAplicado]);
  
  useEffect(() => {
    loadCotacoes();
  }, [loadCotacoes]);

  // Atualizar filtros quando as datas mudam
  useEffect(() => {
    if (dataInicio) {
      setFiltros(prev => ({
        ...prev,
        dataInicio: dataInicio.toISOString().split('T')[0]
      }));
    }
    
    if (dataFim) {
      setFiltros(prev => ({
        ...prev,
        dataFim: dataFim.toISOString().split('T')[0]
      }));
    }
  }, [dataInicio, dataFim]);

  // Filtrar dados por data
  // const handleFilterByDate = () => {
  //   if (!dataInicio || !dataFim) {
  //     toast.error("Selecione uma data inicial e final");
  //     return;
  //   }

  //   // Ajustar data final para incluir o dia inteiro
  //   const adjustedEndDate = new Date(dataFim);
  //   adjustedEndDate.setHours(23, 59, 59, 999);
    
  //   const filteredVendas = initialVendas.filter((venda) => {
  //     const vendaDate = new Date(venda.createdAt);
  //     return vendaDate >= dataInicio && vendaDate <= adjustedEndDate;
  //   });

  //   setVendas(filteredVendas);

  //   const filteredNaoVendas = initialNaoVendas.filter((naoVenda) => {
  //     const naoVendaDate = new Date(naoVenda.createdAt);
  //     return naoVendaDate >= dataInicio && naoVendaDate <= adjustedEndDate;
  //   });

  //   setNaoVendas(filteredNaoVendas);

  //   const filteredCotacoes = initialCotacoes.filter((cotacao) => {
  //     const cotacaoDate = new Date(cotacao.createdAt);
  //     return cotacaoDate >= dataInicio && cotacaoDate <= adjustedEndDate;
  //   });

  //   setCotacoes(filteredCotacoes);

  //   toast.success(`Filtrado por período: ${format(dataInicio, 'dd/MM/yyyy')} até ${format(adjustedEndDate, 'dd/MM/yyyy')}`);
  // };

  // // Selecionar o mês atual
  // const selecionarMesAtual = () => {
  //   const hoje = new Date();
  //   const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  //   const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
  //   setDataInicio(inicioMes);
  //   setDataFim(fimMes);
    
  //   // A atualização dos filtros acontece no useEffect
    
  //   // Aplicar filtro
  //   const adjustedEndDate = new Date(fimMes);
  //   adjustedEndDate.setHours(23, 59, 59, 999);
    
  //   const filteredVendas = initialVendas.filter((venda) => {
  //     const vendaDate = new Date(venda.createdAt);
  //     return vendaDate >= inicioMes && vendaDate <= adjustedEndDate;
  //   });

  //   setVendas(filteredVendas);

  //   const filteredNaoVendas = initialNaoVendas.filter((naoVenda) => {
  //     const naoVendaDate = new Date(naoVenda.createdAt);
  //     return naoVendaDate >= inicioMes && naoVendaDate <= adjustedEndDate;
  //   });

  //   setNaoVendas(filteredNaoVendas);

  //   const filteredCotacoes = initialCotacoes.filter((cotacao) => {
  //     const cotacaoDate = new Date(cotacao.createdAt);
  //     return cotacaoDate >= inicioMes && cotacaoDate <= adjustedEndDate;
  //   });

  //   setCotacoes(filteredCotacoes);

  //   toast.success("Filtrado por período: Mês atual");
  // };

  // Filtrar dados
  const aplicarFiltros = async () => {
    setLoading(true);
  
    try {
      // Aplicar filtros às vendas
      const filtrosConvertidos: Record<string, string | number | boolean> = {};
  
      // Converter filtros para tipos adequados
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) {
          if (
            [
              "valorMinimo",
              "valorMaximo",
              "valorConcorrenciaMin",
              "valorConcorrenciaMax",
            ].includes(key)
          ) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              filtrosConvertidos[key] = numValue;
            }
          } else {
            filtrosConvertidos[key] = value;
          }
        }
      });
  
      // CORREÇÃO: Verificar e corrigir a ordem das datas
      if (filtrosConvertidos.dataInicio && filtrosConvertidos.dataFim) {
        const dataInicio = new Date(filtrosConvertidos.dataInicio as string);
        const dataFim = new Date(filtrosConvertidos.dataFim as string);
        
        // Se a data inicial for depois da data final, inverta-as
        if (dataInicio > dataFim) {
          const temp = filtrosConvertidos.dataInicio;
          filtrosConvertidos.dataInicio = filtrosConvertidos.dataFim;
          filtrosConvertidos.dataFim = temp;
          console.log("Datas invertidas corrigidas:", filtrosConvertidos);
        }
      }
  
      // Obter vendas filtradas
      const resultadoVendas = await getVendas(filtrosConvertidos);
      if (resultadoVendas.success) {
        setVendas(resultadoVendas.vendas);
      }
  
      // Obter não-vendas filtradas
      const resultadoNaoVendas = await getNaoVendas(filtrosConvertidos);
      if (resultadoNaoVendas.success) {
        setNaoVendas(resultadoNaoVendas.naoVendas);
      }
  
      // Obter cotações filtradas
      console.log("Chamando getCotacoes com:", filtrosConvertidos);
      const resultadoCotacoes = await getCotacoes(filtrosConvertidos);
      console.log("Resultado de getCotacoes:", resultadoCotacoes);
      
      if (resultadoCotacoes.success) {
        // Garantir que cotacoes existe antes de mapear
        const cotacaoesArray = resultadoCotacoes.cotacoes || [];
        console.log("Número de cotações retornadas:", cotacaoesArray.length);
        
        const cotacoesFormatadas = cotacaoesArray.map(mapToCotacao);
        setCotacoes(cotacoesFormatadas);
        
        // IMPORTANTE: Marcar que um filtro foi aplicado
        setFiltroAplicado(true);
      }
  
      setFiltroAberto(false);
      toast.success("Filtros aplicados com sucesso");
    } catch (error) {
      console.error("Erro ao aplicar filtros:", error);
      toast.error("Erro ao aplicar filtros");
    } finally {
      setLoading(false);
    }
  };
  
  // Resetar filtros
  const resetarFiltros = () => {
    setFiltros({
      segmento: "",
      nomeCliente: "",
      vendedor: "",
      dataInicio: "",
      dataFim: "",
      valorMinimo: "",
      valorMaximo: "",
      produto: "",
      objecao: "",
      clienteRecorrente: "",
      empresaConcorrente: "",
      valorConcorrenciaMin: "",
      valorConcorrenciaMax: "",
    });
    setDataInicio(undefined);
    setDataFim(undefined);
    
    // Reiniciar flag de filtro aplicado para permitir carregamento automático
    setFiltroAplicado(false);
    
    // Limpar resultados de filtro
    setVendas(initialVendas);
    setNaoVendas(initialNaoVendas);
    setCotacoes(initialCotacoes);
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

          <Button variant="outline" onClick={toggleSortDirection} size="icon" className="px-2">
            {renderSortIcon()}
            <span className="sr-only">Ordenar</span>
          </Button>

          {/* <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="px-3">
                <Calendar className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Período</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-4">
                <div className="grid gap-2">
                  <div className="grid gap-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor="data-inicio" className="text-sm font-medium">Data Inicial</label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                        onClick={selecionarMesAtual}
                      >
                        Mês atual
                      </Button>
                    </div>
                    <CalendarComponent
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      initialFocus
                      locale={ptBR}
                    />
                  </div>
                  <div className="grid gap-1">
                    <label htmlFor="data-fim" className="text-sm font-medium">Data Final</label>
                    <CalendarComponent
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      initialFocus
                      locale={ptBR}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleFilterByDate}>
                    Aplicar Filtro
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover> */}

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
                <p className="text-xs text-gray-400 pl-12 mt-1">
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
          <TabsTrigger value="painel" className="flex-1">Todas as Cotações</TabsTrigger>
          <TabsTrigger value="cotacoes" className="flex-1">Cotações Pendentes</TabsTrigger>
          <TabsTrigger value="vendas" className="flex-1">Cotações Finalizadas</TabsTrigger>
          <TabsTrigger value="naovendas" className="flex-1">Cotações Canceladas</TabsTrigger>
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
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
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
                      <TableCell className="hidden md:table-cell">{item.cliente.cnpj}</TableCell>
                      <TableCell className="hidden md:table-cell">{item.cliente.whatsapp}</TableCell>

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
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
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
                      <TableCell className="hidden md:table-cell">{venda.cliente.cnpj}</TableCell>
                      <TableCell className="hidden md:table-cell">{venda.cliente.whatsapp}</TableCell>
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
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
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
                      <TableCell className="hidden md:table-cell">{naoVenda.cliente.cnpj}</TableCell>
                      <TableCell className="hidden md:table-cell">{naoVenda.cliente.whatsapp}</TableCell>

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
                      <TableCell className="hidden md:table-cell">{cotacao.cliente.cnpj}</TableCell>
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
      <Dialog open={filtroAberto} onOpenChange={setFiltroAberto}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-[#00446A]" />
              Filtrar Cotações
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1">
                <Building className="h-4 w-4 text-[#00446A]" />
                Segmento da Empresa
              </label>
              <Select
                value={filtros.segmento}
                onValueChange={(value) =>
                  setFiltros({ ...filtros, segmento: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  {dataLoading ? (
                    <div className="flex items-center justify-center p-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00446A]"></div>
                      <span className="ml-2">Carregando...</span>
                    </div>
                  ) : segmentos.length > 0 ? (
                    segmentos.map((segmento) => (
                      <SelectItem key={segmento} value={segmento}>
                        {segmento}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      Nenhum segmento disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div> */}

            {/* <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1">
                <User className="h-4 w-4 text-[#00446A]" />
                Nome do Cliente
              </label>
              <Input
                placeholder="Digite o nome do cliente"
                value={filtros.nomeCliente}
                onChange={(e) =>
                  setFiltros({ ...filtros, nomeCliente: e.target.value })
                }
              />
            </div> */}

            {isAdmin && (
              <div>
                <label className="text-sm font-medium mb-1 flex items-center gap-1">
                  <Users className="h-4 w-4 text-[#00446A]" />
                  Vendedor
                </label>
                <Select
                  value={filtros.vendedor}
                  onValueChange={(value) =>
                    setFiltros({ ...filtros, vendedor: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00446A]"></div>
                        <span className="ml-2">Carregando...</span>
                      </div>
                    ) : vendedores.length > 0 ? (
                      vendedores.map((vendedor) => (
                        <SelectItem key={vendedor.id} value={vendedor.id}>
                          {vendedor.nome}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        Nenhum vendedor disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1">
                <CalendarRange className="h-4 w-4 text-[#00446A]" />
                Período
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !dataInicio && "text-muted-foreground"
                      }`}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dataInicio ? (
                        format(dataInicio, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span>Data inicial</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !dataFim && "text-muted-foreground"
                      }`}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dataFim ? (
                        format(dataFim, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span>Data final</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-[#00446A]" />
                Intervalo de Valor
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-gray-500">
                    R$
                  </span>
                  <Input
                    className="pl-8"
                    placeholder="Mínimo"
                    value={filtros.valorMinimo}
                    onChange={(e) =>
                      setFiltros({ ...filtros, valorMinimo: e.target.value })
                    }
                  />
                </div>
                <span>até</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-gray-500">
                    R$
                  </span>
                  <Input
                    className="pl-8"
                    placeholder="Máximo"
                    value={filtros.valorMaximo}
                    onChange={(e) =>
                      setFiltros({ ...filtros, valorMaximo: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1">
                <PackageOpen className="h-4 w-4 text-[#00446A]" />
                Produtos
              </label>
              <Select
                value={filtros.produto}
                onValueChange={(value) =>
                  setFiltros({ ...filtros, produto: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {dataLoading ? (
                    <div className="flex items-center justify-center p-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00446A]"></div>
                      <span className="ml-2">Carregando...</span>
                    </div>
                  ) : produtos.length > 0 ? (
                    <>
                      <div className="px-3 py-2">
                        <Input
                          placeholder="Buscar produto..."
                          className="mb-2"
                        />
                      </div>
                      {produtos.map((produto) => (
                        <SelectItem key={produto.id} value={produto.id}>
                          {produto.nome}
                        </SelectItem>
                      ))}
                    </>
                  ) : (
                    <SelectItem value="" disabled>
                      Nenhum produto disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div> */}

            {/* Campos ilustrativos com cadeado */}
            <div className="flex items-center">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 flex items-center gap-1">
                  <Info className="h-4 w-4 text-[#00446A]" />
                  Objeções
                </label>
                <Select
                  disabled
                  value={filtros.objecao}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a objeção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preco">Preço</SelectItem>
                    <SelectItem value="prazo">Prazo</SelectItem>
                    <SelectItem value="qualidade">Qualidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Lock className="ml-2 h-4 w-4 text-gray-500" />
            </div>

            <div className="flex items-center">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 flex items-center gap-1">
                  <Info className="h-4 w-4 text-[#00446A]" />
                  Cliente Recorrente
                </label>
                <Select
                  disabled
                  value={filtros.clienteRecorrente}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Lock className="ml-2 h-4 w-4 text-gray-500" />
            </div>

            <div className="flex items-center">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 flex items-center gap-1">
                  <Info className="h-4 w-4 text-[#00446A]" />
                  Empresa Concorrente
                </label>
                <Select
                  disabled
                  value={filtros.empresaConcorrente}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a concorrência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empresa-a">Empresa A</SelectItem>
                    <SelectItem value="empresa-b">Empresa B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Lock className="ml-2 h-4 w-4 text-gray-500" />
            </div>

            <div className="flex items-center">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 flex items-center gap-1">
                  <Info className="h-4 w-4 text-[#00446A]" />
                  Valor Concorrência
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-gray-500">
                      R$
                    </span>
                    <Input
                      disabled
                      className="pl-8"
                      placeholder="Mínimo"
                    />
                  </div>
                  <span>até</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-gray-500">
                      R$
                    </span>
                    <Input
                      disabled
                      className="pl-8"
                      placeholder="Máximo"
                    />
                  </div>
                </div>
              </div>
              <Lock className="ml-2 h-4 w-4 text-gray-500" />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={resetarFiltros}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Resetar
            </Button>
            <Button variant="outline" onClick={() => setFiltroAberto(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={aplicarFiltros} disabled={loading} className="bg-[#00446A] hover:bg-[#00345A]">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Aplicando...
                </>
              ) : (
                <>
                  <Filter className="mr-2 h-4 w-4" />
                  Aplicar Filtros
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Button onClick={() => editarItem(vendaSelecionada, itemTipo)} className="bg-[#00446A] hover:bg-[#00345A]">
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