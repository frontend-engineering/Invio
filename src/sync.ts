import {
  Notice,
  TAbstractFile,
  TFile,
  TFolder,
  Vault,
  requireApiVersion,
} from "obsidian";
import AggregateError from "aggregate-error";
import PQueue from "p-queue";
import type {
  RemoteItem,
  SyncTriggerSourceType,
  DecisionType,
  FileOrFolderMixedState,
  SUPPORTED_SERVICES_TYPE,
} from "./baseTypes";
import { API_VER_STAT_FOLDER } from "./baseTypes";
import {
  decryptBase32ToString,
  decryptBase64urlToString,
  encryptStringToBase64url,
  getSizeFromOrigToEnc,
  MAGIC_ENCRYPTED_PREFIX_BASE32,
  MAGIC_ENCRYPTED_PREFIX_BASE64URL,
} from "./encrypt";
import type { FileFolderHistoryRecord, InternalDBs } from "./localdb";
import {
  clearDeleteRenameHistoryOfKeyAndVault,
  getSyncMetaMappingByRemoteKeyAndVault,
  upsertSyncMetaMappingDataByVault,
} from "./localdb";
import {
  isHiddenPath,
  isMetaPath,
  isVaildText,
  mkdirpInVault,
  getFolderLevels,
  getParentFolder,
  atWhichLevel,
  unixTimeToStr,
  statFix,
  trimPrefix,
} from "./misc";
import { RemoteClient } from "./remote";
import {
  MetadataOnRemote,
  DeletionOnRemote,
  serializeMetadataOnRemote,
  deserializeMetadataOnRemote,
  DEFAULT_FILE_NAME_FOR_METADATAONREMOTE,
  DEFAULT_FILE_NAME_FOR_METADATAONREMOTE2,
  isEqualMetadataOnRemote,
} from "./metadataOnRemote";
import { isInsideObsFolder, ObsConfigDirFileType } from "./obsFolderLister";
import { Utils } from './utils/utils';
import { Path } from './utils/path';
import { log } from "./moreOnLog";
import { getRemoteFileDiff } from './diff/index';

export const RemoteSrcPrefix = 'op-remote-source-raw/'
export const RemoteAttPrefix = 'op-remote-attach-p/'
export const LocalConflictPrefix = 'local.conflict'
export const RemoteConflictPrefix = 'remote.conflict'
// 影响到pub产物变动的decision
const RemoteFileTouchedDecisions = ['uploadLocalDelHistToRemote', 'uploadLocalToRemote'];
const LocalFileTouchedDecisions = ['downloadRemoteToLocal', 'keepRemoteDelHist'];

export type SyncStatusType =
  | "idle"
  | "preparing"
  | "getting_remote_files_list"
  | "getting_remote_extra_meta"
  | "getting_local_meta"
  | "checking_password"
  | "generating_plan"
  | "syncing"
  | "cleaning"
  | "finish";

export interface SyncPlanType {
  ts: number;
  tsFmt?: string;
  syncTriggerSource?: SyncTriggerSourceType;
  remoteType: SUPPORTED_SERVICES_TYPE;
  mixedStates: Record<string, FileOrFolderMixedState>;
}

export interface PasswordCheckType {
  ok: boolean;
  reason:
    | "ok"
    | "empty_remote"
    | "remote_encrypted_local_no_password"
    | "password_matched"
    | "password_not_matched"
    | "invalid_text_after_decryption"
    | "remote_not_encrypted_local_has_password"
    | "no_password_both_sides";
}
const ConflictDescriptionTxt = `\n\n---\n\n > <font color="#d83931">Alert: remote conflict detected.</font> \n  > >  <font color="#1c7ed6">In case of data lost, this file is for backup.</font> \n  > >  <font color="#1c7ed6">Delete it if you don't need it.</font>`;

export const isPasswordOk = async (
  remote: RemoteItem[],
  password: string = ""
) => {
  if (remote === undefined || remote.length === 0) {
    // remote empty
    return {
      ok: true,
      reason: "empty_remote",
    } as PasswordCheckType;
  }
  const santyCheckKey = trimPrefix(remote[0].key, RemoteSrcPrefix);
  if (santyCheckKey.startsWith(MAGIC_ENCRYPTED_PREFIX_BASE32)) {
    // this is encrypted using old base32!
    // try to decrypt it using the provided password.
    if (password === "") {
      return {
        ok: false,
        reason: "remote_encrypted_local_no_password",
      } as PasswordCheckType;
    }
    try {
      const res = await decryptBase32ToString(santyCheckKey, password);

      // additional test
      // because iOS Safari bypasses decryption with wrong password!
      if (isVaildText(res)) {
        return {
          ok: true,
          reason: "password_matched",
        } as PasswordCheckType;
      } else {
        return {
          ok: false,
          reason: "invalid_text_after_decryption",
        } as PasswordCheckType;
      }
    } catch (error) {
      return {
        ok: false,
        reason: "password_not_matched",
      } as PasswordCheckType;
    }
  }
  if (santyCheckKey.startsWith(MAGIC_ENCRYPTED_PREFIX_BASE64URL)) {
    // this is encrypted using new base64url!
    // try to decrypt it using the provided password.
    if (password === "") {
      return {
        ok: false,
        reason: "remote_encrypted_local_no_password",
      } as PasswordCheckType;
    }
    try {
      const res = await decryptBase64urlToString(santyCheckKey, password);

      // additional test
      // because iOS Safari bypasses decryption with wrong password!
      if (isVaildText(res)) {
        return {
          ok: true,
          reason: "password_matched",
        } as PasswordCheckType;
      } else {
        return {
          ok: false,
          reason: "invalid_text_after_decryption",
        } as PasswordCheckType;
      }
    } catch (error) {
      return {
        ok: false,
        reason: "password_not_matched",
      } as PasswordCheckType;
    }
  } else {
    // it is not encrypted!
    if (password !== "") {
      return {
        ok: false,
        reason: "remote_not_encrypted_local_has_password",
      } as PasswordCheckType;
    }
    return {
      ok: true,
      reason: "no_password_both_sides",
    } as PasswordCheckType;
  }
};

