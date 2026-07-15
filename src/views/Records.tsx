import { useState } from 'react';
import { motion } from 'motion/react';
import { ClassRecord } from '../types';
import SigningModal from '../components/SigningModal';
import ViewRecordModal from '../components/ViewRecordModal';
import { getRecordDisplayStatus, getStatusLabel, getStatusColorClass, formatDateWithWeekday, formatDateTimeWithWeekday } from '../utils/recordUtils';

interface RecordsProps {
  records: ClassRecord[];
  onSignRecord: (id: string, coachSig: string, studentSig: string) => void;
  onUpdateRecord: (id: string, date: string, time: string) => void;
}

export default function Records({ records, onSignRecord, onUpdateRecord }: RecordsProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'scheduled' | 'unsigned' | 'completed' | 'stats'>('scheduled');
  const [signingRecord, setSigningRecord] = useState<ClassRecord | null>(null);
  const [viewingRecordId, setViewingRecordId] = useState<string | null>(null);

  const classRecords = records.filter(r => r.type !== 'custom');

  const viewingRecord = classRecords.find(r => r.id === viewingRecordId);

  const filteredRecords = [...classRecords].filter(r => {
    const displayStatus = getRecordDisplayStatus(r);
    const matchesSearch = r.studentName.includes(search);
    
    if (activeTab === 'scheduled') return displayStatus === 'scheduled' && matchesSearch;
    if (activeTab === 'unsigned') return displayStatus === 'late_pending' && matchesSearch;
    if (activeTab === 'completed') return displayStatus === 'completed' && matchesSearch;
    return false;
  }).sort((a, b) => {
    const timeA = new Date(`${a.date}T${a.time}`).getTime();
    const timeB = new Date(`${b.date}T${b.time}`).getTime();
    return activeTab === 'completed' ? timeB - timeA : timeA - timeB;
  });

  const handleSign = (id: string, coachSig: string, studentSig: string) => {
    onSignRecord(id, coachSig, studentSig);
    setSigningRecord(null);
  };

  const renderStats = () => {
    const startYear = 2026;
    const startMonth = 4;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const months: string[] = [];
    let y = startYear;
    let m = startMonth;
    while (y < currentYear || (y === currentYear && m <= currentMonth)) {
      months.unshift(`${y}-${m.toString().padStart(2, '0')}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }

    return (
      <div className="space-y-3">
        {months.map(monthStr => {
          const count = classRecords.filter(r => r.date.startsWith(monthStr) && getRecordDisplayStatus(r) === 'completed').length;
          const [year, month] = monthStr.split('-');
          return (
            <motion.div 
              key={monthStr}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center"
            >
              <div className="font-semibold text-slate-800 text-lg">
                {year}年{month}月
              </div>
              <div className="text-cyan-600 font-bold text-xl">
                {count} 堂
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'scheduled': return '目前無待簽課紀錄';
      case 'unsigned': return '目前無未簽名紀錄';
      case 'completed': return '目前無已完成紀錄';
      default: return '目前無紀錄';
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="p-5 pb-0 bg-white/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/50">
        <div className="flex justify-between items-center mb-4 pt-4">
          <h1 className="text-2xl font-bold text-slate-900">課程紀錄</h1>
        </div>
        
        {activeTab !== 'stats' && (
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text"
              placeholder="搜尋學員..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/80 border border-slate-200/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none shadow-sm"
            />
          </div>
        )}

        <div className="flex justify-between border-b border-slate-200/50">
          <div className="flex space-x-4">
            <button 
              onClick={() => setActiveTab('scheduled')}
              className={`pb-3 text-sm font-bold relative ${activeTab === 'scheduled' ? 'text-cyan-600' : 'text-slate-400 hover:text-slate-500'}`}
            >
              待簽課
              {activeTab === 'scheduled' && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('unsigned')}
              className={`pb-3 text-sm font-bold relative ${activeTab === 'unsigned' ? 'text-cyan-600' : 'text-slate-400 hover:text-slate-500'}`}
            >
              未簽名
              {activeTab === 'unsigned' && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('completed')}
              className={`pb-3 text-sm font-bold relative ${activeTab === 'completed' ? 'text-cyan-600' : 'text-slate-400 hover:text-slate-500'}`}
            >
              已完成
              {activeTab === 'completed' && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
              )}
            </button>
          </div>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`pb-3 text-sm font-bold relative ${activeTab === 'stats' ? 'text-cyan-600' : 'text-slate-400 hover:text-slate-500'}`}
          >
            統計
            {activeTab === 'stats' && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {activeTab === 'stats' ? (
          renderStats()
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <div className="text-5xl mb-3 opacity-50">📅</div>
            <p>{getEmptyMessage()}</p>
          </div>
        ) : (
          filteredRecords.map((record, index) => {
            const displayStatus = getRecordDisplayStatus(record);
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={record.id} 
                onClick={() => displayStatus !== 'completed' ? setSigningRecord(record) : setViewingRecordId(record.id)}
                className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.05)] border border-cyan-100/50 cursor-pointer active:scale-95 transition-all hover:bg-white hover:shadow-[0_0_25px_rgba(6,182,212,0.2)] hover:border-cyan-200 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-transparent transition-all duration-500" />
                <div className="relative z-10 flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border transition-all ${displayStatus !== 'completed' ? 'bg-slate-50 text-slate-500 border-slate-200 group-hover:bg-cyan-50 group-hover:text-cyan-600 group-hover:border-cyan-100' : 'bg-cyan-50 text-cyan-600 border-cyan-100 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]'}`}>
                      {record.studentName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{record.studentName}</h3>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end space-y-2">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{formatDateWithWeekday(record.date)}</div>
                      <div className="text-xs text-slate-500">{record.time}</div>
                    </div>
                  </div>
                </div>
                
                <div className="relative z-10 flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400">
                    {displayStatus !== 'completed' ? '點擊進行簽課' : `簽名時間：${formatDateTimeWithWeekday(record.signedAt || record.createdAt)}`}
                  </span>
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider border ${getStatusColorClass(displayStatus)}`}>
                    {getStatusLabel(displayStatus)}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

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
    </div>
  );
}
