import {
  App,
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
  setIcon,
  Platform,
  requireApiVersion,
} from "obsidian";
import type { TextComponent } from "obsidian";
import cloneDeep from "lodash/cloneDeep";
import { createElement, Eye, EyeOff } from "lucide";
import {
  InvioPluginSettings,
  API_VER_REQURL,
  DEFAULT_DEBUG_FOLDER,
  SUPPORTED_SERVICES_TYPE,
  SUPPORTED_SERVICES_TYPE_WITH_REMOTE_BASE_DIR,
  VALID_REQURL,
  WebdavAuthType,
  WebdavDepthType,
} from "./baseTypes";
import {
  exportVaultSyncPlansToFiles,
  exportVaultLoggerOutputToFiles,
} from "./debugMode";
import { exportQrCodeUri } from "./importExport";
import {
  clearAllSyncMetaMapping,
  clearAllSyncPlanRecords,
  destroyDBs,
  clearAllLoggerOutputRecords,
  insertLoggerOutputByVault,
  clearExpiredLoggerOutputRecords,
} from "./localdb";
import InvioPlugin from "./main"; // unavoidable
import { RemoteClient } from "./remote";
import { messyConfigToNormal } from "./configPersist";
import type { TransItemType } from "./i18n";
import { checkHasSpecialCharForDir, mkdirpInVault } from "./misc";
import { ExportSettingsData, DEFAULT_EXP_SETTINGS } from './export-settings';
import icon, { getIconSvg } from './utils/icon';
import { Utils } from "./utils/utils";
import Utils2 from './utils';
import {
  applyLogWriterInplace,
  log,
  restoreLogWritterInplace,
} from "./moreOnLog";
import { DEFAULT_S3_CONFIG } from "./remoteForS3";
import { ProjectImportModal } from './components/ProjectImportModal';

export const settingsPrefix = `Invio-Settings>`;
export const settingsSuffix = `<&`
export const DEFAULT_DIR = `InvioDocs`
export const DEFAULT_FILE_URL = `https://docs.webinfra.cloud/op-remote-source-raw/Invio/index.md`
const DEFAULT_SETTINGS: InvioPluginSettings = {
  s3: cloneDeep(DEFAULT_S3_CONFIG),
  useHost: false,
  hostConfig: {
    hostPair: null,
    token: '',
    user: null,
  },
  password: "",
  remoteDomain: '',
  serviceType: "s3",
  currLogLevel: "info",
  // vaultRandomID: "", // deprecated
  autoRunEveryMilliseconds: -1,
  initRunAfterMilliseconds: -1,
  autoCheckEveryMilliseconds: -1, 
  initCheckAfterMilliseconds: -1,
  agreeToUploadExtraMetadata: false,
  concurrency: 5,
  syncConfigDir: false,
  localWatchDir: DEFAULT_DIR,
  syncUnderscoreItems: true,
  lang: "auto",
  logToDB: false,
  skipSizeLargerThan: -1,
};

export const getDEFAULT_SETTINGS = (): InvioPluginSettings => {
  return cloneDeep({
    s3: cloneDeep(DEFAULT_S3_CONFIG),
    useHost: false,
    hostConfig: {
      hostPair: null,
      token: '',
      user: null,
    },
    password: "",
    remoteDomain: '',
    serviceType: "s3",
    currLogLevel: "info",
    // vaultRandomID: "", // deprecated
    autoRunEveryMilliseconds: -1,
    initRunAfterMilliseconds: -1,
    autoCheckEveryMilliseconds: 1000 * 60, 
    initCheckAfterMilliseconds: 1000 * 10,
    agreeToUploadExtraMetadata: false,
    concurrency: 5,
    syncConfigDir: false,
    localWatchDir: DEFAULT_DIR,
    syncUnderscoreItems: true,
    lang: "auto",
    logToDB: false,
    skipSizeLargerThan: -1,
  });
}

class PasswordModal extends Modal {
  plugin: InvioPlugin;
  newPassword: string;
  constructor(app: App, plugin: InvioPlugin, newPassword: string) {
    super(app);
    this.plugin = plugin;
    this.newPassword = newPassword;
  }

