
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  SUB_ADMIN = 'sub_admin'
}

export type TrainingType = 'in_person' | 'virtual';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // In a real app, this is hashed. Storing plain for mock demo.
  role: UserRole;
  workspaceId: string;
  parentAdminId?: string | null;
  apiToken?: string;
}

export interface Training {
  id: string;
  adminId: string;
  title: string;
  type: TrainingType;
  location: string;
  dates: string[]; // Array of ISO date strings (YYYY-MM-DD) representing training sessions
  startDate: string; // Derived min date
  endDate: string;   // Derived max date
  description: string;
  resourcesLink?: string; // Optional link to slides/materials
}

export interface Trainee {
  id: string;
  trainingId: string;
  name: string;
  email: string;
  phone?: string;
  uniqueCode: string;
}

export interface Attendance {
  id: string;
  traineeId: string;
  trainingId: string;
  timestamp: string;
  sessionDate: string; // The specific scheduled date this attendance is for
}

export interface Session {
  user: User | null;
  isAuthenticated: boolean;
}
