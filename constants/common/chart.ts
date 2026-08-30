
export const resolutionIntervalMap: Record<string, string> = {
  '1': '1m',
  '3': '3m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '1h',
  '120': '2h',
  '240': '4h',
  '360': '6h',
  '480': '8h',
  '720': '12h',
  '1D': '1d',
  'D': '1d',
  '1d': '1d',
  '3D': '3d',
  '1W': '1w',
  'W': '1w',
  '1M': '1M',
  'M': '1M',
};

export const SUPPORTED_RESOLUTIONS = ['1', '5', '15', '60', '240', '1D'];

//chart style
const GREEN = "#165816ff";
const RED = "#ff0000";

interface ChartStyleProperties {
  [key: string]: boolean | string;
}

export const chartStyleOverrides: ChartStyleProperties = [
  "candleStyle",
  "hollowCandleStyle",
  "haStyle",
].reduce<ChartStyleProperties>((acc, cv) => {
  acc[`mainSeriesProperties.${cv}.drawWick`] = true;
  acc[`mainSeriesProperties.${cv}.drawBorder`] = false;
  acc[`mainSeriesProperties.${cv}.upColor`] = GREEN;
  acc[`mainSeriesProperties.${cv}.downColor`] = RED;
  acc[`mainSeriesProperties.${cv}.wickUpColor`] = GREEN;
  acc[`mainSeriesProperties.${cv}.wickDownColor`] = RED;
  acc[`mainSeriesProperties.${cv}.borderUpColor`] = GREEN;
  acc[`mainSeriesProperties.${cv}.borderDownColor`] = RED;
  return acc;
}, {});

// Define theme-specific chart overrides
export const getDynamicChartOverrides = (theme: string) => {
  const isDarkTheme = theme === 'dark';

  // Background and text colors based on theme
  const backgroundColor = isDarkTheme ? '#131722' : '#ffffff';
  const textColor = isDarkTheme ? '#b2b5be' : '#4a4a4a';
  const gridColor = isDarkTheme ? 'rgba(35, 38, 59, 0.5)' : 'rgba(170, 170, 170, 0.5)';

  return Object.assign({}, chartStyleOverrides, {
    "paneProperties.background": backgroundColor,
    "paneProperties.backgroundType": "solid",
    "paneProperties.vertGridProperties.color": gridColor,
    "paneProperties.vertGridProperties.style": 2,
    "paneProperties.horzGridProperties.color": gridColor,
    "paneProperties.horzGridProperties.style": 2,
    "mainSeriesProperties.priceLineColor": "#2962FF",
    "scalesProperties.textColor": textColor,
    "scalesProperties.backgroundColor": backgroundColor,
    "scalesProperties.lineColor": gridColor,
    "mainSeriesProperties.statusViewStyle.showExchange": false,
    "mainSeriesProperties.statusViewStyle.backgroundColor": backgroundColor,
    "paneProperties.legendProperties.showBackground": true,
    "paneProperties.legendProperties.backgroundTransparency": 0,
    "paneProperties.legendProperties.backgroundColor": backgroundColor,
    "paneProperties.legendProperties.textColor": textColor,

    //configure price
    "mainSeriesProperties.minTick": "0.00000001", // smallest tick size 
    "mainSeriesProperties.precision": 8,          // max precision allowed
    "mainSeriesProperties.priceScale": 100000000, // scale for tiny tokens
  });
};

// Default chart overrides (for backward compatibility)
export const chartOverrides = getDynamicChartOverrides('dark');

export const enabledFeatures = [
  "side_toolbar_in_fullscreen_mode",
  "header_in_fullscreen_mode",
  "items_favoriting",
  "hide_left_toolbar_by_default",
  "iframe_loading_same_origin",
];

export const Resolution = ["1", "5", "15", "1h", "4h", "1D"]
export const SpotResolution = ['1S', '15S', '30S', "1", "5", "15", "1h", "4h", "1D"]

//gt resolution
export const GtResolutionTimeframe: Record<string, string> = {
  ['1']: 'minute',
  ['5']: 'minute',
  ['15']: 'minute',
  ['60']: 'hour',
  ['240']: 'hour',
  ['1D']: 'day'
}

export const GtResolutionAggregate: Record<string, string> = {
  ['1']: '1',
  ['5']: '5',
  ['15']: '15',
  ['60']: '1',
  ['240']: '4',
  ['1D']: '1'
}

export const PlatformResolutionToChartResolution: Record<string, string> = {
  ['1']: '1',
  ['5']: '5',
  ['15']: '15',
  ['60']: '60',
  ['240']: '240',
  ['1440']: '1D'
}

export const fontendDisplayCharts: Record<string, string> = {
  ['1']: '1m',
  ['5']: '5m',
  ['15']: '15m',
  ['60']: '1h',
  ['240']: '4h',
  ['1440']: '1d'
}

export const getResolutionMs = (resolution: string) => {
  if (resolution === '1S') {
    return 1000;
  } else if (resolution === '15S') {
    return 15000;
  } else if (resolution === '30S') {
    return 30000;
  } else if (resolution === '1') {
    return 60000;
  } else if (resolution === '5') {
    return 300000;
  } else if (resolution === '15') {
    return 900000;
  } else if (resolution === '60') {
    return 3600000;
  } else if (resolution === '240') {
    return 14400000;
  } else if (resolution === '1D') {
    return 86400000;
  } else {
    return 60000;
  }
}
