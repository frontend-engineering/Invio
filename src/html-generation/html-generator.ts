import { Path } from "../utils/path";
import { InvioSettingTab } from "../settings";
import { GlobalDataGenerator, LinkTree } from "./global-gen";
import { MarkdownRenderer } from "./markdown-renderer";
import { AssetHandler } from "./asset-handler";
import { ExportFile } from "./export-file";
import { Downloadable } from "src/utils/downloadable";
import { TFile } from "obsidian";
import { log } from "../moreOnLog";

const LogoSVG = `<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="svg314096" viewBox="0 0 1024 768" height="768px" width="1024px" version="1.1">
<metadata id="metadata314102">
  <rdf:rdf>
    <cc:work rdf:about="">
      <dc:format>image/svg+xml</dc:format>
      <dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></dc:type>
    </cc:work>
  </rdf:rdf>
</metadata>
<defs id="defs314100"></defs>
<linearGradient spreadMethod="pad" y2="30%" x2="-10%" y1="120%" x1="30%" id="3d_gradient2-logo-a31de0a3-52bf-4afd-a50e-e85d6d052b76">
  <stop id="stop314077" stop-opacity="1" stop-color="#ffffff" offset="0%"></stop>
  <stop id="stop314079" stop-opacity="1" stop-color="#000000" offset="100%"></stop>
</linearGradient>
<linearGradient gradientTransform="rotate(-30)" spreadMethod="pad" y2="30%" x2="-10%" y1="120%" x1="30%" id="3d_gradient3-logo-a31de0a3-52bf-4afd-a50e-e85d6d052b76">
  <stop id="stop314082" stop-opacity="1" stop-color="#ffffff" offset="0%"></stop>
  <stop id="stop314084" stop-opacity="1" stop-color="#cccccc" offset="50%"></stop>
  <stop id="stop314086" stop-opacity="1" stop-color="#000000" offset="100%"></stop>
</linearGradient>
<g id="logo-group">
  <image xlink:href="" id="container" x="272" y="144" width="480" height="480" style="display: none;" transform="translate(0 0)"></image>
  <g id="logo-center" transform="translate(153.4774500000001 0)">
    <image xlink:href="" id="icon_container" x="0" y="0" style="display: none;"></image>
    <g id="slogan" style="font-style:normal;font-weight:300;font-size:32px;line-height:1;font-family:'Montserrat Light Alt1';font-variant-ligatures:none;text-align:center;text-anchor:middle" transform="translate(0 0)"></g>
    <g id="title" style="font-style:normal;font-weight:300;font-size:72px;line-height:1;font-family:'Montserrat Light Alt1';font-variant-ligatures:none;text-align:center;text-anchor:middle" transform="translate(0 0)">
      <path id="path314105" style="font-style:normal;font-weight:300;font-size:72px;line-height:1;font-family:'Montserrat Light Alt1';font-variant-ligatures:none;text-align:center;text-anchor:middle" d="M 416.22931,-50.4 V 0 h 3.672 v -50.4 z" stroke-width="0" stroke-linejoin="miter" stroke-miterlimit="2" fill="#ed3223" stroke="#ed3223" transform="translate(0 353.8) translate(50 -40.35999999999998) scale(2.8) translate(-416.22931 50.4)"></path>
      <path id="path314107" style="font-style:normal;font-weight:300;font-size:72px;line-height:1;font-family:'Montserrat Light Alt1';font-variant-ligatures:none;text-align:center;text-anchor:middle" d="m 478.50369,-50.4 h -3.672 v 43.776 l -34.272,-43.776 h -3.096 V 0 h 3.672 V -43.776 L 475.47969,0 h 3.024 z" stroke-width="0" stroke-linejoin="miter" stroke-miterlimit="2" fill="#b25156" stroke="#b25156" transform="translate(0 353.8) translate(126.25626399999989 -40.35999999999998) scale(2.8) translate(-437.46369 50.4)"></path>
      <path id="path314109" style="font-style:normal;font-weight:300;font-size:72px;line-height:1;font-family:'Montserrat Light Alt1';font-variant-ligatures:none;text-align:center;text-anchor:middle" d="m 535.64919,-50.4 h -3.816 l -20.376,45.648 -20.376,-45.648 h -4.032 l 22.464,50.4 h 3.672 z" stroke-width="0" stroke-linejoin="miter" stroke-miterlimit="2" fill="#777089" stroke="#777089" transform="translate(0 353.8) translate(281.8956639999999 -40.35999999999998) scale(2.8) translate(-487.04919 50.4)"></path>
      <path id="path314111" style="font-style:normal;font-weight:300;font-size:72px;line-height:1;font-family:'Montserrat Light Alt1';font-variant-ligatures:none;text-align:center;text-anchor:middle" d="M 543.77619,-50.4 V 0 h 3.672 v -50.4 z" stroke-width="0" stroke-linejoin="miter" stroke-miterlimit="2" fill="#3b8ebc" stroke="#3b8ebc" transform="translate(0 353.8) translate(457.5312640000001 -40.35999999999998) scale(2.8) translate(-543.77619 50.4)"></path>
      <path id="path314113" style="font-style:normal;font-weight:300;font-size:72px;line-height:1;font-family:'Montserrat Light Alt1';font-variant-ligatures:none;text-align:center;text-anchor:middle" d="m 573.00256,-2.952 c 3.96,2.232 8.424,3.312 13.392,3.312 4.896,0 9.36,-1.08 13.392,-3.312 3.96,-2.16 7.056,-5.256 9.36,-9.144 2.304,-3.888 3.456,-8.208 3.456,-13.104 0,-4.824 -1.152,-9.216 -3.456,-13.104 -2.304,-3.888 -5.4,-6.912 -9.36,-9.144 -4.032,-2.16 -8.496,-3.312 -13.392,-3.312 -4.968,0 -9.432,1.152 -13.392,3.384 -4.032,2.232 -7.128,5.256 -9.432,9.144 -2.304,3.888 -3.384,8.28 -3.384,13.032 0,4.824 1.08,9.144 3.384,13.032 2.304,3.888 5.4,6.984 9.432,9.216 z m 24.84,-2.952 c -3.456,1.944 -7.272,2.88 -11.448,2.88 -4.248,0 -8.064,-0.936 -11.52,-2.88 -3.456,-1.872 -6.12,-4.536 -8.064,-7.92 -2.016,-3.384 -2.952,-7.2 -2.952,-11.376 0,-4.176 0.936,-7.92 2.952,-11.304 1.944,-3.384 4.608,-6.048 8.064,-7.992 3.456,-1.872 7.272,-2.88 11.52,-2.88 4.176,0 7.992,1.008 11.448,2.88 3.384,1.944 6.048,4.608 8.064,7.992 1.944,3.384 2.952,7.128 2.952,11.304 0,4.176 -1.008,7.992 -2.952,11.376 -2.016,3.384 -4.68,6.048 -8.064,7.92 z" stroke-width="0" stroke-linejoin="miter" stroke-miterlimit="2" fill="#00adef" stroke="#00adef" transform="translate(0 353.8) translate(520.2802999999999 -41.36799999999999) scale(2.8) translate(-560.18656 50.76)"></path>
    </g>
    <image xlink:href="" id="icon" x="0" y="0" style="display: none;"></image>
  </g>
</g>
</svg>`;


