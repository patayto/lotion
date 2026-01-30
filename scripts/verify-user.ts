
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'alice@lotion.so'
    const password = 'password123'

    console.log(`Checking user: ${email}`)

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
        console.error('User NOT FOUND!')
        return
    }

    console.log('User found:', user.id, user.name, user.email, user.role)
    console.log('Stored Hash:', user.password)

    const match = await bcrypt.compare(password, user.password)
    console.log(`Password 'password123' match: ${match}`)
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
