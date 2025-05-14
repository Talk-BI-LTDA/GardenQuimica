// // src/types/grafico-types.ts
// import { CSSProperties } from "react";

// export interface TooltipPayloadItem {
//   name?: string;
//   value?: number;
//   color?: string;
//   dataKey?: string | number;
//   payload?: Record<string, unknown>;
// }

// export interface CustomTooltipProps {
//   active?: boolean;
//   payload?: TooltipPayloadItem[];
//   label?: string;
//   formatter?: (value: number, name: string) => [string, string];
//   labelFormatter?: (label: string) => string;
//   wrapperStyle?: CSSProperties;
//   contentStyle?: CSSProperties;
//   itemStyle?: CSSProperties;
//   labelStyle?: CSSProperties;
//   cursor?: boolean | object;
// }

// export interface PieChartShapeProps {
//   cx: number;
//   cy: number;
//   innerRadius: number;
//   outerRadius: number;
//   startAngle: number;
//   endAngle: number;
//   fill: string;
//   payload: {
//     name: string;
//     value: number;
//     [key: string]: unknown;
//   };
//   percent: number;
//   value: number;
//   midAngle?: number;
//   name?: string;
//   index?: number;
// }

// // Tipos adicionais para o render ativo do gráfico de pizza
// export type ActiveShapeProps = {
//   cx: number;
//   cy: number;
//   midAngle: number;
//   innerRadius: number;
//   outerRadius: number;
//   startAngle: number;
//   endAngle: number;
//   fill: string;
//   payload: any;
//   percent: number;
//   value: number;
//   index: number;
// };