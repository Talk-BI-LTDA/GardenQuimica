// // src/components/dashboard/mapa-vendas-regiao/MapaVendasRegiao.tsx
// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import * as echarts from 'echarts';
// import { motion } from 'framer-motion';

// // Importações de componentes e ações da aplicação
// import { 
//   getEstatisticasPorRegiao, 
//   getEstatisticasRegiaoDetalhadas,
//   type EstatisticasRegiao,
//   type EstatisticasRegiaoDetalhadas,
//   type FiltrosPeriodo 
// } from '@/actions/estatisticas-regiao-actions';

// import { DetalheEstadoModal } from './DetalheEstadoModal';

// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import { Calendar } from '@/components/ui/calendar';
// import { DateRange } from 'react-day-picker';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { formatarValorBRL } from '@/lib/utils';

// // Mapeamento de nomes de estados para suas siglas
// const ESTADOS_SIGLAS: Record<string, string> = {
//   'Acre': 'AC',
//   'Alagoas': 'AL',
//   'Amapá': 'AP',
//   'Amazonas': 'AM',
//   'Bahia': 'BA',
//   'Ceará': 'CE',
//   'Distrito Federal': 'DF',
//   'Espírito Santo': 'ES',
//   'Goiás': 'GO',
//   'Maranhão': 'MA',
//   'Mato Grosso': 'MT',
//   'Mato Grosso do Sul': 'MS',
//   'Minas Gerais': 'MG',
//   'Pará': 'PA',
//   'Paraíba': 'PB',
//   'Paraná': 'PR',
//   'Pernambuco': 'PE',
//   'Piauí': 'PI',
//   'Rio de Janeiro': 'RJ',
//   'Rio Grande do Norte': 'RN',
//   'Rio Grande do Sul': 'RS',
//   'Rondônia': 'RO',
//   'Roraima': 'RR',
//   'Santa Catarina': 'SC',
//   'São Paulo': 'SP',
//   'Sergipe': 'SE',
//   'Tocantins': 'TO'
// };

// // Siglas reverso para buscar nome pelo UF
// const SIGLAS_ESTADOS: Record<string, string> = Object.entries(ESTADOS_SIGLAS).reduce((acc, [nome, sigla]) => {
//   acc[sigla] = nome;
//   return acc;
// }, {} as Record<string, string>);

// // Cores para o mapa
// const CORES = {
//   default: '#e0e0e0',
//   hover: '#97C31D',
//   selected: '#00446A',
//   gradient: ['#e0e0e0', '#d0f0c0', '#97C31D', '#60A830', '#008080', '#00446A'],
//   bar: {
//     primeiro: '#00446A',
//     segundo: '#0373A3',
//     terceiro: '#0694D6',
//     top10: '#60A830',
//     outros: '#97C31D'
//   }
// };

