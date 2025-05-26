/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/xlsx-wrapper.ts
import * as XLSX from 'xlsx';

// Re-exporta as funções do XLSX que são usadas no projeto
export const utils = {
  sheet_to_csv: (worksheet: any, options?: { FS?: string }) => {
    return XLSX.utils.sheet_to_csv(worksheet, options);
  },
  
  json_to_sheet: (data: any[], options?: any) => {
    return XLSX.utils.json_to_sheet(data, options);
  },
  
  book_new: () => {
    return XLSX.utils.book_new();
  },
  
  book_append_sheet: (workbook: any, worksheet: any, name?: string) => {
    return XLSX.utils.book_append_sheet(workbook, worksheet, name);
  }
};

export function write(workbook: any, options: { bookType: string; type: string }) {
  return XLSX.write(workbook, options);
}