import { html_beautify } from "js-beautify";
import { TFile } from "obsidian";
import { Path } from "src/utils/path";
import { InvioSettingTab } from "src/settings";
import { HTMLGenerator } from "./html-generator";
import { Downloadable } from "src/utils/downloadable";

export class ExportFile
{
	/**
	 * The original markdown file to export.
	 */
	public markdownFile: TFile;

	/**
	 * The absolute path to the FOLDER we are exporting to
	 */
	public exportToFolder: Path;

	/**
	 * The relative path from the vault root to the FOLDER being exported
	 */
	public exportedFolder: Path;

	/**
	 * Is this file part of a batch export, or is it being exported independently?
	 */
	public partOfBatch: boolean;

	/**
	 * The name of the file being exported, with the .html extension
	 */
	public name: string;

	/**
	 * The relative path from the export folder to the file being exported; includes the file name and extension.
	 */
	public exportPath: Path;

	/**
	 * The document to use to generate the HTML.
	 */
	public document: Document;

	/**
	 * The external files that need to be downloaded for this file to work including the file itself.
	 */
	public downloads: Downloadable[] = [];

	/**
	 * Same as downloads but does not include the file itself.
	 */
	public externalDownloads: Downloadable[] = [];


	/**
	 * @param file The original markdown file to export
	 * @param exportToFolder The absolute path to the FOLDER we are exporting to
	 * @param exportFromFolder The relative path from the vault root to the FOLDER being exported
	 * @param partOfBatch Is this file part of a batch export, or is it being exported independently?
	 * @param fileName The name of the file being exported, with the .html extension
	 * @param forceExportToRoot Force the file to be saved directly int eh export folder rather than in it's subfolder.
	 */
	constructor(file: TFile, exportToFolder: Path, exportFromFolder: Path, partOfBatch: boolean, fileName: string = "", forceExportToRoot: boolean = false)
	{
		if(exportToFolder.isFile || !exportToFolder.isAbsolute) throw new Error("exportToFolder must be an absolute path to a folder: " + exportToFolder.asString);
		if(!fileName.endsWith(".html")) throw new Error("fileName must be a .html file: " + fileName);

		this.markdownFile = file;
		this.exportToFolder = exportToFolder;
		this.exportedFolder = exportFromFolder;
		this.partOfBatch = partOfBatch;

		this.name = (fileName === "" ? (file.basename + ".html") : fileName);
		let parentPath = file.parent.path;
		if (parentPath.trim() == "/" || parentPath.trim() == "\\") parentPath = "";
		this.exportPath = Path.joinStrings(parentPath, this.name);
		if (forceExportToRoot) this.exportPath.reparse(this.name);
		this.exportPath.setWorkingDirectory(this.exportToFolder.asString);

		if (InvioSettingTab.settings.makeNamesWebStyle)
		{
			this.name = Path.toWebStyle(this.name);
			this.exportPath.makeWebStyle();
		}

		this.document = document.implementation.createHTMLDocument(this.markdownFile.basename);
	}

	static getRemoteFileKey(file: TFile, exportToFolder: Path, fileName: string = "", forceExportToRoot: boolean = false) {
		if(exportToFolder.isFile || !exportToFolder.isAbsolute) throw new Error("exportToFolder must be an absolute path to a folder: " + exportToFolder.asString);

		const name = (fileName === "" ? (file.basename + ".html") : fileName);
		let parentPath = file.parent.path;
		if (parentPath.trim() == "/" || parentPath.trim() == "\\") parentPath = "";
		const exportPath = Path.joinStrings(parentPath, name);
		if (forceExportToRoot) exportPath.reparse(name);
		exportPath.setWorkingDirectory(exportToFolder.asString);

		if (InvioSettingTab.settings.makeNamesWebStyle) {
			exportPath.makeWebStyle();
		}
		console.log('get export remote file key: ', exportPath);
		return exportPath.asString;
	}

	/**
	 * The HTML string for the file
	 */
	get html(): string
	{
		let htmlString = "<!DOCTYPE html>\n" + this.document.documentElement.outerHTML;
		if (InvioSettingTab.settings.beautifyHTML) htmlString = html_beautify(htmlString, { indent_size: 2 });
		return htmlString;
	}

	/**
	 * The element that contains the content of the document, aka the markdown-preview-view
	 */
	get contentElement(): HTMLElement
	{
		return this.document.querySelector(".markdown-preview-view") as HTMLElement;
	}

	/**
	 * The element that determines the size of the document, aka the markdown-preview-sizer
	 */
	get sizerElement(): HTMLElement
	{
		return this.document.querySelector(".markdown-preview-sizer") as HTMLElement;
	}

	/**
	 * The absolute path that the file will be saved to
	 */
	get exportPathAbsolute(): Path
	{
		return this.exportToFolder.join(this.exportPath);
	}

	get remoteFileKey(): string
	{
		return this.exportPath.asString;
	}

	/**
	 * The relative path from exportPath to rootFolder
	 */
	get pathToRoot(): Path
	{
		return Path.getRelativePath(this.exportPath, new Path(this.exportPath.workingDirectory), true).makeUnixStyle();
	}

	/**
	 * Returns a downloadable object to download the .html file to the current path with the current html contents.
	 */
	public getSelfDownloadable(): Downloadable
	{
		return new Downloadable(this.name, this.html, this.exportPath.directory.makeForceFolder());
	}
}