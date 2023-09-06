import type { _Object } from "@aws-sdk/client-s3";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { HttpHandler, HttpRequest, HttpResponse } from "@aws-sdk/protocol-http";
import {
  FetchHttpHandler,
  FetchHttpHandlerOptions,
} from "@aws-sdk/fetch-http-handler";
// @ts-ignore
import { requestTimeout } from "@aws-sdk/fetch-http-handler/dist-es/request-timeout";
import { buildQueryString } from "@aws-sdk/querystring-builder";
import { HeaderBag, HttpHandlerOptions, Provider } from "@aws-sdk/types";
import { Buffer } from "buffer";
import * as mime from "mime-types";
import { Vault, requestUrl, RequestUrlParam } from "obsidian";
import { Readable } from "stream";
import AggregateError from "aggregate-error";
import {
  DEFAULT_CONTENT_TYPE,
  RemoteItem,
  S3Config,
  THostConfig,
  TS3Credential,
  VALID_REQURL,
} from "./baseTypes";
import { decryptArrayBuffer, encryptArrayBuffer } from "./encrypt";
import {
  arrayBufferToBuffer,
  bufferToArrayBuffer,
  mkdirpInVault,
} from "./misc";
import Utils from './utils';
export { S3Client } from "@aws-sdk/client-s3";

import { log } from "./moreOnLog";

// export const HostServerUrl = 'http://localhost:8888';
// export const AppHostServerUrl = 'http://localhost:8888';
export const HostServerUrl = 'https://api.turbosite.cloud';
export const AppHostServerUrl = 'https://app.turbosite.cloud';
////////////////////////////////////////////////////////////////////////////////
// special handler using Obsidian requestUrl
////////////////////////////////////////////////////////////////////////////////

/**
 * This is close to origin implementation of FetchHttpHandler
 * https://github.com/aws/aws-sdk-js-v3/blob/main/packages/fetch-http-handler/src/fetch-http-handler.ts
 * that is released under Apache 2 License.
 * But this uses Obsidian requestUrl instead.
 */
class ObsHttpHandler extends FetchHttpHandler {
  requestTimeoutInMs: number;
  constructor(options?: FetchHttpHandlerOptions) {
    super(options);
    this.requestTimeoutInMs =
      options === undefined ? undefined : options.requestTimeout;
  }
  async handle(
    request: HttpRequest,
    { abortSignal }: HttpHandlerOptions = {}
  ): Promise<{ response: HttpResponse }> {
    if (abortSignal?.aborted) {
      const abortError = new Error("Request aborted");
      abortError.name = "AbortError";
      return Promise.reject(abortError);
    }

    let path = request.path;
    if (request.query) {
      const queryString = buildQueryString(request.query);
      if (queryString) {
        path += `?${queryString}`;
      }
    }

    const { port, method } = request;
    const url = `${request.protocol}//${request.hostname}${
      port ? `:${port}` : ""
    }${path}`;
    const body =
      method === "GET" || method === "HEAD" ? undefined : request.body;

    const transformedHeaders: Record<string, string> = {};
    for (const key of Object.keys(request.headers)) {
      const keyLower = key.toLowerCase();
      if (keyLower === "host" || keyLower === "content-length") {
        continue;
      }
      transformedHeaders[keyLower] = request.headers[key];
    }

    let contentType: string = undefined;
    if (transformedHeaders["content-type"] !== undefined) {
      contentType = transformedHeaders["content-type"];
    }

    let transformedBody: any = body;
    if (ArrayBuffer.isView(body)) {
      transformedBody = bufferToArrayBuffer(body);
    }

    const param: RequestUrlParam = {
      body: transformedBody,
      headers: transformedHeaders,
      method: method,
      url: url,
      contentType: contentType,
    };

    const raceOfPromises = [
      requestUrl(param).then((rsp) => {
        const headers = rsp.headers;
        const headersLower: Record<string, string> = {};
        for (const key of Object.keys(headers)) {
          headersLower[key.toLowerCase()] = headers[key];
        }
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array(rsp.arrayBuffer));
            controller.close();
          },
        });
        return {
          response: new HttpResponse({
            headers: headersLower,
            statusCode: rsp.status,
            body: stream,
          }),
        };
      }),
      requestTimeout(this.requestTimeoutInMs),
    ];

    if (abortSignal) {
      raceOfPromises.push(
        new Promise<never>((resolve, reject) => {
          abortSignal.onabort = () => {
            const abortError = new Error("Request aborted");
            abortError.name = "AbortError";
            reject(abortError);
          };
        })
      );
    }
    return Promise.race(raceOfPromises);
  }
}

