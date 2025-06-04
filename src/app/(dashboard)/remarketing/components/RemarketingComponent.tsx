// @/app/(dashboard)/remarketing/components/RemarketingComponent.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format, addDays, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  PlusCircle,
  Calendar,
  Users,
  Tag,
  AlertCircle,
  Search,
  Loader2,
  ChevronDown,
  Check,
  Eye,
  Trash2,
  CalendarIcon,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Phone,
  ExternalLink,
  Settings,
} from "lucide-react";
import { getCatalogoItens } from "@/actions/catalogo-actions";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { TimePickerDemo } from "@/components/ui/time-picker-demo";
import { getClientes } from "@/actions/clientes-actions";
import {
  getRemarketingAgendados,
  getRemarketingEnviados,
  getRemarketingDetalhes,
  criarRemarketing,
  cancelarRemarketing,
  removerClienteRemarketing,
  atualizarDataRemarketing,
  buscarEImportarClientesTalkBI,
  // exportarClientesTalkBI,
  // atualizarPrefixoWhatsAppClientes
} from "@/actions/talkbi-actions";
import { ImportacaoProgressoDialog } from "@/components/ImportacaoProgressoDialog";
import ExportarClientesTalkBI from "@/components/ExportarClientesTalkBI";
import { Cliente } from "@/types/cliente";
import { RemarketingDetalhes } from "@/types/cliente-talkbi";
import EtiquetasFilter from "@/components/EtiquetasFilter";

interface RemarketingListItem {
  id: string;
  nome: string;
  dataAgendada: Date;
  status: string;
  totalClientes: number;
  vendedorNome: string;
}

// Interfaces para os resultados de exportação
interface ResultadoExportacao {
  id: string;
  nome: string;
  sucesso: boolean;
  user_ns?: string;
  erro?: string;
}

interface ResultadoAtualizacaoPrefixo {
  id: string;
  nome: string;
  whatsappAntigo: string;
  whatsappNovo: string;
  alterado: boolean;
}

interface ExportacaoResponse {
  success: boolean;
  error?: string;
  total: number;
  sucessos: number;
  falhas: number;
  resultados: ResultadoExportacao[];
}

interface AtualizacaoPrefixoResponse {
  success: boolean;
  error?: string;
  total: number;
  atualizados: number;
  inalterados: number;
  resultados: ResultadoAtualizacaoPrefixo[];
}

interface RemarketingComponentProps {
  session: {
    user: {
      role: string;
      id: string;
    };
  };
}