export interface IMetaConfig {
	title?: string;
	description?: string;
	keywords?: string[];
	icon?: string;
	publish?: boolean;
	permalink?: string;
}

const InheriableMeta: Array<keyof IMetaConfig> = [ 'icon' ];

export class HTMLGenerator {
	//#region Main Generation Functions
	public static async beginBatch(exportingFiles: TFile[]) {
		GlobalDataGenerator.clearGraphCache();
		GlobalDataGenerator.clearFileTreeCache();
		GlobalDataGenerator.getFileTree(exportingFiles);
		await AssetHandler.updateAssetCache();
		await MarkdownRenderer.beginBatch();
	}

	public static endBatch() {
		MarkdownRenderer.endBatch();
	}

	// rootPath is used for collecting context nodes
	public static async generateWebpage(file: ExportFile, rootPath: Path): Promise<ExportFile> {
		await this.getDocumentHTML(file);
		let usingDocument = file.document;

		let sidebars = this.generateSideBars(file.contentElement, file);
		let rightSidebar = sidebars.right;
		let leftSidebar = sidebars.left;
		usingDocument.body.appendChild(sidebars.container);

		// inject graph view
		if (InvioSettingTab.settings.includeGraphView) {
			let graph = this.generateGraphView(usingDocument);
			let graphHeader = usingDocument.createElement("span");
			graphHeader.addClass("sidebar-section-header");
			graphHeader.innerText = "Interactive Graph";

			rightSidebar.appendChild(graphHeader);
			rightSidebar.appendChild(graph);
		}

		// inject outline
		if (InvioSettingTab.settings.includeOutline) {
			let headerTree = LinkTree.headersFromFile(file.markdownFile, 1);
			let outline: HTMLElement | undefined = this.generateHTMLTree(headerTree, usingDocument, "Table Of Contents", "outline-tree", false, 1, 2, InvioSettingTab.settings.startOutlineCollapsed);
			rightSidebar.appendChild(outline);
		}

		// inject darkmode toggle
		if (InvioSettingTab.settings.addDarkModeToggle && !usingDocument.querySelector(".theme-toggle-container-inline, .theme-toggle-container")) {
			let toggle = this.generateDarkmodeToggle(false, usingDocument);
			leftSidebar.appendChild(toggle);
		}

		// inject file tree
		if (InvioSettingTab.settings.includeFileTree) {
			let tree = GlobalDataGenerator.getFileTree();
			if (InvioSettingTab.settings.makeNamesWebStyle) tree.makeLinksWebStyle();

			const config = this.getMeta(file);
			const pageTitle = config?.title || app.vault.getName();
			let fileTree: HTMLDivElement = this.generateHTMLTree(tree, usingDocument, pageTitle, "file-tree", true, 1, 1, false);
			leftSidebar.appendChild(fileTree);
		}

		await this.appendFooter(file);
		await this.fillInHead(file, rootPath);

		file.downloads.unshift(file.getSelfDownloadable());

		return file;
	}