  onOpen() {
    let { containerEl } = this;

    const t = (x: TransItemType, vars?: any) => {
      return this.plugin.i18n.t(x, vars);
    };

    // containerEl.setText("Add Or change password.");
    containerEl.createEl("h2", { text: t("modal_password_title") });
    t("modal_password_shortdesc")
      .split("\n")
      .forEach((val, idx) => {
        containerEl.createEl("p", {
          text: val,
        });
      });

    [
      t("modal_password_attn1"),
      t("modal_password_attn2"),
      t("modal_password_attn3"),
      t("modal_password_attn4"),
      t("modal_password_attn5"),
    ].forEach((val, idx) => {
      if (idx < 3) {
        containerEl.createEl("p", {
          text: val,
          cls: "password-disclaimer",
        });
      } else {
        containerEl.createEl("p", {
          text: val,
        });
      }
    });

    new Setting(containerEl)
      .addButton((button) => {
        button.setButtonText(t("modal_password_secondconfirm"));
        button.onClick(async () => {
          this.plugin.settings.password = this.newPassword;
          await this.plugin.saveSettings();
          new Notice(t("modal_password_notice"));
          this.close();
        });
        button.setClass("password-second-confirm");
      })
      .addButton((button) => {
        button.setButtonText(t("goback"));
        button.onClick(() => {
          this.close();
        });
      });
  }

  onClose() {
    let { containerEl } = this;
    containerEl.empty();
  }
}

class ChangeRemoteBaseDirModal extends Modal {
  readonly plugin: InvioPlugin;
  readonly newRemoteBaseDir: string;
  readonly service: SUPPORTED_SERVICES_TYPE_WITH_REMOTE_BASE_DIR;
  constructor(
    app: App,
    plugin: InvioPlugin,
    newRemoteBaseDir: string,
    service: SUPPORTED_SERVICES_TYPE_WITH_REMOTE_BASE_DIR
  ) {
    super(app);
    this.plugin = plugin;
    this.newRemoteBaseDir = newRemoteBaseDir;
    this.service = service;
  }

  onOpen() {
    let { containerEl } = this;

    const t = (x: TransItemType, vars?: any) => {
      return this.plugin.i18n.t(x, vars);
    };

    containerEl.createEl("h2", { text: t("modal_remotebasedir_title") });
    t("modal_remotebasedir_shortdesc")
      .split("\n")
      .forEach((val, idx) => {
        containerEl.createEl("p", {
          text: val,
        });
      });

    if (
      this.newRemoteBaseDir === "" ||
      this.newRemoteBaseDir === this.app.vault.getName()
    ) {
      new Setting(containerEl)
        .addButton((button) => {
          button.setButtonText(
            t("modal_remotebasedir_secondconfirm_vaultname")
          );
          button.onClick(async () => {
            // in the settings, the value is reset to the special case ""
            (this.plugin.settings as any)[this.service].remoteBaseDir = "";
            await this.plugin.saveSettings();
            new Notice(t("modal_remotebasedir_notice"));
            this.close();
          });
          button.setClass("remotebasedir-second-confirm");
        })
        .addButton((button) => {
          button.setButtonText(t("goback"));
          button.onClick(() => {
            this.close();
          });
        });
    } else if (checkHasSpecialCharForDir(this.newRemoteBaseDir)) {
      containerEl.createEl("p", {
        text: t("modal_remotebasedir_invaliddirhint"),
      });
      new Setting(containerEl).addButton((button) => {
        button.setButtonText(t("goback"));
        button.onClick(() => {
          this.close();
        });
      });
    } else {
      new Setting(containerEl)
        .addButton((button) => {
          button.setButtonText(t("modal_remotebasedir_secondconfirm_change"));
          button.onClick(async () => {
            (this.plugin.settings as any)[this.service].remoteBaseDir =
              this.newRemoteBaseDir;
            await this.plugin.saveSettings();
            new Notice(t("modal_remotebasedir_notice"));
            this.close();
          });
          button.setClass("remotebasedir-second-confirm");
        })
        .addButton((button) => {
          button.setButtonText(t("goback"));
          button.onClick(() => {
            this.close();
          });
        });
    }
  }

  onClose() {
    let { containerEl } = this;
    containerEl.empty();
  }
}
class SyncConfigDirModal extends Modal {
  plugin: InvioPlugin;
  saveDropdownFunc: () => void;
  constructor(
    app: App,
    plugin: InvioPlugin,
    saveDropdownFunc: () => void
  ) {
    super(app);
    this.plugin = plugin;
    this.saveDropdownFunc = saveDropdownFunc;
  }

  async onOpen() {
    let { containerEl } = this;

    const t = (x: TransItemType, vars?: any) => {
      return this.plugin.i18n.t(x, vars);
    };

    t("modal_syncconfig_attn")
      .split("\n")
      .forEach((val) => {
        containerEl.createEl("p", {
          text: val,
        });
      });

    new Setting(containerEl)
      .addButton((button) => {
        button.setButtonText(t("modal_syncconfig_secondconfirm"));
        button.onClick(async () => {
          this.plugin.settings.syncConfigDir = true;
          await this.plugin.saveSettings();
          this.saveDropdownFunc();
          new Notice(t("modal_syncconfig_notice"));
          this.close();
        });
      })
      .addButton((button) => {
        button.setButtonText(t("goback"));
        button.onClick(() => {
          this.close();
        });
      });
  }

