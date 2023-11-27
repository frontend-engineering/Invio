import { create } from 'zustand'
import type {
    FileOrFolderMixedState,
} from "../baseTypes";
import { RemoteFileTouchedDecisions, LocalFileTouchedDecisions } from '../sync';

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
  toLocalSelected: string[],
  toRemoteSelected: string[],
  init: (data: Record<string, FileOrFolderMixedState>, logs?: LogItem[]) => void;
  getToLocalFileList: () => FileOrFolderMixedState[];
  getToRemoteFileList: () => FileOrFolderMixedState[];
  updateSelectedToLocalFileList: (list: string[]) => string[];
  updateSelectedToRemoteFileList: (list: string[]) => string[];
  // updateRecord: (key: string, data: Partial<FileOrFolderMixedState>) => void;
  clean: () => void;
}

const TouchedFileList = [
  ...RemoteFileTouchedDecisions,
  ...LocalFileTouchedDecisions
]
const useStore = create<State>()((set, get) => ({
  record: {},
  toLocalSelected: [],
  toRemoteSelected: [],
  init: (data: Record<string, FileOrFolderMixedState>, logs?: LogItem[]) => {
    set({
        record: data,
        toLocalSelected: [],
        toRemoteSelected: [],
    })
  },
  clean: () => {
    set({
      record: {},
      toLocalSelected: [],
      toRemoteSelected: [],
    })
  },
  getToLocalFileList: () => {
    const obj = get().record;
    console.log('get to local data: ', obj)
    return Object.keys(obj).filter(key => obj[key].syncType === 'TOLOCAL').map(key => obj[key])
  },
  getToRemoteFileList: () => {
    const obj = get().record;
    console.log('get to remote data: ', obj)
    return Object.keys(obj).filter(key => obj[key].syncType === 'TOREMOTE').map(key => obj[key])
  },

  updateSelectedToLocalFileList: (list: string[]) => {
    set({
      toLocalSelected: list || []
    })
    return get().toLocalSelected
  },
  updateSelectedToRemoteFileList: (list: string[]) => {
    set({
      toRemoteSelected: list || []
    })
    return get().toRemoteSelected
  },
  // updateRecord: (key: string, update: Partial<FileOrFolderMixedState>) => {
  //   const obj = get().record;
  //   if (!(obj && obj[key])) {
  //       return;
  //   }
  //   // For ToLocal files, sync done means ready
  //   if ((update.syncStatus === 'sync-done') && (obj[key].syncType === 'TOLOCAL')) {
  //     update.syncStatus = 'done';
  //   }
  //   // Once failed, then all process failed.
  //   if (obj[key].syncStatus === 'fail') {
  //     update.syncStatus = 'fail';
  //   }
  //   return set(state => ({
  //       ...state,
  //       record: {
  //         ...state.record,
  //         [key]: { ...state.record[key], ...update }
  //       },
  //     }))
  // },
}))

export default useStore;