	public static async appendFooter(file: ExportFile) {
		let pageContainerEl = file.document.querySelector(".webpage-container");
		const footerBar = file.document.createElement('div');
		footerBar.setAttribute('class', 'site-footer');

		const a = file.document.createElement('a');
		a.target = '_blank';
		a.href = 'https://github.com/frontend-engineering/Invio'
		a.text = 'Powered by Invio'
		footerBar.appendChild(a);
		pageContainerEl.appendChild(footerBar);
	}

	public static async getDocumentHTML(file: ExportFile, addSelfToDownloads: boolean = false): Promise<ExportFile> {
		// set custom line width on body
		let body = file.document.body;

		let bodyClasses = (document.body.getAttribute("class") ?? "").replaceAll("\"", "'");
		let bodyStyle = (document.body.getAttribute("style") ?? "").replaceAll("\"", "'");
		body.setAttribute("class", bodyClasses);
		body.setAttribute("style", bodyStyle);

		let lineWidth = InvioSettingTab.settings.customLineWidth || "50em";
		let contentWidth = InvioSettingTab.settings.contentWidth || "500em";
		let sidebarWidth = InvioSettingTab.settings.sidebarWidth || "25em";
		if (!isNaN(Number(lineWidth))) lineWidth += "px";
		if (!isNaN(Number(contentWidth))) contentWidth += "px";
		if (!isNaN(Number(sidebarWidth))) sidebarWidth += "px";
		body.style.setProperty("--line-width", lineWidth);
		body.style.setProperty("--line-width-adaptive", lineWidth);
		body.style.setProperty("--file-line-width", lineWidth);
		body.style.setProperty("--content-width", contentWidth);
		body.style.setProperty("--sidebar-width", sidebarWidth);
		body.style.setProperty("--collapse-arrow-size", "0.4em");
		body.style.setProperty("--tree-horizontal-spacing", "1em");
		body.style.setProperty("--tree-vertical-spacing", "0.5em");
		body.style.setProperty("--sidebar-margin", "12px");

		// create obsidian document containers
		let markdownViewEl = file.document.body.createDiv();
		let content = await MarkdownRenderer.renderMarkdown(file);
		if (MarkdownRenderer.cancelled) throw new Error("Markdown rendering cancelled");
		markdownViewEl.outerHTML = content;

		if (InvioSettingTab.settings.allowFoldingHeadings && !markdownViewEl.hasClass("allow-fold-headings")) {
			markdownViewEl.addClass("allow-fold-headings");
		}
		else if (markdownViewEl.hasClass("allow-fold-headings")) {
			markdownViewEl.removeClass("allow-fold-headings");
		}

		if (InvioSettingTab.settings.addFilenameTitle)
			this.addTitle(file);

		// add heading fold arrows
		let arrowHTML = "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='svg-icon right-triangle'><path d='M3 8L12 17L21 8'></path></svg>";
		let headings = file.document.querySelectorAll("div h2, div h3, div h4, div h5, div h6");
		headings.forEach((element) => {
			if (!(element instanceof HTMLElement)) return;
			if (!element.hasAttribute("data-heading")) return;

			element.style.display = "flex";

			// continue if heading already has an arrow
			if (element.querySelector(".heading-collapse-indicator") != null) return;

			let el = file.document.createElement("div");
			el.setAttribute("class", "heading-collapse-indicator collapse-indicator collapse-icon");
			el.innerHTML = arrowHTML;
			element.prepend(el);
		});

		// remove collapsible arrows from h1 and inline titles
		file.document.querySelectorAll("div h1, div .inline-title").forEach((element) => {
			element.querySelector(".heading-collapse-indicator")?.remove();
		});

		// make sure the page scales correctly at different widths
		file.sizerElement.style.paddingBottom = "";
		file.sizerElement.style.paddingBottom = "32px";
		file.sizerElement.style.padding = "var(--file-margins)";
		file.sizerElement.style.paddingTop = "var(--file-margins)";
		file.sizerElement.style.paddingLeft = "var(--file-margins)";
		file.sizerElement.style.paddingRight = "var(--file-margins)";
		file.sizerElement.style.width = "100%";
		file.sizerElement.style.position = "absolute";

		// modify links to work outside of obsidian (including relative links)
		this.fixLinks(file);

		// inline / outline images
		let outlinedImages: Downloadable[] = [];
		if (InvioSettingTab.settings.inlineImages) {
			await this.inlineMedia(file);
		}
		else {
			outlinedImages = await this.externalizeMedia(file);
		}

		// add math styles to the document. They are here and not in head because they are unique to each document
		let mathStyleEl = document.createElement("style");
		mathStyleEl.id = "MJX-CHTML-styles";
		mathStyleEl.innerHTML = AssetHandler.mathStyles;
		file.contentElement.prepend(mathStyleEl);

		if (addSelfToDownloads) file.downloads.push(file.getSelfDownloadable());
		file.downloads.push(...outlinedImages);
		file.downloads.push(...await AssetHandler.getDownloads());

		if (InvioSettingTab.settings.makeNamesWebStyle) {
			file.downloads.forEach((file) => {
				file.filename = Path.toWebStyle(file.filename);
				file.relativeDownloadPath = file.relativeDownloadPath?.makeWebStyle();
			});
		}

		return file;
	}