////////////////////////////////////////////////////////////////////////////////
// other stuffs
////////////////////////////////////////////////////////////////////////////////

export const DEFAULT_S3_CONFIG = {
  s3Endpoint: "",
  s3Region: "",
  s3AccessKeyID: "",
  s3SecretAccessKey: "",
  s3BucketName: "",
  bypassCorsLocally: true,
  partsConcurrency: 20,
  forcePathStyle: false,
};

export type S3ObjectType = _Object;

const fromS3ObjectToRemoteItem = (x: S3ObjectType) => {
  return {
    key: x.Key,
    lastModified: x.LastModified.valueOf(),
    size: x.Size,
    remoteType: "s3",
    etag: x.ETag,
  } as RemoteItem;
};

const fromS3HeadObjectToRemoteItem = (
  key: string,
  x: HeadObjectCommandOutput
) => {
  return {
    key: key,
    lastModified: x.LastModified.valueOf(),
    size: x.ContentLength,
    remoteType: "s3",
    etag: x.ETag,
  } as RemoteItem;
};

const getCOSCredential = async (hostConfig: THostConfig, key: string) => {
  const { token } = hostConfig;
  const param: Partial<RequestUrlParam> = {
    body: JSON.stringify({ slug: key }),
    method: 'POST',
  };

  return fetch(`${HostServerUrl}/api/s3/cred?priatoken=${token}`, param)
    .then(resp => resp.json())
    .then(resp => {
      if (resp?.error) {
        // Match with backend
        if (resp.error === 'No valid project found') {
          // 已经检查过project信息，所以不应该出现这个错误
        }
        if (resp.error === 'Usage limited') {
          Utils.gotoAuth();
        }
        throw new Error(`Error: ${resp.error}`);
      }
      return resp;
    })
}

const validCredential = (hostConfig: THostConfig, localWatchDir: string) => {
  const { credential: cred, hostPair } = hostConfig || {};
  if (!cred?.accessKeyId) return null;
  if (!cred?.expiration) return null;

  if (hostPair?.dir !== localWatchDir) return null;
  if (!hostPair.slug) return null;
  if (new Date(cred.expiration).valueOf() < Date.now()) return null;
  return cred;
}

// Use Host Service or self-host
export const getS3Client = async (s3Config: S3Config, hostConfig?: THostConfig, useHost?: boolean, localWatchDir?: string) => {
  let endpoint = s3Config.s3Endpoint;
  if (!(endpoint.startsWith("http://") || endpoint.startsWith("https://"))) {
    endpoint = `https://${endpoint}`;
  }

  log.info('s3 client gen: ', s3Config, hostConfig, useHost);
  let s3Client: S3Client;
  let credential = {
    accessKeyId: s3Config.s3AccessKeyID,
    secretAccessKey: s3Config.s3SecretAccessKey,
  };

  if (useHost) {
    if (!hostConfig?.token) {
      // Goto Auth
      Utils.gotoAuth();
      throw new Error('Unauthorized');
    }
    // Check existing project
    if (!validCredential(hostConfig, localWatchDir)) {
      const projectSlug = hostConfig?.hostPair?.slug;
      const resp = await getCOSCredential(hostConfig, projectSlug);
      log.info('got new cred');
      // Memory Only
      hostConfig.credential = {
        accessKeyId: resp.cred?.AccessKeyId,
        secretAccessKey: resp.cred?.SecretAccessKey,
        sessionToken: resp.cred?.SessionToken,
        expiration: resp.cred?.Expiration
      }
    } else {
      log.info('existed credential');
    }

    if (hostConfig.credential?.accessKeyId) {
      credential = hostConfig.credential;
    } else {
      throw new Error('Request credential failed');
    }
  }

  if (VALID_REQURL && s3Config.bypassCorsLocally) {
    s3Client = new S3Client({
      region: s3Config.s3Region,
      endpoint: endpoint,
      forcePathStyle: s3Config.forcePathStyle,
      credentials: credential,
      requestHandler: new ObsHttpHandler(),
    });
  } else {
    s3Client = new S3Client({
      region: s3Config.s3Region,
      endpoint: endpoint,
      forcePathStyle: s3Config.forcePathStyle,
      credentials: {
        accessKeyId: s3Config.s3AccessKeyID,
        secretAccessKey: s3Config.s3SecretAccessKey,
      },
    });
  }

  s3Client.middlewareStack.add(
    (next, context) => (args) => {
      (args.request as any).headers["cache-control"] = "no-cache";
      return next(args);
    },
    {
      step: "build",
    }
  );

  return s3Client;
};

