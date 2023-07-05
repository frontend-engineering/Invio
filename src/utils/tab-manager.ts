import {  PaneType, SplitDirection, TFile, View, WorkspaceLeaf } from "obsidian";


export namespace TabManager
{
	function getLeaf(navType: PaneType | boolean, splitDirection: SplitDirection = 'vertical'): WorkspaceLeaf
	{
		let leaf = navType === 'split' ? app.workspace.getLeaf(navType, splitDirection) : app.workspace.getLeaf(navType);
		return leaf;
	}

	export async function openFileInNewTab(file: TFile, navType: PaneType | boolean, splitDirection: SplitDirection = 'vertical'): Promise<WorkspaceLeaf> 
	{
		let leaf = getLeaf(navType, splitDirection);

		try
		{
			await leaf.openFile(file, undefined).catch((reason) =>
			{
				console.log(reason);
			});
		}
		catch (error)
		{
			console.log(error);
		}

		return leaf;
	}

	export function openNewTab(navType: PaneType | boolean, splitDirection: SplitDirection = 'vertical'): WorkspaceLeaf
	{
		return getLeaf(navType, splitDirection);
	}
}

