// import fse from 'fs-extra';
import path from 'path';
import { app, BrowserWindow, BrowserWindowConstructorOptions, dialog, MessageBoxOptions, screen, shell } from 'electron';
import { machineId } from 'node-machine-id';
import os from 'os';
import { createHash } from 'crypto';
import { v4 } from 'uuid';

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


const Utils = {
    md5Hash,
    getAppPath,
    getAppDataDir,
    getFileIcon,
    getMachineId,
    getUserId,
    showNotification,
    // getTracert
};

export default Utils;