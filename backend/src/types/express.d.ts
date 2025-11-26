import 'express';

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      name?: string;
      email?: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};

