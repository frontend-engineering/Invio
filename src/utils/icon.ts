import {
  TFile,
  TAbstractFile
} from "obsidian";
import { createElement, FolderSync, RefreshCcw, FileText, FolderSymlink, CopySlash } from "lucide";
import InvioPlugin from '../main';
import style from './style';
import svg from './svg';

export interface Icon {
  name: string;
  prefix: string;
  filename: string;
  svgContent: string;
  svgViewbox: string;
  svgElement: string;
}

const LogoWhiteSVG = `<svg data-v-6805eed4="" version="1.0" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" viewBox="0 0 340.000000 250.000000" preserveAspectRatio="xMidYMid meet" color-interpolation-filters="sRGB" style="margin: auto;background: black;"> <rect data-v-6805eed4="" x="0" y="0" width="100%" height="100%" fill="#000000" fill-opacity="0" class="background"></rect> <!----> <g data-v-6805eed4="" fill="#333" class="icon-text-wrapper icon-svg-group iconsvg" transform="translate(121.54000091552734,72.94056701660156)"><g class="iconsvg-imagesvg" transform="matrix(1,0,0,1,18.459997177124023,0)" opacity="1"><g><rect fill="#333" fill-opacity="0" stroke-width="2" x="0" y="0" width="60" height="53.51886540005352" class="image-rect"></rect> <svg x="0" y="0" width="60" height="53.51886540005352" filtersec="colorsb5632673345" class="image-svg-svg primary" style="overflow: visible;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0.007076367270201445 -0.0008505221921950579 112.11257934570312 100.00221252441406"><g fill-rule="evenodd"><path d="M27 97.93A56.08 56.08 0 0 1 9.29 19.08 55.77 55.77 0 0 0 23.59 50l.07.07c.53.58 1.06 1.14 1.62 1.7s1.12 1.09 1.72 1.62L45.54 72a14.93 14.93 0 0 1 4.53 10.93v1.59a15.12 15.12 0 0 1-8 13.52A15.09 15.09 0 0 1 27 97.93z" fill="#FFFFFF"></path><path d="M23.59 50a55.77 55.77 0 0 1-14.3-30.92A56.46 56.46 0 0 1 27 2.08 15.08 15.08 0 0 1 42.11 2a15.12 15.12 0 0 1 8 13.52v1.59A15 15 0 0 1 45.55 28l-22 22z" fill="#999999" opacity=".8"></path><path d="M85.16 2.08a56.08 56.08 0 0 1 17.67 78.84A55.77 55.77 0 0 0 88.53 50l-.08-.07c-.52-.58-1.06-1.14-1.62-1.7s-1.12-1.09-1.69-1.62L66.58 28a14.93 14.93 0 0 1-4.53-10.93v-1.55A15.12 15.12 0 0 1 70 2a15.08 15.08 0 0 1 15.15.08z" fill="#FFFFFF"></path><path d="M88.53 50a55.77 55.77 0 0 1 14.3 30.92 56.35 56.35 0 0 1-17.67 17 15.46 15.46 0 0 1-23.11-13.44v-1.59A15 15 0 0 1 66.57 72l22-22z" fill="#999999" opacity=".8"></path></g></svg></svg> <!----></g></g> <g transform="translate(0,61.518863677978516)"><g data-gra="path-name" fill-rule="" class="tp-name iconsvg-namesvg" opacity="1" transform="matrix(1,0,0,1,0,0)"><g transform="scale(1)"><g><path d="M8.58 0L4.8 0 4.8-42.01 8.58-42.01 8.58 0ZM37.03 0L33.43 0 33.43-21.97Q33.43-23.06 33.02-24.01 32.61-24.96 31.9-25.66 31.2-26.37 30.25-26.78 29.3-27.19 28.21-27.19L28.21-27.19 25.81-27.19Q24.73-27.19 23.77-26.78 22.82-26.37 22.12-25.66 21.42-24.96 21.01-24.01 20.6-23.06 20.6-21.97L20.6-21.97 20.6 0 16.99 0 16.99-30 18.19-30 20.16-26.95Q21.39-28.62 23.25-29.6 25.11-30.59 27.3-30.59L27.3-30.59 28.21-30.59Q30.03-30.59 31.64-29.9 33.25-29.21 34.45-28.01 35.65-26.81 36.34-25.2 37.03-23.58 37.03-21.77L37.03-21.77 37.03 0ZM64.28-30L53.64 0 51.86 0 41.22-30 44.82-30 52.65-7.27 52.76-5.71 52.88-7.27 60.67-30 64.28-30ZM73.56-37.21L69.38-37.21 69.38-42.01 73.56-42.01 73.56-37.21ZM73.27 0L69.67 0 69.67-30 73.27-30 73.27 0ZM101.72-8.23L101.72-8.23Q101.72-6.42 101.03-4.8 100.34-3.19 99.14-1.99 97.94-0.79 96.33-0.1 94.72 0.59 92.9 0.59L92.9 0.59 90.5 0.59Q88.68 0.59 87.07-0.1 85.46-0.79 84.26-1.99 83.06-3.19 82.37-4.8 81.68-6.42 81.68-8.23L81.68-8.23 81.68-21.77Q81.68-23.58 82.37-25.2 83.06-26.81 84.26-28.01 85.46-29.21 87.07-29.9 88.68-30.59 90.5-30.59L90.5-30.59 92.9-30.59Q94.72-30.59 96.33-29.9 97.94-29.21 99.14-28.01 100.34-26.81 101.03-25.2 101.72-23.58 101.72-21.77L101.72-21.77 101.72-8.23ZM98.12-8.03L98.12-21.97Q98.12-23.06 97.71-24.01 97.29-24.96 96.59-25.66 95.89-26.37 94.94-26.78 93.98-27.19 92.9-27.19L92.9-27.19 90.5-27.19Q89.41-27.19 88.46-26.78 87.51-26.37 86.81-25.66 86.1-24.96 85.69-24.01 85.28-23.06 85.28-21.97L85.28-21.97 85.28-8.03Q85.28-6.94 85.69-5.99 86.1-5.04 86.81-4.34 87.51-3.63 88.46-3.22 89.41-2.81 90.5-2.81L90.5-2.81 92.9-2.81Q93.98-2.81 94.94-3.22 95.89-3.63 96.59-4.34 97.29-5.04 97.71-5.99 98.12-6.94 98.12-8.03L98.12-8.03Z" transform="translate(-4.800000190734863, 42.0099983215332)"></path></g> <!----> <!----> <!----> <!----> <!----> <!----> <!----></g></g> <!----></g></g><defs v-gra="od"></defs></svg>`;
const LogoDarkSVG = `<svg data-v-6805eed4="" version="1.0" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" viewBox="0 0 340.000000 250.000000" preserveAspectRatio="xMidYMid meet" color-interpolation-filters="sRGB" style="margin: auto;"> <rect data-v-6805eed4="" x="0" y="0" width="100%" height="100%" fill="#ffffff" fill-opacity="0" class="background"></rect> <!----> <g data-v-6805eed4="" fill="#333" class="icon-text-wrapper icon-svg-group iconsvg" transform="translate(121.54000091552734,72.94056701660156)"><g class="iconsvg-imagesvg" transform="matrix(1,0,0,1,18.459997177124023,0)" opacity="1"><g><rect fill="#333" fill-opacity="0" stroke-width="2" x="0" y="0" width="60" height="53.51886540005352" class="image-rect"></rect> <svg x="0" y="0" width="60" height="53.51886540005352" filtersec="colorsb2025641709" class="image-svg-svg primary" style="overflow: visible;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0.007076367270201445 -0.0008505221921950579 112.11257934570312 100.00221252441406"><g fill-rule="evenodd"><path d="M27 97.93A56.08 56.08 0 0 1 9.29 19.08 55.77 55.77 0 0 0 23.59 50l.07.07c.53.58 1.06 1.14 1.62 1.7s1.12 1.09 1.72 1.62L45.54 72a14.93 14.93 0 0 1 4.53 10.93v1.59a15.12 15.12 0 0 1-8 13.52A15.09 15.09 0 0 1 27 97.93z" fill="#000000"></path><path d="M23.59 50a55.77 55.77 0 0 1-14.3-30.92A56.46 56.46 0 0 1 27 2.08 15.08 15.08 0 0 1 42.11 2a15.12 15.12 0 0 1 8 13.52v1.59A15 15 0 0 1 45.55 28l-22 22z" fill="#999999" opacity=".8"></path><path d="M85.16 2.08a56.08 56.08 0 0 1 17.67 78.84A55.77 55.77 0 0 0 88.53 50l-.08-.07c-.52-.58-1.06-1.14-1.62-1.7s-1.12-1.09-1.69-1.62L66.58 28a14.93 14.93 0 0 1-4.53-10.93v-1.55A15.12 15.12 0 0 1 70 2a15.08 15.08 0 0 1 15.15.08z" fill="#000000"></path><path d="M88.53 50a55.77 55.77 0 0 1 14.3 30.92 56.35 56.35 0 0 1-17.67 17 15.46 15.46 0 0 1-23.11-13.44v-1.59A15 15 0 0 1 66.57 72l22-22z" fill="#999999" opacity=".8"></path></g></svg></svg> <!----></g></g> <g transform="translate(0,61.518863677978516)"><g data-gra="path-name" fill-rule="" class="tp-name iconsvg-namesvg" opacity="1" transform="matrix(1,0,0,1,0,0)"><g transform="scale(1)"><g><path d="M8.58 0L4.8 0 4.8-42.01 8.58-42.01 8.58 0ZM37.03 0L33.43 0 33.43-21.97Q33.43-23.06 33.02-24.01 32.61-24.96 31.9-25.66 31.2-26.37 30.25-26.78 29.3-27.19 28.21-27.19L28.21-27.19 25.81-27.19Q24.73-27.19 23.77-26.78 22.82-26.37 22.12-25.66 21.42-24.96 21.01-24.01 20.6-23.06 20.6-21.97L20.6-21.97 20.6 0 16.99 0 16.99-30 18.19-30 20.16-26.95Q21.39-28.62 23.25-29.6 25.11-30.59 27.3-30.59L27.3-30.59 28.21-30.59Q30.03-30.59 31.64-29.9 33.25-29.21 34.45-28.01 35.65-26.81 36.34-25.2 37.03-23.58 37.03-21.77L37.03-21.77 37.03 0ZM64.28-30L53.64 0 51.86 0 41.22-30 44.82-30 52.65-7.27 52.76-5.71 52.88-7.27 60.67-30 64.28-30ZM73.56-37.21L69.38-37.21 69.38-42.01 73.56-42.01 73.56-37.21ZM73.27 0L69.67 0 69.67-30 73.27-30 73.27 0ZM101.72-8.23L101.72-8.23Q101.72-6.42 101.03-4.8 100.34-3.19 99.14-1.99 97.94-0.79 96.33-0.1 94.72 0.59 92.9 0.59L92.9 0.59 90.5 0.59Q88.68 0.59 87.07-0.1 85.46-0.79 84.26-1.99 83.06-3.19 82.37-4.8 81.68-6.42 81.68-8.23L81.68-8.23 81.68-21.77Q81.68-23.58 82.37-25.2 83.06-26.81 84.26-28.01 85.46-29.21 87.07-29.9 88.68-30.59 90.5-30.59L90.5-30.59 92.9-30.59Q94.72-30.59 96.33-29.9 97.94-29.21 99.14-28.01 100.34-26.81 101.03-25.2 101.72-23.58 101.72-21.77L101.72-21.77 101.72-8.23ZM98.12-8.03L98.12-21.97Q98.12-23.06 97.71-24.01 97.29-24.96 96.59-25.66 95.89-26.37 94.94-26.78 93.98-27.19 92.9-27.19L92.9-27.19 90.5-27.19Q89.41-27.19 88.46-26.78 87.51-26.37 86.81-25.66 86.1-24.96 85.69-24.01 85.28-23.06 85.28-21.97L85.28-21.97 85.28-8.03Q85.28-6.94 85.69-5.99 86.1-5.04 86.81-4.34 87.51-3.63 88.46-3.22 89.41-2.81 90.5-2.81L90.5-2.81 92.9-2.81Q93.98-2.81 94.94-3.22 95.89-3.63 96.59-4.34 97.29-5.04 97.71-5.99 98.12-6.94 98.12-8.03L98.12-8.03Z" transform="translate(-4.800000190734863, 42.0099983215332)"></path></g> <!----> <!----> <!----> <!----> <!----> <!----> <!----></g></g> <!----></g></g><defs v-gra="od"></defs></svg>`;
const RibbonLogoWhiteSVG = `<svg viewBox="0 0 100 100" class="svg-icon invio-sync-wait"><g fill-rule="evenodd" style="transform: scale3d(0.89, 0.99, 1.5);"><path d="M27 97.93A56.08 56.08 0 0 1 9.29 19.08 55.77 55.77 0 0 0 23.59 50l.07.07c.53.58 1.06 1.14 1.62 1.7s1.12 1.09 1.72 1.62L45.54 72a14.93 14.93 0 0 1 4.53 10.93v1.59a15.12 15.12 0 0 1-8 13.52A15.09 15.09 0 0 1 27 97.93z" style="fill: var(--icon-color);"></path><path d="M23.59 50a55.77 55.77 0 0 1-14.3-30.92A56.46 56.46 0 0 1 27 2.08 15.08 15.08 0 0 1 42.11 2a15.12 15.12 0 0 1 8 13.52v1.59A15 15 0 0 1 45.55 28l-22 22z" fill="#999999" opacity=".8"></path><path d="M85.16 2.08a56.08 56.08 0 0 1 17.67 78.84A55.77 55.77 0 0 0 88.53 50l-.08-.07c-.52-.58-1.06-1.14-1.62-1.7s-1.12-1.09-1.69-1.62L66.58 28a14.93 14.93 0 0 1-4.53-10.93v-1.55A15.12 15.12 0 0 1 70 2a15.08 15.08 0 0 1 15.15.08z" style="fill: var(--icon-color);"></path><path d="M88.53 50a55.77 55.77 0 0 1 14.3 30.92 56.35 56.35 0 0 1-17.67 17 15.46 15.46 0 0 1-23.11-13.44v-1.59A15 15 0 0 1 66.57 72l22-22z" fill="#999999" opacity=".8"></path></g></svg>`;
/**
 * Removes the `obsidian-icon-folder-icon` icon node from the provided HTMLElement.
 * @param el HTMLElement from which the icon node will be removed.
 */