// // GeoJSON fallback simples para caso o arquivo local não carregue
// const BRASIL_GEO_JSON_FALLBACK = {
//   "type": "FeatureCollection",
//   "features": [
//     {"type":"Feature","properties":{"name":"São Paulo"},"geometry":{"type":"Polygon","coordinates":[[[-53.1,-19.8],[-48.1,-20.3],[-47.3,-24.0],[-48.2,-25.3],[-50.2,-25.0],[-52.2,-22.8],[-53.1,-19.8]]]}},
//     {"type":"Feature","properties":{"name":"Rio de Janeiro"},"geometry":{"type":"Polygon","coordinates":[[[-44.9,-22.0],[-41.9,-22.4],[-41.0,-23.1],[-44.2,-23.4],[-44.9,-22.0]]]}},
//     {"type":"Feature","properties":{"name":"Minas Gerais"},"geometry":{"type":"Polygon","coordinates":[[[-51.0,-14.5],[-42.5,-14.1],[-40.9,-18.2],[-42.0,-22.1],[-46.5,-22.7],[-47.2,-20.8],[-49.5,-18.9],[-51.0,-14.5]]]}},
//     {"type":"Feature","properties":{"name":"Bahia"},"geometry":{"type":"Polygon","coordinates":[[[-46.6,-15.3],[-39.1,-11.6],[-37.3,-10.5],[-38.0,-8.3],[-39.7,-7.0],[-42.8,-11.2],[-46.6,-15.3]]]}},
//     {"type":"Feature","properties":{"name":"Rio Grande do Sul"},"geometry":{"type":"Polygon","coordinates":[[[-57.6,-27.0],[-57.5,-30.6],[-55.7,-31.0],[-53.5,-33.7],[-49.7,-29.4],[-51.4,-27.2],[-57.6,-27.0]]]}},
//     {"type":"Feature","properties":{"name":"Paraná"},"geometry":{"type":"Polygon","coordinates":[[[-53.1,-23.9],[-54.6,-25.5],[-48.1,-25.7],[-47.9,-24.7],[-52.7,-24.1],[-53.1,-23.9]]]}},
//     {"type":"Feature","properties":{"name":"Goiás"},"geometry":{"type":"Polygon","coordinates":[[[-53.1,-15.3],[-47.3,-10.9],[-45.9,-12.5],[-46.9,-14.9],[-49.6,-17.6],[-52.9,-17.3],[-53.1,-15.3]]]}},
//     {"type":"Feature","properties":{"name":"Amazonas"},"geometry":{"type":"Polygon","coordinates":[[[-69.6,-2.1],[-59.2,-2.4],[-56.1,-2.5],[-58.9,-7.5],[-67.4,-10.3],[-73.8,-9.4],[-69.6,-2.1]]]}},
//     {"type":"Feature","properties":{"name":"Pará"},"geometry":{"type":"Polygon","coordinates":[[[-58.9,-1.7],[-51.2,-1.8],[-47.0,-0.7],[-48.5,-5.2],[-49.0,-7.3],[-58.2,-7.1],[-58.9,-1.7]]]}},
//     {"type":"Feature","properties":{"name":"Ceará"},"geometry":{"type":"Polygon","coordinates":[[[-41.4,-2.8],[-38.5,-3.0],[-38.2,-4.3],[-39.7,-7.0],[-40.5,-3.8],[-41.4,-2.8]]]}},
//     {"type":"Feature","properties":{"name":"Pernambuco"},"geometry":{"type":"Polygon","coordinates":[[[-41.4,-9.1],[-35.1,-8.8],[-34.9,-7.5],[-41.4,-8.9],[-41.4,-9.1]]]}},
//   ]
// };

// interface PositionTooltip {
//   x: number;
//   y: number;
// }

// interface MapDataItem {
//   name: string;
//   value: number;
//   uf: string;
//   itemStyle?: {
//     areaColor?: string;
//   };
// }

// interface BarDataItem {
//   name: string;
//   value: number;
//   uf: string;
//   itemStyle: {
//     color: string;
//   };
// }

// // Tipos para ECharts tooltips
// interface TooltipParams {
//   seriesType?: string;
//   name?: string;
//   value?: number;
//   data?: MapDataItem | BarDataItem;
// }

// // Tipos para ECharts formatters
// interface FormatterParams {
//   name?: string;
//   value?: number;
// }

// // Utilitário para pegar top N de um array (substituindo lodash.take)
// function takeItems<T>(array: T[], count: number): T[] {
//   return array.slice(0, count);
// }

// // Utilitário para debounce (substituindo lodash.debounce)
// function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
//   func: T,
//   wait: number
// ): (...args: Parameters<T>) => void {
//   let timeout: NodeJS.Timeout;
//   return (...args: Parameters<T>) => {
//     clearTimeout(timeout);
//     timeout = setTimeout(() => func(...args), wait);
//   };
// }

// // Componente de Mapa com Morphing
// const MapaVendasMorphing: React.FC = () => {
//   // Estados
//   const [regioes, setRegioes] = useState<EstatisticasRegiao[]>([]);
//   const [estadoHover, setEstadoHover] = useState<string | null>(null);
//   const [posicaoTooltip, setPosicaoTooltip] = useState<PositionTooltip>({ x: 0, y: 0 });
//   const [estadoSelecionado, setEstadoSelecionado] = useState<string | null>(null);
//   const [detalhesRegiao, setDetalhesRegiao] = useState<EstatisticasRegiaoDetalhadas | null>(null);
//   const [modalDetalheAberto, setModalDetalheAberto] = useState(false);
//   const [loadingDetalhes, setLoadingDetalhes] = useState(false);
//   const [loadingMapa, setLoadingMapa] = useState(true);
//   const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
//   const [datePickerOpen, setDatePickerOpen] = useState(false);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [destaqueEstado, setDestaqueEstado] = useState<string | null>(null);
//   const [viewType, setViewType] = useState<'map' | 'bar'>('map');
//   const [mapaCarregado, setMapaCarregado] = useState(false);
  
//   // Refs
//   const chartContainerRef = useRef<HTMLDivElement>(null);
//   const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  
//   // Registrar o mapa GeoJSON
//   useEffect(() => {
//     const loadGeoJSON = async () => {
//       try {
//         console.log('Tentando carregar GeoJSON...');
        
