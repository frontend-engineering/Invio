import {
  Modal,
  Notice,
  Plugin,
  Setting,
  addIcon,
  setIcon,
  TFile,
  FileSystemAdapter,
  TAbstractFile,
  TFolder,
} from "obsidian";
import cloneDeep from "lodash/cloneDeep";
import type {
  FileOrFolderMixedState,
  InvioPluginSettings,
  SyncTriggerSourceType,
} from "./baseTypes";
import {
  COMMAND_CALLBACK,
  COMMAND_CALLBACK_ONEDRIVE,
  COMMAND_CALLBACK_DROPBOX,
  COMMAND_URI,
} from "./baseTypes";
import { importQrCodeUri } from "./importExport";
import {
  insertDeleteRecordByVault,
  insertRenameRecordByVault,
  insertSyncPlanRecordByVault,
  loadFileHistoryTableByVault,
  prepareDBs,
  InternalDBs,
  insertLoggerOutputByVault,
  clearExpiredLoggerOutputRecords,
  clearExpiredSyncPlanRecords,
} from "./localdb";
import { RemoteClient } from "./remote";
import { DEFAULT_S3_CONFIG } from "./remoteForS3";
import { InvioSettingTab } from "./settings";
import { fetchMetadataFile, parseRemoteItems, SyncStatusType, RemoteSrcPrefix } from "./sync";
import { doActualSync, getSyncPlan, isPasswordOk } from "./sync";
import { messyConfigToNormal, normalConfigToMessy } from "./configPersist";
import { ObsConfigDirFileType, listFilesInObsFolder } from "./obsFolderLister";
import { I18n } from "./i18n";
import type { LangType, LangTypeAndAuto, TransItemType } from "./i18n";

import { DeletionOnRemote, MetadataOnRemote } from "./metadataOnRemote";
import { SyncAlgoV2Modal } from "./syncAlgoV2Notice";
import { TouchedPlanModel } from './touchedPlanModel';
import { LoadingModal } from './loadingModal';

import { applyLogWriterInplace, log } from "./moreOnLog";
import AggregateError from "aggregate-error";
import {
  exportVaultLoggerOutputToFiles,
  exportVaultSyncPlansToFiles,
} from "./debugMode";
import { SizesConflictModal } from "./syncSizesConflictNotice";
import { publishFiles, unpublishFile } from './exporter'
import { AssetHandler } from './html-generation/asset-handler';
import { Path } from './utils/path';
import { HTMLGenerator } from './html-generation/html-generator';
import icon, { UsingIconNames, getIconSvg, addIconForconflictFile } from './utils/icon';
import { StatsView, VIEW_TYPE_STATS } from "./statsView";

const { iconNameSyncWait, iconNameSyncPending, iconNameSyncRunning, iconNameLogs, iconNameSyncLogo } = UsingIconNames;

const DEFAULT_SETTINGS: InvioPluginSettings = {
  s3: DEFAULT_S3_CONFIG,
  password: "",
  serviceType: "s3",
  currLogLevel: "info",
  // vaultRandomID: "", // deprecated
  autoRunEveryMilliseconds: -1,
  initRunAfterMilliseconds: -1,
  agreeToUploadExtraMetadata: false,
  concurrency: 5,
  syncConfigDir: false,
  localWatchDir: "PublishDocs",
  syncUnderscoreItems: true,
  lang: "auto",
  logToDB: false,
  skipSizeLargerThan: -1,
};

interface OAuth2Info {
  verifier?: string;
  helperModal?: Modal;
  authDiv?: HTMLElement;
  revokeDiv?: HTMLElement;
  revokeAuthSetting?: Setting;
}


export default class InvioPlugin extends Plugin {
  settings: InvioPluginSettings;
  db: InternalDBs;
  syncStatus: SyncStatusType;
  oauth2Info: OAuth2Info;
  currLogLevel: string;
  currSyncMsg?: string;
  syncRibbon?: HTMLElement;
  autoRunIntervalID?: number;
  i18n: I18n;
  vaultRandomID: string;