  onClose() {
    let { containerEl } = this;
    containerEl.empty();
  }
}

class ExportSettingsQrCodeModal extends Modal {
  plugin: InvioPlugin;
  constructor(app: App, plugin: InvioPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen() {
    let { containerEl } = this;

    const t = (x: TransItemType, vars?: any) => {
      return this.plugin.i18n.t(x, vars);
    };

    const { rawUri, imgUri } = await exportQrCodeUri(
      this.plugin.settings,
      this.app.vault.getName(),
      this.plugin.manifest.version
    );

    const div1 = containerEl.createDiv();
    t("modal_qr_shortdesc")
      .split("\n")
      .forEach((val) => {
        div1.createEl("p", {
          text: val,
        });
      });

    const div2 = containerEl.createDiv();
    div2.createEl(
      "button",
      {
        text: t("modal_qr_button"),
      },
      (el) => {
        el.onclick = async () => {
          await navigator.clipboard.writeText(rawUri);
          new Notice(t("modal_qr_button_notice"));
        };
      }
    );

    const div3 = containerEl.createDiv();
    div3.createEl(
      "img",
      {
        cls: "qrcode-img",
      },
      async (el) => {
        el.src = imgUri;
      }
    );
  }

  onClose() {
    let { containerEl } = this;
    containerEl.empty();
  }
}

const wrapTextWithPasswordHide = (text: TextComponent) => {
	const hider = text.inputEl.insertAdjacentElement("afterend", createSpan()) as HTMLSpanElement;
	setIcon(hider, "eye-off");
	hider.addEventListener("click", (e) => {
    const isText = text.inputEl.getAttribute("type") === "text";
    if(isText) {
      setIcon(hider, "eye-off");
      text.inputEl.setAttribute("type", "password");
    } else {
      setIcon(hider, "eye");
      text.inputEl.setAttribute("type", "text");
    }
  });
  // the init type of text el is password
  text.inputEl.setAttribute("type", "password");
  return text;
};

export class InvioSettingTab extends PluginSettingTab {
  readonly plugin: InvioPlugin;
	static settings: ExportSettingsData = DEFAULT_EXP_SETTINGS;

