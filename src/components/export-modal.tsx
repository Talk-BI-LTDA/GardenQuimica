/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/export-modal.tsx
"use client";

import { useState } from "react";
import { motion,  } from "framer-motion";
import { 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  Table, 
  FileText, 
  Check, 
  X, 
  FileDown,
  HelpCircle
} from "lucide-react";

import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { exportVendasData, ExportFormat, ExportType } from "@/actions/export-actions";

// Tipo Filtros para compatibilidade com o código existente
export interface Filtros {
  [key: string]: any;
}

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters?: Filtros;
  activeTab?: string;
}

export function ExportModal({
  open,
  onOpenChange,
  filters = {},
  activeTab = "painel",
}: ExportModalProps) {
  // Estados para controlar as opções de exportação
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [exportType, setExportType] = useState<ExportType>("resumida");
  const [loading, setLoading] = useState(false);
  
  // Definir tabs padrão com base na tab ativa
  const initialTabs = () => {
    if (activeTab === "painel") return ["pendentes", "finalizadas", "canceladas"];
    if (activeTab === "vendas") return ["finalizadas"];
    if (activeTab === "naovendas") return ["canceladas"];
    if (activeTab === "cotacoes") return ["pendentes"];
    return ["pendentes", "finalizadas", "canceladas"];
  };
  
  const [selectedTabs, setSelectedTabs] = useState<string[]>(initialTabs());
  
  // Função para gerenciar seleção de tabs
  const handleTabSelection = (tab: string) => {
    if (selectedTabs.includes(tab)) {
      // Remover tab se já estiver selecionada
      setSelectedTabs(selectedTabs.filter(t => t !== tab));
    } else {
      // Adicionar tab se não estiver selecionada
      setSelectedTabs([...selectedTabs, tab]);
    }
  };
  
  // Função para baixar o arquivo
  const handleDownload = async () => {
    if (selectedTabs.length === 0) {
      toast.error("Nenhuma categoria selecionada", {
        description: "Selecione pelo menos uma categoria para exportar",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await exportVendasData({
        format,
        type: exportType,
        tabs: selectedTabs as ("pendentes" | "finalizadas" | "canceladas")[],
        filters,
      });
      
      if (!result) {
        throw new Error("Erro ao gerar arquivo de exportação");
      }
      
      const { fileData, fileType, fileName } = result;
      
      let blob;
      
      // Se for XLSX, converter de base64 para Blob corretamente
      if (format === "xlsx") {
        const byteCharacters = atob(fileData as string);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: fileType as string });
      } else {
        blob = new Blob([fileData as string], { type: fileType as string });
      }
      
      // Criar URL para download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName as string;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Fechar o modal após download bem-sucedido
      onOpenChange(false);
      
      toast.success("Exportação concluída", {
        description: `Arquivo ${fileName} baixado com sucesso`,
      });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro na exportação", {
        description: error instanceof Error ? error.message : "Erro desconhecido ao exportar dados",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[100%] !w-fit">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Download className="h-5 w-5 text-[#00446A]" />
              Exportar Cotações
            </DialogTitle>
            <DialogDescription>
              Personalize as opções de exportação para gerar seu relatório
            </DialogDescription>
          </DialogHeader>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Coluna 1: Opções de Categorias */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h3 className="text-sm font-medium mb-3 flex items-center">
              <Table className="h-4 w-4 mr-2 text-[#00446A]" />
              Selecione as Categorias
            </h3>
            
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pendentes"
                      checked={selectedTabs.includes("pendentes")}
                      onCheckedChange={() => handleTabSelection("pendentes")}
                    />
                    <Label htmlFor="pendentes" className="cursor-pointer">
                      Cotações Pendentes
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="finalizadas"
                      checked={selectedTabs.includes("finalizadas")}
                      onCheckedChange={() => handleTabSelection("finalizadas")}
                    />
                    <Label htmlFor="finalizadas" className="cursor-pointer">
                      Cotações Finalizadas
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="canceladas"
                      checked={selectedTabs.includes("canceladas")}
                      onCheckedChange={() => handleTabSelection("canceladas")}
                    />
                    <Label htmlFor="canceladas" className="cursor-pointer">
                      Cotações Canceladas
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <h3 className="text-sm font-medium mb-3 flex items-center">
              <HelpCircle className="h-4 w-4 mr-2 text-[#00446A]" />
              Tipo de Exportação
            </h3>
            
            <Card>
              <CardContent className="pt-4">
                <RadioGroup 
                  value={exportType} 
                  onValueChange={(value) => setExportType(value as ExportType)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="resumida" id="resumida" />
                    <Label htmlFor="resumida" className="cursor-pointer">
                      Resumida - Apenas dados básicos
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="completa" id="completa" />
                    <Label htmlFor="completa" className="cursor-pointer">
                      Completa - Todos os detalhes
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Coluna 2: Formatos e Filtros */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <h3 className="text-sm font-medium mb-1 flex items-center">
              <FileText className="h-4 w-4 mr-2 text-[#00446A]" />
              Formato do Arquivo
            </h3>    

                <Tabs 
                  value={format} 
                  onValueChange={(value) => setFormat(value as ExportFormat)}
                  className="w-full mb-6"
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="xlsx" className="flex items-center justify-center">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      XLSX
                    </TabsTrigger>
                    <TabsTrigger value="csv" className="flex items-center justify-center">
                      <FileText className="h-4 w-4 mr-2" />
                      CSV
                    </TabsTrigger>
                    <TabsTrigger value="tsv" className="flex items-center justify-center">
                      <Table className="h-4 w-4 mr-2" />
                      TSV
                    </TabsTrigger>
                    <TabsTrigger value="json" className="flex items-center justify-center">
                      <FileJson className="h-4 w-4 mr-2" />
                      JSON
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
            
            {/* <h3 className="text-sm font-medium mb-3 flex items-center">
              <Table className="h-4 w-4 mr-2 text-[#00446A]" />
              Filtros Aplicados
            </h3>
            
            <Card>
              <CardContent className="pt-4">
                <AnimatePresence>
                  {Object.keys(filters).length > 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2 text-sm"
                    >
                      {Object.entries(filters).map(([key, value]) => (
                        <motion.div 
                          key={key} 
                          className="flex justify-between"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <span className="font-medium">{formatFilterName(key)}:</span>
                          <span>{formatFilterValue(key, value)}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-gray-500"
                    >
                      Nenhum filtro aplicado. Todos os dados serão exportados.
                    </motion.p>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card> */}
          </motion.div>
        </div>
        
        <Separator className="my-2" />
        
        <motion.div 
          className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="flex items-start">
            <HelpCircle className="h-5 w-5 mr-2 text-[#00446A] mt-0.5" />
            <div>
              <p className="font-medium text-gray-800 mb-1">Dicas para exportação:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Formato XLSX é recomendado para abrir no Excel ou planilhas Google</li>
                <li>CSV e TSV são formatos universais para importação em outros sistemas</li>
                <li>A exportação completa inclui todos os detalhes das cotações e produtos</li>
                <li>Os filtros aplicados na tabela serão considerados na exportação</li>
              </ul>
            </div>
          </div>
        </motion.div>
        
        <DialogFooter className="flex justify-between items-center pt-4">
          <div className="text-sm text-gray-500 flex items-center">
            <Check className="h-4 w-4 mr-1 text-green-500" />
            {selectedTabs.length} {selectedTabs.length === 1 ? "categoria selecionada" : "categorias selecionadas"}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={handleDownload}
                disabled={loading || selectedTabs.length === 0}
                className="bg-[#00446A] hover:bg-[#00345A]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    Baixar {format.toUpperCase()}
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Função auxiliar para formatar nomes de filtros