export const getRemoteMeta = async (
  s3Client: S3Client,
  s3Config: S3Config,
  fileOrFolderPath: string
) => {
  const res = await s3Client.send(
    new HeadObjectCommand({
      Bucket: s3Config.s3BucketName,
      Key: fileOrFolderPath,
    })
  );

  return fromS3HeadObjectToRemoteItem(fileOrFolderPath, res);
};

export const uploadToRemote = async (
  s3Client: S3Client,
  s3Config: S3Config,
  fileOrFolderPath: string,
  prefix: string,
  vault: Vault,
  isRecursively: boolean = false,
  password: string = "",
  remoteEncryptedKey: string = "",
  uploadRaw: boolean = false,
  rawContent: string | ArrayBuffer = "",
  remoteKey?: string
) => {
  let uploadFile = prefix + fileOrFolderPath;
  if (password !== "") {
    uploadFile = prefix + remoteEncryptedKey;
  }
  const isFolder = fileOrFolderPath.endsWith("/");

  if (isFolder && isRecursively) {
    throw Error("upload function doesn't implement recursive function yet!");
  } else if (isFolder && !isRecursively) {
    if (uploadRaw) {
      throw Error(`you specify uploadRaw, but you also provide a folder key!`);
    }
    // folder
    const contentType = DEFAULT_CONTENT_TYPE;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: s3Config.s3BucketName,
        Key: uploadFile,
        Body: "",
        ContentType: contentType,
      })
    );
    return await getRemoteMeta(s3Client, s3Config, uploadFile);
  } else {
    // file
    // we ignore isRecursively parameter here
    let contentType = DEFAULT_CONTENT_TYPE;
    if (password === "") {
      contentType =
        mime.contentType(
          mime.lookup(fileOrFolderPath) || DEFAULT_CONTENT_TYPE
        ) || DEFAULT_CONTENT_TYPE;
    }
    let localContent = undefined;
    if (uploadRaw) {
      if (typeof rawContent === "string") {
        localContent = new TextEncoder().encode(rawContent).buffer;
      } else {
        localContent = rawContent;
      }
    } else {
      localContent = await vault.adapter.readBinary(fileOrFolderPath);
    }
    let remoteContent = localContent;
    if (password !== "") {
      remoteContent = await encryptArrayBuffer(localContent, password);
    }

    const bytesIn5MB = 5242880;
    const body = new Uint8Array(remoteContent);

    const upload = new Upload({
      client: s3Client,
      queueSize: s3Config.partsConcurrency, // concurrency
      partSize: bytesIn5MB, // minimal 5MB by default
      leavePartsOnError: false,
      params: {
        Bucket: s3Config.s3BucketName,
        Key: remoteKey || uploadFile,
        Body: body,
        ContentType: contentType,
      },
    });
    upload.on("httpUploadProgress", (progress) => {
      log.info('upload progress: ', progress);
    });
    await upload.done();

    return await getRemoteMeta(s3Client, s3Config, remoteKey || uploadFile);
  }
};

export const listFromRemote = async (
  s3Client: S3Client,
  s3Config: S3Config,
  prefix?: string
) => {
  const confCmd = {
    Bucket: s3Config.s3BucketName,
  } as ListObjectsV2CommandInput;
  if (prefix !== undefined) {
    confCmd.Prefix = prefix;
  }

  const contents = [] as _Object[];

  let isTruncated = true;
  do {
    const rsp = await s3Client.send(new ListObjectsV2Command(confCmd));

    if (rsp.$metadata.httpStatusCode !== 200) {
      throw Error("some thing bad while listing remote!");
    }
    if (rsp.Contents === undefined) {
      break;
    }

    contents.push(...rsp.Contents);

    isTruncated = rsp.IsTruncated;
    confCmd.ContinuationToken = rsp.NextContinuationToken;
    if (
      isTruncated &&
      (confCmd.ContinuationToken === undefined ||
        confCmd.ContinuationToken === "")
    ) {
      throw Error("isTruncated is true but no continuationToken provided");
    }
  } while (isTruncated);

  // ensemble fake rsp
  return {
    Contents: contents.map((x) => fromS3ObjectToRemoteItem(x)),
  };
};

/**
 * The Body of resp of aws GetObject has mix types
 * and we want to get ArrayBuffer here.
 * See https://github.com/aws/aws-sdk-js-v3/issues/1877
 * @param b The Body of GetObject
 * @returns Promise<ArrayBuffer>
 */
