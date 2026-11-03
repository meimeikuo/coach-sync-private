import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, ClassRecord } from '../types';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { getStudentBookingQuota, formatStudentQuotaLabel, isPendingLesson } from '../utils/recordUtils';

interface QuickBookingModalProps {
  students: Student[];
  records?: ClassRecord[];
  initialDate?: string;
  initialTime?: string;
  onClose: () => void;
  onBook: (studentId: string, date: string, time: string) => void;
  onOpenRenew?: (student: Student) => void;
}

interface RecurringSlot {
  id: string;
  dayOfWeek: number; // 1 = 週一, 2 = 週二, ..., 6 = 週六, 0 = 週日
  startTime: string;
}

interface ConflictInfo {
  date: string;
  time: string;
  conflictTarget: string;
}

interface BatchResult {
  type: 'success' | 'conflict';
  successCount: number;
  conflictSlots: ConflictInfo[];
  remainingAfter: number;
}

const WEEKDAYS = [
  { value: 1, label: '週一' },
  { value: 2, label: '週二' },
  { value: 3, label: '週三' },
  { value: 4, label: '週四' },
  { value: 5, label: '週五' },
  { value: 6, label: '週六' },
  { value: 0, label: '週日' },
];

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

export default function QuickBookingModal({ students, records = [], initialDate, initialTime, onClose, onBook, onOpenRenew }: QuickBookingModalProps) {
  // 篩選過濾：隱藏無堂數且不可約的學員（remainingLessons <= 0 且 availableToBook <= 0）
  const bookableStudents = React.useMemo(() => {
    return students.filter(s => {
      if (s.courseType === 'online') {
        if (!s.endDate) return true;
        return new Date(s.endDate.replace(/-/g, '/')) >= new Date(new Date().setHours(0, 0, 0, 0));
      }
      const { rawRemaining, availableToBook } = getStudentBookingQuota(s, records);
      if (rawRemaining <= 0 && availableToBook <= 0) {
        return false;
      }
      return true;
    });
  }, [students, records]);

  // 預設選取下拉清單中的第一位「仍有可約額度」的學員
  const [selectedStudentId, setSelectedStudentId] = useState(() => {
    const firstAvailable = bookableStudents.find(s => {
      if (s.courseType === 'online') return true;
      return getStudentBookingQuota(s, records).availableToBook > 0;
    });
    return firstAvailable ? firstAvailable.id : (bookableStudents[0]?.id || '');
  });

  useEffect(() => {
    if (bookableStudents.length > 0 && !bookableStudents.some(s => s.id === selectedStudentId)) {
      const firstAvailable = bookableStudents.find(s => {
        if (s.courseType === 'online') return true;
        return getStudentBookingQuota(s, records).availableToBook > 0;
      });
      setSelectedStudentId(firstAvailable ? firstAvailable.id : (bookableStudents[0]?.id || ''));
    }
  }, [bookableStudents, selectedStudentId, records]);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  
  // Toggle: 單次約課 vs 固定排課
  const [isRecurring, setIsRecurring] = useState(false);

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
  
  if (h < 9) {
    h = 9;
    m = 0;
  } else if (h >= 21) {
    h = 21;
    m = 0;
  }
  
  const defaultTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

  // Single booking states
  const [date, setDate] = useState(initialDate || defaultDate);
  const [time, setTime] = useState(initialTime || defaultTime);

  // Recurring booking states
  const [recurringStartDate, setRecurringStartDate] = useState(defaultDate);
  const [recurringSlots, setRecurringSlots] = useState<RecurringSlot[]>([
    { id: 'slot-1', dayOfWeek: 2, startTime: '11:00' },
  ]);

  // Unified picker target
  const [pickerTarget, setPickerTarget] = useState<
    | null
    | { type: 'singleDate' }
    | { type: 'singleTime' }
    | { type: 'recurringStartDate' }
    | { type: 'recurringSlot'; slotId: string }
  >(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

  useEffect(() => {
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const isToday = date === todayStr;
    if (isToday) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const [curH, curM] = time.split(':').map(Number);
      
      if (curH < currentHour || (curH === currentHour && curM <= currentMinute)) {
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

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const quota = selectedStudent 
    ? getStudentBookingQuota(selectedStudent, records)
    : { rawRemaining: 0, pendingLessonsCount: 0, availableToBook: 0 };
  const isZeroQuota = selectedStudent?.courseType !== 'online' && quota.availableToBook <= 0;

  // Add a recurring slot
  const handleAddSlot = () => {
    const lastSlot = recurringSlots[recurringSlots.length - 1];
    const nextDay = lastSlot ? (lastSlot.dayOfWeek === 0 ? 1 : (lastSlot.dayOfWeek + 2) % 7 || 1) : 2;
    setRecurringSlots(prev => [
      ...prev,
      {
        id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        dayOfWeek: nextDay,
        startTime: '15:00',
      }
    ]);
  };

  // Remove a recurring slot
  const handleRemoveSlot = (id: string) => {
    if (recurringSlots.length <= 1) return;
    setRecurringSlots(prev => prev.filter(s => s.id !== id));
  };

  // Handle single booking submission
  const handleSingleBook = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!selectedStudent || !selectedStudentId) {
      setErrorMsg('請選擇學員');
      return;
    }

    try {
      setErrorMsg('');

      // 防呆：實體課程檢查真實可用剩餘堂數（可排課堂數）
      if (selectedStudent.courseType !== 'online') {
        let currentPendingCount = quota.pendingLessonsCount;
        try {
          const recordsRef = collection(db, 'records');
          const [snapName, snapId] = await Promise.all([
            getDocs(query(recordsRef, where('studentName', '==', selectedStudent.name))),
            getDocs(query(recordsRef, where('studentId', '==', selectedStudent.id)))
          ]);
          const seen = new Set<string>();
          let dbCount = 0;
          [...snapName.docs, ...snapId.docs].forEach(d => {
            if (!seen.has(d.id)) {
              seen.add(d.id);
              const rData = d.data() as ClassRecord;
              rData.id = d.id;
              if (isPendingLesson(rData, selectedStudent)) dbCount++;
            }
          });
          currentPendingCount = Math.max(currentPendingCount, dbCount);
        } catch (err) {
          console.warn('DB pending check fallback:', err);
        }

        const rawRemaining = selectedStudent.remainingClasses ?? (selectedStudent as any).remainingLessons ?? 0;
        const availableToBook = rawRemaining - currentPendingCount;

        if (availableToBook <= 0) {
          alert('⚠️ 該學員可排課堂數已為 0 ！該續課啦！');
          setErrorMsg('⚠️ 該學員可排課堂數已為 0 ！該續課啦！');
          setIsSubmitting(false);
          return;
        }
      }

      setIsSubmitting(true);

      const endTime = calculateEndTime(time);
      const newStartMin = timeToMinutes(time);
      const newEndMin = timeToMinutes(endTime);

      if (newStartMin === -1 || newEndMin === -1) {
        setErrorMsg('⚠️ 您的輸入時間格式有誤，請重新檢查！');
        setIsSubmitting(false);
        return; 
      }

      const recordsRef = collection(db, 'records');

      const dateDash = date.replace(/\//g, '-'); 
      const dateSlash = date.replace(/-/g, '/');
      
      const [snapDash, snapSlash] = await Promise.all([
        getDocs(query(recordsRef, where('date', '==', dateDash))),
        getDocs(query(recordsRef, where('date', '==', dateSlash)))
      ]);
      const allDocs = [...snapDash.docs, ...snapSlash.docs];

      let hasConflict = false;
      let conflictName = '';
      
      allDocs.forEach((docSnap) => {
        const event = docSnap.data();
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
        setErrorMsg(`⚠️ 此時段已有【${conflictName}】行程安排！`);
        setIsSubmitting(false);
        return;
      }

      onBook(selectedStudentId, dateDash, time);
      onClose();

    } catch (error) {
      console.error("快速約課儲存錯誤:", error);
      setErrorMsg('系統發生預期外的錯誤，請重新嘗試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle recurring booking submission (遇衝突跳過且不遞補)
  const handleRecurringBook = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!selectedStudent || !selectedStudentId) {
      setErrorMsg('請選擇學員');
      return;
    }

    if (recurringSlots.length === 0) {
      setErrorMsg('請至少設定一組固定時段');
      return;
    }

    try {
      setErrorMsg('');

      // 1. 計算可用虛擬堂數：嚴格以 availableToBook 為上限基準
      let currentPendingCount = quota.pendingLessonsCount;
      try {
        const recordsRef = collection(db, 'records');
        const [snapName, snapId] = await Promise.all([
          getDocs(query(recordsRef, where('studentName', '==', selectedStudent.name))),
          getDocs(query(recordsRef, where('studentId', '==', selectedStudent.id)))
        ]);
        const seen = new Set<string>();
        let dbCount = 0;
        [...snapName.docs, ...snapId.docs].forEach(d => {
          if (!seen.has(d.id)) {
            seen.add(d.id);
            const rData = d.data() as ClassRecord;
            rData.id = d.id;
            if (isPendingLesson(rData, selectedStudent)) dbCount++;
          }
        });
        currentPendingCount = Math.max(currentPendingCount, dbCount);
      } catch (err) {
        console.warn('DB pending check fallback:', err);
      }

      const rawRemaining = selectedStudent.remainingClasses ?? (selectedStudent as any).remainingLessons ?? 0;
      const virtualRemaining = selectedStudent.courseType === 'online' ? 999 : (rawRemaining - currentPendingCount);

      if (selectedStudent.courseType !== 'online' && virtualRemaining <= 0) {
        alert('⚠️ 該學員可排課堂數已為 0 ！該續課啦！');
        setErrorMsg('⚠️ 該學員可排課堂數已為 0 ！該續課啦！');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(true);
      const recordsRef = collection(db, 'records');

      // 2. 依照選定的每週時段順序，僅往後產生剛好總數等於 virtualRemaining 的預定排程清單
      const [startY, startM, startD] = recurringStartDate.split('-').map(Number);
      const baseDate = new Date(startY, startM - 1, startD);
      const currentDateObj = new Date();
      const todayString = `${currentDateObj.getFullYear()}-${String(currentDateObj.getMonth() + 1).padStart(2, '0')}-${String(currentDateObj.getDate()).padStart(2, '0')}`;
      const currentMinutesNow = currentDateObj.getHours() * 60 + currentDateObj.getMinutes();

      interface CandidateSlot {
        date: string;
        time: string;
        endTime: string;
        dayOfWeek: number;
      }

      const candidateSlots: CandidateSlot[] = [];

      for (let offset = 0; candidateSlots.length < virtualRemaining && offset < 365; offset++) {
        const iterDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offset);
        const dayOfWeek = iterDate.getDay();
        const dateStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}-${String(iterDate.getDate()).padStart(2, '0')}`;

        // 找出設定為此星期的時段，按開始時間排序
        const matchingSlots = recurringSlots
          .filter(s => s.dayOfWeek === dayOfWeek)
          .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

        for (const slot of matchingSlots) {
          if (candidateSlots.length >= virtualRemaining) break;

          // 若為今天，且時段開始時間已過，則略過今天該時段（留到下週對應星期）
          if (dateStr === todayString) {
            const slotStartMin = timeToMinutes(slot.startTime);
            if (slotStartMin < currentMinutesNow) {
              continue;
            }
          }

          // 固定 60 分鐘：自動以開始時間 + 60 分鐘計算 endTime
          candidateSlots.push({
            date: dateStr,
            time: slot.startTime,
            endTime: calculateEndTime(slot.startTime),
            dayOfWeek: slot.dayOfWeek,
          });
        }
      }

      if (candidateSlots.length === 0) {
        setErrorMsg('無法在排課起始日後產生有效時段，請檢查設定！');
        setIsSubmitting(false);
        return;
      }

      // 3. 抓取候選日期既有行程以檢查衝突
      const uniqueDates = Array.from(new Set(candidateSlots.map(s => s.date)));
      const existingEventsByDate = new Map<string, any[]>();

      await Promise.all(
        uniqueDates.map(async (uDate) => {
          const dDash = uDate.replace(/\//g, '-');
          const dSlash = uDate.replace(/-/g, '/');
          const [snapDash, snapSlash] = await Promise.all([
            getDocs(query(recordsRef, where('date', '==', dDash))),
            getDocs(query(recordsRef, where('date', '==', dSlash)))
          ]);
          const list: any[] = [];
          const seenIds = new Set<string>();
          [...snapDash.docs, ...snapSlash.docs].forEach(d => {
            if (!seenIds.has(d.id)) {
              seenIds.add(d.id);
              list.push(d.data());
            }
          });
          existingEventsByDate.set(dDash, list);
        })
      );

      // 4. 逐筆比對這固定 N 堂時段：無衝突加入待寫入，有衝突跳過且不遞補
      const conflictSlots: ConflictInfo[] = [];
      const slotsToWrite: {
        studentName: string;
        date: string;
        time: string;
        endTime: string;
        status: 'scheduled';
        type: 'class';
        createdAt: string;
      }[] = [];

      for (const candidate of candidateSlots) {
        const newStartMin = timeToMinutes(candidate.time);
        const newEndMin = timeToMinutes(candidate.endTime);
        let conflictName: string | null = null;

        // 比對資料庫中該日已排項目
        const eventsOnDate = existingEventsByDate.get(candidate.date) || [];
        for (const event of eventsOnDate) {
          const dbStartStr = event.startTime || event.time;
          const dbEndStr = event.endTime;
          const dbStartMin = timeToMinutes(dbStartStr);
          const dbEndMin = dbEndStr ? timeToMinutes(dbEndStr) : (dbStartMin !== -1 ? dbStartMin + 60 : -1);

          if (dbStartMin !== -1 && dbEndMin !== -1) {
            if (newStartMin < dbEndMin && newEndMin > dbStartMin) {
              conflictName = event.studentName || event.title || event.eventName || event.name || '其他行程';
              break;
            }
          }
        }

        // 也比對本批次先前已確認排入的同日項目
        if (!conflictName) {
          for (const accepted of slotsToWrite) {
            if (accepted.date === candidate.date) {
              const accStartMin = timeToMinutes(accepted.time);
              const accEndMin = timeToMinutes(accepted.endTime);
              if (newStartMin < accEndMin && newEndMin > accStartMin) {
                conflictName = '本批次重疊時段';
                break;
              }
            }
          }
        }

        if (conflictName) {
          // 有衝突時段：直接跳過該堂課，不額外尋找後續時段補齊
          conflictSlots.push({
            date: candidate.date,
            time: candidate.time,
            conflictTarget: conflictName,
          });
        } else {
          // 無衝突時段：加入待寫入清單，自動帶入 endTime
          slotsToWrite.push({
            studentName: selectedStudent.name,
            date: candidate.date,
            time: candidate.time,
            endTime: candidate.endTime,
            status: 'scheduled',
            type: 'class',
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 5. 批次寫入 Firestore
      if (slotsToWrite.length > 0) {
        const batch = writeBatch(db);
        slotsToWrite.forEach(slot => {
          const newDocRef = doc(collection(db, 'records'));
          batch.set(newDocRef, slot);
        });
        await batch.commit();
      }

      const successCount = slotsToWrite.length;
      const remainingAfter = Math.max(0, virtualRemaining - successCount);

      // 6. 設定結果彈窗
      setBatchResult({
        type: conflictSlots.length === 0 ? 'success' : 'conflict',
        successCount,
        conflictSlots,
        remainingAfter,
      });

    } catch (error) {
      console.error("固定排課批次儲存錯誤:", error);
      setErrorMsg('批次排課發生預期外的錯誤，請查看紀錄並重試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for active picker
  const activePickerValue = () => {
    if (!pickerTarget) return '';
    if (pickerTarget.type === 'singleDate') return date;
    if (pickerTarget.type === 'singleTime') return time;
    if (pickerTarget.type === 'recurringStartDate') return recurringStartDate;
    if (pickerTarget.type === 'recurringSlot') {
      const slot = recurringSlots.find(s => s.id === pickerTarget.slotId);
      return slot ? slot.startTime : '09:00';
    }
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
      {/* 批次排課結果彈窗 */}
      <AnimatePresence>
        {batchResult ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white/98 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-y-auto"
          >
            {batchResult.type === 'success' ? (
              <div className="text-center py-5">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-100 shadow-sm">
                  ✅
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">排課成功</h3>
                <p className="text-slate-700 font-bold text-base mb-6">
                  成功排入 {batchResult.successCount} 堂課程！
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                >
                  我知道了
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 pb-1">
                  <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl border border-amber-100 shrink-0">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">固定排課結果</h3>
                    <p className="text-xs text-slate-400">已自動跳過衝突時段，未排額度已保留</p>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800 text-sm font-bold">
                  ✅ 已成功為學員排入 {batchResult.successCount} 堂課！
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-2.5">
                  <p className="text-xs font-bold text-amber-900 leading-relaxed">
                    ⚠️ 以下時段因已有其他安排已自動跳過，未排入的 {batchResult.conflictSlots.length} 堂額度已保留（學員目前仍有 {batchResult.remainingAfter} 堂可用）：
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {batchResult.conflictSlots.map((cs, idx) => (
                      <div key={idx} className="text-xs text-slate-700 font-medium flex items-center justify-between bg-white/80 px-2.5 py-1.5 rounded-xl border border-amber-200/60 shadow-2xs">
                        <span>- {cs.date.replace(/-/g, '/')} {cs.time}</span>
                        <span className="text-rose-600 font-bold text-[11px]">(衝突：{cs.conflictTarget})</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-cyan-50 rounded-2xl border border-cyan-100 flex items-start space-x-2">
                  <span className="text-sm">💡</span>
                  <p className="text-xs text-cyan-900 font-medium leading-relaxed">
                    請記得與學生聯繫，另行手動安排上述時段！
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/25 active:scale-95 transition-all mt-3"
                >
                  我知道了
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            {/* Header & Mode Switch */}
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-slate-900">快速約課</h2>
              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setIsRecurring(false); setErrorMsg(''); }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    !isRecurring ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  單次約課
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRecurring(true); setErrorMsg(''); }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    isRecurring ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  固定排課
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* 學員選擇 */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">選擇學員</label>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowStudentPicker(!showStudentPicker)}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-900 text-left shadow-sm hover:border-cyan-500 transition-all flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">
                      {selectedStudent ? formatStudentQuotaLabel(selectedStudent, records) : '無可預約學員'}
                    </span>
                    <span className="text-slate-400 text-xs">▼</span>
                  </button>
                  
                  <AnimatePresence>
                    {showStudentPicker && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-y-auto max-h-[180px]"
                      >
                        {bookableStudents.map(s => (
                          <button 
                            key={s.id}
                            type="button"
                            onClick={() => { setSelectedStudentId(s.id); setShowStudentPicker(false); }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors border-t border-slate-50 first:border-t-0 font-medium text-slate-800"
                          >
                            {formatStudentQuotaLabel(s, records)}
                          </button>
                        ))}
                        {bookableStudents.length === 0 && (
                          <div className="p-3 text-center text-xs text-slate-400">目前無可預約學員</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {isZeroQuota && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl flex items-center">
                    <span>⚠️ 該學員可排課堂數已為 0 ！</span>
                  </div>
                )}
              </div>

              {/* 單次約課模式 */}
              {!isRecurring ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">日期</label>
                    <button 
                      type="button"
                      onClick={() => setPickerTarget({ type: 'singleDate' })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-3.5 text-slate-900 text-left text-sm font-medium shadow-sm hover:border-cyan-500 transition-all"
                    >
                      {date.replace(/-/g, '/')}
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">時間</label>
                    <button 
                      type="button"
                      onClick={() => setPickerTarget({ type: 'singleTime' })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-3.5 text-slate-900 text-left text-sm font-medium shadow-sm hover:border-cyan-500 transition-all"
                    >
                      {time}
                    </button>
                  </div>
                </div>
              ) : (
                /* 固定排課模式 */
                <div className="space-y-4">
                  {/* 排課起始日 */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-600">排課起始日</label>
                      <span className="text-[11px] text-slate-400">由此日開始往後安排</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setPickerTarget({ type: 'recurringStartDate' })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-left text-sm font-medium shadow-sm hover:border-cyan-500 transition-all flex items-center justify-between"
                    >
                      <span>{recurringStartDate.replace(/-/g, '/')}</span>
                      <span className="text-xs text-slate-400">📅 點擊更換</span>
                    </button>
                  </div>

                  {/* 每週固定時段清單 */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-semibold text-slate-700">每週固定時段</label>
                      <span className="text-[11px] text-cyan-600 font-bold">
                        {selectedStudent ? (selectedStudent.courseType === 'online' ? '線上課' : `可排額度：${quota.availableToBook} 堂`) : ''}
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                      {recurringSlots.map((slot, index) => (
                        <div 
                          key={slot.id} 
                          className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2.5"
                        >
                          {/* 頂部列：左側時段編號，右側刪除按鈕 */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">時段 {index + 1}</span>
                            {recurringSlots.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(slot.id)}
                                className="text-slate-400 hover:text-rose-500 text-xs font-semibold px-2 py-0.5 rounded-lg transition-colors flex items-center space-x-1 hover:bg-rose-50"
                                title="刪除此時段"
                              >
                                <span>✕</span>
                                <span>刪除</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">固定 60 分鐘/堂</span>
                            )}
                          </div>

                          {/* 內容列：僅保留星期與開始時間，左右均分寬度 */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* 星期下拉選單 */}
                            <div>
                              <label className="block text-[11px] text-slate-500 font-medium mb-1">星期</label>
                              <select
                                value={slot.dayOfWeek}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setRecurringSlots(prev => prev.map(s => s.id === slot.id ? { ...s, dayOfWeek: val } : s));
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-cyan-500 transition-all shadow-2xs"
                              >
                                {WEEKDAYS.map(w => (
                                  <option key={w.value} value={w.value}>{w.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* 開始時間 */}
                            <div>
                              <label className="block text-[11px] text-slate-500 font-medium mb-1">開始時間</label>
                              <button
                                type="button"
                                onClick={() => setPickerTarget({ type: 'recurringSlot', slotId: slot.id })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 text-center hover:border-cyan-500 transition-all shadow-2xs"
                              >
                                {slot.startTime}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 新增固定時段按鈕 */}
                    <button
                      type="button"
                      onClick={handleAddSlot}
                      className="mt-2.5 w-full py-2.5 bg-slate-100 hover:bg-slate-200/80 text-cyan-700 text-xs font-bold rounded-xl transition-all border border-slate-200/60 flex items-center justify-center space-x-1"
                    >
                      <span>➕ 新增固定時段</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl leading-relaxed">
                {errorMsg}
              </div>
            )}

            <div className="flex space-x-3 mt-6">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200/70 text-slate-600 font-bold rounded-xl transition-all"
              >
                取消
              </button>
              {isZeroQuota ? (
                <button 
                  type="button"
                  onClick={() => {
                    if (onOpenRenew && selectedStudent) {
                      onClose();
                      onOpenRenew(selectedStudent);
                    }
                  }} 
                  className="flex-1 py-3 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25 active:scale-95"
                >
                  💳 立即續課
                </button>
              ) : (
                <button 
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    if (isRecurring) {
                      handleRecurringBook(e);
                    } else {
                      handleSingleBook(e);
                    }
                  }} 
                  className="flex-1 py-3 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-1.5 bg-cyan-500 hover:bg-cyan-600 text-white shadow-cyan-500/25 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{isRecurring ? '開始固定排課' : '預約'}</span>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date & Time Picker Modals */}
      <AnimatePresence>
        {pickerTarget && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-transparent backdrop-blur-sm p-4"
            onClick={() => setPickerTarget(null)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              {(pickerTarget.type === 'singleDate' || pickerTarget.type === 'recurringStartDate') ? (
                <CustomDatePicker 
                  value={activePickerValue()} 
                  onChange={(newDate) => {
                    if (pickerTarget.type === 'singleDate') setDate(newDate);
                    if (pickerTarget.type === 'recurringStartDate') setRecurringStartDate(newDate);
                    setPickerTarget(null);
                  }} 
                  onClose={() => setPickerTarget(null)} 
                />
              ) : (
                <CustomTimePicker 
                  value={activePickerValue()} 
                  date={pickerTarget.type === 'singleTime' ? date : recurringStartDate} 
                  onChange={(newTime) => {
                    if (pickerTarget.type === 'singleTime') {
                      setTime(newTime);
                    } else if (pickerTarget.type === 'recurringSlot') {
                      const { slotId } = pickerTarget;
                      setRecurringSlots(prev => prev.map(s => {
                        if (s.id === slotId) {
                          return {
                            ...s,
                            startTime: newTime
                          };
                        }
                        return s;
                      }));
                    }
                    setPickerTarget(null);
                  }} 
                  onClose={() => setPickerTarget(null)} 
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
