import {  MarkdownView, PluginManifest, TFile, TFolder, TextFileView, Vault } from 'obsidian';
import { InvioSettingTab } from '../settings';
import { Path } from './path';
import { RenderLog } from '../html-generation/render-log';
import { Downloadable } from './downloadable';
import InvioPlugin from 'src/main';

/* @ts-ignore */
const dialog: Electron.Dialog = require('electron').remote.dialog;

export class Utils
{
	static padStringBeggining(str: string, length: number, char: string)
	{
		return char.repeat(length - str.length) + str;
	}

	static sampleCSSColorHex(variable: string, testParentEl: HTMLElement): { a: number, hex: string }
	{
		let testEl = document.createElement('div');
		testEl.style.setProperty('display', 'none');
		testEl.style.setProperty('color', 'var(' + variable + ')');
		testParentEl.appendChild(testEl);

		let col = getComputedStyle(testEl).color;
		let opacity = getComputedStyle(testEl).opacity;

		testEl.remove();

		function toColorObject(str: string)
		{
			var match = str.match(/rgb?\((\d+),\s*(\d+),\s*(\d+)\)/);
			return match ? {
				red: parseInt(match[1]),
				green: parseInt(match[2]),
				blue: parseInt(match[3]),
				alpha: 1
			} : null
		}

		var color = toColorObject(col), alpha = parseFloat(opacity);
		return isNaN(alpha) && (alpha = 1),
		color ? {
			a: alpha * color.alpha,
			hex: Utils.padStringBeggining(color.red.toString(16), 2, "0") + Utils.padStringBeggining(color.green.toString(16), 2, "0") + Utils.padStringBeggining(color.blue.toString(16), 2, "0")
		} : {
			a: alpha,
			hex: "ffffff"
		}
	};

	static async changeViewMode(view: MarkdownView, modeName: "preview" | "source")
	{
		/*@ts-ignore*/
		const mode = view.modes[modeName]; 
		/*@ts-ignore*/
		mode && await view.setMode(mode);
	};

	static async showSaveDialog(plugin: any, defaultPath: Path, defaultFileName: string, showAllFilesOption: boolean = true): Promise<Path | undefined>
	{
		// get paths
		let absoluteDefaultPath = defaultPath.directory.absolute().joinString(defaultFileName);
		
		// add filters
		let filters = [{
			name: Utils.trimStart(absoluteDefaultPath.extenstion, ".").toUpperCase() + " Files",
			extensions: [Utils.trimStart(absoluteDefaultPath.extenstion, ".")]
		}];

		if (showAllFilesOption)
		{
			filters.push({
				name: "All Files",
				extensions: ["*"]
			});
		}

		// show picker
		let picker = await dialog.showSaveDialog({
			defaultPath: absoluteDefaultPath.asString,
			filters: filters,
			properties: ["showOverwriteConfirmation"]
		})

		if (picker.canceled) return undefined;
		
		let pickedPath = new Path(picker.filePath);
		InvioSettingTab.settings.lastExportPath = pickedPath.asString;
		InvioSettingTab.saveSettings(plugin);
		
		return pickedPath;
	}

	static async showSelectFolderDialog(plugin: any, defaultPath: Path): Promise<Path | undefined>
	{
		if(!defaultPath.exists) defaultPath = Path.vaultPath;

		// show picker
		let picker = await dialog.showOpenDialog({
			defaultPath: defaultPath.directory.asString,
			properties: ["openDirectory"]
		});

		if (picker.canceled) return undefined;

		let path = new Path(picker.filePaths[0]);
		InvioSettingTab.settings.lastExportPath = path.directory.asString;
		InvioSettingTab.saveSettings(plugin);

		return path;
	}

	static idealDefaultPath() : Path
	{
		let lastPath = new Path(InvioSettingTab.settings.lastExportPath);

		if (lastPath.asString != "" && lastPath.exists)
		{
			return lastPath.directory;
		}

		return Path.vaultPath;
	}

	static async downloadFiles(files: Downloadable[], folderPath: Path)
	{
		if (!folderPath.isAbsolute) throw new Error("folderPath must be absolute: " + folderPath.asString);

		RenderLog.progress(0, files.length, "Saving HTML files to disk", "...", "var(--color-green)")
		
		for (let i = 0; i < files.length; i++)
		{
			let file = files[i];

			try
			{
				await file.download(folderPath.directory);
				RenderLog.progress(i+1, files.length, "Saving HTML files to disk", "Saving: " + file.filename, "var(--color-green)");
			}
			catch (e)
			{
				RenderLog.error("Could not save file: " + file.filename, e.stack);
				continue;
			}
		}
		
	}


	static async appendFile(vault: Vault, filePath: string, mdString: string) {
		await vault.adapter.append(filePath, mdString);
	}

	static async openFile(vault: Vault, filePath: string) {
		const file = vault.getAbstractFileByPath(filePath);
		if (!file) {
			return 'Deleted';
		}
		if (file instanceof TFile) {
			await app.workspace.getLeaf(false).openFile(file)
			return 'Done'
		}
		return 'NotFile'
	}

	//async function that awaits until a condition is met
	static async waitUntil(condition: () => boolean, timeout: number = 1000, interval: number = 100): Promise<boolean>
	{
		return new Promise((resolve, reject) => {
			let timer = 0;
			let intervalId = setInterval(() => {
				if (condition()) {
					clearInterval(intervalId);
					resolve(true);
				} else {
					timer += interval;
					if (timer >= timeout) {
						clearInterval(intervalId);
						resolve(false);
					}
				}
			}, interval);
		});
	}

	static getPluginIDs(): string[]
	{
		/*@ts-ignore*/
		let pluginsArray: string[] = Array.from(app.plugins.enabledPlugins.values()) as string[];
		for (let i = 0; i < pluginsArray.length; i++)
		{
			/*@ts-ignore*/
			if (app.plugins.manifests[pluginsArray[i]] == undefined)
			{
				pluginsArray.splice(i, 1);
				i--;
			}
		}

		return pluginsArray;
	}

	static getPluginManifest(pluginID: string): PluginManifest | null
	{
		// @ts-ignore
		return app.plugins.manifests[pluginID] ?? null;
	}

	static getActiveTextView(): TextFileView | null
	{
		let view = app.workspace.getActiveViewOfType(TextFileView);
		if (!view)
		{
			return null;
		}

		return view;
	}

	static trimEnd(inputString: string, trimString: string): string
	{
		if (inputString.endsWith(trimString))
		{
			return inputString.substring(0, inputString.length - trimString.length);
		}

		return inputString;
	}

	static trimStart(inputString: string, trimString: string): string
	{
		if (inputString.startsWith(trimString))
		{
			return inputString.substring(trimString.length);
		}

		return inputString;
	}

	static getRootFolderList(plugin: InvioPlugin) {
		const list = plugin.app.vault.getRoot().children;
		return list.filter(fileOrFolder => (fileOrFolder instanceof TFolder)).map(folder => folder.path)
	}
}
