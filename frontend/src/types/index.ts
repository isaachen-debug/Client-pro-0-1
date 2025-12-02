export type ThemeOption = 'light' | 'dark';
export type LanguageOption = 'pt' | 'en' | 'es';
export type UserRole = 'OWNER' | 'HELPER' | 'CLIENT';
export type HelperPayoutMode = 'FIXED' | 'PERCENTAGE';
export type ContractStatus = 'PENDENTE' | 'ACEITO' | 'RECUSADO';
export type ServiceFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ONE_TIME';
export type ContractTemplateStyle = 'contemporary' | 'modern' | 'classic';
export type BillingType = 'PER_VISIT' | 'WEEKLY_AUTO' | 'MONTHLY';
export type AccessMethod = 'DOOR_CODE' | 'KEY' | 'SOMEONE_HOME' | 'GARAGE';
export interface OwnerReviewLinks {
  google?: string;
  nextdoor?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
}

export interface CompanyShowcaseSection {
  id: string;
  title: string;
  description: string;
  emoji?: string;
}

export interface CompanyShowcase {
  headline?: string;
  description?: string;
  layout?: 'grid' | 'stacked';
  sections: CompanyShowcaseSection[];
}

export interface ContractServiceAddon {
  id: string;
  label: string;
  price: number;
}

export interface ContractBlueprint {
  brand: {
    logo?: string;
    accentColor: string;
    template: ContractTemplateStyle;
  };
  client: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    frequency: ServiceFrequency;
    pricePerVisit: number;
  };
  services: {
    standard: Record<string, boolean>;
    deep: Record<string, boolean>;
    custom: string[];
    addons: ContractServiceAddon[];
  };
  payment: {
    amount: number;
    billingType: BillingType;
    paymentMethods: string[];
    latePolicy?: string;
  };
  cancellation: string;
  access: {
    method: AccessMethod;
    notes?: string;
  };
  startDate: string;
}

export interface ClientPreferences {
  focusAreas: string[];
  fragrance: string;
  notes: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  companyName?: string;
  primaryColor?: string;
  preferredTheme?: ThemeOption;
  preferredLanguage?: LanguageOption;
  createdAt?: string;
  trialStart?: string;
  trialEnd?: string;
  planStatus?: string;
  isActive?: boolean;
  role?: UserRole;
  companyId?: string | null;
  whatsappNumber?: string | null;
  contactPhone?: string | null;
  helperPayoutMode?: HelperPayoutMode;
  helperPayoutValue?: number;
  reviewLinks?: OwnerReviewLinks | null;
  companyWebsite?: string | null;
  companyShowcase?: CompanyShowcase | null;
}

export type CustomerStatus = 'ACTIVE' | 'PAUSED' | 'INACTIVE';

export interface Customer {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  serviceType?: string;
  status: CustomerStatus;
  notes?: string;
  defaultPrice?: number;
  createdAt: string;
  updatedAt: string;
  clientPreferences?: ClientPreferences | null;
  reviewLinks?: OwnerReviewLinks | null;
  companyWebsite?: string | null;
  companyShowcase?: CompanyShowcase | null;
  avatarUrl?: string | null;
}

export type AppointmentStatus = 'AGENDADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

