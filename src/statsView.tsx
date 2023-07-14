import { ItemView, WorkspaceLeaf, Plugin } from "obsidian";
import type InvioPlugin from "./main";
import { log } from './moreOnLog'
import * as React from "react";
import type {
    FileOrFolderMixedState,
} from "./baseTypes";
import { StatsViewComponent } from "./components/StatsView";
import { createRoot } from "react-dom/client";
import useStore, { LogType, LogItem } from './components/store';
const { init, updateRecord, addLog } = useStore.getState();

export * from './components/store';
export const VIEW_TYPE_STATS = "stats-view";

export class StatsView extends ItemView {
    readonly plugin
    data: any
    root: any
    constructor(plugin: InvioPlugin, leaf: WorkspaceLeaf) {
        super(leaf);
        this.plugin = plugin;
        this.data = undefined;
    }

    static getStatsView(plugin: Plugin) {
        const leaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_STATS).find((leaf) => (leaf.view instanceof StatsView));
        return leaf?.view as StatsView;
    }
    
    static async activateStatsView(plugin: Plugin) {
        plugin.app.workspace.detachLeavesOfType(VIEW_TYPE_STATS);
    
        await plugin.app.workspace.getRightLeaf(false).setViewState({
          type: VIEW_TYPE_STATS,
          active: true,
        });
    
        plugin.app.workspace.revealLeaf(
          plugin.app.workspace.getLeavesOfType(VIEW_TYPE_STATS)[0]
        );
    }


    getViewType() {
        return VIEW_TYPE_STATS;
    }

    getDisplayText() {
        return "Invio Stats";
    }

    init(data: Record<string, FileOrFolderMixedState>, logs?: LogItem[]) {
        log.info('init view with data: ', data);
        init(data, logs);
    }

    update(key: string, data: Partial<FileOrFolderMixedState>) {
        log.info('update key...', key, data);
        updateRecord(key, data);
        this.info(`File ${key} status changed - ${data?.syncStatus}`)
    }

    info(msg: string) {
        log.info('view show info: ', msg);
        addLog(msg, LogType.LOG);
    }
    warn(msg: string) {
        log.info('view show warn: ', msg);
        addLog(msg, LogType.WARN);
    }
    error(msg: string) {
        log.info('view show error: ', msg);
        addLog(msg, LogType.ERROR);
    }
    async onOpen() {
        log.info('on open... ');
        this.root = createRoot(this.containerEl.children[1]);
        this.root.render(
            <StatsViewComponent plugin={this.plugin} />
        );
    }

    async onClose() {
        this.root?.unmount();
        // ReactDOM.unmountComponentAtNode(this.containerEl.children[1]);
    }
}
