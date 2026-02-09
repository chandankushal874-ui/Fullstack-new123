import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany()
    console.log('--- CURRENT USERS IN DB ---')
    if (users.length === 0) {
        console.log('NO USERS FOUND.')
    } else {
        users.forEach((user) => {
            console.log(`[${user.role}] ${user.email} - Status: ${user.status} (ID: ${user.id})`)
        })
    }
    console.log('---------------------------')
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
