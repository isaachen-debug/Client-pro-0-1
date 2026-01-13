const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPasswords() {
    try {
        console.log('🔑 Resetando senhas dos usuários...\n');

        // Senha padrão para todos os usuários
        const defaultPassword = '123456';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        // Buscar todos os usuários OWNER
        const owners = await prisma.user.findMany({
            where: { role: 'OWNER' },
            select: { id: true, email: true, name: true }
        });

        console.log(`Encontrados ${owners.length} usuários OWNER:\n`);

        for (const owner of owners) {
            await prisma.user.update({
                where: { id: owner.id },
                data: { passwordHash }
            });
            console.log(`✓ ${owner.email} (${owner.name})`);
        }

        console.log('\n✅ SENHAS RESETADAS COM SUCESSO!');
        console.log('\n📋 CREDENCIAIS DE LOGIN:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Senha padrão para TODOS os usuários: 123456');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('Exemplos de login:');
        owners.slice(0, 3).forEach((owner, i) => {
            console.log(`${i + 1}. Email: ${owner.email}`);
            console.log(`   Senha: 123456\n`);
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

resetPasswords();
