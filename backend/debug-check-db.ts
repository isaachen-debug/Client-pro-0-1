
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const helperId = 'd730b5ef-c047-4245-9c48-e1351384181a';

    console.log('Checking helper:', helperId);

    const helper = await prisma.user.findUnique({
        where: { id: helperId },
    });

    if (!helper) {
        console.log('Helper NOT FOUND in DB');
        return;
    }

    console.log('Helper found:', {
        id: helper.id,
        name: helper.name,
        email: helper.email,
        role: helper.role,
        companyId: helper.companyId,
        payoutMode: helper.helperPayoutMode,
        payoutValue: helper.helperPayoutValue
    });

    if (helper.companyId) {
        const owner = await prisma.user.findUnique({
            where: { id: helper.companyId },
        });
        console.log('Owner found:', owner ? {
            id: owner.id,
            name: owner.name,
            email: owner.email,
            role: owner.role
        } : 'Owner NOT FOUND');
    } else {
        console.log('Helper has NO companyId');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
