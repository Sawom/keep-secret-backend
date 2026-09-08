import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // একটি টেস্ট ইউজার তৈরি
    const user = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
            email: 'test@example.com',
            passwordHash: 'hashedpassword123',
            fullName: 'Test User',
        },
    });

    console.log('Seed data created:', user);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });