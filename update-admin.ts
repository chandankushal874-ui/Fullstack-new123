import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'test@test.com'
    const password = 'Test123@123'
    const name = 'Admin User'

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: 'ADMIN',
            status: 'APPROVED',
        },
        create: {
            email,
            name,
            password: hashedPassword,
            role: 'ADMIN',
            status: 'APPROVED',
        },
    })

    console.log(`Admin user upserted: ${user.email}`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
