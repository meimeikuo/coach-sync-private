import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, ClassRecord } from '../types';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface CalendarEventModalProps {
  students: Student[];
  records?: ClassRecord[];
  initialDate?: string;
  initialTime?: string;
  onClose: () => void;
  onBook: (recordData: Partial<ClassRecord>) => void;
  onDelete?: (id: string) => void;
  editRecord?: ClassRecord;
  checkConflict: (date: string, startTime: string, endTime: string, excludeId?: string) => ClassRecord | null;
}

const timeToMinutes = (timeStr?: string): number => {
  try {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
      return -1; // 回傳 -1 代表無效時間
    }
    const [hours, minutes] = timeStr.trim().split(':').map(Number);
    return (hours * 60) + (isNaN(minutes) ? 0 : minutes);
  } catch (err) {
    console.error("時間轉換失敗:", timeStr, err);
    return -1;
  }
};

export default function CalendarEventModal({ students, records = [], initialDate, initialTime, onClose, onBook, onDelete, editRecord, checkConflict }: CalendarEventModalProps) {
  const isEditMode = !!editRecord;
  const initialType = editRecord ? (editRecord.type || 'class') : 'class';
  const [activeTab, setActiveTab] = useState<'class' | 'custom'>(initialType);
  const [customTitle, setCustomTitle] = useState(editRecord?.type === 'custom' ? editRecord.studentName : '');
  
  const eligibleStudents = students.filter(s => (s.remainingClasses || 0) > 0 || (s.courseType === 'online' && new Date(s.endDate || '') >= new Date()));
  const [selectedStudentId, setSelectedStudentId] = useState(() => {
    if (editRecord && editRecord.type !== 'custom') {
      const student = students.find(s => s.name === editRecord.studentName);
      return student ? student.id : '';
    }
    return eligibleStudents.length > 0 ? eligibleStudents[0].id : '';
  });
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
  
  const calculateEndTime = (startTime: string) => {
    const [hStr, mStr] = startTime.split(':');
    const hNum = parseInt(hStr, 10);
    const mNum = parseInt(mStr, 10);
    let newH = hNum + 1;
    let newM = mNum;
    if (newH > 23) newH = 23;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  };

  const [date, setDate] = useState(editRecord?.date || initialDate || defaultDate);
  const [time, setTime] = useState(editRecord?.time || initialTime || defaultTime);
  const [endTime, setEndTime] = useState(editRecord?.endTime || calculateEndTime(editRecord?.time || initialTime || defaultTime));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // When time changes, update endTime to +1 hr if it was default or we just want to keep them somewhat in sync
  useEffect(() => {
    if (!editRecord) {
      setEndTime(calculateEndTime(time));
    }
  }, [time]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleBook = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    try {
      setErrorMsg(''); // Reset error message

      if (activeTab === 'class' && !selectedStudentId) {
        setErrorMsg('請選擇學員');
        return;
      }
      if (activeTab === 'custom' && !customTitle.trim()) {
        setErrorMsg('請輸入行程名稱');
        return;
      }

      const finalEndTime = activeTab === 'class' ? calculateEndTime(time) : endTime;

      const newStartMin = timeToMinutes(time);
      const newEndMin = timeToMinutes(finalEndTime);

      if (newStartMin === -1 || newEndMin === -1) {
        setErrorMsg('⚠️ 您的輸入時間格式有誤，請重新檢查！');
        return;
      }

      // 1.5 虛擬堂數預扣檢查
      if (activeTab === 'class' && selectedStudent?.courseType !== 'online') {
        const remainingLessons = selectedStudent?.remainingClasses || 0;
        const studentName = selectedStudent?.name || '';
        const recordsRef = collection(db, 'records');
        const q = query(
          recordsRef, 
          where('studentName', '==', studentName), 
          where('status', '==', 'scheduled')
        );
        const querySnapshot = await getDocs(q);
        const pendingSlots: string[] = [];
        querySnapshot.forEach((doc) => {
          // 排除自己(編輯模式)
          if (editRecord?.id && doc.id === editRecord.id) return;

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

      // 1. 取得兩種日期格式
      const dateSlash = date.replace(/-/g, '/'); // 如: "2026/07/16"
      const dateDash = date.replace(/\//g, '-'); // 如: "2026-07-16"
      
      const allDocs = records.filter(r => r.date === dateDash || r.date === dateSlash);

      let hasConflict = false;
      let conflictName = '';

      allDocs.forEach((event) => {
        // 排除自己(編輯模式)
        if (event.id === editRecord?.id) return;
        
        const dbStartStr = event.time;
        let dbEndStr = event.endTime;
        
        let dbStartMin = timeToMinutes(dbStartStr);
        let dbEndMin = dbEndStr ? timeToMinutes(dbEndStr) : (dbStartMin !== -1 ? dbStartMin + 60 : -1);

        // 只要有拿到有效數字，才進行比對
        if (dbStartMin !== -1 && dbEndMin !== -1) {
          console.log(`比對數字: 新(${newStartMin}~${newEndMin}) vs 舊(${dbStartMin}~${dbEndMin})`);
          
          // 嚴格比對邏輯 (新開始 < 舊結束 且 新結束 > 舊開始)
          if (newStartMin < dbEndMin && newEndMin > dbStartMin) {
            hasConflict = true;
            if (!conflictName) {
              conflictName = event.studentName || (event as any).title || (event as any).eventName || (event as any).name || '未知';
            }
            console.log("🚨 數學判定成立！抓到時間重疊了！"); // 追蹤是否成功進入判斷式
          }
        }
      });

      // 判斷是否要阻擋
      if (hasConflict) {
        console.log("準備彈出警告視窗...");
        setErrorMsg(`⚠️ 此時段已有【${conflictName}】行程安排！`);
        return; // 絕對阻擋，不執行寫入
      }

      // 5. 通過檢查，執行原本的寫入邏輯
      if (activeTab === 'class') {
        const payload: Partial<ClassRecord> = {
          studentName: selectedStudent?.name || '',
          date: dateDash, // 統一存 Dash 格式
          time,
          endTime: finalEndTime,
          type: 'class'
        };
        if (editRecord?.id) payload.id = editRecord.id;
        onBook(payload);
      } else {
        const payload: Partial<ClassRecord> = {
          studentName: customTitle,
          date: dateDash, // 統一存 Dash 格式
          time,
          endTime: finalEndTime,
          type: 'custom'
        };
        if (editRecord?.id) payload.id = editRecord.id;
        onBook(payload);
      }
      onClose();

    } catch (error: any) {
      console.error("【重大錯誤】儲存過程中發生當機:", error);
      setErrorMsg('系統發生預期外的錯誤，請打開 F12 Console 查看。');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative"
      >
        <h2 className="text-xl font-bold text-slate-900 mb-6">{isEditMode ? '編輯行程' : '新增行事曆事件'}</h2>
        
        {!isEditMode && (
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setActiveTab('class')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'class' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              學員排課
            </button>
            <button 
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'custom' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              特定行程
            </button>
          </div>
        )}
        
        <div className="space-y-4">
          {activeTab === 'class' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">選擇學員</label>
              <div className="relative">
                <button 
                  onClick={() => setShowStudentPicker(!showStudentPicker)}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 text-left shadow-sm hover:border-cyan-500 transition-all flex items-center justify-between"
                  disabled={isEditMode} // Usually we don't change student in edit mode, but if we do, it's fine. Disable to keep simple.
                >
                  <span>{selectedStudent ? `${selectedStudent.name} (剩餘 ${selectedStudent.remainingClasses || 0} 堂)` : '無可預約學員'}</span>
                  {!isEditMode && <span className="text-slate-400">▼</span>}
                </button>
                
                <AnimatePresence>
                  {showStudentPicker && !isEditMode && (
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
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">請輸入行程名稱</label>
              <input 
                type="text"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder="例如：開會、請假"
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">日期</label>
            <button 
              onClick={() => setShowDatePicker(true)}
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 text-left shadow-sm hover:border-cyan-500 transition-all"
            >
              {date.replace(/-/g, '/')}
            </button>
          </div>

          {activeTab === 'class' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">時間</label>
              <button 
                onClick={() => setShowTimePicker(true)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 text-left shadow-sm hover:border-cyan-500 transition-all"
              >
                {time}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">開始時間</label>
                <button 
                  onClick={() => setShowTimePicker(true)}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 text-left shadow-sm hover:border-cyan-500 transition-all"
                >
                  {time}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">結束時間</label>
                <button 
                  onClick={() => setShowEndTimePicker(true)}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 text-left shadow-sm hover:border-cyan-500 transition-all"
                >
                  {endTime}
                </button>
              </div>
            </div>
          )}
        </div>

        {errorMsg && <div className="mt-4 text-red-500 text-center font-bold">{errorMsg}</div>}

        <div className="flex space-x-3 mt-8">
          {isEditMode && onDelete && activeTab === 'custom' && (
             <button 
               onClick={() => onDelete(editRecord.id)}
               className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl"
             >
               刪除
             </button>
          )}
          {!isEditMode && <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">取消</button>}
          {isEditMode && activeTab !== 'custom' && <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">取消</button>}
          <button onClick={handleBook} className="flex-1 py-3 bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20">
            {isEditMode ? '儲存修改' : '儲存'}
          </button>
        </div>

        <AnimatePresence>
          {showDatePicker && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-transparent backdrop-blur-sm p-4"
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
              className="fixed inset-0 z-[110] flex items-center justify-center bg-transparent backdrop-blur-sm p-4"
              onClick={() => setShowTimePicker(false)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <CustomTimePicker value={time} date={date} onChange={setTime} onClose={() => setShowTimePicker(false)} />
              </div>
            </motion.div>
          )}
          {showEndTimePicker && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-transparent backdrop-blur-sm p-4"
              onClick={() => setShowEndTimePicker(false)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <CustomTimePicker value={endTime} date={date} onChange={setEndTime} onClose={() => setShowEndTimePicker(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
