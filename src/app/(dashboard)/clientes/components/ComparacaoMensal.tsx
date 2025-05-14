// // app/(dashboard)/clientes/components/ComparacaoMensal.tsx
// "use client";
// import React, { useState, useEffect, useMemo } from "react";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   ResponsiveContainer,
//   LineChart,
//   Line
// } from "recharts";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Label } from "@/components/ui/label";
// import { DateRange } from "react-day-picker";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { format, subMonths, isAfter, isBefore, isEqual, } from "date-fns";
// import { ptBR } from "date-fns/locale";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { CalendarIcon, AlertCircle } from "lucide-react";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import { Calendar } from "@/components/ui/calendar";
// import { CustomTooltipProps } from "@/types/grafico-types";

// interface DadoMensal {
//   mes: string;
//   novosClientes: number;
//   clientesRecorrentes: number;
//   clientesNaoRecorrentes: number;
//   valorTotal: number;
//   segmentos: Record<string, number>;
// }

// interface ComparacaoMensalProps {
//   dados: DadoMensal[];
//   segmentosDisponiveis: string[];
// }

// const formatarValorBRL = (valor: number): string => {
//   return new Intl.NumberFormat("pt-BR", {
//     style: "currency",
//     currency: "BRL",
//   }).format(valor);
// };

// const ComparacaoMensal: React.FC<ComparacaoMensalProps> = ({ 
//   dados, 
//   segmentosDisponiveis 
// }) => {
//   const [tipoVisualizacao, setTipoVisualizacao] = useState<"clientes" | "valor">("clientes");
//   const [tipoGrafico, setTipoGrafico] = useState<"barras" | "linhas">("linhas");
//   const [filtroRecorrencia, setFiltroRecorrencia] = useState<"todos" | "recorrentes" | "naoRecorrentes">("todos");
//   const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);
//   const [periodoSelecionado, setPeriodoSelecionado] = useState<DateRange | undefined>(undefined);

//   // Inicializar com todos os dados ao montar o componente
//   useEffect(() => {
//     // Aplicar período padrão apenas se dados estiverem carregados
//     if (dados && dados.length > 0) {
//       console.log("Dados disponíveis:", dados.length);
//       // Definir período "Todo o período" por padrão
//       setPeriodoSelecionado(undefined);
//     }
//   }, [dados]);

//   // Conversão de string MM/YYYY para Date
//   const converteMesParaData = (mes: string): Date => {
//     const [mesStr, anoStr] = mes.split('/');
//     const mesNum = parseInt(mesStr, 10) - 1; // Mês é 0-indexed em JS
//     const anoNum = parseInt(anoStr, 10);
//     // Define o dia 15 (meio do mês) para comparações mais precisas
//     return new Date(anoNum, mesNum, 15);
//   };

//   // Use useMemo para calcular os dados filtrados
//   const dadosFiltrados = useMemo(() => {
//     if (!dados || dados.length === 0) {
//       console.log("Sem dados para filtrar");
//       return [];
//     }

//     console.log("Filtrando dados, total:", dados.length);
//     console.log("Período selecionado:", periodoSelecionado ? 
//       `${periodoSelecionado.from?.toISOString()} - ${periodoSelecionado.to?.toISOString()}` : 
//       "Todo o período");
    
//     return dados.filter(dado => {
//       // Filtro de período
//       if (periodoSelecionado?.from) {
//         try {
//           const dataMes = converteMesParaData(dado.mes);
          
//           // Verificar se está dentro do período selecionado
//           if (periodoSelecionado.to) {
//             const dentroDoIntervalo = 
//               (isAfter(dataMes, periodoSelecionado.from) || isEqual(dataMes, periodoSelecionado.from)) && 
//               (isBefore(dataMes, periodoSelecionado.to) || isEqual(dataMes, periodoSelecionado.to));
            
