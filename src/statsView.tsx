import { ItemView, WorkspaceLeaf, Plugin } from "obsidian";
import type InvioPlugin from "./main";
import { log } from './moreOnLog'
import * as React from "react";
import type {
    FileOrFolderMixedState,
} from "./baseTypes";
import { StatsViewComponent } from "./components/StatsView";
import { PendingStatsViewComponent } from './components/PendingStatsView'
import { createRoot } from "react-dom/client";
import useStore, { LogType, LogItem } from './components/store';
import usePendingStore from './components/pendingStore';
import { UsingIconNames } from './utils/icon';

const { init, updateRecord, addLog, clean } = useStore.getState();
const { init: pendingInit } = usePendingStore.getState();

export * from './components/store';
export const VIEW_TYPE_STATS = "stats-view";
const { iconNameSyncLogo } = UsingIconNames;

export type TStatsViewType = `PendingStats` | `SyncingStats` | `HistoryStats`;

export class StatsView extends ItemView {
    readonly plugin
    data: any
    root: any
    type: TStatsViewType
    constructor(plugin: InvioPlugin, leaf: WorkspaceLeaf, type: TStatsViewType = `PendingStats`) {
        super(leaf);
        this.plugin = plugin;
        this.data = undefined;
        this.icon = iconNameSyncLogo;
        this.type = type;
    }

    static getStatsView(plugin: Plugin, type?: TStatsViewType, clean?: boolean) {
        const leaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_STATS).find((leaf) => (leaf.view instanceof StatsView));
 
        if (clean) {
            console.log('view root: ', (leaf?.view as StatsView)?.root);
            (leaf?.view as StatsView)?.root?.unmount();
        }
        if (type) {
            (leaf?.view as StatsView)?.setStatsType(type);
        }
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

    setStatsType(type: TStatsViewType) {
        this.type = type;
        console.log('stats type: ', type)
        this.root?.unmount();
        this.onOpen()
    }
    getStatsType() {
        return this.type;
    }

    getDisplayText() {
        return this.type === 'PendingStats' ? 'Touched Files' : "Invio Stats";
    }

    init(data: Record<string, FileOrFolderMixedState>, logs?: LogItem[]) {
        log.info('init view with data: ', data);
        if (this.type === 'SyncingStats') {
            init(data, logs);
        } else if (this.type === 'PendingStats') {
            pendingInit(data)
        }
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
        log.info('on open... ', this.type);
        this.root = createRoot(this.containerEl.children[1]);
        if (this.type === 'SyncingStats') {
            this.root.render(
                <StatsViewComponent plugin={this.plugin} />
            )
        } else {
            this.root.render(
                <PendingStatsViewComponent plugin={this.plugin} />
            );
        }
    }

    async onClose() {
        clean(); // Clean data on view close
        this.root?.unmount();
    }
}
