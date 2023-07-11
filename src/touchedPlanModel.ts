import { App, Modal, Notice, PluginSettingTab, Setting } from "obsidian";
import type InvioPlugin from "./main"; // unavoidable
import type { TransItemType } from "./i18n";

import { log } from "./moreOnLog";
import { FileOrFolderMixedState } from "./baseTypes";

export class TouchedPlanModel extends Modal {
  agree: boolean;
  readonly plugin: InvioPlugin;
  hook: (agree: boolean) => void;
  readonly files: Record<string, FileOrFolderMixedState>;
  constructor(app: App, plugin: InvioPlugin, fileMap: Record<string, FileOrFolderMixedState>, cb: (agree: boolean) => void) {
    super(app);
    this.plugin = plugin;
    this.agree = false;
    this.files = fileMap;
    this.hook = cb;
  }
  onOpen() {
    let { contentEl } = this;
    const t = (x: TransItemType, vars?: any) => {
      return this.plugin.i18n.t(x, vars);
    };

    contentEl.createEl("h2", {
      text: 'Sync Files Checklist'
    });

    const toRemoteFiles: FileOrFolderMixedState[] = [];
    const toLocalFiles: FileOrFolderMixedState[] = [];
    const conflictFiles: FileOrFolderMixedState[] = [];

    [ ...Object.keys(this.files) ].forEach(key => {
      const f = this.files[key];
      if ((f.decision === 'uploadLocalDelHistToRemote') && f.existRemote) {
        toRemoteFiles.push(f);
      }
      if (f.decision === 'uploadLocalToRemote') {
        toRemoteFiles.push(f);
      }
      if (f.decision === 'downloadRemoteToLocal') {
        toLocalFiles.push(f);
      }
      if ((f.decision === 'keepRemoteDelHist') && f.existLocal) {
        toLocalFiles.push(f);
      }
      if (f.remoteUnsync) {
        conflictFiles.push(f);
      }
    });

    new Setting(contentEl)
      .setDesc('在做同步操作之前，请检查文件变更列表，确认所有变更是否符合预期')

    if (toRemoteFiles?.length > 0) {
      contentEl.createEl("h4", {
        text: 'Remote files to be modifed'
      });
      const ulRemote = contentEl.createEl("ul");
      toRemoteFiles.forEach((val) => {
        ulRemote.createEl("li", {
            text: val.key + ' - ' + (val.decision === 'uploadLocalToRemote' ? '➕' : '➖'),
          });
        });
    }


    if (toLocalFiles.length > 0) {
      contentEl.createEl("h4", {
        text: 'Local files to be modified'
      });
      const ulLocal = contentEl.createEl("ul");
      toLocalFiles.forEach((val) => {
        ulLocal.createEl("li", {
            text: val.key + ' - ' + (val.decision === 'downloadRemoteToLocal' ? '➕' : '➖'),
          });
        });
    }

    if (conflictFiles.length > 0) {
      contentEl.createEl("h4", {
        text: 'Conflicted files'
      });
      const ulConflict = contentEl.createEl("ul");
      conflictFiles.forEach((val) => {
        ulConflict.createEl("li", {
            text: val.key + ' - Override ' + (val.decision === 'downloadRemoteToLocal' ? 'Local' : 'Remote'),
          });
      });
      contentEl.createEl('p', {
        text: 'Warnning: Don\'t worry, to prevent data loss, conflicting files will generate a .conflict.md backup file with the overwritten content to your local folder.'
      })
    }

    if (toRemoteFiles.length === 0 && toLocalFiles.length === 0 && conflictFiles.length === 0) {
      contentEl.createEl("p", {
        text: 'All synced with remote, everything is cool!'
      });
    }

    new Setting(contentEl)
      .addButton((button) => {
        button.setButtonText('Confirm');
        button.onClick(async () => {
          this.agree = true;
          this.close();
        });
      })
      .addButton((button) => {
        button.setButtonText('Cancel');
        button.onClick(() => {
          this.close();
        });
      });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
    this.hook(this.agree);
  }
}
