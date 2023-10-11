var htmlToImage = require('html-to-image');
var download = require('downloadjs');

//#region Helpers

function getAbsoluteRootPath()
{
	if (typeof rootPath == 'undefined') setupRootPath(document);
	return new URL(window.location.href + "/../" + rootPath).pathname;
}

function getURLPath(url = window.location.pathname)
{
	let absoluteRoot = getAbsoluteRootPath();
	let pathname = url.substring(absoluteRoot.length);
	return pathname;
}

function getURLRootPath(url = window.location.pathname)
{
	let path = getURLPath(url);
	let splitPath = path.split("/");
	let rootPath = "";
	for (let i = 0; i < splitPath.length - 1; i++)
	{
		rootPath += "../";
	}
	return rootPath;
}

async function setTreeCollapsed(element, collapsed, animate = true)
{
	if (!element || !element.classList.contains("mod-collapsible")) return;

	let children = element.querySelector(".tree-item-children");

	if (collapsed)
	{
		element.classList.add("is-collapsed");
		if(animate) slideUp(children, 100);
		else children.style.display = "none";
	}
	else
	{
		element.classList.remove("is-collapsed");
		if(animate) slideDown(children, 100);
		else children.style.removeProperty("display");
	}
}

async function setTreeCollapsedAll(elements, collapsed, animate = true)
{
	let childrenList = [];
	elements.forEach(async element => 
	{
		if (!element || !element.classList.contains("mod-collapsible")) return;

		let children = element.querySelector(".tree-item-children");

		if (collapsed)
		{
			element.classList.add("is-collapsed");
		}
		else
		{
			element.classList.remove("is-collapsed");
		}

		childrenList.push(children);
	});

	if (collapsed)
	{
		if(animate) slideUpAll(childrenList, 100);
		else childrenList.forEach(async children => children.style.display = "none");
	}
	else
	{
		if(animate) slideDownAll(childrenList, 100);
		else childrenList.forEach(async children => children.style.removeProperty("display"));
	}
}

function toggleTreeCollapsed(element)
{
	if (!element) return;
	setTreeCollapsed(element, !element.classList.contains("is-collapsed"));
}

function toggleTreeCollapsedAll(elements)
{
	if (!elements) return;
	setTreeCollapsedAll(elements, !elements[0].classList.contains("is-collapsed"));
}

function getHeaderEl(headerDiv)
{
	let possibleChildHeader = headerDiv.firstChild;
	let isHeader = false;

	while (possibleChildHeader != null)
	{
		isHeader = possibleChildHeader ? /[Hh][1-6]/g.test(possibleChildHeader.tagName) : false;
		if (isHeader) break;

		possibleChildHeader = possibleChildHeader.nextElementSibling;
	}

	return possibleChildHeader;
}

function getPreviousHeader(headerDiv)
{
	let possibleParent = headerDiv.previousElementSibling;
	let isHeader = false;

	while (possibleParent != null)
	{
		let possibleChildHeader = getHeaderEl(possibleParent);
		isHeader = possibleChildHeader ? /[Hh][1-6]/g.test(possibleChildHeader.tagName) : false;
		if (isHeader) break;

		possibleParent = possibleParent.previousElementSibling;
	}

	return possibleParent;
}

function setHeaderOpen(headerDiv, open, openParents = true)
{
	if(headerDiv.tagName != "DIV" || !getHeaderEl(headerDiv))
	{
		console.error("setHeaderOpen() must be called with a header div");
		return;
	}

	// let selector = getHeadingContentsSelector(header);
	if (open) 
	{
		headerDiv.classList.remove("is-collapsed");
		headerDiv.style.display = "";
	}
	if (!open)
	{
		headerDiv.classList.add("is-collapsed");
	}

	let headerEl = getHeaderEl(headerDiv);

	let childHeaders = [];

	let possibleChild = headerDiv.nextElementSibling;

	// loop through next siblings showing/ hiding children until we reach a header of the same or lower level
	while (possibleChild != null)
	{
		let possibleChildHeader = getHeaderEl(possibleChild);

		if(possibleChildHeader)
		{
			// if header is a sibling of this header then break
			if (possibleChildHeader.tagName <= headerEl.tagName) break;

			// save child headers to be re closed afterwards
			childHeaders.push(possibleChild);
		}

		if (!open) possibleChild.style.display = "none";
		else possibleChild.style.display = "";

		possibleChild = possibleChild.nextElementSibling;
	}

	if(open)
	{
		// if we are opening the header then we need to make sure that all closed child headers stay closed
		childHeaders.forEach(function(item)
		{
			if (item.classList.contains("is-collapsed"))
			{
				setHeaderOpen(item, false);
			}
		});

		// if we are opening the header then we need to make sure that all parent headers are open
		if (openParents)
		{
			let previousHeader = getPreviousHeader(headerDiv);
			
			while (previousHeader != null)
			{
				let previousHeaderEl = getHeaderEl(previousHeader);

				if (previousHeaderEl.tagName < headerEl.tagName)
				{
					// if header is a parent of this header then unhide
					setHeaderOpen(previousHeader, true);
					break;
				}
				
				previousHeader = getPreviousHeader(previousHeader);
			}
		}
	}
}

