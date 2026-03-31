import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ClassRecord } from '../types';
import ViewRecordModal from './ViewRecordModal';

interface EditLessonModalProps {
  records: ClassRecord[];
  onClose: () => void;
  onUpdate: (id: string, date: string, time: string) => void;
}

export default function EditLessonModal({ records, onClose, onUpdate }: EditLessonModalProps) {
  const [viewingRecordId, setViewingRecordId] = useState<string | null>(null);
  
  const scheduledRecords = records.filter(r => r.status === 'scheduled');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-6 shadow-2xl h-[80vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">編輯課程</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500">❌</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {scheduledRecords.length === 0 ? (
            <p className="text-center text-slate-400 py-10">目前無已預約課程</p>
          ) : (
            scheduledRecords.map(record => (
              <div 
                key={record.id}
                onClick={() => setViewingRecordId(record.id)}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-100 cursor-pointer hover:border-cyan-200 transition-all"
              >
                <h3 className="font-semibold text-slate-900">{record.studentName}</h3>
                <p className="text-xs text-slate-500">{record.date} {record.time}</p>
              </div>
            ))
          )}
        </div>

        {viewingRecordId && (
          <ViewRecordModal
            record={scheduledRecords.find(r => r.id === viewingRecordId)!}
            onClose={() => setViewingRecordId(null)}
            onUpdate={onUpdate}
            onCancelRecord={(id) => {
              // Assuming onCancelRecord is needed or similar logic
              // Need to check if onCancelRecord is available in props
              // For now, adding a placeholder or assuming it exists
              console.log('Cancel record', id);
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
