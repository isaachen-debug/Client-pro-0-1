export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  companyName?: string;
  primaryColor?: string;
  createdAt?: string;
  trialStart?: string;
  trialEnd?: string;
  planStatus?: string;
  isActive?: boolean;
}

export type CustomerStatus = 'ACTIVE' | 'PAUSED' | 'INACTIVE';

export interface Customer {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  serviceType?: string;
  status: CustomerStatus;
  notes?: string;
  defaultPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus = 'AGENDADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

export interface Appointment {
  id: string;
  userId: string;
  customerId: string;
  customer: Customer;
  date: string;
  startTime: string;
  endTime?: string;
  price: number;
  status: AppointmentStatus;
  isRecurring: boolean;
  recurrenceRule?: string;
  notes?: string;
  startedAt?: string;
  finishedAt?: string;
  estimatedDurationMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'RECEITA' | 'DESPESA';
export type TransactionStatus = 'PENDENTE' | 'PAGO';

export interface Transaction {
  id: string;
  userId: string;
  appointmentId?: string;
  appointment?: Appointment;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

export interface DashboardOverview {
  totalRevenueMonth: number;
  pendingPaymentsMonth: number;
  activeClientsCount: number;
  scheduledServicesCount: number;
  revenueByWeek: {
    label: string;
    value: number;
  }[];
  upcomingAppointments: Appointment[];
}