let slideUp = (target, duration=500) => {

	target.style.transitionProperty = 'height, margin, padding';
	target.style.transitionDuration = duration + 'ms';
	target.style.boxSizing = 'border-box';
	target.style.height = target.offsetHeight + 'px';
	target.offsetHeight;
	target.style.overflow = 'hidden';
	target.style.height = 0;
	target.style.paddingTop = 0;
	target.style.paddingBottom = 0;
	target.style.marginTop = 0;
	target.style.marginBottom = 0;
	window.setTimeout(async () => {
			target.style.display = 'none';
			target.style.removeProperty('height');
			target.style.removeProperty('padding-top');
			target.style.removeProperty('padding-bottom');
			target.style.removeProperty('margin-top');
			target.style.removeProperty('margin-bottom');
			target.style.removeProperty('overflow');
			target.style.removeProperty('transition-duration');
			target.style.removeProperty('transition-property');
	}, duration);
}

let slideUpAll = (targets, duration=500) => {

	targets.forEach(async target => {
		target.style.transitionProperty = 'height, margin, padding';
		target.style.transitionDuration = duration + 'ms';
		target.style.boxSizing = 'border-box';
		target.style.height = target.offsetHeight + 'px';
		target.offsetHeight;
		target.style.overflow = 'hidden';
		target.style.height = 0;
		target.style.paddingTop = 0;
		target.style.paddingBottom = 0;
		target.style.marginTop = 0;
		target.style.marginBottom = 0;
	});

	window.setTimeout(async () => {
		targets.forEach(async target => {
			target.style.display = 'none';
			target.style.removeProperty('height');
			target.style.removeProperty('padding-top');
			target.style.removeProperty('padding-bottom');
			target.style.removeProperty('margin-top');
			target.style.removeProperty('margin-bottom');
			target.style.removeProperty('overflow');
			target.style.removeProperty('transition-duration');
			target.style.removeProperty('transition-property');
		});
	}, duration);
}

let slideDown = (target, duration=500) => {

	target.style.removeProperty('display');
	let display = window.getComputedStyle(target).display;
	if (display === 'none') display = 'block';
	target.style.display = display;
	let height = target.offsetHeight;
	target.style.overflow = 'hidden';
	target.style.height = 0;
	target.style.paddingTop = 0;
	target.style.paddingBottom = 0;
	target.style.marginTop = 0;
	target.style.marginBottom = 0;
	target.offsetHeight;
	target.style.boxSizing = 'border-box';
	target.style.transitionProperty = "height, margin, padding";
	target.style.transitionDuration = duration + 'ms';
	target.style.height = height + 'px';
	target.style.removeProperty('padding-top');
	target.style.removeProperty('padding-bottom');
	target.style.removeProperty('margin-top');
	target.style.removeProperty('margin-bottom');
	window.setTimeout(async () => {
		target.style.removeProperty('height');
		target.style.removeProperty('overflow');
		target.style.removeProperty('transition-duration');
		target.style.removeProperty('transition-property');
	}, duration);
}

