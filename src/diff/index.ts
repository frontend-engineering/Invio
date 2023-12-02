import { App, TFile, Notice, Vault } from 'obsidian';
import LocalToRemoteDiffView from './local_to_remote_diff_view';
import RemoteToLocalDiffView from './remote_to_local_diff_view';
import ConflictDiffView from './conflict_diff_view';
import { TDiffType, IRemoteFile } from './abstract_diff_view';
import type InvioPlugin from '../main';
import { diff_match_patch } from './effective_diff.js';
import { log } from '../moreOnLog'

export * from './abstract_diff_view';

export function openDiffModal(app: App, plugin: InvioPlugin, file: TFile, remoteFile: IRemoteFile, diffType: TDiffType, hook?: (f?: TFile) => void): void {
  if (diffType === `LocalToRemote`) {
    new LocalToRemoteDiffView(plugin, app, file, remoteFile, hook, hook).open();
  } else if (diffType === `RemoteToLocal`) {
    new RemoteToLocalDiffView(plugin, app, file, remoteFile, hook, hook).open();
  } else if (diffType === `Conflict`) {
    // 计算文件更改时间，对比local和remote文件状态
    new ConflictDiffView(plugin, app, file, remoteFile, hook, hook).open();
  } else {
    new Notice(`Not supported diff view type`);
  }
}

// For local files not exist or invalid, always return diff: true
export async function isRemoteFileDiff(vault: Vault, filePath: string, remoteMD: string) {
    const localExist = await vault.adapter.exists(filePath)
    if (!localExist) {
      log.info(`file ${filePath} not existed locally`)
      return true;
    }
    const file = vault.getAbstractFileByPath(filePath)
    if (!(file instanceof TFile)) {
      log.info(`file ${filePath} not a valid file`)
      return true;
    }
    const localContent = await vault.adapter.readBinary(filePath).then(buf => new TextDecoder().decode(buf));
    const dmp: any = new diff_match_patch();
    const uDiff = dmp.diff_main(localContent, remoteMD);
    dmp.diff_cleanupSemantic(uDiff);

    const diff = (uDiff?.filter((item: any) => item[0] !== 0)).length > 0
    return !!diff;
  }