//             if (!dentroDoIntervalo) {
//               return false;
//             }
//           } else {
//             // Se não tiver data final, verificar apenas a data inicial
//             if (isBefore(dataMes, periodoSelecionado.from)) {
//               return false;
//             }
//           }
//         } catch (error) {
//           console.error("Erro ao processar data:", error, dado.mes);
//           return false;
//         }
//       }
      
//       // Filtro de segmentos
//       if (segmentosSelecionados.length > 0) {
//         // Verificar se pelo menos um dos segmentos selecionados está presente nos dados
//         const temSegmentoSelecionado = segmentosSelecionados.some(segmento => 
//           dado.segmentos && typeof dado.segmentos[segmento] !== 'undefined' && dado.segmentos[segmento] > 0
//         );
        
//         if (!temSegmentoSelecionado) {
//           return false;
//         }
//       }
      
//       return true;
//     });
//   }, [dados, periodoSelecionado, segmentosSelecionados]);

//   // Lidar com a seleção/desseleção de segmentos
//   const toggleSegmento = (segmento: string) => {
//     if (segmentosSelecionados.includes(segmento)) {
//       setSegmentosSelecionados(prev => prev.filter(s => s !== segmento));
//     } else {
//       setSegmentosSelecionados(prev => [...prev, segmento]);
//     }
//   };

//   // Personalizar o tooltip
//   const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
//     if (active && payload && payload.length > 0) {
//       return (
//         <div className="bg-white p-3 border rounded-md shadow-md">
//           <p className="font-bold">{label}</p>
//           {tipoVisualizacao === "clientes" ? (
//             <>
//               {filtroRecorrencia === "todos" || filtroRecorrencia === "recorrentes" ? (
//                 <p className="text-sm text-green-600 flex items-center">
//                   <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
//                   Recorrentes: {
//                     payload.find(p => p.dataKey === "clientesRecorrentes")?.value || 0
//                   }
//                 </p>
//               ) : null}
              
//               {filtroRecorrencia === "todos" || filtroRecorrencia === "naoRecorrentes" ? (
//                 <p className="text-sm text-orange-600 flex items-center">
//                   <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
//                   Não Recorrentes: {
//                     payload.find(p => p.dataKey === "clientesNaoRecorrentes")?.value || 0
//                   }
//                 </p>
//               ) : null}
              
//               {segmentosSelecionados.map(segmento => {
//                 const value = payload.find(p => p.dataKey === `segmentos.${segmento}`)?.value;
//                 if (value !== undefined) {
//                   return (
//                     <p key={segmento} className="text-sm text-gray-600 flex items-center">
//                       <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
//                       {segmento}: {value}
//                     </p>
//                   );
//                 }
//                 return null;
//               })}
//             </>
//           ) : (
//             <p className="text-sm text-blue-600 flex items-center">
//               <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
//               Valor Total: {formatarValorBRL(payload[0].value as number)}
//             </p>
//           )}
//         </div>
//       );
//     }
//     return null;
//   };

//   // Opções de período predefinidas
//   const periodoOptions = [
//     { label: "Último mês", value: "1m", fn: () => ({ from: subMonths(new Date(), 1), to: new Date() }) },
//     { label: "Últimos 3 meses", value: "3m", fn: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
//     { label: "Últimos 6 meses", value: "6m", fn: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
//     { label: "Último ano", value: "12m", fn: () => ({ from: subMonths(new Date(), 12), to: new Date() }) },
//     { label: "Todo o período", value: "all", fn: () => undefined }
//   ];

//   // Aplicar filtro de período
//   const aplicarPeriodo = (value: string) => {
//     const periodoOption = periodoOptions.find(p => p.value === value);
//     if (periodoOption) {
//       const novoPeriodo = periodoOption.fn();
//       setPeriodoSelecionado(novoPeriodo);
      
//       // Log para depuração
//       console.log(`Aplicando período: ${periodoOption.label}`, novoPeriodo);
//     }
//   };