let slideDownAll = (targets, duration=500) => {

	targets.forEach(async target => {
		target.style.removeProperty('display');
		let display = window.getComputedStyle(target).display;
		if (display === 'none') display = 'block';
		target.style.display = display;
		let height = target.offsetHeight;
		target.style.overflow = 'hidden';
		target.style.height = 0;
		target.style.paddingTop = 0;
		target.style.paddingBottom = 0;
		target.style.marginTop = 0;
		target.style.marginBottom = 0;
		target.offsetHeight;
		target.style.boxSizing = 'border-box';
		target.style.transitionProperty = "height, margin, padding";
		target.style.transitionDuration = duration + 'ms';
		target.style.height = height + 'px';
		target.style.removeProperty('padding-top');
		target.style.removeProperty('padding-bottom');
		target.style.removeProperty('margin-top');
		target.style.removeProperty('margin-bottom');
	});

	window.setTimeout( async () => {
		targets.forEach(async target => {
			target.style.removeProperty('height');
			target.style.removeProperty('overflow');
			target.style.removeProperty('transition-duration');
			target.style.removeProperty('transition-property');
		});
	}, duration);
}

var slideToggle = (target, duration = 500) => {
	if (window.getComputedStyle(target).display === 'none') {
		return slideDown(target, duration);
	} else {
		return slideUp(target, duration);
	}
}

var slideToggleAll = (targets, duration = 500) => {
	if (window.getComputedStyle(targets[0]).display === 'none') {
		return slideDownAll(targets, duration);
	} else {
		return slideUpAll(targets, duration);
	}
}

//#endregion

async function loadDocument(url, pushHistory = true, scrollTo = true)
{
	console.log("Loading document: " + url);
	
	// change the active file
	setActiveDocument(url, scrollTo, pushHistory);

	let response;

	// if(typeof embeddedDocuments == 'undefined')
	// {
	try
	{
		response = await fetch(url);
	}
	catch (error)
	{
		console.log("Cannot use fetch API (likely due to CORS), just loading the page normally.");
		window.location.assign(url);
		return;
	}
	// }
	// else
	// {
	// 	response = new Response(embeddedDocuments[url], {status: 200, statusText: "OK"});
	// }

	let doc = document.implementation.createHTMLDocument();

	if (response.ok)
	{
		let html = (await response.text()).replaceAll("<!DOCTYPE html>", "").replaceAll("<html>", "").replaceAll("</html>", "");
		doc.documentElement.innerHTML = html;

		// copy document content and outline tree
		document.querySelector(".document-container").innerHTML = doc.querySelector(".document-container").innerHTML;
		document.querySelector(".outline-tree").innerHTML = doc.querySelector(".outline-tree").innerHTML;
	
		// if the url has a heading, scroll to it
		let splitURL = url.split("#");
		let pathnameTarget = splitURL[0] ?? url;
		let headingTarget = splitURL.length > 1 ? splitURL[1] : null;
		if (headingTarget) {
			headingTarget = decodeURIComponent(headingTarget).replaceAll(' ', '_');
			document.getElementById(headingTarget).scrollIntoView();
		}

		// Change the root path to match the match from the new page
		setupRootPath(doc);

		// initialize events on the new page
		initializePage(document.querySelector(".document-container"));
		initializePage(document.querySelector(".outline-tree"));

		document.title = doc.title;
	}
	else
	{
		// if the page is not able to load instead add a header saying the page doesn't exist
		document.querySelector(".markdown-preview-view").innerHTML = 
		`
		<div>
			<center style='position: relative; transform: translateY(20vh); width: 100%; text-align: center;'>
				<h1 style>Page Not Found</h1>
			</center>
		</div>
		`;

		document.querySelector(".outline-tree").innerHTML = "";

		console.log("Page not found: " + getAbsoluteRootPath() + url);
		let newRootPath = getURLRootPath(getAbsoluteRootPath() + url);
		rootPath = newRootPath;
		document.querySelector("base").href = newRootPath;

		document.title = "Page Not Found";
	}

	return doc;
}

function setActiveDocument(url, scrollTo = true, pushHistory = true)
{
	let pathnameTarget = url.split("#")[0] ?? url; // path with no header

	// switch active file in file tree
	document.querySelector(".tree-item.mod-active")?.classList.remove("mod-active");
	let treeItems = Array.from(document.querySelectorAll(".tree-item > .tree-item-contents > .tree-item-link"));
	let treeItem = undefined;
	for (let item of treeItems) 
	{
		if (item.getAttribute("href") == decodeURI(url))
		{
			let parent = item.parentElement.parentElement;

			parent.classList.add("mod-active");
			treeItem = parent;
			
			while (parent.hasAttribute("data-depth"))
			{
				setTreeCollapsed(parent, false, false);
				parent = parent.parentElement.parentElement;
			}

			break;
		}
	}

	if(scrollTo) treeItem?.scrollIntoView({block: "center", inline: "nearest"});

	// set the active file in th graph view
	if(typeof nodes != 'undefined' && window.renderWorker)
	{
		let activeNode = nodes?.paths.findIndex(function(item) { return item.endsWith(pathnameTarget); }) ?? -1;
		
		if(activeNode >= 0) 
		{
			window.renderWorker.activeNode = activeNode;
		}
	}

	if(pushHistory && window.location.protocol != "file:") window.history.pushState({ path: pathnameTarget }, '', pathnameTarget);
}

