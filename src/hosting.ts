import InvioPlugin from "./main";
import { InvioPluginSettings, S3Config } from "./baseTypes";
import { log } from './moreOnLog';
import { CreateProjectModal } from './components/CreateProjectModal';
import Utils from './utils';
import { HostServerUrl } from './remoteForS3';

// Check hosting service
export const checkRemoteHosting = async (plugin: InvioPlugin, dirname?: string) => {
  const dir = dirname || plugin.settings.localWatchDir;
  if (!dir) {
    return false;
  }
  const token = plugin.settings.hostConfig?.token;
  if (!token) {
    throw new Error('NoAuth');
  }
  return fetch(`${HostServerUrl}/api/invio?priatoken=${token}`)
      .then(resp => resp.json())
      .then(resp => {
          console.log('projects: ', resp);
          const matched = resp?.find((p: any) => p.name === dir);
          if (matched) {
              return matched;
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
  const existed = await checkRemoteHosting(plugin, dirname);
  if (existed) {
    const { name, slug, endpoint, region, bucket } = existed;
    settings.hostConfig.hostPair = {
      dir: name,
      slug,
    }

    Object.assign(plugin.settings.s3, {
      s3Endpoint: endpoint,
      s3Region: region,
      s3BucketName: bucket,
      s3AccessKeyID: '',
      s3SecretAccessKey: ''
    });

    await plugin.saveSettings();
    return name;
  }
  const name = await new Promise((resolve, reject) => {
    const cb = async (project: any, err: any) => {
      log.info('project created: ', project, err);
      if (err) {
        reject(err);
      }
      if (!project) {
        // Error
        log.error('create project failed: ', project);
        return;
      }
      settings.hostConfig.hostPair = {
        dir: project?.name,
        slug: project?.slug,
      }
      await plugin.saveSettings();
      resolve(project?.name);
    };
    const modal = new CreateProjectModal(plugin.app, plugin, dirname, dirname, null, cb.bind(plugin));
    modal.open();
  });
  return name;
}

export const switchProject = async (dirname: string, plugin: InvioPlugin) => {
  const settings = plugin.settings;
  if (!settings.useHost) {
    return dirname;
  }
  if (!settings.hostConfig?.token) {
    // goto auth
    return Utils.gotoAuth();
  }

  if (settings.hostConfig?.hostPair?.dir === dirname) {
    // no need to update hosting config
    // Maybe need recheck remote
    return dirname;
  }
  
  return syncWithRemoteProject(dirname, plugin);
}