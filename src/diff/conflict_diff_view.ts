import {
	Plugin,
	App,
	TFile,
	Notice,
	// @ts-ignore
	setTooltip
} from 'obsidian';
import type InvioPlugin from '../main';
import type { recResult, vRecoveryItem } from './interfaces';
import { FILE_REC_WARNING } from './constants';
import DiffView, { TDiffType } from './abstract_diff_view';
import { Diff2HtmlConfig, html } from 'diff2html';
export default class ConflictDiffView extends DiffView {
	remote: recResult
	versions: recResult[];
	rightVList: vRecoveryItem[];
	constructor(plugin: InvioPlugin, app: App, file: TFile, remoteFile: recResult, fileChangedHook: (f: TFile) => void, cancelHook: () => void) {
		super(plugin, app, file, fileChangedHook, cancelHook);
		this.versions = [];
		this.rightVList = [];
		this.remote = remoteFile;
		this.leftContent = remoteFile?.data;
		this.leftName = plugin.t('diff_view_remote_version'); // 'remote version'
		this.rightName = plugin.t('diff_view_local_version'); // 'local version'

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
		this.basicHtml(diff as string);
		this.appendVersions();
		this.makeMoreGeneralHtml();
	}

	reload(config?: Partial<Diff2HtmlConfig>) {
		this.syncHistoryContentContainer.innerHTML =
			this.getDiff(config) as string;

		this.setupViewChangeBtn()
	}

	public basicHtml(diff: string): void {
		// set title
		this.titleEl.setText(this.t('diff_view_conflict_title'));
		// set top action bar

		const contentParent = this.syncHistoryContentContainer.parentElement;
		const topAction = contentParent.createDiv({
			cls: 'sync-history-content-container-top'
		});

		const diffResetBtn = topAction.createDiv({
			cls: ['view-action', 'btn'],
			text: this.t('diff_reset_btn')
		})
		setTooltip(diffResetBtn, 'Click to replace the file with online version', {
			placement: 'top',
		});
		diffResetBtn.addEventListener('click', e => {
			e.preventDefault();
			this.changeFileAndCloseModal(this.leftContent);

			new Notice(
				`The ${this.file.basename} file has been overwritten with the online remote version.`
			);
		})

		// add diff to container
		this.syncHistoryContentContainer.innerHTML = diff;

		// add history lists and diff to DOM
		// this.contentEl.appendChild(this.leftHistory[0]);
		this.contentEl.appendChild(this.syncHistoryContentContainer?.parentNode);
		this.setupViewChangeBtn()
		this.contentEl.appendChild(this.rightHistory[0]);
	}

	setupViewChangeBtn() {
		const target = this.containerEl.querySelector('.d2h-file-wrapper');
		const viewChangeBtn = target.createDiv({
			cls: ['btn', 'style-view-toggle'],
			text: this.t('view_change_btn')
		})
		setTooltip(viewChangeBtn, 'Click to change diff view', {
			placement: 'top',
		});

		viewChangeBtn.addEventListener('click', e => {
			e.preventDefault();
			this.viewOutputFormat = ('line-by-line' === this.viewOutputFormat) ? 'side-by-side' : 'line-by-line';
			console.log('diff styles changed to ', this.viewOutputFormat)
			this.reload({
				outputFormat: this.viewOutputFormat
			});
		})
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

		// insert remote record
		const remoteUpdateTS = this.remote.ts;
		const idx = this.versions.findIndex(item => item.ts <= remoteUpdateTS)
		this.versions.splice(idx, 0, {
			...this.remote,
			isRemote: true
		})
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

			this.ids.right += 1;
			if (i === 0) {
				div.createDiv({ text: this.t('diff_version_list_title') });
			} else if (version.isRemote) {
				div.createDiv({
					cls: 'sync-history-list-item-remote',
					text: 'Remote Updated At: ' + date.toLocaleString(),
				});	
			} else {
				div.createDiv({
					text: date.toLocaleString(),
				});
			}
			versionList.push({
				html: div,
				data: version.data,
			});
			if (!version.isRemote) {
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
		}
		return versionList;
	}
}