export const parseRemoteItems = async (
  remote: RemoteItem[],
  db: InternalDBs,
  vaultRandomID: string,
  remoteType: SUPPORTED_SERVICES_TYPE,
  password: string = ""
) => {
  const remoteStates = [] as FileOrFolderMixedState[];
  let metadataFile: FileOrFolderMixedState = undefined;
  if (remote === undefined) {
    return {
      remoteStates: remoteStates,
      metadataFile: metadataFile,
    };
  }

  for (const entry of remote) {
    const remoteEncryptedKey = trimPrefix(entry.key, RemoteSrcPrefix);
    let key = remoteEncryptedKey;
    if (password !== "") {
      if (remoteEncryptedKey.startsWith(MAGIC_ENCRYPTED_PREFIX_BASE32)) {
        key = await decryptBase32ToString(remoteEncryptedKey, password);
      } else if (
        remoteEncryptedKey.startsWith(MAGIC_ENCRYPTED_PREFIX_BASE64URL)
      ) {
        key = await decryptBase64urlToString(remoteEncryptedKey, password);
      } else {
        throw Error(`unexpected key=${remoteEncryptedKey}`);
      }
    }
    const { record: backwardMapping, remoteUnsync } = (await getSyncMetaMappingByRemoteKeyAndVault(
      remoteType,
      db,
      key,
      entry.lastModified,
      entry.etag,
      vaultRandomID
    ) || {});

    let r = {} as FileOrFolderMixedState;
    if ((backwardMapping !== undefined) && (!remoteUnsync)) {
      key = backwardMapping.localKey;
      const mtimeRemote = backwardMapping.localMtime || entry.lastModified;

      // the backwardMapping.localSize is the file BEFORE encryption
      // we want to split two sizes for comparation later

      r = {
        key: key,
        existRemote: true,
        mtimeRemote: mtimeRemote,
        mtimeRemoteFmt: unixTimeToStr(mtimeRemote),
        etagRemote: entry.etag,
        remoteUnsync,
        sizeRemote: backwardMapping.localSize,
        sizeRemoteEnc: password === "" ? undefined : entry.size,
        remoteEncryptedKey: remoteEncryptedKey,
        changeRemoteMtimeUsingMapping: true,
      };
    } else {
      // do not have backwardMapping
      r = {
        key: key,
        existRemote: true,
        etagRemote: entry.etag,
        remoteUnsync,
        mtimeRemote: entry.lastModified,
        mtimeRemoteFmt: unixTimeToStr(entry.lastModified),
        sizeRemote: password === "" ? entry.size : undefined,
        sizeRemoteEnc: password === "" ? undefined : entry.size,
        remoteEncryptedKey: remoteEncryptedKey,
        changeRemoteMtimeUsingMapping: false,
      };
    }

    try {
      dataInconsistanceCheck(r)
    } catch (error) {
      log.error('found abnormal backwardmapping record and skip it', error);
      r = {
        key: key,
        existRemote: true,
        etagRemote: entry.etag,
        remoteUnsync,
        mtimeRemote: entry.lastModified,
        mtimeRemoteFmt: unixTimeToStr(entry.lastModified),
        sizeRemote: password === "" ? entry.size : undefined,
        sizeRemoteEnc: password === "" ? undefined : entry.size,
        remoteEncryptedKey: remoteEncryptedKey,
        changeRemoteMtimeUsingMapping: false,
      };
    }
    if (isMetaPath(r.key)) {
      metadataFile = Object.assign({}, r); 
    }
    if (r.key === DEFAULT_FILE_NAME_FOR_METADATAONREMOTE2) {
      throw Error(
        `A reserved file name ${r.key} has been found. You may upgrade the plugin to latest version to try to deal with it.`
      );
    }

    remoteStates.push(r);
  }
  return {
    remoteStates: remoteStates,
    metadataFile: metadataFile,
  };
};

export const fetchMetadataFile = async (
  metadataFile: FileOrFolderMixedState,
  client: RemoteClient,
  vault: Vault,
  password: string = ""
) => {
  if (metadataFile === undefined) {
    log.debug("no metadata file, so no fetch");
    return {
      deletions: [],
    } as MetadataOnRemote;
  }

  log.info('fetch meta file src: ', metadataFile);
  const buf = await client.downloadFromRemote(
    metadataFile.key,
    RemoteSrcPrefix,
    vault,
    metadataFile.mtimeRemote,
    password,
    metadataFile.remoteEncryptedKey,
    true
  );
  const metadata = deserializeMetadataOnRemote(buf);
  return metadata;
};


export const fetchRemoteFileMD = async (
  remoteFilePath: string,
  client: RemoteClient,
  vault: Vault,
  password: string = ""
) => {
  if (remoteFilePath === undefined) {
    log.debug("no metadata file, so no fetch");
    return null
  }

  log.info('fetch remote file path: ', remoteFilePath);
  const buf = await client.downloadFromRemote(
    remoteFilePath,
    RemoteSrcPrefix,
    vault,
    null,
    password,
    '',
    true
  );
  const resp: RemoteItem = await client.getRemoteMeta(RemoteSrcPrefix + remoteFilePath)

  let data;
  if (typeof buf === "string") {
    data = buf;
  } else {
    data = new TextDecoder().decode(buf);
  }
  return {
    ...resp,
    data
  }
};

const dataInconsistanceCheck = (r: FileOrFolderMixedState) => {
  if (!r) return;
  // find abnormal
  if (r.existLocal && (r.mtimeLocal === undefined || r.mtimeLocal <= 0)) {
    throw Error(
      `Error: Abnormal last modified time locally: ${JSON.stringify(
        r,
        null,
        2
      )}`
    );
  }
  if (r.existRemote && (r.mtimeRemote === undefined || r.mtimeRemote <= 0)) {
    throw Error(
      `Error: Abnormal last modified time remotely: ${JSON.stringify(
        r,
        null,
        2
      )}`
    );
  }
  if (r.deltimeLocal !== undefined && r.deltimeLocal <= 0) {
    throw Error(
      `Error: Abnormal deletion time locally: ${JSON.stringify(r, null, 2)}`
    );
  }
  if (r.deltimeRemote !== undefined && r.deltimeRemote <= 0) {
    throw Error(
      `Error: Abnormal deletion time remotely: ${JSON.stringify(r, null, 2)}`
    );
  }
}

const isSkipItem = (
  key: string,
  syncConfigDir: boolean,
  syncUnderscoreItems: boolean,
  configDir: string,
  watchDir: string,
  selectedMode: boolean,
  selectedLocalFilePaths: string[] | undefined,
) => {
  if (selectedMode) {
    if (selectedLocalFilePaths?.length > 0) {
      if (selectedLocalFilePaths.indexOf(key) < 0) {
        return true;
      }
    }
  }
  if (watchDir && !key.startsWith(watchDir)) {
    return true;
  }

  if (syncConfigDir && isInsideObsFolder(key, configDir)) {
    return false;
  }

  return (
    isHiddenPath(key, true, false) ||
    (!syncUnderscoreItems && isHiddenPath(key, false, true)) ||
    isMetaPath(key) ||
    key === DEFAULT_FILE_NAME_FOR_METADATAONREMOTE2
  );
};

export const pruneTouchedFiles = async (vault: Vault, client: RemoteClient, list: Record<string, FileOrFolderMixedState>) => {
  const promises = [ ...Object.keys(list) ].map(async attr => {
    const item = list[attr];
    if (item.decision === 'uploadLocalToRemote') {
      const remoteMD = await fetchRemoteFileMD(
        item.key,
        client,
        vault,
      ).catch(err => {
        log.info('remote empty ', err);
        return null;
      })
      log.info('remote md: ', remoteMD);
      if (!remoteMD) {
        return;
      }
      const diff = await getRemoteFileDiff(vault, item.key, remoteMD.data);
      if (!diff) {
        log.info('file contents diff nothing', attr, item)
        list[attr] = null;
        delete list[attr];
        return attr;
      }
      return;
    }
  })
  const result = await Promise.all(promises);
  log.info('list result: ', result);
}

