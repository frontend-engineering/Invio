import { ItemView, WorkspaceLeaf } from "obsidian";
import type InvioPlugin from "./main";
import { log } from './moreOnLog'
import * as React from "react";
import * as ReactDOM from "react-dom";
import { StatsViewComponent } from "./components/StatsView";
import { createRoot } from "react-dom/client";
import useStore from './components/store';
const { init, updateRecord } = useStore.getState();


export const VIEW_TYPE_STATS = "stats-view";

export class StatsView extends ItemView {
    readonly plugin
    data: any
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

    init(data: any) {
        log.info('init view with data: ', data);
        init(data);
    }
    handleStateChange = (key: string, data: any) => {
        log.info('update key...', key, data);
        updateRecord(key, data); 
    }
    async onOpen() {
        log.info('on open... ');
        const root = createRoot(this.containerEl.children[1]);
        root.render(
            <StatsViewComponent plugin={this.plugin} />
        );
    }

    async onClose() {
        ReactDOM.unmountComponentAtNode(this.containerEl.children[1]);
    }
}