//#region Initialization

async function loadLeftSidebar(document) {
	let container = document.querySelector('.sidebar-left > .sidebar-content')
	if (!container) {
		console.log('no container found for left sidebar');
		return;
	}
	let response;

	try
	{
		const dataNode = document.getElementById('invio-hidden-data-node');
		let baseDir = '';
		if (dataNode?.dataset.root) {
			baseDir = dataNode?.dataset.root;
		} else {
			const hostPath = getURLPath();
			baseDir = hostPath.split('/')[0];
		}

		const sidebarUrl = `${baseDir}/_common-left-tree.html`
		response = await fetch(sidebarUrl);
	}
	catch (error)
	{
		console.log("Cannot fetch left sidebar");
		return;
	}

	if (response.ok)
	{
		let html = (await response.text()).replaceAll("<!DOCTYPE html>", "").replaceAll("<html>", "").replaceAll("</html>", "");
		const tmpContainer = document.createElement('div');
		tmpContainer.innerHTML = html;
		const legacy = container.querySelector('.file-tree');
		if (legacy) {
			container.removeChild(legacy);
		}
		container.appendChild(tmpContainer.firstChild);
	}
	else
	{
		console.error('fetch failed: ', response);
		container.innerHTML = "";
	}

	return container;
}


async function loadMeta(document) {
	let container = document.querySelector('.sidebar-left > .sidebar-content')
	if (!container) {
		console.log('no container found for left sidebar');
		return;
	}
	let response;

	try
	{
		const dataNode = document.getElementById('invio-hidden-data-node');
		let baseDir = '';
		if (dataNode?.dataset.root) {
			baseDir = dataNode?.dataset.root;
		} else {
			const hostPath = getURLPath();
			baseDir = hostPath.split('/')[0];
		}

		const sidebarUrl = `${baseDir}/meta.json`
		response = await fetch(sidebarUrl);
	}
	catch (error)
	{
		console.log("Cannot fetch meta data");
		return;
	}

	if (response.ok)
	{
		let meta = (await response.json());
		console.log('got meta: ', meta);
		return meta;
	}
	else
	{
		console.error('fetch failed: ', response);
		return ''
	}
}

function formatPage() {
    document.querySelector('.sidebar-left').style.display = 'none'
    document.querySelector('.sidebar-right').style.display = 'none'
    const container = document.querySelector('.document-container')
    container.style.height = '100%';
    container.style.paddingBottom = '0';
    const preview = container.querySelector('.document-container .markdown-preview-view');
    preview.style.padding = 'unset'
    preview.style.overflow = 'scroll'
    preview.style.height = '100%'
}

function printAsPNG() {
	// Add CSS styles for print layout
	const styles = `
	  <style>
		.sidebar-left, .sidebar-right {
			display: none !important;
		}
		.document-container {
			height: 100%;
			padding-bottom: 0 !important;
			overflow: visible;
		}
		.document-container .markdown-preview-view {
			padding: unset;
			overflow: visible;
			height: 100%;	
		}
		.webpage-container {
			overflow: scroll;
		}
		.markdown-preview-section {
			position: relative !important;
		}
		.markdown-preview-section .site-footer {
			position: absolute;
			width: 100%;
		}
	  </style>
	`;
  
  // Get the HTML content of the current webpage
  const htmlContent = document.documentElement.innerHTML;

  // Create a new window for printing
  const printWindow = window.open('', '_blank');

  // Write the HTML content and styles to the new window
  printWindow.document.open();
  printWindow.document.write(styles + htmlContent);
  printWindow.document.close();

//   window.toPng = htmlToImage.toPng;
//   window.download = download;
//   window.printWin = printWindow;
//   window.printBody = printWindow.document.body;

  printWindow.document.addEventListener('DOMContentLoaded', function() {
	console.log('dom loaded');
	const contentsNode = printWindow.document.body.querySelector('.markdown-preview-section');
	const footerNode = printWindow.document.body.querySelector('.site-footer');
	if (!contentsNode) {
		console.error('valid contents not found');
		return;
	}

	if (footerNode) {
		contentsNode.appendChild(footerNode);
	}

	htmlToImage.toPng(contentsNode, { backgroundColor: '#fff' })
		.then(function (dataUrl) {
			console.log('data url: ', dataUrl);
			download(dataUrl, document.title);
		});
		setTimeout(function () {
			printWindow.close();
		}, 300);
  });
}