const ensembleMixedStates = async (
  remoteStates: FileOrFolderMixedState[],
  local: TAbstractFile[],
  vault: Vault,
  recentSyncedFiles: any,
  selectedMode: boolean,
  selectedLocalFilePaths: string[] | undefined,
  localConfigDirContents: ObsConfigDirFileType[] | undefined,
  remoteDeleteHistory: DeletionOnRemote[],
  localFileHistory: FileFolderHistoryRecord[],
  syncConfigDir: boolean,
  watchDir: string,
  configDir: string,
  syncUnderscoreItems: boolean,
  password: string
) => {
  const results = {} as Record<string, FileOrFolderMixedState>;

  for (const r of remoteStates) {
    const key = r.key;

    if (isSkipItem(key, syncConfigDir, syncUnderscoreItems, configDir, watchDir, selectedMode, selectedLocalFilePaths)) {
      continue;
    }
    results[key] = r;
    results[key].existLocal = false;
  }

  for (const entry of local) {
    let r = {} as FileOrFolderMixedState;
    let key = entry.path;

    if (entry.path === "/") {
      // ignore
      continue;
    } else if (entry instanceof TFile) {
      let mtimeLocal = Math.max(entry.stat.mtime ?? 0, entry.stat.ctime ?? 0);

      const snap = recentSyncedFiles && recentSyncedFiles[entry.path];
      if (snap) {
        log.info('snap found: ', snap);
        const curContents = await vault.read(entry);
        if (entry.stat.size === snap.size) {
          if (curContents === snap.contents) {
            log.info('current contents same with last sync, not changed');
            mtimeLocal = snap.mtime;
          }
        } else {
          log.info('current contents changed');
        }
      }
      r = {
        key: entry.path,
        existLocal: true,
        mtimeLocal: mtimeLocal,
        mtimeLocalFmt: unixTimeToStr(mtimeLocal),
        sizeLocal: entry.stat.size,
        sizeLocalEnc:
          password === "" ? undefined : getSizeFromOrigToEnc(entry.stat.size),
      };
    } else if (entry instanceof TFolder) {
      key = `${entry.path}/`;
      r = {
        key: key,
        existLocal: true,
        mtimeLocal: undefined,
        mtimeLocalFmt: undefined,
        sizeLocal: 0,
        sizeLocalEnc: password === "" ? undefined : getSizeFromOrigToEnc(0),
      };
    } else {
      throw Error(`unexpected ${entry}`);
    }

    if (isSkipItem(key, syncConfigDir, syncUnderscoreItems, configDir, watchDir, selectedMode, selectedLocalFilePaths)) {
      continue;
    }

    if (results.hasOwnProperty(key)) {
      results[key].key = r.key;
      results[key].existLocal = r.existLocal;
      results[key].mtimeLocal = r.mtimeLocal;
      results[key].mtimeLocalFmt = r.mtimeLocalFmt;
      results[key].sizeLocal = r.sizeLocal;
      results[key].sizeLocalEnc = r.sizeLocalEnc;
    } else {
      results[key] = r;
      results[key].existRemote = false;
    }
  }

  if (syncConfigDir && localConfigDirContents !== undefined) {
    for (const entry of localConfigDirContents) {
      const key = entry.key;
      let mtimeLocal = Math.max(entry.mtime ?? 0, entry.ctime ?? 0);
      if (Number.isNaN(mtimeLocal) || mtimeLocal === 0) {
        mtimeLocal = undefined;
      }
      const r: FileOrFolderMixedState = {
        key: key,
        existLocal: true,
        mtimeLocal: mtimeLocal,
        mtimeLocalFmt: unixTimeToStr(mtimeLocal),
        sizeLocal: entry.size,
        sizeLocalEnc:
          password === "" ? undefined : getSizeFromOrigToEnc(entry.size),
      };

      if (results.hasOwnProperty(key)) {
        results[key].key = r.key;
        results[key].existLocal = r.existLocal;
        results[key].mtimeLocal = r.mtimeLocal;
        results[key].mtimeLocalFmt = r.mtimeLocalFmt;
        results[key].sizeLocal = r.sizeLocal;
        results[key].sizeLocalEnc = r.sizeLocalEnc;
      } else {
        results[key] = r;
        results[key].existRemote = false;
      }
    }
  }

  for (const entry of remoteDeleteHistory) {
    const key = entry.key;
    const r = {
      key: key,
      deltimeRemote: entry.actionWhen,
      deltimeRemoteFmt: unixTimeToStr(entry.actionWhen),
    } as FileOrFolderMixedState;

    if (isSkipItem(key, syncConfigDir, syncUnderscoreItems, configDir, watchDir, selectedMode, selectedLocalFilePaths)) {
      continue;
    }

    if (results.hasOwnProperty(key)) {
      results[key].key = r.key;
      results[key].deltimeRemote = r.deltimeRemote;
      results[key].deltimeRemoteFmt = r.deltimeRemoteFmt;
    } else {
      results[key] = r;

      results[key].existLocal = false;
      results[key].existRemote = false;
    }
  }

  for (const entry of localFileHistory) {
    let key = entry.key;
    if (entry.keyType === "folder") {
      if (!entry.key.endsWith("/")) {
        key = `${entry.key}/`;
      }
    } else if (entry.keyType === "file") {
      // pass
    } else {
      throw Error(`unexpected ${entry}`);
    }

    if (isSkipItem(key, syncConfigDir, syncUnderscoreItems, configDir, watchDir, selectedMode, selectedLocalFilePaths)) {
      continue;
    }

    if (entry.actionType === "delete" || entry.actionType === "rename") {
      const r = {
        key: key,
        deltimeLocal: entry.actionWhen,
        deltimeLocalFmt: unixTimeToStr(entry.actionWhen),
      } as FileOrFolderMixedState;

      if (results.hasOwnProperty(key)) {
        results[key].deltimeLocal = r.deltimeLocal;
        results[key].deltimeLocalFmt = r.deltimeLocalFmt;
      } else {
        results[key] = r;
        results[key].existLocal = false; // we have already checked local
        results[key].existRemote = false; // we have already checked remote
      }
    } else if (entry.actionType === "renameDestination") {
      const r = {
        key: key,
        mtimeLocal: entry.actionWhen,
        mtimeLocalFmt: unixTimeToStr(entry.actionWhen),
        changeLocalMtimeUsingMapping: true,
      };
      if (results.hasOwnProperty(key)) {
        let mtimeLocal = Math.max(
          r.mtimeLocal ?? 0,
          results[key].mtimeLocal ?? 0
        );
        if (Number.isNaN(mtimeLocal) || mtimeLocal === 0) {
          mtimeLocal = undefined;
        }
        results[key].mtimeLocal = mtimeLocal;
        results[key].mtimeLocalFmt = unixTimeToStr(mtimeLocal);
        results[key].changeLocalMtimeUsingMapping =
          r.changeLocalMtimeUsingMapping;
      } else {
        // So, the file doesn't exist,
        // except that it existed in the "renamed to" history records.
        // Most likely because that the user deleted the file while Obsidian was closed,
        // so Obsidian could not track the deletions.
        // We are not sure how to deal with this, so do not generate anything here!
        // // // The following 3 lines are of old logic, and have been removed:
        // // results[key] = r;
        // // results[key].existLocal = false; // we have already checked local
        // // results[key].existRemote = false; // we have already checked remote
      }
    } else {
      throw Error(
        `do not know how to deal with local file history ${entry.key} with ${entry.actionType}`
      );
    }
  }

  return results;
};

