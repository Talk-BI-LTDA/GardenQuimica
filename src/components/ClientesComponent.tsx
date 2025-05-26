"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  // Sector,
  BarChart,
  Bar,
} from "recharts";
import {
  Filter,
  ArrowUp,
  ArrowDown,
  Search,
  Calendar,
  MoreVertical,
  DollarSign,
  Users,
  UserCheck,
  RefreshCcw,
  AlertCircle,
  X,
  RepeatIcon,
  MoreHorizontal,
  Edit,
  Timer,
  Info,
  BadgePercent,
  PiggyBank,
  Star,
  PlusCircle,
  Lock,
  Eye,
  ShoppingCart,
  Loader2,
  Trash,
  CalendarIcon,
} from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
// import { PieChartShapeProps } from "@/types/grafico-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Import dos tipos
import {
  Cliente,
  ClienteFiltros,
  EstatisticasClientes,
  Venda,
} from "@/types/cliente";

// Import das actions
import {
  getClientes,
  getClienteById,
  getEstatisticasClientes,
  getVendasCliente,
  getSegmentos,
  excluirCliente,
  // getDadosMensaisComparacao,
} from "@/actions/clientes-actions";

// Import de componentes adicionais
import EditarClienteForm from "@/app/(dashboard)/clientes/components/EditarClienteForm";
// import ComparacaoMensal from "@/app/(dashboard)/clientes/components/ComparacaoMensal";

interface PieDataPoint {
  name: string;
  value: number;
  color: string;
}

interface SegmentoChartData {
  segmento: string;
  clientes: number;
  valorTotal: number;
}

interface DonutChartProps {
  data: PieDataPoint[];
  title: string;
  height?: number;
}

interface SessionProps {
  user: {
    role: string;
    id: string;
  };
}

interface PeriodoOption {
  label: string;
  value: string;
  fn: () => DateRange | undefined;
}

// Formatador para valores monetários
const formatarValorBRL = (valor: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
};

// Formatador para datas
const formatDate = (date: Date | null | undefined): string => {
  if (!date) return "N/A";
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
};

