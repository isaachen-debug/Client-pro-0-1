import 'express';

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      name?: string;
      email?: string;
      role?: string;
      companyId?: string | null;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};

