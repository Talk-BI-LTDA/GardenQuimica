// src/components/FiltroDialog.tsx
import { useState, useEffect } from "react";
import {
  Filter, X, RefreshCcw, Calendar, Building, Users,
  DollarSign, PackageOpen, Search, Info
} from "lucide-react";
import { Dispatch, SetStateAction } from 'react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

// Lista de produtos fixa (baseada no arquivo ProdutoConcorrenciaForm.tsx)
const produtosFixos = [
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
  "Óleo Mineral",
  "MYRJ",
  "Poliquaternium 7",
  "Substituto da Trietanolamina (ALC 85)",
  "Monoetilenoglicol",
  "Quaternário 16-50 e 16-29",
  "Renex"
];

// Lista de segmentos
const segmentosFixos = [
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

// Lista de objeções fixas (do arquivo original)
const objecoesFixas = [
  "Falta de produto em estoque",
  "Prazo de entrega",
  "Preço da concorrência",
  "Logística",
  "Cliente inapto para compra",
  "Produto que não trabalhamos",
  "Outro",
];

// Tipos para o componente
interface Vendedor {
  id: string;
  nome: string;
}

interface ProdutoOption {
  id: string;
  nome: string;
}

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

interface FiltroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filtros: Filtros;
  setFiltros: Dispatch<SetStateAction<Filtros>> | ((filtros: Filtros) => void);
  aplicarFiltros: () => void;
  resetarFiltros: () => void;
  loading: boolean;
  vendedores: Vendedor[];
  segmentos: string[];
  produtos: ProdutoOption[] | string[];
  isAdmin: boolean;
}