	private static addTitle(file: ExportFile) {
		let currentTitleEl = file.document.querySelector("h1, h2, body.show-inline-title .inline-title");
		let hasTitle = currentTitleEl != null;
		let currentTitle = currentTitleEl?.textContent ?? "";

		if (!hasTitle || (currentTitleEl?.tagName == "H2" && currentTitle != file.markdownFile.basename)) {
			let divContainer = file.document.querySelector("div.mod-header");
			if (!divContainer) {
				divContainer = file.document.createElement("div");
				divContainer.setAttribute("class", "mod-header");
				file.contentElement.querySelector(".markdown-preview-sizer")?.prepend(divContainer);
			}

			let title = divContainer.createEl("div");
			title.innerText = file.markdownFile.basename;
			title.setAttribute("class", "inline-title");
			title.setAttribute("data-heading", title.innerText);
			title.style.display = "block";
			title.id = file.markdownFile.basename.replaceAll(" ", "_");
		}
	}

	private static generateSideBars(middleContent: HTMLElement, file: ExportFile): { container: HTMLElement, left: HTMLElement, leftScroll: HTMLElement, right: HTMLElement, rightScroll: HTMLElement, center: HTMLElement } {
		let docEl = file.document;

		/*
		- div.webpage-container

			- div.sidebar-left
				- div.sidebar-content
					- div.sidebar-scroll-area

			- div.document-container

			- div.sidebar-right
				- div.sidebar-content
					- div.sidebar-scroll-area
		*/

		let pageContainer = docEl.createElement("div");
		let leftSidebar = docEl.createElement("div");
		let leftContent = docEl.createElement("div");
		let leftSidebarScroll = docEl.createElement("div");
		let documentContainer = docEl.createElement("div");
		let rightSidebar = docEl.createElement("div");
		let rightContent = docEl.createElement("div");
		let rightSidebarScroll = docEl.createElement("div");

		pageContainer.setAttribute("class", "webpage-container");
		leftSidebar.setAttribute("class", "sidebar-left");
		leftContent.setAttribute("class", "sidebar-content");
		leftSidebarScroll.setAttribute("class", "sidebar-scroll-area");
		documentContainer.setAttribute("class", "document-container");
		rightContent.setAttribute("class", "sidebar-content");
		rightSidebar.setAttribute("class", "sidebar-right");
		rightSidebarScroll.setAttribute("class", "sidebar-scroll-area");

		leftSidebar.classList.add("sidebar");
		leftSidebar.appendChild(leftContent);
		// leftContent.appendChild(leftSidebarScroll);

		documentContainer.appendChild(middleContent);

		rightSidebar.classList.add("sidebar");
		rightSidebar.appendChild(rightContent);
		// rightContent.appendChild(rightSidebarScroll);

		pageContainer.appendChild(leftSidebar);
		pageContainer.appendChild(documentContainer);
		pageContainer.appendChild(rightSidebar);

		return { container: pageContainer, left: leftContent, leftScroll: leftSidebarScroll, right: rightContent, rightScroll: rightSidebarScroll, center: documentContainer };
	}