  isUnderWatch(file: TAbstractFile) {
    const rootDir = this.settings.localWatchDir;
    if ((file instanceof TFile) || (file instanceof TFolder)) {
      if (file.path.startsWith(rootDir)) {
        return true;
      }
    }
    return false;
  }

  async syncRun(triggerSource: SyncTriggerSourceType = "manual") {
    const t = (x: TransItemType, vars?: any) => {
      return this.i18n.t(x, vars);
    };

    const getNotice = (x: string, timeout?: number) => {
      // only show notices in manual mode
      // no notice in auto mode
      if (triggerSource === "manual" || triggerSource === "dry") {
        // new Notice(x, timeout);
      }
    };
    if (this.syncStatus !== "idle") {
      // here the notice is shown regardless of triggerSource
      new Notice(
        t("syncrun_alreadyrunning", {
          pluginName: this.manifest.name,
          syncStatus: this.syncStatus,
        })
      );
      if (this.currSyncMsg !== undefined && this.currSyncMsg !== "") {
        new Notice(this.currSyncMsg);
      }
      return;
    }

    let originLabel = `${this.manifest.name}`;
    if (this.syncRibbon !== undefined) {
      originLabel = this.syncRibbon.getAttribute("aria-label");
    }

    try {
      log.info(
        `${
          this.manifest.id
        }-${Date.now()}: start sync, triggerSource=${triggerSource}`
      );

      if (this.syncRibbon !== undefined) {
        setIcon(this.syncRibbon, iconNameSyncRunning);
        this.syncRibbon.setAttribute(
          "aria-label",
          t("syncrun_syncingribbon", {
            pluginName: this.manifest.name,
            triggerSource: triggerSource,
          })
        );
      }

      const MAX_STEPS = 8;

      if (triggerSource === "dry") {
        getNotice(
          t("syncrun_step0", {
            maxSteps: `${MAX_STEPS}`,
          })
        );
      }

      //log.info(`huh ${this.settings.password}`)
      getNotice(
        t("syncrun_step1", {
          maxSteps: `${MAX_STEPS}`,
          serviceType: this.settings.serviceType,
        })
      );
      this.syncStatus = "preparing";

      getNotice(
        t("syncrun_step2", {
          maxSteps: `${MAX_STEPS}`,
        })
      );


      const loading = new LoadingModal(this.app, this);
      loading.open();

      this.syncStatus = "getting_remote_files_list";
      const self = this;
      const client = new RemoteClient(
        this.settings.serviceType,
        this.settings.s3,
        this.app.vault.getName(),
        () => self.saveSettings()
      );
      // const Prefix = 'op-remote-source-raw/';
      const remoteRsp = await client.listFromRemote(RemoteSrcPrefix);
      log.info('remote: ', remoteRsp);
      const remoteContents = remoteRsp.Contents.filter(item => item.key !== RemoteSrcPrefix);

      getNotice(
        t("syncrun_step3", {
          maxSteps: `${MAX_STEPS}`,
        })
      );
      this.syncStatus = "checking_password";
      const passwordCheckResult = await isPasswordOk(
        remoteContents,
        this.settings.password
      );
      if (!passwordCheckResult.ok) {
        getNotice(t("syncrun_passworderr"));
        throw Error(passwordCheckResult.reason);
      }

      getNotice(
        t("syncrun_step4", {
          maxSteps: `${MAX_STEPS}`,
        })
      );
      this.syncStatus = "getting_remote_extra_meta";
      const { remoteStates, metadataFile } = await parseRemoteItems(
        remoteContents,
        this.db,
        this.vaultRandomID,
        client.serviceType,
        this.settings.password
      );
      console.log('parseRemoteItems result: ', remoteStates, metadataFile);
      const origMetadataOnRemote = await fetchMetadataFile(
        metadataFile,
        client,
        this.app.vault,
        this.settings.password
      );
      console.log('fetchMetadataFile result: ', origMetadataOnRemote);

      getNotice(
        t("syncrun_step5", {
          maxSteps: `${MAX_STEPS}`,
        })
      );
      this.syncStatus = "getting_local_meta";
      // this.app.vault.getAllLoadedFiles
      // TODO: List only concerned files, only source of truth
      // *.conflict.md files is for data backup when conflicts happened
      const local = this.app.vault.getMarkdownFiles().filter(file => file.path.startsWith(this.settings.localWatchDir) && !file.path.endsWith('.conflict.md'))
      log.info('local file path list: ', local);
      // const local = this.app.vault.getAllLoadedFiles();
      const localHistory = await loadFileHistoryTableByVault(
        this.db,
        this.vaultRandomID
      );
      let localConfigDirContents: ObsConfigDirFileType[] = undefined;
      if (this.settings.syncConfigDir) {
        localConfigDirContents = await listFilesInObsFolder(
          this.app.vault.configDir,
          this.app.vault,
          this.manifest.id
        );
      }
      log.info('local: ', local);
      log.info('local history: ', localHistory);

      getNotice(
        t("syncrun_step6", {
          maxSteps: `${MAX_STEPS}`,
        })
      );
      this.syncStatus = "generating_plan";
      const { plan, sortedKeys, deletions, sizesGoWrong, touchedFileMap } = await getSyncPlan(
        remoteStates,
        local,
        localConfigDirContents,
        origMetadataOnRemote.deletions,
        localHistory,
        client.serviceType,
        triggerSource,
        this.app.vault,
        this.settings.syncConfigDir,
        this.settings.localWatchDir,
        this.app.vault.configDir,
        this.settings.syncUnderscoreItems,
        this.settings.skipSizeLargerThan,
        this.settings.password
      );
      log.info('plan.mixedStates: ', plan.mixedStates, touchedFileMap); // for debugging

      try {
        loading.close();

        await new Promise((resolve, reject) => {
          const touchedPlanModel = new TouchedPlanModel(this.app, this, touchedFileMap, (pub: boolean) => {
            log.info('user confirmed: ', pub);
            pub ? resolve('ok') : reject('cancelled')
          });
          touchedPlanModel.open();
        })
      } catch (error) {
        log.info('user cancelled');
        this.syncStatus = "idle";
        getNotice('user cancelled')
        if (this.syncRibbon !== undefined) {
          setIcon(this.syncRibbon, iconNameSyncLogo);
          this.syncRibbon.setAttribute("aria-label", originLabel);
        }
        return;
      }
  
      const { toRemoteFiles } = TouchedPlanModel.getTouchedFilesGroup(touchedFileMap)

      let allFiles = this.app.vault.getMarkdownFiles();
      await HTMLGenerator.beginBatch(allFiles);
      await this.activateStatsView()
      const view = this.getStatsView();

      log.info('init stats view: ', view);
      if (view) {
        const initData: Record<string, FileOrFolderMixedState> = {};
        toRemoteFiles.forEach(f => {
          initData[f.key] = f;
        })
        view.init(initData);
      }

      // The operations above are almost read only and kind of safe.
      // The operations below begins to write or delete (!!!) something.
      await insertSyncPlanRecordByVault(this.db, plan, this.vaultRandomID);
      if (triggerSource !== "dry") {
        getNotice(
          t("syncrun_step7", {
            maxSteps: `${MAX_STEPS}`,
          })
        );

        this.syncStatus = "syncing";
        // TODO: Delete all remote html files if triggerSource === force
        const pubPathList: string[] = [];
        const unPubList: string[] = [];
        await doActualSync(
          client,
          this.db,
          this.vaultRandomID,
          this.app.vault,
          plan,
          sortedKeys,
          metadataFile,
          origMetadataOnRemote,
          sizesGoWrong,
          deletions,
          (key: string) => self.trash(key),
          this.settings.password,
          this.settings.concurrency,
          (ss: FileOrFolderMixedState[]) => {
            new SizesConflictModal(
              self.app,
              self,
              this.settings.skipSizeLargerThan,
              ss,
              this.settings.password !== ""
            ).open();
          },
          async (i: number, totalCount: number, pathName: string, decision: string) => {
            self.setCurrSyncMsg(i, totalCount, pathName, decision);

            log.info('syncing ', pathName, decision);
            view?.handleStateChange(pathName, { syncStatus: 'syncing' })
            // if (touchedFileMap?.pathName) {
            //   touchedFileMap.pathName.syncStatus = 'syncing';
            // }
            // TODO: Wrap in transation and do alert when publish failed
            if (decision === 'uploadLocalToRemote') {
              // upload
              pubPathList.push(pathName);
            } else if (decision === 'uploadLocalDelHistToRemote') {
              // delete
              unPubList.push(pathName);
            } else {
              log.info('ignore decision ', decision, pathName);
            } 
          },
          (key: string) => {
            log.warn('Remote files conflicts when syncing ... ', key);
          }
        );

        log.info('sync done with touched file map: ', JSON.stringify(toRemoteFiles));

        for (const pathName of unPubList) {
          // if (touchedFileMap?.pathName) {
          //   touchedFileMap.pathName.syncStatus = 'publishing';
          // }
          await unpublishFile(client, this.app.vault, pathName, (pathName: string, status: string) => {
            log.info('publishing ', pathName, status);
            if (status === 'START') {
              log.info('set file start publishing', pathName);
              view?.handleStateChange(pathName, { syncStatus: 'publishing' })
            } else if (status === 'DONE') {
              view?.handleStateChange(pathName, { syncStatus: 'done' })
            } else if (status === 'FAIL') {
              view?.handleStateChange(pathName, { syncStatus: 'fail' })
            }
          });
        }

        const basePath = new Path(this.settings.localWatchDir);
        // get files to export
        // let allFiles = this.app.vault.getMarkdownFiles();
        // if we are at the root path export all files, otherwise only export files in the folder we are exporting
        allFiles = allFiles.filter((file: TFile) => new Path(file.path).directory.asString.startsWith(basePath.asString) && (file.extension === "md") && (!file.name.endsWith('.conflict.md')));
        await publishFiles(client, this.app.vault, pubPathList, allFiles, '', this.settings, triggerSource, (pathName: string, status: string) => {
          log.info('publishing ', pathName, status);
          if (status === 'START') {
            log.info('set file start publishing', pathName);
            view?.handleStateChange(pathName, { syncStatus: 'publishing' })
          } else if (status === 'DONE') {
            log.info('set file DONE publishing', pathName);
            view?.handleStateChange(pathName, { syncStatus: 'done' })
          } else if (status === 'FAIL') {
            view?.handleStateChange(pathName, { syncStatus: 'fail' })
          }
        });

        if (triggerSource === 'force') {
          const forceList: string[] = [];
          for (const key in plan.mixedStates) {
            if (plan.mixedStates.hasOwnProperty(key)) {
              const record = plan.mixedStates[key];
              if (record.decision === 'skipUploading') {
                forceList.push(record.key);
              }
            }
          }
          await publishFiles(client, this.app.vault, forceList, allFiles, '', this.settings, triggerSource);
        }
      } else {
        this.syncStatus = "syncing";
        getNotice(
          t("syncrun_step7skip", {
            maxSteps: `${MAX_STEPS}`,
          })
        );
      }

      getNotice(
        t("syncrun_step8", {
          maxSteps: `${MAX_STEPS}`,
        })
      );
      this.syncStatus = "finish";
      this.syncStatus = "idle";

      if (this.syncRibbon !== undefined) {
        setIcon(this.syncRibbon, iconNameSyncLogo);
        const { iconSvgSyncWait } = getIconSvg();
        icon.createIconNode(this, this.settings.localWatchDir, iconSvgSyncWait);
        this.syncRibbon.setAttribute("aria-label", originLabel);
      }

      log.info(
        `${
          this.manifest.id
        }-${Date.now()}: finish sync, triggerSource=${triggerSource}`
      );

      // TODO: Show stats model
      return toRemoteFiles;
    } catch (error) {
      const msg = t("syncrun_abort", {
        manifestID: this.manifest.id,
        theDate: `${Date.now()}`,
        triggerSource: triggerSource,
        syncStatus: this.syncStatus,
      });
      log.error(msg);
      log.error(error);
      getNotice(msg, 10 * 1000);
      if (error instanceof AggregateError) {
        for (const e of error.errors) {
          getNotice(e.message, 10 * 1000);
        }
      } else {
        getNotice(error.message, 10 * 1000);
      }
      this.syncStatus = "idle";
      if (this.syncRibbon !== undefined) {
        setIcon(this.syncRibbon, iconNameSyncLogo);
        this.setRibbonPendingStatus();
        this.syncRibbon.setAttribute("aria-label", originLabel);
        this.syncRibbon.setAttribute(
          "aria-label",
          t("syncrun_syncingribbon_err", {
            pluginName: this.manifest.name,
          })
        );
      }
    }
  }

