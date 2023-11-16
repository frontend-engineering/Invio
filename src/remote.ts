import { Vault } from "obsidian";
import type {
  S3Config,
  SUPPORTED_SERVICES_TYPE,
  THostConfig,
} from "./baseTypes";
import * as s3 from "./remoteForS3";
import { Path, WEB_PATH_SPLITER } from './utils/path';
import { log } from "./moreOnLog";
import { RemoteSrcPrefix } from "./sync";

export { ServerDomain, HostServerUrl, AppHostServerUrl } from './remoteForS3'
export class RemoteClient {
  readonly serviceType: SUPPORTED_SERVICES_TYPE;
  readonly s3Config?: S3Config;
  readonly hostConfig?: THostConfig;
  readonly useHost?: boolean;
  readonly localWatchDir?: string;
  constructor(
    serviceType: SUPPORTED_SERVICES_TYPE,
    s3Config?: S3Config,
    hostConfig?: THostConfig,
    useHost?: boolean,
    localWatchDir?: string,
    vaultName?: string,
    saveUpdatedConfigFunc?: () => Promise<any>
  ) {
    this.serviceType = serviceType;
    this.useHost = useHost;
    this.hostConfig = hostConfig;
    this.localWatchDir = localWatchDir;
    // the client may modify the config inplace,
    // so we use a ref not copy of config here
    if (serviceType === "s3") {
      this.s3Config = s3Config;
    } else {
      throw Error(`not supported service type ${this.serviceType}`);
    }
  }

  // localWatchDir -> slug
  getUseHostSlug() {
    if (!this.localWatchDir) {
      throw new Error('FolderNotFound');
    }
    if (!this.useHost) {
      return this.localWatchDir;
    }
    
    if (!this.hostConfig?.hostPair?.dir) {
      throw new Error('ProjectNotSync');
    }
    if (this.hostConfig?.hostPair?.dir !== this.localWatchDir) {
      throw new Error('NeedSwitchProject');
    }
    return (this.hostConfig?.hostPair?.password ? 'p/' : '') + this.hostConfig?.hostPair.slug;
  }

  getUseHostDirname() {
    if (!this.localWatchDir) {
      throw new Error('FolderNotFound');
    }
    if (!this.useHost) {
      return this.localWatchDir;
    }

    if (!this.hostConfig?.hostPair?.dir) {
      throw new Error('ProjectNotSync');
    }
    if (this.hostConfig?.hostPair?.dir !== this.localWatchDir) {
      throw new Error('NeedSwitchProject');
    }
    return this.hostConfig?.hostPair.dir;
  }

  getUseHostSlugPath(key: string) {
    let localPath = ''
    if (!this.useHost) {
      localPath = key;
    } else {
      const hasPrefix = key?.startsWith(RemoteSrcPrefix);
      const paths = Path.splitString(key);
      if (paths?.length > 0) {
        let dir = hasPrefix ? paths[1] : paths[0];
        if (dir === 'p') {
          paths.splice(0, 1);
          dir = hasPrefix ? paths[1] : paths[0];
        }
  
        if (dir !== this.localWatchDir) {
          throw new Error('NeedSwitchProject');
        }
        if (hasPrefix) {
          paths[1] = this.getUseHostSlug();
        } else {
          paths[0] = this.getUseHostSlug();
        }
        localPath = Path.joinString(paths);
      }
    }

    return localPath;
  }