//   // Formatar o período selecionado para exibição
//   const formatarPeriodoSelecionado = () => {
//     if (!periodoSelecionado?.from) return "Todo o período";
//     const formattedFrom = format(periodoSelecionado.from, "dd/MM/yyyy", { locale: ptBR });
//     if (periodoSelecionado.to) {
//       const formattedTo = format(periodoSelecionado.to, "dd/MM/yyyy", { locale: ptBR });
//       return `${formattedFrom} - ${formattedTo}`;
//     }
//     return formattedFrom;
//   };

//   // Renderizar mensagem de ajuda quando não houver dados
//   const renderizarMensagemSemDados = () => {
//     return (
//       <div className="flex flex-col items-center justify-center h-full gap-2">
//         <AlertCircle className="h-8 w-8 text-amber-500" />
//         <p className="text-gray-500 text-center">
//           Nenhum dado disponível para o período selecionado.
//         </p>
//         <p className="text-gray-400 text-sm text-center">
//           Tente selecionar um período diferente ou remover filtros.
//         </p>
//         <Button 
//           variant="outline" 
//           size="sm" 
//           className="mt-2"
//           onClick={() => {
//             setPeriodoSelecionado(undefined);
//             setSegmentosSelecionados([]);
//           }}
//         >
//           Limpar filtros
//         </Button>
//       </div>
//     );
//   };

//   // Renderizar gráfico de acordo com o tipo selecionado
//   const renderGrafico = () => {
//     if (dadosFiltrados.length === 0) {
//       return renderizarMensagemSemDados();
//     }

//     if (tipoGrafico === "barras") {
//       return (
//         <ResponsiveContainer width="100%" height="100%">
//           <BarChart
//             data={dadosFiltrados}
//             margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
//             barGap={0}
//             barCategoryGap={10}
//           >
//             <CartesianGrid strokeDasharray="3 3" />
//             <XAxis dataKey="mes" />
//             <YAxis />
//             <Tooltip content={(props) => <CustomTooltip {...props as CustomTooltipProps} />} />
//             <Legend />
            
//             {tipoVisualizacao === "clientes" ? (
//               <>
//                 {(filtroRecorrencia === "todos" || filtroRecorrencia === "recorrentes") && (
//                   <Bar 
//                     dataKey="clientesRecorrentes" 
//                     name="Clientes Recorrentes"
//                     fill="#4CAF50" 
//                     radius={[4, 4, 0, 0]}
//                   />
//                 )}
                
//                 {(filtroRecorrencia === "todos" || filtroRecorrencia === "naoRecorrentes") && (
//                   <Bar 
//                     dataKey="clientesNaoRecorrentes" 
//                     name="Clientes Não Recorrentes"
//                     fill="#FF8042" 
//                     radius={[4, 4, 0, 0]}
//                   />
//                 )}
                
//                 {segmentosSelecionados.map((segmento, index) => {
//                   const cores = ["#185678", "#97C31D", "#FFBB28", "#8884d8", "#9C27B0", "#607D8B"];
//                   return (
//                     <Bar 
//                       key={segmento}
//                       dataKey={`segmentos.${segmento}`}
//                       name={segmento}
//                       fill={cores[index % cores.length]} 
//                       radius={[4, 4, 0, 0]}
//                     />
//                   );
//                 })}
//               </>
//             ) : (
//               <Bar 
//                 dataKey="valorTotal" 
//                 name="Valor Total"
//                 fill="#185678" 
//                 radius={[4, 4, 0, 0]}
//               />
//             )}
//           </BarChart>
//         </ResponsiveContainer>
//       );
//     } else {
//       return (
//         <ResponsiveContainer width="100%" height="100%">
//           <LineChart
//             data={dadosFiltrados}
//             margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
//           >
//             <CartesianGrid strokeDasharray="3 3" />
//             <XAxis dataKey="mes" />
//             <YAxis />
//             <Tooltip content={(props) => <CustomTooltip {...props as CustomTooltipProps} />} />
//             <Legend />
            
