export interface Student {
  id: string;
  name: string;
  remainingClasses: number;
  totalClasses: number;
  joinDate: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  hasSetPassword: boolean;
  role: 'admin';
}

export interface ClassRecord {
  id: string;
  studentName: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed';
  createdAt: string;
  coachSignature?: string;
  studentSignature?: string;
  signedAt?: string;
}

export type TabType = 'dashboard' | 'students' | 'records';
