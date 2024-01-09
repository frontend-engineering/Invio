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
  loading: boolean;
  record: Record<string, FileOrFolderMixedState>;
  toLocalSelected: string[],
  toRemoteSelected: string[],
  setLoading: (state: boolean) => void;
  init: (data: Record<string, FileOrFolderMixedState>, logs?: LogItem[]) => void;
  getToLocalFileList: () => FileOrFolderMixedState[];
  getToRemoteFileList: () => FileOrFolderMixedState[];
  getAllCheckedFileList: () => string[];
  getToLocalFileListFlat: () => FileOrFolderMixedState[];
  getToRemoteFileListFlat: () => FileOrFolderMixedState[];
  existToLocalFile: (path: string) => boolean;
  existToRemoteFile: (path: string) => boolean;
  updateSelectedToLocalFileList: (list: string[]) => string[];
  updateSelectedToRemoteFileList: (list: string[]) => string[];
  // updateRecord: (key: string, data: Partial<FileOrFolderMixedState>) => void;
  clean: () => void;
}

function convertList(ListSource: any[]) {
  const ListDest: any[] = [];

  for (let item of ListSource) {
    const keys = item.key.split('/');
    let currentObj: any = ListDest;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (!currentObj.find((obj: any) => obj.key === key)) {
        if (i === keys.length - 1) {
          currentObj.push({
            ...item,
            title: key
          });
        } else {
          const newObj: any = { key: key, title: key, children: [] };
          currentObj.push(newObj);
          currentObj = newObj.children;
        }
      } else {
        currentObj = currentObj.find((obj: any) => obj.key === key).children;
      }
    }
  }

  return ListDest;
}

const TouchedFileList = [
  ...RemoteFileTouchedDecisions,
  ...LocalFileTouchedDecisions
]
const useStore = create<State>()((set, get) => ({
  loading: false,
  record: {},
  toLocalSelected: [],
  toRemoteSelected: [],
  setLoading: (state) => {
    set({
      loading: state
    })
  },
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
  getToLocalFileListFlat: () => {
    const obj = get().record;
    const list = Object.keys(obj)
      .filter(key => obj[key].syncType === 'TOLOCAL')
      .map(key => obj[key])
    return list
  },
  getToLocalFileList: () => {
    const obj = get().record;
    const list = Object.keys(obj)
      .filter(key => obj[key].syncType === 'TOLOCAL')
      .map(key => obj[key])
    return convertList(list) as FileOrFolderMixedState[]
  },
  getToRemoteFileListFlat: () => {
    const obj = get().record;
    const list = Object.keys(obj)
      .filter(key => obj[key].syncType === 'TOREMOTE')
      .map(key => obj[key])

    return list
  },
  getToRemoteFileList: () => {
    const obj = get().record;
    const list = Object.keys(obj)
      .filter(key => obj[key].syncType === 'TOREMOTE')
      .map(key => obj[key])

    return convertList(list) as FileOrFolderMixedState[]
  },

  getAllCheckedFileList: () => {
    return [ ...get().toLocalSelected, ...get().toRemoteSelected ]
  },

  existToLocalFile: (filePath: string) => {
    const obj = get().record;
    return !!Object.keys(obj).filter(key => obj[key].syncType === 'TOLOCAL').find(key => key === filePath)
  },
  existToRemoteFile: (filePath: string) => {
    const obj = get().record;
    return !!Object.keys(obj)
      .filter(key => obj[key].syncType === 'TOREMOTE')
      .find(key => key === filePath)
  },

  updateSelectedToLocalFileList: (list: string[]) => {
    const toRemoteList = get().getToLocalFileListFlat();
    set({
      toLocalSelected: (list || []).filter((p: string) => toRemoteList.find(item => item.key === p))
    })
    return get().toLocalSelected
  },
  updateSelectedToRemoteFileList: (list: string[]) => {
    const toRemoteList = get().getToRemoteFileListFlat();
    set({
      toRemoteSelected: (list || []).filter((p: string) => toRemoteList.find(item => item.key === p))
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