//             {tipoVisualizacao === "clientes" ? (
//               <>
//                 {(filtroRecorrencia === "todos" || filtroRecorrencia === "recorrentes") && (
//                   <Line 
//                     type="monotone"
//                     dataKey="clientesRecorrentes" 
//                     name="Clientes Recorrentes"
//                     stroke="#4CAF50" 
//                     strokeWidth={2}
//                     dot={{ r: 4 }}
//                     activeDot={{ r: 6 }}
//                   />
//                 )}
                
//                 {(filtroRecorrencia === "todos" || filtroRecorrencia === "naoRecorrentes") && (
//                   <Line 
//                     type="monotone"
//                     dataKey="clientesNaoRecorrentes" 
//                     name="Clientes Não Recorrentes"
//                     stroke="#FF8042" 
//                     strokeWidth={2}
//                     dot={{ r: 4 }}
//                     activeDot={{ r: 6 }}
//                   />
//                 )}
                
//                 {segmentosSelecionados.map((segmento, index) => {
//                   const cores = ["#185678", "#97C31D", "#FFBB28", "#8884d8", "#9C27B0", "#607D8B"];
//                   return (
//                     <Line 
//                       key={segmento}
//                       type="monotone"
//                       dataKey={`segmentos.${segmento}`}
//                       name={segmento}
//                       stroke={cores[index % cores.length]} 
//                       strokeWidth={2}
//                       dot={{ r: 4 }}
//                       activeDot={{ r: 6 }}
//                     />
//                   );
//                 })}
//               </>
//             ) : (
//               <Line 
//                 type="monotone"
//                 dataKey="valorTotal" 
//                 name="Valor Total"
//                 stroke="#185678" 
//                 strokeWidth={2}
//                 dot={{ r: 4 }}
//                 activeDot={{ r: 6 }}
//               />
//             )}
//           </LineChart>
//         </ResponsiveContainer>
//       );
//     }
//   };

//   // Exibir contador de dados
//   const getDataCountSummary = () => {
//     if (!dados || dados.length === 0) return null;
    
//     return (
//       <div className="text-xs text-gray-500 text-right mt-1">
//         Exibindo {dadosFiltrados.length} de {dados.length} períodos
//       </div>
//     );
//   };

//   return (
//     <Card className="w-full shadow-md">
//       <CardHeader className="pb-2">
//         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
//           <CardTitle className="text-lg">Comparação Mensal</CardTitle>
//           <div className="flex flex-wrap items-center gap-2">
//             <Popover>
//               <PopoverTrigger asChild>
//                 <Button
//                   variant="outline"
//                   className="min-w-40 flex justify-between items-center"
//                 >
//                   <CalendarIcon className="h-4 w-4 mr-2" />
//                   <span>{formatarPeriodoSelecionado()}</span>
//                 </Button>
//               </PopoverTrigger>
//               <PopoverContent className="w-auto p-0" align="end">
//                 <div className="p-3 border-b">
//                   <h3 className="text-sm font-medium mb-2">Períodos Predefinidos</h3>
//                   <div className="grid grid-cols-2 gap-2">
//                     {periodoOptions.map((option) => (
//                       <Button
//                         key={option.value}
//                         variant="outline"
//                         size="sm"
//                         className="text-xs"
//                         onClick={() => aplicarPeriodo(option.value)}
//                       >
//                         {option.label}
//                       </Button>
//                     ))}
//                   </div>
//                 </div>
//                 <Calendar
//                   mode="range"
//                   defaultMonth={periodoSelecionado?.from}
//                   selected={periodoSelecionado}
//                   onSelect={setPeriodoSelecionado}
//                   numberOfMonths={2}
//                   locale={ptBR}
//                 />
//               </PopoverContent>
//             </Popover>
            