//         // Primeiro tenta carregar arquivo da pasta public
//         let geoData;
//         try {
//           console.log('Tentando carregar de /brasil-estados.json...');
//           const response = await fetch('/brasil-estados.json');
//           if (response.ok) {
//             geoData = await response.json();
//             console.log('GeoJSON da pasta public carregado com sucesso');
//           } else {
//             throw new Error('Arquivo na pasta public não encontrado');
//           }
//         } catch (error) {
//           console.warn('Erro ao carregar da pasta public, usando fallback:', error);
//           geoData = BRASIL_GEO_JSON_FALLBACK;
//         }
        
//         // Registra no ECharts com cast para evitar erro de tipagem
//         echarts.registerMap('brasil', geoData as any);
//         setMapaCarregado(true);
//         console.log('GeoJSON registrado no ECharts com sucesso');
//         console.log('Dados do mapa:', geoData);
//       } catch (error) {
//         console.error('Erro ao registrar GeoJSON:', error);
//         // Como último recurso, usar fallback
//         echarts.registerMap('brasil', BRASIL_GEO_JSON_FALLBACK as any);
//         setMapaCarregado(true);
//       }
//     };
    
//     loadGeoJSON();
//   }, []);

//   // Função para buscar dados
//   const buscarDados = useCallback(async () => {
//     setLoadingMapa(true);
    
//     try {
//       const filtros: FiltrosPeriodo = {};
      
//       if (dateRange?.from && dateRange?.to) {
//         filtros.dataInicio = dateRange.from;
//         filtros.dataFim = dateRange.to;
//       }
      
//       const resultado = await getEstatisticasPorRegiao(filtros);
      
//       if (resultado.success && resultado.regioes) {
//         setRegioes(resultado.regioes);
//         console.log('Dados das regiões carregados:', resultado.regioes);
//       } else {
//         console.error(resultado.error || 'Erro ao buscar dados das regiões');
//         // Implementar toast de erro se necessário
//       }
//     } catch (error) {
//       console.error('Erro ao buscar dados do mapa:', error);
//       // Implementar toast de erro se necessário
//     } finally {
//       setLoadingMapa(false);
//     }
//   }, [dateRange]);

//   // Buscar dados na montagem do componente
//   useEffect(() => {
//     buscarDados();
//   }, [buscarDados]);

//   // Buscar detalhes de uma região ao clicar
//   const buscarDetalhesRegiao = useCallback(async (uf: string) => {
//     setLoadingDetalhes(true);
//     setEstadoSelecionado(uf);
    
//     try {
//       const filtros: FiltrosPeriodo = {};
      
//       if (dateRange?.from && dateRange?.to) {
//         filtros.dataInicio = dateRange.from;
//         filtros.dataFim = dateRange.to;
//       }
      
//       const resultado = await getEstatisticasRegiaoDetalhadas(uf, filtros);
      
//       if (resultado.success && resultado.estatisticas) {
//         setDetalhesRegiao(resultado.estatisticas);
//         setModalDetalheAberto(true);
//       } else {
//         console.error(resultado.error || 'Erro ao buscar detalhes da região');
//         // Implementar toast de erro se necessário
//       }
//     } catch (error) {
//       console.error('Erro ao buscar detalhes da região:', error);
//       // Implementar toast de erro se necessário
//     } finally {
//       setLoadingDetalhes(false);
//     }
//   }, [dateRange]);

//   // Função para atualizar o gráfico
//   const updateChart = useCallback(() => {
//     if (!chartInstanceRef.current || !mapaCarregado) {
//       console.log('Chart instance ou mapa não carregado ainda');
//       return;
//     }
    
//     console.log('Atualizando gráfico...');
    
//     // Preparar dados para o mapa
//     const mapData: MapDataItem[] = Object.keys(ESTADOS_SIGLAS).map(estado => {
//       const uf = ESTADOS_SIGLAS[estado];
//       const dadosEstado = regioes.find(r => r.uf === uf);
      
//       return {
//         name: estado,
//         value: dadosEstado ? dadosEstado.valorTotalVendas : 0,
//         uf: uf,
//         itemStyle: {
//           areaColor: destaqueEstado === uf ? CORES.hover : undefined
//         }
//       };
//     });
    