const assignOperationToFileInplace = (
  origRecord: FileOrFolderMixedState,
  keptFolder: Set<string>,
  skipSizeLargerThan: number,
  password: string = ""
) => {
  let r = origRecord;

  // files and folders are treated differently
  // here we only check files
  if (r.key.endsWith("/")) {
    return r;
  }

  // we find the max date from four sources

  // 0. find anything inconsistent
  dataInconsistanceCheck(r);

  if (
    (r.existLocal && password !== "" && r.sizeLocalEnc === undefined) ||
    (r.existRemote && password !== "" && r.sizeRemoteEnc === undefined)
  ) {
    throw new Error(
      `Error: No encryption sizes: ${JSON.stringify(r, null, 2)}`
    );
  }

  const sizeLocalComp = password === "" ? r.sizeLocal : r.sizeLocalEnc;
  const sizeRemoteComp = password === "" ? r.sizeRemote : r.sizeRemoteEnc;

  // 1. mtimeLocal
  if (r.existLocal) {
    const mtimeRemote = r.existRemote ? r.mtimeRemote : -1;
    const deltimeRemote = r.deltimeRemote !== undefined ? r.deltimeRemote : -1;
    const deltimeLocal = r.deltimeLocal !== undefined ? r.deltimeLocal : -1;
    if (
      r.mtimeLocal >= mtimeRemote &&
      r.mtimeLocal >= deltimeLocal &&
      r.mtimeLocal >= deltimeRemote
    ) {
      if (sizeLocalComp === undefined) {
        throw new Error(
          `Error: no local size but has local mtime: ${JSON.stringify(
            r,
            null,
            2
          )}`
        );
      }
      if (r.mtimeLocal === r.mtimeRemote) {
        // local and remote both exist and mtimes are the same
        if (sizeLocalComp === sizeRemoteComp) {
          // do not need to consider skipSizeLargerThan in this case
          r.decision = "skipUploading";
          r.decisionBranch = 1;
        } else {
          if (skipSizeLargerThan <= 0) {
            r.decision = "uploadLocalToRemote";
            r.decisionBranch = 2;
          } else {
            // limit the sizes
            if (sizeLocalComp <= skipSizeLargerThan) {
              if (sizeRemoteComp <= skipSizeLargerThan) {
                r.decision = "uploadLocalToRemote";
                r.decisionBranch = 18;
              } else {
                r.decision = "errorRemoteTooLargeConflictLocal";
                r.decisionBranch = 19;
              }
            } else {
              if (sizeRemoteComp <= skipSizeLargerThan) {
                r.decision = "errorLocalTooLargeConflictRemote";
                r.decisionBranch = 20;
              } else {
                r.decision = "skipUploadingTooLarge";
                r.decisionBranch = 21;
              }
            }
          }
        }
      } else {
        // we have local laregest mtime,
        // and the remote not existing or smaller mtime
        if (skipSizeLargerThan <= 0) {
          // no need to consider sizes
          r.decision = "uploadLocalToRemote";
          r.decisionBranch = 4;
        } else {
          // need to consider sizes
          if (sizeLocalComp <= skipSizeLargerThan) {
            if (sizeRemoteComp === undefined) {
              r.decision = "uploadLocalToRemote";
              r.decisionBranch = 22;
            } else if (sizeRemoteComp <= skipSizeLargerThan) {
              r.decision = "uploadLocalToRemote";
              r.decisionBranch = 23;
            } else {
              r.decision = "errorRemoteTooLargeConflictLocal";
              r.decisionBranch = 24;
            }
          } else {
            if (sizeRemoteComp === undefined) {
              r.decision = "skipUploadingTooLarge";
              r.decisionBranch = 25;
            } else if (sizeRemoteComp <= skipSizeLargerThan) {
              r.decision = "errorLocalTooLargeConflictRemote";
              r.decisionBranch = 26;
            } else {
              r.decision = "skipUploadingTooLarge";
              r.decisionBranch = 27;
            }
          }
        }
      }
      keptFolder.add(getParentFolder(r.key));
      return r;
    }
  }

  // 2. mtimeRemote
  if (r.existRemote) {
    const mtimeLocal = r.existLocal ? r.mtimeLocal : -1;
    const deltimeRemote = r.deltimeRemote !== undefined ? r.deltimeRemote : -1;
    const deltimeLocal = r.deltimeLocal !== undefined ? r.deltimeLocal : -1;
    if (
      r.mtimeRemote > mtimeLocal &&
      r.mtimeRemote >= deltimeLocal &&
      r.mtimeRemote >= deltimeRemote
    ) {
      // we have remote laregest mtime,
      // and the local not existing or smaller mtime
      if (sizeRemoteComp === undefined) {
        throw new Error(
          `Error: no remote size but has remote mtime: ${JSON.stringify(
            r,
            null,
            2
          )}`
        );
      }

      if (skipSizeLargerThan <= 0) {
        // no need to consider sizes
        r.decision = "downloadRemoteToLocal";
        r.decisionBranch = 5;
      } else {
        // need to consider sizes
        if (sizeRemoteComp <= skipSizeLargerThan) {
          if (sizeLocalComp === undefined) {
            r.decision = "downloadRemoteToLocal";
            r.decisionBranch = 28;
          } else if (sizeLocalComp <= skipSizeLargerThan) {
            r.decision = "downloadRemoteToLocal";
            r.decisionBranch = 29;
          } else {
            r.decision = "errorLocalTooLargeConflictRemote";
            r.decisionBranch = 30;
          }
        } else {
          if (sizeLocalComp === undefined) {
            r.decision = "skipDownloadingTooLarge";
            r.decisionBranch = 31;
          } else if (sizeLocalComp <= skipSizeLargerThan) {
            r.decision = "errorRemoteTooLargeConflictLocal";
            r.decisionBranch = 32;
          } else {
            r.decision = "skipDownloadingTooLarge";
            r.decisionBranch = 33;
          }
        }
      }

      keptFolder.add(getParentFolder(r.key));
      return r;
    }
  }

  // 3. deltimeLocal
  if (r.deltimeLocal !== undefined && r.deltimeLocal !== 0) {
    const mtimeLocal = r.existLocal ? r.mtimeLocal : -1;
    const mtimeRemote = r.existRemote ? r.mtimeRemote : -1;
    const deltimeRemote = r.deltimeRemote !== undefined ? r.deltimeRemote : -1;
    if (
      r.deltimeLocal >= mtimeLocal &&
      r.deltimeLocal >= mtimeRemote &&
      r.deltimeLocal >= deltimeRemote
    ) {
      if (skipSizeLargerThan <= 0) {
        r.decision = "uploadLocalDelHistToRemote";
        r.decisionBranch = 6;
        if (r.existLocal || r.existRemote) {
          // actual deletion would happen
        }
      } else {
        const localTooLargeToDelete =
          r.existLocal && sizeLocalComp > skipSizeLargerThan;
        const remoteTooLargeToDelete =
          r.existRemote && sizeRemoteComp > skipSizeLargerThan;
        if (localTooLargeToDelete) {
          if (remoteTooLargeToDelete) {
            r.decision = "skipUsingLocalDelTooLarge";
            r.decisionBranch = 34;
          } else {
            if (r.existRemote) {
              r.decision = "errorLocalTooLargeConflictRemote";
              r.decisionBranch = 35;
            } else {
              r.decision = "skipUsingLocalDelTooLarge";
              r.decisionBranch = 36;
            }
          }
        } else {
          if (remoteTooLargeToDelete) {
            if (r.existLocal) {
              r.decision = "errorLocalTooLargeConflictRemote";
              r.decisionBranch = 37;
            } else {
              r.decision = "skipUsingLocalDelTooLarge";
              r.decisionBranch = 38;
            }
          } else {
            r.decision = "uploadLocalDelHistToRemote";
            r.decisionBranch = 39;
          }
        }
      }
      return r;
    }
  }

  // 4. deltimeRemote
  if (r.deltimeRemote !== undefined && r.deltimeRemote !== 0) {
    const mtimeLocal = r.existLocal ? r.mtimeLocal : -1;
    const mtimeRemote = r.existRemote ? r.mtimeRemote : -1;
    const deltimeLocal = r.deltimeLocal !== undefined ? r.deltimeLocal : -1;
    if (
      r.deltimeRemote >= mtimeLocal &&
      r.deltimeRemote >= mtimeRemote &&
      r.deltimeRemote >= deltimeLocal
    ) {
      if (skipSizeLargerThan <= 0) {
        r.decision = "keepRemoteDelHist";
        r.decisionBranch = 7;
        if (r.existLocal || r.existRemote) {
          // actual deletion would happen
        }
      } else {
        const localTooLargeToDelete =
          r.existLocal && sizeLocalComp > skipSizeLargerThan;
        const remoteTooLargeToDelete =
          r.existRemote && sizeRemoteComp > skipSizeLargerThan;
        if (localTooLargeToDelete) {
          if (remoteTooLargeToDelete) {
            r.decision = "skipUsingRemoteDelTooLarge";
            r.decisionBranch = 40;
          } else {
            if (r.existRemote) {
              r.decision = "errorLocalTooLargeConflictRemote";
              r.decisionBranch = 41;
            } else {
              r.decision = "skipUsingRemoteDelTooLarge";
              r.decisionBranch = 42;
            }
          }
        } else {
          if (remoteTooLargeToDelete) {
            if (r.existLocal) {
              r.decision = "errorLocalTooLargeConflictRemote";
              r.decisionBranch = 43;
            } else {
              r.decision = "skipUsingRemoteDelTooLarge";
              r.decisionBranch = 44;
            }
          } else {
            r.decision = "keepRemoteDelHist";
            r.decisionBranch = 45;
          }
        }
      }
      return r;
    }
  }

  throw Error(`no decision for ${JSON.stringify(r)}`);
};

