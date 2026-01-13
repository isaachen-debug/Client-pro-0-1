import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../db';
import { authenticate } from '../middleware/auth';
import { geocodeAddress } from '../utils/geocode';

const router = Router();

const CUSTOMER_STATUSES = ['ACTIVE', 'PAUSED', 'INACTIVE'] as const;
type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

const isValidStatus = (value: any): value is CustomerStatus =>
  typeof value === 'string' && CUSTOMER_STATUSES.includes(value as CustomerStatus);

const parseDefaultPrice = (value: any) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseCoordinate = (value: any) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    const filters: any = {
      userId: req.user!.id,
    };


    if (status && status !== 'ALL' && isValidStatus(status)) {
      filters.status = status;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = search.trim();
      filters.OR = [
        {
          name: { contains: term },
        },
        {
          email: { contains: term },
        },
        {
          phone: { contains: term },
        },
        {
          serviceType: { contains: term },
        },
      ];
    }

    const customers = await prisma.customer.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
    });
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar clientes.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar cliente.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, serviceType, notes, status, defaultPrice } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório.' });
    }

    if (status && !isValidStatus(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    let latitude = parseCoordinate(req.body.latitude);
    let longitude = parseCoordinate(req.body.longitude);

    if ((latitude === undefined || longitude === undefined) && address) {
      const geocoded = await geocodeAddress(address);
      if (geocoded) {
        latitude = geocoded.latitude;
        longitude = geocoded.longitude;
      }
    }

    const customer = await prisma.customer.create({
      data: {
        userId: req.user!.id,
        name,
        email,
        phone,
        address,
        serviceType,
        notes,
        status: status ?? 'ACTIVE',
        defaultPrice: parseDefaultPrice(defaultPrice),
        latitude,
        longitude,
      },
    });
    res.status(201).json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar cliente.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, address, serviceType, notes, status, defaultPrice } = req.body;

    if (status && !isValidStatus(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    let latitude = parseCoordinate(req.body.latitude);
    let longitude = parseCoordinate(req.body.longitude);
    const coordinatesProvided = latitude !== undefined || longitude !== undefined;

    if (!coordinatesProvided) {
      latitude = existing.latitude ?? undefined;
      longitude = existing.longitude ?? undefined;
    }

    const addressChanged = typeof address === 'string' && address.trim() !== '' && address !== existing.address;

    if (!coordinatesProvided && addressChanged) {
      const geocoded = await geocodeAddress(address);
      if (geocoded) {
        latitude = geocoded.latitude;
        longitude = geocoded.longitude;
      }
    }

    const customer = await prisma.customer.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: {
        name,
        email,
        phone,
        address,
        serviceType,
        notes,
        status,
        defaultPrice: parseDefaultPrice(defaultPrice),
        latitude,
        longitude,
      },
    });

    if (customer.count === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const updated = await prisma.customer.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar cliente.' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!isValidStatus(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const updated = await prisma.customer.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { status },
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar status do cliente.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    // Force delete related records (Cascade)
    await prisma.appointment.deleteMany({
      where: { customerId: req.params.id },
    });

    // Try to delete contracts if they exist in schema (ignoring error if table doesn't exist yet)
    try {
      // @ts-ignore
      if (prisma.contract && customer.email) {
        // @ts-ignore
        await prisma.contract.deleteMany({
          where: {
            ownerId: req.user!.id,
            client: {
              email: customer.email,
              companyId: req.user!.id,
              role: 'CLIENT',
            },
          },
        });
      }
    } catch (e) {
      // Ignore contract deletion errors
    }

    await prisma.customer.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });

    res.json({ message: 'Cliente e dados vinculados excluídos permanentemente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir cliente.' });
  }
});

export default router;
