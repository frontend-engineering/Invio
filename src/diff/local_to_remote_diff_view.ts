import { Plugin, App, TFile, Notice } from 'obsidian';
import type InvioPlugin from '../main';
import type { recResult, vRecoveryItem } from './interfaces';
import { FILE_REC_WARNING } from './constants';
import DiffView from './abstract_diff_view';
export interface IRemoteFile {
    data: string;
    ts: number;
    path: string;
}
export default class LocalToRemoteDiffView extends DiffView {
	remote: IRemoteFile
	versions: recResult[];
	rightVList: vRecoveryItem[];
	constructor(plugin: InvioPlugin, app: App, file: TFile, remoteFile: IRemoteFile, fileChangedHook: (f: TFile) => void, cancelHook: () => void) {
		super(plugin, app, file, fileChangedHook, cancelHook);
		this.versions = [];
		this.rightVList = [];
		this.remote = remoteFile;
		this.leftContent = remoteFile?.data;
		this.leftName = 'remote version'
		this.rightName = 'local version'
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
		await this.getInitialVersions();
		const diff = this.getDiff();
		this.makeHistoryLists(FILE_REC_WARNING);
		this.basicHtml(diff as string, this.t('diff_view_title'));
		this.appendVersions();
		this.makeMoreGeneralHtml();
	}

	async getInitialVersions() {
		const fileRecovery = await this.app.internalPlugins.plugins[
			'file-recovery'
		].instance.db
			.transaction('backups', 'readonly')
			.store.index('path')
			.getAll();
		const fileContent = await this.app.vault.read(this.file);
		// correct date is calculated later
		this.versions.push({ path: this.file.path, ts: Date.now(), data: fileContent });
		const len = fileRecovery.length - 1;
		for (let i = len; i >= 0; i--) {
			const version = fileRecovery[i];
			if (version.path === this.file.path) {
				this.versions.push(version);
			}
		}
		if (!(this.versions.length > 1)) {
			this.close();
			new Notice(
				'There is not at least on version in the file recovery.'
			);
			return;
		}

		this.rightContent = this.versions[0].data;
	}

	appendVersions() {
		// add the inner HTML element (the sync list) and keep a record
		// of references to the elements
		this.rightVList.push(
			...this.appendRecoveryVersions(
				this.rightHistory[1],
				this.versions,
			)
		);
	}

	private appendRecoveryVersions(
		el: HTMLElement,
		versions: recResult[],
	): vRecoveryItem[] {
		const versionList: vRecoveryItem[] = [];
		for (let i = 0; i < versions.length; i++) {
			const version = versions[i];
			let date = new Date(version.ts);
	
			let div = el.createDiv({
				cls: 'sync-history-list-item',
				attr: {
					id: this.ids.right,
				},
			});
			// div.createDiv({ text: 'Edit version list ' });

			this.ids.right += 1;
			if (i === 0) {
				div.createDiv({ text: this.t('diff_version_list_title') });
			} else {
				div.createDiv({
					text: date.toLocaleString(),
				});
			}
			versionList.push({
				html: div,
				data: version.data,
			});
			div.addEventListener('click', async () => {
				const clickedEl = (await this.generateVersionListener(
					div,
					this.rightVList,
					this.rightActive
				)) as vRecoveryItem;
				this.rightContent = version.data;
				this.syncHistoryContentContainer.innerHTML =
					this.getDiff() as string;
			});
		}
		return versionList;
	}
}