const assignOperationToFolderInplace = async (
  origRecord: FileOrFolderMixedState,
  keptFolder: Set<string>,
  vault: Vault,
  password: string = ""
) => {
  let r = origRecord;

  // files and folders are treated differently
  // here we only check folders
  if (!r.key.endsWith("/")) {
    return r;
  }

  if (!keptFolder.has(r.key)) {
    // the folder does NOT have any must-be-kept children!

    if (r.deltimeLocal !== undefined || r.deltimeRemote !== undefined) {
      // it has some deletion "commands"

      const deltimeLocal = r.deltimeLocal !== undefined ? r.deltimeLocal : -1;
      const deltimeRemote =
        r.deltimeRemote !== undefined ? r.deltimeRemote : -1;

      // if it was created after deletion, we should keep it as is
      if (requireApiVersion(API_VER_STAT_FOLDER)) {
        if (r.existLocal) {
          const { ctime, mtime } = await statFix(vault, r.key);
          const cmtime = Math.max(ctime ?? 0, mtime ?? 0);
          if (
            !Number.isNaN(cmtime) &&
            cmtime > 0 &&
            cmtime >= deltimeLocal &&
            cmtime >= deltimeRemote
          ) {
            keptFolder.add(getParentFolder(r.key));
            if (r.existLocal && r.existRemote) {
              r.decision = "skipFolder";
              r.decisionBranch = 14;
            } else if (r.existLocal || r.existRemote) {
              r.decision = "createFolder";
              r.decisionBranch = 15;
            } else {
              throw Error(
                `Error: Folder ${r.key} doesn't exist locally and remotely but is marked must be kept. Abort.`
              );
            }
          }
        }
      }

      // If it was moved to here, after deletion, we should keep it as is.
      // The logic not necessarily needs API_VER_STAT_FOLDER.
      // The folder needs this logic because it's also determined by file children.
      // But the file do not need this logic because the mtimeLocal is checked firstly.
      if (
        r.existLocal &&
        r.changeLocalMtimeUsingMapping &&
        r.mtimeLocal > 0 &&
        r.mtimeLocal > deltimeLocal &&
        r.mtimeLocal > deltimeRemote
      ) {
        keptFolder.add(getParentFolder(r.key));
        if (r.existLocal && r.existRemote) {
          r.decision = "skipFolder";
          r.decisionBranch = 16;
        } else if (r.existLocal || r.existRemote) {
          r.decision = "createFolder";
          r.decisionBranch = 17;
        } else {
          throw Error(
            `Error: Folder ${r.key} doesn't exist locally and remotely but is marked must be kept. Abort.`
          );
        }
      }

      if (r.decision === undefined) {
        // not yet decided by the above reason
        if (deltimeLocal > 0 && deltimeLocal > deltimeRemote) {
          r.decision = "uploadLocalDelHistToRemoteFolder";
          r.decisionBranch = 8;
        } else {
          r.decision = "keepRemoteDelHistFolder";
          r.decisionBranch = 9;
        }
      }
    } else {
      // it does not have any deletion commands
      // keep it as is, and create it if necessary
      keptFolder.add(getParentFolder(r.key));
      if (r.existLocal && r.existRemote) {
        r.decision = "skipFolder";
        r.decisionBranch = 10;
      } else if (r.existLocal || r.existRemote) {
        r.decision = "createFolder";
        r.decisionBranch = 11;
      } else {
        throw Error(
          `Error: Folder ${r.key} doesn't exist locally and remotely but is marked must be kept. Abort.`
        );
      }
    }
  } else {
    // the folder has some must be kept children!
    // so itself and its parent folder must be kept
    keptFolder.add(getParentFolder(r.key));
    if (r.existLocal && r.existRemote) {
      r.decision = "skipFolder";
      r.decisionBranch = 12;
    } else if (r.existLocal || r.existRemote) {
      r.decision = "createFolder";
      r.decisionBranch = 13;
    } else {
      throw Error(
        `Error: Folder ${r.key} doesn't exist locally and remotely but is marked must be kept. Abort.`
      );
    }
  }

  // save the memory, save the world!
  // we have dealt with it, so we don't need it any more.
  keptFolder.delete(r.key);
  return r;
};

const DELETION_DECISIONS: Set<DecisionType> = new Set([
  "uploadLocalDelHistToRemote",
  "keepRemoteDelHist",
  "uploadLocalDelHistToRemoteFolder",
  "keepRemoteDelHistFolder",
]);
const SIZES_GO_WRONG_DECISIONS: Set<DecisionType> = new Set([
  "errorLocalTooLargeConflictRemote",
  "errorRemoteTooLargeConflictLocal",
]);

