import { App, Modal, Setting, requestUrl } from "obsidian";
import type InvioPlugin from "../main"; // unavoidable
import type { TransItemType } from "../i18n";
import svg from '../utils/svg';
import { log } from '../moreOnLog';

export class CreateProjectModal extends Modal {
  readonly plugin: InvioPlugin;
  readonly name: string;
  slug: string;
  domain: string;
  confirmCB: any;
  constructor(app: App, plugin: InvioPlugin, name: string, slug: string, domain: string, cb?: any) {
    super(app);
    this.plugin = plugin;
    this.name = name;
    this.slug = slug;
    this.domain = domain;
    this.confirmCB = cb;
  }
  async createProject() {
    const token = this.plugin.settings.token;
    if (!token) {
      throw new Error('NoAuth');
    }
    // require('request')(`http://localhost:8888/api/invio?priatoken=${token}`, {}, (error, response, body) => {
    //   console.log(JSON.parse(body));
    // });
    return fetch(`http://localhost:8888/api/invio?priatoken=${token}`, {
      method: 'POST',
      body: JSON.stringify({
        name: this.name,
        slug: this.slug,
        domain: this.domain || ''
      })
    })
    .then(resp => resp.json())
    .then(resp => {
      log.info('create project resp  - ', resp);
      return resp
    })
    .catch(err => {
      log.error('create project failed: ', JSON.stringify(err));
    })
  }

  onOpen() {
    let { contentEl } = this;
    const t = (x: TransItemType, vars?: any) => {
      return this.plugin.i18n.t(x, vars);
    };

    contentEl.createEl("h2", {
      text: 'Create a new Project'
    });

    const formContainer = contentEl.createDiv('form-container');
    // formContainer.innerHTML = 'FORM'

    new Setting(formContainer)
      .setName('Name')
      .setDesc('Current directory name')
      .addText((text) =>
        text
          .setPlaceholder("")
          .setValue(this.name)
          .setDisabled(true)
      );
    new Setting(formContainer)
      .setName('Slug')
      .setDesc('Slug of Sub domain')
      .addText((text) =>
        text
          .setPlaceholder("")
          .setValue(this.slug)
          .onChange(txt => {
            this.slug = txt;
            log.info('slug changed: ', this.slug);
          })
      );
    new Setting(formContainer)
      .setName('Domain')
      .setDesc('Your custom domain')
      .addText((text) =>
        text
          .setPlaceholder("www.baidu.com")
          .setValue(this.domain)
          .onChange(txt => {
            this.domain = txt;
            log.info('domain changed: ', this.domain);
          })
      );

    new Setting(formContainer)
      .addButton((button) => {
        button.setButtonText('cancel');
        button.onClick(async () => {
          // this.plugin.settings.password = this.newPassword;
          // await this.plugin.saveSettings();
          // new Notice(t("modal_password_notice"));
          this.close();
        });
      })
      .addButton((button) => {
        button.setClass("password-second-confirm");
        button.setButtonText('Confirm');
        button.onClick(async () => {
          await this.createProject();
          this.confirmCB && this.confirmCB();
          this.close();
        });
      });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
