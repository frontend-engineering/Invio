import { App, Modal, Setting, setIcon, Notice } from "obsidian";
import type { TextComponent } from "obsidian";
import type InvioPlugin from "../main"; // unavoidable
import type { TransItemType } from "../i18n";
import svg from '../utils/svg';
import { InvioSettingTab } from '../settings'
import { RemoteClient } from "../remote";

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
export class CheckSettingsModal extends Modal {
  readonly plugin: InvioPlugin;
  detailed: boolean;
  constructor(app: App, plugin: InvioPlugin) {
    super(app);
    this.plugin = plugin;
    this.detailed = false;
  }

  info(msg: string) {
    let { contentEl } = this;
    let container = contentEl.querySelector('.loading-logs');
    if (!container) {
      container = contentEl.createDiv('loading-logs');
    }
    const logItem = container.createDiv('loading-log-item');
    logItem.innerText = msg;
  }

  onOpen() {
    let { contentEl } = this;
    const t = (x: TransItemType, vars?: any) => {
      return this.plugin.i18n.t(x, vars);
    };

    contentEl.createEl("h2", {
      text: t('settings_check_modal_title')
    });

    new Setting(contentEl)
      .setDesc(t('settings_check_modal_desc'))

      new Setting(contentEl)
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

    new Setting(contentEl)
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

      if (!this.detailed) {
        new Setting(contentEl)
        .setName(t('settings_check_modal_more'))
        .setDesc(t('settings_check_modal_more_desc'))
        .addButton(async (button) => {
          button.setButtonText(t('settings_check_modal_more_btn'));
          button.onClick(async () => {
            this.close();
            // (this.plugin.app as any).setting.open()
            // const settingTab = new InvioSettingTab(this.plugin.app, this.plugin);
            // settingTab.display();
            this.close()
            this.detailed = true;
            setTimeout(() => {
              this.open()
            }, 50)
          });
        })
      }

      if (this.detailed) {
        const s3Div = contentEl.createEl("div", { cls: 'settings-config-section' });
        s3Div.createEl('h2', { text: t('settings_host_self_settings'), cls: 'settings-pub-header' });

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
              console.log('new domain: ', t("settings_domain_saved") + " " + remoteDomain)
              new Notice(t("settings_domain_saved") + " " + remoteDomain)
            });
          });

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

      new Setting(contentEl)
        .addButton((button) => {
          button.setButtonText('OK');
          button.onClick(async () => {
            this.close();
          });
        })
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
