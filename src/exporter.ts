// imports from obsidian API
import { MarkdownView, Notice, TFile, TFolder } from 'obsidian';

// modules that are part of the plugin
import { InvioSettingTab } from './settings';
import { Utils } from './utils/utils';
import { HTMLGenerator } from './html-generation/html-generator';
import { Path } from './utils/path';
import { ExportFile } from './html-generation/export-file';
import { AssetHandler } from './html-generation/asset-handler';
import { RenderLog } from './html-generation/render-log';
import { Downloadable } from './utils/downloadable';
import { log } from "./moreOnLog";
import { RemoteClient } from "./remote";

export const exportFile = async (file: TFile, exportFromPath: Path, partOfBatch = false, exportToPath: Path | undefined = undefined, rootPath: Path | undefined) : Promise<ExportFile | undefined> => {
    if(file.extension != "md")
    {
        new Notice(`❗ Unfortunately exporting ${file.extension.replace(/\./igm, "")} files is not supported yet.`, 7000);
        return undefined;
    }

    // if no export path is specified, show a save dialog
    if (exportToPath === undefined) 
    {
        // TODO: Throw an error
        return undefined;
    }

    if (!partOfBatch)
    {
        // if we are starting a new export then begin a new batch
        await HTMLGenerator.beginBatch([]);
        RenderLog.progress(1, 2, "Generating HTML", "Exporting: " + file.path);
    }

    // the !partOfBatch is passed to forceExportToRoot. 
    // If this is a single file export then export it to the folder specified rather than into it's subfolder.
    let exportedFile = null;
    try
    {
        exportedFile = new ExportFile(file, exportToPath.directory.absolute(), exportFromPath.directory, partOfBatch, exportToPath.fullName, false);
        await HTMLGenerator.generateWebpage(exportedFile, rootPath);
    }
    catch (e)
    {
        if(!partOfBatch)
        {
            RenderLog.error("Could not export file: " + file.name, e.stack, true);
        }

        throw e;
    }

    if(!partOfBatch) 
    {
        // file downloads are handled outside of the export function if we are exporting a batch.
        // If this is not a batch export, then we need to download the files here instead.
        await Utils.downloadFiles(exportedFile.downloads, exportToPath.directory);
        new Notice("✅ Finished HTML Export:\n\n" + exportToPath.asString, 5000);
        HTMLGenerator.endBatch();
    }

    return exportedFile;
}

const openPath = async (path: Path) => {
	// @ts-ignore
	await window.electron.remote.shell.openPath(path.asString);
}

const openUrl = async (url: string) => {
    // @ts-ignore
    await window.electron.remote.shell.openExternal(url);

}

