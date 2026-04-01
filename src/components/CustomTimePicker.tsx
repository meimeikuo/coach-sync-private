import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface CustomTimePickerProps {
  value: string;
  date?: string; // Add optional date prop
  onChange: (time: string) => void;
  onClose: () => void;
}

export default function CustomTimePicker({ value, date, onChange, onClose }: CustomTimePickerProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const [selectedHour, selectedMinute] = (value || '10:00').split(':');
  
  const now = new Date();
  const isToday = date === now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const [h, m] = (value || '10:00').split(':');
    if (hourScrollRef.current) {
      const hourIndex = hours.indexOf(h);
      if (hourIndex !== -1) {
        hourScrollRef.current.scrollTo({ top: hourIndex * 48, behavior: 'auto' });
      }
    }
    if (minuteScrollRef.current) {
      const minuteIndex = minutes.indexOf(m);
      if (minuteIndex !== -1) {
        minuteScrollRef.current.scrollTo({ top: minuteIndex * 48, behavior: 'auto' });
      }
    }
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      className="bg-white p-6 flex flex-col rounded-[2rem] shadow-2xl w-full max-w-[320px]"
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-900">選擇時間</h3>
        <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
          ❌
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 py-4">
        <div className="flex gap-4 mb-2">
          <div className="flex-1 text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest">時</div>
          <div className="w-2" />
          <div className="flex-1 text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest">分</div>
        </div>
        
        <div className="flex-1 flex gap-4 min-h-0 relative h-64">
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/80 via-white/30 to-transparent pointer-events-none z-20" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/80 via-white/30 to-transparent pointer-events-none z-20" />
          
          <div 
            ref={hourScrollRef}
            className="flex-1 overflow-y-auto no-scrollbar rounded-3xl border border-slate-100 bg-slate-50/50 snap-y snap-mandatory relative z-10 scroll-smooth"
          >
            <div className="h-[108px]" />
            {hours.map(hour => {
              const isSelected = selectedHour === hour;
              const isPast = isToday && parseInt(hour) < currentHour;
              return (
                <div
                  key={hour}
                  onClick={(e) => {
                    if (isPast) return;
                    onChange(`${hour}:${selectedMinute}`);
                    (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`h-12 flex items-center justify-center transition-all text-xl font-bold snap-center mx-2 rounded-xl ${
                    isPast ? 'text-slate-100 cursor-not-allowed' :
                    isSelected ? 'bg-cyan-500 text-white shadow-md scale-110' : 'text-slate-400 hover:text-slate-600 cursor-pointer'
                  }`}
                >
                  {hour}
                </div>
              );
            })}
            <div className="h-[108px]" />
          </div>

          <div className="flex items-center text-slate-300 font-bold text-2xl z-10">:</div>

          <div 
            ref={minuteScrollRef}
            className="flex-1 overflow-y-auto no-scrollbar rounded-3xl border border-slate-100 bg-slate-50/50 snap-y snap-mandatory relative z-10 scroll-smooth"
          >
            <div className="h-[108px]" />
            {minutes.map(minute => {
              const isSelected = selectedMinute === minute;
              const isPast = isToday && parseInt(selectedHour) === currentHour && parseInt(minute) <= currentMinute;
              return (
                <div
                  key={minute}
                  onClick={(e) => {
                    if (isPast) return;
                    onChange(`${selectedHour}:${minute}`);
                    (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`h-12 flex items-center justify-center transition-all text-xl font-bold snap-center mx-2 rounded-xl ${
                    isPast ? 'text-slate-100 cursor-not-allowed' :
                    isSelected ? 'bg-cyan-500 text-white shadow-md scale-110' : 'text-slate-400 hover:text-slate-600 cursor-pointer'
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
        onClick={onClose}
        className="w-full mt-6 py-4 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 transition-colors shadow-xl shadow-slate-900/20"
      >
        確認時間
      </button>
    </motion.div>
  );
}