const removeIconInNode = (el: HTMLElement): void => {
  const iconNode = el.querySelector('.obsidian-icon-folder-icon');
  if (!iconNode) {
    return;
  }

  iconNode.remove();
};

interface RemoveOptions {
  /**
   * The container that will be used to remove the icon. If not defined, it will try to
   * find the path within the `document`.
   */
  container?: HTMLElement;
}

/**
 * Removes the 'obsidian-icon-folder-icon' icon node from the HTMLElement corresponding
 * to the specified file path.
 * @param path File path for which the icon node will be removed.
 */
const removeIconInPath = (path: string, options?: RemoveOptions): void => {
  const node = options?.container ?? document.querySelector(`[data-path="${path}"]`);
  if (!node) {
    console.error('element with data path not found', path);
    return;
  }

  removeIconInNode(node);
};


const validIconName = /^[(A-Z)|(0-9)]/;
const svgViewboxRegex = /viewBox="([^"]*)"/g;
const svgContentRegex = /<svg.*>(.*?)<\/svg>/g;
const generateIcon = (iconName: string, content: string): Icon | null => {
  if (content.length === 0) {
    return;
  }

  content = content.replace(/(\r\n|\n|\r)/gm, '');
  content = content.replace(/>\s+</gm, '><');
  const normalizedName = iconName.charAt(0).toUpperCase() + iconName.substring(1);

  if (!validIconName.exec(normalizedName)) {
    console.log(`skipping icon with invalid name: ${iconName}`);
    return null;
  }

  const svgViewboxMatch = content.match(svgViewboxRegex);
  let svgViewbox: string = '';
  if (svgViewboxMatch && svgViewboxMatch.length !== 0) {
    svgViewbox = svgViewboxMatch[0];
  }

  const svgContentMatch = content.match(svgContentRegex);
  if (!svgContentMatch) {
    console.log(`skipping icon with invalid svg content: ${content}`);
    return null;
  }

  const svgContent = svgContentMatch.map((val) => val.replace(/<\/?svg>/g, '').replace(/<svg.+?>/g, ''))[0];

  // const iconPackPrefix = createIconPackPrefix(iconPackName);

  const icon: Icon = {
    name: normalizedName.split('.svg')[0],
    prefix: '',
    filename: iconName,
    svgContent,
    svgViewbox,
    svgElement: svg.extract(content),
  };

  return icon;
};