	private static getRelativePaths(file: ExportFile): { mediaPath: Path, jsPath: Path, cssPath: Path, rootPath: Path } {
		let rootPath = file.pathToRoot;
		let imagePath = AssetHandler.mediaFolderName.makeUnixStyle();
		let jsPath = AssetHandler.jsFolderName.makeUnixStyle();
		let cssPath = AssetHandler.cssFolderName.makeUnixStyle();

		if (InvioSettingTab.settings.makeNamesWebStyle) {
			imagePath = imagePath.makeWebStyle();
			jsPath = jsPath.makeWebStyle();
			cssPath = cssPath.makeWebStyle();
			rootPath = rootPath.makeWebStyle();
		}

		return { mediaPath: imagePath, jsPath: jsPath, cssPath: cssPath, rootPath: rootPath };
	}

	private static async fillInHead(file: ExportFile, rootPath: Path) {
		// const pageConfig = app.metadataCache.getFileCache(file.markdownFile).frontmatter;
		const pageConfig = this.getMeta(file);
		log.info('get file metadata: ', pageConfig);

		let pageTitle = file.markdownFile.basename;
		if (pageConfig?.title) {
			pageTitle = pageConfig.title;
		}
		let relativePaths = this.getRelativePaths(file);

		let meta = `
			<title>${pageTitle}</title>
			<base href="${relativePaths.rootPath}/">
			<meta id="root-path" root-path="${relativePaths.rootPath}/">
			`;

		if (pageConfig?.description) {
			meta += `<meta name="description" content="${pageConfig?.description || ''}">`
		}

		if (pageConfig?.keywords) {
			meta += `<meta name="keywords" content="${pageConfig?.keywords?.join(',') || ''}">`
		}

		meta += `<link rel="icon" sizes="96x96" href="${pageConfig?.icon || 'https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/favicon-96x96.png'}">
			<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, minimum-scale=1.0, maximum-scale=5.0">
			<meta charset="UTF-8">
			`

		if (InvioSettingTab.settings.includeOutline) {
			meta += `<script src="https://code.iconify.design/iconify-icon/1.0.3/iconify-icon.min.js"></script>`;
		}

		// --- JS ---
		let scripts = "";

		if (InvioSettingTab.settings.includeGraphView) {
			// TODO: outline the nodes to a file
			scripts +=
				`
			<!-- Graph View Data -->
			<script>
			let nodes=\n${JSON.stringify(GlobalDataGenerator.getGlobalGraph(InvioSettingTab.settings.graphMinNodeSize, InvioSettingTab.settings.graphMaxNodeSize, rootPath.asString))};
			let attractionForce = ${InvioSettingTab.settings.graphAttractionForce};
			let linkLength = ${InvioSettingTab.settings.graphLinkLength};
			let repulsionForce = ${InvioSettingTab.settings.graphRepulsionForce};
			let centralForce = ${InvioSettingTab.settings.graphCentralForce};
			let edgePruning = ${InvioSettingTab.settings.graphEdgePruning};
			</script>
			`;

			scripts += `\n<script type='module' src='${relativePaths.jsPath}/graph_view.js'></script>\n`;
			scripts += `\n<script src='${relativePaths.jsPath}/graph_wasm.js'></script>\n`;
			scripts += `\n<script src="${relativePaths.jsPath}/tinycolor.js"></script>\n`;
			scripts += `\n<script src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.js" integrity="sha512-Ch/O6kL8BqUwAfCF7Ie5SX1Hin+BJgYH4pNjRqXdTEqMsis1TUYg+j6nnI9uduPjGaj7DN4UKCZgpvoExt6dkw==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n`;
		}

		if (InvioSettingTab.settings.inlineJS) {
			scripts += `\n<script>\n${AssetHandler.webpageJS}\n</script>\n`;
		}
		else {
			scripts += `\n<script src='${relativePaths.jsPath}/webpage.js'></script>\n`;
		}


		// --- CSS ---
		let cssSettings = document.getElementById("css-settings-manager")?.innerHTML ?? "";

		if (InvioSettingTab.settings.inlineCSS) {
			let pluginCSS = AssetHandler.webpageStyles;
			let thirdPartyPluginStyles = AssetHandler.pluginStyles;
			pluginCSS += thirdPartyPluginStyles;

			var header =
				`
			${meta}
			
			<!-- Obsidian App Styles / Other Built-in Styles -->
			<style> ${AssetHandler.appStyles} </style>
			<style> ${cssSettings} </style>

			<!-- Theme Styles -->
			<style> ${AssetHandler.themeStyles} </style>

			<!-- Plugin Styles -->
			<style> ${pluginCSS} </style>

			<!-- Snippets -->
			<style> ${AssetHandler.snippetStyles} </style>
		
			${scripts}
			`;
		}
		else {
			header =
				`
			${meta}

			<link rel="stylesheet" href="${relativePaths.cssPath}/obsidian-styles.css">
			<link rel="stylesheet" href="${relativePaths.cssPath}/theme.css">
			<link rel="stylesheet" href="${relativePaths.cssPath}/plugin-styles.css">
			<link rel="stylesheet" href="${relativePaths.cssPath}/snippets.css">
			<style> ${cssSettings} </style>

			${scripts}
			`;
		}

		file.document.head.innerHTML = header;
	}