function setupPrintBtn(setupOnNode) {
	setupOnNode.getElementById("print_btn")?.addEventListener('click', e => {
		e.preventDefault();
		console.log('print image...');
		printAsPNG();
	})
}
function setupThemeToggle(setupOnNode)
{
	if (localStorage.getItem("theme_toggle") != null)
    {
        setThemeToggle(localStorage.getItem("theme_toggle") == "true");
    }

	// var lastScheme = "theme-dark";
	// change theme to match current system theme
	// if (localStorage.getItem("theme_toggle") == null && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
	// {
	// 	setThemeToggle(true);
	// 	lastScheme = "theme-light";
	// }
	// if (localStorage.getItem("theme_toggle") == null && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
	// {
	// 	setThemeToggle(true);
	// 	lastScheme = "theme-dark";
	// }

	// set initial toggle state based on body theme class
	if (document.body.classList.contains("theme-light"))
	{
		setThemeToggle(true);
	}
	else
	{
		setThemeToggle(false);
	}

	function setThemeToggle(state, instant = false)
	{
		let toggle = document.querySelector(".theme-toggle-input");

		toggle.checked = state;

		if (instant) 
		{	
			var oldTransition = document.body.style.transition;
			document.body.style.transition = "none";
		}

		if(!toggle.classList.contains("is-checked") && state)
		{
			toggle.classList.add("is-checked");
		}
		else if (toggle.classList.contains("is-checked") && !state)
		{
			toggle.classList.remove("is-checked");
		}

		if(!state)
		{
			if (document.body.classList.contains("theme-light"))
			{
				document.body.classList.remove("theme-light");
			}

			if (!document.body.classList.contains("theme-dark"))
			{
				document.body.classList.add("theme-dark");
			}
		}
		else
		{
			if (document.body.classList.contains("theme-dark"))
			{
				document.body.classList.remove("theme-dark");
			}

			if (!document.body.classList.contains("theme-light"))
			{
				document.body.classList.add("theme-light");
			}
		}

		if (instant)
		{
			setTimeout(function()
			{
				document.body.style.transition = oldTransition;
			}, 100);
		}

		localStorage.setItem("theme_toggle", state ? "true" : "false");
	}

	let togging = false;
	setupOnNode.querySelector(".theme-toggle-input")?.addEventListener('change', event => {
		event.stopPropagation();
    	event.preventDefault();
		if (togging) return;
		togging = true;
		console.log("Theme toggle changed to: " + !(localStorage.getItem("theme_toggle") == "true"));
		setThemeToggle(!(localStorage.getItem("theme_toggle") == "true"));
		setTimeout(() => {
			togging = false;
		}, 300)
	})

    // window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => 
	// {
	// 	// return if we are printing
	// 	if (window.matchMedia('print').matches)
	// 	{
	// 		printing = true;
	// 		return;
	// 	}

    //     let newColorScheme = event.matches ? "theme-dark" : "theme-light";

	// 	if (newColorScheme == lastScheme) return;

    //     if (newColorScheme == "theme-dark")
    //     {
	// 		setThemeToggle(false);
    //     }

    //     if (newColorScheme == "theme-light")
    //     {
	// 		setThemeToggle(true);
    //     }

	// 	lastScheme = newColorScheme;
    // });

}

function setupSearch(setupOnNode, metadata) {
	const searchView = new window.SearchView(setupOnNode, metadata);
	// const searchBar = setupOnNode.querySelector('.search-view-container');
	// if (!searchBar) return;
	// searchBar.querySelector('.search-bar').addEventListener('input', e => {
	// 	console.log('intpu search - ', e);
	// 	e.preventDefault();
	// 	if (!e.data) return;
	// 	const resultData = search(e.data);
	// 	console.log('intpu search result - ', resultData);

	// })
}