export const getSyncPlan = async (
  remoteStates: FileOrFolderMixedState[],
  local: TAbstractFile[],
  recentSyncedFiles: any,
  selectedMode: boolean, // Selected mode only care about files in selectedLocalFilePaths
  selectedLocalFilePaths: string[] | undefined, // Only care file in this list and ignore all other files, work when selectedMode is true
  localConfigDirContents: ObsConfigDirFileType[] | undefined,
  remoteDeleteHistory: DeletionOnRemote[],
  localFileHistory: FileFolderHistoryRecord[],
  remoteType: SUPPORTED_SERVICES_TYPE,
  triggerSource: SyncTriggerSourceType,
  vault: Vault,
  syncConfigDir: boolean,
  watchDir: string,
  configDir: string,
  syncUnderscoreItems: boolean,
  skipSizeLargerThan: number,
  password: string = ""
) => {
  const mixedStates = await ensembleMixedStates(
    remoteStates,
    local,
    vault,
    recentSyncedFiles,
    selectedMode,
    selectedLocalFilePaths,
    localConfigDirContents,
    remoteDeleteHistory,
    localFileHistory,
    syncConfigDir,
    watchDir,
    configDir,
    syncUnderscoreItems,
    password
  );

  const sortedKeys = Object.keys(mixedStates)
    .sort((k1, k2) => k2.length - k1.length)
    .filter(k => mixedStates[k].key.startsWith(watchDir)); // Safe check

  const sizesGoWrong: FileOrFolderMixedState[] = [];
  const deletions: DeletionOnRemote[] = [];

  const keptFolder = new Set<string>();
  for (let i = 0; i < sortedKeys.length; ++i) {
    const key = sortedKeys[i];
    const val = mixedStates[key];

    if (key.endsWith("/")) {
      // decide some folders
      // because the keys are sorted by length
      // so all the children must have been shown up before in the iteration
      await assignOperationToFolderInplace(val, keptFolder, vault, password);
    } else {
      // get all operations of files
      // and at the same time get some helper info for folders
      assignOperationToFileInplace(
        val,
        keptFolder,
        skipSizeLargerThan,
        password
      );
    }

    if (SIZES_GO_WRONG_DECISIONS.has(val.decision)) {
      sizesGoWrong.push(val);
    }

    if (DELETION_DECISIONS.has(val.decision)) {
      if (val.decision === "uploadLocalDelHistToRemote") {
        deletions.push({
          key: key,
          actionWhen: val.deltimeLocal,
        });
      } else if (val.decision === "keepRemoteDelHist") {
        deletions.push({
          key: key,
          actionWhen: val.deltimeRemote,
        });
      } else if (val.decision === "uploadLocalDelHistToRemoteFolder") {
        deletions.push({
          key: key,
          actionWhen: val.deltimeLocal,
        });
      } else if (val.decision === "keepRemoteDelHistFolder") {
        deletions.push({
          key: key,
          actionWhen: val.deltimeRemote,
        });
      } else {
        throw Error(`do not know how to delete for decision ${val.decision}`);
      }
    }
  }

  const touchedFileMap: Record<string, FileOrFolderMixedState> = {};
  for (let i = 0; i < sortedKeys.length; ++i) {
    const key = sortedKeys[i];
    const val = mixedStates[key];

    if (RemoteFileTouchedDecisions.includes(val.decision)) {
      touchedFileMap[key] = val;
    }
    if (LocalFileTouchedDecisions.includes(val.decision)) {
      touchedFileMap[key] = val;
    }
  }

  const currTs = Date.now();
  const currTsFmt = unixTimeToStr(currTs);
  const plan = {
    ts: currTs,
    tsFmt: currTsFmt,
    remoteType: remoteType,
    syncTriggerSource: triggerSource,
    mixedStates: mixedStates,
  } as SyncPlanType;
  return {
    plan: plan,
    sortedKeys: sortedKeys,
    deletions: deletions,
    sizesGoWrong: sizesGoWrong,
    touchedFileMap: touchedFileMap,
  };
};

const uploadExtraMeta = async (
  dir: string,
  client: RemoteClient,
  metadataFile: FileOrFolderMixedState | undefined,
  origMetadata: MetadataOnRemote | undefined,
  deletions: DeletionOnRemote[],
  password: string = ""
) => {
  if (deletions === undefined || deletions.length === 0) {
    return;
  }

  log.info('upload extra meta: ', metadataFile);
  const key = DEFAULT_FILE_NAME_FOR_METADATAONREMOTE;
  let remoteEncryptedKey = key;

  if (password !== "") {
    if (metadataFile === undefined) {
      remoteEncryptedKey = undefined;
    } else {
      remoteEncryptedKey = metadataFile.remoteEncryptedKey;
    }
    if (remoteEncryptedKey === undefined || remoteEncryptedKey === "") {
      // remoteEncryptedKey = await encryptStringToBase32(key, password);
      remoteEncryptedKey = await encryptStringToBase64url(key, password);
    }
  }

  const newMetadata: MetadataOnRemote = {
    deletions: deletions,
  };

  if (isEqualMetadataOnRemote(origMetadata, newMetadata)) {
    log.debug(
      "metadata are the same, no need to re-generate and re-upload it."
    );
    return;
  }

  const resultText = serializeMetadataOnRemote(newMetadata);

  await client.uploadToRemote(
    metadataFile?.key || `${dir}/${key}`,
    RemoteSrcPrefix,
    undefined,
    false,
    password,
    remoteEncryptedKey,
    undefined,
    true,
    resultText
  );
};