//     // Preparar dados para o gráfico de barras (apenas os top 15)
//     const barData: BarDataItem[] = takeItems(
//       regioes.map(r => ({
//         name: r.nomeEstado,
//         value: r.valorTotalVendas,
//         uf: r.uf,
//         itemStyle: {
//           color: 
//             r.posicaoRanking === 1 ? CORES.bar.primeiro :
//             r.posicaoRanking === 2 ? CORES.bar.segundo :
//             r.posicaoRanking === 3 ? CORES.bar.terceiro :
//             r.posicaoRanking <= 10 ? CORES.bar.top10 :
//             CORES.bar.outros
//         }
//       })),
//       15
//     );
    
//     // Valor máximo para a escala de cores
//     const maxValue = Math.max(...regioes.map(estado => estado.valorTotalVendas), 1);
    
//     // Configurar a opção do gráfico - usar cast para evitar conflitos de tipagem
//     const option = {
//       timeline: {
//         axisType: 'category',
//         show: false,
//         autoPlay: false,
//         playInterval: 1000,
//         data: ['map', 'bar'],
//         currentIndex: viewType === 'map' ? 0 : 1
//       },
//       title: {
//         text: 'Vendas por Estado',
//         subtext: viewType === 'map' ? 'Visualização Geográfica' : 'Ranking dos 15 Maiores',
//         left: 'center'
//       },
//       tooltip: {
//         trigger: 'item',
//         formatter: function(params: TooltipParams) {
//           console.log('Tooltip params:', params);
          
//           if (params.seriesType === 'map') {
//             const uf = ESTADOS_SIGLAS[params.name as string];
//             const dadosEstado = regioes.find(r => r.uf === uf);
            
//             if (!dadosEstado) return `${params.name}: Sem dados`;
            
//             return `
//               <div style="padding:10px">
//                 <div style="font-weight:bold;margin-bottom:8px;font-size:16px;">
//                   ${params.name} (${uf})
//                 </div>
//                 <div style="display:flex;justify-content:space-between;margin:4px 0;">
//                   <span>Total de Vendas:</span>
//                   <span style="font-weight:bold;color:#00446A;">${formatarValorBRL(dadosEstado.valorTotalVendas)}</span>
//                 </div>
//                 <div style="display:flex;justify-content:space-between;margin:4px 0;">
//                   <span>Quantidade:</span>
//                   <span style="font-weight:bold;">${dadosEstado.totalVendas}</span>
//                 </div>
//                 <div style="display:flex;justify-content:space-between;margin:4px 0;">
//                   <span>Vendedores:</span>
//                   <span style="font-weight:bold;">${dadosEstado.totalVendedores}</span>
//                 </div>
//                 <div style="display:flex;justify-content:space-between;margin:4px 0;">
//                   <span>Ranking:</span>
//                   <span style="font-weight:bold;color:${
//                     dadosEstado.posicaoRanking <= 3 ? '#FF6600' : 
//                     dadosEstado.posicaoRanking <= 10 ? '#60A830' : 
//                     '#666'
//                   };">${dadosEstado.posicaoRanking}º</span>
//                 </div>
//               </div>
//             `;
//           } else if (params.seriesType === 'bar') {
//             const data = params.data as BarDataItem;
//             const uf = data?.uf;
//             const dadosEstado = regioes.find(r => r.uf === uf);
            
//             if (!dadosEstado) return `${params.name}: ${formatarValorBRL(params.value || 0)}`;
            
