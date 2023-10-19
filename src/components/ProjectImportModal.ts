import { App, Modal, Setting, Notice } from "obsidian";
import type InvioPlugin from "../main"; // unavoidable
import type { TransItemType } from "../i18n";
import { log } from '../moreOnLog';
import { settingsPrefix, settingsSuffix } from '../settings';
import { mkdirpInVault } from "../misc";

export class ProjectImportModal extends Modal {
  readonly plugin: InvioPlugin;
  restoredStr: string;
  confirmCB: any;
  constructor(app: App, plugin: InvioPlugin, cb?: any) {
    super(app);
    this.plugin = plugin;
    this.confirmCB = cb;
  }

  t(x: TransItemType, vars?: any) {
    return this.plugin.i18n.t(x, vars);
  }

  async importProject(plugin: InvioPlugin, restoredStr: string) {
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
    return dir;
  }

  onOpen() {
    let { contentEl } = this;
    const t = (x: TransItemType, vars?: any) => {
      return this.plugin.i18n.t(x, vars);
    };

    contentEl.createEl("h2", {
      text: 'Import project to local'
    });

    const formContainer = contentEl.createDiv('form-container');
    // formContainer.innerHTML = 'FORM'

    new Setting(formContainer)
      .setName('Import String')
      .setDesc('Paste the hash string you got')
      .addTextArea((text) =>
        text
          .setPlaceholder("")
          .setValue(this.restoredStr)
          .onChange(txt => {
            this.restoredStr = txt;
            log.info('restoredStr changed: ', this.restoredStr);
          })
      );

    new Setting(formContainer)
      .addButton((button) => {
        button.setButtonText('cancel');
        button.onClick(async () => {
          // this.plugin.settings.password = this.newPassword;
          // await this.plugin.saveSettings();
          // new Notice(t("modal_password_notice"));
          if (this.confirmCB) {
            this.confirmCB(null, 'cancel');
          }
          this.close();
        });
      })
      .addButton((button) => {
        button.setClass("password-second-confirm");
        button.setButtonText('Confirm');
        button.onClick(async () => {
          await this.importProject(this.plugin, this.restoredStr)
            .then(dir => {
              if (dir) {
                if (this.confirmCB) {
                  this.confirmCB(dir);
                  new Notice(`Local project created - ${dir}`, 3500);
                } 
              } else {
                if (this.confirmCB) {
                  this.confirmCB(null, 'fail');
                  new Notice(`Local project import failed`, 3500);
                }
                return;
              }
              this.close();
            })
            .catch(err => {
              log.error('create project failed: ', JSON.stringify(err));
              // TODO: Show error info
              new Notice(err?.message, 3500);
              return err;
            })
        });
      });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
