import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CustomerSeed = {
  name: string;
  serviceType: string;
  defaultPrice?: string | number | null;
};

const OWNER_EMAIL = 'shirleigv123@gmail.com';
const OWNER_PASSWORD_HASH = '$2a$10$/MTQ/YcnQM7vNIn3ODSFRuErTPZ/m9RHU6v4KxrxMLvPgBdeMBlsa';

const customers: CustomerSeed[] = [
  { name: 'Beverly', serviceType: 'Mensal', defaultPrice: '150,00' },
  { name: 'Sheva', serviceType: 'Mensal', defaultPrice: '170,00' },
  { name: 'Indiano do banheiro', serviceType: 'Quinzenal', defaultPrice: '130,00' },
  { name: 'Agnes', serviceType: 'Quinzenal', defaultPrice: '150,00' },
  { name: 'Amber', serviceType: 'Mensal', defaultPrice: '200,00' },
  { name: 'Justin', serviceType: 'Mensal', defaultPrice: '180,00' },
  { name: 'Tonya', serviceType: 'Quinzenal', defaultPrice: '140,00' },
  { name: 'Salão de festas', serviceType: 'Quinzenal', defaultPrice: '120,00' },
  { name: 'Clínica Leominster', serviceType: 'Quinzenal', defaultPrice: '70,00' },
  { name: 'Vineeth', serviceType: 'Quinzenal', defaultPrice: '130,00' },
  { name: 'Rama', serviceType: 'Mensal', defaultPrice: '120,00' },
  { name: 'Nancy', serviceType: 'Semanal', defaultPrice: '89,00' },
  { name: 'Matew', serviceType: 'Quinzenal', defaultPrice: '150,00' },
  { name: 'Mihai', serviceType: 'Quinzenal', defaultPrice: '140,00' },
  { name: 'Manogi', serviceType: 'Quinzenal', defaultPrice: '105,00' },
  { name: 'Liz', serviceType: 'Quinzenal', defaultPrice: '180,00' },
  { name: 'Joane', serviceType: 'Quinzenal', defaultPrice: '130,00' },
  { name: 'Izabella', serviceType: 'Mensal', defaultPrice: null },
  { name: 'Dorath', serviceType: 'Quinzenal', defaultPrice: '230,00' },
  { name: 'Bill', serviceType: 'Quinzenal', defaultPrice: '115,00' },
  { name: 'Anoob', serviceType: 'Mensal', defaultPrice: '230,00' },
  { name: 'Alisson', serviceType: 'Quinzenal', defaultPrice: '130,00' },
  { name: 'Anushya', serviceType: 'Mensal', defaultPrice: '160,00' },
  { name: 'Anjhlai', serviceType: 'Mensal', defaultPrice: '150,00' },
];

const parsePrice = (price?: string | number | null) => {
  if (price === null || price === undefined || price === '') {
    return undefined;
  }

  if (typeof price === 'number') {
    return price;
  }

  const normalized = price.replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
};

async function main() {
  console.log('⚠️  Limpando tabelas antes de restaurar os dados...');
  await prisma.transaction.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  console.log('👤 Criando conta da dona...');
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 30);

  const owner = await prisma.user.create({
    data: {
      name: 'Shirley',
      email: OWNER_EMAIL,
      passwordHash: OWNER_PASSWORD_HASH,
      companyName: 'Client Up',
      primaryColor: '#22c55e',
      trialStart: now,
      trialEnd,
      planStatus: 'TRIAL',
      isActive: true,
      role: 'OWNER',
    },
  });

console.log(`✅ Dona criada com ID: ${owner.id}`);

  console.log('👥 Inserindo clientes...');
  for (const customer of customers) {
    await prisma.customer.create({
      data: {
        userId: owner.id,
        name: customer.name,
        serviceType: customer.serviceType,
        status: 'ACTIVE',
        defaultPrice: parsePrice(customer.defaultPrice),
      },
    });
    console.log(`  • ${customer.name}`);
  }

  console.log(`🎉 Total de ${customers.length} clientes restaurados com sucesso!`);
}

main()
  .catch((error) => {
    console.error('❌ Erro ao restaurar dados:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

