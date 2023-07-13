import { create } from 'zustand'
import type {
    RemoteItem,
    SyncTriggerSourceType,
    DecisionType,
    FileOrFolderMixedState,
    SUPPORTED_SERVICES_TYPE,
  } from "../baseTypes";
interface State {
  record: Record<string, FileOrFolderMixedState>;
  init: (data: Record<string, FileOrFolderMixedState>) => void;
  getSyncJobList: () => FileOrFolderMixedState[];
  getPubJobList: () => FileOrFolderMixedState[];
  getFinishedJobList: () => FileOrFolderMixedState[];
  getFailJobList: () => FileOrFolderMixedState[];
  updateRecord: (key: string, data: FileOrFolderMixedState) => void;
}

const useStore = create<State>()((set, get) => ({
  record: {},
  init: (data) => {
    set({
        record: data
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
        console.log('obj not found - ', obj, obj[key]);
        return;
    }
    console.log('obj set - ', key, update);
    return set(state => ({
        record: {
          ...state.record,
          [key]: { ...state.record[key], ...update }
        }  
      }))
  }
}))

export default useStore;