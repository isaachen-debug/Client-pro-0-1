import { AppointmentPhotoType, Role } from '@prisma/client';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../db';
import { authenticate } from '../middleware/auth';
import {
  ensureChecklistItems,
  fetchHelperAppointmentsForDay,
  getManagerContact,
  mapHelperAppointment,
  summarizeHelperAppointments,
} from '../services/helperDay';

const router = Router();

router.use(authenticate);

const uploadsDir = path.resolve(__dirname, '../../uploads/appointments');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({ storage });

const fetchHelper = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  if (user.role !== Role.HELPER) {
    throw new Error('FORBIDDEN');
  }
  return user;
};

router.get('/day', async (req, res) => {
  try {
    const helper = await fetchHelper(req.user!.id);
    const targetDateParam = typeof req.query.date === 'string' ? new Date(req.query.date) : new Date();
    const targetDate = new Date(targetDateParam);
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const hydrated = await fetchHelperAppointmentsForDay(helper.id, targetDate, endDate);
    const summary = summarizeHelperAppointments(hydrated);
    const manager = await getManagerContact(helper.companyId);

    res.json({
      date: targetDate.toISOString(),
      summary,
      appointments: hydrated.map(mapHelperAppointment),
      manager,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito às helpers.' });
    }
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar serviços do dia.' });
  }
});

router.get('/appointments/:id', async (req, res) => {
  try {
    const helper = await fetchHelper(req.user!.id);
    await ensureChecklistItems(req.params.id);

    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, assignedHelperId: helper.id },
      include: {
        customer: true,
        checklistItems: { orderBy: { sortOrder: 'asc' } },
        photos: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Serviço não encontrado.' });
    }

    const manager = await getManagerContact(helper.companyId);

    res.json({
      ...mapHelperAppointment(appointment),
      manager,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito às helpers.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar serviço.' });
  }
});

router.post('/appointments/:id/status', async (req, res) => {
  try {
    const helper = await fetchHelper(req.user!.id);
    const { status } = req.body;

    if (!['EM_ANDAMENTO', 'CONCLUIDO'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido para helper.' });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, assignedHelperId: helper.id },
      include: { customer: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Serviço não encontrado.' });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status,
        startedAt: status === 'EM_ANDAMENTO' ? appointment.startedAt ?? new Date() : appointment.startedAt,
        finishedAt: status === 'CONCLUIDO' ? new Date() : appointment.finishedAt,
      },
      include: {
        customer: true,
        checklistItems: { orderBy: { sortOrder: 'asc' } },
        photos: true,
      },
    });

    const manager = await getManagerContact(helper.companyId);

    res.json({
      ...mapHelperAppointment(updated),
      manager,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito às helpers.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

router.post('/appointments/:appointmentId/tasks/:taskId/toggle', async (req, res) => {
  try {
    const helper = await fetchHelper(req.user!.id);
    const task = await prisma.appointmentChecklistItem.findFirst({
      where: {
        id: req.params.taskId,
        appointment: {
          id: req.params.appointmentId,
          assignedHelperId: helper.id,
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Checklist não encontrado.' });
    }

    const updated = await prisma.appointmentChecklistItem.update({
      where: { id: task.id },
      data: {
        completedAt: task.completedAt ? null : new Date(),
        completedById: task.completedAt ? null : helper.id,
      },
    });

    res.json(updated);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Acesso restrito às helpers.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar checklist.' });
  }
});

router.post('/appointments/:id/photos', upload.single('photo'), async (req, res) => {
  try {
    const helper = await fetchHelper(req.user!.id);
    const { type } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Envie uma imagem.' });
    }

    if (!['BEFORE', 'AFTER'].includes(type)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Tipo inválido. Use BEFORE ou AFTER.' });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, assignedHelperId: helper.id },
    });

    if (!appointment) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Serviço não encontrado.' });
    }

    const relativePath = path
      .relative(path.resolve(__dirname, '../../'), req.file.path)
      .replace(/\\/g, '/');

    const photo = await prisma.appointmentPhoto.create({
      data: {
        appointmentId: appointment.id,
        uploadedById: helper.id,
        type: type as AppointmentPhotoType,
        url: relativePath.startsWith('/') ? relativePath : `/${relativePath}`,
      },
    });

    res.status(201).json({
      id: photo.id,
      url: photo.url.startsWith('/') ? photo.url : `/${photo.url}`,
      type: photo.type,
      createdAt: photo.createdAt,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao salvar foto.' });
  }
});

export default router;

