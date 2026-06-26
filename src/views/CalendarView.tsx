import { useState, useRef, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';

import { Student, ClassRecord } from '../types';
import QuickBookingModal from '../components/QuickBookingModal';
import ViewRecordModal from '../components/ViewRecordModal';
import SigningModal from '../components/SigningModal';
import { getRecordDisplayStatus } from '../utils/recordUtils';

interface CalendarViewProps {
  students: Student[];
  records: ClassRecord[];
  onScheduleClass: (recordData: Omit<ClassRecord, 'id' | 'createdAt' | 'status'>) => void;
  onUpdateRecord: (id: string, date: string, time: string) => void;
  onDeleteRecord: (id: string) => void;
  onSignRecord: (id: string, coachSig: string, studentSig: string) => void;
}

export default function CalendarView({ students, records, onScheduleClass, onUpdateRecord, onDeleteRecord, onSignRecord }: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [showQuickBooking, setShowQuickBooking] = useState(false);
  const [selectedDateForBooking, setSelectedDateForBooking] = useState<{ date: string; time: string } | null>(null);
  
  const [signingRecord, setSigningRecord] = useState<ClassRecord | null>(null);
  const [viewingRecordId, setViewingRecordId] = useState<string | null>(null);

  const viewingRecord = records.find(r => r.id === viewingRecordId);

  // Generate week days around currentDate
  const getWeekDays = (baseDate: Date) => {
    const current = new Date(baseDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(current.setDate(diff));
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    if (calendarRef.current) {
      calendarRef.current.getApi().gotoDate(date);
    }
  };

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    handleDateSelect(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    handleDateSelect(newDate);
  };

  // Convert records to FullCalendar events
  const events = useMemo(() => {
    return records.map(record => {
      const displayStatus = getRecordDisplayStatus(record);
      
      let backgroundColor = 'rgba(186, 230, 253, 0.4)'; // sky-200 with opacity
      let textColor = '#0369A1'; // sky-700
      let borderColor = '#38BDF8'; // sky-400 (for border-left)

      if (displayStatus === 'late_pending') {
        backgroundColor = 'rgba(254, 215, 170, 0.4)'; // orange-200 with opacity
        textColor = '#C2410C'; // orange-700
        borderColor = '#FB923C'; // orange-400
      } else if (displayStatus === 'completed') {
        backgroundColor = 'rgba(187, 247, 208, 0.4)'; // green-200 with opacity
        textColor = '#15803D'; // green-700
        borderColor = '#4ADE80'; // green-400
      }

      const startDateTime = `${record.date}T${record.time}:00`;
      
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

      return {
        id: record.id,
        title: record.studentName,
        start: startDate,
        end: endDate,
        backgroundColor,
        textColor,
        borderColor,
        extendedProps: {
          record,
          displayStatus
        }
      };
    });
  }, [records]);

  const handleDateClick = (arg: DateClickArg) => {
    const year = arg.date.getFullYear();
    const month = String(arg.date.getMonth() + 1).padStart(2, '0');
    const day = String(arg.date.getDate()).padStart(2, '0');
    const hours = String(arg.date.getHours()).padStart(2, '0');
    const minutes = String(arg.date.getMinutes()).padStart(2, '0');
    
    setSelectedDateForBooking({
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    });
    setShowQuickBooking(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    const recordId = arg.event.id;
    const record = records.find(r => r.id === recordId);
    if (!record) return;
    setViewingRecordId(recordId);
  };

  const currentMonthStr = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col bg-white"
    >
      {/* Custom Top Navigation */}
      <div className="pt-4 pb-2 px-4 shadow-sm z-10 bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900">{currentMonthStr}</h2>
          <div className="flex space-x-2">
            <button onClick={handlePrevWeek} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button onClick={handleNextWeek} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          {weekDays.map(date => {
            const isSelected = date.toDateString() === currentDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
            const dayName = dayNames[date.getDay()];
            
            return (
              <div 
                key={date.toISOString()}
                onClick={() => handleDateSelect(date)}
                className="flex flex-col items-center justify-center w-10 cursor-pointer group"
              >
                <span className={`text-[10px] mb-1 font-medium transition-colors ${isSelected ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-500'}`}>
                  {dayName}
                </span>
                <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  isSelected 
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 scale-110' 
                    : isToday
                      ? 'text-indigo-600 bg-indigo-50 scale-100'
                      : 'text-slate-700 hover:bg-slate-100 scale-100'
                }`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          initialDate={currentDate}
          slotMinTime="09:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator={true}
          headerToolbar={false}
          dayHeaders={false}
          expandRows={true}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="100%"
          slotDuration="00:30:00"
          slotLabelFormat={{
            hour: 'numeric',
            minute: '2-digit',
            omitZeroMinute: false,
            meridiem: false,
            hour12: false
          }}
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            omitZeroMinute: false,
            meridiem: false,
            hour12: false
          }}
          eventContent={(arg) => {
            return (
              <div 
                className="px-2 py-1.5 text-xs overflow-hidden leading-tight h-full flex flex-col rounded-r-md rounded-l-sm"
                style={{
                  borderLeft: `3px solid ${arg.event.borderColor}`,
                  backgroundColor: arg.event.backgroundColor,
                }}
              >
                <div className="font-bold truncate mb-0.5" style={{ color: arg.event.textColor }}>{arg.event.title}</div>
                <div className="font-medium text-[10px] opacity-80" style={{ color: arg.event.textColor }}>{arg.timeText}</div>
              </div>
            );
          }}
        />
      </div>

      {showQuickBooking && (
        <QuickBookingModal
          students={students}
          initialDate={selectedDateForBooking?.date}
          initialTime={selectedDateForBooking?.time}
          onBook={(studentId, date, time) => {
            const student = students.find(s => s.id === studentId);
            if (student) {
              onScheduleClass({ studentName: student.name, date, time });
            }
            setShowQuickBooking(false);
          }}
          onClose={() => setShowQuickBooking(false)}
        />
      )}

      {viewingRecordId && viewingRecord && (
        <ViewRecordModal
          record={viewingRecord}
          onClose={() => setViewingRecordId(null)}
          onUpdate={(id, date, time) => {
            onUpdateRecord(id, date, time);
            setViewingRecordId(null);
          }}
          onCancelRecord={(id) => {
            onDeleteRecord(id);
            setViewingRecordId(null);
          }}
          onSign={() => {
            setViewingRecordId(null);
            setSigningRecord(viewingRecord);
          }}
        />
      )}

      {signingRecord && (
        <SigningModal 
          record={signingRecord} 
          onClose={() => setSigningRecord(null)} 
          onSign={(id, coachSig, studentSig) => {
            onSignRecord(id, coachSig, studentSig);
            setSigningRecord(null);
          }} 
        />
      )}
    </motion.div>
  );
}
