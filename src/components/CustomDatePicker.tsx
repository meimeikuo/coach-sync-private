import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

export default function CustomDatePicker({ value, onChange, onClose }: CustomDatePickerProps) {
  const [viewDate, setViewDate] = useState(new Date(value || new Date()));
  const selectedDate = value ? new Date(value) : new Date();

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) return;

    const formattedDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    onChange(formattedDate);
    onClose();
  };

  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white p-6 flex flex-col rounded-[2rem] shadow-2xl w-full max-w-[320px]"
    >
      <div className="flex justify-between items-center mb-6">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full text-cyan-600">⬅️</button>
        <div className="font-bold text-lg text-slate-800">
          {viewDate.getFullYear()}年 {monthNames[viewDate.getMonth()]}
        </div>
        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full text-cyan-600">➡️</button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map(day => (
          <div key={day} className="h-6 flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {(() => {
          const year = viewDate.getFullYear();
          const month = viewDate.getMonth();
          const days = daysInMonth(year, month);
          const firstDay = firstDayOfMonth(year, month);
          const calendarDays = [];
          
          for (let i = 0; i < firstDay; i++) {
            calendarDays.push(<div key={`empty-${i}`} className="h-8 sm:h-10" />);
          }
          
          for (let d = 1; d <= days; d++) {
            const date = new Date(year, month, d);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isPast = date < today;

            const isSelected = selectedDate.getFullYear() === year && 
                               selectedDate.getMonth() === month && 
                               selectedDate.getDate() === d;
            calendarDays.push(
              <div
                key={d}
                onClick={() => !isPast && handleSelectDate(d)}
                className={`h-8 sm:h-10 flex items-center justify-center rounded-xl text-sm transition-all ${
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
  );
}