//             return `
//               <div style="padding:10px">
//                 <div style="font-weight:bold;margin-bottom:8px;font-size:16px;">
//                   ${dadosEstado.nomeEstado} (${uf})
//                 </div>
//                 <div style="display:flex;justify-content:space-between;margin:4px 0;">
//                   <span>Total de Vendas:</span>
//                   <span style="font-weight:bold;color:#00446A;">${formatarValorBRL(dadosEstado.valorTotalVendas)}</span>
//                 </div>
//                 <div style="display:flex;justify-content:space-between;margin:4px 0;">
//                   <span>Ranking:</span>
//                   <span style="font-weight:bold;color:${
//                     dadosEstado.posicaoRanking <= 3 ? '#FF6600' : 
//                     dadosEstado.posicaoRanking <= 10 ? '#60A830' : 
//                     '#666'
//                   };">${dadosEstado.posicaoRanking}º</span>
//                 </div>
//               </div>
//             `;
//           }
//           return '';
//         }
//       },
//       options: [
//         // Opção 1: Mapa
//         {
//           visualMap: regioes.length > 0 ? {
//             type: 'continuous',
//             left: 'right',
//             min: 0,
//             max: maxValue,
//             text: ['Alto', 'Baixo'],
//             inRange: {
//               color: CORES.gradient
//             },
//             calculable: true
//           } : undefined,
//           series: [
//             {
//               type: 'map',
//               map: 'brasil',
//               name: 'Vendas por Estado',
//               roam: true,
//               zoom: 1.2,
//               selectedMode: false,
//               label: {
//                 show: true,
//                 formatter: (params: FormatterParams) => {
//                   const uf = ESTADOS_SIGLAS[params.name as string];
//                   return uf || '';
//                 }
//               },
//               data: mapData,
//               emphasis: {
//                 label: {
//                   color: '#000',
//                   fontWeight: 'bold'
//                 },
//                 itemStyle: {
//                   areaColor: CORES.hover
//                 }
//               },
//               // Estilo padrão para mostrar o mapa mesmo sem dados
//               itemStyle: {
//                 areaColor: CORES.default,
//                 borderColor: '#fff',
//                 borderWidth: 1
//               }
//             }
//           ],
//           animationDuration: 1000,
//           animationEasingUpdate: 'cubicInOut'
//         },
//         // Opção 2: Gráfico de barras
//         {
//           grid: {
//             left: '5%',
//             right: '15%',
//             bottom: '10%',
//             top: '15%',
//             containLabel: true
//           },
//           xAxis: {
//             type: 'value',
//             name: 'Valor Total de Vendas',
//             nameLocation: 'middle',
//             nameGap: 30,
//             axisLabel: {
//               formatter: function(value: number) {
//                 return formatarValorBRL(value).replace(/[^0-9,.]/g, '');
//               }
//             }
//           },
//           yAxis: {
//             type: 'category',
//             data: barData.map(item => item.name),
//             axisLabel: {
//               formatter: function(value: string) {
//                 const estado = regioes.find(r => r.nomeEstado === value);
//                 return `${value} (${estado?.uf || ''})`;
//               }
//             }
//           },
//           series: [
//             {
//               name: 'Vendas por Estado',
//               type: 'bar',
//               data: barData,
//               label: {
//                 show: true,
//                 position: 'right',
//                 formatter: function(params: FormatterParams) {
//                   return formatarValorBRL(params.value || 0);
//                 }
//               },
//               itemStyle: {
//                 borderRadius: [0, 4, 4, 0]
//               }
//             }
//           ],
//           animationDuration: 1000,
//           animationEasingUpdate: 'cubicInOut'
//         }
//       ]
//     };
    
//     // Aplicar a opção ao gráfico
//     chartInstanceRef.current.setOption(option, true);
//     console.log('Gráfico atualizado com sucesso');
//   }, [regioes, viewType, destaqueEstado, mapaCarregado]);

//   // Inicializar e atualizar o gráfico
//   useEffect(() => {
//     if (chartContainerRef.current && !chartInstanceRef.current) {
//       console.log('Inicializando chart instance...');
//       // Criar a instância do gráfico
//       chartInstanceRef.current = echarts.init(chartContainerRef.current);
      
//       // Configurar eventos - usando tipagem flexível para compatibilidade
//       chartInstanceRef.current.on('mouseover', (params: echarts.ECElementEvent) => {
//         if (params.seriesType === 'map' && params.name) {
//           const uf = ESTADOS_SIGLAS[params.name as string];
//           if (uf) {
//             setEstadoHover(uf);
//             setPosicaoTooltip({ 
//               x: params.event?.offsetX || 0, 
//               y: params.event?.offsetY || 0 
//             });
//           }
//         }
//       });
      
//       chartInstanceRef.current.on('mouseout', () => {
//         setEstadoHover(null);
//       });
      
//       chartInstanceRef.current.on('click', (params: echarts.ECElementEvent) => {
//         if (params.seriesType === 'map' && params.name) {
//           const uf = ESTADOS_SIGLAS[params.name as string];
//           if (uf) {
//             buscarDetalhesRegiao(uf);
//           }
//         }
//       });
      
//       // Ajustar o tamanho do gráfico quando a janela for redimensionada
//       const handleResize = debounce(() => {
//         if (chartInstanceRef.current) {
//           chartInstanceRef.current.resize();
//         }
//       }, 300);
      
//       window.addEventListener('resize', handleResize);
      
//       console.log('Chart instance criada com sucesso');
      
//       // Limpar evento ao desmontar o componente
//       return () => {
//         window.removeEventListener('resize', handleResize);
//         if (chartInstanceRef.current) {
//           chartInstanceRef.current.dispose();
//           chartInstanceRef.current = null;
//         }
//       };
//     }
    