export interface Appointment {
  id: string;
  userId: string;
  customerId: string;
  customer: Customer;
  assignedHelperId?: string | null;
  assignedHelper?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  date: string;
  startTime: string;
  endTime?: string;
  price: number;
  helperFee?: number | null;
  status: AppointmentStatus;
  isRecurring: boolean;
  recurrenceRule?: string;
  recurrenceSeriesId?: string | null;
  notes?: string;
  startedAt?: string;
  finishedAt?: string;
  estimatedDurationMinutes?: number;
  checklistSnapshot?: { title: string }[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface HelperChecklistItem {
  id: string;
  title: string;
  completedAt?: string | null;
}

export interface HelperManagerContact {
  id?: string;
  name?: string;
  whatsappNumber?: string | null;
  contactPhone?: string | null;
}

export interface HelperAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: AppointmentStatus;
  price: number;
  helperFee?: number;
  startedAt?: string | null;
  finishedAt?: string | null;
  notes?: string | null;
  customer: {
    id: string;
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    reference?: string | null;
    serviceType?: string | null;
    phone?: string | null;
  };
  checklist: HelperChecklistItem[];
  observations: (string | null | undefined)[];
  photos: {
    id: string;
    url: string;
    type: 'BEFORE' | 'AFTER';
    createdAt: string;
  }[];
  manager?: HelperManagerContact | null;
}

export interface HelperDayResponse {
  date: string;
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    payoutTotal: number;
  };
  appointments: HelperAppointment[];
  helper?: {
    id: string;
    name: string;
    email?: string;
    whatsappNumber?: string | null;
    contactPhone?: string | null;
    helperPayoutMode?: HelperPayoutMode;
    helperPayoutValue?: number;
  };
  manager?: HelperManagerContact | null;
}

export interface HelperExpense {
  id: string;
  helperId: string;
  ownerId: string;
  date: string;
  category: string;
  amount: number;
  notes?: string | null;
}

export interface HelperCostSummary {
  helper: {
    id: string;
    name: string;
    helperPayoutMode: HelperPayoutMode;
    helperPayoutValue: number;
  };
  range: {
    from: string;
    to: string;
  };
  summary: {
    appointments: number;
    revenueTotal: number;
    payoutTotal: number;
    margin: number;
    expensesTotal: number;
    netAfterExpenses: number;
  };
  appointments: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime?: string | null;
    price: number;
    status: AppointmentStatus;
    helperFee?: number | null;
    projectedFee: number;
    customer: {
      id: string;
      name: string;
      address?: string | null;
    } | null;
  }>;
  expenses: {
    total: number;
    items: HelperExpense[];
  };
  inspiration: string[];
}

export interface Contract {
  id: string;
  ownerId: string;
  clientId: string;
  title: string;
  body: string;
  pdfUrl?: string | null;
  status: ContractStatus;
  sentAt: string;
  acceptedAt?: string | null;
  clientNotes?: string | null;
  ownerNotes?: string | null;
  placeholders?: {
    blueprint?: ContractBlueprint;
    [key: string]: unknown;
  } | null;
  gallery?: Array<{ url: string; caption?: string }> | null;
  createdAt: string;
  updatedAt: string;
  owner?: Pick<User, 'id' | 'name' | 'email' | 'companyName'> | null;
  client?: Pick<User, 'id' | 'name' | 'email'> | null;
  meta?: {
    provisionalAccess?: {
      email: string;
      temporaryPassword: string;
    };
  } | null;
}

export interface HelperLiveStatusResponse {
  date: string;
  helpers: Array<{
    helper: {
      id: string;
      name: string;
      email: string;
    };
    activeAppointment: {
      id: string;
      startTime: string;
      endTime?: string | null;
      status: AppointmentStatus;
      startedAt?: string | null;
      finishedAt?: string | null;
      customer: {
        id: string;
        name: string;
        address?: string | null;
      };
      checklist?: {
        total: number;
        completed: number;
      } | null;
    } | null;
    summary: {
      total: number;
      completed: number;
      pending: number;
      inProgress: number;
    };
  }>;
}

export interface ClientPortalSummary {
  customer: {
    name: string;
    email?: string;
    serviceType?: string | null;
    companyName?: string | null;
    ownerName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    whatsappNumber?: string | null;
    reviewLinks?: OwnerReviewLinks | null;
    companyWebsite?: string | null;
    companyShowcase?: CompanyShowcase | null;
    avatarUrl?: string | null;
    preferences?: ClientPreferences | null;
  } | null;
  upcoming: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime?: string | null;
    status: AppointmentStatus;
    serviceType?: string | null;
    helperName?: string | null;
    notes?: string | null;
    price: number;
  }>;
  history: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime?: string | null;
    status: AppointmentStatus;
    serviceType?: string | null;
    helperName?: string | null;
    notes?: string | null;
    price: number;
  }>;
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

