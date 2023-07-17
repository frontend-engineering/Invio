import { App, Modal, Notice, PluginSettingTab, Setting } from "obsidian";
import type InvioPlugin from "./main"; // unavoidable
import type { TransItemType } from "./i18n";
import { createElement, FilePlus2, Trash, ArrowDownToLine, ArrowUpToLine } from "lucide";

import { log } from "./moreOnLog";
import { FileOrFolderMixedState } from "./baseTypes";

export class TouchedPlanModel extends Modal {
  agree: boolean;
  readonly plugin: InvioPlugin;
  readonly files: Record<string, FileOrFolderMixedState>;
  hook: (agree: boolean) => void;
  constructor(app: App, plugin: InvioPlugin, fileMap: Record<string, FileOrFolderMixedState>, cb: (agree: boolean) => void) {
    super(app);
    this.plugin = plugin;
    this.agree = false;
    this.files = fileMap;
    this.hook = cb;
  }

  static getTouchedFilesGroup(files: Record<string, FileOrFolderMixedState>) {

    const toRemoteFiles: FileOrFolderMixedState[] = [];
    const toLocalFiles: FileOrFolderMixedState[] = [];
    const conflictFiles: FileOrFolderMixedState[] = [];

    [ ...Object.keys(files) ].forEach(key => {
      const f = files[key];
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
    return {
      toRemoteFiles: [ ...toRemoteFiles ],
      toLocalFiles: [ ...toLocalFiles ],
      conflictFiles: [ ...conflictFiles ]
    }
  }

  onOpen() {
    let { contentEl } = this;
    const t = (x: TransItemType, vars?: any) => {
      return this.plugin.i18n.t(x, vars);
    };

    contentEl.createEl("h2", {
      text: 'Sync Files Checklist'
    });

    const { toRemoteFiles, toLocalFiles, conflictFiles } = TouchedPlanModel.getTouchedFilesGroup(this.files);

    new Setting(contentEl)
      .setDesc('Please check the file changes list to confirm that all changes are as expected.')

    if (toRemoteFiles?.length > 0) {
      contentEl.createEl("h4", {
        text: 'Remote files to be modifed'
      });
      const ulRemote = contentEl.createEl("ul");
      toRemoteFiles.forEach((val) => {
        const li = ulRemote.createEl("li", {
            text: val.key,
            cls: 'file-item-action'
          });
          if (val.decision === 'uploadLocalToRemote') {
            const iconSvgCreate = createElement(FilePlus2);
            iconSvgCreate.addClass('file-item-action-icon')
            li.appendChild(iconSvgCreate)
          } else {
            const iconSvgTrash = createElement(Trash);
            iconSvgTrash.addClass('file-item-action-icon')
            li.appendChild(iconSvgTrash)
          }
        });
    }


    if (toLocalFiles.length > 0) {
      contentEl.createEl("h4", {
        text: 'Local files to be modified'
      });
      const ulLocal = contentEl.createEl("ul");
      toLocalFiles.forEach((val) => {
        const li = ulLocal.createEl("li", {
          text: val.key,
          cls: 'file-item-action'
        });
        if (val.decision === 'downloadRemoteToLocal') {
          const iconSvgCreate = createElement(FilePlus2);
          iconSvgCreate.addClass('file-item-action-icon')
          li.appendChild(iconSvgCreate)
        } else {
          const iconSvgTrash = createElement(Trash);
          iconSvgTrash.addClass('file-item-action-icon')
          li.appendChild(iconSvgTrash)
        }
      });
    }

    if (conflictFiles.length > 0) {
      contentEl.createEl("h4", {
        text: 'Conflicted files'
      });
      const ulConflict = contentEl.createEl("ul");
      conflictFiles.forEach((val) => {
        const li = ulConflict.createEl("li", {
          text: val.key,
          cls: 'file-item-action'
        });
        if (val.decision === 'downloadRemoteToLocal') {
          const iconSvgSyncDown = createElement(ArrowDownToLine);
          iconSvgSyncDown.addClass('file-item-action-icon')
          li.appendChild(iconSvgSyncDown)
        } else {
          const iconSvgUp = createElement(ArrowUpToLine);
          iconSvgUp.addClass('file-item-action-icon')
          li.appendChild(iconSvgUp)
        }
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
