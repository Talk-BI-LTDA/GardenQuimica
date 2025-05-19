import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Create a new isolated instance
const prisma = new PrismaClient()

async function cleanDatabase() {
  console.log("Limpando o banco de dados...")

  // Deletar registros em ordem para respeitar constraints de chaves estrangeiras
  await prisma.naoVendaProduto.deleteMany()
  await prisma.vendaProduto.deleteMany()
  await prisma.naoVenda.deleteMany()
  await prisma.venda.deleteMany()
  await prisma.produto.deleteMany()
  await prisma.cliente.deleteMany()
  await prisma.passwordReset.deleteMany()
  
  // Limpar tabelas de catálogo
  await prisma.catalogoObjecao.deleteMany()
  await prisma.catalogoPagamento.deleteMany()
  await prisma.catalogoSegmento.deleteMany()
  await prisma.catalogoRecorrencia.deleteMany()
  await prisma.catalogoMedida.deleteMany()
  await prisma.catalogoProduto.deleteMany()
  
  // Limpar tabelas de configuração
  await prisma.recorrencia.deleteMany()
  await prisma.condicaoPagamento.deleteMany()
  await prisma.medida.deleteMany()
  await prisma.segmento.deleteMany()
  
  // Deletar todos os usuários exceto o admin
  // (o admin será recriado se não existir)
  await prisma.user.deleteMany({
    where: {
      email: {
        not: 'manager@talkbi.com'
      }
    }
  })
  
  console.log("Banco de dados limpo com sucesso!")
}

async function main() {
  try {
    console.log("Iniciando o seeding...")
    
    // Limpar o banco de dados primeiro
    await cleanDatabase()
    
    const hashedPassword = await bcrypt.hash('admin123', 10)

    // Check if user already exists to avoid duplicates
    const existingUser = await prisma.user.findUnique({
      where: { email: 'manager@talkbi.com' }
    })

    if (!existingUser) {
      await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'manager@talkbi.com',
          password: hashedPassword,
          cpf: '00000000000',
          role: Role.ADMIN,
        },
      })
      console.log("Usuário admin criado com sucesso!")
    } else {
      console.log("Usuário admin já existe, mantendo o usuário existente.")
    }
    
    console.log("Seed concluído com sucesso!")
  } catch (error) {
    console.error("Erro durante o seed:", error)
    throw error
  } finally {
    // Always disconnect after operations
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })