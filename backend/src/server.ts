import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import customersRouter from './routes/customers';
import appointmentsRouter from './routes/appointments';
import transactionsRouter from './routes/transactions';
import dashboardRouter from './routes/dashboard';
import userRouter from './routes/user';
import invoicesRouter from './routes/invoices';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Client Pro API rodando!' });
});

// Rotas
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/customers', customersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/invoices', invoicesRouter);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 API disponível em http://localhost:${PORT}`);
});

