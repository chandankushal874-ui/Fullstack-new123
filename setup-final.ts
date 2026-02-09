import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('--- STARTING FINAL SETUP ---')

    // 1. Upsert Admin: test@test.com
    const adminEmail = 'test@test.com'
    const adminPassword = 'Test123@123'
    const adminHash = await bcrypt.hash(adminPassword, 10)

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            password: adminHash,
            role: 'ADMIN',
            status: 'APPROVED',
            name: 'Test Admin'
        },
        create: {
            email: adminEmail,
            name: 'Test Admin',
            password: adminHash,
            role: 'ADMIN',
            status: 'APPROVED',
        },
    })
    console.log(`✅ Admin ensured: ${admin.email}`)

    // 2. Create Dummy Pending User (if not exists)
    const userEmail = 'pending@example.com'
    const userHash = await bcrypt.hash('password123', 10)

    const pendingUser = await prisma.user.upsert({
        where: { email: userEmail },
        update: {}, // Don't verify them if they already exist
        create: {
            email: userEmail,
            name: 'Pending User',
            password: userHash,
            role: 'USER',
            status: 'PENDING',
        },
    })
    console.log(`✅ Sample Pending User ensured: ${pendingUser.email} (Status: ${pendingUser.status})`)

    // 3. List All Users
    const allUsers = await prisma.user.findMany()
    console.log('\n--- FINAL DATABASE CONTENT ---')
    allUsers.forEach(u => {
        console.log(`[${u.role}] ${u.email} - ${u.status}`)
    })
    console.log('------------------------------')
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
