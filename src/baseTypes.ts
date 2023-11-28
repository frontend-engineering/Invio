/**
 * Only type defs here.
 * To avoid circular dependency.
 */

import { Platform, requireApiVersion } from "obsidian";
import type { LangType, LangTypeAndAuto } from "./i18n";

export const DEFAULT_CONTENT_TYPE = "application/octet-stream";

export type SUPPORTED_SERVICES_TYPE = "s3" | "webdav" | "dropbox" | "onedrive";

export type SUPPORTED_SERVICES_TYPE_WITH_REMOTE_BASE_DIR =
  | "webdav"
  | "dropbox"
  | "onedrive";

export interface S3Config {
  s3Endpoint: string;
  s3Region: string;
  s3AccessKeyID: string;
  s3SecretAccessKey: string;
  s3BucketName: string;
  bypassCorsLocally?: boolean;
  partsConcurrency?: number;
  forcePathStyle?: boolean;
}

export interface DropboxConfig {
  accessToken: string;
  clientID: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  accessTokenExpiresAtTime: number;
  accountID: string;
  username: string;
  credentialsShouldBeDeletedAtTime?: number;
  remoteBaseDir?: string;
}

export type WebdavAuthType = "digest" | "basic";
export type WebdavDepthType =
  | "auto_unknown"
  | "auto_1"
  | "auto_infinity"
  | "manual_1"
  | "manual_infinity";

export interface WebdavConfig {
  address: string;
  username: string;
  password: string;
  authType: WebdavAuthType;
  manualRecursive: boolean; // deprecated in 0.3.6, use depth
  depth?: WebdavDepthType;
  remoteBaseDir?: string;
}

export interface OnedriveConfig {
  accessToken: string;
  clientID: string;
  authority: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  accessTokenExpiresAtTime: number;
  deltaLink: string;
  username: string;
  credentialsShouldBeDeletedAtTime?: number;
  remoteBaseDir?: string;
}

export type THostPair = {
  dir: string;
  slug: string;
  password?: string;
}

export type TS3Credential = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
}
export type THostConfig = {
  token: string;
  user?: any;
  hostPair?: THostPair,
  credential?: TS3Credential
}
export interface InvioPluginSettings {
  useHost: boolean;
  // token: string;
  // user: any;
  // hostPair?: THostPair;
  hostConfig?: THostConfig;
  s3: S3Config;
  password: string;
  remoteDomain: string;
  serviceType: SUPPORTED_SERVICES_TYPE;
  currLogLevel?: string;
  autoRunEveryMilliseconds?: number;
  initRunAfterMilliseconds?: number;

  autoCheckEveryMilliseconds?: number; 
  initCheckAfterMilliseconds?: number;
  agreeToUploadExtraMetadata?: boolean;
  concurrency?: number;
  syncConfigDir?: boolean;
  localWatchDir: string;
  syncUnderscoreItems?: boolean;
  lang?: LangTypeAndAuto;
  logToDB?: boolean;
  skipSizeLargerThan?: number;

  /**
   * @deprecated
   */
  vaultRandomID?: string;
}

export interface RemoteItem {
  key: string;
  lastModified: number;
  size: number;
  remoteType: SUPPORTED_SERVICES_TYPE;
  etag?: string;
}

export const COMMAND_URI = "invio";
export const COMMAND_CALLBACK = "invio-auth-cb";
export const COMMAND_CALLBACK_ONEDRIVE = "invio-cb-onedrive";
export const COMMAND_CALLBACK_DROPBOX = "invio-cb-dropbox";

export interface UriParams {
  func?: string;
  vault?: string;
  ver?: string;
  data?: string;
}

// 80 days
export const OAUTH2_FORCE_EXPIRE_MILLISECONDS = 1000 * 60 * 60 * 24 * 80;

type DecisionTypeForFile =
  | "skipUploading" // special, mtimeLocal === mtimeRemote
  | "uploadLocalDelHistToRemote" // "delLocalIfExists && delRemoteIfExists && cleanLocalDelHist && uploadLocalDelHistToRemote"
  | "keepRemoteDelHist" // "delLocalIfExists && delRemoteIfExists && cleanLocalDelHist && keepRemoteDelHist"
  | "uploadLocalToRemote" // "skipLocal && uploadLocalToRemote && cleanLocalDelHist && cleanRemoteDelHist"
  | "downloadRemoteToLocal"; // "downloadRemoteToLocal && skipRemote && cleanLocalDelHist && cleanRemoteDelHist"

type DecisionTypeForFileSize =
  | "skipUploadingTooLarge"
  | "skipDownloadingTooLarge"
  | "skipUsingLocalDelTooLarge"
  | "skipUsingRemoteDelTooLarge"
  | "errorLocalTooLargeConflictRemote"
  | "errorRemoteTooLargeConflictLocal";

type DecisionTypeForFolder =
  | "createFolder"
  | "uploadLocalDelHistToRemoteFolder"
  | "keepRemoteDelHistFolder"
  | "skipFolder";

export type DecisionType =
  | DecisionTypeForFile
  | DecisionTypeForFileSize
  | DecisionTypeForFolder;

export type TSyncStatus =
  | "pending"
  | "syncing"
  | "sync-done"
  | "publishing"
  | "done"
  | "fail"

export interface FileOrFolderMixedState {
  key: string;
  existLocal?: boolean;
  existRemote?: boolean;
  mtimeLocal?: number;
  mtimeRemote?: number;
  deltimeLocal?: number;
  deltimeRemote?: number;
  etagRemote?: string;
  remoteUnsync?: boolean;
  sizeLocal?: number;
  sizeLocalEnc?: number;
  sizeRemote?: number;
  sizeRemoteEnc?: number;
  changeRemoteMtimeUsingMapping?: boolean;
  changeLocalMtimeUsingMapping?: boolean;
  decision?: DecisionType;
  decisionBranch?: number;
  remoteEncryptedKey?: string;

  syncType?: `TOREMOTE` | `TOLOCAL`; // upload to remote OR download to local
  syncStatus?: TSyncStatus;
  remoteLink?: string;
  syncError?: string;
  publishError?: string;

  mtimeLocalFmt?: string;
  mtimeRemoteFmt?: string;
  deltimeLocalFmt?: string;
  deltimeRemoteFmt?: string;
}

export const API_VER_STAT_FOLDER = "0.13.27";
export const API_VER_REQURL = "0.13.26"; // desktop ver 0.13.26, iOS ver 1.1.1
export const API_VER_REQURL_ANDROID = "0.14.6"; // Android ver 1.2.1

export const VALID_REQURL =
  (!Platform.isAndroidApp && requireApiVersion(API_VER_REQURL)) ||
  (Platform.isAndroidApp && requireApiVersion(API_VER_REQURL_ANDROID));

export const DEFAULT_DEBUG_FOLDER = "_debug_invio/";
export const DEFAULT_SYNC_PLANS_HISTORY_FILE_PREFIX =
  "sync_plans_hist_exported_on_";
export const DEFAULT_LOG_HISTORY_FILE_PREFIX = "log_hist_exported_on_";

// pre - only check pending files but no more actions
export type SyncTriggerSourceType = "manual" | "auto" | "dry" | "autoOnceInit" | "force" | "pre";
