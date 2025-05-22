"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import {
  Filter,
  ArrowUp,
  ArrowDown,
  Search,
  Calendar,
  Download,
  CheckCircle,
  XCircle,
  DollarSign,
  FileText,
  BarChart3,
  Package2,
  Users,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCcw,
  AlertCircle,
  X,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

// Types e actions
import {
  getEstatisticasPainel,
  EstatisticasPainel,
  EstatisticasPainelParams,
} from "@/actions/estatisticas-resumidas-actions";
import { getVendedores } from "@/actions/vendedores-actions";
import { Usuario } from "@/types/usuario";
import { getProdutos } from "@/actions/produtos-actions";
import { Produto } from "@/types/venda";
// import MapaVendasRegiao from '@/components/dashboard/mapa-vendas-regiao/MapaVendasRegiao';

// Interfaces para tipagem do componente
interface DashboardFilter {
  dateRange: DateRange | undefined;
  vendedorId: string | undefined;
  produtoId: string | undefined;
  searchTerm: string;
}

interface PieDataPoint {
  name: string;
  value: number;
}

interface DonutChartProps {
  data: PieDataPoint[];
  title: string;
}

interface PeriodoOption {
  label: string;
  value: string;
  fn: () => DateRange;
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
const DonutChart: React.FC<DonutChartProps> = ({ data, title }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const COLORS = ["#185678", "#97C31D", "#FFBB28", "#FF8042"];

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  // Renderiza a forma ativa no gráfico com tipagem correta
  const renderActiveShape = (props: unknown) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
      percent,
      value,
    } = props as {
      cx: number;
      cy: number;
      innerRadius: number;
      outerRadius: number;
      startAngle: number;
      endAngle: number;
      fill: string;
      payload: { name: string };
      percent: number;
      value: number;
    };

