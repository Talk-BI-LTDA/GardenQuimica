// @/components/ImportacaoProgressoDialog.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ImportacaoProgressoDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportacaoProgressoDialog({ isOpen, onClose }: ImportacaoProgressoDialogProps) {
  const [progresso, setProgresso] = useState({
    total: 0,
    processados: 0,
    importados: 0,
    atualizados: 0,
    falhas: 0,
    emProgresso: true,
    mensagem: "Iniciando...",
    porcentagem: 0,
    timestamp: 0
  });
  
  const [semAtualizacoes, setSemAtualizacoes] = useState(false);
  const [ultimoTimestamp, setUltimoTimestamp] = useState(0);

  // Função para buscar o progresso atual
  function buscarProgresso() {
    fetch(`/api/importacao-progresso?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    .then(response => {
      if (response.ok) return response.json();
      throw new Error('Erro na resposta');
    })
    .then(data => {
      setProgresso(data);
      
      // Verificar se houve atualização de timestamp
      if (data.timestamp !== ultimoTimestamp) {
        setUltimoTimestamp(data.timestamp);
        setSemAtualizacoes(false);
      } else if (data.emProgresso && Date.now() - data.timestamp > 10000) {
        // Se estiver em progresso mas sem atualizações por 10 segundos
        setSemAtualizacoes(true);
      }
    })
    .catch(error => {
      console.error('Erro ao buscar progresso:', error);
    });
  }

  // Efeito para configurar polling do progresso
  useEffect(() => {
    if (!isOpen) return;
    
    // Buscar progresso imediatamente
    buscarProgresso();
    
    // Configurar o polling a cada segundo
    const interval = setInterval(buscarProgresso, 1000);
    
    // Limpar o intervalo quando o componente for desmontado ou o diálogo fechado
    return () => clearInterval(interval);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;
  
  const statusColors = {
    barra: progresso.emProgresso ? 'bg-blue-600' : 
           progresso.falhas > 0 ? 'bg-orange-500' : 'bg-green-600',
    texto: progresso.emProgresso ? 'text-blue-600' : 
           progresso.falhas > 0 ? 'text-orange-500' : 'text-green-600'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-[500px] max-w-[90vw] max-h-[90vh] overflow-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Importação de Clientes TalkBI</h2>
        </div>
        
        <p className="text-gray-500 mb-6">
          Acompanhe o progresso da importação de clientes
        </p>
        
        <div className="space-y-6">
          {/* Barra de progresso */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {progresso.emProgresso ? 'Importando...' : 'Concluído'}
              </span>
              <span className="text-sm text-gray-500">
                {progresso.porcentagem}%
              </span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${statusColors.barra}`}
                style={{ width: `${progresso.porcentagem}%` }}
              ></div>
            </div>
          </div>
          
          {/* Status atual */}
          <div className="p-4 rounded-md bg-slate-50 border">
            <div className="flex items-center gap-2 mb-2">
              {progresso.emProgresso ? (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              ) : progresso.falhas > 0 ? (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              <span className="font-medium">{progresso.mensagem}</span>
            </div>
            
            <div className="text-sm text-gray-500">
              {progresso.processados} de {progresso.total} clientes processados
            </div>
            
            {semAtualizacoes && progresso.emProgresso && (
              <div className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>O processo continua em execução, mas pode estar lento.</span>
              </div>
            )}
          </div>
          
          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-md bg-green-50 border border-green-100">
              <div className="text-xs text-green-800 mb-1">Importados</div>
              <div className="text-xl font-bold text-green-700">{progresso.importados}</div>
            </div>
            
            <div className="p-3 rounded-md bg-blue-50 border border-blue-100">
              <div className="text-xs text-blue-800 mb-1">Atualizados</div>
              <div className="text-xl font-bold text-blue-700">{progresso.atualizados}</div>
            </div>
            
            <div className="p-3 rounded-md bg-amber-50 border border-amber-100">
              <div className="text-xs text-amber-800 mb-1">Falhas</div>
              <div className="text-xl font-bold text-amber-700">{progresso.falhas}</div>
            </div>
          </div>
          
          {/* Dicas */}
          {progresso.emProgresso && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <AlertCircle className="h-4 w-4" />
              <span>A importação pode demorar alguns minutos para grandes volumes de dados.</span>
            </div>
          )}
          
          {/* Botão de fechar */}
          <button
            onClick={onClose}
            className={`w-full mt-4 py-2 rounded-md hover:opacity-90 transition-colors ${
              progresso.emProgresso 
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-blue-600 text-white"
            }`}
            disabled={progresso.emProgresso}
          >
            {progresso.emProgresso ? 'Processando...' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  );
}