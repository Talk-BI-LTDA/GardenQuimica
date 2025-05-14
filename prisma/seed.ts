import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Create a new isolated instance
const prisma = new PrismaClient()

async function main() {
    try {
        console.log("Iniciando o seeding...")
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
                    role: 'ADMIN',
                },
            })
            console.log("Usuário admin criado com sucesso!")
        } else {
            console.log("Usuário admin já existe, pulando criação.")
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