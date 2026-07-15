export interface Student {
  id: string;
  name: string;
  remainingClasses: number;
  totalClasses: number;
  joinDate: string;
  courseType: 'online' | 'physical';
  onlineDuration?: 'quarter' | 'half' | 'year';
  startDate?: string;
  endDate?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  hasSetPassword: boolean;
  role: 'admin';
}

export interface PurchaseRecord {
  id: string;
  studentId: string;
  studentName: string;
  purchasedAmount: number;
  purchaseDate: string;
  previousTotal: number;
  type: 'initial' | 'renewal';
  createdAt: number;
  onlineDuration?: 'quarter' | 'half' | 'year';
}

export interface ClassRecord {
  id: string;
  studentName: string;
  date: string;
  time: string;
  endTime?: string;
  status: 'scheduled' | 'completed';
  createdAt: string;
  coachSignature?: string;
  studentSignature?: string;
  signedAt?: string;
  type?: 'class' | 'custom';
}

export type TabType = 'dashboard' | 'students' | 'records' | 'calendar';