	//#endregion

	//#region Links and Images

	private static fixLinks(file: ExportFile) {
		let htmlCompatibleExt = ["canvas", "md"];

		file.document.querySelectorAll("a.internal-link").forEach((linkEl) => {
			linkEl.setAttribute("target", "_self");

			let href = linkEl.getAttribute("href");
			if (!href) return;

			if (href.startsWith("#")) // link pointing to header of this document
			{
				linkEl.setAttribute("href", href.replaceAll(" ", "_"));
			}
			else // if it doesn't start with #, it's a link to another document
			{
				let targetHeader = href.split("#").length > 1 ? "#" + href.split("#")[1] : "";
				let target = href.split("#")[0];

				let targetFile = app.metadataCache.getFirstLinkpathDest(target, file.markdownFile.path);
				if (!targetFile) return;

				let targetPath = new Path(targetFile.path);
				// let targetRelativePath = Path.getRelativePath(file.exportPath, targetPath);
				if (htmlCompatibleExt.includes(targetPath.extensionName)) targetPath.setExtension("html");
				if (InvioSettingTab.settings.makeNamesWebStyle) targetPath.makeWebStyle();

				let finalHref = targetPath.makeUnixStyle() + targetHeader.replaceAll(" ", "_");
				linkEl.setAttribute("href", finalHref);
			}
		});

		file.document.querySelectorAll("a.footnote-link").forEach((linkEl) => {
			linkEl.setAttribute("target", "_self");
		});

		file.document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((headerEl) => {
			// use the headers inner text as the id
			headerEl.setAttribute("id", headerEl.textContent?.replaceAll(" ", "_") ?? "");
		});
	}

	private static getMeta(file: ExportFile): IMetaConfig {
		// Get site config
		const indexPath = file.exportedFolder.joinString('index.md');
		const indexFile = app.vault.getAbstractFileByPath(indexPath.asString);

		const pageConfig = (app.metadataCache.getFileCache(file.markdownFile).frontmatter || {}) as IMetaConfig;
		log.info('page config: ', pageConfig);

		const siteConfig: IMetaConfig = {};
		if (indexFile instanceof TFile) {
			const indexMeta = app.metadataCache.getFileCache(indexFile);
			Object.assign(siteConfig, indexMeta?.frontmatter || {});
			log.info('site meta: ', siteConfig);
		}

		for (const key of InheriableMeta) {
			if (!pageConfig[key]) {
				// @ts-ignore
				pageConfig[key] = siteConfig[key];
			}
		}

		log.info('merged config: ', pageConfig);
		return pageConfig;
	}