function setupHeaders(setupOnNode)
{
    // MAKE HEADERS COLLAPSIBLE
	setupOnNode.querySelectorAll(".heading-collapse-indicator").forEach(function (element) 
	{
		element.addEventListener("click", function () 
		{
			var isOpen = !this.parentElement.parentElement.classList.contains("is-collapsed");
			setHeaderOpen(this.parentElement.parentElement, !isOpen);
		});
	});

	// unfold header when an internal link that points to that header is clicked
	setupOnNode.querySelectorAll("a.internal-link, a.tree-item-link").forEach(function (element) 
	{
		element.addEventListener("click", function (event) 
		{
			event.preventDefault();
			let target = this.getAttribute("href");

			// if the target is a header uncollapse it
			if (target.startsWith("#")) 
			{
				console.log("Uncollapsing header: " + target);
				let header = document.getElementById(target.substring(1));
				setHeaderOpen(header.parentElement, true);
			}
		});
	});
}

function setupTrees(setupOnNode) 
{
	const fileTreeItems = Array.from(setupOnNode.querySelectorAll(".tree-container.file-tree .tree-item"));

    setupOnNode.querySelectorAll(".tree-item-contents > .collapse-icon").forEach(function(item)
	{
		item.addEventListener("click", function()
		{
			toggleTreeCollapsed(item.parentElement.parentElement);
		});
	});

	let fileTreeCollapse = setupOnNode.querySelector(".tree-container.file-tree .collapse-tree-button");
	if (fileTreeCollapse) fileTreeCollapse.addEventListener("click", async function()
	{
		let fileTreeIsCollapsed = fileTreeCollapse.classList.contains("is-collapsed");
		
		setTreeCollapsedAll(fileTreeItems, !fileTreeIsCollapsed, fileTreeItems.length < 100);

		fileTreeCollapse.classList.toggle("is-collapsed");
		fileTreeCollapse.querySelector("iconify-icon").setAttribute("icon", fileTreeIsCollapsed ? "ph:arrows-out-line-horizontal-bold" : "ph:arrows-in-line-horizontal-bold");
	});


	let outlineTreeCollapse = setupOnNode.querySelector(".tree-container.outline-tree .collapse-tree-button");
	if(outlineTreeCollapse) outlineTreeCollapse.addEventListener("click", async function()
	{
		let outlineTreeIsCollapsed = outlineTreeCollapse.classList.contains("is-collapsed");

		let items = Array.from(outlineTreeCollapse.parentElement.parentElement.querySelectorAll(".tree-item"));
		setTreeCollapsedAll(items, !outlineTreeIsCollapsed, items.length < 100);

		outlineTreeCollapse.classList.toggle("is-collapsed");
		outlineTreeCollapse.querySelector("iconify-icon").setAttribute("icon", outlineTreeIsCollapsed ? "ph:arrows-out-line-horizontal-bold" : "ph:arrows-in-line-horizontal-bold");
	});
	
	// start with all closed
	setupOnNode.querySelectorAll(".tree-container .tree-item").forEach(function(item)
	{
		if (item.classList.contains("is-collapsed")) setTreeCollapsed(item, true, false);
	});

	// make sure the icons match their starting collaped state
	setupOnNode.querySelectorAll(".tree-container > .tree-header > .collapse-tree-button").forEach(function(item)
	{
		if (item.classList.contains("is-collapsed"))
		{
			item.querySelector("iconify-icon").setAttribute("icon", "ph:arrows-out-line-horizontal-bold");
		}
		else
		{
			item.querySelector("iconify-icon").setAttribute("icon", "ph:arrows-in-line-horizontal-bold");
		}
	});
}

function setupCallouts(setupOnNode)
{
	// MAKE CALLOUTS COLLAPSIBLE
    // if the callout title is clicked, toggle the display of .callout-content
	setupOnNode.querySelectorAll(".callout.is-collapsible .callout-title").forEach(function (element) 
	{
		element.addEventListener("click", function () 
		{
			var parent = this.parentElement;
			var isCollapsed = parent.classList.contains("is-collapsed");

			parent.classList.toggle("is-collapsed");
			element.querySelector(".callout-fold").classList.toggle("is-collapsed");

			slideToggle(parent.querySelector(".callout-content"), 100);
		});
	});

}

