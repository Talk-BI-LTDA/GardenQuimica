// src/lib/filter-helpers.ts
export type DateRangeFilter = {
    dataInicio?: string;
    dataFim?: string;
  };
  
  export function applyDateRangeFilter(where: Record<string, unknown>, filter?: DateRangeFilter) {
    if (filter?.dataInicio && filter?.dataFim) {
      where.createdAt = {
        gte: new Date(filter.dataInicio),
        lte: new Date(filter.dataFim)
      };
    }
    return where;
  }
  
  export function applySearchFilter(
    where: Record<string, unknown>, 
    searchTerm?: string,
    fields: Array<{field: string, mode?: string}> = []
  ) {
    if (searchTerm && fields.length > 0) {
      where.OR = fields.map(({ field, mode = 'insensitive' }) => ({
        [field]: { contains: searchTerm, mode }
      }));
    }
    return where;
  }