const dispatchOperationToActual = async (
  key: string,
  vaultRandomID: string,
  r: FileOrFolderMixedState,
  client: RemoteClient,
  db: InternalDBs,
  vault: Vault,
  localDeleteFunc: any,
  password: string = ""
) => {
  log.info('dispatch - ', key, r.key);
  let remoteEncryptedKey = key;
  if (password !== "") {
    remoteEncryptedKey = r.remoteEncryptedKey;
    if (remoteEncryptedKey === undefined || remoteEncryptedKey === "") {
      // the old version uses base32
      // remoteEncryptedKey = await encryptStringToBase32(key, password);
      // the new version users base64url
      remoteEncryptedKey = await encryptStringToBase64url(key, password);
    }
  }

  if (r.decision === undefined) {
    throw Error(`unknown decision in ${JSON.stringify(r)}`);
  } else if (r.decision === "skipUploading") {
    // do nothing!
  } else if (r.decision === "uploadLocalDelHistToRemote") {
    if (r.existLocal) {
      await localDeleteFunc(r.key);
    }
    if (r.existRemote) {
      await client.deleteFromRemote(r.key, RemoteSrcPrefix, password, remoteEncryptedKey);
    }
    await clearDeleteRenameHistoryOfKeyAndVault(db, r.key, vaultRandomID);
  } else if (r.decision === "keepRemoteDelHist") {
    if (r.existLocal) {
      await localDeleteFunc(r.key);
    }
    if (r.existRemote) {
      await client.deleteFromRemote(r.key, RemoteSrcPrefix, password, remoteEncryptedKey);
    }
    await clearDeleteRenameHistoryOfKeyAndVault(db, r.key, vaultRandomID);
  } else if (r.decision === "uploadLocalToRemote") {
    if (r.remoteUnsync) {
      // TODO: Add a hook to alert users the risk of data lost on the remote
      log.info('download last changed version from remote for backup: ', r.key)
      const conflictKey = () => '.' + Math.random().toFixed(4).slice(2) + '.conflict.md'
      let renamed = r.key.replace(/\.md$/ig, conflictKey());
      renamed = Path.insertSubPath(renamed, RemoteConflictPrefix)
      await mkdirpInVault(renamed, vault);
      await client.downloadFromRemote(
        r.key,
        RemoteSrcPrefix,
        vault,
        r.mtimeRemote,
        password,
        remoteEncryptedKey,
        false,
        renamed
      );

      await Utils.appendFile(vault, renamed, ConflictDescriptionTxt);
    }
    const remoteObjMeta = await client.uploadToRemote(
      r.key,
      RemoteSrcPrefix,
      vault,
      false,
      password,
      remoteEncryptedKey
    );
    await upsertSyncMetaMappingDataByVault(
      client.serviceType,
      db,
      r.key,
      r.mtimeLocal,
      r.sizeLocal,
      r.key,
      remoteObjMeta.lastModified,
      remoteObjMeta.size,
      remoteObjMeta.etag,
      vaultRandomID
    );
    await clearDeleteRenameHistoryOfKeyAndVault(db, r.key, vaultRandomID);
  } else if (r.decision === "downloadRemoteToLocal") {
    if (r.remoteUnsync && r.existLocal) {
      // TODO: Add a hook to alert users the risk of data lost on the local
      log.info('rename last changed version from local for backup: ', r.key)
      const conflictKey = () => '.' + Math.random().toFixed(4).slice(2) + '.conflict.md'
      let renamed = r.key.replace(/\.md$/ig, conflictKey());
      renamed = Path.insertSubPath(renamed, LocalConflictPrefix)
      await mkdirpInVault(renamed, vault);
      await vault.adapter.rename(r.key, renamed);
      await Utils.appendFile(vault, renamed, ConflictDescriptionTxt);
    }

    log.info('mkdir in vault: ', r.key);
    await mkdirpInVault(r.key, vault); /* should be unnecessary */

    log.info('download from remote: ', r.key)
    const remoteInfo = await client.downloadFromRemote(
      r.key,
      RemoteSrcPrefix,
      vault,
      r.mtimeRemote,
      password,
      remoteEncryptedKey
    );
    log.info('remote data info: ', remoteInfo);
    // bodyContents,
    // lastModified: data.LastModified.valueOf(),
    // size: data.ContentLength,
    // remoteType: "s3",
    // etag: data.ETag,
    // 下载时也做个同步
    await upsertSyncMetaMappingDataByVault(
      client.serviceType,
      db,
      r.key,
      r.mtimeRemote,
      r.sizeRemote,
      r.key,
      r.mtimeRemote,
      r.sizeRemote,
      r.etagRemote,
      vaultRandomID
    );

    await clearDeleteRenameHistoryOfKeyAndVault(db, r.key, vaultRandomID);
  } else if (r.decision === "createFolder") {
    if (!r.existLocal) {
      await mkdirpInVault(r.key, vault);
    }
    if (!r.existRemote) {
      const remoteObjMeta = await client.uploadToRemote(
        r.key,
        RemoteSrcPrefix,
        vault,
        false,
        password,
        remoteEncryptedKey
      );
      await upsertSyncMetaMappingDataByVault(
        client.serviceType,
        db,
        r.key,
        r.mtimeLocal,
        r.sizeLocal,
        r.key,
        remoteObjMeta.lastModified,
        remoteObjMeta.size,
        remoteObjMeta.etag,
        vaultRandomID
      );
    }
    await clearDeleteRenameHistoryOfKeyAndVault(db, r.key, vaultRandomID);
  } else if (r.decision === "uploadLocalDelHistToRemoteFolder") {
    if (r.existLocal) {
      await localDeleteFunc(r.key);
    }
    if (r.existRemote) {
      await client.deleteFromRemote(r.key, RemoteSrcPrefix, password, remoteEncryptedKey);
    }
    await clearDeleteRenameHistoryOfKeyAndVault(db, r.key, vaultRandomID);
  } else if (r.decision === "keepRemoteDelHistFolder") {
    if (r.existLocal) {
      await localDeleteFunc(r.key);
    }
    if (r.existRemote) {
      await client.deleteFromRemote(r.key, RemoteSrcPrefix, password, remoteEncryptedKey);
    }
    await clearDeleteRenameHistoryOfKeyAndVault(db, r.key, vaultRandomID);
  } else if (r.decision === "skipFolder") {
    // do nothing!
  } else if (r.decision === "skipUploadingTooLarge") {
    // do nothing!
  } else if (r.decision === "skipDownloadingTooLarge") {
    // do nothing!
  } else if (r.decision === "skipUsingLocalDelTooLarge") {
    // do nothing!
  } else if (r.decision === "skipUsingRemoteDelTooLarge") {
    // do nothing!
  } else {
    throw Error(`unknown decision in ${JSON.stringify(r)}`);
  }
};

const splitThreeSteps = (syncPlan: SyncPlanType, sortedKeys: string[]) => {
  const mixedStates = syncPlan.mixedStates;
  const totalCount = sortedKeys.length || 0;

  const folderCreationOps: FileOrFolderMixedState[][] = [];
  const deletionOps: FileOrFolderMixedState[][] = [];
  const uploadDownloads: FileOrFolderMixedState[][] = [];
  let realTotalCount = 0;

  for (let i = 0; i < sortedKeys.length; ++i) {
    const key = sortedKeys[i];
    const val: FileOrFolderMixedState = Object.assign({}, mixedStates[key]); // copy to avoid issue

    if (
      val.decision === "skipFolder" ||
      val.decision === "skipUploading" ||
      val.decision === "skipDownloadingTooLarge" ||
      val.decision === "skipUploadingTooLarge" ||
      val.decision === "skipUsingLocalDelTooLarge" ||
      val.decision === "skipUsingRemoteDelTooLarge"
    ) {
      // pass
    } else if (val.decision === "createFolder") {
      const level = atWhichLevel(key);
      if (folderCreationOps[level - 1] === undefined) {
        folderCreationOps[level - 1] = [val];
      } else {
        folderCreationOps[level - 1].push(val);
      }
      realTotalCount += 1;
    } else if (
      val.decision === "uploadLocalDelHistToRemoteFolder" ||
      val.decision === "keepRemoteDelHistFolder" ||
      val.decision === "uploadLocalDelHistToRemote" ||
      val.decision === "keepRemoteDelHist"
    ) {
      const level = atWhichLevel(key);
      if (deletionOps[level - 1] === undefined) {
        deletionOps[level - 1] = [val];
      } else {
        deletionOps[level - 1].push(val);
      }
      realTotalCount += 1;
    } else if (
      val.decision === "uploadLocalToRemote" ||
      val.decision === "downloadRemoteToLocal"
    ) {
      if (uploadDownloads.length === 0) {
        uploadDownloads[0] = [val];
      } else {
        uploadDownloads[0].push(val); // only one level needed here
      }
      realTotalCount += 1;
    } else {
      throw Error(`unknown decision ${val.decision} for ${key}`);
    }
  }

  // the deletionOps should be run from max level to min level
  // right now it is sorted by level from min to max (NOT length of key!)
  // so we need to reverse it!
  deletionOps.reverse(); // inplace reverse

  return {
    folderCreationOps: folderCreationOps,
    deletionOps: deletionOps,
    uploadDownloads: uploadDownloads,
    realTotalCount: realTotalCount,
  };
};

