import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { authenticate, generateToken } from '../middleware/auth';

const router = Router();

const mapUserResponse = (user: any) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  companyName: user.companyName,
  primaryColor: user.primaryColor,
  avatarUrl: user.avatarUrl,
  planStatus: user.planStatus,
  trialStart: user.trialStart,
  trialEnd: user.trialEnd,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Informe nome, email e senha.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'E-mail já registrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const trialStart = new Date();
    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + 30);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        // Casting due to generated types cache issues; fields exist in schema
        companyName: name,
        primaryColor: '#22c55e',
        trialStart,
        trialEnd,
        planStatus: 'TRIAL',
        isActive: true,
      } as any,
    });

    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user: mapUserResponse(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe email e senha.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Conta desativada. Entre em contato com o suporte.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: mapUserResponse(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao realizar login.' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.json(mapUserResponse(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar usuário.' });
  }
});

router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logout realizado com sucesso.' });
});

export default router;

