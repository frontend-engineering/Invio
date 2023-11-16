import { App, TFile, Notice, Vault } from 'obsidian';
import { diffChars } from 'diff';
import LocalToRemoteDiffView, { IRemoteFile } from './local_to_remote_diff_view';
import RemoteToLocalDiffView from './remote_to_local_diff_view';
import { TDiffType } from './abstract_diff_view';
import type InvioPlugin from '../main';

export * from './abstract_diff_view';

export function openDiffModal(app: App, plugin: InvioPlugin, file: TFile, remoteFile: IRemoteFile, diffType: TDiffType, hook?: (f?: TFile) => void): void {
  if (diffType === `LocalToRemote`) {
    new LocalToRemoteDiffView(plugin, app, file, remoteFile, hook, hook).open();
  } else if (diffType === `RemoteToLocal`) {
    new RemoteToLocalDiffView(plugin, app, file, remoteFile, hook, hook).open();
  } else {
    new Notice(`Not supported diff view type`);
  }
}


export async function getRemoteFileDiff(vault: Vault, filePath: string, remoteMD: string) {
    const file = vault.getAbstractFileByPath(filePath)
    if (!(file instanceof TFile)) {
      new Notice('Not valid file');
      return;
    }
    const localContent = await vault.adapter.readBinary(filePath).then(buf => new TextDecoder().decode(buf));
    console.log('updated local contents: ', filePath, localContent);
    const uDiff = diffChars(
      localContent,
      remoteMD
    );
    const diff = (uDiff?.filter((item: any) => item.added || item.removed)).length > 0
    console.log('diff result: ', diff, uDiff);
    return !!diff;
  }
