import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  await prisma.transaction.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('clientepro123', 10);
  const trialStart = new Date();
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + 30);

  const user = await prisma.user.create({
    data: {
      name: 'Isaac Henrik',
      email: 'isaac@example.com',
      passwordHash,
      trialStart,
      trialEnd,
      planStatus: 'TRIAL',
      isActive: true,
    },
  });

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        userId: user.id,
        name: 'Maria Silva',
        email: 'maria@email.com',
        phone: '(11) 98765-4321',
        address: 'Rua das Flores, 123 - Centro',
        serviceType: 'Limpeza completa',
        notes: 'Prefere manhãs',
      },
    }),
    prisma.customer.create({
      data: {
        userId: user.id,
        name: 'João Santos',
        email: 'joao@email.com',
        phone: '(11) 91234-5678',
        address: 'Av. Principal, 456 - Jardins',
        serviceType: 'Limpeza express',
      },
    }),
    prisma.customer.create({
      data: {
        userId: user.id,
        name: 'Ana Costa',
        email: 'ana@email.com',
        phone: '(11) 99876-5432',
        address: 'Rua dos Pinheiros, 789 - Vila Nova',
        serviceType: 'Limpeza pós-obra',
        notes: 'Cliente VIP',
      },
    }),
  ]);

  const today = new Date();
  const formatDate = (daysFromToday: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + daysFromToday);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const appointments = await Promise.all([
    prisma.appointment.create({
      data: {
        userId: user.id,
        customerId: customers[0].id,
        date: formatDate(0),
        startTime: '09:00',
        endTime: '11:00',
        price: 180,
        status: 'AGENDADO',
        isRecurring: false,
        estimatedDurationMinutes: 120,
        notes: 'Limpeza completa com foco na cozinha.',
      },
    }),
    prisma.appointment.create({
      data: {
        userId: user.id,
        customerId: customers[1].id,
        date: formatDate(1),
        startTime: '14:00',
        endTime: '15:30',
        price: 150,
        status: 'EM_ANDAMENTO',
        isRecurring: true,
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
        startedAt: new Date(),
        estimatedDurationMinutes: 90,
      },
    }),
    prisma.appointment.create({
      data: {
        userId: user.id,
        customerId: customers[2].id,
        date: formatDate(-2),
        startTime: '10:00',
        endTime: '12:30',
        price: 320,
        status: 'CONCLUIDO',
        isRecurring: false,
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        finishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 150 * 60000),
        estimatedDurationMinutes: 150,
      },
    }),
  ]);

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        appointmentId: appointments[2].id,
        type: 'RECEITA',
        status: 'PAGO',
        amount: 320,
        dueDate: formatDate(-2),
        paidAt: new Date(),
      },
      {
        userId: user.id,
        appointmentId: appointments[0].id,
        type: 'RECEITA',
        status: 'PENDENTE',
        amount: 180,
        dueDate: formatDate(0),
      },
      {
        userId: user.id,
        appointmentId: null,
        type: 'DESPESA',
        status: 'PAGO',
        amount: 80,
        dueDate: formatDate(-1),
        paidAt: new Date(),
      },
    ],
  });

  console.log('✅ Usuário, clientes, agendamentos e transações criados com sucesso');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
