// This library file does not include any other dependency and is a standalone file that
// only include utility functions for setting styles for nodes or icons. The only
// dependency is the `svg` library.
import { TAbstractFile } from 'obsidian';
import svg from './svg';

interface Margin {
  top: number;
  right: number;
  left: number;
  bottom: number;
}
interface FileItem {
  /**
   * @deprecated After Obsidian 1.2.0, use `selfEl` instead.
   */
  titleEl?: HTMLDivElement;
  /**
   * @deprecated After Obsidian 1.2.0, use `innerEl` instead.
   */
  titleInnerEl?: HTMLDivElement;
  selfEl: HTMLDivElement;
  innerEl: HTMLDivElement;
  file: TAbstractFile;
}

/**
 * Gets the file item title element by either accessing `titleEl` or `selfEl`.
 * @param fileItem FileItem which will be used to retrieve the title element from.
 * @returns HTMLElement which is the title element.
 */
const getFileItemTitleEl = (fileItem: FileItem): HTMLElement => {
  return fileItem.titleEl ?? fileItem.selfEl;
};


/**
 * Sets the margin for a specific node.
 * @param el Node where the margin will be set.
 * @param margin Margin that will be applied to the node.
 * @returns The modified node with the applied margin.
 */
const setMargin = (el: HTMLElement, margin: Margin): HTMLElement => {
  el.style.margin = `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px`;
  return el;
};

/**
 * Applies all stylings to the specified svg icon string and applies styling to the node
 * (container). The styling to the specified element is only modified when it is an emoji
 * or extra margin is defined in the settings.
 * @param plugin Instance of the InvioPlugin.
 * @param iconString SVG that will be used to apply the svg styles to.
 * @param el Node for manipulating the style.
 * @returns Icon svg string with the manipulate style attributes.
 */
const applyAll = (iconString: string, container: HTMLElement): string => {
  iconString = svg.setFontSize(iconString, 20);
  container.style.color = '#000000';
  iconString = svg.colorize(iconString, '#000000');

  // Sets the margin of an element.
  const normalizedMargin = {
    top: 0,
    right: 4,
    left: 0,
    bottom: 0,
  };
  setMargin(container, normalizedMargin);

  // if (emoji.isEmoji(iconString)) {
  //   container.style.fontSize = `${plugin.getSettings().fontSize}px`;
  //   container.style.lineHeight = `${plugin.getSettings().fontSize}px`;
  // }

  return iconString;
};


export default {
  applyAll,
  setMargin,
};
