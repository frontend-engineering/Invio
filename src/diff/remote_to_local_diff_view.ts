import { Plugin, App, TFile, Notice } from 'obsidian';
import type InvioPlugin from '../main';
import type { recResult, vRecoveryItem } from './interfaces';
import { FILE_REC_WARNING } from './constants';
import DiffView, { TDiffType } from './abstract_diff_view';
export interface IRemoteFile {
    data: string;
    ts: number;
    path: string;
}
export default class RemoteToLocalDiffView extends DiffView {
	remote: IRemoteFile
	versions: recResult[];
	rightVList: vRecoveryItem[];
	constructor(plugin: InvioPlugin, app: App, file: TFile, remoteFile: IRemoteFile, fileChangedHook: (f: TFile) => void, cancelHook: () => void) {
		super(plugin, app, file, fileChangedHook, cancelHook);
		this.versions = [];
		this.rightVList = [];
		this.remote = remoteFile;
		this.rightContent = remoteFile?.data;
		this.rightName = 'remote version'
		this.leftName = 'local version'
		this.htmlConfig = {
			drawFileList: true,
			diffStyle: 'word',
			matchWordsThreshold: 0.25,
			outputFormat: this.viewOutputFormat,
			rawTemplates: {
				'line-by-line-file-diff': `<div id="{{fileHtmlId}}" class="d2h-file-wrapper" data-lang="{{file.language}}">
					<div class="d2h-file-header">
					{{{filePath}}}
					</div>
					<div class="d2h-file-diff">
						<div class="d2h-code-wrapper">
							<table class="d2h-diff-table">
								<tbody class="d2h-diff-tbody">
								{{{diffs}}}
								</tbody>
							</table>
						</div>
					</div>
				</div>`,
				'side-by-side-file-diff': `<div id="{{fileHtmlId}}" class="d2h-file-wrapper" data-lang="{{file.language}}">
					<div class="d2h-files-diff">
						<div class="d2h-file-side-diff">
							<div class="d2h-code-title">${this.leftName}</div>
							<div class="d2h-code-wrapper">
								<table class="d2h-diff-table">
									<tbody class="d2h-diff-tbody">
									{{{diffs.left}}}
									</tbody>
								</table>
							</div>
						</div>
						<div class="d2h-file-side-diff">
							<div class="d2h-code-title">${this.rightName}</div>
							<div class="d2h-code-wrapper">
								<table class="d2h-diff-table">
									<tbody class="d2h-diff-tbody">
									{{{diffs.right}}}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>`
			}
		};
	}

	async onOpen() {
		super.onOpen();
		this.leftContent = await this.app.vault.read(this.file);

		const diff = this.getDiff();
		this.basicHtml(diff as string);
	}
	public basicHtml(diff: string): void {
		// set title
		this.titleEl.setText(this.t('diff_view_remote_title'));
		// add diff to container
		this.syncHistoryContentContainer.innerHTML = diff;

		// add history lists and diff to DOM
		// this.contentEl.appendChild(this.leftHistory[0]);
		this.contentEl.appendChild(this.syncHistoryContentContainer?.parentNode);
	}
}
