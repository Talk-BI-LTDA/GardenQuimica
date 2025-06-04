// src/lib/progress-store.ts - Versão com debug melhorado

import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

export interface ImportacaoProgresso {
  coletadosAteAgora: number;
  totalAProcessar: number;
  processadosNoLoteAtual: number;
  processadosTotalmente: number;
  importadosNovos: number;
  atualizadosExistentes: number;
  falhasNoProcessamento: number;
  emProgresso: boolean;
  mensagemStatus: string;
  isPaused: boolean;
  isCancelled: boolean;
  lastUpdatedTimestamp: number;
  fase: "ocioso" | "coleta" | "processamento" | "concluido" | "erro" | "cancelado";
  porcentagem: number;
}

const PROGRESS_FILE = join(process.cwd(), 'tmp', 'importacao-progress.json');

// Estado padrão
const defaultState: ImportacaoProgresso = {
  coletadosAteAgora: 0,
  totalAProcessar: 0,
  processadosNoLoteAtual: 0,
  processadosTotalmente: 0,
  importadosNovos: 0,
  atualizadosExistentes: 0,
  falhasNoProcessamento: 0,
  emProgresso: false,
  mensagemStatus: "Pronto para iniciar.",
  isPaused: false,
  isCancelled: false,
  lastUpdatedTimestamp: 0,
  fase: "ocioso",
  porcentagem: 0,
};

// Garantir que o diretório tmp existe
function ensureTmpDir() {
  const tmpDir = join(process.cwd(), 'tmp');
  if (!existsSync(tmpDir)) {
    try {
      mkdirSync(tmpDir, { recursive: true });
      console.log('[PROGRESS_STORE] Diretório tmp criado:', tmpDir);
    } catch (error) {
      console.warn('[PROGRESS_STORE] Não foi possível criar diretório tmp:', error);
    }
  }
}

// Função para ler o estado do arquivo
export function readProgressState(): ImportacaoProgresso {
  try {
    ensureTmpDir();
    
    if (!existsSync(PROGRESS_FILE)) {
      console.log('[PROGRESS_STORE] Arquivo não existe, criando estado padrão');
      writeProgressState(defaultState);
      return defaultState;
    }
    
    const data = readFileSync(PROGRESS_FILE, 'utf8');
    const state = JSON.parse(data) as ImportacaoProgresso;
    
    console.log('[PROGRESS_STORE] Estado lido do arquivo:', {
      fase: state.fase,
      emProgresso: state.emProgresso,
      coletados: state.coletadosAteAgora,  // Debug específico
      processados: state.processadosTotalmente,
      total: state.totalAProcessar,
      timestamp: state.lastUpdatedTimestamp,
      mensagem: state.mensagemStatus
    });
    
    return state;
  } catch (error) {
    console.error('[PROGRESS_STORE] Erro ao ler estado:', error);
    return defaultState;
  }
}

// Função para escrever o estado no arquivo
export function writeProgressState(state: ImportacaoProgresso): void {
  try {
    ensureTmpDir();
    
    // Atualizar timestamp sempre que salvar
    const stateWithTimestamp = {
      ...state,
      lastUpdatedTimestamp: Date.now()
    };
    
    console.log('[PROGRESS_STORE] ANTES DE SALVAR - Estado recebido:', {
      fase: state.fase,
      emProgresso: state.emProgresso,
      coletados: state.coletadosAteAgora,  // Debug específico
      processados: state.processadosTotalmente,
      total: state.totalAProcessar,
      mensagem: state.mensagemStatus
    });
    
    const jsonString = JSON.stringify(stateWithTimestamp, null, 2);
    writeFileSync(PROGRESS_FILE, jsonString, 'utf8');
    
    console.log('[PROGRESS_STORE] Estado salvo no arquivo:', {
      fase: stateWithTimestamp.fase,
      emProgresso: stateWithTimestamp.emProgresso,
      coletados: stateWithTimestamp.coletadosAteAgora,  // Debug específico
      processados: stateWithTimestamp.processadosTotalmente,
      total: stateWithTimestamp.totalAProcessar,
      timestamp: stateWithTimestamp.lastUpdatedTimestamp,
      arquivo: PROGRESS_FILE
    });
    
    // Verificar imediatamente se foi salvo corretamente
    const verificacao = readFileSync(PROGRESS_FILE, 'utf8');
    const estadoVerificado = JSON.parse(verificacao) as ImportacaoProgresso;
    console.log('[PROGRESS_STORE] VERIFICAÇÃO - Estado realmente salvo:', {
      coletados: estadoVerificado.coletadosAteAgora,
      processados: estadoVerificado.processadosTotalmente,
      fase: estadoVerificado.fase
    });
    
  } catch (error) {
    console.error('[PROGRESS_STORE] Erro ao salvar estado:', error);
  }
}

// Função para atualizar parcialmente o estado
export function updateProgressState(updates: Partial<ImportacaoProgresso>): ImportacaoProgresso {
  console.log('[PROGRESS_STORE] UPDATE - Recebendo updates:', updates);
  
  const currentState = readProgressState();
  console.log('[PROGRESS_STORE] UPDATE - Estado atual antes da atualização:', {
    coletados: currentState.coletadosAteAgora,
    fase: currentState.fase
  });
  
  const newState = { ...currentState, ...updates };
  
  console.log('[PROGRESS_STORE] UPDATE - Novo estado após merge:', {
    coletados: newState.coletadosAteAgora,
    fase: newState.fase,
    mensagem: newState.mensagemStatus
  });
  
  // Recalcular porcentagem se necessário
  if (newState.totalAProcessar > 0 && newState.fase === "processamento") {
    newState.porcentagem = Math.min(100, Math.round((newState.processadosTotalmente / newState.totalAProcessar) * 100));
  } else if (newState.fase === "concluido" || newState.fase === "cancelado" || newState.fase === "erro") {
    newState.porcentagem = 100;
  } else if (newState.fase === "coleta") {
    newState.porcentagem = 0;
  }
  
  writeProgressState(newState);
  return newState;
}

// Função para resetar o estado
export function resetProgressState(): ImportacaoProgresso {
  console.log('[PROGRESS_STORE] Resetando estado para padrão');
  writeProgressState(defaultState);
  return defaultState;
}

// Função para limpar o arquivo (opcional)
export function clearProgressFile(): void {
  try {
    if (existsSync(PROGRESS_FILE)) {
      unlinkSync(PROGRESS_FILE);
      console.log('[PROGRESS_STORE] Arquivo de progresso removido');
    }
  } catch (error) {
    console.error('[PROGRESS_STORE] Erro ao remover arquivo:', error);
  }
}

// Função de debug para verificar o arquivo
export function debugProgressFile(): void {
  try {
    console.log('[PROGRESS_DEBUG] Arquivo existe?', existsSync(PROGRESS_FILE));
    console.log('[PROGRESS_DEBUG] Caminho do arquivo:', PROGRESS_FILE);
    
    if (existsSync(PROGRESS_FILE)) {
      const conteudo = readFileSync(PROGRESS_FILE, 'utf8');
      console.log('[PROGRESS_DEBUG] Conteúdo do arquivo:', conteudo);
    }
  } catch (error) {
    console.error('[PROGRESS_DEBUG] Erro ao debugar arquivo:', error);
  }
}