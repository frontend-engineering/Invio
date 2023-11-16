import { createTwoFilesPatch } from 'diff';
import { Diff2HtmlConfig, html } from 'diff2html';
// @ts-ignore
import { App, Modal, TFile, Notice, setTooltip } from 'obsidian';
import type { vItem, vRecoveryItem, vSyncItem } from './interfaces';
import type InvioPlugin from '../main';
import type { LangType, LangTypeAndAuto, TransItemType } from "../i18n";

type TviewOutputFormat = `side-by-side` | `line-by-line`

export default abstract class DiffView extends Modal {
	plugin: InvioPlugin;
	app: App;
	file: TFile;
	leftVList: vItem[];
	rightVList: vItem[];
	leftActive: number;
	rightActive: number;
	rightContent: string;
	leftContent: string;
	leftName: string;
	rightName: string;
	syncHistoryContentContainer: HTMLElement;
	leftHistory: HTMLElement[];
	rightHistory: HTMLElement[];
	htmlConfig: Diff2HtmlConfig;
	ids: { left: number; right: number };
	silentClose: boolean;
	viewOutputFormat: TviewOutputFormat;
	fileChangedHook: (file: TFile) => void;
	cancelHook: () => void;

	constructor(plugin: InvioPlugin, app: App, file: TFile, changedHook: (file: TFile) => void, cancelHook: () => void) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.file = file;
		this.modalEl.addClasses(['mod-sync-history', 'diff']);
		this.leftVList = [];
		this.rightVList = [];
		this.rightActive = 0;
		this.leftActive = 1;
		this.leftName = '';
		this.rightName = '';
		this.rightContent = '';
		this.leftContent = '';
		this.ids = { left: 0, right: 0 };
		this.fileChangedHook = changedHook;
		this.cancelHook = cancelHook;
		this.silentClose = false;
		this.viewOutputFormat = 'side-by-side';

		// @ts-ignore
		this.leftHistory = [null];
		// @ts-ignore
		this.rightHistory = [null];
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
				<div class="d2h-file-header">
				  {{{filePath}}}
				</div>
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
		this.containerEl.addClass('diff');
		// @ts-ignore
		const contentParent = this.contentEl.createDiv({
			cls: ['sync-history-content-container-parent'],
		});

		const topAction = contentParent.createDiv({
			cls: 'sync-history-content-container-top'
		});

		const viewChangeBtn = topAction.createDiv({
			cls: ['view-action', 'btn'],
			text: this.t('view_change_btn')
		})

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

		this.syncHistoryContentContainer = contentParent.createDiv({
			cls: ['sync-history-content-container', 'diff'],
		})
	}

	onClose(): void {
		if (!this.silentClose) {
			this.cancelHook	&& this.cancelHook()
		}
	}

	reload(config?: Partial<Diff2HtmlConfig>) {
		this.syncHistoryContentContainer.innerHTML =
			this.getDiff(config) as string;
	}
	abstract getInitialVersions(): Promise<void | boolean>;

	abstract appendVersions(): void;

	public getDiff(config?: Diff2HtmlConfig): string {
		// the second type is needed for the Git view, it reimplements getDiff
		// get diff
		const uDiff = createTwoFilesPatch(
			this.file.basename,
			this.file.basename,
			this.leftContent,
			this.rightContent
		);

		// create HTML from diff
		const diff = html(uDiff, {
			...this.htmlConfig,
			...(config || {})
		});
		return diff;
	}

	public makeHistoryLists(warning: string): void {
		// create both history lists
		this.rightHistory = this.createHistory(this.contentEl);
	}

	public t(x: TransItemType, vars?: any) {
		return this.plugin.i18n.t(x, vars);
	}

	private async changeFileAndCloseModal(contents: string) {
		await this.app.vault.modify(this.file, contents);
		this.fileChangedHook && this.fileChangedHook(this.file);
		this.silentClose = true

		setTimeout(() => {
			console.log('close modal after 500ms')
			this.close()
		}, 500)	
	}

	private createHistory(
		el: HTMLElement,
	): HTMLElement[] {
		const syncHistoryListContainer = el.createDiv({
			cls: ['sync-history-list-container', 'edit-list-show'],
		});

		const syncHistoryList = syncHistoryListContainer.createDiv({
			cls: 'sync-history-list',
		});
		const title = syncHistoryList.createDiv({
			cls: 'sync-history-list-item title',
			text: this.t('diff_edit_list')
		});

		const setVerBtn = syncHistoryListContainer.createEl('button', {
			cls: ['mod-cta', 'btn'],
			text: this.t('diff_reset_ver_btn')
		});
		setTooltip(setVerBtn, 'Click to replace with current selected version', {
			placement: 'top',
		});
		setVerBtn.addEventListener('click', (e) => {
			e.preventDefault();
			this.changeFileAndCloseModal(this.rightContent);
			new Notice(
				`The ${this.file.basename} file has been overwritten with the selected version.`
			);
		});
		return [syncHistoryListContainer, syncHistoryList];
	}

	public basicHtml(diff: string, diffType: string): void {
		// set title
		this.titleEl.setText(diffType);
		// add diff to container
		this.syncHistoryContentContainer.innerHTML = diff;

		// add history lists and diff to DOM
		// this.contentEl.appendChild(this.leftHistory[0]);
		this.contentEl.appendChild(this.syncHistoryContentContainer?.parentNode);
		this.contentEl.appendChild(this.rightHistory[0]);
	}


	public makeMoreGeneralHtml(): void {
		// highlight initial two versions
		this.rightVList[0].html.addClass('is-active');
		// keep track of highlighted versions
		this.rightActive = 0;
		this.leftActive = 1;
	}

	public async generateVersionListener(
		div: HTMLDivElement,
		currentVList: vItem[],
		currentActive: number,
	): Promise<vItem> {
		// the exact return type depends on the type of currentVList, it is either vSyncItem or vRecoveryItem
		// formerly active left/right version
		const currentSideOldVersion = currentVList[currentActive];
		// get the HTML of the new version to set it active
		const idx = Number(div.id);
		const clickedEl: vItem = currentVList[idx];
		div.addClass('is-active');
		this.rightActive = idx;
		// make old not active
		currentSideOldVersion.html.classList.remove('is-active');
		return clickedEl;
	}
}
