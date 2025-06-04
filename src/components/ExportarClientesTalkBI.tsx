// components/ExportarClientesTalkBI.tsx - 
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Upload, RefreshCw } from "lucide-react";

// Interfaces corrigidas para resultados da API
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

// Interfaces específicas para cada tipo de resultado
interface ExportacaoResultado {
  success: boolean;
  error?: string;
  total: number;
  sucessos: number;
  falhas: number;
  resultados: ResultadoExportacao[];
}

interface AtualizacaoPrefixoResultado {
  success: boolean;
  error?: string;
  total: number;
  atualizados: number;
  inalterados: number;
  resultados: ResultadoAtualizacaoPrefixo[];
}

interface ExportarClientesTalkBIProps {
  segmentos: string[];
}

export default function ExportarClientesTalkBI({ segmentos }: ExportarClientesTalkBIProps) {
  const [loading, setLoading] = useState(false);
  const [segmentoSelecionado, setSegmentoSelecionado] = useState<string | null>(null);
  const [apenasRecorrentes, setApenasRecorrentes] = useState(false);

  // Usar tipos específicos em vez de união para evitar erros de propriedades
  const [resultadoExportacao, setResultadoExportacao] = useState<ExportacaoResultado | null>(null);
  const [resultadoAtualizacaoPrefixo, setResultadoAtualizacaoPrefixo] = useState<AtualizacaoPrefixoResultado | null>(null);

  const handleExportar = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/clientes/exportar-talkbi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao: "exportar",
          filtros: {
            segmento: segmentoSelecionado || undefined,
            recorrente: apenasRecorrentes ? true : undefined
          }
        }),
      });

      const data = await response.json() as ExportacaoResultado;
      
      if (data.success) {
        toast.success(`Exportação concluída: ${data.sucessos} clientes exportados com sucesso.`);
        setResultadoExportacao(data);
        setResultadoAtualizacaoPrefixo(null); // Limpar o outro resultado
      } else {
        toast.error(data.error || "Erro ao exportar clientes");
      }
    } catch (error) {
      console.error("Erro ao exportar clientes:", error);
      toast.error("Ocorreu um erro ao exportar os clientes");
    } finally {
      setLoading(false);
    }
  };

  const handleAtualizarPrefixos = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/clientes/exportar-talkbi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao: "atualizar-prefixo"
        }),
      });

      const data = await response.json() as AtualizacaoPrefixoResultado;
      
      if (data.success) {
        toast.success(`Prefixos atualizados: ${data.atualizados} números de WhatsApp foram atualizados.`);
        setResultadoAtualizacaoPrefixo(data);
        setResultadoExportacao(null); // Limpar o outro resultado
      } else {
        toast.error(data.error || "Erro ao atualizar prefixos");
      }
    } catch (error) {
      console.error("Erro ao atualizar prefixos:", error);
      toast.error("Ocorreu um erro ao atualizar os prefixos");
    } finally {
      setLoading(false);
    }
  };

  // Função de renderização condicional para mostrar os resultados corretos
  const renderizarResultados = () => {
    if (resultadoExportacao) {
      return (
        <div className="space-y-1 text-sm">
          <p>Total processado: <span className="font-medium">{resultadoExportacao.total}</span></p>
          {/* <p>Exportados com sucesso: <span className="font-medium text-green-600">{resultadoExportacao.sucessos}</span></p>
          <p>Falhas: <span className="font-medium text-red-600">{resultadoExportacao.falhas}</span></p> */}
        </div>
      );
    } else if (resultadoAtualizacaoPrefixo) {
      return (
        <div className="space-y-1 text-sm">
          <p>Total processado: <span className="font-medium">{resultadoAtualizacaoPrefixo.total}</span></p>
          <p>Números atualizados: <span className="font-medium text-green-600">{resultadoAtualizacaoPrefixo.atualizados}</span></p>
          <p>Números inalterados: <span className="font-medium text-gray-600">{resultadoAtualizacaoPrefixo.inalterados}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Exportar Clientes para TalkBI</CardTitle>
        <CardDescription>
          Envie seus clientes para a plataforma TalkBI e atualize os números de WhatsApp com o prefixo +55
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Filtrar por Segmento</label>
          <Select 
  value={segmentoSelecionado || "todos"} 
  onValueChange={(value) => setSegmentoSelecionado(value === "todos" ? null : value)}
>
  <SelectTrigger>
    <SelectValue placeholder="Todos os segmentos" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="todos">Todos os segmentos</SelectItem>
    {segmentos.map((segmento) => (
      <SelectItem key={segmento} value={segmento}>{segmento}</SelectItem>
    ))}
  </SelectContent>
</Select>
        </div>

        <div className="flex items-center space-x-2 py-2">
          <Checkbox 
            id="recorrentes" 
            checked={apenasRecorrentes} 
            onCheckedChange={(checked) => setApenasRecorrentes(!!checked)} 
          />
          <label htmlFor="recorrentes" className="text-sm font-medium cursor-pointer">
            Apenas clientes recorrentes
          </label>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleAtualizarPrefixos}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar Prefixos +55
          </Button>

          <Button 
            className="w-full bg-[#00446A] text-white" 
            onClick={handleExportar}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Exportar para TalkBI
          </Button>
        </div>

        {(resultadoExportacao || resultadoAtualizacaoPrefixo) && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium mb-2">
              {resultadoExportacao ? "Resultados da Exportação" : "Resultados da Atualização de Prefixos"}
            </h4>
            {renderizarResultados()}
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-gray-50 p-4 text-sm text-gray-500">
        <p>Os números de WhatsApp serão automaticamente formatados com o prefixo +55 quando necessário.</p>
      </CardFooter>
    </Card>
  );
}