import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const selectUserFields = {
  id: true,
  name: true,
  email: true,
  companyName: true,
  primaryColor: true,
  avatarUrl: true,
  createdAt: true,
  trialStart: true,
  trialEnd: true,
  planStatus: true,
  isActive: true,
};

router.get('/profile', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: selectUserFields,
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar perfil.' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { name, email, companyName, primaryColor, avatarUrl } = req.body;

    if (!name && !email && !companyName && !primaryColor && !avatarUrl) {
      return res.status(400).json({ error: 'Informe algum campo para atualizar.' });
    }

    if (email) {
      const existing = await prisma.user.findFirst({
        where: {
          email,
          id: { not: req.user!.id },
        },
      });
      if (existing) {
        return res.status(400).json({ error: 'E-mail já está em uso por outro usuário.' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: name ?? undefined,
        email: email ?? undefined,
        companyName: companyName ?? undefined,
        primaryColor: primaryColor ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
      } as any,
      select: selectUserFields,
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return res.status(400).json({ error: 'Senha atual incorreta.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ message: 'Senha atualizada com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar senha.' });
  }
});

export default router;