  constructor(app: App, plugin: InvioPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  static saveSettings(plugin: InvioPlugin) {
    plugin.saveSettings();
  }


  static async exportSettings(plugin: InvioPlugin) {
    const t = (x: TransItemType, vars?: any) => {
      return plugin.i18n.t(x, vars);
    };
    const data = await plugin.loadData();
    await navigator.clipboard.writeText(`${settingsPrefix} ${data.d} ${settingsSuffix}`);
    new Notice(t("settings_export_msg"));
  }

  static async importSettings(plugin: InvioPlugin, restoredStr: string) {
    const t = (x: TransItemType, vars?: any) => {
      return plugin.i18n.t(x, vars);
    };
    if (!restoredStr) {
      new Notice(t("settings_import_err")); 
      return;
    }
    if (!(restoredStr.startsWith(settingsPrefix) && restoredStr.endsWith(settingsSuffix))) {
      new Notice(t("settings_import_err"));
      return;
    }

    await plugin.loadSettings(restoredStr.replace(settingsPrefix, '').replace(settingsSuffix, '').trim());
    // Create dir if necessary.
    const dir = plugin.settings.localWatchDir;
    if (dir && (typeof dir === 'string')) {
      await mkdirpInVault(dir, plugin.app.vault);
      await plugin.switchWorkingDir(dir);

      setTimeout(() => {
        plugin.syncRun('auto');
      }, 100)
    } else {
      log.error('Imported settings not configured correctly.')
    }
    await plugin.saveSettings();
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    const t = (x: TransItemType, vars?: any) => {
      return this.plugin.i18n.t(x, vars);
    };

    containerEl.createEl("h1", { text: "Invio" });

    // const dirChooserDiv = containerEl.createDiv();
    // dirChooserDiv.createEl("h2", { text: t("settings_chooseservice") });
    const dirDiv = containerEl.createEl("div");
    dirDiv.createEl("h2", { text: t("settings_local_config") });
    new Setting(dirDiv)
      .setName(t("settings_local_config_dir"))
      .setDesc(t("settings_local_config_dir_desc"))
      .addDropdown((dropdown) => {
        const list = Utils.getRootFolderList(this.plugin);
        list.forEach(folder => {
          dropdown.addOption(folder, folder);
        });
        dropdown
          .setValue(this.plugin.settings.localWatchDir)
          .onChange(async (value: string) => {
            await this.plugin.switchWorkingDir(value);
          })
      })
      .addButton(async (button) => {
        button.setButtonText('Import');
        button.onClick(async () => {
          log.info('importing...');
          const modal = new ProjectImportModal(this.app, this.plugin);
          modal.open();
        });
      })

    // =============== Hosting Settings ======================

    // const useHostDiv = containerEl.createEl("div");
    // useHostDiv.createEl("h2", { text: t('settings_host') });
    // new Setting(useHostDiv)
    //   .setName(t('settings_host_switch_title'))
    //   .setDesc(t('settings_host_switch_desc'))
    //   .addToggle(tog => {
    //     tog.setValue(this.plugin.settings.useHost)
    //     .onChange(async (val) => {
    //       this.plugin.settings.useHost = val;
    //       await this.plugin.saveSettings();
    //       if (this.plugin.settings.useHost) {
    //         await this.plugin.enableHostService()
    //           .catch(err => {
    //             new Notice(t('settings_host_enable_error')); 
    //           })
    //           .finally(() => {
    //             this.hide();
    //             this.display();
    //           })
    //       } else {
    //         await this.plugin.disableHostService();
    //         this.hide();
    //         this.display();
    //       }
    //     })
    //   })

    if (this.plugin.settings.useHost) {
      const hostingDiv = containerEl.createEl("div", { cls: 'settings-config-section' });
      hostingDiv.createEl('h2', { text: t('settings_host_auto_settings'), cls: 'settings-pub-header' });
      // const accountDiv = hostingDiv.createDiv('account');
      // accountDiv.innerText = 'goto account';
      const accountDiv = new Setting(hostingDiv)
        .setName(t('settings_host_auto_name'))
        .setDesc(t('settings_host_auto_desc'));

      accountDiv.addButton(async (button) => {
        button.setButtonText(t('settings_host_auto_account'));
        button.onClick(async () => {
          log.info('goto account page...');
          await Utils2.gotoMainSite();
          // await (window as any).electron.remote.shell.openPath('https://app.turbosite.cloud');
        });
      })
      const hostingEl = new Setting(hostingDiv)
        .setName(t('settings_host_auto_auth'))
        .setDesc(t('settings_host_auto_auth_desc'));

      if (this.plugin.settings.hostConfig?.token) {
        hostingEl.addText((text) => {
          text
            .setPlaceholder("")
            .setValue(this.plugin.settings.hostConfig?.user?.name)
        })
        .addButton(async (button) => {
          button.setButtonText(t('settings_host_auto_logout'));
          button.onClick(async () => {
            log.info('Log out... ', this.plugin.settings.hostConfig?.token);
            this.plugin.settings.hostConfig.token = null;
            await this.plugin.saveSettings();
            this.hide();
            this.display();
          });
        })
      } else {
        hostingEl.addButton(async (button) => {
          button.setButtonText(t('settings_host_auto_login'));
          button.onClick(async () => {
            log.info('start authing: ');
            Utils2.gotoAuth();
          });
        });
      }  
    }
		
    
    //////////////////////////////////////////////////
    // below for service chooser (part 1/2)
    //////////////////////////////////////////////////

    // we need to create the div in advance of any other service divs
    // const serviceChooserDiv = containerEl.createDiv();
    // serviceChooserDiv.createEl("h2", { text: t("settings_chooseservice") });

    //////////////////////////////////////////////////
    // below for s3
    //////////////////////////////////////////////////

    if (!this.plugin.settings.useHost) {

    const s3Div = containerEl.createEl("div", { cls: 'settings-config-section' });
    s3Div.createEl('h2', { text: t('settings_host_self_settings'), cls: 'settings-pub-header' });

    // const s3Div = containerEl.createEl("div", { cls: "s3-hide" });
    // s3Div.toggleClass("s3-hide", this.plugin.settings.serviceType !== "s3");
    // s3Div.createEl("h2", { text: t("settings_s3") });

    // const s3LongDescDiv = s3Div.createEl("div", { cls: "settings-long-desc" });

    // for (const c of [
    //   t("settings_s3_disclaimer1"),
    //   t("settings_s3_disclaimer2"),
    // ]) {
    //   s3LongDescDiv.createEl("p", {
    //     text: c,
    //     cls: "s3-disclaimer",
    //   });
    // }

    // if (!VALID_REQURL) {
    //   s3LongDescDiv.createEl("p", {
    //     text: t("settings_s3_cors"),
    //   });
    // }

    // s3LongDescDiv.createEl("p", {
    //   text: t("settings_s3_prod"),
    // });

    // const s3LinksUl = s3LongDescDiv.createEl("ul");

    // s3LinksUl.createEl("li").createEl("a", {
    //   href: "https://docs.aws.amazon.com/general/latest/gr/s3.html",
    //   text: t("settings_s3_prod1"),
    // });

    // s3LinksUl.createEl("li").createEl("a", {
    //   href: "https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-your-credentials.html",
    //   text: t("settings_s3_prod2"),
    // });

    // if (!VALID_REQURL) {
    //   s3LinksUl.createEl("li").createEl("a", {
    //     href: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/enabling-cors-examples.html",
    //     text: t("settings_s3_prod3"),
    //   });
    // }

    new Setting(s3Div)
      .setName(t("settings_s3_endpoint"))
      .setDesc(t("settings_s3_endpoint"))
      .addText((text) =>
        text
          .setPlaceholder("")
          .setValue(this.plugin.settings.s3.s3Endpoint)
          .onChange(async (value) => {
            this.plugin.settings.s3.s3Endpoint = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(s3Div)
      .setName(t("settings_s3_region"))
      .setDesc(t("settings_s3_region_desc"))
      .addText((text) =>
        text
          .setPlaceholder("")
          .setValue(`${this.plugin.settings.s3.s3Region}`)
          .onChange(async (value) => {
            this.plugin.settings.s3.s3Region = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(s3Div)
      .setName(t("settings_s3_accesskeyid"))
      .setDesc(t("settings_s3_accesskeyid_desc"))
      .addText((text) => {
        wrapTextWithPasswordHide(text);
        text
          .setPlaceholder("")
          .setValue(`${this.plugin.settings.s3.s3AccessKeyID}`)
          .onChange(async (value) => {
            this.plugin.settings.s3.s3AccessKeyID = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(s3Div)
      .setName(t("settings_s3_secretaccesskey"))
      .setDesc(t("settings_s3_secretaccesskey_desc"))
      .addText((text) => {
        wrapTextWithPasswordHide(text);
        text
          .setPlaceholder("")
          .setValue(`${this.plugin.settings.s3.s3SecretAccessKey}`)
          .onChange(async (value) => {
            this.plugin.settings.s3.s3SecretAccessKey = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(s3Div)
      .setName(t("settings_s3_bucketname"))
      .setDesc(t("settings_s3_bucketname"))
      .addText((text) =>
        text
          .setPlaceholder("")
          .setValue(`${this.plugin.settings.s3.s3BucketName}`)
          .onChange(async (value) => {
            this.plugin.settings.s3.s3BucketName = value.trim();
            await this.plugin.saveSettings();
          })
      );

      let remoteDomain = `${this.plugin.settings.remoteDomain}`;
      new Setting(s3Div)
        .setName(t("settings_domain"))
        .setDesc(t("settings_domain_desc"))
        .addText((text) => {
          text
            .setPlaceholder("https://docs.google.com")
            .setValue(`${this.plugin.settings.remoteDomain || ''}`)
            .onChange(async (value) => {
              remoteDomain = value.trim();
            });
        })
        .addButton(async (button) => {
          button.setButtonText(t("confirm"));
          button.onClick(async () => {
            this.plugin.settings.remoteDomain = remoteDomain
            await this.plugin.saveSettings();
            log.info('new domain: ', t("settings_domain_saved") + " " + remoteDomain)
            new Notice(t("settings_domain_saved") + " " + remoteDomain)
          });
        });
    // if (VALID_REQURL) {
    //   new Setting(s3Div)
    //     .setName(t("settings_s3_bypasscorslocally"))
    //     .setDesc(t("settings_s3_bypasscorslocally_desc"))
    //     .addDropdown((dropdown) => {
    //       dropdown
    //         .addOption("disable", t("disable"))
    //         .addOption("enable", t("enable"));

    //       dropdown
    //         .setValue(
    //           `${
    //             this.plugin.settings.s3.bypassCorsLocally ? "enable" : "disable"
    //           }`
    //         )
    //         .onChange(async (value) => {
    //           if (value === "enable") {
    //             this.plugin.settings.s3.bypassCorsLocally = true;
    //           } else {
    //             this.plugin.settings.s3.bypassCorsLocally = false;
    //           }
    //           await this.plugin.saveSettings();
    //         });
    //     });
    // }

    // new Setting(s3Div)
    //   .setName(t("settings_s3_parts"))
    //   .setDesc(t("settings_s3_parts_desc"))
    //   .addDropdown((dropdown) => {
    //     dropdown.addOption("1", "1");
    //     dropdown.addOption("2", "2");
    //     dropdown.addOption("3", "3");
    //     dropdown.addOption("5", "5");
    //     dropdown.addOption("10", "10");
    //     dropdown.addOption("15", "15");
    //     dropdown.addOption("20", "20 (default)");

    //     dropdown
    //       .setValue(`${this.plugin.settings.s3.partsConcurrency}`)
    //       .onChange(async (val) => {
    //         const realVal = parseInt(val);
    //         this.plugin.settings.s3.partsConcurrency = realVal;
    //         await this.plugin.saveSettings();
    //       });
    //   });

    new Setting(s3Div)
      .setName(t("settings_checkonnectivity"))
      .setDesc(t("settings_checkonnectivity_desc"))
      .addButton(async (button) => {
        button.setButtonText(t("settings_checkonnectivity_button"));
        button.onClick(async () => {
          new Notice(t("settings_checkonnectivity_checking"));
          const client = new RemoteClient("s3", this.plugin.settings.s3);
          const errors = { msg: "" };
          const res = await client.checkConnectivity((err: any) => {
            errors.msg = err;
          });
          if (res) {
            new Notice(t("settings_s3_connect_succ"));
          } else {
            new Notice(t("settings_s3_connect_fail"));
            new Notice(errors.msg);
          }
        });
      });
    }
    //////////////////////////////////////////////////
    // below for general chooser (part 2/2)
    //////////////////////////////////////////////////

    // we need to create chooser
    // after all service-div-s being created
    // new Setting(serviceChooserDiv)
    //   .setName(t("settings_chooseservice"))
    //   .setDesc(t("settings_chooseservice_desc"))
    //   .addDropdown(async (dropdown) => {
    //     dropdown.addOption("s3", t("settings_chooseservice_s3"));
    //     dropdown.addOption("dropbox", t("settings_chooseservice_dropbox"));
    //     dropdown.addOption("webdav", t("settings_chooseservice_webdav"));
    //     dropdown.addOption("onedrive", t("settings_chooseservice_onedrive"));
    //     dropdown
    //       .setValue(this.plugin.settings.serviceType)
    //       .onChange(async (val: SUPPORTED_SERVICES_TYPE) => {
    //         this.plugin.settings.serviceType = val;
    //         s3Div.toggleClass(
    //           "s3-hide",
    //           this.plugin.settings.serviceType !== "s3"
    //         );
    //         dropboxDiv.toggleClass(
    //           "dropbox-hide",
    //           this.plugin.settings.serviceType !== "dropbox"
    //         );
    //         onedriveDiv.toggleClass(
    //           "onedrive-hide",
    //           this.plugin.settings.serviceType !== "onedrive"
    //         );
    //         webdavDiv.toggleClass(
    //           "webdav-hide",
    //           this.plugin.settings.serviceType !== "webdav"
    //         );
    //         await this.plugin.saveSettings();
    //       });
    //   });

    // ===============Hosting Settings End===================


    //////////////////////////////////////////////////
    // below for basic settings
    //////////////////////////////////////////////////
    containerEl.createEl("h2", { text: t("settings_basic") });

    const basicDiv = containerEl.createEl("div", { cls: 'settings-config-section' });

    // let newPassword = `${this.plugin.settings.password}`;
    // new Setting(basicDiv)
    //   .setName(t("settings_password"))
    //   .setDesc(t("settings_password_desc"))
    //   .addText((text) => {
    //     wrapTextWithPasswordHide(text);
    //     text
    //       .setPlaceholder("")
    //       .setValue(`${this.plugin.settings.password}`)
    //       .onChange(async (value) => {
    //         newPassword = value.trim();
    //       });
    //   })
    //   .addButton(async (button) => {
    //     button.setButtonText(t("confirm"));
    //     button.onClick(async () => {
    //       new PasswordModal(this.app, this.plugin, newPassword).open();
    //     });
    //   });

    new Setting(basicDiv)
      .setName(t("settings_autorun"))
      .setDesc(t("settings_autorun_desc"))
      .addDropdown((dropdown) => {
        dropdown.addOption("-1", t("settings_autorun_notset"));
        dropdown.addOption(`${1000 * 60 * 1}`, t("settings_autorun_1min"));
        dropdown.addOption(`${1000 * 60 * 5}`, t("settings_autorun_5min"));
        dropdown.addOption(`${1000 * 60 * 10}`, t("settings_autorun_10min"));
        dropdown.addOption(`${1000 * 60 * 30}`, t("settings_autorun_30min"));

        dropdown
          .setValue(`${this.plugin.settings.autoRunEveryMilliseconds}`)
          .onChange(async (val: string) => {
            const realVal = parseInt(val);
            this.plugin.settings.autoRunEveryMilliseconds = realVal;
            await this.plugin.saveSettings();
            if (
              (realVal === undefined || realVal === null || realVal <= 0) &&
              this.plugin.autoRunIntervalID !== undefined
            ) {
              // clear
              window.clearInterval(this.plugin.autoRunIntervalID);
              this.plugin.autoRunIntervalID = undefined;
            } else if (
              realVal !== undefined &&
              realVal !== null &&
              realVal > 0
            ) {
              const intervalID = window.setInterval(() => {
                this.plugin.syncRun("auto");
              }, realVal);
              this.plugin.autoRunIntervalID = intervalID;
              this.plugin.registerInterval(intervalID);
            }
          });
      });

    new Setting(basicDiv)
      .setName(t("settings_runoncestartup"))
      .setDesc(t("settings_runoncestartup_desc"))
      .addDropdown((dropdown) => {
        dropdown.addOption("-1", t("settings_runoncestartup_notset"));
        dropdown.addOption(
          `${1000 * 1 * 1}`,
          t("settings_runoncestartup_1sec")
        );
        dropdown.addOption(
          `${1000 * 10 * 1}`,
          t("settings_runoncestartup_10sec")
        );
        dropdown.addOption(
          `${1000 * 30 * 1}`,
          t("settings_runoncestartup_30sec")
        );
        dropdown
          .setValue(`${this.plugin.settings.initRunAfterMilliseconds}`)
          .onChange(async (val: string) => {
            const realVal = parseInt(val);
            this.plugin.settings.initRunAfterMilliseconds = realVal;
            await this.plugin.saveSettings();
          });
      });
    
    new Setting(basicDiv)
      .setName(t("settings_autocheck"))
      .setDesc(t("settings_autocheck_desc"))
      .addDropdown((dropdown) => {
        dropdown.addOption("-1", t("settings_autocheck_notset"));
        dropdown.addOption(`${1000 * 60 * 1}`, t("settings_autocheck_1min"));
        dropdown.addOption(`${1000 * 60 * 5}`, t("settings_autocheck_5min"));
        dropdown.addOption(`${1000 * 60 * 10}`, t("settings_autocheck_10min"));
        dropdown.addOption(`${1000 * 60 * 30}`, t("settings_autocheck_30min"));


        dropdown
          .setValue(`${this.plugin.settings.autoCheckEveryMilliseconds}`)
          .onChange(async (val: string) => {
            const realVal = parseInt(val);
            this.plugin.settings.autoCheckEveryMilliseconds = realVal;
            await this.plugin.saveSettings();
            if (
              (realVal === undefined || realVal === null || realVal <= 0) &&
              this.plugin.autoCheckIntervalID !== undefined
            ) {
              // clear
              window.clearInterval(this.plugin.autoCheckIntervalID);
              this.plugin.autoCheckIntervalID = undefined;
            } else if (
              realVal !== undefined &&
              realVal !== null &&
              realVal > 0
            ) {
              const intervalID = window.setInterval(() => {
                this.plugin.pendingView();
              }, realVal);
              this.plugin.autoCheckIntervalID = intervalID;
              this.plugin.registerInterval(intervalID);
            }
          });
      });

    new Setting(basicDiv)
      .setName(t("settings_checkoncestartup"))
      .setDesc(t("settings_checkoncestartup_desc"))
      .addDropdown((dropdown) => {
        dropdown.addOption("-1", t("settings_checkoncestartup_notset"));
        dropdown.addOption(
          `${1000 * 1 * 1}`,
          t("settings_checkoncestartup_1sec")
        );
        dropdown.addOption(
          `${1000 * 10 * 1}`,
          t("settings_checkoncestartup_10sec")
        );
        dropdown.addOption(
          `${1000 * 30 * 1}`,
          t("settings_checkoncestartup_30sec")
        );
        dropdown
          .setValue(`${this.plugin.settings.initCheckAfterMilliseconds}`)
          .onChange(async (val: string) => {
            const realVal = parseInt(val);
            this.plugin.settings.initCheckAfterMilliseconds = realVal;
            await this.plugin.saveSettings();
          });
      });

    new Setting(basicDiv)
      .setName(t("settings_skiplargefiles"))
      .setDesc(t("settings_skiplargefiles_desc"))
      .addDropdown((dropdown) => {
        dropdown.addOption("-1", t("settings_skiplargefiles_notset"));

        const mbs = [1, 5, 10, 50, 100, 500, 1000];
        for (const mb of mbs) {
          dropdown.addOption(`${mb * 1000 * 1000}`, `${mb} MB`);
        }
        dropdown
          .setValue(`${this.plugin.settings.skipSizeLargerThan}`)
          .onChange(async (val) => {
            this.plugin.settings.skipSizeLargerThan = parseInt(val);
            await this.plugin.saveSettings();
          });
      });

    //////////////////////////////////////////////////
    // below for advanced settings
    //////////////////////////////////////////////////
    // const advDiv = containerEl.createEl("div");
    // advDiv.createEl("h2", {
    //   text: t("settings_adv"),
    // });

    // new Setting(advDiv)
    //   .setName(t("settings_concurrency"))
    //   .setDesc(t("settings_concurrency_desc"))
    //   .addDropdown((dropdown) => {
    //     dropdown.addOption("1", "1");
    //     dropdown.addOption("2", "2");
    //     dropdown.addOption("3", "3");
    //     dropdown.addOption("5", "5 (default)");
    //     dropdown.addOption("10", "10");
    //     dropdown.addOption("15", "15");
    //     dropdown.addOption("20", "20");

    //     dropdown
    //       .setValue(`${this.plugin.settings.concurrency}`)
    //       .onChange(async (val) => {
    //         const realVal = parseInt(val);
    //         this.plugin.settings.concurrency = realVal;
    //         await this.plugin.saveSettings();
    //       });
    //   });

    // new Setting(advDiv)
    //   .setName(t("settings_syncunderscore"))
    //   .setDesc(t("settings_syncunderscore_desc"))
    //   .addDropdown((dropdown) => {
    //     dropdown.addOption("disable", t("disable"));
    //     dropdown.addOption("enable", t("enable"));
    //     dropdown
    //       .setValue(
    //         `${this.plugin.settings.syncUnderscoreItems ? "enable" : "disable"}`
    //       )
    //       .onChange(async (val) => {
    //         this.plugin.settings.syncUnderscoreItems = val === "enable";
    //         await this.plugin.saveSettings();
    //       });
    //   });

    // new Setting(advDiv)
    //   .setName(t("settings_configdir"))
    //   .setDesc(
    //     t("settings_configdir_desc", {
    //       configDir: this.app.vault.configDir,
    //     })
    //   )
    //   .addDropdown((dropdown) => {
    //     dropdown.addOption("disable", t("disable"));
    //     dropdown.addOption("enable", t("enable"));

    //     const bridge = {
    //       secondConfirm: false,
    //     };
    //     dropdown
    //       .setValue(
    //         `${this.plugin.settings.syncConfigDir ? "enable" : "disable"}`
    //       )
    //       .onChange(async (val) => {
    //         if (val === "enable" && !bridge.secondConfirm) {
    //           dropdown.setValue("disable");
    //           new SyncConfigDirModal(this.app, this.plugin, () => {
    //             bridge.secondConfirm = true;
    //             dropdown.setValue("enable");
    //           }).open();
    //         } else {
    //           bridge.secondConfirm = false;
    //           this.plugin.settings.syncConfigDir = false;
    //           await this.plugin.saveSettings();
    //         }
    //       });
    //   });

    //////////////////////////////////////////////////
    // below for import and export functions
    //////////////////////////////////////////////////

    // import and export
    if (!this.plugin.settings.useHost) {
      containerEl.createEl("h2", {
        text: t("settings_importexport"),
      });
      const importExportDiv = containerEl.createEl("div", { cls: 'settings-config-section' });
  
      new Setting(importExportDiv)
        .setName(t("settings_export"))
        .setDesc(t("settings_export_desc"))
        .addButton(async (button) => {
          button.setButtonText(t("settings_export_desc_button"));
          button.onClick(async () => {
            // new ExportSettingsQrCodeModal(this.app, this.plugin).open();
            InvioSettingTab.exportSettings(this.plugin);
          });
        });

      let restoredStr = '';
      new Setting(importExportDiv)
        .setName(t("settings_import"))
        .setDesc(t("settings_import_desc"))
        .addText((text) =>
          text
            .setPlaceholder("Encrypted config string")
            .setValue("")
            .onChange((val) => {
              restoredStr = val.trim();
            })
        )
        .addButton(async (button) => {
          button.setButtonText(t("settings_import_desc_button"));
          button.onClick(async () => {
            await InvioSettingTab.importSettings(this.plugin, restoredStr);
            this.hide();
          });
        });
    }
    

    //////////////////////////////////////////////////
    // below for debug
    //////////////////////////////////////////////////

    const debugDiv = containerEl.createEl("div");
    debugDiv.createEl("h2", { text: t("settings_debug") });

    new Setting(debugDiv)
      .setName(t("settings_resetcache"))
      .setDesc(t("settings_resetcache_desc"))
      .addButton(async (button) => {
        button.setButtonText(t("settings_resetcache_button"));
        button.onClick(async () => {
          await destroyDBs();
          new Notice(t("settings_resetcache_notice"));
        });
      });

    const bonusDiv = containerEl.createEl('div', { cls: 'settings-config-section' });
    bonusDiv.createEl('h2', { text: 'Stay up to date' });

    const twitterContainer = bonusDiv.createEl('p')
    const twitterText = twitterContainer.createSpan();
    twitterText.innerText = 'Stay up to date with the latest news and updates about our product by following us on Twitter: ';
    twitterContainer.createEl("a", {
      href: "https://twitter.com/webinfra111450",
      text: 'webinfra111450',
    });
  }

  hide() {
    let { containerEl } = this;
    containerEl.empty();
    super.hide();
  }
}
