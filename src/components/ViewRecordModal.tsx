import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClassRecord } from '../types';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';

interface ViewRecordModalProps {
  record: ClassRecord;
  onClose: () => void;
  onUpdate?: (id: string, date: string, time: string) => void;
  onCancelRecord?: (id: string) => void;
}

export default function ViewRecordModal({ record, onClose, onUpdate, onCancelRecord }: ViewRecordModalProps) {
  if (!record) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState(record.date);
  const [editTime, setEditTime] = useState(record.time);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    setEditDate(record.date);
    setEditTime(record.time);
  }, [record.date, record.time]);

  const getValidFutureTime = (dateStr: string, currentTime: string) => {
    const now = new Date();
    const isToday = dateStr === now.toISOString().split('T')[0];
    if (!isToday) return currentTime;
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const [h, m] = currentTime.split(':').map(Number);
    
    if (h < currentHour || (h === currentHour && m <= currentMinute)) {
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
    const validTime = getValidFutureTime(editDate, editTime);
    if (validTime !== editTime) {
      setEditTime(validTime);
    }
  }, [editDate]);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(record.id, editDate, editTime);
      onClose(); // Close the modal to return to the list
    }
  };

  const isScheduled = record.status !== 'completed';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 pb-24 sm:p-6 sm:pb-24">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-[2rem] flex flex-col max-h-[75vh] shadow-[0_0_60px_rgba(0,0,0,0.2)] relative overflow-hidden"
      >
        <div className="p-6 flex flex-col flex-1 overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h2 className="text-lg font-bold text-slate-900">{isEditing ? '編輯課程時間' : '課程資訊'}</h2>
            <div className="flex items-center space-x-2">
              <button onClick={onClose} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                ❌
              </button>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <div 
                  onClick={() => setShowDatePicker(true)}
                  className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-cyan-500 transition-colors"
                >
                  <span className="text-sm text-slate-500">日期</span>
                  <span className="font-bold text-slate-900">{editDate}</span>
                </div>
                <div 
                  onClick={() => setShowTimePicker(true)}
                  className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-cyan-500 transition-colors"
                >
                  <span className="text-sm text-slate-500">時間</span>
                  <span className="font-bold text-slate-900">{editTime}</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 w-full">
                    <div className="w-9 h-9 bg-cyan-50 text-cyan-600 rounded-full flex items-center justify-center font-bold border border-cyan-100 shrink-0 text-sm">
                      {record?.studentName?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-slate-900">{record?.studentName}</h3>
                      <div className="flex flex-col text-[11px] text-slate-500 space-y-1 mt-2">
                        <span className="flex items-center">
                          <span className="mr-1.5 opacity-70">📅</span> 
                          <span className="font-medium text-slate-700">{record?.date}</span>
                        </span>
                        <span className="flex items-center">
                          <span className="mr-1.5 opacity-70">🕒</span> 
                          <span className="font-medium text-slate-700">{record?.time}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isEditing && !isScheduled && (
              <div className="space-y-3 mt-4">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">學員確認</h4>
                    <div className="bg-white rounded-xl h-16 border border-slate-200/60 flex items-center justify-center overflow-hidden relative shadow-sm p-1">
                      {record?.studentSignature ? (
                        record.studentSignature.startsWith('data:image') ? (
                          <img src={record.studentSignature} alt="Student Signature" className="h-full object-contain" />
                        ) : (
                          <span className="text-slate-700 font-medium text-xs">{record.studentSignature}</span>
                        )
                      ) : (
                        <span className="text-slate-300 text-[11px]">無紀錄</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">教練確認</h4>
                    <div className="bg-white rounded-xl h-16 border border-slate-200/60 flex items-center justify-center overflow-hidden relative shadow-sm p-1">
                      {record?.coachSignature ? (
                        record.coachSignature.startsWith('data:image') ? (
                          <img src={record.coachSignature} alt="Coach Signature" className="h-full object-contain" />
                        ) : (
                          <span className="text-slate-700 font-medium text-xs">{record.coachSignature}</span>
                        )
                      ) : (
                        <span className="text-slate-300 text-[11px]">無紀錄</span>
                      )}
                    </div>
                  </div>
                </div>
                {record?.signedAt && (
                  <div className="text-[10px] text-slate-400 text-right px-1">
                    簽名時間: {new Date(record.signedAt).toLocaleString('zh-TW')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Buttons Area (Bottom) */}
          {isEditing ? (
            <div className="mt-4 pt-4 border-t border-slate-200 flex space-x-3 shrink-0">
              <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200"
              >
                取消
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-3 bg-cyan-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-cyan-500/20"
              >
                儲存
              </button>
            </div>
          ) : isScheduled && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex space-x-3 shrink-0">
              <button 
                onClick={() => setShowCancelConfirm(true)}
                className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100"
              >
                取消課程
              </button>
              <button 
                onClick={() => setIsEditing(true)}
                className="flex-1 py-3 bg-cyan-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-cyan-500/20"
              >
                編輯
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Pickers Overlays */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pb-24 sm:p-6 sm:pb-24"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl text-center"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-2">確認取消課程？</h3>
              <p className="text-sm text-slate-500 mb-6">此操作無法復原，確定要取消此課程安排嗎？</p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl"
                >
                  返回
                </button>
                <button 
                  onClick={async () => {
                    try {
                      const { doc, deleteDoc, getFirestore } = await import('firebase/firestore');
                      const db = getFirestore();
                      await deleteDoc(doc(db, 'records', record.id));
                      console.log("課程已成功刪除");
                      
                      onClose();
                      
                      if (onCancelRecord) {
                        onCancelRecord(record.id);
                      }
                    } catch (error) {
                      console.error("刪除失敗:", error);
                      alert(`刪除失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
                      setShowCancelConfirm(false);
                    }
                  }}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20"
                >
                  確認取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {showDatePicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pb-24 sm:p-6 sm:pb-24"
          >
            <CustomDatePicker 
              value={editDate} 
              onChange={setEditDate} 
              onClose={() => setShowDatePicker(false)} 
            />
          </motion.div>
        )}
        {showTimePicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pb-24 sm:p-6 sm:pb-24"
          >
            <CustomTimePicker 
              value={editTime} 
              date={editDate}
              onChange={setEditTime} 
              onClose={() => setShowTimePicker(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
