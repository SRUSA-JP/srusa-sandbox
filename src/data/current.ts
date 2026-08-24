import featuredUsedItemsJson from '../../data/player-featured-used-items-20260824.json';
import playerDailySummaryJson from '../../data/player-daily-summary-20260824.json';
import playerDbJson from '../../data/player-db-20260823.json';
import dataRegistry from '../../data/data-registry.json';

export const CURRENT_DATA_VERSION = dataRegistry.version;

export const CURRENT_DATA_FILES = dataRegistry.paths;

export const currentFeaturedUsedItemsJson = featuredUsedItemsJson;
export const currentPlayerDailySummaryJson = playerDailySummaryJson;
export const currentPlayerDbJson = playerDbJson;
