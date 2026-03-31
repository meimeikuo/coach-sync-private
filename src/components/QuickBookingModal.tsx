import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../types';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';

interface QuickBookingModalProps {
  students: Student[];
  onClose: () => void;
  onBook: (studentId: string, date: string, time: string) => void;
}

export default function QuickBookingModal({ students, onClose, onBook }: QuickBookingModalProps) {
  const eligibleStudents = students.filter(s => s.remainingClasses > 0);
  const [selectedStudentId, setSelectedStudentId] = useState(eligibleStudents.length > 0 ? eligibleStudents[0].id : '');
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const selectedStudent = eligibleStudents.find(s => s.id === selectedStudentId);

  const handleBook = () => {
    if (!selectedStudentId) return;
    onBook(selectedStudentId, date, time);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-6 shadow-2xl"
      >
        <h2 className="text-xl font-bold text-slate-900 mb-6">快速約課</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">選擇學員</label>
            <div className="relative">
              <button 
                onClick={() => setShowStudentPicker(!showStudentPicker)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 text-left shadow-sm hover:border-cyan-500 transition-all flex items-center justify-between"
              >
                <span>{selectedStudent ? `${selectedStudent.name} (剩餘 ${selectedStudent.remainingClasses} 堂)` : '無可預約學員'}</span>
                <span className="text-slate-400">▼</span>
              </button>
              
              <AnimatePresence>
                {showStudentPicker && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden"
                  >
                    {eligibleStudents.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => { setSelectedStudentId(s.id); setShowStudentPicker(false); }}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-t border-slate-50 first:border-t-0"
                      >
                        {s.name} (剩餘 {s.remainingClasses} 堂)
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">日期</label>
                <button 
                  onClick={() => setShowDatePicker(true)}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 text-left shadow-sm hover:border-cyan-500 transition-all"
                >
                  {date.replace(/-/g, '/')}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">時間</label>
                <button 
                  onClick={() => setShowTimePicker(true)}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 text-left shadow-sm hover:border-cyan-500 transition-all"
                >
                  {time}
                </button>
              </div>
            </div>
        </div>

        <div className="flex space-x-3 mt-8">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">取消</button>
          <button onClick={handleBook} className="flex-1 py-3 bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20">預約</button>
        </div>

        {showDatePicker && (
          <CustomDatePicker value={date} onChange={setDate} onClose={() => setShowDatePicker(false)} />
        )}
        {showTimePicker && (
          <CustomTimePicker value={time} date={date} onChange={setTime} onClose={() => setShowTimePicker(false)} />
        )}
      </motion.div>
    </div>
  );
}