// Componente para o gráfico de pizza (donut)
const DonutChart: React.FC<DonutChartProps> = ({ data, title, height = 320 }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  // Verificar se temos dados válidos
  if (!data || data.length === 0 || data.every((item) => item.value === 0)) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <AlertCircle className="mx-auto h-12 w-12 mb-2" />
          <p>Sem dados disponíveis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="mb-2 text-center">
        <h3 className="text-md font-medium">{title}</h3>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            onMouseEnter={onPieEnter}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-4 mt-2">
        {data.map((entry, index) => (
          <div
            key={`legend-${index}`}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setActiveIndex(index)}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">
              {entry.name}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente principal da página de clientes
const ClientesComponent: React.FC<{ session: SessionProps }> = ({ session }) => {
  const router = useRouter();

  // Estados para dados
  const [activeTab, setActiveTab] = useState<
    "todos" | "recorrentes" | "naoRecorrentes"
  >("todos");
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(
    null
  );
  const [vendasCliente, setVendasCliente] = useState<Venda[]>([]);
  const [segmentos, setSegmentos] = useState<string[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Estados para modais
  const [vendasClienteModalAberta, setVendasClienteModalAberta] =
    useState(false);
  const [clienteDetalhesAberto, setClienteDetalhesAberto] = useState(false);
  const [novoClienteModalAberto, setNovoClienteModalAberto] = useState(false);
  const [editarClienteModalAberto, setEditarClienteModalAberto] =
    useState(false);
  const [excluirClienteModalAberto, setExcluirClienteModalAberto] =
    useState(false);

  // Estados para estatísticas
  const [estatisticas, setEstatisticas] = useState<EstatisticasClientes | null>(
    null
  );

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [sortField, setSortField] = useState<keyof Cliente>("valorTotal");
  const [segmentoFiltro, setSegmentoFiltro] = useState<string | undefined>(
    undefined
  );
  const [classificacaoFiltro, setClassificacaoFiltro] = useState<string[]>([]);
  const [filtro, setFiltro] = useState<ClienteFiltros>({
    recorrencia: "todos",
    ordenacao: {
      campo: "valorTotal",
      ordem: "desc",
    },
    itensPorPagina: 10,
    pagina: 1,
  });

  // Opções de filtro de período predefinidas
  const periodoOptions: PeriodoOption[] = useMemo(() => [
    {
      label: "Último mês",
      value: "lastMonth",
      fn: () => {
        const today = new Date();
        return { from: subDays(today, 30), to: today };
      },
    },
    {
      label: "Últimos 3 meses",
      value: "last3Months",
      fn: () => {
        const today = new Date();
        return { from: subDays(today, 90), to: today };
      },
    },
    {
      label: "Últimos 6 meses",
      value: "last6Months",
      fn: () => {
        const today = new Date();
        return { from: subDays(today, 180), to: today };
      },
    },
    {
      label: "Este ano",
      value: "thisYear",
      fn: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), 0, 1);
        return { from: firstDay, to: today };
      },
    },
    {
      label: "Ano passado",
      value: "lastYear",
      fn: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear() - 1, 0, 1);
        const lastDay = new Date(today.getFullYear() - 1, 11, 31);
        return { from: firstDay, to: lastDay };
      },
    },
    {
      label: "Todo o período",
      value: "allTime",
      fn: () => {
        return undefined;
      },
    },
  ], []);

  // Função para carregar clientes com filtros - memoizada para evitar recriação
  const carregarClientes = useCallback(
    async (filtrosAtuais: ClienteFiltros) => {
      setLoading(true);
      try {
        const resultado = await getClientes(filtrosAtuais);
        if (resultado.success && resultado.clientes) {
          setClientes(resultado.clientes);
          setTotalPaginas(resultado.totalPaginas || 1);
        } else if (resultado.error) {
          toast.error(resultado.error);
        }
      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        toast.error("Ocorreu um erro ao carregar os clientes");
      } finally {
        setLoading(false);
      }
    },
    [] // Sem dependências para evitar recriação desnecessária
  );

  // Função para carregar todos os dados necessários - memoizada com dependências corretas
  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      // Paralelizar solicitações de API para melhorar a performance
      const [segmentosResult, estatisticasResult] = await Promise.all([
        getSegmentos(),
        getEstatisticasClientes()
      ]);
      
      if (estatisticasResult.success && estatisticasResult.estatisticas) {
        setEstatisticas({ ...estatisticasResult.estatisticas, valorTotal: 0 });
      } else if (estatisticasResult.error) {
        toast.error(estatisticasResult.error);
      }
  
      // Carregar clientes com o filtro atual
      await carregarClientes(filtro);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Ocorreu um erro ao carregar os dados");
    } finally {
      setLoading(false);
    }
  }, [filtro, carregarClientes]);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Efeito para recarregar quando o tab muda - otimizado para evitar carregamentos duplicados
  useEffect(() => {
    if (filtro.recorrencia !== activeTab) {
      const novoFiltro = { ...filtro, recorrencia: activeTab, pagina: 1 };
      setPaginaAtual(1);
      setFiltro(novoFiltro);
      carregarClientes(novoFiltro);
    }
  }, [activeTab, carregarClientes, filtro]);

  // Efeito para recarregar quando a página muda - otimizado para evitar carregamentos duplicados
  useEffect(() => {
    if (filtro.pagina !== paginaAtual) {
      const novoFiltro = { ...filtro, pagina: paginaAtual };
      setFiltro(novoFiltro);
      carregarClientes(novoFiltro);
    }
  }, [paginaAtual, carregarClientes, filtro]);

  // Aplicar filtros - memoizada para evitar recriação
  const aplicarFiltros = useCallback(async () => {
    setLoading(true);

    try {
      const novoFiltro: ClienteFiltros = {
        ...filtro,
        dataInicio: dateRange?.from,
        dataFim: dateRange?.to,
        segmento: segmentoFiltro,
        searchTerm: searchTerm,
        classificacao:
          classificacaoFiltro.length > 0 ? classificacaoFiltro : undefined,
        ordenacao: {
          campo: sortField,
          ordem: sortDirection,
        },
        pagina: 1, // Resetar para primeira página
      };

      setFiltro(novoFiltro);
      setPaginaAtual(1);
      await carregarClientes(novoFiltro);
      setFiltroAberto(false);
      toast.success("Filtros aplicados com sucesso");
    } catch (error) {
      console.error("Erro ao aplicar filtros:", error);
      toast.error("Ocorreu um erro ao aplicar os filtros");
    } finally {
      setLoading(false);
    }
  }, [filtro, dateRange, segmentoFiltro, searchTerm, classificacaoFiltro, sortField, sortDirection, carregarClientes]);

  // Limpar filtros - memoizada para evitar recriação
  const limparFiltros = useCallback(async () => {
    setDateRange(undefined);
    setSearchTerm("");
    setSegmentoFiltro(undefined);
    setClassificacaoFiltro([]);
    setSortField("valorTotal");
    setSortDirection("desc");

    const novoFiltro: ClienteFiltros = {
      recorrencia: activeTab,
      ordenacao: {
        campo: "valorTotal",
        ordem: "desc",
      },
      itensPorPagina: 10,
      pagina: 1,
    };

    setFiltro(novoFiltro);
    setPaginaAtual(1);
    await carregarClientes(novoFiltro);
    setFiltroAberto(false);
    toast.success("Filtros removidos");
  }, [activeTab, carregarClientes]);

  // Aplicar filtro de período - memoizada
  const aplicarPeriodo = useCallback((value: string) => {
    const periodoOption = periodoOptions.find((p) => p.value === value);

    if (periodoOption) {
      const newDateRange = periodoOption.fn();
      setDateRange(newDateRange);
      setDatePickerOpen(false);

      if (value === "allTime") {
        toast.success("Mostrando dados de todo o período");
      } else {
        toast.success(`Filtro aplicado: ${periodoOption.label}`);
      }
    }
  }, [periodoOptions]);

  // Abrir detalhes do cliente - memoizada
  const verDetalhesCliente = useCallback(async (cliente: Cliente) => {
    setLoading(true);
    try {
      // Buscar dados atualizados do cliente
      const clienteResult = await getClienteById(cliente.id);

      if (clienteResult.success && clienteResult.cliente) {
        setClienteSelecionado(clienteResult.cliente);
        setClienteDetalhesAberto(true);
      } else {
        toast.error(
          clienteResult.error || "Erro ao buscar detalhes do cliente"
        );
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes do cliente:", error);
      toast.error("Ocorreu um erro ao buscar os detalhes do cliente");
    } finally {
      setLoading(false);
    }
  }, []);

  // Abrir vendas do cliente - memoizada
  const verVendasCliente = useCallback(async (cliente: Cliente) => {
    setLoading(true);
    try {
      setClienteSelecionado(cliente);

      // Buscar vendas do cliente
      const vendasResult = await getVendasCliente(cliente.id);

      if (vendasResult.success && vendasResult.vendas) {
        setVendasCliente(vendasResult.vendas);
        setVendasClienteModalAberta(true);
      } else {
        toast.error(vendasResult.error || "Erro ao buscar vendas do cliente");
      }
    } catch (error) {
      console.error("Erro ao buscar vendas do cliente:", error);
      toast.error("Ocorreu um erro ao buscar as vendas do cliente");
    } finally {
      setLoading(false);
    }
  }, []);

  // Navegação para a página de edição de venda - memoizada
  const irParaEditarVenda = useCallback((vendaId: string) => {
    router.push(`/vendas/${vendaId}/editar`);
  }, [router]);

  // Alterar ordenação - memoizada
  const alterarOrdenacao = useCallback((campo: keyof Cliente) => {
    let direcao = sortDirection;

    if (sortField === campo) {
      // Alternar direção se o campo for o mesmo
      direcao = sortDirection === "asc" ? "desc" : "asc";
      setSortDirection(direcao);
    } else {
      // Definir novo campo e resetar direção para desc
      setSortField(campo);
      direcao = "desc";
      setSortDirection("desc");
    }

    // Aplicar nova ordenação
    const novoFiltro = {
      ...filtro,
      ordenacao: {
        campo: campo,
        ordem: direcao,
      },
    };

    setFiltro(novoFiltro);
    carregarClientes(novoFiltro);
  }, [sortField, sortDirection, filtro, carregarClientes]);

  // Aplicar filtro de pesquisa com debounce para melhor performance
  const aplicarPesquisa = useCallback((termo: string) => {
    setSearchTerm(termo);

    // Debounce para não executar muitas chamadas
    const timeoutId = setTimeout(() => {
      const novoFiltro = {
        ...filtro,
        searchTerm: termo,
      };

      setFiltro(novoFiltro);
      carregarClientes(novoFiltro);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filtro, carregarClientes]);

  // Preparar dados para gráficos - useMemo para evitar cálculos repetidos
  const prepararDadosGraficoSegmentos = useMemo((): PieDataPoint[] => {
    if (!estatisticas?.segmentos) return [];

    const cores = [
      "#185678",
      "#97C31D",
      "#FFBB28",
      "#FF8042",
      "#8884d8",
      "#4CAF50",
      "#9C27B0",
      "#607D8B",
    ];

    return estatisticas.segmentos.map((segmento, index) => ({
      name: segmento.nome,
      value: segmento.quantidadeClientes,
      color: cores[index % cores.length],
    }));
  }, [estatisticas]);

  const prepararDadosGraficoRecorrencia = useMemo((): PieDataPoint[] => {
    if (!estatisticas) return [];

    return [
      {
        name: "Recorrentes",
        value: estatisticas.clientesRecorrentes,
        color: "#185678",
      },
      {
        name: "Não Recorrentes",
        value: estatisticas.clientesNaoRecorrentes,
        color: "#9CC31B",
      },
    ];
  }, [estatisticas]);

  const prepararDadosGraficoValorPorSegmento = useMemo((): SegmentoChartData[] => {
    if (!estatisticas?.segmentos) return [];

    return estatisticas.segmentos.map((segmento) => ({
      segmento: segmento.nome,
      clientes: segmento.quantidadeClientes,
      valorTotal: segmento.valorTotal,
    }));
  }, [estatisticas]);

  // Calcular classificação com base no score - memoizada
  const calcularClassificacaoCliente = useCallback(
    (score: number): { texto: string; cor: string } => {
      if (score >= 80) return { texto: "Premium", cor: "text-purple-700" };
      if (score >= 60) return { texto: "Ouro", cor: "text-amber-600" };
      if (score >= 40) return { texto: "Prata", cor: "text-gray-500" };
      if (score >= 20) return { texto: "Bronze", cor: "text-amber-800" };
      return { texto: "Básico", cor: "text-gray-600" };
    },
    []
  );

  // Formatar período selecionado para exibição - memoizada
  const formatarPeriodoSelecionado = useCallback(() => {
    if (!dateRange?.from) return "Selecione um período";

    if (dateRange.to) {
      const from = format(dateRange.from, "dd/MM/yyyy");
      const to = format(dateRange.to, "dd/MM/yyyy");
      return `${from} - ${to}`;
    }

    return format(dateRange.from, "dd/MM/yyyy");
  }, [dateRange]);

  // Renderizar ícone de ordenação - memoizada
  const renderSortIcon = useCallback(
    (campo: keyof Cliente) => {
      if (sortField === campo) {
        return sortDirection === "asc" ? (
          <ArrowUp className="h-4 w-4 ml-1" />
        ) : (
          <ArrowDown className="h-4 w-4 ml-1" />
        );
      }
      return null;
    },
    [sortField, sortDirection]
  );

  // Verificar se estamos carregando ou não temos dados
  if (loading && !clientes.length && !estatisticas) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#00446A] mb-4" />
          <p className="text-lg font-medium">
            Carregando dados dos clientes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold">Gestão de Clientes</h2>

        <div className="flex flex-wrap gap-3 items-center">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger className="hidden" asChild>
              <Button
                variant="outline"
                className="justify-start text-left font-normal h-10"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from
                  ? formatarPeriodoSelecionado()
                  : "Filtrar por período"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 border-b">
                <div className="space-y-2">
                  <h4 className="font-medium">Períodos predefinidos</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {periodoOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => aplicarPeriodo(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                }}
                numberOfMonths={2}
                locale={ptBR}
              />
              <div className="p-3 border-t flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDateRange(undefined);
                  }}
                >
                  Limpar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setDatePickerOpen(false);
                    aplicarFiltros();
                  }}
                >
                  Aplicar
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            className="bg-[#00446A] text-white hover:bg-[#00446A]/90"
            onClick={() => setNovoClienteModalAberto(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas - Reorganizados para 3x2 (3 em cima, 3 embaixo) */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total de Clientes */}
          <Card className="!py-3">
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <CardDescription className="text-sm flex gap-3 items-center text-gray-500">
                    Total de Clientes
                    <div className="bg-blue-100 w-fit p-2 rounded-full">
                      <UserCheck className="h-6 w-6 text-blue-600" />
                    </div>
                  </CardDescription>
                  <CardTitle className="text-3xl mt-1">
                    {estatisticas.totalClientes}
                  </CardTitle>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clientes Recorrentes */}
          <Card className="!py-3">
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <CardDescription className="text-sm flex gap-3 items-center text-gray-500">
                    Clientes Recorrentes
                    <div className="bg-green-100 w-fit p-2 rounded-full">
                      <RepeatIcon className="h-6 w-6 text-green-600" />
                    </div>
                  </CardDescription>
                  <CardTitle className="text-3xl mt-1">
                    {estatisticas.clientesRecorrentes}
                  </CardTitle>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clientes Não Recorrentes */}
          <Card className="!py-3">
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <CardDescription className="text-sm flex gap-3 items-center text-gray-500">
                    Clientes Não Recorrentes
                    <div className="bg-orange-100 w-fit p-2 rounded-full">
                      <UserCheck className="h-6 w-6 text-orange-600" />
                    </div>
                  </CardDescription>
                  <CardTitle className="text-3xl mt-1">
                    {estatisticas.clientesNaoRecorrentes}
                  </CardTitle>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valor Total em Vendas */}
          <Card className="!py-3">
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <CardDescription className="text-sm flex gap-3 items-center text-gray-500">
                    Valor Total em Vendas
                    <div className="bg-purple-100 w-fit p-2 rounded-full">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                  </CardDescription>
                  <CardTitle className="text-2xl mt-1">
                    {formatarValorBRL(estatisticas.valorTotal)}
                  </CardTitle>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clientes Inativos */}
          <Card className="!py-3">
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <CardDescription className="text-sm flex gap-3 items-center text-gray-500">
                    Clientes Inativos
                    <div className="bg-red-100 w-fit p-2 rounded-full">
                      <Timer className="h-6 w-6 text-red-600" />
                    </div>
                  </CardDescription>
                  <CardTitle className="text-3xl mt-1">
                    {estatisticas.clientesInativos}
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    Sem compras há +90 dias
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Novos Clientes */}
          <Card className="!py-3">
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <CardDescription className="text-sm flex gap-3 items-center text-gray-500">
                    Novos Clientes
                    <div className="bg-emerald-100 w-fit p-2 rounded-full">
                      <UserCheck className="h-6 w-6 text-emerald-600" />
                    </div>
                  </CardDescription>
                  <CardTitle className="text-3xl mt-1">
                    {estatisticas.clientesNovos30Dias}
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-1">Últimos 30 dias</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gráfico de Distribuição de Clientes por Segmento */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">Clientes por Segmento</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-10 w-10 animate-spin text-[#00446A]" />
                </div>
              ) : (
                <DonutChart
                  data={prepararDadosGraficoSegmentos}
                  title="Distribuição por Segmento"
                />
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Recorrência */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">Recorrência</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-10 w-10 animate-spin text-[#00446A]" />
                </div>
              ) : (
                <DonutChart
                  data={prepararDadosGraficoRecorrencia}
                  title="Clientes Recorrentes vs Não Recorrentes"
                />
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Barras - Valor por Segmento */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">Valor por Segmento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-3">
                Comparativo de valor total gerado por cada segmento
              </p>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00446A]" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={prepararDadosGraficoValorPorSegmento}
                    margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="segmento"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        formatarValorBRL(value).substring(0, 3) +
                        " " +
                        value / 1000 +
                        "k"
                      }
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => formatarValorBRL(value as number)}
                      labelFormatter={(label) => `Segmento: ${label}`}
                    />
                    <Legend />
                    <Bar
                      dataKey="valorTotal"
                      name="Valor Total"
                      fill="#185678"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Principais Clientes */}
      {estatisticas?.clientesMaisValiosos &&
        estatisticas.clientesMaisValiosos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Principais Clientes</CardTitle>
              <CardDescription>
                Top 5 clientes em valor total de compras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {estatisticas.clientesMaisValiosos.map((cliente, index) => (
                  <Card
                    key={cliente.id}
                    className={`border-l-4 ${
                      index === 0
                        ? "border-l-amber-500"
                        : index === 1
                        ? "border-l-gray-400"
                        : index === 2
                        ? "border-l-amber-700"
                        : "border-l-[#00446A]"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <Badge
                            variant="outline"
                            className={
                              index === 0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            #{index + 1}
                          </Badge>
                          <Star
                            className={`h-4 w-4 ${
                              index === 0 ? "text-amber-500" : "text-gray-400"
                            }`}
                          />
                        </div>
                        <h3 className="font-medium text-base">
                          {cliente.nome}
                        </h3>
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">Valor total</p>
                          <p className="font-medium">
                            {formatarValorBRL(cliente.valorTotal)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => {
                            getClienteById(cliente.id).then((res) => {
                              if (res.success && res.cliente) {
                                verDetalhesCliente(res.cliente);
                              }
                            });
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Ver detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Tabela de Clientes com Tabs */}
      <Card className="shadow-md overflow-hidden">
        <CardHeader className="pb-0">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-2">
            <CardTitle>Lista de Clientes</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-9 h-10 rounded-md border border-gray-300 bg-white px-3 text-sm w-full md:w-60"
                  value={searchTerm}
                  onChange={(e) => aplicarPesquisa(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltroAberto(true)}
              >
                <Filter className="h-4 w-4 mr-1" /> Filtros
              </Button>
            </div>
          </div>
        </CardHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "todos" | "recorrentes" | "naoRecorrentes")
          }
          className="w-full px-6"
        >
          <div className="overflow-x-auto">
            <TabsList className="mb-4 grid grid-cols-3 w-full md:w-[500px]">
              <TabsTrigger value="todos" className="flex items-center gap-1">
                
                <span className="whitespace-nowrap">Todos</span>
                {estatisticas && (
                  <Badge variant="outline" className="ml-1 bg-gray-100">
                    {estatisticas.totalClientes}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="recorrentes"
                className="flex items-center gap-1"
              >
                <span className="whitespace-nowrap">Recorrentes</span>
                {estatisticas && (
                  <Badge
                    variant="outline"
                    className="ml-1 bg-green-100 text-green-800"
                  >
                    {estatisticas.clientesRecorrentes}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="naoRecorrentes"
                className="flex items-center gap-1"
              >
                <span className="whitespace-nowrap">Não Recorrentes</span>
                {estatisticas && (
                  <Badge
                    variant="outline"
                    className="ml-1 bg-orange-100 text-orange-800"
                  >
                    {estatisticas.clientesNaoRecorrentes}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-0">
            <div className="relative overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00446A]" />
                </div>
              ) : clientes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer whitespace-nowrap"
                          onClick={() => alterarOrdenacao("nome")}
                        >
                          <div className="flex items-center">
                            Nome {renderSortIcon("nome")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer whitespace-nowrap"
                          onClick={() => alterarOrdenacao("segmento")}
                        >
                          <div className="flex items-center">
                            Segmento {renderSortIcon("segmento")}
                          </div>
                        </TableHead>
                        <TableHead className="whitespace-nowrap">
                          CNPJ / Razão Social
                        </TableHead>
                        <TableHead
                          className="cursor-pointer whitespace-nowrap"
                          onClick={() => alterarOrdenacao("valorTotal")}
                        >
                          <div className="flex items-center">
                            Valor Total {renderSortIcon("valorTotal")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer whitespace-nowrap"
                          onClick={() => alterarOrdenacao("valorMedio")}
                        >
                          <div className="flex items-center">
                            Valor Médio {renderSortIcon("valorMedio")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer whitespace-nowrap"
                          onClick={() => alterarOrdenacao("quantidadeVendas")}
                        >
                          <div className="flex items-center">
                            Compras {renderSortIcon("quantidadeVendas")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer whitespace-nowrap"
                          onClick={() => alterarOrdenacao("ultimaCompra")}
                        >
                          <div className="flex items-center">
                            Última Compra {renderSortIcon("ultimaCompra")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer whitespace-nowrap"
                          onClick={() => alterarOrdenacao("score")}
                        >
                          <div className="flex items-center">
                            Classificação {renderSortIcon("score")}
                          </div>
                        </TableHead>
                        <TableHead className="text-right whitespace-nowrap">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientes.map((cliente) => (
                        <TableRow key={cliente.id}>
                          <TableCell className="font-medium">
                            {cliente.nome}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-gray-100 text-gray-800"
                            >
                              {cliente.segmento}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{cliente.cnpj}</p>
                              <p className="text-xs text-gray-500">
                                {cliente.razaoSocial ||
                                  "Razão social não inserida"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatarValorBRL(cliente.valorTotal)}
                          </TableCell>
                          <TableCell>
                            {formatarValorBRL(cliente.valorMedio)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                cliente.recorrente ? "outline" : "secondary"
                              }
                              className={
                                cliente.recorrente
                                  ? "bg-green-100 border-green-200 text-green-800"
                                  : ""
                              }
                            >
                              {cliente.quantidadeVendas}{" "}
                              {cliente.recorrente ? `(recorrente)` : ""}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{formatDate(cliente.ultimaCompra)}</span>
                              {cliente.diasDesdeUltimaCompra > 90 && (
                                <span className="text-xs text-red-500">
                                  Inativo há {cliente.diasDesdeUltimaCompra}{" "}
                                  dias
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-gray-100 border-0">
                              <span
                                className={
                                  calcularClassificacaoCliente(cliente.score)
                                    .cor
                                }
                              >
                                {
                                  calcularClassificacaoCliente(cliente.score)
                                    .texto
                                }
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => verDetalhesCliente(cliente)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => verVendasCliente(cliente)}
                                >
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  Ver vendas
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setClienteSelecionado(cliente);
                                    setEditarClienteModalAberto(true);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar cliente
                                </DropdownMenuItem>
                                {session.user.role === "ADMIN" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setClienteSelecionado(cliente);
                                      setExcluirClienteModalAberto(true);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Excluir cliente
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhum cliente encontrado com os filtros atuais</p>
                </div>
              )}
            </div>
          </CardContent>
        </Tabs>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <CardFooter className="flex justify-between py-4 px-6">
            <div className="text-sm text-gray-500">
              Página {paginaAtual} de {totalPaginas}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))}
                disabled={paginaAtual === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))
                }
                disabled={paginaAtual === totalPaginas}
              >
                Próxima
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Modal de Filtros Avançados */}
      <Dialog open={filtroAberto} onOpenChange={setFiltroAberto}>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>Filtros Avançados</DialogTitle>
      <DialogDescription>
        Personalize sua visualização de clientes com filtros detalhados
      </DialogDescription>
    </DialogHeader>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
      {/* Período de última compra - Visual aprimorado */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Período de última compra
        </label>
        <div className="flex flex-col space-y-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start text-left font-normal w-full"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange?.from
                  ? formatarPeriodoSelecionado()
                  : "Selecionar período"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 border-b">
                <div className="space-y-2">
                  <h4 className="font-medium">Períodos predefinidos</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {periodoOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => aplicarPeriodo(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                }}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Segmento - Seleção visual com chips */}
      <div>
        <label className="text-sm font-medium mb-2 block">Segmento</label>
        <div className="space-y-2">
        <Select
  value={segmentoFiltro || "todos"} // Valor padrão
  onValueChange={(value) => setSegmentoFiltro(value === "todos" ? undefined : value)}
>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Selecione o segmento" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="todos">Todos os segmentos</SelectItem>
    {segmentos.map((segmento) => (
      <SelectItem key={segmento} value={segmento || "outros"}>
        {segmento || "Outros"}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
          
          {/* Sugestões de segmentos populares */}
          {segmentos.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Segmentos populares:</p>
              <div className="flex flex-wrap gap-2">
                {segmentos.slice(0, 3).map((segmento) => (
                  <Badge
                    key={segmento}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => setSegmentoFiltro(segmento)}
                  >
                    {segmento}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recorrência - Cards interativos */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Recorrência
        </label>
        <div className="grid grid-cols-3 gap-2">
          <div
            className={`border rounded-md p-3 cursor-pointer transition-all ${
              filtro.recorrencia === "todos"
                ? "border-[#00446A] bg-[#00446A]/10"
                : "hover:border-gray-400"
            }`}
            onClick={() =>
              setFiltro((prev) => ({
                ...prev,
                recorrencia: "todos",
              }))
            }
          >
            <div className="flex flex-col items-center">
              <Users className={`h-5 w-5 mb-1 ${
                filtro.recorrencia === "todos" ? "text-[#00446A]" : "text-gray-500"
              }`} />
              <span className="text-xs font-medium">Todos</span>
            </div>
          </div>
          
          <div
            className={`border rounded-md p-3 cursor-pointer transition-all ${
              filtro.recorrencia === "recorrentes"
                ? "border-green-600 bg-green-50"
                : "hover:border-gray-400"
            }`}
            onClick={() =>
              setFiltro((prev) => ({
                ...prev,
                recorrencia: "recorrentes",
              }))
            }
          >
            <div className="flex flex-col items-center">
              <RepeatIcon className={`h-5 w-5 mb-1 ${
                filtro.recorrencia === "recorrentes" ? "text-green-600" : "text-gray-500"
              }`} />
              <span className="text-xs font-medium">Recorrentes</span>
            </div>
          </div>
          
          <div
            className={`border rounded-md p-3 cursor-pointer transition-all ${
              filtro.recorrencia === "naoRecorrentes"
                ? "border-orange-600 bg-orange-50"
                : "hover:border-gray-400"
            }`}
            onClick={() =>
              setFiltro((prev) => ({
                ...prev,
                recorrencia: "naoRecorrentes",
              }))
            }
          >
            <div className="flex flex-col items-center">
              <UserCheck className={`h-5 w-5 mb-1 ${
                filtro.recorrencia === "naoRecorrentes" ? "text-orange-600" : "text-gray-500"
              }`} />
              <span className="text-xs font-medium">Não Recor.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Classificação - Caixas com cores */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Classificação
        </label>
        <div className="grid grid-cols-2 gap-4 border rounded-md p-3 bg-gray-50">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="premium"
              checked={classificacaoFiltro.includes("premium")}
              onCheckedChange={(checked) => {
                if (checked) {
                  setClassificacaoFiltro((prev) => [...prev, "premium"]);
                } else {
                  setClassificacaoFiltro((prev) =>
                    prev.filter((c) => c !== "premium")
                  );
                }
              }}
            />
            <label
              htmlFor="premium"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              <span className="text-purple-700">Premium</span>
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="ouro"
              checked={classificacaoFiltro.includes("ouro")}
              onCheckedChange={(checked) => {
                if (checked) {
                  setClassificacaoFiltro((prev) => [...prev, "ouro"]);
                } else {
                  setClassificacaoFiltro((prev) =>
                    prev.filter((c) => c !== "ouro")
                  );
                }
              }}
            />
            <label
              htmlFor="ouro"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              <span className="text-amber-600">Ouro</span>
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prata"
              checked={classificacaoFiltro.includes("prata")}
              onCheckedChange={(checked) => {
                if (checked) {
                  setClassificacaoFiltro((prev) => [...prev, "prata"]);
                } else {
                  setClassificacaoFiltro((prev) =>
                    prev.filter((c) => c !== "prata")
                  );
                }
              }}
            />
            <label
              htmlFor="prata"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              <span className="text-gray-500">Prata</span>
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="bronze"
              checked={classificacaoFiltro.includes("bronze")}
              onCheckedChange={(checked) => {
                if (checked) {
                  setClassificacaoFiltro((prev) => [...prev, "bronze"]);
                } else {
                  setClassificacaoFiltro((prev) =>
                    prev.filter((c) => c !== "bronze")
                  );
                }
              }}
            />
            <label
              htmlFor="bronze"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              <span className="text-amber-800">Bronze</span>
            </label>
          </div>
        </div>
      </div>

      {/* Ordenação - Cards visuais */}
      <div className="md:col-span-2">
        <label className="text-sm font-medium mb-2 block">
          Ordenação
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            {
              campo: "valorTotal" as keyof Cliente,
              label: "Valor Total",
              icon: <DollarSign className="h-4 w-4" />,
            },
            { 
              campo: "nome" as keyof Cliente, 
              label: "Nome",
              icon: <Users className="h-4 w-4" />,
            },
            { 
              campo: "segmento" as keyof Cliente, 
              label: "Segmento",
              icon: <Filter className="h-4 w-4" />,
            },
            {
              campo: "valorMedio" as keyof Cliente,
              label: "Valor Médio",
              icon: <BadgePercent className="h-4 w-4" />,
            },
            {
              campo: "quantidadeVendas" as keyof Cliente,
              label: "Qtd. Compras",
              icon: <ShoppingCart className="h-4 w-4" />,
            },
            {
              campo: "ultimaCompra" as keyof Cliente,
              label: "Última Compra",
              icon: <Calendar className="h-4 w-4" />,
            },
            { 
              campo: "score" as keyof Cliente, 
              label: "Classificação",
              icon: <Star className="h-4 w-4" />,
            },
          ].map((opcao) => (
            <div
              key={opcao.campo}
              className={`border rounded-md p-2 cursor-pointer transition-all ${
                sortField === opcao.campo
                  ? "border-[#00446A] bg-[#00446A]/10"
                  : "hover:border-gray-400"
              }`}
              onClick={() => {
                setSortField(opcao.campo);
                // Alternar direção se já estiver usando este campo
                if (sortField === opcao.campo) {
                  setSortDirection((prev) =>
                    prev === "asc" ? "desc" : "asc"
                  );
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {opcao.icon}
                  <span className="text-xs font-medium">{opcao.label}</span>
                </div>
                {sortField === opcao.campo && (
                  <div>
                    {sortDirection === "asc" ? (
                      <ArrowUp className="h-3 w-3 text-[#00446A]" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-[#00446A]" />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={limparFiltros} className="gap-1">
        <RefreshCcw className="h-4 w-4" />
        Limpar Filtros
      </Button>
      <Button variant="outline" onClick={() => setFiltroAberto(false)}>
        <X className="mr-2 h-4 w-4" />
        Cancelar
      </Button>
      <Button
        onClick={aplicarFiltros}
        disabled={loading}
        className="bg-[#00446A] text-white hover:bg-[#00446A]/90"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Filter className="mr-2 h-4 w-4" />
        )}
        Aplicar Filtros
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      {/* Modal de Detalhes do Cliente */}
      <Dialog
        open={clienteDetalhesAberto}
        onOpenChange={setClienteDetalhesAberto}
      >
        <DialogContent className="w-max !max-w-7xl max-h-screen">
          {clienteSelecionado && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  Detalhes do Cliente
                  <Badge
                    variant="outline"
                    className={
                      clienteSelecionado.recorrente
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {clienteSelecionado.recorrente
                      ? "Recorrente"
                      : "Não Recorrente"}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Informações detalhadas sobre o cliente e seu histórico de
                  compras
                </DialogDescription>
              </DialogHeader>

              <div className="grid w-fit grid-cols-1 md:grid-cols-3 gap-4 py-4">
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      Informações Gerais
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium text-base">
                          {clienteSelecionado.nome}
                        </h3>
                        <div className="mt-3 space-y-2">
                          <div>
                            <p className="text-sm text-gray-500">CNPJ</p>
                            <p>{clienteSelecionado.cnpj}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Razão Social
                            </p>
                            <p>
                              {clienteSelecionado.razaoSocial ||
                                "Razão social não inserida"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Segmento</p>
                            <p>
                              <Badge
                                variant="outline"
                                className="bg-gray-100 text-gray-800"
                              >
                                {clienteSelecionado.segmento}
                              </Badge>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">Resumo Financeiro</h3>
                          <Badge className="bg-gray-100 border-0">
                            <span
                              className={
                                calcularClassificacaoCliente(
                                  clienteSelecionado.score
                                ).cor
                              }
                            >
                              {
                                calcularClassificacaoCliente(
                                  clienteSelecionado.score
                                ).texto
                              }
                            </span>
                          </Badge>
                        </div>

                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="text-sm text-gray-500">
                              Valor Total em Compras
                            </p>
                            <p className="text-lg font-medium">
                              {formatarValorBRL(clienteSelecionado.valorTotal)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Valor Médio por Compra
                            </p>
                            <p>
                              {formatarValorBRL(clienteSelecionado.valorMedio)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Maior Valor de Compra
                            </p>
                            <p>
                              {formatarValorBRL(clienteSelecionado.maiorValor)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Quantidade de Compras
                            </p>
                            <p>{clienteSelecionado.quantidadeVendas} compras</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Produto Mais Comprado
                            </p>
                            <p>
                              {clienteSelecionado.produtoMaisComprado || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Frequência de Compra
                            </p>
                            <p>
                              {clienteSelecionado.freqCompra
                                ? `Em média, a cada ${clienteSelecionado.freqCompra} dias`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div>
                        <p className="text-sm text-gray-500">Última Compra</p>
                        <p>
                          {formatDate(clienteSelecionado.ultimaCompra)}
                          {clienteSelecionado.diasDesdeUltimaCompra > 90 && (
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-800 ml-2"
                            >
                              Inativo
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {clienteSelecionado.diasDesdeUltimaCompra} dias atrás
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">
                          Data de Cadastro
                        </p>
                        <p>{formatDate(clienteSelecionado.dataCadastro)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {differenceInDays(
                            new Date(),
                            clienteSelecionado.dataCadastro
                          )}{" "}
                          dias de relacionamento
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">
                          Prazo para Próxima Compra
                        </p>
                        {clienteSelecionado.recorrente &&
                        clienteSelecionado.freqCompra ? (
                          <p>
                            {clienteSelecionado.freqCompra -
                              clienteSelecionado.diasDesdeUltimaCompra >
                            0
                              ? `Em aproximadamente ${
                                  clienteSelecionado.freqCompra -
                                  clienteSelecionado.diasDesdeUltimaCompra
                                } dias`
                              : "Compra em atraso"}
                          </p>
                        ) : (
                          <p>N/A - Cliente não recorrente</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="w-fit">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Indicadores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">
                        Score do Cliente
                      </p>
                      <div className="relative pt-1">
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                          <div
                            style={{ width: `${clienteSelecionado.score}%` }}
                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                              clienteSelecionado.score >= 80
                                ? "bg-purple-600"
                                : clienteSelecionado.score >= 60
                                ? "bg-amber-500"
                                : clienteSelecionado.score >= 40
                                ? "bg-gray-500"
                                : clienteSelecionado.score >= 20
                                ? "bg-amber-800"
                                : "bg-gray-600"
                            }`}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0</span>
                          <span>50</span>
                          <span>100</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <Badge
                          className={`${
                            clienteSelecionado.score >= 80
                              ? "bg-purple-100 text-purple-800"
                              : clienteSelecionado.score >= 60
                              ? "bg-amber-100 text-amber-800"
                              : clienteSelecionado.score >= 40
                              ? "bg-gray-100 text-gray-800"
                              : clienteSelecionado.score >= 20
                              ? "bg-amber-200 text-amber-900"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {clienteSelecionado.score} pontos -{" "}
                          {
                            calcularClassificacaoCliente(
                              clienteSelecionado.score
                            ).texto
                          }
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-1">
                        Status de Atividade
                      </p>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            clienteSelecionado.diasDesdeUltimaCompra <= 30
                              ? "bg-green-500"
                              : clienteSelecionado.diasDesdeUltimaCompra <= 60
                              ? "bg-amber-500"
                              : clienteSelecionado.diasDesdeUltimaCompra <= 90
                              ? "bg-orange-500"
                              : "bg-red-500"
                          }`}
                        ></div>
                        <span>
                          {clienteSelecionado.diasDesdeUltimaCompra <= 30
                            ? "Ativo"
                            : clienteSelecionado.diasDesdeUltimaCompra <= 60
                            ? "Atenção"
                            : clienteSelecionado.diasDesdeUltimaCompra <= 90
                            ? "Em risco"
                            : "Inativo"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Última compra há{" "}
                        {clienteSelecionado.diasDesdeUltimaCompra} dias
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-1">
                        Potencial de Compra
                      </p>
                      <div className="grid grid-cols-3 gap-5">
                        <div className="flex flex-col items-center p-3 w-fit bg-gray-50 rounded-md">
                          <BadgePercent className="h-5 w-5 text-[#00446A] mb-1" />
                          <p className="text-xs text-center">Desconto</p>
                          <p className="text-sm font-medium">
                            {clienteSelecionado.score >= 80
                              ? "15%"
                              : clienteSelecionado.score >= 60
                              ? "10%"
                              : clienteSelecionado.score >= 40
                              ? "5%"
                              : "0%"}
                          </p>
                        </div>
                        <div className="flex flex-col items-center p-3 w-fit bg-gray-50 rounded-md">
                          <PiggyBank className="h-5 w-5 text-green-600 mb-1" />
                          <p className="text-xs text-center">Crédito</p>
                          <p className="text-sm font-medium">
                            {clienteSelecionado.score >= 60
                              ? "Aprovado"
                              : "Análise"}
                          </p>
                        </div>
                        <div className="flex flex-col items-center p-3 w-fit bg-gray-50 rounded-md">
                          <RepeatIcon className="h-5 w-5 text-amber-600 mb-1" />
                          <p className="text-xs text-center">Fidelidade</p>
                          <p className="text-sm font-medium">
                            {clienteSelecionado.recorrente ? "Sim" : "Não"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button
                        className="w-full bg-[#00446A] text-white hover:bg-[#00446A]/90"
                        onClick={() => {
                          setClienteDetalhesAberto(false);
                          verVendasCliente(clienteSelecionado);
                        }}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Ver Histórico de Compras
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Vendas do Cliente */}
      <Dialog
        open={vendasClienteModalAberta}
        onOpenChange={setVendasClienteModalAberta}
      >
        <DialogContent className="w-max !max-w-7xl">
          {clienteSelecionado && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  Histórico de Vendas - {clienteSelecionado.nome}
                </DialogTitle>
                <DialogDescription>
                  Listagem de todas as vendas realizadas para este cliente
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Cliente</p>
                    <p className="font-medium">{clienteSelecionado.nome}</p>
                    <p className="text-sm">{clienteSelecionado.cnpj}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total em Vendas</p>
                    <p className="font-medium text-lg">
                      {formatarValorBRL(clienteSelecionado.valorTotal)}
                    </p>
                    <p className="text-sm">
                      {clienteSelecionado.quantidadeVendas} compras
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="relative overflow-x-auto mt-4">
                  {vendasCliente.length > 0 ? (
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Vendedor</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vendasCliente.map((venda) => (
                            <TableRow key={venda.id}>
                              <TableCell className="font-medium">
                                {venda.codigo}
                              </TableCell>
                              <TableCell>{formatDate(venda.data)}</TableCell>
                              <TableCell>{venda.vendedorNome}</TableCell>
                              <TableCell className="font-medium">
                                {formatarValorBRL(venda.valorTotal)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    venda.status === "aprovada"
                                      ? "bg-green-100 text-green-800 border-green-100"
                                      : venda.status === "pendente"
                                      ? "bg-yellow-100 text-yellow-800 border-yellow-100"
                                      : "bg-red-100 text-red-800 border-red-100"
                                  }
                                >
                                  {venda.status === "aprovada"
                                    ? "Aprovada"
                                    : venda.status === "pendente"
                                    ? "Pendente"
                                    : "Recusada"}
                                </Badge>
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
                                      onClick={() => {
                                        // Navegar para detalhes da venda
                                        router.push(`/vendas/${venda.id}`);
                                        setVendasClienteModalAberta(false);
                                      }}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      Ver detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        // Navegar para página de edição
                                        irParaEditarVenda(venda.id);
                                        setVendasClienteModalAberta(false);
                                      }}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Editar venda
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled>
                                      <Lock className="mr-2 h-4 w-4" />
                                      <span className="opacity-50">
                                        Gerar relatório
                                      </span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhuma venda encontrada para este cliente</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setVendasClienteModalAberta(false);
                    verDetalhesCliente(clienteSelecionado);
                  }}
                >
                  <Info className="mr-2 h-4 w-4" />
                  Ver Detalhes do Cliente
                </Button>
                <Button
                  onClick={() => {
                    setVendasClienteModalAberta(false);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Fechar
                </Button>
                <Button
                  className="bg-[#00446A] text-white hover:bg-[#00446A]/90"
                  disabled
                >
                  <Lock className="mr-2 h-4 w-4" />
                  <span className="opacity-50">Exportar Histórico</span>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Cliente */}
      <Dialog
        open={novoClienteModalAberto}
        onOpenChange={setNovoClienteModalAberto}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar um novo cliente
            </DialogDescription>
          </DialogHeader>

          {/* Aqui entraria o componente ClienteForm (a implementar) */}
          <div className="py-4">
            <p className="text-gray-500 text-center">
              Componente de formulário de cliente será implementado aqui.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNovoClienteModalAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={loading}
              onClick={() => {
                // Aqui deve submeter o formulário
                toast.success("Cliente adicionado com sucesso");
                setNovoClienteModalAberto(false);
                carregarDados();
              }}
              className="bg-[#00446A] text-white hover:bg-[#00446A]/90"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Cliente */}
      <Dialog
        open={editarClienteModalAberto}
        onOpenChange={setEditarClienteModalAberto}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>Edite os dados do cliente</DialogDescription>
          </DialogHeader>

          {clienteSelecionado && (
            <EditarClienteForm
              cliente={clienteSelecionado}
              segmentosDisponiveis={segmentos}
              onSubmit={async () => {
                // Implementar chamada para a API
                toast.success("Cliente atualizado com sucesso");
                setEditarClienteModalAberto(false);
                carregarDados();
              }}
              onCancel={() => setEditarClienteModalAberto(false)}
              isLoading={loading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmar Exclusão */}
      <Dialog
  open={excluirClienteModalAberto}
  onOpenChange={setExcluirClienteModalAberto}
>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Excluir Cliente</DialogTitle>
      <DialogDescription>
        Esta ação não pode ser desfeita. O cliente será permanentemente
        excluído.
      </DialogDescription>
    </DialogHeader>

    {clienteSelecionado && (
      <div className="py-4">
        <p className="text-center">
          Tem certeza que deseja excluir o cliente{" "}
          <span className="font-bold">{clienteSelecionado.nome}</span>?
        </p>
        {clienteSelecionado.quantidadeVendas > 0 && (
          <p className="text-red-500 text-center mt-2">
            Este cliente possui {clienteSelecionado.quantidadeVendas}{" "}
            registros associados (vendas, cotações ou vendas perdidas). A exclusão só é possível para clientes sem registros associados.
          </p>
        )}
      </div>
    )}

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setExcluirClienteModalAberto(false)}
      >
        Cancelar
      </Button>
      <Button
        variant="destructive"
        disabled={
          loading || (clienteSelecionado?.quantidadeVendas ?? 0) > 0
        }
        onClick={async () => {
          if (!clienteSelecionado) return;
          
          setLoading(true);
          try {
            // Chamar a API para excluir o cliente
            const resultado = await excluirCliente(clienteSelecionado.id);
            
            if (resultado.success) {
              toast.success("Cliente excluído com sucesso");
              setExcluirClienteModalAberto(false);
              carregarDados();
            } else {
              toast.error(resultado.error || "Erro ao excluir cliente");
            }
          } catch (error) {
            console.error("Erro ao excluir cliente:", error);
            toast.error("Ocorreu um erro ao excluir o cliente");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Excluir Cliente
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
};

export default ClientesComponent;
