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
} from "lucide-react";

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
} from "@/actions/talkbi-actions";

import { Cliente } from "@/types/cliente";
import { RemarketingDetalhes } from "@/types/cliente-talkbi";

interface RemarketingComponentProps {
  session: {
    user: {
      role: string;
      id: string;
    };
  };
}

export default function RemarketingComponent({
  session,
}: RemarketingComponentProps) {
  // Estados para dados
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>(
    []
  );
  const [remarketingAgendados, setRemarketingAgendados] = useState<
    {
      id: string;
      nome: string;
      dataAgendada: Date;
      status: string;
      totalClientes: number;
      vendedorNome: string;
    }[]
  >([]);

  const [remarketingEnviados, setRemarketingEnviados] = useState<
    {
      id: string;
      nome: string;
      dataAgendada: Date;
      status: string;
      totalClientes: number;
      vendedorNome: string;
    }[]
  >([]);
  const [remarketingDetalhes, setRemarketingDetalhes] =
    useState<RemarketingDetalhes | null>(null);
  const [selectAll, setSelectAll] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(20); // Reduzido para melhor usabilidade

  // Estados para filtros e UI
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroSegmento, setFiltroSegmento] = useState<string | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);
  const [tabAtiva, setTabAtiva] = useState("clientes");
  const [showRemarketingDialog, setShowRemarketingDialog] = useState(false);
  const [showDetalhesDialog, setShowDetalhesDialog] = useState(false);
  const [showProgressoDialog, setShowProgressoDialog] = useState(false);

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

  const importarClientesTalkBI = async () => {
    // Mostrar toast e diálogo de progresso
    toast.info("Iniciando importação de clientes da TalkBI...");
    setShowProgressoDialog(true);

    setLoading(true);
    try {
      const resultado = await buscarEImportarClientesTalkBI();

      if (resultado.success) {
        toast.success(`${resultado.message}`, {
          duration: 5000,
        });
        await carregarClientes(); // Recarregar a lista após importação
      } else {
        toast.error(`Erro: ${resultado.error}`, {
          duration: 5000,
        });
        console.error("Detalhes do erro:", resultado);
      }
    } catch (error) {
      console.error("Erro ao importar clientes da TalkBI:", error);
      toast.error("Ocorreu um erro ao importar os clientes do TalkBI", {
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Memoização dos segmentos únicos
  const segmentosUnicos = useMemo(() => {
    return Array.from(new Set(clientes.map((c) => c.segmento)));
  }, [clientes]);

  // Memoização dos clientes filtrados
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(
      (cliente) =>
        (filtroSegmento ? cliente.segmento === filtroSegmento : true) &&
        (searchTerm
          ? cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cliente.cnpj.includes(searchTerm)
          : true)
    );
  }, [clientes, filtroSegmento, searchTerm]);

  // Funções de carregamento
  const carregarClientes = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const carregarRemarketingAgendados = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const carregarRemarketingEnviados = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // UseEffect para carregar dados iniciais
  useEffect(() => {
    const carregarDados = async () => {
      await Promise.all([
        carregarClientes(),
        carregarRemarketingAgendados(),
        carregarRemarketingEnviados(),
      ]);
    };

    carregarDados();
  }, []); // Array vazio - carrega apenas uma vez



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

        // Atualizar detalhes do remarketing
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

    // Combinar data e hora
    const dataHora = new Date(novaDataRemarketing);
    dataHora.setHours(
      novaHoraRemarketing.getHours(),
      novaHoraRemarketing.getMinutes(),
      0,
      0
    );

    // Verificar se a data é no futuro
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

        // Atualizar detalhes do remarketing
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
      // Selecionar apenas os clientes da página atual
      setClientesSelecionados(clientesPaginados.map((c) => c.id));
    } else {
      setClientesSelecionados([]);
    }
  };

  // Manipular seleção de cliente individual
  const handleSelectCliente = useCallback((clienteId: string, checked: boolean) => {
    if (checked) {
      setClientesSelecionados(prev => [...prev, clienteId]);
    } else {
      setClientesSelecionados(prev => prev.filter(id => id !== clienteId));
    }
  }, []);

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

    // Combinar data e hora
    const dataHora = new Date(dataRemarketing);
    dataHora.setHours(
      horaRemarketing.getHours(),
      horaRemarketing.getMinutes(),
      0,
      0
    );

    // Se não for imediato, verificar se a data é no futuro
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
    // Desmarcar "selecionar todos" quando mudar de página
    setSelectAll(false);
  }, []);

  // Reset de página quando os filtros mudam
  useEffect(() => {
    setPaginaAtual(1);
  }, [searchTerm, filtroSegmento]);
  const clienteEstaSelectionado = useCallback((id: string) => {
    return clientesSelecionados.includes(id);
  }, [clientesSelecionados]);
    // UseEffect para atualizar seleção "todos" quando clientesSelecionados muda
    useEffect(() => {
      if (clientesPaginados.length > 0 && clientesSelecionados.length === clientesPaginados.length) {
        setSelectAll(true);
      } else {
        setSelectAll(false);
      }
    }, [clientesSelecionados, clientesPaginados.length]);
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Remarketing</h2>
      </div>

      {/* Tabs */}
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

        {/* Conteúdo da Tab de Clientes */}
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
                  <Button
                    variant="outline"
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 flex items-center"
                    onClick={importarClientesTalkBI}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="mr-2 h-4 w-4" />
                    )}
                    Importar da TalkBI
                  </Button>
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
                            <TableRow key={cliente.id}>
                              <TableCell>
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
                                {cliente.etiquetas &&
                                cliente.etiquetas.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {cliente.etiquetas
                                      .slice(0, 2)
                                      .map((etiqueta) => (
                                        <Badge
                                          key={etiqueta.id}
                                          variant="outline"
                                          className="bg-blue-50 text-blue-800"
                                        >
                                          {etiqueta.nome}
                                        </Badge>
                                      ))}
                                    {cliente.etiquetas.length > 2 && (
                                      <Badge
                                        variant="outline"
                                        className="bg-gray-100"
                                      >
                                        +{cliente.etiquetas.length - 2}
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

                  {/* Controles de paginação */}
                  {totalPaginas > 1 && (
  <div className="flex items-center justify-center space-x-2 mt-4">
    <Button
      variant="outline"
      size="icon"
      onClick={() => mudarPagina(Math.max(1, paginaAtual - 1))}
      disabled={paginaAtual === 1}
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>

    {/* Mostrar páginas relevantes com elipses */}
    {Array.from({ length: totalPaginas }, (_, i) => i + 1)
      .filter(page => 
        page === 1 || 
        page === totalPaginas || 
        (page >= paginaAtual - 1 && page <= paginaAtual + 1)
      )
      .map((page, index, array) => {
        // Adicionar elipses
        if (index > 0 && array[index - 1] !== page - 1) {
          return (
            <React.Fragment key={`ellipsis-${page}`}>
              <span className="px-2">...</span>
              <Button
                key={page}
                variant={page === paginaAtual ? "default" : "outline"}
                size="sm"
                className={page === paginaAtual ? "bg-[#00446A] text-white" : ""}
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
            variant={page === paginaAtual ? "default" : "outline"}
            size="sm"
            className={page === paginaAtual ? "bg-[#00446A] text-white" : ""}
            onClick={() => mudarPagina(page)}
          >
            {page}
          </Button>
        );
      })}

    <Button
      variant="outline"
      size="icon"
      onClick={() => mudarPagina(Math.min(totalPaginas, paginaAtual + 1))}
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
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhum cliente encontrado com os filtros atuais</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conteúdo da Tab de Remarketing Agendados */}
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
                      {remarketingAgendados.map((remarketing) => (
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
                      ))}
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

        {/* Conteúdo da Tab de Histórico de Envios */}
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
                      {remarketingEnviados.map((remarketing) => (
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
                      ))}
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

      {/* Modal para definir Remarketing */}
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

      {/* Modal para detalhes do Remarketing */}
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

      {/* Modal para editar data do Remarketing */}
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
    </div>
  );
}
