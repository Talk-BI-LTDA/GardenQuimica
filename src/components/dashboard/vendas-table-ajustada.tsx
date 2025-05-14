// src/components/dashboard/vendas-table-ajustada.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
  DollarSign,
  FileText,
  ThumbsDown,
  ThumbsUp
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { formatarValorBRL } from '@/lib/utils'
import { getVendas, excluirVenda } from '@/actions/venda-actions'
import { getNaoVendas, excluirNaoVenda } from '@/actions/nao-venda-actions'
import { Venda } from '@/types/venda'
import { NaoVenda } from '@/types/nao-venda'

// Tipo para as estatísticas
interface Estatisticas {
  totalOrcamentos?: number;
  totalVendas?: number;
  totalNaoVendas?: number;
  valorTotalVendas?: number;
  valorTotalNaoVendas?: number;
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
  isAdmin?: boolean;
};

export function VendasTableAjustada({ 
  initialVendas = [], 
  initialNaoVendas = [], 
  initialEstatisticas = {},
  isAdmin = false 
}: VendasTableProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('painel');
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | NaoVenda | null>(null);
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState(false);
  const [itemTipo, setItemTipo] = useState<'venda' | 'naoVenda'>('venda');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para filtros
  const [filtros, setFiltros] = useState<Filtros>({
    segmento: '',
    nomeCliente: '',
    vendedor: '',
    dataInicio: '',
    dataFim: '',
    valorMinimo: '',
    valorMaximo: '',
    produto: '',
    objecao: '',
    clienteRecorrente: '',
    empresaConcorrente: '',
    valorConcorrenciaMin: '',
    valorConcorrenciaMax: ''
  });

  // Dados
  const [vendas, setVendas] = useState<Venda[]>(initialVendas);
  const [naoVendas, setNaoVendas] = useState<NaoVenda[]>(initialNaoVendas);
  const [estatisticas, ] = useState<Estatisticas>(initialEstatisticas);
  const [loading, setLoading] = useState(false);

  // Opções para selects
  const [vendedores, ] = useState<Vendedor[]>([
    { id: '1', nome: 'João Silva' },
    { id: '2', nome: 'Maria Oliveira' }
  ]);
  const [segmentos, ] = useState([
    'Industrial', 'Comercial', 'Residencial', 'Hospitalar', 'Educacional'
  ]);
  const [produtos,] = useState<ProdutoOption[]>([
    { id: '1', nome: 'Produto A' },
    { id: '2', nome: 'Produto B' }
  ]);
  
  // Ordenar dados
  const toggleSortDirection = () => {
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDirection);
    
    // Ordenar vendas por data
    const sortedVendas = [...vendas].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return newDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    setVendas(sortedVendas);
    
    // Ordenar não vendas por data
    const sortedNaoVendas = [...naoVendas].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return newDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    setNaoVendas(sortedNaoVendas);
  };
  
  // Pesquisar dados
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (!term) {
      setVendas(initialVendas);
      setNaoVendas(initialNaoVendas);
      return;
    }
    
    // Filtrar vendas
    const filteredVendas = initialVendas.filter(venda => 
      venda.cliente.nome.toLowerCase().includes(term) || 
      venda.codigoVenda.toLowerCase().includes(term)
    );
    
    setVendas(filteredVendas);
    
    // Filtrar não vendas
    const filteredNaoVendas = initialNaoVendas.filter(naoVenda => 
      naoVenda.cliente.nome.toLowerCase().includes(term) || 
      naoVenda.codigoVenda.toLowerCase().includes(term)
    );
    
    setNaoVendas(filteredNaoVendas);
  };
  
  // Filtrar dados por data
  const handleFilterByDate = (start: Date, end: Date) => {
    const filteredVendas = initialVendas.filter(venda => {
      const vendaDate = new Date(venda.createdAt);
      return vendaDate >= start && vendaDate <= end;
    });
    
    setVendas(filteredVendas);
    
    const filteredNaoVendas = initialNaoVendas.filter(naoVenda => {
      const naoVendaDate = new Date(naoVenda.createdAt);
      return naoVendaDate >= start && naoVendaDate <= end;
    });
    
    setNaoVendas(filteredNaoVendas);
  };
  
  // Filtrar dados
  const aplicarFiltros = async () => {
    setLoading(true);
    
    try {
      // Aplicar filtros às vendas
      const filtrosConvertidos: Record<string, string | number | boolean> = {};
      
      // Converter filtros para tipos adequados
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) {
          if (['valorMinimo', 'valorMaximo', 'valorConcorrenciaMin', 'valorConcorrenciaMax'].includes(key)) {
            filtrosConvertidos[key] = parseFloat(value);
          } else {
            filtrosConvertidos[key] = value;
          }
        }
      });
      
      const resultadoVendas = await getVendas(filtrosConvertidos);
      
      if (resultadoVendas.success) {
        setVendas(resultadoVendas.vendas);
      }
      
      // Aplicar filtros às não vendas
      const resultadoNaoVendas = await getNaoVendas(filtrosConvertidos);
      
      if (resultadoNaoVendas.success) {
        setNaoVendas(resultadoNaoVendas.naoVendas);
      }
      
      setFiltroAberto(false);
      toast.success('Filtros aplicados com sucesso');
    } catch (error) {
      console.error('Erro ao aplicar filtros:', error);
      toast.error('Erro ao aplicar filtros');
    } finally {
      setLoading(false);
    }
  };
  
  // Resetar filtros
  const resetarFiltros = () => {
    setFiltros({
      segmento: '',
      nomeCliente: '',
      vendedor: '',
      dataInicio: '',
      dataFim: '',
      valorMinimo: '',
      valorMaximo: '',
      produto: '',
      objecao: '',
      clienteRecorrente: '',
      empresaConcorrente: '',
      valorConcorrenciaMin: '',
      valorConcorrenciaMax: ''
    });
  };
  
  // Ver detalhes 
  const verDetalhes = (item: Venda | NaoVenda, tipo: 'venda' | 'naoVenda') => {
    setVendaSelecionada(item);
    setItemTipo(tipo);
    setDetalhesAbertos(true);
  };
  
  // Editar item
  const editarItem = (item: Venda | NaoVenda, tipo: 'venda' | 'naoVenda') => {
    if (tipo === 'venda') {
      router.push(`/vendas/${item.id}/editar`);
    } else {
      router.push(`/nao-vendas/${item.id}/editar`);
    }
  };
  
  // Excluir item
  const confirmarExclusao = (item: Venda | NaoVenda, tipo: 'venda' | 'naoVenda') => {
    setVendaSelecionada(item);
    setItemTipo(tipo);
    setConfirmacaoExclusao(true);
  };
  
  const excluirItemSelecionado = async () => {
    if (!vendaSelecionada) return;
    
    setLoading(true);
    
    try {
      let resultado;
      
      if (itemTipo === 'venda') {
        resultado = await excluirVenda(vendaSelecionada.id as string);
        
        if (resultado.success) {
          toast.success('Venda excluída com sucesso');
          setVendas(vendas.filter(v => v.id !== vendaSelecionada.id));
        } else {
          toast.error(resultado.error || 'Erro ao excluir venda');
        }
      } else {
        resultado = await excluirNaoVenda(vendaSelecionada.id as string);
        
        if (resultado.success) {
          toast.success('Não venda excluída com sucesso');
          setNaoVendas(naoVendas.filter(v => v.id !== vendaSelecionada.id));
        } else {
          toast.error(resultado.error || 'Erro ao excluir não venda');
        }
      }
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast.error(`Erro ao excluir ${itemTipo === 'venda' ? 'venda' : 'não venda'}`);
    } finally {
      setConfirmacaoExclusao(false);
      setVendaSelecionada(null);
      setLoading(false);
    }
  };
  

  
  // Renderizar ícone de ordenação
  const renderSortIcon = () => {
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };
  
  // Filtrar por período usando o componente Calendar
  const selecionarPeriodo = () => {
    // Aqui seria implementada a lógica para abrir um calendário e selecionar período
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    setFiltros({
      ...filtros,
      dataInicio: inicioMes.toISOString().split('T')[0],
      dataFim: fimMes.toISOString().split('T')[0]
    });
    
    handleFilterByDate(inicioMes, fimMes);
    
    toast.success('Filtrado por período: Mês atual');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho e filtros */}
      <div className="flex justify-between">
        <h2 className="text-2xl font-semibold">Painel de Vendas</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar..."
              className="pl-9"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          
          <Button variant="outline" onClick={toggleSortDirection}>
            {renderSortIcon()}
            <span className="sr-only">Ordenar</span>
          </Button>
          
          <Button variant="outline" onClick={selecionarPeriodo}>
            <Calendar className="mr-2 h-4 w-4" />
            Período
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setFiltroAberto(true)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Gerar Relatório
                <Lock className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.info('Funcionalidade em breve')}>
                Exportar para Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Funcionalidade em breve')}>
                Exportar para PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Nova UI de Botões de Ação */}
      <div className="flex items-center justify-center gap-4 bg-slate-50 py-6 px-8 rounded-lg">
        <div className="flex-1 text-center">
          <h3 className="text-lg font-semibold mb-4">Registrar Nova Transação</h3>
          <div className="flex gap-3 justify-center">
      <Link href="/vendas/nova">
        <Button 
          className="bg-green-600 hover:bg-green-700"
        >
          <ThumbsUp className="mr-2 h-5 w-5" />
          Nova Venda
        </Button>
      </Link>
      <Link href="/vendas/novo?modo=naoVenda">
        <Button 
          variant="outline" 
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          <ThumbsDown className="mr-2 h-5 w-5" />
          Nova Não-Venda
        </Button>
      </Link>
    </div>
          <p className="text-sm text-gray-500 mt-3">
            Registre vendas fechadas ou não consumadas para análise comparativa
          </p>
        </div>
      </div>
      
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Orçamentos</p>
                <h3 className="text-3xl font-bold mt-1">{estatisticas.totalOrcamentos || 0}</h3>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Vendas (Aprovados)</p>
                <h3 className="text-3xl font-bold mt-1">{estatisticas.totalVendas || 0}</h3>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Não Vendas (Recusados)</p>
                <h3 className="text-3xl font-bold mt-1">{estatisticas.totalNaoVendas || 0}</h3>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Valor Total de Vendas</p>
                <h3 className="text-3xl font-bold mt-1">{formatarValorBRL(estatisticas.valorTotalVendas || 0)}</h3>
              </div>
              <div className="bg-purple-100 p-2 rounded-full">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs e Tabela */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="painel">Painel de Vendas</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="naovendas">Não Vendas</TabsTrigger>
        </TabsList>
        
        {/* Conteúdo da Tab Painel */}
        <TabsContent value="painel">
          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.length > 0 ? (
                  vendas.map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-medium">{venda.codigoVenda}</TableCell>
                      <TableCell>{venda.vendedorNome}</TableCell>
                      <TableCell>{venda.cliente.nome}</TableCell>
                      <TableCell>{venda.cliente.cnpj}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{formatarValorBRL(venda.valorTotal)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-100 text-green-800">Aprovada</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(venda.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => verDetalhes(venda, 'venda')}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editarItem(venda, 'venda')}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem 
                                onClick={() => confirmarExclusao(venda, 'venda')}
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
                    <TableCell colSpan={9} className="text-center h-32 text-gray-500">
                      Nenhuma venda encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        {/* Conteúdo da Tab Vendas */}
        <TabsContent value="vendas">
          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.length > 0 ? (
                  vendas.map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-medium">{venda.codigoVenda}</TableCell>
                      <TableCell>{venda.vendedorNome}</TableCell>
                      <TableCell>{venda.cliente.nome}</TableCell>
                      <TableCell>{venda.cliente.cnpj}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{formatarValorBRL(venda.valorTotal)}</TableCell>
                      <TableCell>
                        {format(new Date(venda.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => verDetalhes(venda, 'venda')}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editarItem(venda, 'venda')}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem 
                                onClick={() => confirmarExclusao(venda, 'venda')}
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
                    <TableCell colSpan={8} className="text-center h-32 text-gray-500">
                      Nenhuma venda encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        {/* Conteúdo da Tab Não Vendas */}
        <TabsContent value="naovendas">
          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Objeção</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {naoVendas.length > 0 ? (
                  naoVendas.map((naoVenda) => (
                    <TableRow key={naoVenda.id}>
                      <TableCell className="font-medium">{naoVenda.codigoVenda}</TableCell>
                      <TableCell>{naoVenda.vendedorNome}</TableCell>
                      <TableCell>{naoVenda.cliente.nome}</TableCell>
                      <TableCell>{naoVenda.cliente.cnpj}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{formatarValorBRL(naoVenda.valorTotal)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-100">
                          {naoVenda.objecaoGeral ? 'Possui' : 'Não possui'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(naoVenda.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => verDetalhes(naoVenda, 'naoVenda')}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editarItem(naoVenda, 'naoVenda')}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem 
                                onClick={() => confirmarExclusao(naoVenda, 'naoVenda')}
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
                    <TableCell colSpan={9} className="text-center h-32 text-gray-500">
                      Nenhuma não-venda encontrada
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
            <DialogTitle>Filtrar Vendas</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Segmento da Empresa</label>
              <Select 
                value={filtros.segmento} 
                onValueChange={(value) => setFiltros({...filtros, segmento: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  {segmentos.map((segmento) => (
                    <SelectItem key={segmento} value={segmento}>
                      {segmento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Nome do Cliente</label>
              <Input 
                placeholder="Digite o nome do cliente" 
                value={filtros.nomeCliente}
                onChange={(e) => setFiltros({...filtros, nomeCliente: e.target.value})}
              />
            </div>
            
            {isAdmin && (
              <div>
                <label className="text-sm font-medium mb-1 block">Vendedor</label>
                <Select 
                  value={filtros.vendedor}
                  onValueChange={(value) => setFiltros({...filtros, vendedor: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map((vendedor) => (
                      <SelectItem key={vendedor.id} value={vendedor.id}>
                        {vendedor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium mb-1 block">Período</label>
              <div className="flex items-center gap-2">
                <Input 
                  type="date" 
                  placeholder="Data inicial"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
                />
                <span>até</span>
                <Input 
                  type="date" 
                  placeholder="Data final"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Intervalo de Valor</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-gray-500">R$</span>
                  <Input 
                    className="pl-8" 
                    placeholder="Mínimo"
                    value={filtros.valorMinimo}
                    onChange={(e) => setFiltros({...filtros, valorMinimo: e.target.value})}
                  />
                </div>
                <span>até</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-gray-500">R$</span>
                  <Input 
                    className="pl-8" 
                    placeholder="Máximo"
                    value={filtros.valorMaximo}
                    onChange={(e) => setFiltros({...filtros, valorMaximo: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Produtos</label>
              <Select 
                value={filtros.produto}
                onValueChange={(value) => setFiltros({...filtros, produto: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Objeções</label>
                <Select 
                  disabled
                  value={filtros.objecao}
                  onValueChange={(value) => setFiltros({...filtros, objecao: value})}
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
                <label className="text-sm font-medium mb-1 block">Cliente Recorrente</label>
                <Select 
                  disabled
                  value={filtros.clienteRecorrente}
                  onValueChange={(value) => setFiltros({...filtros, clienteRecorrente: value})}
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
                <label className="text-sm font-medium mb-1 block">Empresa Concorrente</label>
                <Select 
                  disabled
                  value={filtros.empresaConcorrente}
                  onValueChange={(value) => setFiltros({...filtros, empresaConcorrente: value})}
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
                <label className="text-sm font-medium mb-1 block">Valor Concorrência</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-gray-500">R$</span>
                    <Input 
                      disabled
                      className="pl-8" 
                      placeholder="Mínimo"
                      value={filtros.valorConcorrenciaMin}
                      onChange={(e) => setFiltros({...filtros, valorConcorrenciaMin: e.target.value})}
                    />
                  </div>
                  <span>até</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-gray-500">R$</span>
                    <Input 
                      disabled
                      className="pl-8" 
                      placeholder="Máximo"
                      value={filtros.valorConcorrenciaMax}
                      onChange={(e) => setFiltros({...filtros, valorConcorrenciaMax: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <Lock className="ml-2 h-4 w-4 text-gray-500" />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={resetarFiltros}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Resetar
            </Button>
            <Button variant="outline" onClick={() => setFiltroAberto(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={aplicarFiltros} disabled={loading}>
              {loading ? (
                <>Aplicando...</>
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
              <DialogTitle>
                {itemTipo === 'venda' ? 'Detalhes da Venda' : 'Detalhes da Não Venda'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Informações Gerais</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Código:</span>
                    <span className="font-medium">{vendaSelecionada.codigoVenda}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Data:</span>
                    <span className="font-medium">
                      {format(new Date(vendaSelecionada.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vendedor:</span>
                    <span className="font-medium">{vendaSelecionada.vendedorNome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valor Total:</span>
                    <span className="font-medium">{formatarValorBRL(vendaSelecionada.valorTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Condição de Pagamento:</span>
                    <span className="font-medium">{vendaSelecionada.condicaoPagamento}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Dados do Cliente</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nome:</span>
                    <span className="font-medium">{vendaSelecionada.cliente.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">CNPJ:</span>
                    <span className="font-medium">{vendaSelecionada.cliente.cnpj}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Segmento:</span>
                    <span className="font-medium">{vendaSelecionada.cliente.segmento}</span>
                  </div>
                  {vendaSelecionada.cliente.razaoSocial && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Razão Social:</span>
                      <span className="font-medium">{vendaSelecionada.cliente.razaoSocial}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">
                {itemTipo === 'venda' ? 'Produtos' : 'Produtos Garden vs Concorrência'}
              </h4>
              
              {itemTipo === 'venda' ? (
                // Produtos para venda
                <div className="space-y-2">
                  {(vendaSelecionada as Venda).produtos.map((produto, index) => (
                    <div 
                      key={index} 
                      className="bg-gray-50 p-3 rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{produto.nome}</p>
                        <p className="text-sm text-gray-500">
                          {produto.quantidade} {produto.medida} x {formatarValorBRL(produto.valor)}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatarValorBRL(produto.quantidade * produto.valor)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                // Produtos para não venda (comparação com concorrência)
                <div className="space-y-3">
                  {(vendaSelecionada as NaoVenda).produtosConcorrencia.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-medium">{item.produtoGarden.nome}</p>
                          <p className="text-sm text-gray-500">
                            {item.produtoGarden.quantidade} {item.produtoGarden.medida} x {formatarValorBRL(item.produtoGarden.valor)}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatarValorBRL(item.produtoGarden.quantidade * item.produtoGarden.valor)}
                        </p>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">Concorrência: {item.nomeConcorrencia}</p>
                            <p className="text-sm text-gray-600">Valor: {formatarValorBRL(item.valorConcorrencia)}</p>
                          </div>
                          
                          {item.icms && (
                            <p className="text-sm text-gray-600">ICMS: {item.icms}%</p>
                          )}
                        </div>
                        
                        {item.objecao && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Objeção:</span> {item.objecao}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Exibir objeção geral se for não-venda */}
            {itemTipo === 'naoVenda' && (vendaSelecionada as NaoVenda).objecaoGeral && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-2">Objeção Geral</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-700">{(vendaSelecionada as NaoVenda).objecaoGeral}</p>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetalhesAbertos(false)}>
                Fechar
              </Button>
              <Button onClick={() => editarItem(vendaSelecionada, itemTipo)}>
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
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir {itemTipo === 'venda' ? 'esta venda' : 'esta não venda'}?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmacaoExclusao(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={excluirItemSelecionado}
              disabled={loading}
            >
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}