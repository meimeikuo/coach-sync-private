import { ClassRecord } from '../types';

export type RecordDisplayStatus = 'scheduled' | 'completed' | 'late_pending';

export const getRecordDisplayStatus = (record: ClassRecord): RecordDisplayStatus => {
  if (record.status === 'completed') return 'completed';
  
  const now = new Date();
  const [year, month, day] = record.date.split('-').map(Number);
  const [hour, minute] = record.time.split(':').map(Number);
  const scheduledTime = new Date(year, month - 1, day, hour, minute);
  
  // Difference in milliseconds
  const diff = now.getTime() - scheduledTime.getTime();
  const diffInHours = diff / (1000 * 60 * 60);
  
  // If it's more than 2 hours past the scheduled time
  if (diffInHours > 2) return 'late_pending';
  
  return 'scheduled';
};

export const getStatusLabel = (status: RecordDisplayStatus) => {
  switch (status) {
    case 'completed': return '已完成';
    case 'late_pending': return '未簽名';
    case 'scheduled': return '待簽名';
    default: return '未知';
  }
};

export const getStatusColorClass = (status: RecordDisplayStatus) => {
  switch (status) {
    case 'completed': return 'bg-cyan-50 text-cyan-600 border-cyan-100';
    case 'late_pending': return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'scheduled': return 'bg-slate-50 text-slate-500 border-slate-200';
    default: return 'bg-slate-50 text-slate-500 border-slate-200';
  }
};
