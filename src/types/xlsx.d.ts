/* eslint-disable @typescript-eslint/no-empty-object-type */
// src/types/xlsx.d.ts
declare module 'xlsx' {
    export interface WorkSheet {}
    export interface WorkBook {
      SheetNames: string[];
      Sheets: { [sheet: string]: WorkSheet };
    }
    
    export const utils: {
      sheet_to_csv(ws: WorkSheet, options?: { FS?: string }): string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json_to_sheet(data: any[], options?: any): WorkSheet;
      book_new(): WorkBook;
      book_append_sheet(wb: WorkBook, ws: WorkSheet, name?: string): void;
    }
    
    export function write(wb: WorkBook, options: { bookType: string; type: string }): string;
  } 