  getUseHostLocalPath(slug: string) {
    let webPath = ''
    if (!this.useHost) {
      webPath = slug
    } else {
      const hasPrefix = slug?.startsWith(RemoteSrcPrefix);
      const paths = slug?.split(WEB_PATH_SPLITER);
      let encrypted = false;
      if (paths?.length > 0) {
        let dir = hasPrefix ? paths[1] : paths[0];
        if (dir === 'p') {
          encrypted = true;
          dir = hasPrefix ? paths[2] : paths[1];
        }
        const getSlug = this.getUseHostSlug();
        if (dir !== getSlug?.replace(/^p\//, '')) {
          throw new Error('NeedSwitchProject');
        }
        if (hasPrefix) {
          paths[encrypted ? 2 : 1] = this.getUseHostDirname();
        } else {
          paths[encrypted ? 1 : 0] = this.getUseHostDirname();
        }
        webPath = Path.joinString(paths);
        log.info('get local path: ', webPath)
      }
    }

    return webPath
  }

  uploadToRemote = async (
    fileOrFolderPath: string,
    prefix: string,
    vault: Vault,
    isRecursively: boolean = false,
    password: string = "",
    remoteEncryptedKey: string = "",
    foldersCreatedBefore: Set<string> | undefined = undefined,
    uploadRaw: boolean = false,
    rawContent: string | ArrayBuffer = "",
    remoteKey?: string
  ) => {
    if (this.serviceType === "s3") {
      const s3Client = await s3.getS3Client(this.s3Config, this.hostConfig, this.useHost, this.localWatchDir);
      return await s3.uploadToRemote(
        s3Client,
        this.s3Config,
        fileOrFolderPath,
        prefix,
        vault,
        isRecursively,
        password,
        remoteEncryptedKey,
        uploadRaw,
        rawContent,
        remoteKey ? `${this.getUseHostSlugPath(remoteKey)}` : `${prefix}${this.getUseHostSlugPath(fileOrFolderPath)}`
      );
    } else {
      throw Error(`not supported service type ${this.serviceType}`);
    }
  };

  listFromRemote = async (dir?: string, prefix?: string) => {
    if (this.serviceType === "s3") {
      const slug = (prefix || '') + this.getUseHostSlugPath(dir);

      const s3Client = await s3.getS3Client(this.s3Config, this.hostConfig, this.useHost, this.localWatchDir);
      const remoteRsp = await s3.listFromRemote(
        s3Client,
        this.s3Config,
        slug
      );
      return (remoteRsp?.Contents || []).map(item => {
        if (!item) {
          return item;
        }
        item.key = this.getUseHostLocalPath(item.key);
        return item;
      })
    } else {
      throw Error(`not supported service type ${this.serviceType}`);
    }
  };

  downloadFromRemote = async (
    fileOrFolderPath: string,
    prefix: string,
    vault: Vault,
    mtime: number,
    password: string = "",
    remoteEncryptedKey: string = "",
    skipSaving: boolean = false,
    renamedTo: string = ''
  ) => {
    if (this.serviceType === "s3") {
      const s3Client = await s3.getS3Client(this.s3Config, this.hostConfig, this.useHost, this.localWatchDir);
      return await s3.downloadFromRemote(
        s3Client,
        this.s3Config,
        this.getUseHostSlugPath(fileOrFolderPath),
        prefix,
        vault,
        mtime,
        password,
        remoteEncryptedKey,
        skipSaving,
        renamedTo || fileOrFolderPath
      );
    } else {
      throw Error(`not supported service type ${this.serviceType}`);
    }
  };

  deleteFromRemote = async (
    fileOrFolderPath: string,
    prefix: string,
    password: string = "",
    remoteEncryptedKey: string = ""
  ) => {
    if (this.serviceType === "s3") {
      const s3Client = await s3.getS3Client(this.s3Config, this.hostConfig, this.useHost, this.localWatchDir);
      return await s3.deleteFromRemote(
        s3Client,
        this.s3Config,
        this.getUseHostSlugPath(fileOrFolderPath),
        prefix,
        password,
        remoteEncryptedKey
      );
    } else {
      throw Error(`not supported service type ${this.serviceType}`);
    }
  };

  checkConnectivity = async (callbackFunc?: any) => {
    if (this.serviceType === "s3") {
      const s3Client = await s3.getS3Client(this.s3Config, this.hostConfig, this.useHost, this.localWatchDir);
      return await s3.checkConnectivity(
        s3Client,
        this.s3Config,
        callbackFunc
      );
    } else {
      throw Error(`not supported service type ${this.serviceType}`);
    }
  };

  getUser = async () => {
    throw Error(`not supported service getUser`);
  };

  revokeAuth = async () => {
    throw Error(`not supported service revokeAuth`);
  };
}