//     // Atualizar o gráfico sempre que os dados ou o mapa mudarem
//     if (chartInstanceRef.current && mapaCarregado) {
//       console.log('Atualizando gráfico - Regiões:', regioes.length);
//       updateChart();
//     }
//   }, [regioes, viewType, destaqueEstado, buscarDetalhesRegiao, updateChart, mapaCarregado]);

//   // Efeito para pesquisa de estado
//   useEffect(() => {
//     if (searchTerm) {
//       const termLower = searchTerm.toLowerCase();
      
//       // Buscar por UF ou nome do estado
//       const ufMatch = Object.entries(ESTADOS_SIGLAS).find(
//         ([nome, uf]) => 
//           uf.toLowerCase() === termLower || 
//           nome.toLowerCase().includes(termLower)
//       );
      
//       if (ufMatch) {
//         setDestaqueEstado(ufMatch[1]);
//       } else {
//         setDestaqueEstado(null);
//       }
//     } else {
//       setDestaqueEstado(null);
//     }
//   }, [searchTerm]);
  
//   // Alternar entre visualizações
//   const toggleViewType = useCallback(() => {
//     setViewType(prev => prev === 'map' ? 'bar' : 'map');
//   }, []);
  
//   // Encontrar detalhes do estado atual em hover
//   const estadoHoverDetalhes = estadoHover 
//     ? regioes.find(r => r.uf === estadoHover) 
//     : null;
  
//   // Formatar período selecionado para exibição
//   const formatarPeriodoSelecionado = useCallback(() => {
//     if (!dateRange?.from) return "Todo período";

//     if (dateRange.to) {
//       const from = new Intl.DateTimeFormat('pt-BR').format(dateRange.from);
//       const to = new Intl.DateTimeFormat('pt-BR').format(dateRange.to);
//       return `${from} - ${to}`;
//     }

//     return new Intl.DateTimeFormat('pt-BR').format(dateRange.from);
//   }, [dateRange]);
  
//   // Função para aplicar período
//   const aplicarPeriodo = useCallback((from?: Date, to?: Date) => {
//     if (from && to) {
//       setDateRange({ from, to });
//     } else {
//       setDateRange(undefined);
//     }
    
//     setDatePickerOpen(false);
//     // Após um breve delay para fechar o popover, buscar os dados
//     setTimeout(() => {
//       buscarDados();
//     }, 100);
//   }, [buscarDados]);
  
//   return (
//     <Card className="shadow-md">
//       <CardHeader className="pb-0">
//         <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
//           <CardTitle>Mapa de Vendas por Região</CardTitle>
          
//           <div className="flex flex-wrap items-center gap-2">
//             <div className="relative">
//               <svg 
//                 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
//                 viewBox="0 0 24 24" 
//                 fill="none" 
//                 stroke="currentColor" 
//                 strokeWidth="2"
//                 strokeLinecap="round" 
//                 strokeLinejoin="round"
//               >
//                 <circle cx="11" cy="11" r="8" />
//                 <line x1="21" y1="21" x2="16.65" y2="16.65" />
//               </svg>
//               <Input
//                 type="text"
//                 placeholder="Buscar estado..."
//                 className="pl-9 h-10 rounded-md border border-gray-300 bg-white px-3 text-sm w-full md:w-60"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
            
//             <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
//               <PopoverTrigger asChild>
//                 <Button variant="outline" className="h-10">
//                   <svg 
//                     className="mr-2 h-4 w-4" 
//                     viewBox="0 0 24 24" 
//                     fill="none" 
//                     stroke="currentColor"
//                     strokeWidth="2" 
//                     strokeLinecap="round" 
//                     strokeLinejoin="round"
//                   >
//                     <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
//                     <line x1="16" y1="2" x2="16" y2="6" />
//                     <line x1="8" y1="2" x2="8" y2="6" />
//                     <line x1="3" y1="10" x2="21" y2="10" />
//                   </svg>
//                   {dateRange?.from ? formatarPeriodoSelecionado() : "Todo período"}
//                 </Button>
//               </PopoverTrigger>
//               <PopoverContent className="w-auto p-0" align="end">
//                 <div className="p-3 border-b">
//                   <div className="space-y-2">
//                     <h4 className="font-medium">Períodos predefinidos</h4>
//                     <div className="grid grid-cols-2 gap-2">
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         className="text-xs"
//                         onClick={() => {
//                           const today = new Date();
//                           const lastMonth = new Date();
//                           lastMonth.setMonth(lastMonth.getMonth() - 1);
//                           aplicarPeriodo(lastMonth, today);
//                         }}
//                       >
//                         Último mês
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         className="text-xs"
//                         onClick={() => {
//                           const today = new Date();
//                           const lastThreeMonths = new Date();
//                           lastThreeMonths.setMonth(lastThreeMonths.getMonth() - 3);
//                           aplicarPeriodo(lastThreeMonths, today);
//                         }}
//                       >
//                         Últimos 3 meses
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         className="text-xs"
//                         onClick={() => {
//                           const today = new Date();
//                           const lastSixMonths = new Date();
//                           lastSixMonths.setMonth(lastSixMonths.getMonth() - 6);
//                           aplicarPeriodo(lastSixMonths, today);
//                         }}
//                       >
//                         Últimos 6 meses
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         className="text-xs"
//                         onClick={() => {
//                           const today = new Date();
//                           const lastYear = new Date();
//                           lastYear.setFullYear(lastYear.getFullYear() - 1);
//                           aplicarPeriodo(lastYear, today);
//                         }}
//                       >
//                         Último ano
//                       </Button>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         className="text-xs col-span-2"
//                         onClick={() => aplicarPeriodo()}
//                       >
//                         Todo período
//                       </Button>
//                     </div>
//                   </div>
//                 </div>
                
