const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importData() {
    try {
        const data = JSON.parse(fs.readFileSync('/tmp/render_data.json', 'utf8'));

        console.log('Importando dados do Render...\n');

        // Import Users - owners first, then team members
        console.log(`Importando ${data.User.length} usuários...`);
        const owners = data.User.filter(u => !u.companyId);
        const teamMembers = data.User.filter(u => u.companyId);

        for (const user of [...owners, ...teamMembers]) {
            await prisma.user.upsert({
                where: { id: user.id },
                update: {},
                create: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    passwordHash: user.passwordHash,
                    createdAt: new Date(user.createdAt),
                    trialStart: user.trialStart ? new Date(user.trialStart) : null,
                    trialEnd: user.trialEnd ? new Date(user.trialEnd) : null,
                    planStatus: user.planStatus,
                    isActive: user.isActive,
                    companyName: user.companyName,
                    primaryColor: user.primaryColor,
                    avatarUrl: user.avatarUrl,
                    preferredTheme: user.preferredTheme,
                    preferredLanguage: user.preferredLanguage,
                    role: user.role,
                    companyId: user.companyId,
                    whatsappNumber: user.whatsappNumber,
                    contactPhone: user.contactPhone,
                    reviewLinks: user.reviewLinks,
                    companyWebsite: user.companyWebsite,
                    companyShowcase: user.companyShowcase,
                    helperPayoutMode: user.helperPayoutMode,
                    helperPayoutValue: user.helperPayoutValue,
                    googleAccessToken: user.googleAccessToken,
                    googleRefreshToken: user.googleRefreshToken,
                    googleTokenExpiry: user.googleTokenExpiry ? new Date(user.googleTokenExpiry) : null,
                    googleCalendarId: user.googleCalendarId
                }
            });
        }
        console.log('✓ Usuários importados\n');

        // Import Customers
        console.log(`Importando ${data.Customer.length} clientes...`);
        for (const customer of data.Customer) {
            await prisma.customer.upsert({
                where: { id: customer.id },
                update: {},
                create: {
                    id: customer.id,
                    userId: customer.userId,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address,
                    latitude: customer.latitude,
                    longitude: customer.longitude,
                    serviceType: customer.serviceType,
                    notes: customer.notes,
                    status: customer.status,
                    defaultPrice: customer.defaultPrice,
                    clientPreferences: customer.clientPreferences,
                    createdAt: new Date(customer.createdAt),
                    updatedAt: new Date(customer.updatedAt)
                }
            });
        }
        console.log('✓ Clientes importados\n');

        // Import Appointments
        console.log(`Importando ${data.Appointment.length} agendamentos...`);
        for (const apt of data.Appointment) {
            await prisma.appointment.upsert({
                where: { id: apt.id },
                update: {},
                create: {
                    id: apt.id,
                    userId: apt.userId,
                    customerId: apt.customerId,
                    assignedHelperId: apt.assignedHelperId,
                    date: new Date(apt.date),
                    startTime: apt.startTime,
                    endTime: apt.endTime,
                    price: apt.price,
                    helperFee: apt.helperFee,
                    status: apt.status,
                    isRecurring: apt.isRecurring,
                    recurrenceRule: apt.recurrenceRule,
                    notes: apt.notes,
                    startedAt: apt.startedAt ? new Date(apt.startedAt) : null,
                    finishedAt: apt.finishedAt ? new Date(apt.finishedAt) : null,
                    estimatedDurationMinutes: apt.estimatedDurationMinutes,
                    invoiceNumber: apt.invoiceNumber,
                    invoiceToken: apt.invoiceToken,
                    invoiceSentAt: apt.invoiceSentAt ? new Date(apt.invoiceSentAt) : null,
                    recurrenceSeriesId: apt.recurrenceSeriesId,
                    checklistSnapshot: apt.checklistSnapshot,
                    googleEventId: apt.googleEventId,
                    createdAt: new Date(apt.createdAt),
                    updatedAt: new Date(apt.updatedAt)
                }
            });
        }
        console.log('✓ Agendamentos importados\n');

        // Import Contracts
        if (data.Contract && data.Contract.length > 0) {
            console.log(`Importando ${data.Contract.length} contratos...`);
            for (const contract of data.Contract) {
                await prisma.contract.upsert({
                    where: { id: contract.id },
                    update: {},
                    create: {
                        id: contract.id,
                        ownerId: contract.ownerId,
                        clientId: contract.clientId,
                        title: contract.title,
                        body: contract.body,
                        pdfUrl: contract.pdfUrl,
                        status: contract.status,
                        sentAt: new Date(contract.sentAt),
                        acceptedAt: contract.acceptedAt ? new Date(contract.acceptedAt) : null,
                        clientNotes: contract.clientNotes,
                        ownerNotes: contract.ownerNotes,
                        placeholders: contract.placeholders ? JSON.stringify(contract.placeholders) : null,
                        gallery: contract.gallery ? JSON.stringify(contract.gallery) : null,
                        createdAt: new Date(contract.createdAt),
                        updatedAt: new Date(contract.updatedAt)
                    }
                });
            }
            console.log('✓ Contratos importados\n');
        }

        // Import Transactions
        if (data.Transaction && data.Transaction.length > 0) {
            console.log(`Importando ${data.Transaction.length} transações...`);
            for (const tx of data.Transaction) {
                await prisma.transaction.upsert({
                    where: { id: tx.id },
                    update: {},
                    create: {
                        id: tx.id,
                        userId: tx.userId,
                        appointmentId: tx.appointmentId,
                        type: tx.type,
                        status: tx.status,
                        amount: tx.amount,
                        dueDate: new Date(tx.dueDate),
                        paidAt: tx.paidAt ? new Date(tx.paidAt) : null,
                        description: tx.description,
                        createdAt: new Date(tx.createdAt)
                    }
                });
            }
            console.log('✓ Transações importadas\n');
        }

        console.log('✅ TODOS OS DADOS IMPORTADOS COM SUCESSO!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

importData();
