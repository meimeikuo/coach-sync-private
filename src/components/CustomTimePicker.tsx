import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';

interface CustomTimePickerProps {
  value: string;
  date?: string; // Add optional date prop
  onChange: (time: string) => void;
  onClose: () => void;
}

export default function CustomTimePicker({ value, date, onChange, onClose }: CustomTimePickerProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const [selectedHour, setSelectedHour] = useState((value || '10:00').split(':')[0]);
  const [selectedMinute, setSelectedMinute] = useState((value || '10:00').split(':')[1]);
  
  const now = new Date();
  const isToday = date === now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hourScrollRef.current) {
      const hourIndex = hours.indexOf(selectedHour);
      if (hourIndex !== -1) {
        hourScrollRef.current.scrollTo({ top: hourIndex * 48, behavior: 'auto' });
      }
    }
    if (minuteScrollRef.current) {
      const minuteIndex = minutes.indexOf(selectedMinute);
      if (minuteIndex !== -1) {
        minuteScrollRef.current.scrollTo({ top: minuteIndex * 48, behavior: 'auto' });
      }
    }
  }, []);

  const handleConfirm = () => {
    onChange(`${selectedHour}:${selectedMinute}`);
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white p-6 flex flex-col rounded-2xl shadow-lg w-full max-w-[320px] h-auto"
    >
      <div className="flex justify-center items-center mb-6">
        <h3 className="text-xl font-bold text-cyan-600">選擇時間</h3>
      </div>

      <div className="flex-1 flex flex-col min-h-0 py-2">
        <div className="flex gap-4 mb-2 px-8">
          <div className="flex-1 text-sm text-slate-600 text-center">時</div>
          <div className="w-4" />
          <div className="flex-1 text-sm text-slate-600 text-center">分</div>
        </div>
        
        <div className="flex justify-center">
          <div className="flex gap-4 relative h-48 w-48">
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-20" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-20" />
            
            <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-12 bg-cyan-50 rounded-xl pointer-events-none z-0" />

            <div 
              ref={hourScrollRef}
              className="flex-1 overflow-y-auto relative z-10 scroll-smooth snap-y snap-mandatory no-scrollbar"
            >
              <div className="h-[72px]" />
              {hours.map(hour => {
                const isSelected = selectedHour === hour;
                const isPast = isToday && parseInt(hour) < currentHour;
                return (
                  <div
                    key={hour}
                    onClick={(e) => {
                      if (isPast) return;
                      setSelectedHour(hour);
                      (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`h-12 flex items-center justify-center transition-all text-xl font-bold snap-center ${
                      isPast ? 'text-slate-200 cursor-not-allowed' :
                      isSelected ? 'text-cyan-600' : 'text-slate-400 hover:text-slate-600 cursor-pointer'
                    }`}
                  >
                    {hour}
                  </div>
                );
              })}
              <div className="h-[72px]" />
            </div>

            <div className="flex items-center text-slate-400 font-bold text-xl z-10">:</div>

            <div 
              ref={minuteScrollRef}
              className="flex-1 overflow-y-auto relative z-10 scroll-smooth snap-y snap-mandatory no-scrollbar"
            >
              <div className="h-[72px]" />
              {minutes.map(minute => {
                const isSelected = selectedMinute === minute;
                const isPast = isToday && parseInt(selectedHour) === currentHour && parseInt(minute) <= currentMinute;
                return (
                  <div
                    key={minute}
                    onClick={(e) => {
                      if (isPast) return;
                      setSelectedMinute(minute);
                      (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`h-12 flex items-center justify-center transition-all text-xl font-bold snap-center ${
                      isPast ? 'text-slate-200 cursor-not-allowed' :
                      isSelected ? 'text-cyan-600' : 'text-slate-400 hover:text-slate-600 cursor-pointer'
                    }`}
                  >
                    {minute}
                  </div>
                );
              })}
              <div className="h-[72px]" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex gap-3">
        <button 
          onClick={onClose}
          className="flex-1 py-3 text-slate-600 border border-slate-300 font-bold rounded-full hover:bg-slate-50 transition-colors"
        >
          取消
        </button>
        <button 
          onClick={handleConfirm}
          className="flex-1 py-3 bg-cyan-500 text-white font-bold rounded-full hover:bg-cyan-600 transition-colors shadow-md shadow-cyan-500/20"
        >
          確定
        </button>
      </div>
    </motion.div>
  );
}
