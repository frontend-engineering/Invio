import InvioPlugin from "./main";
import { InvioPluginSettings, S3Config } from "./baseTypes";
import { log } from './moreOnLog';
import { CreateProjectModal } from './components/CreateProjectModal';
import Utils from './utils';
import { HostServerUrl } from './remote';
import { Notice } from "obsidian";
import type { TransItemType } from "./i18n";
// Check hosting service
export const checkRemoteHosting = async (plugin: InvioPlugin, dirname?: string) => {
  log.info('checking remote host service info: ', dirname);
  const dir = dirname || plugin.settings.localWatchDir;
  if (!dir) {
    return false;
  }
  const token = plugin.settings.hostConfig?.token;
  if (!token) {
    throw new Error('NoAuth');
  }

  const t = (x: TransItemType, vars?: any) => {
    return plugin.i18n?.t(x, vars);
  };

  return fetch(`${HostServerUrl}/api/invio?priatoken=${token}`)
      .then(resp => resp.json())
      .then(resp => {
          const matched = resp?.find((p: any) => p.name === dir);
          if (matched) {
              return matched;
          }
          const matchedCaseInsensitive = resp?.find((p: any) => p.name?.toLowerCase() === dir?.toLowerCase()); // 文件夹大小写不敏感
          if (matchedCaseInsensitive) {
            // TODO: Alert deprecated case.
            new Notice(t('settings_host_dirname_case_conflict'), 5000);
            return matchedCaseInsensitive;
          }
          return null;
      });
}

export const setupS3HostConfig = async (plugin: InvioPlugin, config: Partial<S3Config>) => {
  const settings = plugin.settings;
  if (!settings.useHost) {
    return;
  }

  Object.assign(settings.s3, config);
  await plugin.saveSettings();
}

export const syncWithRemoteProject = async (dirname: string, plugin: InvioPlugin) => {
  const settings = plugin.settings;
  let projectInfo = await checkRemoteHosting(plugin, dirname);
  if (!projectInfo) {
    projectInfo = await new Promise((resolve, reject) => {
      const cb = async (project: any, err?: any) => {
        log.info('project created: ', project, err);
        if (err) {
          reject(err);
          return;
        }
        if (!project) {
          // Error
          log.error('create project failed: ', project);
          reject('Project create failed');
          return;
        }
        return resolve(project);
      };
      const modal = new CreateProjectModal(plugin.app, plugin, dirname, dirname.toLowerCase(), null, cb.bind(plugin));
      modal.open();
    });
  }

  if (!projectInfo) {
    throw new Error('Sync Project Failed');
  }

  const { name, slug, endpoint, region, bucket, useHost: baseDomain } = projectInfo;
  settings.hostConfig.hostPair = {
    dir: name,
    slug,
  }
  settings.hostConfig.credential = null;

  Object.assign(plugin.settings.s3, {
    s3Endpoint: endpoint?.replace(/^https?:\/\//i, ''),
    s3Region: region,
    s3BucketName: bucket,
    s3AccessKeyID: '',
    s3SecretAccessKey: ''
  });

  if (baseDomain) {
    // TODO: Set to localhost for DevMode
    plugin.settings.remoteDomain = `https://${slug}.${baseDomain}`
  }

  await plugin.saveSettings();
  return name;
}

export const switchProject = async (dirname: string, plugin: InvioPlugin) => {
  const settings = plugin.settings;
  if (!settings.useHost) {
    return dirname;
  }
  if (!settings.hostConfig?.token) {
    // goto auth
    Utils.gotoAuth();
    return null;
  }

  log.info('switching project: ', settings.hostConfig);
  if (settings.hostConfig?.hostPair?.dir === dirname) {
    // no need to update hosting config
    // Maybe need recheck remote
    return dirname;
  }
  
  return syncWithRemoteProject(dirname, plugin);
}