function setupCheckboxes(setupOnNode)
{
	// Fix checkboxed toggling .is-checked
	setupOnNode.querySelectorAll(".task-list-item-checkbox").forEach(function (element) 
	{
		element.addEventListener("click", function () 
		{
			var parent = this.parentElement;
			parent.classList.toggle("is-checked");
			parent.setAttribute("data-task", parent.classList.contains("is-checked") ? "x" : " ");
		});
	});

	setupOnNode.querySelectorAll(`.plugin-tasks-list-item input[type="checkbox"]`).forEach(function(checkbox)
	{
		checkbox.checked = checkbox.parentElement.classList.contains("is-checked");
	});

	setupOnNode.querySelectorAll('.kanban-plugin__item.is-complete').forEach(function(checkbox)
	{
		checkbox.querySelector('input[type="checkbox"]').checked = true;
	});
}

function setupCanvas(setupOnNode)
{
	let focusedNode = null;

	// make canvas nodes selectable
	setupOnNode.querySelectorAll(".canvas-node-content-blocker").forEach(function (element) 
	{
		element.addEventListener("click", function () 
		{
			var parent = this.parentElement.parentElement;
			parent.classList.toggle("is-focused");
			this.style.display = "none";

			if (focusedNode) 
			{
				focusedNode.classList.remove("is-focused");
				focusedNode.querySelector(".canvas-node-content-blocker").style.display = "";
			}

			focusedNode = parent;
		});
	});

	// make canvas node deselect when clicking outside
	// document.addEventListener("click", function (event) 
	// {
	// 	if (!event.target.closest(".canvas-node")) 
	// 	{
	// 		document.querySelectorAll(".canvas-node").forEach(function (node) 
	// 		{
	// 			node.classList.remove("is-focused");
	// 			node.querySelector(".canvas-node-content-blocker").style.display = "";
	// 		});
	// 	}
	// });

}

function setupCodeblocks(setupOnNode)
{
	// make code snippet block copy button copy the code to the clipboard
	setupOnNode.querySelectorAll(".copy-code-button").forEach(function (element) 
	{
		element.addEventListener("click", function () 
		{
			var code = this.parentElement.querySelector("code").textContent;
			navigator.clipboard.writeText(code);
			this.textContent = "Copied!";
			// set a timeout to change the text back
			setTimeout(function () 
			{
				setupOnNode.querySelectorAll(".copy-code-button").forEach(function (button) 
				{
					button.textContent = "Copy";
				});
			}, 2000);
		});
	});
}

function setupLinks(setupOnNode)
{
	setupOnNode.querySelectorAll(".internal-link, .footnote-link, .tree-item-link").forEach(function(link)
	{
		link.addEventListener("click", function(event)
		{
			let target = link.getAttribute("href");
			event.preventDefault();

			// this is linking to a different page
			if (!target.startsWith("#"))
			{
				// load doc, if it is a tree link then don't scroll to the active doc in the file tree
				loadDocument(target, true, !link.classList.contains("tree-item-link"));
				return;
			}
			else
			{
				let headerTarget = document.getElementById(target.substring(1));
				setHeaderOpen(headerTarget.parentElement, true);
				headerTarget.scrollIntoView();
			}
		});
	});

    window.onpopstate = function(event)
    {
		loadDocument(getURLPath(), false);
    }
}


let sidebarWidth = undefined;
let lineWidth = undefined;
function setupResize(setupOnNode)
{
	if (setupOnNode != document) return;

	function updateSidebars()
	{
		let rightSidebar = document.querySelector(".sidebar-right");
		let leftSidebar = document.querySelector(".sidebar-left");
		let sidebarCount = (rightSidebar ? 1 : 0) + (leftSidebar ? 1 : 0);

		if (sidebarCount == 0) return;

		if(!sidebarWidth) sidebarWidth = Math.max(rightSidebar?.clientWidth, leftSidebar?.clientWidth);

		if (!lineWidth)
		{
			let docWidthTestEl = document.createElement("div");
			document.querySelector(".markdown-preview-view").appendChild(docWidthTestEl);
			docWidthTestEl.style.width = "var(--line-width)";
			docWidthTestEl.style.minWidth = "var(--line-width)";
			docWidthTestEl.style.maxWidth = "var(--line-width)";
			lineWidth = docWidthTestEl.clientWidth;
			docWidthTestEl.remove();
		}

		let letHideRightThreshold = sidebarWidth * sidebarCount + lineWidth / 2;

		if (window.innerWidth < letHideRightThreshold)
		{
			rightSidebar.style.position = "absolute";
			rightSidebar.style.right = "-" + sidebarWidth + "px";
		}
		else
		{
			rightSidebar.style.position = "";
			rightSidebar.style.right = "";
		}

		let letHideLeftThreshold = lineWidth / 2 + sidebarWidth;

		if (window.innerWidth < letHideLeftThreshold)
		{
			leftSidebar.style.position = "absolute";
			leftSidebar.style.left = "-" + sidebarWidth + "px";
		}
		else
		{
			leftSidebar.style.position = "";
			leftSidebar.style.left = "";
		}
	}

	window.addEventListener("resize", function()
	{
		updateSidebars();
	});

	updateSidebars();
}

