import { useState } from 'react';
import { motion } from 'motion/react';
import { Student, ClassRecord } from '../types';
import SigningModal from '../components/SigningModal';
import ViewRecordModal from '../components/ViewRecordModal';
import QuickBookingModal from '../components/QuickBookingModal';
import EditLessonModal from '../components/EditLessonModal';

interface DashboardProps {
  students: Student[];
  records: ClassRecord[];
  onNavigate: (tab: any) => void;
  onSignRecord: (id: string, coachSig: string, studentSig: string) => void;
  onUpdateRecord: (id: string, date: string, time: string) => void;
  onScheduleClass: (recordData: Omit<ClassRecord, 'id' | 'createdAt' | 'status'>) => void;
  onAddStudentClick?: () => void;
}

export default function Dashboard({ students, records, onNavigate, onSignRecord, onUpdateRecord, onScheduleClass, onAddStudentClick }: DashboardProps) {
  const [signingRecord, setSigningRecord] = useState<ClassRecord | null>(null);
  const [viewingRecordId, setViewingRecordId] = useState<string | null>(null);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showQuickBookingModal, setShowQuickBookingModal] = useState(false);
  const [showEditLessonModal, setShowEditLessonModal] = useState(false);

  const viewingRecord = records.find(r => r.id === viewingRecordId);
  const now = new Date();
  const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const todayRecords = records.filter(r => r.date === today);

  const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`; // YYYY-MM
  const monthRecords = records.filter(r => r.date.startsWith(currentMonth));

  const handleSign = (id: string, coachSig: string, studentSig: string) => {
    onSignRecord(id, coachSig, studentSig);
    setSigningRecord(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 space-y-6 h-full overflow-y-auto"
    >
      <header className="pt-4 pb-2">
        <h1 className="text-2xl font-bold text-slate-900">Jason Huang 黃文新 💪🏻</h1>
        <p className="text-sm text-slate-500 mt-1">今天有 {todayRecords.length} 堂課</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-cyan-100/50 shadow-[0_0_15px_rgba(6,182,212,0.05)] relative overflow-hidden group hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:border-cyan-200 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-transparent transition-all duration-500" />
          <div className="relative z-10 flex items-center space-x-2 text-cyan-600 mb-2">
            <span className="text-lg">👥</span>
            <span className="font-medium text-sm">活躍學員</span>
          </div>
          <div className="relative z-10 text-3xl font-bold text-slate-900">{students.length}</div>
        </div>
        <div 
          onClick={() => setShowMonthModal(true)}
          className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-blue-100/50 shadow-[0_0_15px_rgba(59,130,246,0.05)] relative overflow-hidden group hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] hover:border-blue-200 transition-all cursor-pointer active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-transparent transition-all duration-500" />
          <div className="relative z-10 flex items-center space-x-2 text-blue-600 mb-2">
            <span className="text-lg">📈</span>
            <span className="font-medium text-sm">本月上課</span>
          </div>
          <div className="relative z-10 text-3xl font-bold text-slate-900">{records.filter(r => r.status === 'completed' && r.date.startsWith(currentMonth)).length}</div>
          <div className="relative z-10 text-[10px] text-blue-400 mt-1 flex items-center">
            點擊查看明細 ➡️
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">快速操作</h2>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => onAddStudentClick ? onAddStudentClick() : onNavigate('students')}
            className="flex flex-col items-center justify-center bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.05)] border border-cyan-100/50 active:scale-95 transition-all hover:bg-white hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-cyan-200 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-transparent transition-all duration-500" />
            <div className="relative z-10 w-12 h-12 bg-white text-cyan-600 rounded-full flex items-center justify-center mb-2 border border-cyan-100 group-hover:bg-cyan-50 transition-colors text-2xl font-bold">
              +
            </div>
            <span className="relative z-10 text-sm font-medium text-slate-700">新增學員</span>
          </button>
          <button 
            onClick={() => setShowQuickBookingModal(true)}
            className="flex flex-col items-center justify-center bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.05)] border border-cyan-100/50 active:scale-95 transition-all hover:bg-white hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-cyan-200 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-transparent transition-all duration-500" />
            <div className="relative z-10 w-12 h-12 bg-white text-cyan-600 rounded-full flex items-center justify-center mb-2 border border-cyan-100 group-hover:bg-cyan-50 transition-colors text-2xl font-bold">
              💪🏻
            </div>
            <span className="relative z-10 text-sm font-medium text-slate-700">快速約課</span>
          </button>
          <button 
            onClick={() => setShowEditLessonModal(true)}
            className="flex flex-col items-center justify-center bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.05)] border border-cyan-100/50 active:scale-95 transition-all hover:bg-white hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-cyan-200 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-transparent transition-all duration-500" />
            <div className="relative z-10 w-12 h-12 bg-white text-cyan-600 rounded-full flex items-center justify-center mb-2 border border-cyan-100 group-hover:bg-cyan-50 transition-colors text-2xl font-bold">
              ✏️
            </div>
            <span className="relative z-10 text-sm font-medium text-slate-700">編輯課程</span>
          </button>
          <button 
            onClick={() => onNavigate('records')}
            className="flex flex-col items-center justify-center bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-[0_0_15px_rgba(168,85,247,0.05)] border border-purple-100/50 active:scale-95 transition-all hover:bg-white hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:border-purple-200 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-transparent transition-all duration-500" />
            <div className="relative z-10 w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-2 border border-purple-100 group-hover:bg-purple-100 transition-colors text-2xl">
              📅
            </div>
            <span className="relative z-10 text-sm font-medium text-slate-700">查看紀錄</span>
          </button>
        </div>
      </div>

      {showQuickBookingModal && (
        <QuickBookingModal
          students={students}
          onBook={(studentId, date, time) => {
            const student = students.find(s => s.id === studentId);
            if (student) {
              onScheduleClass({ studentName: student.name, date, time });
            }
            setShowQuickBookingModal(false);
          }}
          onClose={() => setShowQuickBookingModal(false)}
        />
      )}

      {showEditLessonModal && (
        <EditLessonModal
          records={records}
          onUpdate={(id, date, time) => {
            onUpdateRecord(id, date, time);
            setShowEditLessonModal(false);
          }}
          onClose={() => setShowEditLessonModal(false)}
        />
      )}

      {/* Today's Classes */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">今日課程</h2>
          <button onClick={() => onNavigate('records')} className="text-sm text-cyan-600 font-medium flex items-center hover:text-cyan-700">
            全部 ➡️
          </button>
        </div>
        
        <div className="space-y-3">
          {todayRecords.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 text-center border border-slate-200/50">
              <p className="text-slate-500 text-sm">今日目前無課程紀錄</p>
            </div>
          ) : (
            todayRecords.map(record => (
              <div 
                key={record.id} 
                onClick={() => record.status === 'scheduled' && setSigningRecord(record)}
                className={`bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.05)] border border-cyan-100/50 flex justify-between items-center relative overflow-hidden group ${record.status === 'scheduled' ? 'cursor-pointer active:scale-95 transition-all hover:bg-white hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-cyan-200' : ''}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-transparent transition-all duration-500" />
                <div className="relative z-10 flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border transition-colors ${record.status === 'completed' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' : 'bg-slate-50 text-slate-500 border-slate-200 group-hover:bg-cyan-50 group-hover:text-cyan-600 group-hover:border-cyan-100'}`}>
                    {record.studentName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{record.studentName}</h3>
                    <p className="text-xs text-slate-500">{record.time}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <div className={`px-3 py-1 text-[10px] font-bold rounded-full border ${record.status === 'completed' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {record.status === 'completed' ? '已簽到' : '未簽到'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Month Records Modal */}
      {showMonthModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl w-full h-[80vh] max-w-md rounded-3xl flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">本月課程明細</h2>
                <p className="text-sm text-slate-500 mt-1">{new Date().getFullYear()}年{new Date().getMonth() + 1}月</p>
              </div>
              <button onClick={() => setShowMonthModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
                ❌
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/30">
              {monthRecords.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <div className="text-5xl mb-3 opacity-50">📅</div>
                  <p>本月尚無課程紀錄</p>
                </div>
              ) : (
                [...monthRecords].sort((a, b) => b.date.localeCompare(a.date)).map(record => (
                  <div 
                    key={record.id}
                    onClick={() => {
                      setShowMonthModal(false);
                      setViewingRecordId(record.id);
                    }}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer active:scale-95 transition-all hover:border-cyan-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${record.status === 'completed' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {record.studentName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{record.studentName}</h3>
                        <p className="text-[10px] text-slate-500">{record.date} {record.time}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className={`px-2 py-1 text-[10px] font-bold rounded-md border ${record.status === 'completed' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {record.status === 'completed' ? '已完成' : '待簽名'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

      {signingRecord && (
        <SigningModal 
          record={signingRecord} 
          onClose={() => setSigningRecord(null)} 
          onSign={handleSign} 
        />
      )}

      {viewingRecordId && viewingRecord && (
        <ViewRecordModal
          record={viewingRecord}
          onClose={() => setViewingRecordId(null)}
          onUpdate={onUpdateRecord}
        />
      )}
    </motion.div>
  );
}
