import InvioPlugin from "./main";
import { grabManifestJsonFromRepository, grabReleaseFileFromRepository } from "./utils/githubUtils";
import { normalizePath, PluginManifest, Notice, requireApiVersion, apiVersion } from "obsidian";
import { isConnectedToInternet } from "./utils/internetconnection";
import { log } from './moreOnLog'
import { GITHUB_PATH } from "./constants";
/**
 * all the files needed for a plugin based on the release files are hre
 */
interface ReleaseFiles {
    mainJs:     string | null;
    manifest:   string | null;
    styles:     string | null;
}

interface UpdateInfo {
    currentVersion: string | null;
    updateVersion: string | null;
}

const ToastMessage = (plugin: InvioPlugin, msg: string, number: number) => {
    new Notice(msg, number)
}

const CheckInterval = 1000 * 60 * 60 * 24;
/**
 * Primary handler for adding, updating, deleting beta plugins tracked by this plugin
 */
export default class AutoUpdater {
    plugin: InvioPlugin;
    githubPath: string;
    timer: NodeJS.Timer;
    updateInfo: UpdateInfo;

    constructor(plugin: InvioPlugin, path?: string) {
        this.plugin = plugin;
        this.githubPath = path || GITHUB_PATH;
        this.timer = null;
        this.updateInfo = null;
    }

    /**
     * Validates that a GitHub repository is plugin
     *
     * @param   {string}                     repositoryPath   GithubUser/RepositoryName (example: TfThacker/obsidian42-brat)
     * @param   {[type]}                     getBetaManifest  test the beta version of the manifest, not at the root
     * @param   {[type]}                     false            [false description]
     *
     * @return  {Promise<PluginManifest>}                     the manifest file if found, or null if its incomplete
     */
    async validateRepository(repositoryPath: string, getBetaManifest = false): Promise<PluginManifest|null> {
        const manifestJson = await grabManifestJsonFromRepository(repositoryPath, !getBetaManifest, false);
        if (!manifestJson) { // this is a plugin with a manifest json, try to see if there is a beta version
            return null;
        }
        // Test that the mainfest has some key elements, like ID and version
        if (!("id" in manifestJson)) { // this is a plugin with a manifest json, try to see if there is a beta version
            return null;
        }
        if (!("version" in manifestJson)) { // this is a plugin with a manifest json, try to see if there is a beta version
            return null;
        }
        return manifestJson;
    }

    /**
     * Gets all the release files based on the version number in the manifest
     *
     * @param   {string}                        repositoryPath  path to the GitHub repository
     * @param   {PluginManifest<ReleaseFiles>}  manifest        manifest file
     * @param   {boolean}                       getManifest     grab the remote manifest file
     * @param   {string}                        specifyVersion  grab the specified version if set
     *
     * @return  {Promise<ReleaseFiles>}                         all relase files as strings based on the ReleaseFiles interaface
     */
    async getAllReleaseFiles(repositoryPath: string, manifest: PluginManifest, getManifest: boolean, specifyVersion = ""): Promise<ReleaseFiles> {
        const version = specifyVersion === "" ? manifest.version : specifyVersion;

        // if we have version specified, we always want to get the remote manifest file.
        const reallyGetManifestOrNot = getManifest || (specifyVersion !== "");

        return {
            mainJs: await grabReleaseFileFromRepository(repositoryPath, version, "main.js"),
            manifest: reallyGetManifestOrNot ? await grabReleaseFileFromRepository(repositoryPath, version, "manifest.json") : "",
            styles: await grabReleaseFileFromRepository(repositoryPath, version, "styles.css")
        }
    }

