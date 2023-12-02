import { Plugin, App, TFile, Notice,
	// @ts-ignore
	setTooltip } from 'obsidian';
import { Diff2HtmlConfig, html } from 'diff2html';
import type InvioPlugin from '../main';
import type { recResult, vRecoveryItem } from './interfaces';
import { FILE_REC_WARNING } from './constants';
import DiffView, { IRemoteFile } from './abstract_diff_view';

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
		this.rightName = plugin.t('diff_view_remote_version'); // 'remote version'
		this.leftName = plugin.t('diff_view_local_version'); // 'local version'

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
									${this.remote.deleted ? '<div class="d2h-code-title">The file does not exist</div>' : ''}
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
	reload(config?: Partial<Diff2HtmlConfig>) {
		this.syncHistoryContentContainer.innerHTML =
			this.getDiff(config) as string;

		this.setupViewChangeBtn()
	}

	public basicHtml(diff: string): void {
		// set title
		this.titleEl.setText(this.t('diff_view_remote_title'));
		// add diff to container
		this.syncHistoryContentContainer.innerHTML = diff;

		// add history lists and diff to DOM
		// this.contentEl.appendChild(this.leftHistory[0]);
		this.contentEl.appendChild(this.syncHistoryContentContainer?.parentNode);
		this.setupViewChangeBtn()
	}
}
