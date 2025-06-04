// @/components/ImportacaoProgressoDialog.tsx - Versão com log de erro aprimorado
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, AlertCircle, Info, FileUp, ArchiveRestore, ArrowUpCircle, AlertTriangle, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import {
  pausarImportacaoTalkBI, retomarImportacaoTalkBI, cancelarImportacaoTalkBI, obterProgressoImportacao,
} from '@/actions/talkbi-actions';

interface ProgressoData {
  coletadosAteAgora: number;
  totalAProcessar: number;
  processadosTotalmente: number;
  importadosNovos: number;
  atualizadosExistentes: number;
  falhasNoProcessamento: number;
  emProgresso: boolean;
  mensagemStatus: string;
  isPaused: boolean;
  isCancelled: boolean;
  lastUpdatedTimestamp?: number;
  fase: "ocioso" | "coleta" | "processamento" | "concluido" | "erro" | "cancelado";
  porcentagem: number;
}

const initialDialogDisplayState: ProgressoData = {
  coletadosAteAgora: 0, totalAProcessar: 0, processadosTotalmente: 0,
  importadosNovos: 0, atualizadosExistentes: 0, falhasNoProcessamento: 0,
  emProgresso: true, mensagemStatus: "Estabelecendo conexão...",
  isPaused: false, isCancelled: false, lastUpdatedTimestamp: 0,
  fase: "coleta", porcentagem: 0,
};

interface ImportacaoProgressoDialogProps {
  isOpen: boolean;
  onCloseDialog: () => void;
}