/**
 * Sets an icon or emoji for an HTMLElement based on the specified icon name and color.
 * The function manipulates the specified node inline.
 * @param plugin Instance of the InvioPlugin.
 * @param iconName Name of the icon or emoji to add.
 * @param node HTMLElement to which the icon or emoji will be added.
 * @param color Optional color of the icon to add.
 */
const setIconForNode = (plugin: InvioPlugin, node: HTMLElement, svgStr: string, color?: string): void => {
  // process svg input
  let content = svgStr;
  content = content.replace(/(\r\n|\n|\r)/gm, '');
  content = content.replace(/>\s+</gm, '><');
  content = svg.extract(content);

  // The icon is possibly not an emoji.
  let iconContent = style.applyAll(content, node);
  if (color) {
    node.style.color = color;
    iconContent = svg.colorize(content, color);
  }
  node.innerHTML = iconContent;
};

interface CreateOptions {
  /**
   * The container that will be used to insert the icon. If not defined, it will try to
   * find the path within the `document`.
   */
  container?: HTMLElement;
  /**
   * The color that will be applied to the icon.
   */
  color?: string;
}

/**
 * Creates an icon node for the specified path and inserts it to the DOM.
 * @param plugin Instance of the InvioPlugin.
 * @param path Path for which the icon node will be created.
 * @param iconName Name of the icon or emoji to add.
 * @param color Optional color of the icon to add.
 */
