import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Student, ClassRecord } from '../types';
import ViewRecordModal from '../components/ViewRecordModal';
import CustomTimePicker from '../components/CustomTimePicker';
import CustomDatePicker from '../components/CustomDatePicker';

interface StudentsProps {
  students: Student[];
  records: ClassRecord[];
  onAddStudent: (student: Omit<Student, 'id' | 'joinDate'>) => void;
  onScheduleClass: (record: Omit<ClassRecord, 'id' | 'createdAt' | 'status'>) => void;
  onRenewClasses: (studentId: string, additionalClasses: number) => void;
  onDeleteStudent: (studentId: string) => void;
  onUpdateRecord: (id: string, date: string, time: string) => void;
}

export default function Students({ students, records, onAddStudent, onScheduleClass, onRenewClasses, onDeleteStudent, onUpdateRecord }: StudentsProps) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [schedulingStudent, setSchedulingStudent] = useState<Student | null>(null);
  const [renewingStudent, setRenewingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [viewingRecordId, setViewingRecordId] = useState<string | null>(null);
  const [recordTab, setRecordTab] = useState<'scheduled' | 'completed'>('scheduled');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [newStudent, setNewStudent] = useState<{
    name: string;
    remainingClasses: number;
    totalClasses: number;
  }>({
    name: '',
    remainingClasses: 10,
    totalClasses: 10
  });

  const [scheduleData, setScheduleData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '10:00'
  });

  const getValidFutureTime = (dateStr: string, currentTime: string) => {
    const now = new Date();
    const isToday = dateStr === now.toISOString().split('T')[0];
    if (!isToday) return currentTime;
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const [h, m] = currentTime.split(':').map(Number);
    
    if (h < currentHour || (h === currentHour && m <= currentMinute)) {
      // Find next available 5-minute slot
      let nextMinute = Math.ceil((currentMinute + 1) / 5) * 5;
      let nextHour = currentHour;
      
      if (nextMinute >= 60) {
        nextMinute = 0;
        nextHour += 1;
      }
      
      if (nextHour >= 24) return '23:55';
      return `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
    }
    
    return currentTime;
  };

  useEffect(() => {
    if (schedulingStudent) {
      const today = new Date().toISOString().split('T')[0];
      const validTime = getValidFutureTime(today, '10:00');
      setScheduleData({
        date: today,
        time: validTime
      });
    }
  }, [schedulingStudent]);

  useEffect(() => {
    const validTime = getValidFutureTime(scheduleData.date, scheduleData.time);
    if (validTime !== scheduleData.time) {
      setScheduleData(prev => ({ ...prev, time: validTime }));
    }
  }, [scheduleData.date]);

  const [showInlineDatePicker, setShowInlineDatePicker] = useState(false);
  const [showInlineTimePicker, setShowInlineTimePicker] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const [renewAmount, setRenewAmount] = useState(10);

  const viewingRecord = records.find(r => r.id === viewingRecordId);

  const filteredStudents = students.filter(s => 
    s.name.includes(search)
  );

  useEffect(() => {
    if (showInlineTimePicker) {
      const [h, m] = scheduleData.time.split(':');
      
      // Small delay to ensure the modal is fully rendered before scrolling
      setTimeout(() => {
        if (hourScrollRef.current) {
          const hourIndex = hours.indexOf(h);
          if (hourIndex !== -1) {
            hourScrollRef.current.scrollTo({
              top: hourIndex * 48,
              behavior: 'auto'
            });
          }
        }
        if (minuteScrollRef.current) {
          const minuteIndex = minutes.indexOf(m);
          if (minuteIndex !== -1) {
            minuteScrollRef.current.scrollTo({
              top: minuteIndex * 48,
              behavior: 'auto'
            });
          }
        }
      }, 100);
    }
  }, [showInlineTimePicker]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!newStudent.name.trim()) {
      setFormError('請填寫學員姓名');
      return;
    }
    
    onAddStudent(newStudent);
    setShowAddModal(false);
    setNewStudent({ name: '', remainingClasses: 10, totalClasses: 10 });
  };

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingStudent) return;

    onScheduleClass({
      studentName: schedulingStudent.name,
      date: scheduleData.date,
      time: scheduleData.time
    });
    setSchedulingStudent(null);
  };

  const handleRenew = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!renewingStudent) return;
    
    if (renewAmount <= 0) {
      setFormError('請輸入有效的堂數');
      return;
    }

    onRenewClasses(renewingStudent.id, renewAmount);
    setRenewingStudent(null);
    setRenewAmount(10);
  };

  const handleDelete = () => {
    if (viewingStudent) {
      onDeleteStudent(viewingStudent.id);
      setViewingStudent(null);
      setShowDeleteConfirm(false);
    }
  };

  const getStudentRecords = (studentName: string) => {
    return records
      .filter(r => r.studentName === studentName)
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB.getTime() - dateA.getTime();
      });
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="p-5 pb-2 bg-white/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/50">
        <div className="flex justify-between items-center mb-4 pt-4">
          <h1 className="text-2xl font-bold text-slate-900">學員管理</h1>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-white text-cyan-600 border border-cyan-100 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-transform text-sm font-bold"
          >
            新增學員 +
          </button>
        </div>
        
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text"
            placeholder="搜尋姓名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/80 border border-slate-200/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {filteredStudents.map((student) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={student.id} 
            onClick={() => setViewingStudent(student)}
            className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.05)] border border-cyan-100/50 flex items-center justify-between cursor-pointer active:scale-95 transition-all hover:bg-white hover:shadow-[0_0_25px_rgba(6,182,212,0.2)] hover:border-cyan-200 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-transparent transition-all duration-500" />
            <div className="relative z-10 flex items-center space-x-4">
              <div className="w-12 h-12 bg-cyan-50 text-cyan-600 border border-cyan-100 rounded-full flex items-center justify-center font-bold text-lg group-hover:bg-cyan-100 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
                {student.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-slate-900">{student.name}</h3>
                </div>
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-end space-y-2">
              <div className="text-right">
                <div className="text-xl font-bold text-cyan-600">{student.remainingClasses}</div>
                <div className="text-[10px] text-slate-400">剩餘堂數</div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenewingStudent(student);
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-bold active:scale-95 transition-transform hover:bg-emerald-100"
                >
                  <span>🔄 續課</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSchedulingStudent(student);
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-xs font-bold active:scale-95 transition-transform hover:bg-blue-100"
                >
                  <span>📅 排課</span>
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredStudents.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <div className="text-5xl mb-3 opacity-50">👥</div>
            <p>找不到學員</p>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-xl w-full max-w-lg rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh] relative no-scrollbar shadow-[0_0_60px_rgba(0,0,0,0.2)]"
          >
            {/* Ambient Background Glows inside modal */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
              <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] rounded-full bg-cyan-400/20 blur-[80px]" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] rounded-full bg-blue-400/10 blur-[80px]" />
            </div>

            <div className="p-6 pb-4 border-b border-slate-200/50 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-cyan-50 text-cyan-600 border border-cyan-100 rounded-full flex items-center justify-center font-bold">
                  {viewingStudent.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{viewingStudent.name}</h2>
                  <p className="text-sm text-slate-500">剩餘 {viewingStudent.remainingClasses} 堂課</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    setEditStudentName(viewingStudent.name);
                    setIsEditingStudent(true);
                  }}
                  className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  ✏️
                </button>
                <button onClick={() => {
                  setViewingStudent(null);
                  setRecordTab('scheduled');
                }} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
                  ❌
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 relative z-10">
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button
                  onClick={() => setRecordTab('scheduled')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    recordTab === 'scheduled' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  已約課
                </button>
                <button
                  onClick={() => setRecordTab('completed')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    recordTab === 'completed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  已完成
                </button>
              </div>
              
              <div className="space-y-3">
                {(() => {
                  const studentRecords = getStudentRecords(viewingStudent.name);
                  const filteredRecords = studentRecords.filter(r => 
                    recordTab === 'completed' ? r.status === 'completed' : r.status !== 'completed'
                  );
                  
                  if (filteredRecords.length === 0) {
                    return (
                      <div className="text-center py-10 text-slate-400">
                        <div className="text-5xl mb-3 opacity-50">📅</div>
                        <p>{recordTab === 'completed' ? '尚無已完成課程' : '目前無預約課程'}</p>
                      </div>
                    );
                  }
                  
                  return filteredRecords.map((record) => (
                    <div 
                      key={record.id} 
                      onClick={() => setViewingRecordId(record.id)}
                      className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.05)] border border-cyan-100/50 cursor-pointer active:scale-95 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:border-cyan-300 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-transparent transition-all duration-300" />
                      <div className="relative z-10 flex justify-between items-start mb-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">{record.time}</div>
                          <div className="text-xs text-slate-500">{record.date}</div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <div className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider border ${record.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                            {record.status === 'completed' ? '已完成' : '待簽名'}
                          </div>
                        </div>
                      </div>
                      
                      {record.status === 'completed' && record.signedAt && (
                        <div className="relative z-10 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center">
                          <span>簽名時間：</span>
                          <span className="font-medium text-slate-600">{new Date(record.signedAt).toLocaleString('zh-TW', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })}</span>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-8 w-full max-w-[320px] shadow-2xl text-center no-scrollbar"
          >
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 border border-red-100">
              ⚠️
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">確認刪除學員？</h3>
            <p className="text-sm text-slate-500 mb-6">
              您即將刪除 <span className="font-bold text-slate-900">{viewingStudent?.name}</span> 的所有資料，此操作不可撤銷。
            </p>
            <div className="space-y-2">
              <button 
                onClick={handleDelete}
                className="w-full py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 active:scale-95 transition-all"
              >
                確認刪除
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl active:scale-95 transition-all"
              >
                取消
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar shadow-[0_0_60px_rgba(0,0,0,0.2)]"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">新增學員</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
                ❌
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={newStudent.name}
                    onChange={e => {
                      setNewStudent({...newStudent, name: e.target.value});
                      if (formError) setFormError(null);
                    }}
                    className={`w-full bg-white/80 border ${formError ? 'border-red-400 focus:ring-red-500' : 'border-slate-200/60 focus:border-cyan-500 focus:ring-cyan-500'} rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-1 outline-none transition-all shadow-sm`}
                    placeholder="例如：王小明"
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">購買堂數</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[12, 24, 36].map((classes) => (
                      <button
                        key={classes}
                        type="button"
                        onClick={() => setNewStudent({...newStudent, totalClasses: classes, remainingClasses: classes})}
                        className={`py-3 rounded-xl font-bold text-sm transition-all ${
                          newStudent.totalClasses === classes
                            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {classes} 堂
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">剩餘堂數 (可手動調整)</label>
                  <input 
                    type="number" 
                    value={newStudent.remainingClasses}
                    onChange={e => setNewStudent({...newStudent, remainingClasses: parseInt(e.target.value) || 0})}
                    className="w-full bg-white/80 border border-slate-200/60 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>
              
              <button 
                type="submit"
                className="w-full bg-cyan-500 text-white font-bold rounded-xl py-4 mt-6 active:scale-95 transition-transform shadow-lg shadow-cyan-500/30 hover:bg-cyan-400"
              >
                建立學員檔案
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Schedule Class Modal */}
      {schedulingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar shadow-[0_0_60px_rgba(0,0,0,0.2)] relative"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">預約課程</h2>
                <p className="text-sm text-slate-500 mt-1">為 <span className="font-bold text-cyan-600">{schedulingStudent.name}</span> 排課</p>
              </div>
              <button onClick={() => setSchedulingStudent(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSchedule} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">日期</label>
                  <button 
                    type="button"
                    onClick={() => setShowInlineDatePicker(true)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 flex items-center justify-between text-left shadow-sm hover:border-cyan-500 transition-colors"
                  >
                    <span className="font-medium text-slate-700">{scheduleData.date.replace(/-/g, '/')}</span>
                    <span className="text-cyan-600">📅</span>
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">時間</label>
                  <button 
                    type="button"
                    onClick={() => setShowInlineTimePicker(true)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 flex items-center justify-between text-left shadow-sm hover:border-cyan-500 transition-colors"
                  >
                    <span className="font-medium text-slate-700">{scheduleData.time}</span>
                    <span className="text-cyan-600">🕒</span>
                  </button>
                </div>
              </div>
              
              <button 
                type="submit"
                className="w-full bg-cyan-500 text-white font-bold rounded-xl py-4 mt-6 active:scale-95 transition-transform shadow-lg shadow-cyan-500/30 hover:bg-cyan-400"
              >
                確認預約
              </button>
            </form>

            {/* Inline Date Picker Overlay */}
            <AnimatePresence>
              {showInlineDatePicker && (
                <motion.div 
                  initial={{ opacity: 0, x: '100%' }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: '100%' }}
                  className="absolute inset-0 z-20 bg-white p-3 flex flex-col"
                >
                  <div className="flex justify-between items-center mb-2 mt-1">
                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400">⬅️</button>
                    <div className="font-bold text-base text-slate-800">
                      {viewDate.getFullYear()}年 {monthNames[viewDate.getMonth()]}
                    </div>
                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400">➡️</button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 mb-0.5">
                    {weekDays.map(day => (
                      <div key={day} className="h-6 flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 flex-1">
                    {(() => {
                      const year = viewDate.getFullYear();
                      const month = viewDate.getMonth();
                      const days = daysInMonth(year, month);
                      const firstDay = firstDayOfMonth(year, month);
                      const calendarDays = [];
                      
                      for (let i = 0; i < firstDay; i++) {
                        calendarDays.push(<div key={`empty-${i}`} className="h-8" />);
                      }
                      
                      for (let d = 1; d <= days; d++) {
                        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                        const isSelected = scheduleData.date === dateStr;
                        
                        const date = new Date(year, month, d);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isPast = date < today;

                        calendarDays.push(
                          <div
                            key={d}
                            onClick={() => {
                              if (isPast) return;
                              setScheduleData({...scheduleData, date: dateStr});
                              setShowInlineDatePicker(false);
                            }}
                            className={`h-8 flex items-center justify-center rounded-xl text-sm transition-all ${
                              isPast ? 'text-slate-200 cursor-not-allowed' :
                              isSelected ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 font-bold cursor-pointer' : 'hover:bg-slate-50 text-slate-600 cursor-pointer'
                            }`}
                          >
                            {d}
                          </div>
                        );
                      }
                      return calendarDays;
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inline Time Picker Overlay */}
            <AnimatePresence>
              {showInlineTimePicker && (
                <motion.div 
                  initial={{ opacity: 0, x: '100%' }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: '100%' }}
                  className="absolute inset-0 z-20 bg-white p-8 flex flex-col"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">選擇時間</h3>
                    <button onClick={() => setShowInlineTimePicker(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col min-h-0 py-4">
                    <div className="flex gap-4 mb-2">
                      <div className="flex-1 text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest">時</div>
                      <div className="w-2" />
                      <div className="flex-1 text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest">分</div>
                    </div>
                    
                    <div className="flex-1 flex gap-4 min-h-0 relative h-64">
                      {/* Gradient Masks - reduced opacity to keep text dark and visible */}
                      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/80 via-white/30 to-transparent pointer-events-none z-20" />
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/80 via-white/30 to-transparent pointer-events-none z-20" />
                      
                      {/* Hours Column */}
                      <div 
                        ref={hourScrollRef}
                        className="flex-1 overflow-y-auto no-scrollbar rounded-3xl border border-slate-100 bg-slate-50/50 snap-y snap-mandatory relative z-10 scroll-smooth"
                      >
                        <div className="h-[108px]" />
                        {hours.map(hour => {
                          const isSelected = scheduleData.time.split(':')[0] === hour;
                          const now = new Date();
                          const isToday = scheduleData.date === now.toISOString().split('T')[0];
                          const currentHour = now.getHours();
                          const isPast = isToday && parseInt(hour) < currentHour;

                          return (
                            <div
                              key={hour}
                              onClick={(e) => {
                                if (isPast) return;
                                setScheduleData({...scheduleData, time: `${hour}:${scheduleData.time.split(':')[1]}`});
                                (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              className={`h-12 flex items-center justify-center transition-all text-xl font-bold snap-center mx-2 rounded-xl ${
                                isPast ? 'text-slate-200 cursor-not-allowed' :
                                isSelected ? 'bg-blue-600 text-white shadow-md scale-110' : 'text-black hover:text-blue-700 cursor-pointer'
                              }`}
                            >
                              {hour}
                            </div>
                          );
                        })}
                        <div className="h-[108px]" />
                      </div>

                      <div className="flex items-center text-black font-bold text-2xl z-10">:</div>

                      {/* Minutes Column */}
                      <div 
                        ref={minuteScrollRef}
                        className="flex-1 overflow-y-auto no-scrollbar rounded-3xl border border-slate-100 bg-slate-50/50 snap-y snap-mandatory relative z-10 scroll-smooth"
                      >
                        <div className="h-[108px]" />
                        {minutes.map(minute => {
                          const isSelected = scheduleData.time.split(':')[1] === minute;
                          const now = new Date();
                          const isToday = scheduleData.date === now.toISOString().split('T')[0];
                          const currentHour = now.getHours();
                          const currentMinute = now.getMinutes();
                          const selectedHour = scheduleData.time.split(':')[0];
                          const isPast = isToday && parseInt(selectedHour) === currentHour && parseInt(minute) <= currentMinute;

                          return (
                            <div
                              key={minute}
                              onClick={(e) => {
                                if (isPast) return;
                                setScheduleData({...scheduleData, time: `${scheduleData.time.split(':')[0]}:${minute}`});
                                (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              className={`h-12 flex items-center justify-center transition-all text-xl font-bold snap-center mx-2 rounded-xl ${
                                isPast ? 'text-slate-200 cursor-not-allowed' :
                                isSelected ? 'bg-blue-600 text-white shadow-md scale-110' : 'text-black hover:text-blue-700 cursor-pointer'
                              }`}
                            >
                              {minute}
                            </div>
                          );
                        })}
                        <div className="h-[108px]" />
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setShowInlineTimePicker(false)}
                    className="w-full mt-6 py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 active:scale-95 transition-transform"
                  >
                    確認時間
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* Renew Classes Modal */}
      {renewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar shadow-[0_0_60px_rgba(0,0,0,0.2)]"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">學員續課</h2>
                <p className="text-sm text-slate-500 mt-1">為 <span className="font-bold text-emerald-600">{renewingStudent.name}</span> 增加堂數</p>
              </div>
              <button onClick={() => setRenewingStudent(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
                ❌
              </button>
            </div>
            
            <form onSubmit={handleRenew} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">購買堂數</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={renewAmount}
                    onChange={e => {
                      setRenewAmount(parseInt(e.target.value) || 0);
                      if (formError) setFormError(null);
                    }}
                    className={`w-full bg-white/80 border ${formError ? 'border-red-400 focus:ring-red-500' : 'border-slate-200/60 focus:border-emerald-500 focus:ring-emerald-500'} rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:ring-1 outline-none transition-all shadow-sm`}
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
                  <span className="font-medium text-slate-900">{renewingStudent.remainingClasses} 堂</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">新增堂數</span>
                  <span className="font-medium text-emerald-600">+{renewAmount} 堂</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200">
                  <span className="text-slate-700">續課後總剩餘</span>
                  <span className="text-emerald-600">{renewingStudent.remainingClasses + renewAmount} 堂</span>
                </div>
              </div>
              
              <button 
                type="submit"
                className="w-full bg-emerald-500 text-white font-bold rounded-xl py-4 mt-6 active:scale-95 transition-transform shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
              >
                確認續課
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {viewingRecordId && viewingRecord && (
        <ViewRecordModal
          record={viewingRecord}
          onClose={() => setViewingRecordId(null)}
          onUpdate={onUpdateRecord}
        />
      )}
    </div>
  );
}