const getObjectBodyToArrayBuffer = async (
  b: Readable | ReadableStream | Blob
) => {
  if (b instanceof Readable) {
    return (await new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      b.on("data", (chunk) => chunks.push(chunk));
      b.on("error", reject);
      b.on("end", () => resolve(bufferToArrayBuffer(Buffer.concat(chunks))));
    })) as ArrayBuffer;
  } else if (b instanceof ReadableStream) {
    return await new Response(b, {}).arrayBuffer();
  } else if (b instanceof Blob) {
    return await b.arrayBuffer();
  } else {
    throw TypeError(`The type of ${b} is not one of the supported types`);
  }
};

const downloadFromRemoteRaw = async (
  s3Client: S3Client,
  s3Config: S3Config,
  fileOrFolderPath: string
) => {
  const data = await s3Client.send(
    new GetObjectCommand({
      Bucket: s3Config.s3BucketName,
      Key: fileOrFolderPath,
    })
  );
  const bodyContents = await getObjectBodyToArrayBuffer(data.Body);
  return bodyContents;
};

export const downloadFromRemote = async (
  s3Client: S3Client,
  s3Config: S3Config,
  fileOrFolderPath: string,
  prefix: string,
  vault: Vault,
  mtime: number,
  password: string = "",
  remoteEncryptedKey: string = "",
  skipSaving: boolean = false,
  renamedTo?: string
) => {
  const isFolder = fileOrFolderPath.endsWith("/");

  if (!skipSaving) {
    await mkdirpInVault(fileOrFolderPath, vault);
  }

  // the file is always local file
  // we need to encrypt it

  if (isFolder) {
    // mkdirp locally is enough
    // do nothing here
    return new ArrayBuffer(0);
  } else {
    let downloadFile = fileOrFolderPath;
    if (password !== "") {
      downloadFile = remoteEncryptedKey;
    }
    const remoteContent = await downloadFromRemoteRaw(
      s3Client,
      s3Config,
      prefix + downloadFile
    );
    let localContent = remoteContent;
    if (password !== "") {
      localContent = await decryptArrayBuffer(remoteContent, password);
    }
    if (!skipSaving) {
      await vault.adapter.writeBinary(renamedTo || fileOrFolderPath, localContent, {
        mtime: mtime,
      });
    }
    return localContent;
  }
};

/**
 * This function deals with file normally and "folder" recursively.
 * @param s3Client
 * @param s3Config
 * @param fileOrFolderPath
 * @returns
 */
export const deleteFromRemote = async (
  s3Client: S3Client,
  s3Config: S3Config,
  fileOrFolderPath: string,
  prefix: string,
  password: string = "",
  remoteEncryptedKey: string = ""
) => {
  if (fileOrFolderPath === "/") {
    return;
  }
  let remoteFileName = prefix + fileOrFolderPath;
  if (password !== "") {
    remoteFileName = prefix + remoteEncryptedKey;
  }
  log.info('deleting from remote: ', remoteFileName);
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: s3Config.s3BucketName,
      Key: remoteFileName,
    })
  );

  if (fileOrFolderPath.endsWith("/") && password === "") {
    const x = await listFromRemote(s3Client, s3Config, remoteFileName);
    x.Contents.forEach(async (element) => {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: s3Config.s3BucketName,
          Key: element.key,
        })
      );
    });
  } else if (fileOrFolderPath.endsWith("/") && password !== "") {
    // TODO
  } else {
    // pass
  }
};

/**
 * Check the config of S3 by heading bucket
 * https://stackoverflow.com/questions/50842835
 * @param s3Client
 * @param s3Config
 * @returns
 */
export const checkConnectivity = async (
  s3Client: S3Client,
  s3Config: S3Config,
  callbackFunc?: any
) => {
  try {
    const results = await s3Client.send(
      new HeadBucketCommand({ Bucket: s3Config.s3BucketName })
    );
    if (
      results === undefined ||
      results.$metadata === undefined ||
      results.$metadata.httpStatusCode === undefined
    ) {
      const err = "results or $metadata or httStatusCode is undefined";
      log.debug(err);
      if (callbackFunc !== undefined) {
        callbackFunc(err);
      }
      return false;
    }
    return results.$metadata.httpStatusCode === 200;
  } catch (err) {
    log.debug(err);
    if (callbackFunc !== undefined) {
      if (s3Config.s3Endpoint.contains(s3Config.s3BucketName)) {
        const err2 = new AggregateError([
          err,
          new Error(
            "Maybe you've included the bucket name inside the endpoint setting. Please remove the bucket name and try again."
          ),
        ]);
        callbackFunc(err2);
      } else {
        callbackFunc(err);
      }
    }

    return false;
  }
};