    return (
      <g>
        <text
          x={cx}
          y={cy}
          dy={-20}
          textAnchor="middle"
          fill={fill}
          className="text-sm font-medium"
        >
          {payload.name}
        </text>
        <text
          x={cx}
          y={cy}
          dy={8}
          textAnchor="middle"
          fill="#333"
          className="text-base font-bold"
        >
          {value}
        </text>
        <text
          x={cx}
          y={cy}
          dy={25}
          textAnchor="middle"
          fill="#999"
          className="text-xs"
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 5}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
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
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            onMouseEnter={onPieEnter}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-2">
        {data.map((entry, index) => (
          <div
            key={`legend-${index}`}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setActiveIndex(index)}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
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

// Dashboard Principal
const EnhancedDashboard: React.FC = () => {
  // Estados para dados
  const [chartTab, setChartTab] = useState<"geral" | "vendas" | "naoVendas">(
    "geral"
  );
  const [statsTab, setStatsTab] = useState<
    "geral" | "produtos" | "vendedores" | "clientes"
  >("geral");
  const [produtosTab, setProdutosTab] = useState<"todos" | "rank">("todos");
  const [vendedoresTab, setVendedoresTab] = useState<"geral" | "rank">("geral");
  const [clientesTab, setClientesTab] = useState<"geral" | "rank">("geral");

  // Estados para filtros e loading
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);

  // Estados para os dados
  const [estatisticas, setEstatisticas] = useState<EstatisticasPainel | null>(
    null
  );
  const [vendedores, setVendedores] = useState<Usuario[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [filter, setFilter] = useState<DashboardFilter>({
    dateRange: undefined,
    vendedorId: undefined,
    produtoId: undefined,
    searchTerm: "",
  });

  // Opções de filtro de período predefinidas - usando useMemo para otimização
  const periodoOptions: PeriodoOption[] = useMemo(() => [
    {
      label: "Hoje",
      value: "today",
      fn: () => {
        const today = new Date();
        return { from: today, to: today };
      },
    },
    {
      label: "Últimos 7 dias",
      value: "7days",
      fn: () => {
        const today = new Date();
        return { from: subDays(today, 6), to: today };
      },
    },
    {
      label: "Últimos 30 dias",
      value: "30days",
      fn: () => {
        const today = new Date();
        return { from: subDays(today, 29), to: today };
      },
    },
    {
      label: "Este mês",
      value: "thisMonth",
      fn: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: firstDay, to: today };
      },
    },
    {
      label: "Mês passado",
      value: "lastMonth",
      fn: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: firstDay, to: lastDay };
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
  ], []);

  // Função otimizada para carregar dados iniciais
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      // Carregar dados simultaneamente com Promise.all para melhor performance
      const [estatisticasResult, vendedoresResult, produtosResult] = await Promise.all([
        getEstatisticasPainel(),
        getVendedores(),
        getProdutos()
      ]);

      if (estatisticasResult.success && estatisticasResult.estatisticas) {
        setEstatisticas(estatisticasResult.estatisticas);
      } else if (estatisticasResult.error) {
        toast.error(estatisticasResult.error);
      }

      if (vendedoresResult.success && vendedoresResult.vendedores) {
        setVendedores(vendedoresResult.vendedores);
      }

      if (produtosResult.success && produtosResult.produtos) {
        setProdutos(produtosResult.produtos);
      }
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
      toast.error("Ocorreu um erro ao carregar os dados do painel");
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Aplicar filtros - otimizado com useCallback
  const aplicarFiltros = useCallback(async () => {
    setLoading(true);
    try {
      const params: EstatisticasPainelParams = {};

      // Aplicar filtro de data
      if (filter.dateRange?.from && filter.dateRange?.to) {
        params.dataInicio = filter.dateRange.from;
        params.dataFim = filter.dateRange.to;
      }

      // Aplicar filtro de vendedor
      if (filter.vendedorId) {
        params.vendedorId = filter.vendedorId;
      }

      // Aplicar filtro de produto
      if (filter.produtoId) {
        params.produtoId = filter.produtoId;
      }

      // Aplicar filtro de busca
      if (filter.searchTerm) {
        params.searchTerm = filter.searchTerm;
      }

      // Buscar dados filtrados
      const result = await getEstatisticasPainel(params);

      if (result.success && result.estatisticas) {
        setEstatisticas(result.estatisticas);
        setFiltroAberto(false);
        toast.success("Filtros aplicados com sucesso");
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Erro ao aplicar filtros:", error);
      toast.error("Ocorreu um erro ao aplicar os filtros");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Limpar filtros - otimizado com useCallback
  const limparFiltros = useCallback(async () => {
    // Resetar estado dos filtros
    setFilter({
      dateRange: undefined,
      vendedorId: undefined,
      produtoId: undefined,
      searchTerm: "",
    });
    setDateRange(undefined);
    setSearchTerm("");

    // Recarregar dados sem filtros
    setLoading(true);

    try {
      const result = await getEstatisticasPainel();

      if (result.success && result.estatisticas) {
        setEstatisticas(result.estatisticas);
        toast.success("Filtros removidos");
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Erro ao remover filtros:", error);
      toast.error("Erro ao remover filtros");
    } finally {
      setLoading(false);
    }
  }, []);

  // Aplicar filtro de período - otimizado com useCallback
  const aplicarPeriodo = useCallback(async (value: string) => {
    const periodoOption = periodoOptions.find((p) => p.value === value);

    if (periodoOption) {
      const newDateRange = periodoOption.fn();
      setDateRange(newDateRange);
      setFilter((prev) => ({ ...prev, dateRange: newDateRange }));

      // Aplicar filtro imediatamente
      setLoading(true);

      try {
        const params: EstatisticasPainelParams = {
          dataInicio: newDateRange.from,
          dataFim: newDateRange.to,
        };

        const result = await getEstatisticasPainel(params);

        if (result.success && result.estatisticas) {
          setEstatisticas(result.estatisticas);
          toast.success(`Filtro aplicado: ${periodoOption.label}`);
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Erro ao aplicar filtro de período:", error);
        toast.error("Erro ao aplicar filtro de período");
      } finally {
        setLoading(false);
      }
    }
  }, [periodoOptions]);

  // Toggle de ordenação - otimizado com useCallback
  const toggleSortDirection = useCallback(() => {
    setSortDirection((prevDirection) =>
      prevDirection === "asc" ? "desc" : "asc"
    );
  }, []);

  // Filtrar produtos pelo termo de pesquisa - otimizado com useMemo
  const filtrarProdutos = useMemo(() => {
    if (!estatisticas?.produtos) return [];

    let produtosFiltrados = [...estatisticas.produtos];

    // Aplicar pesquisa
    if (filter.searchTerm) {
      const termo = filter.searchTerm.toLowerCase();
      produtosFiltrados = produtosFiltrados.filter(
        (produto) =>
          produto.nome.toLowerCase().includes(termo) ||
          produto.medida.toLowerCase().includes(termo)
      );
    }

    // Aplicar ordenação
    produtosFiltrados.sort((a, b) => {
      if (produtosTab === "rank" && sortDirection === "desc") {
        return b.presenteEmVendas - a.presenteEmVendas;
      } else if (produtosTab === "rank" && sortDirection === "asc") {
        return a.presenteEmVendas - b.presenteEmVendas;
      } else if (sortDirection === "asc") {
        return a.nome.localeCompare(b.nome);
      } else {
        return b.nome.localeCompare(a.nome);
      }
    });

    return produtosFiltrados;
  }, [estatisticas?.produtos, filter.searchTerm, produtosTab, sortDirection]);

  // Filtrar vendedores pelo termo de pesquisa - otimizado com useMemo
  const filtrarVendedores = useMemo(() => {
    if (!estatisticas?.vendedores) return [];

    let vendedoresFiltrados = [...estatisticas.vendedores];

    // Aplicar pesquisa
    if (filter.searchTerm) {
      const termo = filter.searchTerm.toLowerCase();
      vendedoresFiltrados = vendedoresFiltrados.filter(
        (vendedor) =>
          vendedor.nome.toLowerCase().includes(termo) ||
          vendedor.email.toLowerCase().includes(termo)
      );
    }

    // Aplicar ordenação
    vendedoresFiltrados.sort((a, b) => {
      if (vendedoresTab === "rank" && sortDirection === "desc") {
        return b.valorTotalVendas - a.valorTotalVendas;
      } else if (vendedoresTab === "rank" && sortDirection === "asc") {
        return a.valorTotalVendas - b.valorTotalVendas;
      } else if (sortDirection === "asc") {
        return a.nome.localeCompare(b.nome);
      } else {
        return b.nome.localeCompare(a.nome);
      }
    });

    return vendedoresFiltrados;
  }, [estatisticas?.vendedores, filter.searchTerm, vendedoresTab, sortDirection]);

  // Filtrar clientes pelo termo de pesquisa - otimizado com useMemo
  const filtrarClientes = useMemo(() => {
    if (!estatisticas?.clientes) return [];

    let clientesFiltrados = [...estatisticas.clientes];

    // Aplicar pesquisa
    if (filter.searchTerm) {
      const termo = filter.searchTerm.toLowerCase();
      clientesFiltrados = clientesFiltrados.filter(
        (cliente) =>
          cliente.nome.toLowerCase().includes(termo) ||
          cliente.cnpj.toLowerCase().includes(termo) ||
          cliente.segmento.toLowerCase().includes(termo)
      );
    }

    // Aplicar ordenação
    clientesFiltrados.sort((a, b) => {
      if (clientesTab === "rank" && sortDirection === "desc") {
        return b.valorTotal - a.valorTotal;
      } else if (clientesTab === "rank" && sortDirection === "asc") {
        return a.valorTotal - b.valorTotal;
      } else if (sortDirection === "asc") {
        return a.nome.localeCompare(b.nome);
      } else {
        return b.nome.localeCompare(a.nome);
      }
    });

    return clientesFiltrados;
  }, [estatisticas?.clientes, filter.searchTerm, clientesTab, sortDirection]);

  // Formatar período selecionado para exibição
  const formatarPeriodoSelecionado = useCallback(() => {
    if (!dateRange?.from) return "Selecione um período";

    if (dateRange.to) {
      const from = format(dateRange.from, "dd/MM/yyyy");
      const to = format(dateRange.to, "dd/MM/yyyy");
      return `${from} - ${to}`;
    }

    return format(dateRange.from, "dd/MM/yyyy");
  }, [dateRange]);

  // Verificar se estamos carregando ou não temos dados
  if (loading && !estatisticas) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#00446A] mb-4" />
          <p className="text-lg font-medium">Carregando dados do painel...</p>
        </div>
      </div>
    );
  }

  // Se não tivermos estatísticas mesmo depois do carregamento
  if (!estatisticas && !loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-lg font-medium">
            Não foi possível carregar os dados do painel
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold">Painel de Vendas</h2>

        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="outline" onClick={toggleSortDirection}>
            {sortDirection === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
            <span className="sr-only">Ordenar</span>
          </Button>

          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start text-left font-normal h-10"
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
                        onClick={() => {
                          aplicarPeriodo(option.value);
                          setDatePickerOpen(false);
                        }}
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
                  setFilter((prev) => ({ ...prev, dateRange: range }));
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
                    setFilter((prev) => ({ ...prev, dateRange: undefined }));
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

          <Button variant="outline" onClick={() => setFiltroAberto(true)}>
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>

          <Button className="bg-[#00446A] text-white hover:bg-[#00446A]/90">
            <Download className="mr-2 h-4 w-4" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="flex flex-col w-full gap-4">
      <div className="flex gap-4 w-full">
        {/* Total de Orçamentos */}
        <Card className="w-[33%] !py-3">
          <CardContent >
            <div className="flex items-start justify-between">
              <div>
                <CardDescription className="text-sm flex gap-3 items-center text-gray-500">
                  Total de Orçamentos
                  <div className="bg-blue-100 w-fit p-2 rounded-full">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </CardDescription>
                <CardTitle className="text-3xl mt-1">
                  {estatisticas?.totalOrcamentos || 0}
                </CardTitle>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendas (Aprovados) */}
        <Card className="w-[33%] !py-3">
          <CardContent >
            <div className="flex items-start justify-between">
              <div>
                <CardDescription className="text-sm flex gap-3 items-center text-gray-500">
                  Vendas (Aprovados){" "}
                  <div className="bg-green-100 w-fit p-2 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </CardDescription>
                <CardTitle className="text-3xl mt-1">
                  {estatisticas?.totalVendas || 0}
                </CardTitle>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cotações canceladas (Recusados) */}
        <Card className="w-[33%] !py-3">
          <CardContent >
            <div className="flex items-start justify-between">
              <div>
                <CardDescription className="text-sm flex gap-3 items-center text-gray-500">
                  Venda perdidas (Recusados){" "}
                  <div className="bg-red-100 w-fit p-2 rounded-full">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </CardDescription>
                <CardTitle className="text-3xl mt-1">
                  {estatisticas?.totalNaoVendas || 0}
                </CardTitle>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex gap-4">
        {/* Valor Total de Vendas */}
        <Card className="w-[33%] !py-3">
          <CardContent >
            <div className="flex items-start justify-between">
              <div>
                <CardDescription className="text-sm flex gap-3 items-center text-gray-500">
                  Valor Total de Vendas{" "}
                  <div className="bg-purple-100 w-fit p-2 rounded-full">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </CardDescription>
                <CardTitle className="text-2xl mt-1">
                  {formatarValorBRL(estatisticas?.valorTotalVendas || 0)}
                </CardTitle>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendas Perdidas */}
        <Card className="w-[33%] !py-3">
          <CardContent >
            <div className="flex items-start justify-between">
              <div>
                <CardDescription className="text-sm flex gap-3 items-center text-gray-500">
                  Vendas Perdidas{" "}
                  <div className="bg-orange-100 w-fit p-2 rounded-full">
                    <TrendingDown className="h-6 w-6 text-orange-600" />
                  </div>
                </CardDescription>
                <CardTitle className="text-2xl mt-1">
                  {formatarValorBRL(estatisticas?.valorTotalNaoVendas || 0)}
                </CardTitle>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total de Clientes */}
        <Card className="w-[33%] !py-3">
          <CardContent >
            <div className="flex items-start justify-between">
              <div>
                <CardDescription className="text-sm flex gap-3 items-center text-gray-500">
                  Total de Clientes{" "}
                  <div className="bg-indigo-100 w-fit p-2 rounded-full">
                    <UserCheck className="h-6 w-6 text-indigo-600" />
                  </div>
                </CardDescription>
                <CardTitle className="text-3xl mt-1">
                  {estatisticas?.totalClientes || 0}
                </CardTitle>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gráfico de Área - Desempenho de Vendas */}
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Desempenho de Vendas</h3>
              <div className="flex p-1 rounded-md">
                <Tabs
                  value={chartTab}
                  onValueChange={(value) =>
                    setChartTab(value as "geral" | "vendas" | "naoVendas")
                  }
                >
                  <TabsList className="">
                    <TabsTrigger
                      value="geral"
                      className="data-[state=active]:shadow"
                    >
                      Geral
                    </TabsTrigger>
                    <TabsTrigger
                      value="vendas"
                      className="data-[state=active]:shadow"
                    >
                      Vendas
                    </TabsTrigger>
                    <TabsTrigger
                      value="naoVendas"
                      className="rounded data-[state=active]:shadow"
                    >
                      Cotações canceladas
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              {dateRange?.from
                ? formatarPeriodoSelecionado()
                : "Últimos 30 dias"}
            </p>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[#00446A]" />
              </div>
            ) : estatisticas?.chartData && estatisticas.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={estatisticas.chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatarValorBRL(value as number)}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Legend />
                  {(chartTab === "geral" || chartTab === "vendas") && (
                    <Area
                      type="monotone"
                      dataKey="vendas"
                      stackId="1"
                      stroke="#00446A"
                      fill="#00446A"
                      name="Vendas"
                    />
                  )}
                  {(chartTab === "geral" || chartTab === "naoVendas") && (
                    <Area
                      type="monotone"
                      dataKey="naoVendas"
                      stackId="1"
                      stroke="#f43f5e"
                      fill="#f43f5e"
                      name="Cotações canceladas"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <AlertCircle className="mx-auto h-12 w-12 mb-2" />
                  <p>Sem dados disponíveis para o período selecionado</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Clientes por Tipo */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-medium mb-4">Clientes por Tipo</h3>
            <p className="text-sm text-gray-500 mb-2">
              {dateRange ? formatarPeriodoSelecionado() : "Total"}
            </p>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[#00446A]" />
              </div>
            ) : (
              <DonutChart
                data={[
                  {
                    name: "Recorrentes",
                    value: estatisticas?.clientesRecorrentes || 0,
                  },
                  {
                    name: "Não Recorrentes",
                    value: estatisticas?.clientesNaoRecorrentes || 0,
                  },
                ]}
                title="Clientes Recorrentes vs Não Recorrentes"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas - Abas */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas</CardTitle>
          <CardDescription>
            {dateRange
              ? formatarPeriodoSelecionado()
              : "Dados de todo o período"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs
            value={statsTab}
            onValueChange={(value) =>
              setStatsTab(
                value as "geral" | "produtos" | "vendedores" | "clientes"
              )
            }
          >
            <TabsList className="mb-4">
              <TabsTrigger value="geral" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Geral
              </TabsTrigger>

              <TabsTrigger value="produtos" className="flex items-center gap-2">
                <Package2 className="h-4 w-4" />
                Produtos
              </TabsTrigger>

              <TabsTrigger
                value="vendedores"
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Vendedores
              </TabsTrigger>

              <TabsTrigger value="clientes" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Clientes
              </TabsTrigger>
            </TabsList>

            <div className="py-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00446A]" />
                </div>
              ) : (
                <>
                  {/* Tab Geral */}
                  <TabsContent value="geral">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Produto mais vendido */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            Produto mais vendido
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {estatisticas?.produtoMaisVendido ? (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-lg">
                                  {estatisticas.produtoMaisVendido.nome}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 border-blue-100"
                                >
                                  {formatarValorBRL(
                                    estatisticas.produtoMaisVendido.valorMedio
                                  )}
                                </Badge>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Medida:</span>
                                <span>
                                  {estatisticas.produtoMaisVendido.medida}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">
                                  Presente em:
                                </span>
                                <Badge
                                  variant="outline"
                                  className="bg-green-100 text-green-800 border-green-100"
                                >
                                  {
                                    estatisticas.produtoMaisVendido
                                      .presenteEmVendas
                                  }{" "}
                                  vendas
                                </Badge>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">
                                  Valor total:
                                </span>
                                <span className="font-medium">
                                  {formatarValorBRL(
                                    estatisticas.produtoMaisVendido.valorTotal
                                  )}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-500 text-center py-6">
                              Nenhum produto encontrado
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Vendedor com mais vendas */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            Vendedor com mais vendas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {estatisticas?.vendedorMaisVendas ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#00446A] text-white flex items-center justify-center">
                                  {estatisticas.vendedorMaisVendas.nome
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-lg">
                                    {estatisticas.vendedorMaisVendas.nome}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {estatisticas.vendedorMaisVendas.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex justify-between text-sm mt-2">
                                <span className="text-gray-500">
                                  Valor em vendas:
                                </span>
                                <span className="font-medium">
                                  {formatarValorBRL(
                                    estatisticas.vendedorMaisVendas
                                      .valorTotalVendas
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">
                                  Quantidade de vendas:
                                </span>
                                <Badge
                                  variant="outline"
                                  className="bg-green-100 text-green-800 border-green-100"
                                >
                                  {
                                    estatisticas.vendedorMaisVendas
                                      .quantidadeVendas
                                  }{" "}
                                  vendas
                                </Badge>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">
                                  Última venda:
                                </span>
                                <span>
                                  {formatDate(
                                    estatisticas.vendedorMaisVendas.ultimaVenda
                                  )}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-500 text-center py-6">
                              Nenhum vendedor encontrado
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Maior venda */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            Maior venda
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {estatisticas?.maiorVenda ? (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-lg">
                                  Código: {estatisticas.maiorVenda.codigoVenda}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="bg-purple-100 text-purple-800 border-purple-100"
                                >
                                  {formatarValorBRL(
                                    estatisticas.maiorVenda.valorTotal
                                  )}
                                </Badge>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Data:</span>
                                <span>
                                  {formatDate(estatisticas.maiorVenda.data)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Vendedor:</span>
                                <span>
                                  {estatisticas.maiorVenda.vendedorNome}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Cliente:</span>
                                <span>
                                  {estatisticas.maiorVenda.clienteNome}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-500 text-center py-6">
                              Nenhuma venda encontrada
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Funcionários registrados */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            Funcionários registrados
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-lg">Total</span>
                              <Badge
                                variant="outline"
                                className="bg-blue-100 text-blue-800 border-blue-100"
                              >
                                {estatisticas?.funcionarios?.total || 0}{" "}
                                funcionários
                              </Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Vendedores:</span>
                              <Badge
                                variant="outline"
                                className="border-gray-200 text-gray-800"
                              >
                                {estatisticas?.funcionarios?.vendedores || 0}{" "}
                                vendedores
                              </Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">
                                Administradores:
                              </span>
                              <Badge
                                variant="outline"
                                className="border-gray-200 text-gray-800"
                              >
                                {estatisticas?.funcionarios?.administradores ||
                                  0}{" "}
                                administradores
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Tab Produtos */}
                  <TabsContent value="produtos">
                    <Tabs
                      value={produtosTab}
                      onValueChange={(value) =>
                        setProdutosTab(value as "todos" | "rank")
                      }
                    >
                      <TabsList className="mb-4">
                        <TabsTrigger value="todos">
                          Todos os Produtos
                        </TabsTrigger>
                        <TabsTrigger value="rank">Ranking</TabsTrigger>
                      </TabsList>

                      <TabsContent value="todos">
                        <div className="overflow-auto">
                          {filtrarProdutos.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Medida</TableHead>
                                  <TableHead>Valor Médio</TableHead>
                                  <TableHead>Vendas</TableHead>
                                  <TableHead>Valor Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filtrarProdutos.map((produto) => (
                                  <TableRow key={produto.id}>
                                    <TableCell className="font-medium">
                                      {produto.nome}
                                    </TableCell>
                                    <TableCell>{produto.medida}</TableCell>
                                    <TableCell>
                                      {formatarValorBRL(produto.valorMedio)}
                                    </TableCell>
                                    <TableCell>
                                      {produto.presenteEmVendas}
                                    </TableCell>
                                    <TableCell>
                                      {formatarValorBRL(produto.valorTotal)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Package2 className="h-8 w-8 mx-auto mb-2" />
                              <p>Nenhum produto encontrado</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="rank">
                        <div className="space-y-3">
                          {filtrarProdutos.length > 0 ? (
                            filtrarProdutos
                              .slice(0, 10)
                              .map((produto, idx) => (
                                <Card
                                  key={produto.id}
                                  className={`${
                                    idx < 3
                                      ? "border-l-4 border-l-[#00446A]"
                                      : ""
                                  }`}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center justify-center w-8 h-8 rounded-full">
                                        <span className="font-bold text-gray-700">
                                          {idx + 1}
                                        </span>
                                      </div>
                                      <div className="flex-grow">
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <h3 className="font-medium text-lg">
                                              {produto.nome}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                              {produto.medida}
                                            </p>
                                          </div>
                                          <Badge
                                            className={`${
                                              idx < 3
                                                ? "bg-[#00446A]"
                                                : "bg-gray-600"
                                            } text-white`}
                                          >
                                            {formatarValorBRL(
                                              produto.valorTotal
                                            )}
                                          </Badge>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 mt-3">
                                          <div>
                                            <p className="text-xs text-gray-500">
                                              Presente em
                                            </p>
                                            <p className="font-medium">
                                              {produto.presenteEmVendas} vendas
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">
                                              Média por venda
                                            </p>
                                            <p className="font-medium">
                                              {produto.quantidadeMedia.toFixed(
                                                2
                                              )}{" "}
                                              unidades
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">
                                              Valor médio
                                            </p>
                                            <p className="font-medium">
                                              {formatarValorBRL(
                                                produto.valorMedio
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Package2 className="h-8 w-8 mx-auto mb-2" />
                              <p>Nenhum produto encontrado</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  {/* Tab Vendedores */}
                  <TabsContent value="vendedores">
                    <Tabs
                      value={vendedoresTab}
                      onValueChange={(value) =>
                        setVendedoresTab(value as "geral" | "rank")
                      }
                    >
                      <TabsList className="mb-4">
                        <TabsTrigger value="geral">Geral</TabsTrigger>
                        <TabsTrigger value="rank">Ranking</TabsTrigger>
                      </TabsList>

                      <TabsContent value="geral">
                        <div className="overflow-auto">
                          {filtrarVendedores.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Vendedor</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Vendas</TableHead>
                                  <TableHead>Cotações canceladas</TableHead>
                                  <TableHead>Valor Total</TableHead>
                                  <TableHead>Taxa de Sucesso</TableHead>
                                  <TableHead>Última Venda</TableHead>
                                  <TableHead>Clientes</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filtrarVendedores.map((vendedor) => (
                                  <TableRow key={vendedor.id}>
                                    <TableCell className="font-medium">
                                      {vendedor.nome}
                                    </TableCell>
                                    <TableCell>{vendedor.email}</TableCell>
                                    <TableCell>
                                      {vendedor.quantidadeVendas}
                                    </TableCell>
                                    <TableCell>
                                      {vendedor.quantidadeNaoVendas}
                                    </TableCell>
                                    <TableCell>
                                      {formatarValorBRL(
                                        vendedor.valorTotalVendas
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        <Badge
                                          variant="outline"
                                          className={`${
                                            vendedor.taxaSucesso >= 70
                                              ? "bg-green-100 text-green-800 border-green-100"
                                              : vendedor.taxaSucesso >= 40
                                              ? "bg-yellow-100 text-yellow-800 border-yellow-100"
                                              : "bg-red-100 text-red-800 border-red-100"
                                          }`}
                                        >
                                          {vendedor.taxaSucesso.toFixed(0)}%
                                        </Badge>
                                        {vendedor.taxaSucesso >= 70 ? (
                                          <TrendingUp className="h-4 w-4 text-green-600" />
                                        ) : vendedor.taxaSucesso < 40 ? (
                                          <TrendingDown className="h-4 w-4 text-red-600" />
                                        ) : null}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {formatDate(vendedor.ultimaVenda)}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col">
                                        <span>
                                          {vendedor.quantidadeClientes} total
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {vendedor.clientesRecorrentes}{" "}
                                          recorrentes
                                        </span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Users className="h-8 w-8 mx-auto mb-2" />
                              <p>Nenhum vendedor encontrado</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="rank">
                        <div className="space-y-3">
                          {filtrarVendedores.length > 0 ? (
                            filtrarVendedores.map((vendedor, idx) => (
                              <Card
                                key={vendedor.id}
                                className={`${
                                  idx < 3 ? "border-l-4 border-l-[#00446A]" : ""
                                }`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full">
                                      <span className="font-bold text-gray-700">
                                        {idx + 1}
                                      </span>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-[#00446A] text-white flex items-center justify-center">
                                      {vendedor.nome
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .substring(0, 2)
                                        .toUpperCase()}
                                    </div>
                                    <div className="flex-grow">
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <h3 className="font-medium text-lg">
                                            {vendedor.nome}
                                          </h3>
                                          <p className="text-sm text-gray-500">
                                            {vendedor.email}
                                          </p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                          <Badge
                                            className={`${
                                              idx < 3
                                                ? "bg-[#00446A]"
                                                : "bg-gray-600"
                                            } text-white`}
                                          >
                                            {formatarValorBRL(
                                              vendedor.valorTotalVendas
                                            )}
                                          </Badge>
                                          <div className="flex items-center mt-1 text-sm">
                                            <span
                                              className={
                                                vendedor.taxaSucesso >= 70
                                                  ? "text-green-600"
                                                  : vendedor.taxaSucesso >= 40
                                                  ? "text-yellow-600"
                                                  : "text-red-600"
                                              }
                                            >
                                              {vendedor.taxaSucesso.toFixed(0)}%
                                              de sucesso
                                            </span>
                                            {vendedor.taxaSucesso >= 70 ? (
                                              <TrendingUp className="h-3 w-3 ml-1 text-green-600" />
                                            ) : vendedor.taxaSucesso < 40 ? (
                                              <TrendingDown className="h-3 w-3 ml-1 text-red-600" />
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-4 gap-4 mt-3">
                                        <div>
                                          <p className="text-xs text-gray-500">
                                            Vendas
                                          </p>
                                          <p className="font-medium">
                                            {vendedor.quantidadeVendas}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500">
                                            Cotações canceladas
                                          </p>
                                          <p className="font-medium">
                                            {vendedor.quantidadeNaoVendas}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500">
                                            Média mensal
                                          </p>
                                          <p className="font-medium">
                                            {vendedor.mediaMensal} vendas
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500">
                                            Clientes
                                          </p>
                                          <p className="font-medium">
                                            {vendedor.quantidadeClientes} (
                                            {vendedor.clientesRecorrentes}{" "}
                                            recorrentes)
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Users className="h-8 w-8 mx-auto mb-2" />
                              <p>Nenhum vendedor encontrado</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  {/* Tab Clientes */}
                  <TabsContent value="clientes">
                    <Tabs
                      value={clientesTab}
                      onValueChange={(value) =>
                        setClientesTab(value as "geral" | "rank")
                      }
                    >
                      <TabsList className="mb-4">
                        <TabsTrigger value="geral">Geral</TabsTrigger>
                        <TabsTrigger value="rank">Ranking</TabsTrigger>
                      </TabsList>

                      <TabsContent value="geral">
                        <div className="overflow-auto">
                          {filtrarClientes.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Segmento</TableHead>
                                  <TableHead>CNPJ</TableHead>
                                  <TableHead>Compras</TableHead>
                                  <TableHead>Valor Médio</TableHead>
                                  <TableHead>Maior Compra</TableHead>
                                  <TableHead>Última Compra</TableHead>
                                  <TableHead>Produto Mais Comprado</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filtrarClientes.map((cliente) => (
                                  <TableRow key={cliente.id}>
                                    <TableCell className="font-medium">
                                      {cliente.nome}
                                    </TableCell>
                                    <TableCell>{cliente.segmento}</TableCell>
                                    <TableCell>{cliente.cnpj}</TableCell>
                                    <TableCell>
                                      {cliente.quantidadeVendas}
                                    </TableCell>
                                    <TableCell>
                                      {formatarValorBRL(cliente.valorMedio)}
                                    </TableCell>
                                    <TableCell>
                                      {formatarValorBRL(cliente.maiorValor)}
                                    </TableCell>
                                    <TableCell>
                                      {formatDate(cliente.ultimaCompra)}
                                    </TableCell>
                                    <TableCell>
                                      {cliente.produtoMaisComprado || "N/A"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <UserCheck className="h-8 w-8 mx-auto mb-2" />
                              <p>Nenhum cliente encontrado</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="rank">
                        <div className="space-y-3">
                          {filtrarClientes.length > 0 ? (
                            filtrarClientes
                              .slice(0, 10)
                              .map((cliente, idx) => (
                                <Card
                                  key={cliente.id}
                                  className={`${
                                    idx < 3
                                      ? "border-l-4 border-l-[#00446A]"
                                      : ""
                                  }`}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center justify-center w-8 h-8 rounded-full">
                                        <span className="font-bold text-gray-700">
                                          {idx + 1}
                                        </span>
                                      </div>
                                      <div className="flex-grow">
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <h3 className="font-medium text-lg">
                                              {cliente.nome}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                              {cliente.segmento} -{" "}
                                              {cliente.cnpj}
                                            </p>
                                          </div>
                                          <Badge
                                            className={`${
                                              idx < 3
                                                ? "bg-[#00446A]"
                                                : "bg-gray-600"
                                            } text-white`}
                                          >
                                            {formatarValorBRL(
                                              cliente.valorTotal
                                            )}
                                          </Badge>
                                        </div>
                                        <div className="grid grid-cols-4 gap-4 mt-3">
                                          <div>
                                            <p className="text-xs text-gray-500">
                                              Compras
                                            </p>
                                            <p className="font-medium">
                                              {cliente.quantidadeVendas}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">
                                              Valor Médio
                                            </p>
                                            <p className="font-medium">
                                              {formatarValorBRL(
                                                cliente.valorMedio
                                              )}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">
                                              Última Compra
                                            </p>
                                            <p className="font-medium">
                                              {formatDate(cliente.ultimaCompra)}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">
                                              Produto Favorito
                                            </p>
                                            <p
                                              className="font-medium truncate"
                                              title={
                                                cliente.produtoMaisComprado ||
                                                "N/A"
                                              }
                                            >
                                              {cliente.produtoMaisComprado ||
                                                "N/A"}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <UserCheck className="h-8 w-8 mx-auto mb-2" />
                              <p>Nenhum cliente encontrado</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog de Filtros */}
      <Dialog open={filtroAberto} onOpenChange={setFiltroAberto}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Filtrar Painel</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Período</label>
              <div className="flex flex-col space-y-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
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
                              onClick={() => {
                                aplicarPeriodo(option.value);
                              }}
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
                        setFilter((prev) => ({ ...prev, dateRange: range }));
                      }}
                      numberOfMonths={2}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Vendedor</label>
              <Select
                value={filter.vendedorId}
                onValueChange={(value) =>
                  setFilter((prev) => ({ ...prev, vendedorId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.id || ""}>
                      {vendedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Produto</label>
              <Select
                value={filter.produtoId}
                onValueChange={(value) =>
                  setFilter((prev) => ({ ...prev, produtoId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id || ""}>
                      {produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Pesquisa</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nome, CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={limparFiltros}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
            <Button variant="outline" onClick={() => setFiltroAberto(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={aplicarFiltros} disabled={loading}>
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
      {/* <MapaVendasRegiao /> */}

    </div>
    
  );
};

export default EnhancedDashboard;