  async activateStatsView() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_STATS);

    await this.app.workspace.getRightLeaf(false).setViewState({
      type: VIEW_TYPE_STATS,
      active: true,
    });

    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(VIEW_TYPE_STATS)[0]
    );
  }

  getStatsView() {
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_STATS).find((leaf) => (leaf.view instanceof StatsView));
    return leaf?.view as StatsView;
  }

  async onload() {
    log.info(`loading plugin ${this.manifest.id}`);


    this.addRibbonIcon("dice", "Activate view", () => {
      this.activateStatsView();

      // test updating view
      setTimeout(() => {
        const view = this.getStatsView();

        log.info('init stats view: ', view);
        if (!view) return;
        view.init({
          'IDEA': { status: 'DONE' },
          'eDRAM': { status: 'FAIL' }
        });
      }, 2000)
      setInterval(() => {
        const view = this.getStatsView();

        log.info('update stats view: ', view);
        if (!view) return;
        
        view.handleStateChange('IDEA', {status: Math.random() > 0.5 ? 'DONE' : 'FAIL' })
      }, 2000)
    });
  
		// init html generator
		AssetHandler.initialize(this.manifest.id);

    const { iconSvgLogo, iconSvgSyncWait, iconSvgSyncPending, iconSvgSyncRunning, iconSvgLogs } = getIconSvg();

    addIcon(iconNameSyncPending, iconSvgSyncPending);
    addIcon(iconNameSyncWait, iconSvgSyncWait);
    addIcon(iconNameSyncRunning, iconSvgSyncRunning);
    addIcon(iconNameLogs, iconSvgLogs);
    addIcon(iconNameSyncLogo, iconSvgLogo);

    this.oauth2Info = {
      verifier: "",
      helperModal: undefined,
      authDiv: undefined,
      revokeDiv: undefined,
      revokeAuthSetting: undefined,
    }; // init

    this.currSyncMsg = "";

    await this.loadSettings();

    // lang should be load early, but after settings
    this.i18n = new I18n(this.settings.lang, async (lang: LangTypeAndAuto) => {
      this.settings.lang = lang;
      await this.saveSettings();
    });
    const t = (x: TransItemType, vars?: any) => {
      return this.i18n.t(x, vars);
    };

    if (this.settings.currLogLevel !== undefined) {
      log.setLevel(this.settings.currLogLevel as any);
    }

    await this.checkIfOauthExpires();

    // MUST before prepareDB()
    // And, it's also possible to be an empty string,
    // which means the vaultRandomID is read from db later!
    const vaultRandomIDFromOldConfigFile =
      await this.getVaultRandomIDFromOldConfigFile();

    // no need to await this
    this.tryToAddIgnoreFile();

    const vaultBasePath = this.getVaultBasePath();

    try {
      await this.prepareDBAndVaultRandomID(
        vaultBasePath,
        vaultRandomIDFromOldConfigFile
      );
    } catch (err) {
      new Notice(err.message, 10 * 1000);
      throw err;
    }

    // must AFTER preparing DB
    this.addOutputToDBIfSet();
    this.enableAutoClearOutputToDBHistIfSet();

    // must AFTER preparing DB
    this.enableAutoClearSyncPlanHist();

    this.app.workspace.onLayoutReady(() => {
      log.debug('layout ready...');
      // Add custom icon for root dir
      setTimeout(() => {
        icon.createIconNode(this, this.settings.localWatchDir, iconSvgSyncWait);
      }, 300);
      // TODO: Change file icons to show sync status, like sync done, sync failed, pending to sync, etc.
    })

    this.syncStatus = "idle";

    // Stats View
    this.registerView(VIEW_TYPE_STATS, (leaf) => new StatsView(this, leaf));

    this.registerEvent(
      this.app.vault.on("delete", async (fileOrFolder) => {
        await insertDeleteRecordByVault(
          this.db,
          fileOrFolder,
          this.vaultRandomID
        );
        this.setRibbonPendingStatus();
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", async (fileOrFolder, oldPath) => {
        await insertRenameRecordByVault(
          this.db,
          fileOrFolder,
          oldPath,
          this.vaultRandomID
        );

        if (this.isUnderWatch(fileOrFolder)) {
          this.setRibbonPendingStatus();
          log.debug('file rename: ', fileOrFolder);
  
          setTimeout(() => {
            addIconForconflictFile(this, fileOrFolder)
          }, 300)
        }
      })
    );


    this.registerEvent(
      this.app.vault.on('modify', async (file) => {
        log.debug('file modified: ', file, this.isUnderWatch(file));
        if (this.isUnderWatch(file)) {
          this.setRibbonPendingStatus();
          setTimeout(() => {
            addIconForconflictFile(this, file)
          }, 300)
        }
      })
    )

    this.registerEvent(
      this.app.vault.on('create', async (file) => {
        log.debug('file created: ', file);
        if (this.isUnderWatch(file)) {
          this.setRibbonPendingStatus(); 
          setTimeout(() => {
            addIconForconflictFile(this, file)
          }, 300)
        }
      })
    )

    this.registerObsidianProtocolHandler(COMMAND_URI, async (inputParams) => {
      const parsed = importQrCodeUri(inputParams, this.app.vault.getName());
      if (parsed.status === "error") {
        new Notice(parsed.message);
      } else {
        const copied = cloneDeep(parsed.result);
        // new Notice(JSON.stringify(copied))
        this.settings = Object.assign({}, this.settings, copied);
        this.saveSettings();
        new Notice(
          t("protocol_saveqr", {
            manifestName: this.manifest.name,
          })
        );
      }
    });

    this.registerObsidianProtocolHandler(
      COMMAND_CALLBACK,
      async (inputParams) => {
        new Notice(
          t("protocol_callbacknotsupported", {
            params: JSON.stringify(inputParams),
          })
        );
      }
    );


    this.syncRibbon = this.addRibbonIcon(
      // iconNameSyncWait,
      iconNameSyncLogo,
      `${this.manifest.name}`,
      async () => this.syncRun("manual")
    );

    this.addCommand({
      id: "start-sync",
      name: t("command_startsync"),
      icon: iconNameSyncLogo,
      callback: async () => {
        this.syncRun("manual");
      },
    });

    this.addCommand({
      id: "start-sync-dry-run",
      name: t("command_drynrun"),
      icon: iconNameSyncLogo,
      callback: async () => {
        this.syncRun("dry");
      },
    });

    this.addCommand({
      id: 'start-force-full-sync',
      name: t('command_forcesync'),
      icon: iconNameSyncLogo,
      callback: async () => {
        this.syncRun('force');
      }
    })

    this.addSettingTab(new InvioSettingTab(this.app, this));

    // this.registerDomEvent(document, "click", (evt: MouseEvent) => {
    //   log.info("click", evt);
    // });

    if (!this.settings.agreeToUploadExtraMetadata) {
      const syncAlgoV2Modal = new SyncAlgoV2Modal(this.app, this);
      syncAlgoV2Modal.open();
    } else {
      this.enableAutoSyncIfSet();
      this.enableInitSyncIfSet();
    }
  }

  async onunload() {
    log.info(`unloading plugin ${this.manifest.id}`);
    this.syncRibbon = undefined;
    if (this.oauth2Info !== undefined) {
      this.oauth2Info.helperModal = undefined;
      this.oauth2Info = undefined;
    }
  }

  async loadSettings(encryptStr?: string) {
    let rawConf = undefined;
    if (encryptStr) {
      rawConf = {
        readme: "This file contains all config data. so do not share it with others, unless you know what you are doing.",
        d: encryptStr,
      }
    } else {
      rawConf = await this.loadData()
    }
    this.settings = Object.assign(
      {},
      cloneDeep(DEFAULT_SETTINGS),
      messyConfigToNormal(rawConf)
    );
    if (this.settings.s3.partsConcurrency === undefined) {
      this.settings.s3.partsConcurrency = 20;
    }
    if (this.settings.s3.forcePathStyle === undefined) {
      this.settings.s3.forcePathStyle = false;
    }
  }

  async saveSettings() {
    await this.saveData(normalConfigToMessy(this.settings));
  }

  async checkIfOauthExpires() {}

  async getVaultRandomIDFromOldConfigFile() {
    let vaultRandomID = "";
    if (this.settings.vaultRandomID !== undefined) {
      // In old version, the vault id is saved in data.json
      // But we want to store it in localForage later
      if (this.settings.vaultRandomID !== "") {
        // a real string was assigned before
        vaultRandomID = this.settings.vaultRandomID;
      }
      log.debug("vaultRandomID is no longer saved in data.json");
      delete this.settings.vaultRandomID;
      await this.saveSettings();
    }
    return vaultRandomID;
  }

  async trash(x: string) {
    if (!(await this.app.vault.adapter.trashSystem(x))) {
      await this.app.vault.adapter.trashLocal(x);
    }
  }

  getVaultBasePath() {
    if (this.app.vault.adapter instanceof FileSystemAdapter) {
      // in desktop
      return this.app.vault.adapter.getBasePath().split("?")[0];
    } else {
      // in mobile
      return this.app.vault.adapter.getResourcePath("").split("?")[0];
    }
  }

  async prepareDBAndVaultRandomID(
    vaultBasePath: string,
    vaultRandomIDFromOldConfigFile: string
  ) {
    const { db, vaultRandomID } = await prepareDBs(
      vaultBasePath,
      vaultRandomIDFromOldConfigFile
    );
    this.db = db;
    this.vaultRandomID = vaultRandomID;
  }

  enableAutoSyncIfSet() {
    if (
      this.settings.autoRunEveryMilliseconds !== undefined &&
      this.settings.autoRunEveryMilliseconds !== null &&
      this.settings.autoRunEveryMilliseconds > 0
    ) {
      this.app.workspace.onLayoutReady(() => {
        const intervalID = window.setInterval(() => {
          this.syncRun("auto");
        }, this.settings.autoRunEveryMilliseconds);
        this.autoRunIntervalID = intervalID;
        this.registerInterval(intervalID);
      });
    }
  }

  enableInitSyncIfSet() {
    if (
      this.settings.initRunAfterMilliseconds !== undefined &&
      this.settings.initRunAfterMilliseconds !== null &&
      this.settings.initRunAfterMilliseconds > 0
    ) {
      this.app.workspace.onLayoutReady(() => {
        window.setTimeout(() => {
          this.syncRun("autoOnceInit");
        }, this.settings.initRunAfterMilliseconds);
      });
    }
  }

  async saveAgreeToUseNewSyncAlgorithm() {
    this.settings.agreeToUploadExtraMetadata = true;
    await this.saveSettings();
  }

  async setCurrSyncMsg(
    i: number,
    totalCount: number,
    pathName: string,
    decision: string
  ) {
    const msg = `syncing progress=${i}/${totalCount},decision=${decision},path=${pathName}`;
    this.currSyncMsg = msg;
  }

  /**
   * Because data.json contains sensitive information,
   * We usually want to ignore it in the version control.
   * However, if there's already a an ignore file (even empty),
   * we respect the existing configure and not add any modifications.
   * @returns
   */
  async tryToAddIgnoreFile() {
    const pluginConfigDir =
      this.manifest.dir ||
      `${this.app.vault.configDir}/plugins/${this.manifest.dir}`;
    const pluginConfigDirExists = await this.app.vault.adapter.exists(
      pluginConfigDir
    );
    if (!pluginConfigDirExists) {
      // what happened?
      return;
    }
    const ignoreFile = `${pluginConfigDir}/.gitignore`;
    const ignoreFileExists = await this.app.vault.adapter.exists(ignoreFile);

    const contentText = "data.json\n";

    try {
      if (!ignoreFileExists) {
        // not exists, directly create
        // no need to await
        this.app.vault.adapter.write(ignoreFile, contentText);
      }
    } catch (error) {
      // just skip
    }
  }

  addOutputToDBIfSet() {
    if (this.settings.logToDB) {
      applyLogWriterInplace((...msg: any[]) => {
        insertLoggerOutputByVault(this.db, this.vaultRandomID, ...msg);
      });
    }
  }

  enableAutoClearOutputToDBHistIfSet() {
    const initClearOutputToDBHistAfterMilliseconds = 1000 * 45;
    const autoClearOutputToDBHistAfterMilliseconds = 1000 * 60 * 5;

    this.app.workspace.onLayoutReady(() => {
      // init run
      window.setTimeout(() => {
        if (this.settings.logToDB) {
          clearExpiredLoggerOutputRecords(this.db);
        }
      }, initClearOutputToDBHistAfterMilliseconds);

      // scheduled run
      const intervalID = window.setInterval(() => {
        if (this.settings.logToDB) {
          clearExpiredLoggerOutputRecords(this.db);
        }
      }, autoClearOutputToDBHistAfterMilliseconds);
      this.registerInterval(intervalID);
    });
  }

  enableAutoClearSyncPlanHist() {
    const initClearSyncPlanHistAfterMilliseconds = 1000 * 45;
    const autoClearSyncPlanHistAfterMilliseconds = 1000 * 60 * 5;

    this.app.workspace.onLayoutReady(() => {
      // init run
      window.setTimeout(() => {
        clearExpiredSyncPlanRecords(this.db);
      }, initClearSyncPlanHistAfterMilliseconds);

      // scheduled run
      const intervalID = window.setInterval(() => {
        clearExpiredSyncPlanRecords(this.db);
      }, autoClearSyncPlanHistAfterMilliseconds);
      this.registerInterval(intervalID);
    });
  }

  setRibbonPendingStatus() {
    if (this.syncStatus === "idle") {
      if (this.syncRibbon !== undefined) {
        const { iconSvgSyncPending } = getIconSvg();
        icon.createIconNode(this, this.settings.localWatchDir, iconSvgSyncPending); 
        this.syncRibbon.setAttribute("aria-label", `${this.manifest.name}`);
      }
    }
  }
}
