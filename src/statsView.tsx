import { ItemView, WorkspaceLeaf } from "obsidian";
import type InvioPlugin from "./main";
import { log } from './moreOnLog'
import * as React from "react";
import * as ReactDOM from "react-dom";
import { StatsViewComponent } from "./components/StatsView";
import { createRoot } from "react-dom/client";
import useStore, { LogType } from './components/store';
const { init, updateRecord, addLog } = useStore.getState();


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

    getViewType() {
        return VIEW_TYPE_STATS;
    }

    getDisplayText() {
        return "Invio Stats";
    }

    init(data: any, logs: any) {
        log.info('init view with data: ', data);
        init(data, logs);
    }
    handleStateChange(key: string, data: any) {
        log.info('update key...', key, data);
        updateRecord(key, data); 
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