// Publish list of files
export const publishFiles = async (
    client: RemoteClient,
    vault: any,
    pathList: string[],
    allFiles: TFile[],
    password: string = "",
    settings: any,
    triggerSource: string,
    cb?: (key: string, status: 'START' | 'DONE' | 'FAIL', meta?: any) => any,
) => {
    const htmlPath = AssetHandler.initHtmlPath();

    if (allFiles.length > 100000 || allFiles.length <= 0)
    {
        new Notice(`❗Invalid number of files to export: ${allFiles.length}.`, 0);
        return {success: false, exportedPath: htmlPath, fileNumber: allFiles.length};
    }

    log.info('start publishing file list: ', pathList);
    if (!pathList || (pathList.length === 0)) {
        return {
            success: true,
        }
    }
    // await HTMLGenerator.beginBatch(allFiles);
    // RenderLog.progress(0, allFiles.length, "Exporting Docs", "...", "var(--color-accent)");
    let externalFiles: Downloadable[] = [];
    let toUploads: any[] = [];

    let i = 0;
    for (const path of pathList) {
        const file = vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile)) {
            log.error('file path not found: ', path);
            return;
        }
        log.info('html path: ', htmlPath, file);
        const htmlFilePath = htmlPath.joinString(file.name).setExtension("html");
        // RenderLog.progress(i++, path.length, "Exporting Docs", "Exporting: " + file.path, "var(--color-accent)");
        const exportedFile = await exportFile(file, new Path(path), true, htmlFilePath, new Path(settings.localWatchDir));
        if (exportedFile) {
            toUploads.push(...exportedFile.downloads.map(d => {
                const afterPath = exportedFile.exportToFolder.join(d.relativeDownloadPath);
                const fileKey = (d.relativeDownloadPath.asString + '/' + d.filename).replace(/^\.\//, '');
    
                const mdFilePreStr = file.path.replace(file.extension, '');
                return {
                    md: fileKey.startsWith(mdFilePreStr) ? file.path : undefined,
                    path: afterPath.asString + '/' + d.filename,
                    key: fileKey,
                }
            }));
            log.info('download list: ', exportedFile.downloads);
            log.info('to upload list: ', toUploads);

            externalFiles.push(...exportedFile.downloads);
        }
    }


    
    externalFiles = externalFiles.filter((file, index) => externalFiles.findIndex((f) => f.relativeDownloadPath == file.relativeDownloadPath && f.filename === file.filename) == index);
    await Utils.downloadFiles(externalFiles, htmlPath);
    log.info('download files to: ', htmlPath, externalFiles);

    await sleep(200);

    try {
        RenderLog.progress(0, toUploads.length, "Uploading Docs", "...", "var(--color-accent)");

        const resPromise = toUploads.map((upload, i) => {
            const htmlFileRelPath = Path.getRelativePathFromVault(new Path(upload.path), true).asString;
            log.info('rel path: ', htmlFileRelPath);
            if (cb) {
                if (upload.md) {
                    const skip = cb(upload.md, 'START');
                    if (skip) return;
                }
            }
            return client.uploadToRemote(
                htmlFileRelPath,
                '',
                vault,
                false,
                '',
                '',
                undefined,
                false,
                '',
                upload.key
            ).then((resp) => {
                RenderLog.progress(i++, toUploads.length, "Uploading Docs", "Upload success: " + upload.key, "var(--color-accent)");
                if (cb && upload.md) {
                    cb(upload.md, 'DONE', `https://${settings.s3.s3BucketName}.${settings.s3.s3Endpoint}/${resp?.key}`);
                }
                return resp;
            }).catch(err => {
                if (cb && upload.md) {
                    cb(upload.md, 'FAIL');
                }
            })
        })

        await Promise.all(resPromise).then(result => {
            log.info('upload to remote result: ', result);
            RenderLog.progress(toUploads.length, toUploads.length, "Uploading Docs", "Uploading Done: ", "var(--color-accent)");
            HTMLGenerator.endBatch();

            const bucket = settings.s3.s3BucketName;
            const urls = result.map(record => `https://${bucket}.${settings.s3.s3Endpoint}/${record?.key}`)
            log.info('url list: ', urls);
            if (InvioSettingTab.settings.openAfterExport && (triggerSource === 'manual')) {
                // openPath(exportedFile.exportPathAbsolute);
                urls.forEach(url => {
                    if (url.endsWith('.html')) {
                        openUrl(url);
                    }
                })
            }
        })
    } catch (error) {
        log.error('exception: ', error);
        HTMLGenerator.endBatch();
    }


}



const getFileFromRemoteKey = (vault: any, filePath: string) => {
    // TODO: Support more powerful file resove algorithm
    const remotePath = new Path(filePath).setExtension('html');
    log.info('remote path: ', filePath, remotePath);
    return remotePath.asString;
    // const file = vault.getAbstractFileByPath(path);
    // if (!(file instanceof TFile)) {
    //     log.error('file path not found: ', path);
    //     return;
    // }
    // // const path = new Path(path);
    // const htmlPath = AssetHandler.initHtmlPath()
    // log.info('html path: ', htmlPath, file);
    // const exportToPath = htmlPath.joinString(file.name).setExtension("html");

    // const key = ExportFile.getRemoteFileKey(file, exportToPath.directory.absolute(), exportToPath.fullName, false)
    // return key;
}

export const unpublishFile = async (
    client: RemoteClient,
    vault: any,
    path: string,
    cb?: (key: string, status: 'START' | 'DONE' | 'FAIL') => any,
) => {
    const remoteKey = getFileFromRemoteKey(vault, path);
    log.info('deleting.... ', path, remoteKey);
    if (cb) {
        const skip = cb(path, 'START');
        if (skip) return;
    }
    return client.deleteFromRemote(remoteKey, '', '', '')
        .then(resp => {
            if (cb) {
                cb(path, 'DONE');
            }
            return resp;
        })
        .catch(err => {
            if (cb) {
                cb(path, 'FAIL');
            }
        })
}