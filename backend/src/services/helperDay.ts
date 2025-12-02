import prisma from '../db';

const defaultChecklistFromNotes = (notes?: string | null) => {
  if (!notes) return [];
  return notes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((title, index) => ({ title, sortOrder: index }));
};

const buildFallbackChecklist = (serviceType?: string | null) => {
  if (!serviceType) {
    return [
      { title: 'Cozinha completa', sortOrder: 0 },
      { title: 'Banheiro completo', sortOrder: 1 },
      { title: 'Áreas comuns e quartos', sortOrder: 2 },
    ];
  }

  const normalized = serviceType.toLowerCase();
  if (normalized.includes('seman')) {
    return [
      { title: 'Limpeza rápida da cozinha', sortOrder: 0 },
      { title: 'Banheiro e lavabos', sortOrder: 1 },
      { title: 'Trocar roupas de cama', sortOrder: 2 },
    ];
  }
  if (normalized.includes('quinzen')) {
    return [
      { title: 'Cozinha completa', sortOrder: 0 },
      { title: 'Banheiro profundo', sortOrder: 1 },
      { title: 'Tapetes e móveis', sortOrder: 2 },
    ];
  }
  return [
    { title: 'Cozinha completa', sortOrder: 0 },
    { title: 'Banheiro completo', sortOrder: 1 },
    { title: 'Trocar roupas de cama', sortOrder: 2 },
    { title: 'Organizar áreas comuns', sortOrder: 3 },
  ];
};

export const ensureChecklistItems = async (appointmentId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      checklistItems: true,
      customer: true,
    },
  });
  if (!appointment) return [];
  if (appointment.checklistItems.length > 0) {
    return appointment.checklistItems;
  }

  const candidates = [
    ...defaultChecklistFromNotes(appointment.notes),
    ...defaultChecklistFromNotes(appointment.customer?.notes ?? undefined),
  ];

  const template = candidates.length > 0 ? candidates : buildFallbackChecklist(appointment.customer?.serviceType);

  await prisma.$transaction(
    template.map((item) =>
      prisma.appointmentChecklistItem.create({
        data: {
          appointmentId: appointment.id,
          title: item.title,
          sortOrder: item.sortOrder,
        },
      }),
    ),
  );

  return prisma.appointmentChecklistItem.findMany({
    where: { appointmentId: appointment.id },
    orderBy: { sortOrder: 'asc' },
  });
};

export const fetchHelperAppointmentsForDay = async (
  helperId: string,
  startDate: Date,
  endDate: Date,
) => {
  const appointments = await prisma.appointment.findMany({
    where: {
      assignedHelperId: helperId,
      date: { gte: startDate, lte: endDate },
    },
    include: {
      customer: true,
      checklistItems: true,
      photos: true,
    },
    orderBy: [{ startTime: 'asc' }],
  });

  if (!appointments.length) {
    return [];
  }

  await Promise.all(appointments.map((appt) => ensureChecklistItems(appt.id)));

  return prisma.appointment.findMany({
    where: { id: { in: appointments.map((appt) => appt.id) } },
    include: {
      customer: true,
      checklistItems: { orderBy: { sortOrder: 'asc' } },
      photos: true,
    },
    orderBy: [{ startTime: 'asc' }],
  });
};

export const summarizeHelperAppointments = (appointments: any[]) =>
  appointments.reduce(
    (acc, appt) => {
      acc.total += 1;
      if (appt.status === 'CONCLUIDO') acc.completed += 1;
      else if (appt.status === 'EM_ANDAMENTO') acc.inProgress += 1;
      else acc.pending += 1;
      acc.payoutTotal += appt.helperFee ?? 0;
      return acc;
    },
    { total: 0, completed: 0, pending: 0, inProgress: 0, payoutTotal: 0 },
  );

export const mapHelperAppointment = (appointment: any) => ({
  id: appointment.id,
  date: appointment.date,
  startTime: appointment.startTime,
  endTime: appointment.endTime,
  status: appointment.status,
  price: appointment.price,
  helperFee: appointment.helperFee ?? 0,
  startedAt: appointment.startedAt,
  finishedAt: appointment.finishedAt,
  notes: appointment.notes,
  customer: {
    id: appointment.customer.id,
    name: appointment.customer.name,
    address: appointment.customer.address,
    latitude: appointment.customer.latitude,
    longitude: appointment.customer.longitude,
    reference: appointment.customer.notes,
    serviceType: appointment.customer.serviceType,
    phone: appointment.customer.phone,
  },
  checklist:
    appointment.checklistItems?.map((item: any) => ({
      id: item.id,
      title: item.title,
      completedAt: item.completedAt,
    })) ?? [],
  observations: [appointment.customer.notes, appointment.notes].filter(Boolean),
  photos:
    appointment.photos?.map((photo: any) => ({
      id: photo.id,
      url: photo.url.startsWith('/') ? photo.url : `/${photo.url}`,
      type: photo.type,
      createdAt: photo.createdAt,
    })) ?? [],
});

export const getManagerContact = async (companyId?: string | null) => {
  if (!companyId) return null;
  return prisma.user.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      whatsappNumber: true,
      contactPhone: true,
    },
  });
};

