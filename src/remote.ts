import { Vault } from "obsidian";
import type {
  S3Config,
  SUPPORTED_SERVICES_TYPE,
  THostConfig,
} from "./baseTypes";
import * as s3 from "./remoteForS3";

import { log } from "./moreOnLog";

export class RemoteClient {
  readonly serviceType: SUPPORTED_SERVICES_TYPE;
  readonly s3Config?: S3Config;
  readonly hostConfig?: THostConfig;
  readonly useHost?: boolean;
  constructor(
    serviceType: SUPPORTED_SERVICES_TYPE,
    s3Config?: S3Config,
    hostConfig?: THostConfig,
    useHost?: boolean,
    vaultName?: string,
    saveUpdatedConfigFunc?: () => Promise<any>
  ) {
    this.serviceType = serviceType;
    this.useHost = useHost;
    this.hostConfig = hostConfig;
    // the client may modify the config inplace,
    // so we use a ref not copy of config here
    if (serviceType === "s3") {
      this.s3Config = s3Config;
    } else {
      throw Error(`not supported service type ${this.serviceType}`);
    }
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
      const s3Client = await s3.getS3Client(this.s3Config, this.hostConfig, this.useHost);
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
        remoteKey
      );
    } else {
      throw Error(`not supported service type ${this.serviceType}`);
    }
  };

  listFromRemote = async (prefix?: string) => {
    if (this.serviceType === "s3") {
      const s3Client = await s3.getS3Client(this.s3Config, this.hostConfig, this.useHost);
      return await s3.listFromRemote(
        s3Client,
        this.s3Config,
        prefix
      );
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
      const s3Client = await s3.getS3Client(this.s3Config, this.hostConfig, this.useHost);
      return await s3.downloadFromRemote(
        s3Client,
        this.s3Config,
        fileOrFolderPath,
        prefix,
        vault,
        mtime,
        password,
        remoteEncryptedKey,
        skipSaving,
        renamedTo
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
      const s3Client = await s3.getS3Client(this.s3Config, this.hostConfig, this.useHost);
      return await s3.deleteFromRemote(
        s3Client,
        this.s3Config,
        fileOrFolderPath,
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
      const s3Client = await s3.getS3Client(this.s3Config, this.hostConfig, this.useHost);
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