export function ImportacaoProgressoDialog({ isOpen, onCloseDialog }: ImportacaoProgressoDialogProps) {
  const [progresso, setProgresso] = useState<ProgressoData>(initialDialogDisplayState);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isInteractingWithControl, setIsInteractingWithControl] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('[DIALOG] Polling parado');
    }
  },[]);
  
  const handleDefinitiveCloseAndCancel = useCallback(async () => {
    const shouldCancel = progresso.emProgresso && 
                         !progresso.isCancelled && 
                         progresso.fase !== "ocioso" && 
                         progresso.fase !== "concluido" && 
                         progresso.fase !== "erro" && 
                         progresso.fase !== "cancelado";
    if (shouldCancel) {
      console.log('[DIALOG] Cancelando importação antes de fechar (enviando comando)...');
      setIsInteractingWithControl(true);
      try { 
        await cancelarImportacaoTalkBI(); 
        console.log('[DIALOG] Comando de cancelamento enviado ao backend.');
      } catch(err) { 
        console.error("[DIALOG] Erro ao enviar comando de cancelamento no fechamento:", err); 
      }
      setIsInteractingWithControl(false);
    }
    onCloseDialog();
  }, [progresso.emProgresso, progresso.isCancelled, progresso.fase, onCloseDialog]);

  const fetchProgressoCallback = useCallback(async (isInitialAttempt = false) => {
    if (!isMountedRef.current && !isInitialAttempt) {
      console.log('[DIALOG] fetchProgressoCallback ignorado: componente não montado ou não é tentativa inicial sem estar montado.');
      return;
    }
    
    try {
      console.log('[DIALOG] Fazendo fetch do progresso...', isInitialAttempt ? '(inicial)' : '(polling)');
      const data = await obterProgressoImportacao();
      
      console.log('[DIALOG] Dados recebidos do backend:', JSON.stringify(data)); 
      
      if (isMountedRef.current) {
        setProgresso(data);
        setApiError(null); // Limpa erro anterior se o fetch for bem-sucedido
        setDebugInfo(`Última att: ${new Date().toLocaleTimeString()} - Fase: ${data.fase} - Msg: ${data.mensagemStatus} - Coletados: ${data.coletadosAteAgora}`);
        
        const shouldStopPolling = !data.emProgresso || data.isCancelled || data.fase === "concluido" || data.fase === "erro" || data.fase === "cancelado";
        if (shouldStopPolling) {
          console.log(`[DIALOG] Parando polling. Causa: emProgresso=${data.emProgresso}, isCancelled=${data.isCancelled}, fase=${data.fase}`);
          stopPolling();
        }
      } else {
        console.log('[DIALOG] fetchProgressoCallback: componente desmontado após receber dados, não atualizando estado.');
      }
    } catch (err) {
      // Log de erro aprimorado
      console.error('[DIALOG] ERRO DETALHADO no fetchProgressoCallback:', err);
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao buscar dados do progresso.";
        setApiError(errorMessage);
        setDebugInfo(`Erro ao buscar progresso: ${new Date().toLocaleTimeString()} - ${errorMessage}`);
      } else {
        console.log('[DIALOG] fetchProgressoCallback: componente desmontado durante tratamento de erro.');
      }
    }
  }, [stopPolling]);

  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen) {
      console.log('[DIALOG] Dialog aberto - iniciando monitoring');
      setProgresso(initialDialogDisplayState);
      setApiError(null);
      setIsInteractingWithControl(false);
      setDebugInfo('Iniciando...');
      stopPolling(); // Garante que qualquer polling anterior seja parado
      fetchProgressoCallback(true); // Busca o estado inicial do backend
    } else {
      console.log('[DIALOG] Dialog fechado - parando monitoring');
      stopPolling();
    }
    return () => {
      console.log('[DIALOG] Limpando useEffect de abertura/fechamento. isMountedRef será false.');
      isMountedRef.current = false;
      stopPolling();
    };
  }, [isOpen, fetchProgressoCallback, stopPolling]); // fetchProgressoCallback e stopPolling são definidos com useCallback
  
  useEffect(() => {
    if(isOpen && isMountedRef.current) {
        const shouldPoll = progresso.emProgresso && 
                           !progresso.isCancelled && 
                           progresso.fase !== "concluido" && 
                           progresso.fase !== "erro" && 
                           progresso.fase !== "cancelado";

        if(shouldPoll && !pollingIntervalRef.current) {
            console.log('[DIALOG] Iniciando polling a cada 1.5 segundos');
            pollingIntervalRef.current = setInterval(() => {
                if (document.hidden || !isMountedRef.current) {
                  console.log('[DIALOG] Pulando polling - tab oculta ou componente desmontado');
                  return;
                }
                fetchProgressoCallback();
            }, 1500);
        } else if (!shouldPoll && pollingIntervalRef.current) {
            console.log('[DIALOG] Parando polling porque shouldPoll é falso (processo pode ter terminado ou sido cancelado).');
            stopPolling();
        }
    }
    // Cleanup para o intervalo caso o componente seja desmontado ou as dependências mudem
    return () => {
        if (pollingIntervalRef.current) {
            console.log('[DIALOG] Limpando intervalo de polling no cleanup do useEffect de polling.');
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };
  }, [isOpen, progresso.emProgresso, progresso.isCancelled, progresso.fase, fetchProgressoCallback, stopPolling]);

  const handlePauseResume = async () => {
    console.log('[DIALOG] Ação pause/resume iniciada');
    setIsInteractingWithControl(true);
    try {
      const actionToCall = progresso.isPaused ? retomarImportacaoTalkBI : pausarImportacaoTalkBI;
      const newProgress = await actionToCall();
      if(isMountedRef.current) {
        setProgresso(newProgress);
        console.log('[DIALOG] Estado atualizado após pause/resume:', newProgress.isPaused);
      }
    } catch (err) { 
      if(isMountedRef.current) setApiError("Falha ao comunicar ação."); 
      console.error("[DIALOG] Erro Pause/Resume:", err);
    }
    setIsInteractingWithControl(false);
  };

  const handleCancelAction = async () => {
    console.log('[DIALOG] Ação cancelar iniciada');
    setIsInteractingWithControl(true);
    try {
      const newProgress = await cancelarImportacaoTalkBI();
      if(isMountedRef.current) {
        setProgresso(newProgress); 
        console.log('[DIALOG] Estado atualizado após solicitar cancelamento.');
      }
      stopPolling(); 
    } catch(err) { 
      if(isMountedRef.current) setApiError("Falha ao comunicar cancelamento."); 
      console.error("[DIALOG] Erro Cancel:", err);
    }
    setIsInteractingWithControl(false);
  };
  
  const isProcessEffectivelyActive = progresso.emProgresso && !progresso.isCancelled;
  
  const isConnectingOrColetaInicial = (progresso.mensagemStatus === initialDialogDisplayState.mensagemStatus || progresso.fase === "coleta") && progresso.emProgresso && !apiError;

  let statusIcon = <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />;
  let progressBarClass = "bg-gray-400";
  let statusMessageColor = "text-gray-500";
  let currentMessage = progresso.mensagemStatus;

  // Lógica de exibição de status (baseada na sua última versão, com a adição do console.warn)
  if (isConnectingOrColetaInicial) {
      statusIcon = <Loader2 className="h-6 w-6 text-[#00446a] animate-spin" />; 
      progressBarClass = "bg-[#00446a]"; 
      statusMessageColor = "text-[#00446a]";
      if (progresso.mensagemStatus === initialDialogDisplayState.mensagemStatus) {
          if (progresso.coletadosAteAgora > 0) {
              console.warn('[DIALOG] Inconsistência de estado detectada: mensagemStatus é "Estabelecendo conexão..." mas coletadosAteAgora > 0. Usando mensagem do backend ou uma genérica.', `Msg Backend: ${progresso.mensagemStatus}`);
              currentMessage = `Coletando: ${progresso.coletadosAteAgora} encontrados...`; 
          } else {
              currentMessage = "Estabelecendo conexão...";
          }
      } else {
        // Se progresso.mensagemStatus é diferente de initialDialogDisplayState.mensagemStatus,
        // currentMessage já foi inicializado com progresso.mensagemStatus, então está correto.
      }
  } else if (apiError) {
    statusIcon = <AlertTriangle className="h-6 w-6 text-red-500" />; progressBarClass = "bg-red-500"; statusMessageColor = "text-red-700"; currentMessage = `Erro: ${apiError}`;
  } else if (progresso.fase === "cancelado") {
    statusIcon = <XCircle className="h-6 w-6 text-red-700" />; progressBarClass = "bg-red-700"; statusMessageColor = "text-red-700";
  } else if (progresso.fase === "erro") {
    statusIcon = <AlertCircle className="h-6 w-6 text-red-600"/>; progressBarClass = "bg-red-600"; statusMessageColor="text-red-600";
  } else if (progresso.fase === "concluido") {
    if (progresso.falhasNoProcessamento > 0 && (progresso.importadosNovos + progresso.atualizadosExistentes) > 0) { statusIcon = <CheckCircle2 className="h-6 w-6 text-green-500" />; progressBarClass = "bg-green-500"; statusMessageColor = "text-green-600"; currentMessage = `Concluído com ${progresso.falhasNoProcessamento} falhas.`;}
    else if (progresso.totalAProcessar === 0 && progresso.coletadosAteAgora === 0) { statusIcon = <Info className="h-6 w-6 text-[#00446a]" />; progressBarClass = "bg-[#00446a]"; statusMessageColor = "text-[#00446a]"; }
    else if (progresso.falhasNoProcessamento > 0 && (progresso.importadosNovos + progresso.atualizadosExistentes) === 0 && progresso.totalAProcessar > 0) { statusIcon = <AlertCircle className="h-6 w-6 text-red-600"/>; progressBarClass = "bg-red-600"; statusMessageColor="text-red-600"; currentMessage = `Falha total na importação. ${progresso.mensagemStatus}`; }
    else { statusIcon = <CheckCircle2 className="h-6 w-6 text-green-500" />; progressBarClass = "bg-green-500"; statusMessageColor = "text-green-600"; }
  } else if (progresso.isPaused) {
    statusIcon = <PauseCircle className="h-6 w-6 text-yellow-600" />; progressBarClass = "bg-yellow-600"; statusMessageColor = "text-yellow-700";
  } else if (progresso.emProgresso && progresso.fase === "processamento") {
    statusIcon = <Loader2 className="h-6 w-6 text-[#00446a] animate-spin" />; progressBarClass = "bg-[#00446a]"; statusMessageColor = "text-[#00446a]";
  }

  // Se currentMessage não foi alterado dentro dos blocos acima (ex: para o caso 'concluido' sem condições especiais), ele mantém progresso.mensagemStatus
  // A menos que seja um estado de erro ou pausa, onde já foi tratado.
  if (progresso.fase !== "cancelado" && progresso.fase !== "erro" && !apiError && !isConnectingOrColetaInicial && !progresso.isPaused){
      currentMessage = progresso.mensagemStatus;
  }


  const showActionButtons = isProcessEffectivelyActive && !isConnectingOrColetaInicial && !apiError;

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => { if (!openState) handleDefinitiveCloseAndCancel(); }}>
      <DialogContent className="sm:max-w-2xl" onInteractOutside={(event) => { if (isProcessEffectivelyActive) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl"><FileUp className="mr-3 h-6 w-6 text-[#00446a]" />Importação de Clientes TalkBI</DialogTitle>
          <DialogDescription>Acompanhe o progresso e gerencie a sincronização.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="flex items-start space-x-3 p-3 bg-slate-50/70 rounded-md border min-h-[60px]">
            {statusIcon}
            <div className="flex-1">
              <p className={`font-semibold ${statusMessageColor}`}>{currentMessage}</p>
              {progresso.fase === "coleta" && progresso.coletadosAteAgora > 0 && !isConnectingOrColetaInicial && !apiError && (
                <p className="text-sm text-gray-500 mt-0.5">{progresso.coletadosAteAgora} clientes encontrados até o momento...</p>
              )}
              {(progresso.fase === "processamento" || progresso.fase === "concluido" || progresso.fase === "erro" || progresso.fase === "cancelado") && progresso.totalAProcessar > 0 && !apiError && (
                <p className="text-sm text-gray-500 mt-0.5">{progresso.processadosTotalmente} de {progresso.totalAProcessar} clientes processados.</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{debugInfo}</p>
            </div>
          </div>
          {(progresso.fase === "processamento" || progresso.fase === "concluido" || progresso.fase === "cancelado" || progresso.fase === "erro") && !isConnectingOrColetaInicial && progresso.totalAProcessar > 0 && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Progresso do Processamento:</span>
              <span className={`text-sm font-semibold ${statusMessageColor}`}>{progresso.porcentagem}%</span>
            </div>
            <Progress value={progresso.porcentagem} className={`w-full h-3 [&>*]:${progressBarClass}`} />
          </div>
          )}
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: "Novos Importados", value: progresso.importadosNovos, icon: ArchiveRestore, color: "green" },
              { title: "Atualizados", value: progresso.atualizadosExistentes, icon: ArrowUpCircle, color: "#00446a" },
              { title: "Falhas", value: progresso.falhasNoProcessamento, icon: AlertTriangle, color: "red" },
            ].map((item) => {
              const Icon = item.icon;
              const itemColorClass = item.color.startsWith("#") ? `text-[${item.color}]` : `text-${item.color}-600`;
              const itemBgClass = item.color.startsWith("#") ? `bg-[${item.color}]/10` : `bg-${item.color}-50`; 
              const itemBorderClass = item.color.startsWith("#") ? `border-[${item.color}]/30` : `border-${item.color}-200`; 
              const itemTextMediumClass = item.color.startsWith("#") ? `text-[${item.color}]` : `text-${item.color}-700`;

              return (
                <div key={item.title} className={`p-4 rounded-lg border ${itemBgClass} ${itemBorderClass} text-center flex flex-col items-center justify-center`}>
                  <div className={`flex items-center ${itemColorClass} mb-1`}> <Icon className={`h-5 w-5 mr-2`} /> <span className={`text-xs font-medium ${itemTextMediumClass}`}>{item.title}</span> </div>
                  <p className={`text-2xl font-bold ${itemColorClass}`}>{item.value}</p>
                </div>);
            })}
          </div>
          {isProcessEffectivelyActive && !progresso.isPaused && !isConnectingOrColetaInicial && (
            <div className="flex items-center gap-2 text-xs text-gray-500 p-2 bg-gray-50/50 rounded-md">
              <Info className="h-4 w-4 flex-shrink-0" />
              <span>Fechar esta janela irá CANCELAR o processo de importação.</span>
            </div>
          )}
        </div>
        <DialogFooter className="mt-2 sm:justify-between items-center">
            <div className="flex gap-2 justify-start mb-4 sm:mb-0">
                {showActionButtons && (
                    <>
                        <Button type="button" variant="outline" onClick={handlePauseResume} disabled={isInteractingWithControl} className="border-gray-300">
                            {isInteractingWithControl && progresso.isPaused === progresso.isPaused ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (progresso.isPaused ? <PlayCircle className="mr-2 h-4 w-4 text-green-600" /> : <PauseCircle className="mr-2 h-4 w-4 text-[#00446a]" />)}
                            {progresso.isPaused ? "Retomar" : "Pausar"}
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleCancelAction} disabled={isInteractingWithControl}>
                             {isInteractingWithControl ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />}
                            Cancelar Importação
                        </Button>
                    </>
                )}
            </div>
            <Button type="button" variant={!isProcessEffectivelyActive ? "default" : "outline"}
                className={`${!isProcessEffectivelyActive ? "bg-[#00446a] hover:bg-[#00446a]/90" : ""} min-w-[100px]`}
                onClick={handleDefinitiveCloseAndCancel}
                disabled={isInteractingWithControl && isProcessEffectivelyActive}>
                 {isInteractingWithControl && isProcessEffectivelyActive ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {!isProcessEffectivelyActive ? "Fechar" : "Fechar e Cancelar"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}