//                 <Calendar
//                   mode="range"
//                   defaultMonth={dateRange?.from}
//                   selected={dateRange}
//                   onSelect={(range) => {
//                     setDateRange(range);
//                   }}
//                   numberOfMonths={2}
//                 />
                
//                 <div className="p-3 border-t flex justify-end gap-2">
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={() => {
//                       setDateRange(undefined);
//                       setDatePickerOpen(false);
//                       buscarDados();
//                     }}
//                   >
//                     Limpar
//                   </Button>
//                   <Button
//                     size="sm"
//                     className="bg-[#00446A] text-white hover:bg-[#00446A]/90"
//                     onClick={() => {
//                       setDatePickerOpen(false);
//                       buscarDados();
//                     }}
//                   >
//                     Aplicar
//                   </Button>
//                 </div>
//               </PopoverContent>
//             </Popover>
            
//             <Button 
//               onClick={toggleViewType} 
//               className="h-10 bg-[#00446A] text-white hover:bg-[#00446A]/90"
//             >
//               <svg 
//                 className="mr-2 h-4 w-4" 
//                 viewBox="0 0 24 24" 
//                 fill="none" 
//                 stroke="currentColor"
//                 strokeWidth="2" 
//                 strokeLinecap="round" 
//                 strokeLinejoin="round"
//               >
//                 <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
//               </svg>
//               {viewType === 'map' ? 'Ver Ranking' : 'Ver Mapa'}
//             </Button>
//           </div>
//         </div>
        
//         <Tabs value={viewType} className="mt-4">
//           <TabsList>
//             <TabsTrigger 
//               value="map" 
//               onClick={() => setViewType('map')}
//               className={viewType === 'map' ? 'bg-[#00446A] text-white' : ''}
//             >
//               Mapa
//             </TabsTrigger>
//             <TabsTrigger 
//               value="bar" 
//               onClick={() => setViewType('bar')}
//               className={viewType === 'bar' ? 'bg-[#00446A] text-white' : ''}
//             >
//               Ranking
//             </TabsTrigger>
//           </TabsList>
//         </Tabs>
//       </CardHeader>
      
//       <CardContent className="pt-4 relative">
//         {/* Debug info */}
//         {process.env.NODE_ENV === 'development' && (
//           <div className="absolute top-2 left-2 z-50 bg-yellow-100 p-2 rounded text-xs">
//             <div>Mapa Carregado: {mapaCarregado ? '✅' : '❌'}</div>
//             <div>Chart Instance: {chartInstanceRef.current ? '✅' : '❌'}</div>
//             <div>Regiões: {regioes.length}</div>
//             <div>Loading: {loadingMapa ? '🔄' : '✅'}</div>
//           </div>
//         )}
        
//         {/* Indicador de carregamento do mapa */}
//         {loadingMapa && (
//           <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
//             <div className="flex flex-col items-center">
//               <div className="w-12 h-12 border-4 border-[#00446A] border-t-transparent rounded-full animate-spin"></div>
//               <p className="mt-4 text-gray-600">Carregando visualização...</p>
//             </div>
//           </div>
//         )}
        
//         {/* Indicador de carregamento de detalhes */}
//         {loadingDetalhes && (
//           <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
//             <div className="text-center">
//               <div className="w-12 h-12 border-4 border-[#00446A] border-t-transparent rounded-full animate-spin mx-auto"></div>
//               <p className="mt-4">Carregando detalhes de {estadoSelecionado ? SIGLAS_ESTADOS[estadoSelecionado] : ''}...</p>
//             </div>
//           </div>
//         )}
        
//         {/* Contêiner do gráfico */}
//         <div className="relative h-[500px]">
//           <div 
//             ref={chartContainerRef} 
//             className="w-full h-full"
//             style={{ minHeight: '500px' }}
//           ></div>
          
//           {/* Tooltip customizado para hover no estado */}
//           {estadoHover && estadoHoverDetalhes && viewType === 'map' && (
//             <motion.div 
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -10 }}
//               transition={{ duration: 0.2 }}
//               className="absolute p-4 bg-white rounded-lg shadow-lg z-50 w-80"
//               style={{ 
//                 left: `${posicaoTooltip.x + 15}px`, 
//                 top: `${posicaoTooltip.y - 20}px`,
//                 pointerEvents: 'none'
//               }}
//             >
//               <div className="flex justify-between items-start mb-2">
//                 <div>
//                   <h3 className="font-medium text-lg">{estadoHoverDetalhes.nomeEstado}</h3>
//                   <p className="text-sm text-gray-500">Posição no ranking: {estadoHoverDetalhes.posicaoRanking}º</p>
//                 </div>
//                 <Badge className={`${estadoHoverDetalhes.posicaoRanking <= 3 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
//                   {estadoHoverDetalhes.uf}
//                 </Badge>
//               </div>
              
