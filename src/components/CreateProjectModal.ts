import { App, Modal, Setting, Notice } from "obsidian";
import type InvioPlugin from "../main"; // unavoidable
import type { TransItemType } from "../i18n";
import { log } from '../moreOnLog';
import Utils from "../utils";
import { HostServerUrl } from '../remote';
import svg from '../utils/svg';
export class CreateProjectModal extends Modal {
  readonly plugin: InvioPlugin;
  readonly name: string;
  slug: string;
  password: string;
  slugError: string;
  domain: string;
  confirmCB: any;
  constructor(app: App, plugin: InvioPlugin, name: string, slug: string, password: string, domain: string, cb?: any) {
    super(app);
    this.plugin = plugin;
    this.name = name;
    this.slug = slug?.toLowerCase(); // 所有online资源不区分大小写
    this.password = password;
    this.slugError = '';
    this.domain = domain;
    this.confirmCB = cb;
  }

  t(x: TransItemType, vars?: any) {
    return this.plugin.i18n.t(x, vars);
  }

  async createProject() {
    const token = this.plugin.settings.hostConfig?.token;
    if (!token) {
      Utils.gotoAuth();
      throw new Error('Unauthorized');
    }
    if (!this.slug || !this.name) {
      throw new Error(this.t('modal_project_empty_err'));
    }
    if (!/^[a-zA-Z0-9]{6,12}$/.test(this.slug)) {
      throw new Error(this.t('modal_project_slug_err'))
    }
    if (this.slug !== this.slug.toLowerCase()) {
      throw new Error(this.t('modal_project_slug_case_err'))
    }
    return fetch(`${HostServerUrl}/api/invio?priatoken=${token}`, {
      method: 'POST',
      body: JSON.stringify({
        name: this.name,
        password: this.password || '',
        slug: this.slug,
        domain: this.domain || ''
      })
    })
    .then(resp => resp.json());
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
      .setName('Password')
      .setDesc('Set project private')
      .addText((text) =>
        text
          .setPlaceholder("")
          .setValue(this.password)
          .onChange(txt => {
            this.password = txt;
            log.info('password changed: ', this.password);
          })
      );
    new Setting(formContainer)
      .addButton((button) => {
        button.setButtonText('cancel');
        button.onClick(async () => {
          // this.plugin.settings.password = this.newPassword;
          // await this.plugin.saveSettings();
          // new Notice(t("modal_password_notice"));
          if (this.confirmCB) {
            this.confirmCB(null, 'cancel');
          }
          this.close();
        });
      })
      .addButton((button) => {
        button.setClass("password-second-confirm");
        button.setButtonText('Confirm');
        button.onClick(async () => {
          button.disabled = true;
          // setup loading
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

          await this.createProject()
            .then(project => {
              loadingContainer.innerHTML = null;
              button.disabled = false;
              if (project?.slugError) {
                this.slugError = project.slugError;
                log.error('slug error: ', this.slugError);
                new Notice(this.slugError, 3500);
                return;
              }
              if (this.confirmCB) {
                this.confirmCB(project);
                new Notice(`Project created - ${project.name}`, 3500);
              }
              this.close();
            })
            .catch(err => {
              log.error('create project failed: ', JSON.stringify(err));
              loadingContainer.innerHTML = null;
              button.disabled = false;
              // TODO: Show error info
              new Notice(err?.message, 3500);
              return err;
            })
        });
      });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
