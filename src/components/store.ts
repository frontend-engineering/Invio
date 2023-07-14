import { create } from 'zustand'
import type {
    FileOrFolderMixedState,
} from "../baseTypes";

export enum LogType {
    LOG = 'LOG',
    WARN = 'WARN',
    ERROR = 'ERROR'
};

// type LogType = 'LOG' | 'WARN' | 'ERROR';
export interface LogItem {
    type: LogType;
    msg: string;
    date?: number;
}

const MAX_LOG_NUM = 1000;

interface State {
  record: Record<string, FileOrFolderMixedState>;
  logs: LogItem[];
  init: (data: Record<string, FileOrFolderMixedState>, logs?: LogItem[]) => void;
  getSyncJobList: () => FileOrFolderMixedState[];
  getPubJobList: () => FileOrFolderMixedState[];
  getFinishedJobList: () => FileOrFolderMixedState[];
  getFailJobList: () => FileOrFolderMixedState[];
  updateRecord: (key: string, data: Partial<FileOrFolderMixedState>) => void;
  addLog: (msg: string, type?: string) => void;
}

const useStore = create<State>()((set, get) => ({
  record: {},
  logs: [],
  init: (data: Record<string, FileOrFolderMixedState>, logs?: LogItem[]) => {
    set({
        record: data,
        logs
    })
  },
  getSyncJobList: () => {
    const obj = get().record;
    return Object.keys(obj).filter(key => obj[key].syncStatus === 'syncing').map(key => obj[key])
  },
  getPubJobList: () => {
    const obj = get().record;
    return Object.keys(obj).filter(key => obj[key].syncStatus === 'publishing').map(key => obj[key])
  },
  getFinishedJobList: () => {
    const obj = get().record;
    return Object.keys(obj).filter(key => obj[key].syncStatus === 'done').map(key => obj[key])
  },
  getFailJobList: () => {
    const obj = get().record;
    return Object.keys(obj).filter(key => obj[key].syncStatus === 'fail').map(key => obj[key])
  },
  updateRecord: (key: string, update: object) => {
    const obj = get().record;
    if (!(obj && obj[key])) {
        return;
    }
    return set(state => ({
        ...state,
        record: {
          ...state.record,
          [key]: { ...state.record[key], ...update }
        },
      }))
  },
  addLog: (msg: string, type?: LogType) => {
    if (!msg) return;
    const newMsg = {
        msg: msg.trim(),
        type: type || LogType.LOG,
        date: Date.now(),
    };
    const logs = get().logs;
    if (!logs) {
        set(state => ({
            ...state,
            logs: [ newMsg ]
        }))
        return;
    }

    logs.push(newMsg);
    if (logs.length > MAX_LOG_NUM) {
        logs.splice(0, logs.length - MAX_LOG_NUM)
    }
    set(state => ({
        ...state,
        logs
    }))
  }
}))

export default useStore;