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
  updateRecord: (key: string, data: FileOrFolderMixedState) => void;
}

const useStore = create<State>()((set, get) => ({
  record: {},
  init: (data) => {
    set({
        record: data
    })
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