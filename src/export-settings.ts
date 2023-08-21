export interface ExportSettingsData 
{
	// Inlining Options
	inlineCSS: boolean;
	inlineJS: boolean;
	inlineImages: boolean;
	includePluginCSS: string;
	includeSvelteCSS: boolean;

	// Formatting Options
	makeNamesWebStyle: boolean;
	allowFoldingHeadings: boolean;
	addFilenameTitle: boolean;
	beautifyHTML: boolean;
	customLineWidth: string;
	contentWidth: string;
	sidebarWidth: string;
	startOutlineCollapsed: boolean;

	// Export Options
	dataviewBlockWaitTime: number;
	showWarningsInExportLog: boolean;
	incrementalExport: boolean;

	// Page Features
	addDarkModeToggle: boolean;
	hideSearch: boolean;
	includeOutline: boolean;
	includeFileTree: boolean;
	includeGraphView: boolean;

	// Main Export Options
	exportPreset: string;
	openAfterExport: boolean;

	// Graph View Settings
	graphAttractionForce: number;
	graphLinkLength: number;
	graphRepulsionForce: number;
	graphCentralForce: number;
	graphEdgePruning: number;
	graphMinNodeSize: number;
	graphMaxNodeSize: number;

	// Cache
	lastExportPath: string;
}

export const DEFAULT_EXP_SETTINGS: ExportSettingsData =
{
	// Inlining Options
	inlineCSS: true,
	inlineJS: true,
	inlineImages: true,
	includePluginCSS: '',
	includeSvelteCSS: true,

	// Formatting Options
	makeNamesWebStyle: false,
	allowFoldingHeadings: true,
	addFilenameTitle: true,
	beautifyHTML: false,
	customLineWidth: "",
	contentWidth: "",
	sidebarWidth: "",
	startOutlineCollapsed: false,

	// Export Options
	dataviewBlockWaitTime: 700,
	showWarningsInExportLog: true,
	incrementalExport: false,

	// Page Features
	addDarkModeToggle: true,
	hideSearch: false,
	includeOutline: true,
	includeGraphView: true,
	includeFileTree: true,

	// Main Export Options
	exportPreset: '',
	openAfterExport: false,

	// Graph View Settings
	graphAttractionForce: 1,
	graphLinkLength: 10,
	graphRepulsionForce: 150,
	graphCentralForce: 3,
	graphEdgePruning: 100,
	graphMinNodeSize: 3,
	graphMaxNodeSize: 7,

	// Cache
	lastExportPath: '',
}