    /**
     * Writes the plugin release files to the local obsidian .plugins folder
     *
     * @param   {string}              betaPluginID  the id of the plugin (not the repository path)
     * @param   {ReleaseFiles<void>}  relFiles      release file as strings, based on the ReleaseFiles interface
     *
     * @return  {Promise<void>}                     
     */
    async writeReleaseFilesToPluginFolder(betaPluginID: string, relFiles: ReleaseFiles): Promise<void> {
        const pluginTargetFolderPath = normalizePath(this.plugin.app.vault.configDir + "/plugins/" + betaPluginID) + "/";
        const adapter = this.plugin.app.vault.adapter;
        if (await adapter.exists(pluginTargetFolderPath) === false ||
            !(await adapter.exists(pluginTargetFolderPath + "manifest.json"))) {
            // if plugin folder doesnt exist or manifest.json doesn't exist, create it and save the plugin files
            await adapter.mkdir(pluginTargetFolderPath);
        }
        await adapter.write(pluginTargetFolderPath + "main.js", relFiles.mainJs!);
        await adapter.write(pluginTargetFolderPath + "manifest.json", relFiles.manifest!);
        if (relFiles.styles) await adapter.write(pluginTargetFolderPath + "styles.css", relFiles.styles);
    }

    autoUpdate(hook?: (info: UpdateInfo) => void) {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.timer = setInterval(async () => {
            if (this.updateInfo?.updateVersion) {
                this.timer && clearInterval(this.timer)
                return;
            }
            const info = await this.update(true)
            if (typeof info === 'boolean') {
                return;
            }
            if (info?.updateVersion) {
                this.timer && clearInterval(this.timer);
                this.updateInfo = info;
                hook && hook(this.updateInfo)
            }
        }, CheckInterval)
    }
    async update(seeIfUpdatedOnly = false, specifyVersion = "") {
        if (seeIfUpdatedOnly && this.updateInfo?.updateVersion) {
            return this.updateInfo;
        }
        const resp = await this.updatePlugin(this.githubPath, seeIfUpdatedOnly, specifyVersion);
        if (resp && (typeof resp !== 'boolean')) {
            this.updateInfo = resp;
        }
        return resp;
    }
    /**
     * Primary function for adding a new beta plugin to Obsidian. 
     * Also this function is used for updating existing plugins.
     *
     * @param   {string}              repositoryPath     path to GitHub repository formated as USERNAME/repository
     * @param   {boolean}             seeIfUpdatedOnly   if true, will just check for updates, but not do the update. will report to user that there is a new plugin
     * @param   {string}              specifyVersion     if not empty, need to install a specified version instead of the value in manifest{-beta}.json
     *
     * @return  {Promise<UpdateInfo|boolean>}                       true if succeeds
     */
    async updatePlugin(repositoryPath: string, seeIfUpdatedOnly = false, specifyVersion = ""): Promise<UpdateInfo|boolean> {
        // @ts-ignore
        // const forceReinstall = this.plugin.app.plugins.enabledPlugins.has('invio')
        const noticeTimeout = 10;
        let primaryManifest = await this.validateRepository(repositoryPath, true); // attempt to get manifest-beta.json
        const usingBetaManifest: boolean = primaryManifest ? true : false;
        if (usingBetaManifest === false)
            primaryManifest = await this.validateRepository(repositoryPath, false); // attempt to get manifest.json

        if (primaryManifest === null) {
            const msg = `${repositoryPath}\nA manifest.json or manifest-beta.json file does not exist in the root directory of the repository. This plugin cannot be installed.`;
            log.info(msg, true);
            ToastMessage(this.plugin, `${msg}`, noticeTimeout);
            return false;
        }

        if (!primaryManifest.hasOwnProperty('version')) {
            const msg = `${repositoryPath}\nThe manifest${usingBetaManifest ? "-beta" : ""}.json file in the root directory of the repository does not have a version number in the file. This plugin cannot be installed.`;
            log.info(msg, true);
            ToastMessage(this.plugin, `${msg}`, noticeTimeout);
            return false;
        }

        // Check manifest minAppVersion and current version of Obisidan, don't load plugin if not compatible
        if(primaryManifest.hasOwnProperty('minAppVersion')) { 
            if( !requireApiVersion(primaryManifest.minAppVersion) ) {
                const msg = `Plugin: ${repositoryPath}\n\n`+
                            `The manifest${usingBetaManifest ? "-beta" : ""}.json for this plugin indicates that the Obsidian ` +
                            `version of the app needs to be ${primaryManifest.minAppVersion}, ` +
                            `but this installation of Obsidian is ${apiVersion}. \n\nYou will need to update your ` +
                            `Obsidian to use this plugin or contact the plugin developer for more information.`;
                log.info(msg, true);
                new Notice(`${msg}`, 30);
                return false;    
            }
        }

        const getRelease = async () => { 
            
            const rFiles = await this.getAllReleaseFiles(repositoryPath, primaryManifest as PluginManifest, usingBetaManifest, specifyVersion);
            if (usingBetaManifest || rFiles.manifest === "")  //if beta, use that manifest, or if there is no manifest in release, use the primaryManifest
                rFiles.manifest = JSON.stringify(primaryManifest);

            if (rFiles.mainJs === null) {
                const msg = `${repositoryPath}\nThe release is not complete and cannot be download. main.js is missing from the Release`;
                log.info(msg, true);
                ToastMessage(this.plugin, `${msg}`, noticeTimeout);
                return null;
            }
            return rFiles;
        }

        // test if the plugin needs to be updated
        // if a specified version is provided, then we shall skip the update
        const pluginTargetFolderPath = this.plugin.app.vault.configDir + "/plugins/" + primaryManifest.id + "/";
        let localManifestContents = "";
        try {
            localManifestContents = await this.plugin.app.vault.adapter.read(pluginTargetFolderPath + "manifest.json")
        } catch (e) {
            if (e.errno === -4058 || e.errno === -2) { // file does not exist, try installing the plugin
                await this.updatePlugin(repositoryPath, seeIfUpdatedOnly, specifyVersion);
                return true; // even though failed, return true since install will be attempted
            }
            else {
                console.log("Invio - Local Manifest Load: ", primaryManifest.id, JSON.stringify(e, null, 2));
            }
        }

        const localManifestJSON = await JSON.parse(localManifestContents);
        if (localManifestJSON.version !== primaryManifest.version) { //manifest files are not the same, do an update
            const releaseFiles = await getRelease();
            if (releaseFiles === null) return false;

            if (seeIfUpdatedOnly) { // dont update, just report it
                const msg = `There is an update available for ${primaryManifest.id} from version ${localManifestJSON.version} to ${primaryManifest.version}. `;
                log.info(msg + `[Release Info](https://github.com/${repositoryPath}/releases/tag/${primaryManifest.version})`, false);
                // ToastMessage(this.plugin, msg, 30, async () => { window.open(`https://github.com/${repositoryPath}/releases/tag/${primaryManifest!.version}`)});
                return {
                    currentVersion: localManifestJSON.version,
                    updateVersion: primaryManifest.version
                }
            } else {
                await this.writeReleaseFilesToPluginFolder(primaryManifest.id, releaseFiles);
                //@ts-ignore
                await this.plugin.app.plugins.loadManifests();
                this.updateInfo = null; // Clear update cached info
                //@ts-ignore
                if (this.plugin.app.plugins.plugins[primaryManifest.id]?.manifest) await this.reloadPlugin(primaryManifest.id); //reload if enabled
                const msg = `${primaryManifest.id}\nPlugin has been updated from version ${localManifestJSON.version} to ${primaryManifest.version}. `;
                log.info(msg + `[Release Info](https://github.com/${repositoryPath}/releases/tag/${primaryManifest.version})`, false);
                // ToastMessage(this.plugin, msg, 30, async () => { window.open(`https://github.com/${repositoryPath}/releases/tag/${primaryManifest!.version}`) } );
            }
        } else {
            log.info(`No update available for ${repositoryPath}`)
        }
        return true;
    }

    /**
     * reloads a plugin (assuming it has been enabled by user)
     * pjeby, Thanks Bro https://github.com/pjeby/hot-reload/blob/master/main.js
     * 
     * @param   {string<void>}   pluginName  name of plugin
     *
     * @return  {Promise<void>}              
     */
    async reloadPlugin(pluginName: string): Promise<void> {
        // @ts-ignore
        const plugins = this.plugin.app.plugins;
        try {
            // @ts-ignore
            await plugins.disablePlugin(pluginName);
            // @ts-ignore
            await plugins.enablePlugin(pluginName);
        } catch (e) { 
            console.error("reload invio: ", e);
        }
    }
}