const createIconNode = (plugin: InvioPlugin, path: string, svgStr: string, color: string = '#44cf6e', repeated?: boolean): void => {
  // Get the container from the provided options or try to find the node that has the
  // path from the document itself.
  const node = document.querySelector(`[data-path="${path}"]`);
  if (!node) {
    console.error('element with data path not found', path);
    if (!repeated) {
      setTimeout(() => {
        createIconNode(plugin, path, svgStr, color, true);
      }, 3000)
    }
    return;
  }

  // Get the folder or file title node.
  let titleNode = node.querySelector('.nav-folder-title-content');
  if (!titleNode) {
    titleNode = node.querySelector('.nav-file-title-content');

    if (!titleNode) {
      console.error('element with title not found');
      return;
    }
  }

  // Check for possible inheritance and remove the inherited icon node.
  const possibleInheritanceIcon = node.querySelector('.obsidian-icon-folder-icon');
  if (possibleInheritanceIcon) {
    possibleInheritanceIcon.remove();
  }

  // Creates a new icon node and inserts it to the DOM.
  const iconNode = document.createElement('div');
  iconNode.classList.add('obsidian-icon-folder-icon');

  setIconForNode(plugin, iconNode, svgStr, color);

  node.insertBefore(iconNode, titleNode);
};

