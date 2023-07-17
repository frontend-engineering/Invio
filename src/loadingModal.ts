import { App, Modal } from "obsidian";
import type InvioPlugin from "./main"; // unavoidable
import type { TransItemType } from "./i18n";
import svg from './utils/svg';

export class LoadingModal extends Modal {
  readonly plugin: InvioPlugin;
  constructor(app: App, plugin: InvioPlugin) {
    super(app);
    this.plugin = plugin;
  }

  info(msg: string) {
    let { contentEl } = this;
    let container = contentEl.querySelector('.loading-logs');
    if (!container) {
      container = contentEl.createDiv('loading-logs');
    }
    const logItem = container.createDiv('loading-log-item');
    logItem.innerText = msg;
  }

  onOpen() {
    let { contentEl } = this;
    const t = (x: TransItemType, vars?: any) => {
      return this.plugin.i18n.t(x, vars);
    };

    contentEl.createEl("h2", {
      text: 'Checking Sync Files'
    });

    const loadingContainer = contentEl.createDiv('loading-container');

    const loadingSVG = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
      width="36px" height="45px" viewBox="0 0 24 30" style="enable-background:new 0 0 50 50;" xml:space="preserve">
      <rect x="0" y="13" width="4" height="5" fill="currentColor">
        <animate attributeName="height" attributeType="XML"
          values="5;21;5" 
          begin="0s" dur="0.6s" repeatCount="indefinite" />
        <animate attributeName="y" attributeType="XML"
          values="13; 5; 13"
          begin="0s" dur="0.6s" repeatCount="indefinite" />
      </rect>
      <rect x="10" y="13" width="4" height="5" fill="currentColor">
        <animate attributeName="height" attributeType="XML"
          values="5;21;5" 
          begin="0.15s" dur="0.6s" repeatCount="indefinite" />
        <animate attributeName="y" attributeType="XML"
          values="13; 5; 13"
          begin="0.15s" dur="0.6s" repeatCount="indefinite" />
      </rect>
      <rect x="20" y="13" width="4" height="5" fill="currentColor">
        <animate attributeName="height" attributeType="XML"
          values="5;21;5" 
          begin="0.3s" dur="0.6s" repeatCount="indefinite" />
        <animate attributeName="y" attributeType="XML"
          values="13; 5; 13"
          begin="0.3s" dur="0.6s" repeatCount="indefinite" />
      </rect>
    </svg>`;
    let content = loadingSVG;
    content = content.replace(/(\r\n|\n|\r)/gm, '');
    content = content.replace(/>\s+</gm, '><');
    content = svg.extract(content);
    content = svg.setFontSize(content, 28);

    loadingContainer.innerHTML = content;
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
