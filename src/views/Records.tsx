import { useState } from 'react';
import { motion } from 'motion/react';
import { ClassRecord } from '../types';
import SigningModal from '../components/SigningModal';
import ViewRecordModal from '../components/ViewRecordModal';

interface RecordsProps {
  records: ClassRecord[];
  onSignRecord: (id: string, coachSig: string, studentSig: string) => void;
  onUpdateRecord: (id: string, date: string, time: string) => void;
}

export default function Records({ records, onSignRecord, onUpdateRecord }: RecordsProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'scheduled' | 'completed'>('scheduled');
  const [signingRecord, setSigningRecord] = useState<ClassRecord | null>(null);
  const [viewingRecordId, setViewingRecordId] = useState<string | null>(null);

  const viewingRecord = records.find(r => r.id === viewingRecordId);

  // Sort records by date and time descending
  const sortedRecords = [...records].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateB.getTime() - dateA.getTime();
  });

  const filteredRecords = sortedRecords.filter(r => 
    r.status === activeTab &&
    r.studentName.includes(search)
  );

  const handleSign = (id: string, coachSig: string, studentSig: string) => {
    onSignRecord(id, coachSig, studentSig);
    setSigningRecord(null);
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="p-5 pb-0 bg-white/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/50">
        <div className="flex justify-between items-center mb-4 pt-4">
          <h1 className="text-2xl font-bold text-slate-900">課程紀錄</h1>
        </div>
        
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

        <div className="flex space-x-4 border-b border-slate-200/50">
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
            onClick={() => setActiveTab('completed')}
            className={`pb-3 text-sm font-bold relative ${activeTab === 'completed' ? 'text-cyan-600' : 'text-slate-400 hover:text-slate-500'}`}
          >
            已完成
            {activeTab === 'completed' && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <div className="text-5xl mb-3 opacity-50">📅</div>
            <p>目前無{activeTab === 'scheduled' ? '待簽課' : '已完成'}紀錄</p>
          </div>
        ) : (
          filteredRecords.map((record, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={record.id} 
              onClick={() => activeTab === 'scheduled' ? setSigningRecord(record) : setViewingRecordId(record.id)}
              className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.05)] border border-cyan-100/50 cursor-pointer active:scale-95 transition-all hover:bg-white hover:shadow-[0_0_25px_rgba(6,182,212,0.2)] hover:border-cyan-200 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-transparent transition-all duration-500" />
              <div className="relative z-10 flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border transition-all ${activeTab === 'scheduled' ? 'bg-slate-50 text-slate-500 border-slate-200 group-hover:bg-cyan-50 group-hover:text-cyan-600 group-hover:border-cyan-100' : 'bg-cyan-50 text-cyan-600 border-cyan-100 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]'}`}>
                    {record.studentName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{record.studentName}</h3>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end space-y-2">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{record.date}</div>
                    <div className="text-xs text-slate-500">{record.time}</div>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  {activeTab === 'scheduled' ? '點擊進行簽課' : `簽名時間：${new Date(record.signedAt || record.createdAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
                </span>
                <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider border ${activeTab === 'scheduled' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-cyan-50 text-cyan-600 border-cyan-100'}`}>
                  {activeTab === 'scheduled' ? '待簽名' : '已完成'}
                </span>
              </div>
            </motion.div>
          ))
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
