import { useState } from 'react';
import { motion } from 'motion/react';
import { ClassRecord } from '../types';
import SignaturePad from './SignaturePad';

interface SigningModalProps {
  record: ClassRecord;
  onClose: () => void;
  onSign: (id: string, coachSig: string, studentSig: string) => void;
}

export default function SigningModal({ record, onClose, onSign }: SigningModalProps) {
  const [coachSig, setCoachSig] = useState('');
  const [studentSig, setStudentSig] = useState('');
  const [activePad, setActivePad] = useState<'coach' | 'student' | null>(null);

  const handleCompleteSign = () => {
    if (!coachSig || !studentSig) return;
    onSign(record.id, coachSig, studentSig);
  };

  const handleSaveSignature = (signature: string) => {
    if (activePad === 'coach') {
      setCoachSig(signature);
    } else if (activePad === 'student') {
      setStudentSig(signature);
    }
    setActivePad(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-[2.5rem] p-8 flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar shadow-[0_0_60px_rgba(0,0,0,0.2)]"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">確認課程簽到</h2>
            <p className="text-sm text-slate-500 mt-1">{record.date} {record.time}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
            ❌
          </button>
        </div>
        
        <div className="py-2 flex flex-col space-y-5">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-cyan-50 rounded-full flex items-center justify-center border border-cyan-100 text-xl">
              ✅
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">學員：{record.studentName}</h3>
              <p className="text-slate-500 text-xs mt-0.5">請完成雙方簽名以扣除堂數</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center">
                教練簽名
              </label>
              <div 
                onClick={() => setActivePad('coach')}
                className="w-full bg-white/80 border border-slate-200/60 rounded-xl py-4 px-4 h-24 text-sm text-slate-400 cursor-pointer hover:bg-white hover:border-cyan-500 transition-all shadow-sm flex items-center justify-center group relative overflow-hidden"
              >
                {coachSig ? (
                  <img src={coachSig} alt="Coach Signature" className="h-full object-contain absolute inset-0 m-auto" />
                ) : (
                  <span>點擊此處進行教練簽名</span>
                )}
                <div className="absolute right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-colors shrink-0">
                  ✏️
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center">
                學員簽名
              </label>
              <div 
                onClick={() => setActivePad('student')}
                className="w-full bg-white/80 border border-slate-200/60 rounded-xl py-4 px-4 h-24 text-sm text-slate-400 cursor-pointer hover:bg-white hover:border-cyan-500 transition-all shadow-sm flex items-center justify-center group relative overflow-hidden"
              >
                {studentSig ? (
                  <img src={studentSig} alt="Student Signature" className="h-full object-contain absolute inset-0 m-auto" />
                ) : (
                  <span>點擊此處進行學員簽名</span>
                )}
                <div className="absolute right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-colors shrink-0">
                  ✏️
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 mt-auto border-t border-slate-100">
          <button 
            onClick={handleCompleteSign}
            disabled={!coachSig || !studentSig}
            className="w-full font-bold rounded-xl py-4 transition-all bg-cyan-600 text-white active:scale-95 shadow-[0_0_20px_rgba(8,145,178,0.2)] hover:bg-cyan-700 disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none disabled:hover:bg-cyan-600"
          >
            確認簽到
          </button>
        </div>
      </motion.div>

      {activePad && (
        <SignaturePad 
          onSave={handleSaveSignature} 
          onClose={() => setActivePad(null)} 
          title={activePad === 'coach' ? "教練簽名" : "學員簽名"}
        />
      )}
    </div>
  );
}
