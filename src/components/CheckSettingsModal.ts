import { App, Modal, Setting } from "obsidian";
import type InvioPlugin from "../main"; // unavoidable
import type { TransItemType } from "../i18n";
import svg from '../utils/svg';
import { InvioSettingTab } from '../settings'
export class CheckSettingsModal extends Modal {
  readonly plugin: InvioPlugin;
  constructor(app: App, plugin: InvioPlugin) {
    super(app);
    this.plugin = plugin;
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

      new Setting(contentEl)
        .setName(t('settings_check_modal_more'))
        .setDesc(t('settings_check_modal_more_desc'))
        .addButton(async (button) => {
          button.setButtonText(t('settings_check_modal_more_btn'));
          button.onClick(async () => {
            this.close();
            (this.plugin.app as any).setting.open()
          });
        })

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