export const addIconForconflictFile = (plugin: InvioPlugin, fileOrFolder: TAbstractFile) => {
  if ((fileOrFolder instanceof TFile) && fileOrFolder.name.endsWith('.conflict.md')) {
    // Add alert icon for conflict file
    const { iconSvgCopySlash } = getIconSvg();
    createIconNode(plugin, fileOrFolder.path, iconSvgCopySlash, '#dd1b9a'); 
  }
}

const iconNameSyncWait = `invio-sync-wait`;
const iconNameSyncPending = `invio-sync-pending`;
const iconNameSyncRunning = `invio-sync-running`;
const iconNameLogs = `invio-logs`;
const iconNameSyncLogo = `invio-sync-logo`;

export const UsingIconNames = {
  iconNameSyncWait,
  iconNameSyncPending,
  iconNameSyncRunning,
  iconNameLogs,
  iconNameSyncLogo
}

export const getIconSvg = () => {
  const iconSvgSyncWait = createElement(FolderSymlink);
  iconSvgSyncWait.setAttribute("width", "100");
  iconSvgSyncWait.setAttribute("height", "100");
  const iconSvgSyncPending = createElement(FolderSync);
  iconSvgSyncPending.setAttribute("width", "100");
  iconSvgSyncPending.setAttribute("height", "100");
  const iconSvgSyncRunning = createElement(RefreshCcw);
  iconSvgSyncRunning.setAttribute("width", "100");
  iconSvgSyncRunning.setAttribute("height", "100");
  const iconSvgLogs = createElement(FileText);
  iconSvgLogs.setAttribute("width", "100");
  iconSvgLogs.setAttribute("height", "100");
  const iconSvgCopySlash = createElement(CopySlash);
  iconSvgCopySlash.setAttribute("width", "100");
  iconSvgCopySlash.setAttribute("height", "100");
  const res = {
    iconSvgSyncPending: iconSvgSyncPending.outerHTML,
    iconSvgSyncWait: iconSvgSyncWait.outerHTML,
    iconSvgSyncRunning: iconSvgSyncRunning.outerHTML,
    iconSvgLogs: iconSvgLogs.outerHTML,
    iconSvgCopySlash: iconSvgCopySlash.outerHTML,
    iconSvgLogo: RibbonLogoWhiteSVG
  };

  iconSvgSyncWait.empty();
  iconSvgSyncPending.empty();
  iconSvgSyncRunning.empty();
  iconSvgLogs.empty();
  iconSvgCopySlash.empty();
  return res;
};

export default {
  setIconForNode,
  createIconNode,
  removeIconInNode,
  removeIconInPath,
};
