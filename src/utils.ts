// import fse from 'fs-extra';
import path from 'path';
import { requestUrl } from 'obsidian';
import { app, BrowserWindow, BrowserWindowConstructorOptions, dialog, MessageBoxOptions, screen, shell } from 'electron';
import { machineId } from 'node-machine-id';
import os from 'os';
import { createHash } from 'crypto';
import { v4 } from 'uuid';
import { AppHostServerUrl } from './remoteForS3';
import { loadGA } from './ga';
import type InvioPlugin from './main';
import { DEFAULT_DIR, DEFAULT_FILE_URL } from './settings';
import { mkdirpInVault } from './misc'

const logger = console;
logger.info = console.log;

// import Trace from './trace';
const CONFIG_FILE_NAME = '.fp.config.json';

const getAppDataDir = () => {
    return app.getPath('userData');
}

const getAppPath = () => {
    return app.getAppPath();
}

const getFileIcon = async () => {
    return app.getFileIcon(app.getAppPath(), {
        size: 'normal'
    });
}

function hash(str: string) {
    return createHash('sha256').update(str).digest('hex');
}

function md5Hash(str: string) {
    return createHash('md5').update(str).digest('hex');
}

const getMachineId = async () => {
    const id = await machineId();
    logger.info('get machine id: ', id);
    return id;
}

const getUserId = (original: boolean) => {
    try {
        const username = os.userInfo().username;
        if (username) {
            return original ? username : hash(username);
        }
        throw new Error('get os username failed');
    } catch (error: any) {
        logger.error(error?.message);
        return 'rand' + v4();
    }
}

const showNotification = async (opt: MessageBoxOptions) => {
    const { response, checkboxChecked } = await dialog.showMessageBox(opt);
    logger.log('dialog response: ', response, checkboxChecked);
    return { response, checkboxChecked };
}

// let traceInstance: any;
// const getTracert = () => {
//     if (!traceInstance){
//         traceInstance = new Trace();
//     }
//     return traceInstance;
// }

const gotoAuth = (url?: string) => {
    (window as any).electron.remote.shell.openExternal(url || `${AppHostServerUrl}/exporter`);
    const ga = loadGA();
    ga?.trace('use_host_login');
}

const gotoMainSite = () => {
    (window as any).electron.remote.shell.openExternal(AppHostServerUrl);
}

const mockLocaleFile = async (plugin:InvioPlugin) => {
    let defaultFolder = DEFAULT_DIR
    const existed = await plugin.app.vault.adapter.exists(defaultFolder)
    if (existed) {
        defaultFolder += `_${Math.random().toFixed(4).slice(2)}`
    }
    plugin.app.vault.adapter.mkdir(defaultFolder)
    .then(() => {
        plugin.settings.localWatchDir = defaultFolder
        return plugin.saveSettings()
    })
    .then(() => {
        plugin.ga.trace('boot_project', {
            dirname: plugin.settings.localWatchDir
        });
        plugin.switchWorkingDir(plugin.settings.localWatchDir);
    })
    .then(async () => {
      // Add a new file
      const arrayBuffer = await requestUrl({
        url: DEFAULT_FILE_URL
      }).then(resp => resp.arrayBuffer)
      return plugin.app.vault.adapter.writeBinary(`${defaultFolder}/Introduction.md`, arrayBuffer)
    })
    .then(async () => {
        const created = await plugin.app.vault.adapter.exists(`${defaultFolder}/Introduction.md`);
        if (created) {
            let parentNode: any = document.querySelector(`[data-path="${defaultFolder}"]`);
            parentNode?.click();
            let node: any = document.querySelector(`[data-path="${defaultFolder}/Introduction.md"]`);
            node?.click();
        }
    })
}
const Utils = {
    md5Hash,
    getAppPath,
    getAppDataDir,
    getFileIcon,
    getMachineId,
    getUserId,
    showNotification,
    gotoAuth,
    gotoMainSite,
    mockLocaleFile,
    // getTracert
};

export default Utils;