	private static getMediaPath(src: string): Path {
		// @ts-ignore
		let pathString = "";
		try {
			// @ts-ignore
			pathString = app.vault.resolveFileUrl(src)?.path ?? "";
		}
		catch
		{
			pathString = src.replaceAll("app://", "").replaceAll("\\", "/");
			pathString = pathString.replaceAll(pathString.split("/")[0] + "/", "");
			pathString = Path.getRelativePathFromVault(new Path(pathString), true).asString;
		}

		pathString = pathString ?? "";

		return new Path(pathString);
	}

	private static async inlineMedia(file: ExportFile) {
		let elements = Array.from(file.document.querySelectorAll("img, audio, video"))
		for (let mediaEl of elements) {
			let rawSrc = mediaEl.getAttribute("src") ?? "";
			if (!rawSrc.startsWith("app:")) continue;

			let filePath = this.getMediaPath(rawSrc);

			let base64 = await filePath.readFileString("base64") ?? "";
			if (base64 === "") return;

			let ext = filePath.extensionName;

			//@ts-ignore
			let type = app.viewRegistry.typeByExtension[ext] ?? "audio";

			if (ext === "svg") ext += "+xml";

			mediaEl.setAttribute("src", `data:${type}/${ext};base64,${base64}`);
		};
	}

	private static async externalizeMedia(file: ExportFile): Promise<Downloadable[]> {
		let downloads: Downloadable[] = [];

		let elements = Array.from(file.document.querySelectorAll("img, audio, video"))
		for (let mediaEl of elements) {
			let rawSrc = mediaEl.getAttribute("src") ?? "";
			if (!rawSrc.startsWith("app:")) continue;

			let filePath = this.getMediaPath(rawSrc);

			let exportLocation = filePath.copy;

			// if the media is inside the exported folder then keep it in the same place
			let mediaPathInExport = Path.getRelativePath(file.exportedFolder, filePath);
			if (mediaPathInExport.asString.startsWith("..")) {
				// if path is outside of the vault, outline it into the media folder
				exportLocation = AssetHandler.mediaFolderName.joinString(filePath.fullName);
			}

			// let relativeImagePath = Path.getRelativePath(file.exportPath, exportLocation)

			if (InvioSettingTab.settings.makeNamesWebStyle) {
				// relativeImagePath.makeWebStyle();
				exportLocation.makeWebStyle();
			}

			mediaEl.setAttribute("src", exportLocation.asString);

			let data = await filePath.readFileBuffer() ?? Buffer.from([]);
			let imageDownload = new Downloadable(exportLocation.fullName, data, exportLocation.directory.makeForceFolder());
			downloads.push(imageDownload);
		};

		return downloads;
	}

	//#endregion

	//#region Special Features

	public static generateDarkmodeToggle(inline: boolean = true, usingDocument: Document = document): HTMLElement {
		// programatically generates the above html snippet
		let toggle = usingDocument.createElement("div");
		let label = usingDocument.createElement("label");
		label.classList.add(inline ? "theme-toggle-container-inline" : "theme-toggle-container");
		label.setAttribute("for", "theme_toggle");
		let input = usingDocument.createElement("input");
		input.classList.add("theme-toggle-input");
		input.setAttribute("type", "checkbox");
		input.setAttribute("id", "theme_toggle");
		let div = usingDocument.createElement("div");
		div.classList.add("toggle-background");
		label.appendChild(input);
		label.appendChild(div);
		toggle.appendChild(label);

		return toggle;
	}

	private static generateTreeItem(item: LinkTree, usingDocument: Document, minCollapsableDepth = 1, startClosed: boolean = true): HTMLDivElement {
		let arrowIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle"><path d="M3 8L12 17L21 8"></path></svg>`;

		/*
		- div.tree-item
			- div.tree-item-contents
				- div.tree-item-icon
					- svg
				- a.internal-link
					- span.tree-item-title
			- div.tree-item-children
		*/

		let treeItemEl = usingDocument.createElement('div');
		treeItemEl.classList.add("tree-item");
		treeItemEl.classList.add(item.type == "folder" ? "mod-tree-folder" : (item.type == "file" ? "mod-tree-file" : (item.type == "heading" ? "mod-tree-heading" : "mod-tree-none")));
		treeItemEl.setAttribute("data-depth", item.depth.toString());

		let itemContentsEl = treeItemEl.createDiv("tree-item-contents");

		if (item.children.length != 0 && item.depth >= minCollapsableDepth) {
			let itemIconEl = itemContentsEl.createDiv("tree-item-icon collapse-icon");
			let svgEl = usingDocument.createElement("svg");
			itemIconEl.appendChild(svgEl).outerHTML = arrowIcon;

			treeItemEl.classList.add("mod-collapsible");
			if (startClosed) treeItemEl.classList.add("is-collapsed");
		}

		let itemLinkEl = itemContentsEl.createEl("a", { cls: "tree-item-link" });
		if (item.href) itemLinkEl.setAttribute("href", item.href);
		itemLinkEl.createEl("span", { cls: "tree-item-title", text: item.title });
		treeItemEl.createDiv("tree-item-children");

		return treeItemEl;
	}

