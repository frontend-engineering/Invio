import {
  App,
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
  Platform,
  requireApiVersion,
} from "obsidian";
import type { TextComponent } from "obsidian";
import { createElement, Eye, EyeOff } from "lucide";
import {
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
import type InvioPlugin from "./main"; // unavoidable
import { RemoteClient } from "./remote";
import {
  DEFAULT_DROPBOX_CONFIG,
  getAuthUrlAndVerifier as getAuthUrlAndVerifierDropbox,
  sendAuthReq as sendAuthReqDropbox,
  setConfigBySuccessfullAuthInplace,
} from "./remoteForDropbox";
import {
  DEFAULT_ONEDRIVE_CONFIG,
  getAuthUrlAndVerifier as getAuthUrlAndVerifierOnedrive,
} from "./remoteForOnedrive";
import { messyConfigToNormal } from "./configPersist";
import type { TransItemType } from "./i18n";
import { checkHasSpecialCharForDir, mkdirpInVault } from "./misc";
import { applyWebdavPresetRulesInplace } from "./presetRules";
import { ExportSettingsData, DEFAULT_SETTINGS } from './export-settings';
import icon, { getIconSvg } from './utils/icon';
import { Utils } from "./utils/utils";
import {
  applyLogWriterInplace,
  log,
  restoreLogWritterInplace,
} from "./moreOnLog";

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
            this.plugin.settings[this.service].remoteBaseDir = "";
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
            this.plugin.settings[this.service].remoteBaseDir =
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

const getEyesElements = () => {
  const eyeEl = createElement(Eye);
  const eyeOffEl = createElement(EyeOff);
  return {
    eye: eyeEl.outerHTML,
    eyeOff: eyeOffEl.outerHTML,
  };
};

const wrapTextWithPasswordHide = (text: TextComponent) => {
  const { eye, eyeOff } = getEyesElements();
  const hider = text.inputEl.insertAdjacentElement("afterend", createSpan());
  // the init type of hider is "hidden" === eyeOff === password
  hider.innerHTML = eyeOff;
  hider.addEventListener("click", (e) => {
    const isText = text.inputEl.getAttribute("type") === "text";
    hider.innerHTML = isText ? eyeOff : eye;
    text.inputEl.setAttribute("type", isText ? "password" : "text");
    text.inputEl.focus();
  });

  // the init type of text el is password
  text.inputEl.setAttribute("type", "password");
  return text;
};

export class InvioSettingTab extends PluginSettingTab {
  readonly plugin: InvioPlugin;
	static settings: ExportSettingsData = DEFAULT_SETTINGS;

  constructor(app: App, plugin: InvioPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  static saveSettings(plugin: InvioPlugin) {
    plugin.saveSettings();
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
            this.plugin.settings.localWatchDir = value.trim();
            icon.removeIconInNode(document.body);
            const { iconSvgSyncWait } = getIconSvg();
            icon.createIconNode(this.plugin, this.plugin.settings.localWatchDir, iconSvgSyncWait);
            await this.plugin.saveSettings(); 
          })
      });

    // ===============Exporter Settings ======================

		const header = containerEl.createEl('h2', { text: 'Publish Settings' });
		header.style.display = 'block';
		header.style.marginBottom = '15px';

    // ===============Exporter Settings End===================
    
    
    //////////////////////////////////////////////////
    // below for service chooser (part 1/2)
    //////////////////////////////////////////////////

    // we need to create the div in advance of any other service divs
    // const serviceChooserDiv = containerEl.createDiv();
    // serviceChooserDiv.createEl("h2", { text: t("settings_chooseservice") });

    //////////////////////////////////////////////////
    // below for s3
    //////////////////////////////////////////////////

    const s3Div = containerEl.createEl("div");
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

    //////////////////////////////////////////////////
    // below for basic settings
    //////////////////////////////////////////////////

    const basicDiv = containerEl.createEl("div");
    basicDiv.createEl("h2", { text: t("settings_basic") });

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
    const importExportDiv = containerEl.createEl("div");
    importExportDiv.createEl("h2", {
      text: t("settings_importexport"),
    });

    new Setting(importExportDiv)
      .setName(t("settings_export"))
      .setDesc(t("settings_export_desc"))
      .addButton(async (button) => {
        button.setButtonText(t("settings_export_desc_button"));
        button.onClick(async () => {
          // new ExportSettingsQrCodeModal(this.app, this.plugin).open();
          const data = await this.plugin.loadData();
          await navigator.clipboard.writeText(data.d);
          new Notice(t("settings_export_msg"));
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
          if (!restoredStr) {
            new Notice(t("settings_import_err")); 
            return;
          }
          await this.plugin.loadSettings(restoredStr);
          // Create dir if necessary.
          const dir = this.plugin.settings.localWatchDir;
          if (dir && (typeof dir === 'string')) {
            await mkdirpInVault(dir, this.plugin.app.vault);
          } else {
            log.error('Imported settings not configured correctly.')
          }
          await this.plugin.saveSettings();
          this.hide();
          this.display();
        });
      });

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
  }

  hide() {
    let { containerEl } = this;
    containerEl.empty();
    super.hide();
  }
}