export default function RemarketingComponent({}: RemarketingComponentProps) {

  
  // Estados para dados
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>(
    []
  );
  const [remarketingAgendados, setRemarketingAgendados] = useState<
    RemarketingListItem[]
  >([]);
  const [remarketingEnviados, setRemarketingEnviados] = useState<
    RemarketingListItem[]
  >([]);
  const [remarketingDetalhes, setRemarketingDetalhes] =
    useState<RemarketingDetalhes | null>(null);
  const [selectAll, setSelectAll] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(20);

  // Estados para filtros e UI
  const [, setEtiquetas] = useState<string[]>([]);
  const [etiquetasSelecionadasFiltro, setEtiquetasSelecionadasFiltro] =
    useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filtroSegmento, setFiltroSegmento] = useState<string | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);
  const [tabAtiva, setTabAtiva] = useState("clientes");
  const [showRemarketingDialog, setShowRemarketingDialog] = useState(false);
  const [showDetalhesDialog, setShowDetalhesDialog] = useState(false);
  const [showExportarClientesDialog, setShowExportarClientesDialog] =
    useState(false);

  const [showProgressoImportacaoDialog, setShowProgressoImportacaoDialog] =
    useState(false);
  const [isInitiatingImport, setIsInitiatingImport] = useState(false);

  // Estados para criação de remarketing
  const [nomeRemarketing, setNomeRemarketing] = useState("");
  const [dataRemarketing, setDataRemarketing] = useState<Date | undefined>(
    new Date()
  );
  const [horaRemarketing, setHoraRemarketing] = useState<Date | undefined>(
    new Date()
  );
  const [opcaoDataRemarketing, setOpcaoDataRemarketing] = useState("imediato");

  // Estados para atualização de data de remarketing
  const [editandoRemarketingId, setEditandoRemarketingId] = useState<
    string | null
  >(null);
  const [novaDataRemarketing, setNovaDataRemarketing] = useState<
    Date | undefined
  >(new Date());
  const [novaHoraRemarketing, setNovaHoraRemarketing] = useState<
    Date | undefined
  >(new Date());
  const [showEditarDataDialog, setShowEditarDataDialog] = useState(false);

  // Novos estados para exportação de clientes
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdatingPrefixes, setIsUpdatingPrefixes] = useState(false);
  const [showExportarDialog, setShowExportarDialog] = useState(false);
  const [resultadoExportacao, setResultadoExportacao] = useState<{
    total: number;
    sucessos: number;
    falhas: number;
    resultados: ResultadoExportacao[];
  } | null>(null);
  const [resultadoAtualizacaoPrefixo, setResultadoAtualizacaoPrefixo] =
    useState<{
      total: number;
      atualizados: number;
      inalterados: number;
      resultados: ResultadoAtualizacaoPrefixo[];
    } | null>(null);

  const abrirExportarClientesDialog = () => {
    setShowExportarClientesDialog(true);
  };

  const handleImportarClientesTalkBI = async () => {
    toast.info("Tentando iniciar importação...");
    setIsInitiatingImport(true);
    setShowProgressoImportacaoDialog(true);

    try {
      const resultadoInicial = await buscarEImportarClientesTalkBI();

      if (
        resultadoInicial &&
        resultadoInicial.success === false &&
        resultadoInicial.error
      ) {
        toast.error(`Falha ao iniciar: ${resultadoInicial.error}`, {
          duration: 6000,
        });
        setShowProgressoImportacaoDialog(false);
      } else if (
        resultadoInicial &&
        "alreadyRunning" in resultadoInicial &&
        resultadoInicial.alreadyRunning
      ) {
        toast.dismiss();
        toast.info(
          resultadoInicial.message || "Importação já em execução ou pausada.",
          { duration: 4000 }
        );
      } else if (
        resultadoInicial &&
        resultadoInicial.success === true &&
        !(
          "alreadyRunning" in resultadoInicial &&
          resultadoInicial.alreadyRunning
        )
      ) {
        toast.dismiss();
      } else if (!resultadoInicial) {
        toast.error("Resposta inesperada ao iniciar importação.", {
          duration: 6000,
        });
        setShowProgressoImportacaoDialog(false);
      }
    } catch {
      toast.error("Erro crítico ao iniciar importação.", { duration: 6000 });
      setShowProgressoImportacaoDialog(false);
    } finally {
      setIsInitiatingImport(false);
    }
  };

  // Nova função para exportar clientes para TalkBI
  const handleExportarClientesTalkBI = async () => {
    setIsExporting(true);
    toast.info("Iniciando exportação para TalkBI...");

    try {
      const response = await fetch("/api/clientes/exportar-talkbi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao: "exportar",
          filtros: {
            segmento: filtroSegmento,
            clienteIds:
              clientesSelecionados.length > 0
                ? clientesSelecionados
                : undefined,
            recorrente: undefined,
          },
        }),
      });

      const data = (await response.json()) as ExportacaoResponse;

      if (data.success) {
        toast.success(
          `Exportação concluída: ${data.sucessos} de ${data.total} clientes exportados com sucesso.`
        );

        console.log("Resultado da exportação:", data);

        setResultadoExportacao({
          total: data.total,
          sucessos: data.sucessos,
          falhas: data.falhas,
          resultados: data.resultados,
        });
        setResultadoAtualizacaoPrefixo(null);

        // Forçar renderização e garantir que o estado foi atualizado antes de abrir o diálogo
        setTimeout(() => {
          setShowExportarDialog(true);
        }, 100);

        await carregarClientes();
      } else {
        toast.error(data.error || "Erro ao exportar clientes para TalkBI");
      }
    } catch (error) {
      console.error("Erro ao exportar clientes:", error);
      toast.error("Ocorreu um erro ao exportar os clientes para TalkBI");
    } finally {
      setIsExporting(false);
    }
  };

  // Nova função para atualizar prefixos +55 dos números de WhatsApp
  const handleAtualizarPrefixosWhatsApp = async () => {
    setIsUpdatingPrefixes(true);
    toast.info("Atualizando prefixos +55 dos números de WhatsApp...");

    try {
      const response = await fetch("/api/clientes/exportar-talkbi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao: "atualizar-prefixo",
        }),
      });

      const data = (await response.json()) as AtualizacaoPrefixoResponse;

      if (data.success) {
        toast.success(
          `${data.atualizados} de ${data.total} números de WhatsApp foram atualizados com o prefixo +55.`
        );
        setResultadoAtualizacaoPrefixo({
          total: data.total,
          atualizados: data.atualizados,
          inalterados: data.inalterados,
          resultados: data.resultados,
        });
        setResultadoExportacao(null);
        setShowExportarDialog(true);

        await carregarClientes();
      } else {
        toast.error(
          data.error || "Erro ao atualizar prefixos dos números de WhatsApp"
        );
      }
    } catch (error) {
      console.error("Erro ao atualizar prefixos:", error);
      toast.error(
        "Ocorreu um erro ao atualizar os prefixos dos números de WhatsApp"
      );
    } finally {
      setIsUpdatingPrefixes(false);
    }
  };

  // Memoização dos segmentos únicos
  const segmentosUnicos = useMemo(() => {
    return Array.from(new Set(clientes.map((c) => c.segmento)));
  }, [clientes]);

  // Memoização dos clientes filtrados
  const clientesFiltrados = useMemo(() => {
    return clientes.filter((cliente) => {
      // Filtro de segmento
      const passaPorFiltroSegmento = filtroSegmento
        ? cliente.segmento === filtroSegmento
        : true;
  
      // Filtro de busca
      const passaPorFiltroBusca = searchTerm
        ? cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cliente.cnpj.includes(searchTerm)
        : true;
  
      // Filtro por etiquetas - CORREÇÃO
      let passaPorFiltroEtiqueta = true;

if (etiquetasSelecionadasFiltro.length > 0) {
  if (!cliente.EtiquetaCliente || cliente.EtiquetaCliente.length === 0) {
    passaPorFiltroEtiqueta = false;
  } else {
    passaPorFiltroEtiqueta = false;
    
    // Juntar todas as etiquetas do cliente em uma string única para busca
    const todasEtiquetasCliente = cliente.EtiquetaCliente
      .map(e => e.nome.toLowerCase())
      .join(' ');
    
    console.log(`Cliente ${cliente.nome} - Etiquetas: "${todasEtiquetasCliente}"`);
    
    for (const etiquetaSelecionada of etiquetasSelecionadasFiltro) {
      // Múltiplas tentativas de conversão para encontrar match
      const tentativas = [
        // 1. Nome original em minúsculas
        etiquetaSelecionada.toLowerCase(),
        
        // 2. Conversão básica (espaços para underscore)
        etiquetaSelecionada.toLowerCase().replace(/\s+/g, '_'),
        
        // 3. Conversão completa
        etiquetaSelecionada
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "_")
          .replace(/[^\w\-_()]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, ""),
        
        // 4. Apenas letras e números
        etiquetaSelecionada.toLowerCase().replace(/[^a-z0-9]/g, ""),
        
        // 5. Primeira palavra apenas
        etiquetaSelecionada.toLowerCase().split(' ')[0]
      ];
      
      console.log(`Buscando "${etiquetaSelecionada}" com tentativas:`, tentativas);
      
      // Verificar se alguma tentativa encontra match
      for (const tentativa of tentativas) {
        if (tentativa && todasEtiquetasCliente.includes(tentativa)) {
          console.log(`✅ MATCH encontrado: "${tentativa}" em "${todasEtiquetasCliente}"`);
          passaPorFiltroEtiqueta = true;
          break;
        }
      }
      
      if (passaPorFiltroEtiqueta) break;
    }
    
    if (!passaPorFiltroEtiqueta) {
      console.log(`❌ Nenhum match para cliente ${cliente.nome}`);
    }
  }
}
  
      return passaPorFiltroSegmento && passaPorFiltroBusca && passaPorFiltroEtiqueta;
    });
  }, [clientes, filtroSegmento, searchTerm, etiquetasSelecionadasFiltro]);

  // Funções de carregamento
  const carregarClientes = useCallback(async () => {
    try {
      const resultado = await getClientes();
      if (resultado.success && resultado.clientes) {
        setClientes(resultado.clientes);
      } else {
        toast.error(resultado.error || "Erro ao carregar clientes");
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast.error("Ocorreu um erro ao carregar os clientes");
    }
  }, [setClientes]);

  const carregarRemarketingAgendados = useCallback(async () => {
    try {
      const resultado = await getRemarketingAgendados();
      if (resultado.success && resultado.remarketing) {
        setRemarketingAgendados(resultado.remarketing);
      } else {
        toast.error(
          resultado.error || "Erro ao carregar remarketing agendados"
        );
      }
    } catch (error) {
      console.error("Erro ao carregar remarketing agendados:", error);
      toast.error("Ocorreu um erro ao carregar os remarketing agendados");
    }
  }, [setRemarketingAgendados]);

  const carregarRemarketingEnviados = useCallback(async () => {
    try {
      const resultado = await getRemarketingEnviados();
      if (resultado.success && resultado.remarketing) {
        setRemarketingEnviados(resultado.remarketing);
      } else {
        toast.error(resultado.error || "Erro ao carregar remarketing enviados");
      }
    } catch (error) {
      console.error("Erro ao carregar remarketing enviados:", error);
      toast.error("Ocorreu um erro ao carregar os remarketing enviados");
    }
  }, [setRemarketingEnviados]);

  // Função para carregar etiquetas dos clientes e produtos do catálogo
  const carregarEtiquetas = useCallback(async () => {
    try {
      console.log("Iniciando carregamento de etiquetas...");

      // Buscar produtos do catálogo (que serão usados como etiquetas)
      const resProdutos = await getCatalogoItens("produto");

      // Conjunto para armazenar todas as etiquetas únicas
      const todasEtiquetas = new Set<string>();

      // Adicionar produtos do catálogo como etiquetas
      if (resProdutos.success && resProdutos.itens) {
        console.log(
          `Adicionando ${resProdutos.itens.length} produtos do catálogo como etiquetas`
        );
        resProdutos.itens.forEach((produto) => {
          todasEtiquetas.add(produto.nome);
        });
      }

      // Buscar etiquetas já associadas aos clientes
      const resClientes = await getClientes();
      if (resClientes.success && resClientes.clientes) {
        console.log(
          `Processando etiquetas de ${resClientes.clientes.length} clientes`
        );
        resClientes.clientes.forEach((cliente) => {
          if (cliente.EtiquetaCliente && cliente.EtiquetaCliente.length > 0) {
            cliente.EtiquetaCliente.forEach((etiqueta) => {
              todasEtiquetas.add(etiqueta.nome);
            });
          }
        });
      }

      // Converter para array e atualizar estado
      const etiquetasArray = Array.from(todasEtiquetas);
      console.log(`Total de etiquetas carregadas: ${etiquetasArray.length}`);
      setEtiquetas(etiquetasArray);
    } catch (error) {
      console.error("Erro ao carregar etiquetas:", error);
      toast.error("Erro ao carregar as etiquetas");
    }
  }, []);

  // UseEffect para carregar dados iniciais
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      setLoading(true);
      try {
        await Promise.all([
          carregarClientes(),
          carregarRemarketingAgendados(),
          carregarRemarketingEnviados(),
          carregarEtiquetas(), // Carregar etiquetas
        ]);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        setLoading(false);
      }
    };

    if (typeof window !== "undefined") {
      carregarDadosIniciais();
    }
  }, [
    carregarClientes,
    carregarRemarketingAgendados,
    carregarRemarketingEnviados,
    carregarEtiquetas,
  ]);

  // Ver detalhes do remarketing
  const verDetalhesRemarketing = async (id: string) => {
    setLoading(true);
    try {
      const resultado = await getRemarketingDetalhes(id);
      if (resultado.success && resultado.remarketing) {
        setRemarketingDetalhes(resultado.remarketing);
        setShowDetalhesDialog(true);
      } else {
        toast.error(
          resultado.error || "Erro ao carregar detalhes do remarketing"
        );
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes do remarketing:", error);
      toast.error("Ocorreu um erro ao carregar os detalhes do remarketing");
    } finally {
      setLoading(false);
    }
  };

  // Cancelar remarketing
  const handleCancelarRemarketing = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar este remarketing?")) {
      return;
    }

    setLoading(true);
    try {
      const resultado = await cancelarRemarketing(id);
      if (resultado.success) {
        toast.success("Remarketing cancelado com sucesso");
        await carregarRemarketingAgendados();
      } else {
        toast.error(resultado.error || "Erro ao cancelar remarketing");
      }
    } catch (error) {
      console.error("Erro ao cancelar remarketing:", error);
      toast.error("Ocorreu um erro ao cancelar o remarketing");
    } finally {
      setLoading(false);
    }
  };

  // Remover cliente do remarketing
  const handleRemoverClienteRemarketing = async (
    remarketingId: string,
    clienteId: string
  ) => {
    if (
      !confirm("Tem certeza que deseja remover este cliente do remarketing?")
    ) {
      return;
    }

    setLoading(true);
    try {
      const resultado = await removerClienteRemarketing(
        remarketingId,
        clienteId
      );
      if (resultado.success) {
        toast.success("Cliente removido do remarketing com sucesso");

        if (remarketingDetalhes && remarketingDetalhes.id === remarketingId) {
          const detalhesAtualizados = await getRemarketingDetalhes(
            remarketingId
          );
          if (detalhesAtualizados.success && detalhesAtualizados.remarketing) {
            setRemarketingDetalhes(detalhesAtualizados.remarketing);
          }
        }

        await carregarRemarketingAgendados();
      } else {
        toast.error(
          resultado.error || "Erro ao remover cliente do remarketing"
        );
      }
    } catch (error) {
      console.error("Erro ao remover cliente do remarketing:", error);
      toast.error("Ocorreu um erro ao remover o cliente do remarketing");
    } finally {
      setLoading(false);
    }
  };

  // Atualizar data do remarketing
  const handleAtualizarDataRemarketing = async () => {
    if (
      !editandoRemarketingId ||
      !novaDataRemarketing ||
      !novaHoraRemarketing
    ) {
      toast.error("Selecione uma data e hora válidas");
      return;
    }

    const dataHora = new Date(novaDataRemarketing);
    dataHora.setHours(
      novaHoraRemarketing.getHours(),
      novaHoraRemarketing.getMinutes(),
      0,
      0
    );

    if (isBefore(dataHora, new Date())) {
      toast.error("A data de agendamento deve ser no futuro");
      return;
    }

    setLoading(true);
    try {
      const resultado = await atualizarDataRemarketing(
        editandoRemarketingId,
        dataHora
      );
      if (resultado.success) {
        toast.success("Data do remarketing atualizada com sucesso");
        setShowEditarDataDialog(false);

        if (
          remarketingDetalhes &&
          remarketingDetalhes.id === editandoRemarketingId
        ) {
          const detalhesAtualizados = await getRemarketingDetalhes(
            editandoRemarketingId
          );
          if (detalhesAtualizados.success && detalhesAtualizados.remarketing) {
            setRemarketingDetalhes(detalhesAtualizados.remarketing);
          }
        }

        await carregarRemarketingAgendados();
      } else {
        toast.error(resultado.error || "Erro ao atualizar data do remarketing");
      }
    } catch (error) {
      console.error("Erro ao atualizar data do remarketing:", error);
      toast.error("Ocorreu um erro ao atualizar a data do remarketing");
    } finally {
      setLoading(false);
    }
  };

  // Manipular toggle de "selecionar todos"
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setClientesSelecionados(clientesPaginados.map((c) => c.id));
    } else {
      setClientesSelecionados([]);
    }
  };

  // Manipular seleção de cliente individual
  const handleSelectCliente = useCallback(
    (clienteId: string, checked: boolean) => {
      if (checked) {
        setClientesSelecionados((prev) => [...prev, clienteId]);
      } else {
        setClientesSelecionados((prev) =>
          prev.filter((id) => id !== clienteId)
        );
      }
    },
    []
  );

  // Configurar data do remarketing baseado na opção selecionada
  const configurarDataRemarketing = (opcao: string) => {
    setOpcaoDataRemarketing(opcao);
    const hoje = new Date();

    switch (opcao) {
      case "imediato":
        setDataRemarketing(hoje);
        break;
      case "7dias":
        setDataRemarketing(addDays(hoje, 7));
        break;
      case "15dias":
        setDataRemarketing(addDays(hoje, 15));
        break;
      case "30dias":
        setDataRemarketing(addDays(hoje, 30));
        break;
      default:
        break;
    }
  };

  // Criar novo remarketing
  const handleCriarRemarketing = async () => {
    if (clientesSelecionados.length === 0) {
      toast.error("Selecione pelo menos um cliente");
      return;
    }

    if (!nomeRemarketing) {
      toast.error("Digite um nome para o remarketing");
      return;
    }

    if (!dataRemarketing || !horaRemarketing) {
      toast.error("Selecione uma data e hora válidas");
      return;
    }

    const dataHora = new Date(dataRemarketing);
    dataHora.setHours(
      horaRemarketing.getHours(),
      horaRemarketing.getMinutes(),
      0,
      0
    );

    if (opcaoDataRemarketing !== "imediato" && isBefore(dataHora, new Date())) {
      toast.error("A data de agendamento deve ser no futuro");
      return;
    }

    setLoading(true);
    try {
      const resultado = await criarRemarketing({
        nome: nomeRemarketing,
        dataAgendada: dataHora,
        clienteIds: clientesSelecionados,
      });

      if (resultado.success) {
        toast.success("Remarketing criado com sucesso");
        setShowRemarketingDialog(false);
        setNomeRemarketing("");
        setClientesSelecionados([]);
        setSelectAll(false);
        await carregarRemarketingAgendados();
        setTabAtiva("agendados");
      } else {
        toast.error(resultado.error || "Erro ao criar remarketing");
      }
    } catch (error) {
      console.error("Erro ao criar remarketing:", error);
      toast.error("Ocorreu um erro ao criar o remarketing");
    } finally {
      setLoading(false);
    }
  };

  // Handler para mudança de segmento
  const handleSegmentoChange = (segmento: string) => {
    setFiltroSegmento(segmento === "todos" ? undefined : segmento);
  };

  // Paginação dos clientes
  const clientesPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return clientesFiltrados.slice(inicio, fim);
  }, [clientesFiltrados, paginaAtual, itensPorPagina]);

  // Calcular total de páginas
  const totalPaginas = useMemo(() => {
    return Math.ceil(clientesFiltrados.length / itensPorPagina);
  }, [clientesFiltrados, itensPorPagina]);

  // Função para mudar de página
  const mudarPagina = useCallback((pagina: number) => {
    setPaginaAtual(pagina);
    setSelectAll(false);
  }, []);

  // Reset de página quando os filtros mudam
  useEffect(() => { setPaginaAtual(1); }, [searchTerm, filtroSegmento, etiquetasSelecionadasFiltro]);


  const clienteEstaSelectionado = useCallback(
    (id: string) => {
      return clientesSelecionados.includes(id);
    },
    [clientesSelecionados]
  );

  // UseEffect para atualizar seleção "todos" quando clientesSelecionados muda
  useEffect(() => {
    if (
      clientesPaginados.length > 0 &&
      clientesSelecionados.length === clientesPaginados.length
    ) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [clientesSelecionados, clientesPaginados.length]);

  
  const handleEtiquetasFiltroChange = (novasEtiquetas: string[]) => {
    console.log("Etiquetas selecionadas para filtro:", novasEtiquetas);
    setEtiquetasSelecionadasFiltro(novasEtiquetas);
    
    // Se tiver selecionado etiquetas, verificar a estrutura dos dados para debug
    if (novasEtiquetas.length > 0) {
      // Verificar clientes que possuem as etiquetas selecionadas
      const clientesComEtiquetasSelecionadas = clientes.filter(cliente => 
        cliente.EtiquetaCliente && Array.isArray(cliente.EtiquetaCliente) && 
        cliente.EtiquetaCliente.some(etiqueta => novasEtiquetas.includes(etiqueta.nome))
      );
      
      console.log(`Clientes com as etiquetas selecionadas: ${clientesComEtiquetasSelecionadas.length}`);
      
      // Verificar a estrutura da primeira etiqueta de cada cliente
      if (clientesComEtiquetasSelecionadas.length > 0) {
        const primeiroCliente = clientesComEtiquetasSelecionadas[0];
        if (primeiroCliente.EtiquetaCliente && primeiroCliente.EtiquetaCliente.length > 0) {
          console.log("Estrutura da etiqueta:", JSON.stringify(primeiroCliente.EtiquetaCliente[0]));
        }
      }
    }
  };
  // Componente para o diálogo de resultados de exportação
  const ExportarDialog = () => (
    <Dialog open={showExportarDialog} onOpenChange={setShowExportarDialog}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {resultadoExportacao
              ? "Resultados da Exportação para TalkBI"
              : "Resultados da Atualização de Prefixos"}
          </DialogTitle>
          <DialogDescription>
            {resultadoExportacao
              ? "Detalhes dos clientes exportados para a plataforma TalkBI"
              : "Detalhes dos números de WhatsApp atualizados com o prefixo +55"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex-1 overflow-hidden">
          {resultadoExportacao && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 rounded-lg border bg-green-50 border-green-200 text-center">
                  <div className="flex items-center justify-center text-green-600 mb-1">
                    <Check className="h-5 w-5 mr-1" />
                    <span className="text-xs font-medium">Sucessos</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {resultadoExportacao.sucessos}
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-red-50 border-red-200 text-center">
                  <div className="flex items-center justify-center text-red-600 mb-1">
                    <AlertCircle className="h-5 w-5 mr-1" />
                    <span className="text-xs font-medium">Falhas</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {resultadoExportacao.falhas}
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-blue-50 border-blue-200 text-center">
                  <div className="flex items-center justify-center text-blue-600 mb-1">
                    <Users className="h-5 w-5 mr-1" />
                    <span className="text-xs font-medium">Total</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {resultadoExportacao.total}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <h4 className="font-medium mb-2">Detalhes por cliente</h4>

              <ScrollArea className="h-[calc(90vh-350px)] pr-4">
                <div className="space-y-3">
                  {resultadoExportacao.resultados.map((resultado) => (
                    <Card key={resultado.id} className="p-0">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{resultado.nome}</h5>
                            {resultado.sucesso ? (
                              <p className="text-sm text-green-600">
                                <Check className="h-4 w-4 inline mr-1" />
                                Exportado com sucesso
                                {resultado.user_ns && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    ID: {resultado.user_ns}
                                  </span>
                                )}
                              </p>
                            ) : (
                              <p className="text-sm text-red-600">
                                <AlertCircle className="h-4 w-4 inline mr-1" />
                                {resultado.erro || "Falha na exportação"}
                              </p>
                            )}
                          </div>
                          <Badge
                            className={
                              resultado.sucesso
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {resultado.sucesso ? "Sucesso" : "Falha"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {resultadoAtualizacaoPrefixo && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 rounded-lg border bg-green-50 border-green-200 text-center">
                  <div className="flex items-center justify-center text-green-600 mb-1">
                    <Phone className="h-5 w-5 mr-1" />
                    <span className="text-xs font-medium">Atualizados</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {resultadoAtualizacaoPrefixo.atualizados}
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-gray-50 border-gray-200 text-center">
                  <div className="flex items-center justify-center text-gray-600 mb-1">
                    <Check className="h-5 w-5 mr-1" />
                    <span className="text-xs font-medium">Já Formatados</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-600">
                    {resultadoAtualizacaoPrefixo.inalterados}
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-blue-50 border-blue-200 text-center">
                  <div className="flex items-center justify-center text-blue-600 mb-1">
                    <Users className="h-5 w-5 mr-1" />
                    <span className="text-xs font-medium">Total</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {resultadoAtualizacaoPrefixo.total}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <h4 className="font-medium mb-2">Detalhes por cliente</h4>

              <ScrollArea className="h-[calc(90vh-350px)] pr-4">
                <div className="space-y-3">
                  {resultadoAtualizacaoPrefixo.resultados.map((resultado) => (
                    <Card key={resultado.id} className="p-0">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{resultado.nome}</h5>
                            <div className="mt-1">
                              <p className="text-sm">
                                <span className="text-gray-500">Anterior:</span>{" "}
                                {resultado.whatsappAntigo || "-"}
                              </p>
                              <p className="text-sm">
                                <span className="text-gray-500">Atual:</span>{" "}
                                <span
                                  className={
                                    resultado.alterado
                                      ? "text-green-600 font-medium"
                                      : ""
                                  }
                                >
                                  {resultado.whatsappNovo || "-"}
                                </span>
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={
                              resultado.alterado
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {resultado.alterado ? "Atualizado" : "Inalterado"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button onClick={() => setShowExportarDialog(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Remarketing</h2>
      </div>

      <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
        <TabsList className="mb-4">
          <TabsTrigger value="clientes">Selecionar Clientes</TabsTrigger>
          <TabsTrigger value="agendados">
            Remarketing Agendados
            {remarketingAgendados.length > 0 && (
              <Badge
                variant="outline"
                className="ml-2 bg-blue-100 text-blue-800"
              >
                {remarketingAgendados.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="enviados">
            Histórico de Envios
            {remarketingEnviados.length > 0 && (
              <Badge
                variant="outline"
                className="ml-2 bg-green-100 text-green-800"
              >
                {remarketingEnviados.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes">
          <Card className="shadow-md">
            <CardHeader className="pb-0">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Selecionar Clientes para Remarketing</CardTitle>
                  <CardDescription>
                    Selecione os clientes para enviar uma campanha de
                    remarketing
                  </CardDescription>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1 md:flex-none">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="text"
                      placeholder="Buscar cliente..."
                      className="pl-9 w-[200px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Componente de filtro de etiquetas */}
                  <EtiquetasFilter
  etiquetasSelecionadas={etiquetasSelecionadasFiltro}
  onEtiquetasChange={handleEtiquetasFiltroChange}
/>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[200px] justify-start text-left"
                      >
                        <span className="mr-2">Segmento:</span>
                        {filtroSegmento || "Todos"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[200px]">
                      <DropdownMenuItem
                        onClick={() => handleSegmentoChange("todos")}
                      >
                        Todos os segmentos
                        {!filtroSegmento && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {segmentosUnicos.map((segmento) => (
                        <DropdownMenuItem
                          key={segmento}
                          onClick={() => handleSegmentoChange(segmento)}
                        >
                          {segmento}
                          {filtroSegmento === segmento && (
                            <Check className="ml-auto h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-green-50 border-green-700 text-green-700 hover:bg-green-100 flex items-center"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Opções TalkBI
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[220px]">
                      <DropdownMenuItem
                        className="py-3"
                        onClick={handleImportarClientesTalkBI}
                        disabled={
                          isInitiatingImport || showProgressoImportacaoDialog
                        }
                      >
                        {isInitiatingImport || showProgressoImportacaoDialog ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Importar da TalkBI
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="py-3"
                        onClick={abrirExportarClientesDialog}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Exportar para TalkBI
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleAtualizarPrefixosWhatsApp}
                        disabled={isUpdatingPrefixes}
                      >
                        {isUpdatingPrefixes ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Phone className="mr-2 h-4 w-4" />
                        )}
                        Atualizar Prefixos +55
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          window.open("https://chat.talkbi.com.br", "_blank")
                        }
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir TalkBI
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <ImportacaoProgressoDialog
                    isOpen={showProgressoImportacaoDialog}
                    onCloseDialog={() => {
                      setShowProgressoImportacaoDialog(false);
                      carregarClientes();
                    }}
                  />

                  <ExportarDialog />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00446A]" />
                </div>
              ) : clientesFiltrados.length > 0 ? (
                <div>
                  <div className="rounded-md border">
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 sticky top-0 bg-white z-10">
                              <Checkbox
                                checked={selectAll}
                                onCheckedChange={(checked) =>
                                  handleSelectAll(!!checked)
                                }
                                aria-label="Selecionar todos"
                              />
                            </TableHead>
                            <TableHead className="sticky top-0 bg-white z-10">
                              Nome
                            </TableHead>
                            <TableHead className="sticky top-0 bg-white z-10">
                              CNPJ
                            </TableHead>
                            <TableHead className="sticky top-0 bg-white z-10">
                              Segmento
                            </TableHead>
                            <TableHead className="sticky top-0 bg-white z-10">
                              WhatsApp
                            </TableHead>
                            <TableHead className="sticky top-0 bg-white z-10">
                              Recorrente
                            </TableHead>
                            <TableHead className="sticky top-0 bg-white z-10">
                              Etiquetas
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientesPaginados.map((cliente) => (
                            <TableRow
                              key={cliente.id}
                              onClick={() => {
                                // Toggling selection when clicking on row
                                const isSelected = clienteEstaSelectionado(
                                  cliente.id
                                );
                                handleSelectCliente(cliente.id, !isSelected);
                              }}
                              className="cursor-pointer hover:bg-gray-50"
                            >
                              <TableCell
                                onClick={(e) => {
                                  // Prevent propagation to avoid double triggering
                                  e.stopPropagation();
                                }}
                              >
                                <Checkbox
                                  checked={clienteEstaSelectionado(cliente.id)}
                                  onCheckedChange={(checked) => {
                                    handleSelectCliente(cliente.id, !!checked);
                                  }}
                                  className="cursor-pointer"
                                  aria-label={`Selecionar ${cliente.nome}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {cliente.nome}
                              </TableCell>
                              <TableCell>{cliente.cnpj}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="bg-gray-100"
                                >
                                  {cliente.segmento}
                                </Badge>
                              </TableCell>
                              <TableCell>{cliente.whatsapp || "-"}</TableCell>
                              <TableCell>
                                {cliente.recorrente ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    Sim
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Não</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {cliente.EtiquetaCliente &&
                                cliente.EtiquetaCliente.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {cliente.EtiquetaCliente
                                      .slice(0, 2)
                                      .map((etiqueta) => {
                                        // Formatar nome da etiqueta para exibição
                                        const nomeFormatado = etiqueta.nome
                                          .replace(/[_-]/g, " ")
                                          .replace(
                                            /\w\S*/g,
                                            (txt) =>
                                              txt.charAt(0).toUpperCase() +
                                              txt.substr(1).toLowerCase()
                                          );

                                        return (
                                          <Badge
                                            key={etiqueta.id}
                                            variant="outline"
                                            className="bg-blue-50 text-blue-800"
                                          >
                                            {nomeFormatado}
                                          </Badge>
                                        );
                                      })}
                                    {cliente.EtiquetaCliente.length > 2 && (
                                      <Badge
                                        variant="outline"
                                        className="bg-gray-100"
                                      >
                                        +{cliente.EtiquetaCliente.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-500 text-sm">
                                    Sem etiquetas
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>

                  {totalPaginas > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          mudarPagina(Math.max(1, paginaAtual - 1))
                        }
                        disabled={paginaAtual === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                        .filter(
                          (page) =>
                            page === 1 ||
                            page === totalPaginas ||
                            (page >= paginaAtual - 1 && page <= paginaAtual + 1)
                        )
                        .map((page, index, array) => {
                          if (index > 0 && array[index - 1] !== page - 1) {
                            return (
                              <React.Fragment key={`ellipsis-${page}`}>
                                <span className="px-2">...</span>
                                <Button
                                  key={page}
                                  variant={
                                    page === paginaAtual ? "default" : "outline"
                                  }
                                  size="sm"
                                  className={
                                    page === paginaAtual
                                      ? "bg-[#00446A] text-white"
                                      : ""
                                  }
                                  onClick={() => mudarPagina(page)}
                                >
                                  {page}
                                </Button>
                              </React.Fragment>
                            );
                          }
                          return (
                            <Button
                              key={page}
                              variant={
                                page === paginaAtual ? "default" : "outline"
                              }
                              size="sm"
                              className={
                                page === paginaAtual
                                  ? "bg-[#00446A] text-white"
                                  : ""
                              }
                              onClick={() => mudarPagina(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          mudarPagina(Math.min(totalPaginas, paginaAtual + 1))
                        }
                        disabled={paginaAtual === totalPaginas}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <span className="text-sm text-gray-500">
                        {clientesSelecionados.length} de{" "}
                        {clientesFiltrados.length} clientes selecionados
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {clientesSelecionados.length > 0 && (
                        <Button
                          variant="outline"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={handleExportarClientesTalkBI}
                          disabled={isExporting}
                        >
                          {isExporting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          Exportar Selecionados
                        </Button>
                      )}

                      <Button
                        className="bg-[#00446A] text-white hover:bg-[#00446A]/90"
                        disabled={clientesSelecionados.length === 0}
                        onClick={() => setShowRemarketingDialog(true)}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Definir Remarketing
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhum cliente encontrado com os filtros atuais</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agendados">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Remarketing Agendados</CardTitle>
              <CardDescription>
                Campanhas de remarketing agendadas para envio futuro
              </CardDescription>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00446A]" />
                </div>
              ) : remarketingAgendados.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome da Campanha</TableHead>
                        <TableHead>Data Agendada</TableHead>
                        <TableHead>Clientes</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {remarketingAgendados.map(
                        (remarketing: RemarketingListItem) => (
                          <TableRow key={remarketing.id}>
                            <TableCell className="font-medium">
                              {remarketing.nome}
                            </TableCell>
                            <TableCell>
                              {format(
                                new Date(remarketing.dataAgendada),
                                "dd/MM/yyyy HH:mm",
                                { locale: ptBR }
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-800"
                              >
                                {remarketing.totalClientes} cliente(s)
                              </Badge>
                            </TableCell>
                            <TableCell>{remarketing.vendedorNome}</TableCell>
                            <TableCell>
                              <Badge className="bg-yellow-100 text-yellow-800">
                                Agendado
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      verDetalhesRemarketing(remarketing.id)
                                    }
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver Detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditandoRemarketingId(remarketing.id);
                                      setNovaDataRemarketing(
                                        new Date(remarketing.dataAgendada)
                                      );
                                      setNovaHoraRemarketing(
                                        new Date(remarketing.dataAgendada)
                                      );
                                      setShowEditarDataDialog(true);
                                    }}
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Alterar Data
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() =>
                                      handleCancelarRemarketing(remarketing.id)
                                    }
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Cancelar Remarketing
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhum remarketing agendado</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="border-t pt-6">
              <Button
                variant="outline"
                className="ml-auto"
                onClick={carregarRemarketingAgendados}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar Lista
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="enviados">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Histórico de Envios</CardTitle>
              <CardDescription>
                Campanhas de remarketing já enviadas
              </CardDescription>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00446A]" />
                </div>
              ) : remarketingEnviados.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome da Campanha</TableHead>
                        <TableHead>Data Enviada</TableHead>
                        <TableHead>Clientes</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {remarketingEnviados.map(
                        (remarketing: RemarketingListItem) => (
                          <TableRow key={remarketing.id}>
                            <TableCell className="font-medium">
                              {remarketing.nome}
                            </TableCell>
                            <TableCell>
                              {format(
                                new Date(remarketing.dataAgendada),
                                "dd/MM/yyyy HH:mm",
                                { locale: ptBR }
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-800"
                              >
                                {remarketing.totalClientes} cliente(s)
                              </Badge>
                            </TableCell>
                            <TableCell>{remarketing.vendedorNome}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800">
                                Enviado
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  verDetalhesRemarketing(remarketing.id)
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhum remarketing enviado</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="border-t pt-6">
              <Button
                variant="outline"
                className="ml-auto"
                onClick={carregarRemarketingEnviados}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar Lista
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={showRemarketingDialog}
        onOpenChange={setShowRemarketingDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Definir Remarketing</DialogTitle>
            <DialogDescription>
              Configure os detalhes do remarketing para os clientes selecionados
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome-remarketing">Nome da Campanha</Label>
              <Input
                id="nome-remarketing"
                placeholder="Ex: Promoção de Produtos Químicos"
                value={nomeRemarketing}
                onChange={(e) => setNomeRemarketing(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Opções de Agendamento</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={
                    opcaoDataRemarketing === "imediato" ? "default" : "outline"
                  }
                  className={
                    opcaoDataRemarketing === "imediato" ? "bg-[#00446A]" : ""
                  }
                  onClick={() => configurarDataRemarketing("imediato")}
                >
                  Enviar Imediatamente
                </Button>
                <Button
                  type="button"
                  variant={
                    opcaoDataRemarketing === "7dias" ? "default" : "outline"
                  }
                  className={
                    opcaoDataRemarketing === "7dias" ? "bg-[#00446A]" : ""
                  }
                  onClick={() => configurarDataRemarketing("7dias")}
                >
                  Daqui a 7 dias
                </Button>
                <Button
                  type="button"
                  variant={
                    opcaoDataRemarketing === "15dias" ? "default" : "outline"
                  }
                  className={
                    opcaoDataRemarketing === "15dias" ? "bg-[#00446A]" : ""
                  }
                  onClick={() => configurarDataRemarketing("15dias")}
                >
                  Daqui a 15 dias
                </Button>
                <Button
                  type="button"
                  variant={
                    opcaoDataRemarketing === "30dias" ? "default" : "outline"
                  }
                  className={
                    opcaoDataRemarketing === "30dias" ? "bg-[#00446A]" : ""
                  }
                  onClick={() => configurarDataRemarketing("30dias")}
                >
                  Daqui a 30 dias
                </Button>
                <Button
                  type="button"
                  variant={
                    opcaoDataRemarketing === "personalizado"
                      ? "default"
                      : "outline"
                  }
                  className={`col-span-2 ${
                    opcaoDataRemarketing === "personalizado"
                      ? "bg-[#00446A]"
                      : ""
                  }`}
                  onClick={() => configurarDataRemarketing("personalizado")}
                >
                  Data Personalizada
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      disabled={opcaoDataRemarketing !== "personalizado"}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataRemarketing
                        ? format(dataRemarketing, "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={dataRemarketing}
                      onSelect={setDataRemarketing}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Hora</Label>
                <TimePickerDemo
                  setDate={setHoraRemarketing}
                  date={horaRemarketing || new Date()}
                />
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">
                  {clientesSelecionados.length} clientes selecionados
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemarketingDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#00446A] text-white hover:bg-[#00446A]/90"
              onClick={handleCriarRemarketing}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Agendar Remarketing
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetalhesDialog} onOpenChange={setShowDetalhesDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes do Remarketing</DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre a campanha de remarketing
            </DialogDescription>
          </DialogHeader>

          {remarketingDetalhes ? (
            <div className="py-4 flex-1 overflow-hidden">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="font-medium text-lg">
                    {remarketingDetalhes.nome}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {remarketingDetalhes.status === "agendado"
                      ? "Agendado para"
                      : "Enviado em"}
                    :{" "}
                    {format(
                      new Date(remarketingDetalhes.dataAgendada),
                      "dd/MM/yyyy HH:mm",
                      { locale: ptBR }
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <Badge
                    className={`${
                      remarketingDetalhes.status === "agendado"
                        ? "bg-yellow-100 text-yellow-800"
                        : remarketingDetalhes.status === "enviado"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {remarketingDetalhes.status === "agendado"
                      ? "Agendado"
                      : remarketingDetalhes.status === "enviado"
                      ? "Enviado"
                      : "Cancelado"}
                  </Badge>
                  <p className="text-sm text-gray-500 mt-1">
                    Vendedor: {remarketingDetalhes.vendedorNome}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center bg-gray-100 rounded-md px-3 py-1.5">
                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                  <span className="text-sm">
                    {remarketingDetalhes.totalClientes} cliente(s)
                  </span>
                </div>

                {remarketingDetalhes.totalEtiquetas > 0 && (
                  <div className="flex items-center bg-gray-100 rounded-md px-3 py-1.5">
                    <Tag className="h-4 w-4 mr-2 text-purple-600" />
                    <span className="text-sm">
                      {remarketingDetalhes.totalEtiquetas} etiqueta(s)
                    </span>
                  </div>
                )}

                <div className="flex items-center bg-gray-100 rounded-md px-3 py-1.5">
                  <Calendar className="h-4 w-4 mr-2 text-green-600" />
                  <span className="text-sm">
                    Criado em{" "}
                    {format(
                      new Date(remarketingDetalhes.createdAt),
                      "dd/MM/yyyy",
                      { locale: ptBR }
                    )}
                  </span>
                </div>
              </div>

              <Separator className="my-4" />

              <h4 className="font-medium mb-2">Clientes incluídos</h4>

              <ScrollArea className="h-[calc(90vh-350px)] pr-4">
                <div className="space-y-3">
                  {remarketingDetalhes.clientes.map((cliente) => (
                    <Card key={cliente.id} className="p-0">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{cliente.nome}</h5>
                            <p className="text-sm text-gray-500">
                              {cliente.cnpj}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="bg-gray-100">
                                {cliente.segmento}
                              </Badge>
                              {cliente.recorrente && (
                                <Badge className="bg-green-100 text-green-800">
                                  Recorrente
                                </Badge>
                              )}
                            </div>

                            {cliente.whatsapp && (
                              <p className="text-sm mt-1">
                                <span className="text-gray-500">WhatsApp:</span>{" "}
                                {cliente.whatsapp}
                              </p>
                            )}

                            {cliente.etiquetas &&
                              cliente.etiquetas.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-500 mb-1">
                                    Etiquetas:
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {cliente.etiquetas.map((etiqueta) => (
                                      <Badge
                                        key={etiqueta.id}
                                        variant="outline"
                                        className="bg-blue-50 text-blue-800"
                                      >
                                        {etiqueta.nome}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>

                          {remarketingDetalhes.status === "agendado" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() =>
                                handleRemoverClienteRemarketing(
                                  remarketingDetalhes.id,
                                  cliente.id
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#00446A]" />
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDetalhesDialog(false)}
            >
              Fechar
            </Button>

            {remarketingDetalhes &&
              remarketingDetalhes.status === "agendado" && (
                <>
                  <Button
                    variant="outline"
                    className="border-amber-200 text-amber-700 hover:bg-amber-50"
                    onClick={() => {
                      setEditandoRemarketingId(remarketingDetalhes.id);
                      setNovaDataRemarketing(
                        new Date(remarketingDetalhes.dataAgendada)
                      );
                      setNovaHoraRemarketing(
                        new Date(remarketingDetalhes.dataAgendada)
                      );
                      setShowEditarDataDialog(true);
                    }}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Alterar Data
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() =>
                      handleCancelarRemarketing(remarketingDetalhes.id)
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Cancelar Remarketing
                  </Button>
                </>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditarDataDialog}
        onOpenChange={setShowEditarDataDialog}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Alterar Data de Envio</DialogTitle>
            <DialogDescription>
              Defina uma nova data e hora para o envio do remarketing
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Nova Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {novaDataRemarketing
                      ? format(novaDataRemarketing, "dd/MM/yyyy", {
                          locale: ptBR,
                        })
                      : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={novaDataRemarketing}
                    onSelect={setNovaDataRemarketing}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Nova Hora</Label>
              <TimePickerDemo
                setDate={setNovaHoraRemarketing}
                date={novaHoraRemarketing || new Date()}
              />
            </div>

            <div className="pt-2">
              <div className="flex items-center space-x-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  Esta alteração afetará apenas a data de envio, não os clientes
                  selecionados.
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditarDataDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#00446A] text-white hover:bg-[#00446A]/90"
              onClick={handleAtualizarDataRemarketing}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Atualizar Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showExportarClientesDialog}
        onOpenChange={setShowExportarClientesDialog}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Exportar Clientes para TalkBI</DialogTitle>
            <DialogDescription>
              Utilize esta interface para exportar clientes e atualizar prefixos
            </DialogDescription>
          </DialogHeader>
          <ExportarClientesTalkBI segmentos={segmentosUnicos} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
