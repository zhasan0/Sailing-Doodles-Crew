// Shared IAP logger — module-level so both useIAP and the debug panel share state
import { useState, useEffect } from 'react';

const MAX_LOGS = 50;
let logs = [];
let listeners = [];

const pad = (n) => String(n).padStart(2, '0');

const getTimestamp = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const logIAP = (message) => {
  const entry = `[IAP][${getTimestamp()}] ${message}`;
  console.log(entry);
  logs = [...logs, entry].slice(-MAX_LOGS);
  listeners.forEach(fn => fn([...logs]));
};

export const useIAPLogs = () => {
  const [logList, setLogList] = useState([...logs]);

  useEffect(() => {
    const handler = (newLogs) => setLogList(newLogs);
    listeners.push(handler);
    return () => { listeners = listeners.filter(l => l !== handler); };
  }, []);

  return logList;
};