function sidebarClickHandler(event, btnEl, side, sidebarWidth) {
	const sides = "leftright";
	const opposite = sides.replace(side, "");
	event.preventDefault();
	event.stopImmediatePropagation();

	let containerEl = document.querySelector(".webpage-container");

	const width = sidebarWidth;
	if (containerEl.classList.contains(`sidebar-${side}-active`)) {
		containerEl.classList.remove(`sidebar-${side}-active`);
		btnEl.style[side] = "";
	} else {
		containerEl.classList.add(`sidebar-${side}-active`);
		btnEl.style[side] = `${width}px`;

		if (containerEl.classList.contains(`sidebar-${opposite}-active`)) {
			containerEl.classList.remove(`sidebar-${opposite}-active`);
			document.querySelector(`.sidebar-mobile-btn--${opposite}`).style[opposite] = "";
		}
	}
}

function setupMobileSidebar(setupOnNode)
{
	if (setupOnNode != document) return;

	let sidebarBtns = document.querySelector(".sidebar-mobile-btns");

	let leftBtn = sidebarBtns.querySelector(".sidebar-mobile-btn--left");
	let rightBtn = sidebarBtns.querySelector(".sidebar-mobile-btn--right");
	let sidebarWidth = document.querySelector(".sidebar-left").getBoundingClientRect().width;

	leftBtn.addEventListener("click", (e) => sidebarClickHandler(e, leftBtn, "left", sidebarWidth));
	rightBtn.addEventListener("click", (e) => sidebarClickHandler(e, rightBtn, "right", sidebarWidth));
}


function setupRootPath(fromDocument)
{
	let basePath = fromDocument.querySelector("#root-path").getAttribute("root-path");
	document.querySelector("base").href = basePath;
	document.querySelector("#root-path").setAttribute("root-path", basePath);
	rootPath = basePath;
}

let touchDrag = false;

function initializePage(setupOnNode)
{
    setupThemeToggle(setupOnNode);
	setupPrintBtn(setupOnNode);
    setupHeaders(setupOnNode);
    setupTrees(setupOnNode);
	setupCallouts(setupOnNode);
	setupCheckboxes(setupOnNode);
	setupCanvas(setupOnNode);
	setupCodeblocks(setupOnNode);
	setupLinks(setupOnNode);
	setupResize(setupOnNode);
	setupMobileSidebar(setupOnNode);

	setupOnNode.querySelectorAll("*").forEach(function(element)
	{
		element.addEventListener("touchend", function(event)
		{
			if (touchDrag)
			{
				touchDrag = false;
				event.stopPropagation();
				return;
			}

			if (element instanceof HTMLElement) element.click();
		});
	});

	if(setupOnNode == document) 
	{
		document.body.addEventListener("touchmove", function(event)
		{
			event.stopImmediatePropagation();
			touchDrag = true;
		});

		setupRootPath(document);
		setActiveDocument(getURLPath());
	}
}

function initializeForFileProtocol()
{
	let graphEl = document.querySelector(".graph-view-placeholder");
	if(graphEl)
	{
		console.log("Running locally, skipping graph view initialization and hiding graph.");
		graphEl.style.display = "none";
		graphEl.previousElementSibling.style.display = "none"; // hide the graph's header
	}
}

//#endregion

window.setActiveDocument = setActiveDocument;
window.getURLPath = getURLPath;

window.onload = function()
{
	if (window.location.protocol == "file:") initializeForFileProtocol();
	loadLeftSidebar(document)
		.then(resp => {
			console.log('left bar load ', resp);
		})
		.finally(() => {
			initializePage(document);
		})

	loadMeta(document)
		.then(meta => {
			if (!meta) {
				// TODO: Hide search bar
				return;
			}
			setupSearch(document, meta);
		})
}