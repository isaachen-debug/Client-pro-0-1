import { Router } from 'express';
import prisma from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/services
// List all service packages for the authenticated user
router.get('/', authenticate, async (req, res) => {
    try {
        const services = await prisma.servicePackage.findMany({
            where: { ownerId: req.user!.id, isActive: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// POST /api/services/seed
// Create default service packages if none exist or force create
router.post('/seed', authenticate, async (req, res) => {
    try {
        const defaults = [
            {
                name: 'Regular Cleaning',
                description: 'Ideal for maintaining a clean and healthy home on a weekly or bi-weekly basis.',
                price: 150,
                items: JSON.stringify([
                    'Dusting all surfaces',
                    'Vacuuming carpets and rugs',
                    'Mopping hard floors',
                    'Cleaning bathrooms (toilets, showers, sinks)',
                    'Wiping kitchen counters and exterior of appliances',
                    'Emptying trash bins',
                    'Making beds (change linens if provided)'
                ])
            },
            {
                name: 'Deep Cleaning',
                description: 'A thorough top-to-bottom clean, perfect for spring cleaning or first-time service.',
                price: 300,
                items: JSON.stringify([
                    'Everything in Regular Cleaning',
                    'Wiping baseboards and door frames',
                    'Cleaning inside the oven',
                    'Cleaning inside the fridge',
                    'Interior windows and sills',
                    'Dusting ceiling fans and light fixtures',
                    'Spot cleaning walls',
                    'Scrubbing tile grout'
                ])
            },
            {
                name: 'Move-In / Move-Out',
                description: 'Ensure the property is spotless for the next tenant or your new home.',
                price: 450,
                items: JSON.stringify([
                    'All Deep Cleaning items',
                    'Cleaning inside cabinets and drawers',
                    'Deep scrubbing of all floors',
                    'Removing cobwebs from high corners',
                    'Cleaning inside closets',
                    'Polishing specialized surfaces',
                    'Cleaning light switches and door handles'
                ])
            }
        ];

        const created = await Promise.all(defaults.map(pkg =>
            prisma.servicePackage.create({
                data: {
                    ...pkg,
                    ownerId: req.user!.id,
                }
            })
        ));

        res.json(created);
    } catch (error) {
        console.error('Error seeding services:', error);
        res.status(500).json({ error: 'Failed to seed services' });
    }
});

// POST /api/services
// Create a new service package
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, description, price, items } = req.body;

        // items should be sent as array of strings
        const itemsJson = JSON.stringify(items || []);

        const service = await prisma.servicePackage.create({
            data: {
                ownerId: req.user!.id,
                name,
                description,
                price: Number(price) || 0,
                items: itemsJson,
            },
        });

        res.json(service);
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({ error: 'Failed to create service' });
    }
});

// PUT /api/services/:id
// Update a service package
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, items, isActive } = req.body;

        const data: any = {};
        if (name !== undefined) data.name = name;
        if (description !== undefined) data.description = description;
        if (price !== undefined) data.price = Number(price);
        if (items !== undefined) data.items = JSON.stringify(items);
        if (isActive !== undefined) data.isActive = isActive;

        const service = await prisma.servicePackage.update({
            where: { id, ownerId: req.user!.id },
            data,
        });

        res.json(service);
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

// DELETE /api/services/:id
// Soft delete (set isActive = false)
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const service = await prisma.servicePackage.update({
            where: { id, ownerId: req.user!.id },
            data: { isActive: false },
        });

        res.json({ message: 'Service deleted' });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

export default router;
