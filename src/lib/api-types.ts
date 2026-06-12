export type UserRole = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'EMPLOYEE';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyId: string;
  role: UserRole;
  isActive?: boolean;
  createdAt: string;
}

export type TripStatus = 'ACTIVE' | 'CLOSED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface Trip {
  id: string;
  companyId: string;
  userId: string;
  destination: string;
  purpose: string | null;
  startDate: string;
  endDate: string | null;
  budget: number | null;
  carId: string | null;
  kmStart: number | null;
  kmEnd: number | null;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
  totalExpenses?: number;
  _count?: { expenses: number };
}

export interface TripDetail extends Trip {
  expenses: Expense[];
  car: { id: string; make: string; model: string; plateNumber: string } | null;
}

export type ExpenseCategory = 'COMBUSTIBIL' | 'MASA' | 'CAZARE' | 'TRANSPORT' | 'DIURNA' | 'ALTELE';

export interface Expense {
  id: string;
  tripId: string | null;
  companyId: string;
  userId: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  date: string;
  merchant: string | null;
  merchantCif: string | null;
  notes: string | null;
  imageUrl: string | null;
  verified: boolean;
  createdAt: string;
}

export type ReportType = 'TRIP' | 'MONTHLY';

export interface Report {
  id: string;
  companyId: string;
  type: ReportType;
  tripId: string | null;
  month: string | null;
  userId: string;
  pdfPath: string;
  sentTo: string | null;
  sentAt: string | null;
  createdAt: string;
}

export type DocStatus = 'valid' | 'expires_soon' | 'expired';

export interface FleetDocument {
  reminderId: string;
  title: string;
  category: string;
  expiresAt: string;
  daysLeft: number;
  status: DocStatus;
}

export interface CarOverview {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number | null;
  mileage: number | null;
  color: string | null;
  assignedUser: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
  documents: FleetDocument[];
  totalCosts12m: number;
}

export interface Car {
  id: string;
  companyId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number | null;
  mileage: number | null;
  color: string | null;
  assignedUserId: string | null;
  createdAt: string;
  reminders?: Reminder[];
}

export type ReminderStatus = 'ACTIVE' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';

export interface Reminder {
  id: string;
  carId: string;
  userId: string;
  title: string;
  category: string;
  expiresAt: string;
  notifyBeforeDays: number;
  status: ReminderStatus;
  notes: string | null;
  lastNotifiedAt: string | null;
  createdAt: string;
}

export interface Document {
  id: string;
  carId: string;
  type: string;
  title: string;
  imageUrl: string;
  linkedCostId: string | null;
  linkedReminderId: string | null;
  createdAt: string;
}

export type CostCategory = 'FUEL' | 'SERVICE' | 'INSURANCE' | 'TAX' | 'TIRE' | 'WASH' | 'OTHER';

export interface Cost {
  id: string;
  carId: string;
  category: CostCategory;
  amount: number;
  currency: string;
  date: string;
  vendor: string | null;
  notes: string | null;
  linkedExpenseId: string | null;
  createdAt: string;
}

export interface StatsSummary {
  activeTrip: {
    id: string;
    destination: string;
    startDate: string;
    runningTotal: number;
    budget: number | null;
    budgetRemaining: number | null;
  } | null;
  currentMonth: {
    label: string;
    total: number;
    byCategory: Record<string, number>;
    count: number;
  };
  expiringDocuments: {
    reminderId: string;
    title: string;
    category: string;
    expiresAt: string;
    daysLeft: number;
    car: { make: string; model: string; plateNumber: string };
  }[];
}

export interface Company {
  id: string;
  name: string;
  cif: string | null;
  accountantEmail: string | null;
  settings: Record<string, unknown> | null;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