//               <div className="grid grid-cols-2 gap-2 mb-3">
//                 <div>
//                   <p className="text-xs text-gray-500">Total de Vendedores</p>
//                   <p className="font-medium">{estadoHoverDetalhes.totalVendedores}</p>
//                 </div>
                
//                 <div>
//                   <p className="text-xs text-gray-500">Valor Total</p>
//                   <p className="font-medium">{formatarValorBRL(estadoHoverDetalhes.valorTotalVendas)}</p>
//                 </div>
                
//                 <div>
//                   <p className="text-xs text-gray-500">Total de Vendas</p>
//                   <p className="font-medium">{estadoHoverDetalhes.totalVendas}</p>
//                 </div>
                
//                 <div>
//                   <p className="text-xs text-gray-500">Vendas Canceladas</p>
//                   <p className="font-medium">{estadoHoverDetalhes.totalNaoVendas}</p>
//                 </div>
//               </div>
              
//               <div className="border-t pt-2">
//                 <div className="mb-1">
//                   <p className="text-xs text-gray-500">Segmento Principal</p>
//                   <p className="font-medium truncate">{estadoHoverDetalhes.segmentoMaisFrequente || "Não disponível"}</p>
//                 </div>
                
//                 <div>
//                   <p className="text-xs text-gray-500">Produto Principal</p>
//                   <p className="font-medium truncate">{estadoHoverDetalhes.produtoMaisFrequente || "Não disponível"}</p>
//                 </div>
//               </div>
//             </motion.div>
//           )}
//         </div>
        
//         <div className="flex justify-center mt-4">
//           <div className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-md">
//             <span className="text-sm text-gray-600 mr-1">
//               {viewType === 'map' ? 'Visualização de Mapa' : 'Visualização de Ranking'}
//             </span>
//             <Badge className={`ml-2 ${viewType === 'map' ? 'bg-[#00446A]' : 'bg-[#97C31D]'}`}>
//               {viewType === 'map' ? 'Geográfico' : 'Por Valor'}
//             </Badge>
//           </div>
//         </div>
//       </CardContent>
      
//       {/* Modal de detalhes do estado */}
//       {detalhesRegiao && (
//         <Dialog open={modalDetalheAberto} onOpenChange={setModalDetalheAberto}>
//           <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
//             <DialogHeader className="px-6 pt-6 pb-2">
//               <DialogTitle className="text-xl flex items-center">
//                 <Badge className="mr-2 bg-[#00446A] text-white">{detalhesRegiao.uf}</Badge>
//                 Detalhes de {detalhesRegiao.nomeEstado}
//               </DialogTitle>
//             </DialogHeader>
            
//             <div className="max-h-[calc(90vh-80px)] overflow-auto p-6">
//               <DetalheEstadoModal 
//                 estatisticas={detalhesRegiao} 
//                 onClose={() => setModalDetalheAberto(false)}
//               />
//             </div>
//           </DialogContent>
//         </Dialog>
//       )}
//     </Card>
//   );
// };

// export default MapaVendasMorphing;