// Função para formatar data como string dd/mm/yyyy
const formatDate = (date: Date | undefined): string => {
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Função para formatar valor monetário
const formatarValorBRL = (valor: string): string => {
  if (!valor) return '';
  // Remove todos os caracteres não numéricos, exceto ponto
  const apenasNumeros = valor.replace(/[^\d.]/g, '');
  // Converte para número e formata como moeda
  const numero = parseFloat(apenasNumeros);
  if (isNaN(numero)) return '';
  return numero.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Componente para o diálogo de filtro
export default function FiltroDialog({ 
  open, 
  onOpenChange, 
  filtros, 
  setFiltros,
  aplicarFiltros, 
  resetarFiltros, 
  loading,
  vendedores = [],
  segmentos = [],
  produtos = [],
  isAdmin = false
}: FiltroDialogProps) {
  // Estado para pesquisa de produtos
  const [produtoSearchTerm, setProdutoSearchTerm] = useState<string>("");
  
  // Estado para exibição de valores formatados
  const [valorMinimoExibicao, setValorMinimoExibicao] = useState<string>("");
  const [valorMaximoExibicao, setValorMaximoExibicao] = useState<string>("");
  
  // Estado para data do calendário
  const [dataInicio, setDataInicio] = useState<Date | undefined>(
    filtros.dataInicio ? new Date(filtros.dataInicio) : undefined
  );
  const [dataFim, setDataFim] = useState<Date | undefined>(
    filtros.dataFim ? new Date(filtros.dataFim) : undefined
  );
  
  // Estado para produtos selecionados (múltipla seleção)
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);
  
  // Juntar produtos fixos com produtos do catálogo e remover duplicatas
  const produtosDosCatalogos = produtos.map(p => 
    typeof p === 'string' ? p : p.nome
  );
  const allProdutos = [...produtosFixos, ...produtosDosCatalogos];
  const uniqueProdutos = [...new Set(allProdutos)].sort();
  
  // Juntar segmentos fixos com segmentos do catálogo e remover duplicatas
  const segmentosDosCatalogos = Array.isArray(segmentos) ? segmentos : [];
  const allSegmentos = [...segmentosFixos, ...segmentosDosCatalogos];
  const uniqueSegmentos = [...new Set(allSegmentos)].sort();

  // Filtrar produtos com base na pesquisa
  const filteredProdutos = uniqueProdutos.filter(produto =>
    produto.toLowerCase().includes(produtoSearchTerm.toLowerCase())
  );

  // Atualizar valores de exibição quando o componente montar ou quando os filtros mudarem
  useEffect(() => {
    if (filtros.valorMinimo) {
      setValorMinimoExibicao(formatarValorBRL(filtros.valorMinimo));
    } else {
      setValorMinimoExibicao("");
    }
    
    if (filtros.valorMaximo) {
      setValorMaximoExibicao(formatarValorBRL(filtros.valorMaximo));
    } else {
      setValorMaximoExibicao("");
    }
  }, [filtros.valorMinimo, filtros.valorMaximo]);

  const handleDataInicioChange = (date: Date | undefined) => {
    setDataInicio(date);
    if (date) {
      // Ajusta para o início do dia (00:00:00)
      const adjustedDate = new Date(date);
      adjustedDate.setHours(0, 0, 0, 0);
      setFiltros({
        ...filtros,
        dataInicio: adjustedDate.toISOString()
      });
    } else {
      setFiltros({
        ...filtros,
        dataInicio: ""
      });
    }
  };
  
  const handleDataFimChange = (date: Date | undefined) => {
    setDataFim(date);
    if (date) {
      // Ajusta para o fim do dia (23:59:59.999)
      const adjustedDate = new Date(date);
      adjustedDate.setHours(23, 59, 59, 999);
      setFiltros({
        ...filtros,
        dataFim: adjustedDate.toISOString()
      });
    } else {
      setFiltros({
        ...filtros,
        dataFim: ""
      });
    }
  };

  // Inicializar produtos selecionados a partir dos filtros ao abrir o diálogo
  useEffect(() => {
    if (open) {
      if (filtros.produtos && Array.isArray(filtros.produtos)) {
        setProdutosSelecionados(filtros.produtos);
      } else if (filtros.produto) {
        setProdutosSelecionados([filtros.produto]);
      } else {
        setProdutosSelecionados([]);
      }
    }
  }, [open, filtros.produtos, filtros.produto]);

  // Função para alternar a seleção de um produto
  const toggleProdutoSelection = (produto: string) => {
    const novosProdutosSelecionados = produtosSelecionados.includes(produto)
      ? produtosSelecionados.filter(p => p !== produto)
      : [...produtosSelecionados, produto];
    
    setProdutosSelecionados(novosProdutosSelecionados);
    
    // Atualizar filtro de produtos
    setFiltros({
      ...filtros,
      produtos: novosProdutosSelecionados,
      // Manter compatibilidade com APIs que esperam um único produto
      produto: novosProdutosSelecionados.length > 0 ? novosProdutosSelecionados[0] : ''
    });
  };

  // Selecionar o mês atual (com ajuste para dia completo)
  const selecionarMesAtual = () => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    inicioMes.setHours(0, 0, 0, 0); // Definir para 00:00:00
    
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    fimMes.setHours(23, 59, 59, 999); // Definir para 23:59:59.999
    
    handleDataInicioChange(inicioMes);
    handleDataFimChange(fimMes);
  };

  // Selecionar o dia de hoje (com ajuste para dia completo)
  const selecionarHoje = () => {
    const hoje = new Date();
    const inicioHoje = new Date(hoje);
    inicioHoje.setHours(0, 0, 0, 0);
    
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);
    
    handleDataInicioChange(inicioHoje);
    handleDataFimChange(fimHoje);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-5xl !w-[100%]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#00446A]">
            <Filter className="h-5 w-5" />
            Filtrar Cotações
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Coluna 1: Filtros principais */}
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-[#00446A]" />
                Período
              </h3>
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="px-2 text-xs"
                    onClick={selecionarMesAtual}
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    Mês atual
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="px-2 text-xs"
                    onClick={selecionarHoje}
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    Hoje
                  </Button>
                </div>
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
                        {dataInicio ? formatDate(dataInicio) : <span>Data inicial</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dataInicio}
                        onSelect={handleDataInicioChange}
                        initialFocus
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
                        {dataFim ? formatDate(dataFim) : <span>Data final</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dataFim}
                        onSelect={handleDataFimChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center">
                <Building className="h-4 w-4 mr-2 text-[#00446A]" />
                Dados do Cliente
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nome do Cliente</label>
                  <Input
                    placeholder="Digite o nome do cliente"
                    value={filtros.nomeCliente || ""}
                    onChange={(e) =>
                      setFiltros({ ...filtros, nomeCliente: e.target.value })
                    }
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Segmento</label>
                  <Select
                    value={filtros.segmento || ""}
                    onValueChange={(value) =>
                      setFiltros({ ...filtros, segmento: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos_segmentos">Todos os segmentos</SelectItem>
                      {uniqueSegmentos.map((segmento) => (
                        <SelectItem key={segmento} value={segmento}>
                          {segmento}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cliente Recorrente</label>
                  <Select
                    value={filtros.clienteRecorrente || ""}
                    onValueChange={(value) =>
                      setFiltros({ ...filtros, clienteRecorrente: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-[#00446A]" />
                Valor
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    R$
                  </span>
                  <Input
                    className="pl-8"
                    placeholder="Mínimo"
                    value={valorMinimoExibicao}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/[^\d]/g, '');
                      // Converter para float (divide por 100 para tratar como centavos)
                      const numeroFloat = valor ? parseFloat(valor) / 100 : 0;
                      // Atualizar os estados
                      setValorMinimoExibicao(numeroFloat.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }));
                      setFiltros({ ...filtros, valorMinimo: numeroFloat.toString() });
                    }}
                  />
                </div>
                <span className="text-gray-500">até</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    R$
                  </span>
                  <Input
                    className="pl-8"
                    placeholder="Máximo"
                    value={valorMaximoExibicao}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/[^\d]/g, '');
                      // Converter para float (divide por 100 para tratar como centavos)
                      const numeroFloat = valor ? parseFloat(valor) / 100 : 0;
                      // Atualizar os estados
                      setValorMaximoExibicao(numeroFloat.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }));
                      setFiltros({ ...filtros, valorMaximo: numeroFloat.toString() });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 2: Filtros adicionais */}
          <div className="space-y-5">
            {isAdmin && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-[#00446A]" />
                  Vendedor
                </h3>
                <Select
                  value={filtros.vendedor || ""}
                  onValueChange={(value) =>
                    setFiltros({ ...filtros, vendedor: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos_vendedores">Todos os vendedores</SelectItem>
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
              <h3 className="text-sm font-semibold mb-3 flex items-center">
                <Info className="h-4 w-4 mr-2 text-[#00446A]" />
                Objeções
              </h3>
              <Select
                value={filtros.objecao || ""}
                onValueChange={(value) =>
                  setFiltros({ ...filtros, objecao: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a objeção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas_objecoes">Todas as objeções</SelectItem>
                  {objecoesFixas.map((objecao) => (
                    <SelectItem key={objecao} value={objecao}>
                      {objecao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center">
                <PackageOpen className="h-4 w-4 mr-2 text-[#00446A]" />
                Produtos
              </h3>
              <div className="border rounded-md">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar produto..."
                      value={produtoSearchTerm}
                      onChange={(e) => setProdutoSearchTerm(e.target.value)}
                      className="pl-8 h-8"
                    />
                  </div>
                </div>
                
                <div className="max-h-[200px] overflow-y-auto p-2">
                  {filteredProdutos.length > 0 ? (
                    filteredProdutos.map((produto) => (
                      <div 
                        key={produto}
                        className="flex items-center space-x-2 py-1.5 px-1 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => toggleProdutoSelection(produto)}
                      >
                        <Checkbox 
                          checked={produtosSelecionados.includes(produto)}
                          onCheckedChange={() => toggleProdutoSelection(produto)}
                        />
                        <span className="text-sm">{produto}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Nenhum produto encontrado
                    </div>
                  )}
                </div>
                
                {produtosSelecionados.length > 0 && (
                  <div className="p-2 border-t">
                    <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
                      {produtosSelecionados.map(produto => (
                        <Badge 
                          key={produto} 
                          variant="secondary"
                          className="flex items-center gap-1 text-xs py-1"
                        >
                          {produto.length > 20 ? produto.substring(0, 20) + "..." : produto}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProdutoSelection(produto);
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Removida a seção de concorrência conforme solicitado */}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t mt-2">
          <Button variant="outline" onClick={resetarFiltros} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Limpar Filtros
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <Button 
            onClick={aplicarFiltros} 
            disabled={loading} 
            className="bg-[#00446A] hover:bg-[#00345A] gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Aplicando...
              </>
            ) : (
              <>
                <Filter className="h-4 w-4" />
                Aplicar Filtros
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}