export const doActualSync = async (
  client: RemoteClient,
  db: InternalDBs,
  vaultRandomID: string,
  vault: Vault,
  syncPlan: SyncPlanType,
  sortedKeys: string[],
  slug: string, // For targeting dir
  metadataFile: FileOrFolderMixedState,
  origMetadata: MetadataOnRemote,
  sizesGoWrong: FileOrFolderMixedState[],
  deletions: DeletionOnRemote[],
  localDeleteFunc: any,
  password: string = "",
  concurrency: number = 1,
  callbackSizesGoWrong?: any,
  callbackSyncProcess?: any,
  callbackSyncDone?: any,
  callbackConflictSync?: any
) => {
  const mixedStates = syncPlan.mixedStates;
  const totalCount = sortedKeys.length || 0;

  if (sizesGoWrong.length > 0) {
    log.debug(`some sizes are larger than the threshold, abort and show hints`);
    callbackSizesGoWrong(sizesGoWrong);
    return;
  }

  log.debug(`start syncing extra data firstly ${slug} - ${JSON.stringify(metadataFile)}`);
  await uploadExtraMeta(
    slug,
    client,
    metadataFile,
    origMetadata,
    deletions,
    password
  );
  log.debug(`finish syncing extra data firstly`);

  log.debug(`concurrency === ${concurrency}`);
  if (concurrency === 1) {
    // run everything in sequence
    // good old way
    for (let i = 0; i < sortedKeys.length; ++i) {
      const key = sortedKeys[i];
      const val = mixedStates[key];

      log.debug(`start syncing "${key}" with plan ${JSON.stringify(val)}`);

      if (callbackSyncProcess !== undefined) {
        await callbackSyncProcess(i, totalCount, key, val.decision);
      }

      if (callbackConflictSync !== undefined) {
        if (val.decision === 'uploadLocalToRemote' && val.remoteUnsync) {
          callbackConflictSync(key);
        }
      }

      await dispatchOperationToActual(
        key,
        vaultRandomID,
        val,
        client,
        db,
        vault,
        localDeleteFunc,
        password
      );
      log.debug(`finished ${key}`);
    }

    return; // shortcut return, avoid too many nests below
  }

  const { folderCreationOps, deletionOps, uploadDownloads, realTotalCount } =
    splitThreeSteps(syncPlan, sortedKeys);
  const nested = [folderCreationOps, deletionOps, uploadDownloads];
  const logTexts = [
    `1. create all folders from shadowest to deepest, also check undefined decision`,
    `2. delete files and folders from deepest to shadowest`,
    `3. upload or download files in parallel, with the desired concurrency=${concurrency}`,
  ];

  let realCounter = 0;

  for (let i = 0; i < nested.length; ++i) {
    log.debug(logTexts[i]);

    const operations: FileOrFolderMixedState[][] = nested[i];

    for (let j = 0; j < operations.length; ++j) {
      const singleLevelOps: FileOrFolderMixedState[] | undefined =
        operations[j];

      if (singleLevelOps === undefined || singleLevelOps === null) {
        continue;
      }

      const queue = new PQueue({ concurrency: concurrency, autoStart: true });
      const potentialErrors: Error[] = [];
      let tooManyErrors = false;

      for (let k = 0; k < singleLevelOps.length; ++k) {
        const val: FileOrFolderMixedState = singleLevelOps[k];
        const key = val.key;

        const fn = async () => {
          log.debug(`start syncing "${key}" with plan ${JSON.stringify(val)}`);

          if (callbackSyncProcess !== undefined) {
            await callbackSyncProcess(
              realCounter,
              realTotalCount,
              key,
              val.decision
            );

            realCounter += 1;
          }

          if (callbackConflictSync !== undefined) {
            if (val.decision === 'uploadLocalToRemote' && val.remoteUnsync) {
              callbackConflictSync(key);
            }
          }

          await dispatchOperationToActual(
            key,
            vaultRandomID,
            val,
            client,
            db,
            vault,
            localDeleteFunc,
            password
          ).catch((err) => {
            if (callbackSyncDone !== undefined) {
              callbackSyncDone(
                realCounter,
                realTotalCount,
                key,
                val.decision,
                err
              );
  
              realCounter += 1;
            }
            throw err;
          })
          if (callbackSyncDone !== undefined) {
            await callbackSyncDone(
              realCounter,
              realTotalCount,
              key,
              val.decision
            );

            realCounter += 1;
          }
          log.debug(`finished ${key}`);
        };

        queue.add(fn).catch((e) => {
          const msg = `${key}: ${e.message}`;
          potentialErrors.push(new Error(msg));
          if (potentialErrors.length >= 3) {
            tooManyErrors = true;
            queue.pause();
            queue.clear();
          }
        });
      }

      await queue.onIdle();

      if (potentialErrors.length > 0) {
        if (tooManyErrors) {
          potentialErrors.push(
            new Error("too many errors, stop the remaining tasks")
          );
        }
        throw new AggregateError(potentialErrors);
      }
    }
  }
};

export const syncAttachment = async (vault: Vault, client: RemoteClient, embeds: any[], decision: string, cb: (type: string, link: string, result: any, err?: any) => void) => {
  // @ts-ignore
  const attachmentFolderPath = vault.getConfig('attachmentFolderPath');
  const attachmentFolderPrefix = attachmentFolderPath?.replace(/\/$/, '');
  const attachmentList = await vault.adapter.list(attachmentFolderPrefix + '/'); 
  
  const localAttachmentFiles: string[] = attachmentList.files;
  log.info('local dir list: ', localAttachmentFiles);

  // TODO: For all embeding formats.
  const embedImages = embeds
    .filter((em: any) => em.link?.startsWith('Pasted image '))
    .map(em => em.link);

  log.info('embed list: ', embedImages);

  const getLinkWithPrefix = (link: string) => `${attachmentFolderPrefix}/${link}`.replace(/^\//, '');
  // TODO: Remove deleted attachment files
  if (decision === 'uploadLocalToRemote') {
    const diff = embedImages.filter(link => {
      const exist = localAttachmentFiles.find(f => f === getLinkWithPrefix(link));
      return exist;
    })
    await Promise.all(diff.map(async link => {
      log.info('uploading attachment: ', link);
      return client.uploadToRemote(
        getLinkWithPrefix(link),
        RemoteAttPrefix,
        vault,
        false,
        '',
        '',
        null,
        false,
        null,
        `${RemoteAttPrefix}/${link}`
      )
      .then(resp => {
        cb && cb('upload', link, resp);
      })
      .catch(err => {
        log.error(`upload ${link} failed: ${err}`);
        cb && cb('upload', link, null, err);
        return;
      })
    }))
    .catch(err => {
      log.error('unexpected err: ', err);
    })
  } else {
    const diff: string[] = embedImages.map(link => {
      const exist = localAttachmentFiles.find(f => f === getLinkWithPrefix(link));
      return exist ? null : link;
    })
    .filter(l => !!l);

    await Promise.all(diff.map(async link => {
      log.info('downloading attachment: ', link);
      return client.downloadFromRemote(
        link,
        RemoteAttPrefix,
        vault,
        Date.now(),
        '',
        '',
        false,
        getLinkWithPrefix(link)
      )
      .then(resp => {
        cb && cb('download', link, resp);
      })
      .catch(err => {
        log.error(`download ${link} failed: ${err}`);
        cb && cb('download', link, null, err);
      })
    }))
    .catch(err => {
      log.error('unexpected err: ', err);
    })
  } 
}