	private static buildTreeRecursive(tree: LinkTree, usingDocument: Document, minDepth: number = 1, minCollapsableDepth: number = 1, closeAllItems: boolean = false): HTMLDivElement[] {
		let treeItems: HTMLDivElement[] = [];

		for (let item of tree.children) {
			let children = this.buildTreeRecursive(item, usingDocument, minDepth, minCollapsableDepth, closeAllItems);

			if (item.depth >= minDepth) {
				let treeItem = this.generateTreeItem(item, usingDocument, minCollapsableDepth, closeAllItems);
				treeItems.push(treeItem);
				treeItem.querySelector(".tree-item-children")?.append(...children);
			}
			else {
				treeItems.push(...children);
			}
		}

		return treeItems;
	}

	private static generateHTMLTree(tree: LinkTree, usingDocument: Document, treeTitle: string, className: string, showNestingIndicator = true, minDepth: number = 1, minCollapsableDepth = 1, closeAllItems: boolean = false): HTMLDivElement {
		/*
		- div.tree-container
			- div.tree-header
				- span.sidebar-section-header
				- button.collapse-tree-button
					- iconify-icon
			- div.tree-scroll-area
				- div.tree-item
					- div.tree-item-contents
						- div.tree-item-icon
							- svg
						- a.internal-link
							- span.tree-item-title
					- div.tree-item-children
		*/

		let treeContainerEl = usingDocument.createElement('div');
		let treeHeaderEl = usingDocument.createElement('div');
		let sectionHeaderEl = usingDocument.createElement('span');
		let collapseAllEl = usingDocument.createElement('button');
		let collapseAllIconEl = usingDocument.createElement('iconify-icon');
		let treeScrollAreaEl = usingDocument.createElement('div');

		treeContainerEl.classList.add('tree-container', className);
		if (showNestingIndicator) treeContainerEl.classList.add("mod-nav-indicator");
		treeHeaderEl.classList.add("tree-header");
		sectionHeaderEl.classList.add("sidebar-section-header");
		collapseAllEl.classList.add("clickable-icon", "collapse-tree-button");
		if (closeAllItems) collapseAllEl.classList.add("is-collapsed");
		treeScrollAreaEl.classList.add("tree-scroll-area");

		treeContainerEl.setAttribute("data-depth", "0");
		sectionHeaderEl.innerText = treeTitle;
		collapseAllIconEl.setAttribute("icon", "ph:arrows-in-line-horizontal-bold");
		collapseAllIconEl.setAttribute("width", "18px");
		collapseAllIconEl.setAttribute("height", "18px");
		collapseAllIconEl.setAttribute("rotate", "90deg");
		collapseAllIconEl.setAttribute("color", "currentColor");

		treeContainerEl.appendChild(treeHeaderEl);
		treeContainerEl.appendChild(treeScrollAreaEl);
		treeHeaderEl.appendChild(sectionHeaderEl);
		treeHeaderEl.appendChild(collapseAllEl);
		collapseAllEl.appendChild(collapseAllIconEl);

		let treeItems = this.buildTreeRecursive(tree, usingDocument, minDepth, minCollapsableDepth, closeAllItems);

		for (let item of treeItems) {
			treeScrollAreaEl.appendChild(item);
		}

		return treeContainerEl;
	}

	private static generateGraphView(usingDocument: Document): HTMLDivElement {
		let graphEl = usingDocument.createElement("div");
		graphEl.className = "graph-view-placeholder";
		graphEl.innerHTML =
			`
		<div class="graph-view-container">
			<div class="graph-icon graph-expand" role="button" aria-label="Expand" data-tooltip-position="top"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-arrow-up-right"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg></div>
			<canvas id="graph-canvas" width="512px" height="512px"></canvas>
		</div>
		`

		return graphEl;
	}

	//#endregion
}