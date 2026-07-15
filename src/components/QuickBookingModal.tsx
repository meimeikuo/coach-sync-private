import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../types';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface QuickBookingModalProps {
  students: Student[];
  initialDate?: string;
  initialTime?: string;
  onClose: () => void;
  onBook: (studentId: string, date: string, time: string) => void;
}

const timeToMinutes = (timeStr?: string): number => {
  try {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return -1;
    const [hours, minutes] = timeStr.trim().split(':').map(Number);
    return (hours * 60) + (isNaN(minutes) ? 0 : minutes);
  } catch (err) {
    return -1;
  }
};

const calculateEndTime = (startTime: string) => {
  const [hStr, mStr] = startTime.split(':');
  const hNum = parseInt(hStr, 10);
  const mNum = parseInt(mStr, 10);
  let newH = hNum + 1;
  let newM = mNum;
  if (newH > 23) {
    newH = 23;
    newM = 59;
  }
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
};

export default function QuickBookingModal({ students, initialDate, initialTime, onClose, onBook }: QuickBookingModalProps) {
  const eligibleStudents = students.filter(s => (s.remainingClasses || 0) > 0);
  const [selectedStudentId, setSelectedStudentId] = useState(eligibleStudents.length > 0 ? eligibleStudents[0].id : '');
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  
  // Default date: today (local)
  const now = new Date();
  const defaultDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  
  // Default time: closest 30-min interval (round down)
  let h = now.getHours();
  let m = now.getMinutes();
  
  if (m >= 30) {
    m = 30;
  } else {
    m = 0;
  }
  
  // Clamp to 09:00 - 21:00
  if (h < 9) {
    h = 9;
    m = 0;
  } else if (h >= 21) {
    h = 21;
    m = 0;
  }
  
  const defaultTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

  const [date, setDate] = useState(initialDate || defaultDate);
  const [time, setTime] = useState(initialTime || defaultTime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const isToday = date === todayStr;
    if (isToday) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const [h, m] = time.split(':').map(Number);
      
      if (h < currentHour || (h === currentHour && m <= currentMinute)) {
        const defaultTimeDate = new Date(now.getTime() + 60 * 60 * 1000);
        let nh = defaultTimeDate.getHours();
        let nm = defaultTimeDate.getMinutes();
        
        if (nm > 0 && nm <= 30) {
          nm = 30;
        } else if (nm > 30) {
          nm = 0;
          nh += 1;
        } else {
          nm = 0;
        }
        
        if (nh < 9) { nh = 9; nm = 0; }
        else if (nh >= 21) { nh = 21; nm = 0; }
        
        const newTime = `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
        setTime(newTime);
      }
    }
  }, [date]);

  const selectedStudent = eligibleStudents.find(s => s.id === selectedStudentId);

  const handleBook = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!selectedStudentId) {
      setErrorMsg('請選擇學員');
      return;
    }

    try {
      setErrorMsg('');

      const endTime = calculateEndTime(time);
      const newStartMin = timeToMinutes(time);
      const newEndMin = timeToMinutes(endTime);

      if (newStartMin === -1 || newEndMin === -1) {
        setErrorMsg('⚠️ 您的輸入時間格式有誤，請重新檢查！');
        return; 
      }

      const recordsRef = collection(db, 'records');

      // 虛擬堂數預扣檢查
      if (selectedStudent?.courseType !== 'online') {
        const remainingLessons = selectedStudent?.remainingClasses || 0;
        const qRemaining = query(
          recordsRef,
          where('studentName', '==', selectedStudent?.name || ''),
          where('status', '==', 'scheduled')
        );
        const querySnapshot = await getDocs(qRemaining);
        const pendingSlots: string[] = [];
        querySnapshot.forEach((doc) => {
          const event = doc.data();
          const pDate = event.date; // 例如: "2026-07-16"
          const pStart = event.startTime || event.time; // 例如: "11:00"
          
          if (pDate && pStart) {
            const shortDate = pDate.replace(/^\d{4}-/, '').replace(/^\d{4}\//, ''); // 去除年份，只留月/日
            pendingSlots.push(`${shortDate} ${pStart}`);
          }
        });

        if (remainingLessons - pendingSlots.length <= 0) {
          setErrorMsg(`⚠️ 約課失敗！該學員剩餘堂數為 ${remainingLessons} 堂，已預約 ${pendingSlots.join('、')}！`);
          return;
        }
      }

      const dateDash = date.replace(/\//g, '-'); 
      const dateSlash = date.replace(/-/g, '/');
      
      const [snapDash, snapSlash] = await Promise.all([
        getDocs(query(recordsRef, where('date', '==', dateDash))),
        getDocs(query(recordsRef, where('date', '==', dateSlash)))
      ]);
      const allDocs = [...snapDash.docs, ...snapSlash.docs];

      let hasConflict = false;
      let conflictName = '';
      
      allDocs.forEach((doc) => {
        const event = doc.data();
        const dbStartStr = event.startTime || event.time;
        let dbEndStr = event.endTime;
        let dbStartMin = timeToMinutes(dbStartStr);
        let dbEndMin = dbEndStr ? timeToMinutes(dbEndStr) : (dbStartMin !== -1 ? dbStartMin + 60 : -1);

        if (dbStartMin !== -1 && dbEndMin !== -1) {
          if (newStartMin < dbEndMin && newEndMin > dbStartMin) {
            hasConflict = true;
            if (!conflictName) {
              conflictName = event.studentName || event.title || event.eventName || event.name || '未知';
            }
          }
        }
      });

      if (hasConflict) {
        console.log("🚨 快速約課：抓到時間重疊！攔截！");
        setErrorMsg(`⚠️ 此時段已有【${conflictName}】行程安排！`);
        return; // 阻擋寫入
      }

      onBook(selectedStudentId, dateDash, time);
      onClose();

    } catch (error) {
      console.error("快速約課儲存錯誤:", error);
      setErrorMsg('系統發生預期外的錯誤，請打開 F12 Console 查看。');
    }
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
                <span>{selectedStudent ? `${selectedStudent.name} (剩餘 ${selectedStudent.remainingClasses || 0} 堂)` : '無可預約學員'}</span>
                <span className="text-slate-400">▼</span>
              </button>
              
              <AnimatePresence>
                {showStudentPicker && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-y-auto max-h-[200px]"
                  >
                    {eligibleStudents.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => { setSelectedStudentId(s.id); setShowStudentPicker(false); }}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-t border-slate-50 first:border-t-0"
                      >
                        {s.name} (剩餘 {s.remainingClasses || 0} 堂)
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

        {errorMsg && <div className="mt-4 text-red-500 text-center font-bold">{errorMsg}</div>}

        <div className="flex space-x-3 mt-8">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">取消</button>
          <button onClick={handleBook} className="flex-1 py-3 bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20">預約</button>
        </div>

        <AnimatePresence>
          {showDatePicker && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] flex items-center justify-center bg-transparent backdrop-blur-sm p-4"
              onClick={() => setShowDatePicker(false)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <CustomDatePicker value={date} onChange={setDate} onClose={() => setShowDatePicker(false)} />
              </div>
            </motion.div>
          )}
          {showTimePicker && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] flex items-center justify-center bg-transparent backdrop-blur-sm p-4"
              onClick={() => setShowTimePicker(false)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <CustomTimePicker value={time} date={date} onChange={setTime} onClose={() => setShowTimePicker(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
