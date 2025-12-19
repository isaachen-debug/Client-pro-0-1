import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'clientepro-secret';
const DEBUG_LOG_PATH = '/Users/isaachenrik/projeto code/.cursor/debug.log';

const appendDebugLog = (payload: Record<string, any>) => {
  try {
    const dir = path.dirname(DEBUG_LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(DEBUG_LOG_PATH, JSON.stringify(payload) + '\n');
  } catch {
    // ignore logging errors
  }
};

export interface AuthPayload {
  userId: string;
}

export const generateToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = { id: payload.userId };
    // #region agent log
    appendDebugLog({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'H2',
      location: 'backend/src/middleware/auth.ts:authenticate',
      message: 'Auth success',
      data: { userId: payload.userId },
      timestamp: Date.now(),
    });
    // #endregion
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};


