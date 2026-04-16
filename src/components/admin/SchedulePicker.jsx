import React, { useState, useEffect } from 'react';
import { MobileSelect, MobileSelectTrigger, MobileSelectContent, MobileSelectItem, MobileSelectValue } from '@/components/ui/mobile-select';
import { Label } from '@/components/ui/label';

// Generates next 60 days of date options
const generateDates = () => {
  const dates = [];
  const now = new Date();
  for (let i = 0; i <= 60; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' });
    const value = d.toISOString().slice(0, 10);
    dates.push({ label, value });
  }
  return dates;
};

const HOURS = Array.from({ length: 12 }, (_, i) => ({
  label: `${i + 1}:00`,
  value: String(i + 1),
}));

const MINUTES = ['00', '15', '30', '45'].map(m => ({ label: m, value: m }));
const AMPM = [{ label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }];

// Convert ET local time to UTC ISO string using Intl.DateTimeFormat
function etToUtcIso(dateStr, hour, minute, ampm) {
  const h24 = ampm === 'PM'
    ? (parseInt(hour) === 12 ? 12 : parseInt(hour) + 12)
    : (parseInt(hour) === 12 ? 0 : parseInt(hour));

  // Build an ET time string and find what UTC it corresponds to
  // by binary-searching for the UTC time whose ET representation matches
  const [year, month, day] = dateStr.split('-').map(Number);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  // Estimate UTC: start with ET + 5 hours (EST offset), then correct
  let utcMs = Date.UTC(year, month - 1, day, h24, parseInt(minute), 0) + 5 * 3600 * 1000;
  // Iterate to correct for DST
  for (let i = 0; i < 3; i++) {
    const parts = fmt.formatToParts(new Date(utcMs));
    const p = {};
    parts.forEach(({ type, value }) => { p[type] = parseInt(value); });
    const diffH = h24 - p.hour;
    const diffM = parseInt(minute) - p.minute;
    utcMs += (diffH * 60 + diffM) * 60 * 1000;
  }
  return new Date(utcMs).toISOString();
}

export default function SchedulePicker({ value, onChange }) {
  const dates = generateDates();

  const [selectedDate, setSelectedDate] = useState(dates[1].value);
  const [selectedHour, setSelectedHour] = useState('7');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedAmpm, setSelectedAmpm] = useState('PM');
  const [cleared, setCleared] = useState(!value);

  useEffect(() => {
    if (!cleared) {
      const iso = etToUtcIso(selectedDate, selectedHour, selectedMinute, selectedAmpm);
      onChange(iso);
    }
  }, [selectedDate, selectedHour, selectedMinute, selectedAmpm, cleared]);

  const handleClear = () => {
    setCleared(true);
    onChange('');
  };

  const handleSelect = (type, val) => {
    setCleared(false);
    if (type === 'date') setSelectedDate(val);
    if (type === 'hour') setSelectedHour(val);
    if (type === 'minute') setSelectedMinute(val);
    if (type === 'ampm') setSelectedAmpm(val);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <MobileSelect value={cleared ? '' : selectedDate} onValueChange={(v) => handleSelect('date', v)}>
            <MobileSelectTrigger>
              <MobileSelectValue placeholder="Select date" />
            </MobileSelectTrigger>
            <MobileSelectContent>
              {dates.map(d => (
                <MobileSelectItem key={d.value} value={d.value}>{d.label}</MobileSelectItem>
              ))}
            </MobileSelectContent>
          </MobileSelect>
        </div>
        <div className="flex gap-2 col-span-2">
          <MobileSelect value={cleared ? '' : selectedHour} onValueChange={(v) => handleSelect('hour', v)}>
            <MobileSelectTrigger className="flex-1">
              <MobileSelectValue placeholder="Hour" />
            </MobileSelectTrigger>
            <MobileSelectContent>
              {HOURS.map(h => (
                <MobileSelectItem key={h.value} value={h.value}>{h.label}</MobileSelectItem>
              ))}
            </MobileSelectContent>
          </MobileSelect>
          <MobileSelect value={cleared ? '' : selectedMinute} onValueChange={(v) => handleSelect('minute', v)}>
            <MobileSelectTrigger className="flex-1">
              <MobileSelectValue placeholder="Min" />
            </MobileSelectTrigger>
            <MobileSelectContent>
              {MINUTES.map(m => (
                <MobileSelectItem key={m.value} value={m.value}>{m.label}</MobileSelectItem>
              ))}
            </MobileSelectContent>
          </MobileSelect>
          <MobileSelect value={cleared ? '' : selectedAmpm} onValueChange={(v) => handleSelect('ampm', v)}>
            <MobileSelectTrigger className="flex-1">
              <MobileSelectValue placeholder="AM/PM" />
            </MobileSelectTrigger>
            <MobileSelectContent>
              {AMPM.map(a => (
                <MobileSelectItem key={a.value} value={a.value}>{a.label}</MobileSelectItem>
              ))}
            </MobileSelectContent>
          </MobileSelect>
        </div>
      </div>
      {!cleared && (
        <button type="button" onClick={handleClear} className="text-xs text-red-400 hover:text-red-300">
          Clear scheduled date
        </button>
      )}
    </div>
  );
}