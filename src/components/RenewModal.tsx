import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../types';
import CustomDatePicker from './CustomDatePicker';

interface RenewModalProps {
  student: Student;
  onClose: () => void;
  onRenewClasses: (studentId: string, additionalClasses: number) => void;
  onRenewOnlineClasses: (studentId: string, duration: 'quarter' | 'half' | 'year', startDate: string, endDate: string) => void;
}

export default function RenewModal({ student, onClose, onRenewClasses, onRenewOnlineClasses }: RenewModalProps) {
  const [renewAmount, setRenewAmount] = useState(12);
  const [renewOnlineDuration, setRenewOnlineDuration] = useState<'quarter' | 'half' | 'year'>('quarter');
  const [renewStartDate, setRenewStartDate] = useState('');
  const [renewEndDate, setRenewEndDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end'>('start');

  const calculateEndDate = (startDateStr: string, duration: 'quarter' | 'half' | 'year') => {
    if (!startDateStr) return '';
    const start = new Date(startDateStr);
    let weeks = 13;
    if (duration === 'half') weeks = 26;
    if (duration === 'year') weeks = 52;
    
    const end = new Date(start.getTime());
    end.setDate(start.getDate() + (weeks * 7) - 1);
    
    return `${end.getFullYear()}-${(end.getMonth() + 1).toString().padStart(2, '0')}-${end.getDate().toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (student.courseType === 'online') {
      let nextStartDate = new Date();
      if (student.endDate) {
        const currentEnd = new Date(student.endDate);
        nextStartDate = new Date(currentEnd.getTime() + 24 * 60 * 60 * 1000);
      }
      const startDateStr = `${nextStartDate.getFullYear()}-${(nextStartDate.getMonth() + 1).toString().padStart(2, '0')}-${nextStartDate.getDate().toString().padStart(2, '0')}`;
      setRenewStartDate(startDateStr);
      setRenewEndDate(calculateEndDate(startDateStr, renewOnlineDuration));
    }
  }, [student]);

  useEffect(() => {
    if (student.courseType === 'online') {
      setRenewEndDate(calculateEndDate(renewStartDate, renewOnlineDuration));
    }
  }, [renewStartDate, renewOnlineDuration]);

  const handleRenew = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (student.courseType === 'online') {
      onRenewOnlineClasses(student.id, renewOnlineDuration, renewStartDate, renewEndDate);
    } else {
      if (renewAmount <= 0) {
        setFormError('請輸入有效的堂數');
        return;
      }
      onRenewClasses(student.id, renewAmount);
    }
    
    onClose();
  };

  const currentRemaining = student.remainingClasses ?? (student as any).remainingLessons ?? 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 pb-24 sm:p-6 sm:pb-24">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 max-h-[85vh] overflow-y-auto no-scrollbar shadow-[0_0_60px_rgba(0,0,0,0.2)]"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">學員續課</h2>
            <p className="text-sm text-slate-500 mt-1">為 <span className="font-bold text-emerald-600">{student.name}</span> 增加堂數</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors"
          >
            ❌
          </button>
        </div>
        
        <form onSubmit={handleRenew} className="space-y-4">
          {student.courseType === 'online' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">課程時間</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'quarter', label: '一季' },
                    { id: 'half', label: '半年' },
                    { id: 'year', label: '一年' }
                  ].map(dur => (
                    <button
                      key={dur.id}
                      type="button"
                      onClick={() => setRenewOnlineDuration(dur.id as any)}
                      className={`py-3 rounded-xl font-bold text-sm transition-all ${
                        renewOnlineDuration === dur.id
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">開始時間</label>
                  <button 
                    type="button"
                    onClick={() => {
                      setDatePickerTarget('start');
                      setShowDatePicker(true);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 flex items-center justify-between text-left shadow-sm hover:border-cyan-500 transition-colors"
                  >
                    <span className="font-medium text-slate-700">{renewStartDate.replace(/-/g, '/')}</span>
                    <span className="text-cyan-600">📅</span>
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">結束時間</label>
                  <button 
                    type="button"
                    onClick={() => {
                      setDatePickerTarget('end');
                      setShowDatePicker(true);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 flex items-center justify-between text-left shadow-sm hover:border-cyan-500 transition-colors"
                  >
                    <span className="font-medium text-slate-700">{renewEndDate.replace(/-/g, '/')}</span>
                    <span className="text-cyan-600">📅</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">購買堂數</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[12, 24, 36].map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setRenewAmount(amount);
                        setFormError(null);
                      }}
                      className={`py-2 rounded-xl font-bold text-sm transition-all ${
                        renewAmount === amount
                          ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {amount} 堂
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    value={renewAmount}
                    onChange={e => {
                      setRenewAmount(parseInt(e.target.value) || 0);
                      if (formError) setFormError(null);
                    }}
                    className={`w-full bg-white/80 border ${formError ? 'border-red-400 focus:ring-red-500' : 'border-slate-200/60 focus:border-emerald-500 focus:ring-emerald-500'} rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:ring-1 outline-none transition-all shadow-sm`}
                    placeholder="自訂堂數"
                  />
                  {formError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute left-0 right-0 top-full mt-1 z-20"
                    >
                      <div className="bg-red-500 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-lg flex items-center space-x-1.5 w-fit">
                        <span>⚠️</span>
                        <span>{formError}</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">目前剩餘堂數</span>
                  <span className="font-medium text-slate-900">{currentRemaining} 堂</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">新增堂數</span>
                  <span className="font-medium text-emerald-600">+{renewAmount} 堂</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200">
                  <span className="text-slate-700">續課後總剩餘</span>
                  <span className="text-emerald-600">{currentRemaining + renewAmount} 堂</span>
                </div>
              </div>
            </>
          )}
          
          <button 
            type="submit"
            className="w-full bg-emerald-500 text-white font-bold rounded-xl py-4 mt-6 active:scale-95 transition-transform shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
          >
            確認續課
          </button>
        </form>

        <AnimatePresence>
          {showDatePicker && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] flex items-center justify-center bg-transparent backdrop-blur-sm p-4 pb-24 sm:p-6 sm:pb-24"
              onClick={() => setShowDatePicker(false)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <CustomDatePicker 
                  value={datePickerTarget === 'start' ? renewStartDate : renewEndDate} 
                  allowPast={true}
                  onChange={(d) => {
                    if (datePickerTarget === 'start') {
                      setRenewStartDate(d);
                    } else {
                      setRenewEndDate(d);
                    }
                    setShowDatePicker(false);
                  }} 
                  onClose={() => setShowDatePicker(false)} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
