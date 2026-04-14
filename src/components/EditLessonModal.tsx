import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ClassRecord } from '../types';
import ViewRecordModal from './ViewRecordModal';
import { getRecordDisplayStatus, getStatusLabel, getStatusColorClass, formatDateWithWeekday } from '../utils/recordUtils';

interface EditLessonModalProps {
  records: ClassRecord[];
  onClose: () => void;
  onUpdate: (id: string, date: string, time: string) => void;
}

export default function EditLessonModal({ records, onClose, onUpdate }: EditLessonModalProps) {
  const [viewingRecordId, setViewingRecordId] = useState<string | null>(null);
  
  const editableRecords = records.filter(r => getRecordDisplayStatus(r) !== 'completed').sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

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
          {editableRecords.length === 0 ? (
            <p className="text-center text-slate-400 py-10">目前無可編輯課程</p>
          ) : (
            editableRecords.map(record => {
              const displayStatus = getRecordDisplayStatus(record);
              return (
                <div 
                  key={record.id}
                  onClick={() => setViewingRecordId(record.id)}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-100 cursor-pointer hover:border-cyan-200 transition-all flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900">{record.studentName}</h3>
                    <p className="text-xs text-slate-500">{formatDateWithWeekday(record.date)} {record.time}</p>
                  </div>
                  <div className={`px-2 py-1 text-[10px] font-bold rounded-md border ${getStatusColorClass(displayStatus)}`}>
                    {getStatusLabel(displayStatus)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {viewingRecordId && (
          <ViewRecordModal
            record={editableRecords.find(r => r.id === viewingRecordId)!}
            onClose={() => setViewingRecordId(null)}
            onUpdate={onUpdate}
            onCancelRecord={(id) => {
              console.log('Cancel record', id);
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
