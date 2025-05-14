// src/lib/db-helpers.ts/**
// Define tipos genéricos para os modelos do Prisma
type PrismaModel<T> = {
  findMany: (args: unknown) => Promise<T[]>;
  findUnique: (args: unknown) => Promise<T | null>;
  create: (args: unknown) => Promise<T>;
  update: (args: unknown) => Promise<T>;
  delete: (args: unknown) => Promise<T>;
  count: (args: unknown) => Promise<number>;
  aggregate: (args: unknown) => Promise<unknown>;
};
// Função para buscar múltiplos registros
export async function findMany<
  T,
  M extends PrismaModel<T>
>(
  model: M,
  args: Parameters<M['findMany']>[0]
): Promise<T[]> {
  try {
    return await model.findMany(args);
  } catch (error) {
    console.error(`Erro ao buscar múltiplos registros:`, error);
    return [];
  }
}
// Função para buscar um único registro
export async function findUnique<
  T,
  M extends PrismaModel<T>
>(
  model: M,
  args: Parameters<M['findUnique']>[0]
): Promise<T | null> {
  try {
    return await model.findUnique(args);
  } catch (error) {
    console.error(`Erro ao buscar registro único:`, error);
    return null;
  }
}
// Função para criar um registro
export async function create<
  T,
  M extends PrismaModel<T>
>(
  model: M,
  args: Parameters<M['create']>[0]
): Promise<T | null> {
  try {
    return await model.create(args);
  } catch (error) {
    console.error(`Erro ao criar registro:`, error);
    return null;
  }
}
// Função para atualizar um registro
export async function update<
  T,
  M extends PrismaModel<T>
>(
  model: M,
  args: Parameters<M['update']>[0]
): Promise<T | null> {
  try {
    return await model.update(args);
  } catch (error) {
    console.error(`Erro ao atualizar registro:`, error);
    return null;
  }
}
// Função para excluir um registro
export async function remove<
  T,
  M extends PrismaModel<T>
>(
  model: M,
  args: Parameters<M['delete']>[0]
): Promise<T | null> {
  try {
    return await model.delete(args);
  } catch (error) {
    console.error(`Erro ao excluir registro:`, error);
    return null;
  }
}
// Função para contar registros
export async function count<
  M extends PrismaModel<unknown>
>(
  model: M,
  args: Parameters<M['count']>[0]
): Promise<number> {
  try {
    return await model.count(args);
  } catch (error) {
    console.error(`Erro ao contar registros:`, error);
    return 0;
  }
}
// Função para agregar registros
export async function aggregate<
  T,
  M extends PrismaModel<unknown>
>(
  model: M,
  args: Parameters<M['aggregate']>[0]
): Promise<T> {
  try {
    return (await model.aggregate(args)) as T;
  } catch (error) {
    console.error(`Erro ao agregar registros:`, error);
    return { _sum: { valorTotal: null } } as T;
  }
}