//             <Select
//               value={tipoGrafico}
//               onValueChange={(value) => setTipoGrafico(value as "barras" | "linhas")}
//             >
//               <SelectTrigger className="w-[140px]">
//                 <SelectValue placeholder="Tipo de Gráfico" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="linhas">Gráfico de Linhas</SelectItem>
//                 <SelectItem value="barras">Gráfico de Barras</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>
//         </div>
//         {getDataCountSummary()}
//       </CardHeader>
//       <CardContent>
//         <div className="flex flex-col gap-4">
//           <div className="flex flex-wrap gap-4 justify-between items-center">
//             <Tabs 
//               value={tipoVisualizacao} 
//               onValueChange={(v) => setTipoVisualizacao(v as "clientes" | "valor")}
//               className="w-full max-w-[280px]"
//             >
//               <TabsList className="grid grid-cols-2 w-full">
//                 <TabsTrigger value="clientes">Novos Clientes</TabsTrigger>
//                 <TabsTrigger value="valor">Valor de Vendas</TabsTrigger>
//               </TabsList>
//             </Tabs>
            
//             {tipoVisualizacao === "clientes" && (
//               <Tabs 
//                 value={filtroRecorrencia} 
//                 onValueChange={(v) => setFiltroRecorrencia(v as "todos" | "recorrentes" | "naoRecorrentes")}
//                 className="w-full max-w-[320px]"
//               >
//                 <TabsList className="grid grid-cols-3 w-full">
//                   <TabsTrigger value="todos">Todos</TabsTrigger>
//                   <TabsTrigger value="recorrentes">Recorrentes</TabsTrigger>
//                   <TabsTrigger value="naoRecorrentes">Não Recorrentes</TabsTrigger>
//                 </TabsList>
//               </Tabs>
//             )}
//           </div>
          
//           {tipoVisualizacao === "clientes" && segmentosDisponiveis.length > 0 && (
//             <div className="flex flex-wrap gap-3 mt-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
//               <div className="text-sm font-medium w-full mb-1">Segmentos:</div>
//               <div className="flex flex-wrap gap-2">
//                 {segmentosDisponiveis.map(segmento => (
//                   <Badge 
//                     key={segmento} 
//                     variant={segmentosSelecionados.includes(segmento) ? "default" : "outline"}
//                     className={`cursor-pointer transition-all ${
//                       segmentosSelecionados.includes(segmento) 
//                         ? "bg-blue-100 text-blue-800 hover:bg-blue-200" 
//                         : "hover:bg-gray-100"
//                     }`}
//                     onClick={() => toggleSegmento(segmento)}
//                   >
//                     <div className="flex items-center">
//                       <Checkbox 
//                         id={`segmento-${segmento}`} 
//                         checked={segmentosSelecionados.includes(segmento)}
//                         className="mr-1 h-3 w-3"
//                         onCheckedChange={() => toggleSegmento(segmento)}
//                       />
//                       <Label htmlFor={`segmento-${segmento}`} className="text-sm cursor-pointer">
//                         {segmento}
//                       </Label>
//                     </div>
//                   </Badge>
//                 ))}
//               </div>
//             </div>
//           )}
          
//           <div className="h-80 mt-2">
//             {dados && dados.length > 0 ? (
//               renderGrafico()
//             ) : (
//               <div className="flex items-center justify-center h-full">
//                 <div className="text-center">
//                   <AlertCircle className="mx-auto h-8 w-8 mb-2 text-amber-500" />
//                   <p className="text-gray-500">Carregando dados...</p>
//                 </div>
//               </div>
//             )}
//           </div>
          
//           <div className="text-sm text-center text-gray-500 mt-2">
//             {tipoVisualizacao === "clientes" 
//               ? "Evolução da aquisição de novos clientes ao longo do tempo" 
//               : "Evolução do valor total de vendas ao longo do tempo"}
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// export default ComparacaoMensal;