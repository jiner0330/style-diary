/**
 * 流行趋势 - 聚合入口
 * 
 * 用法：
 *   import { getTrendReport, queryTrends } from './rules/trends';
 * 
 * 与规则库的协作：
 *   规则层 = 不变的穿搭知识（色彩理论/版型/身型）
 *   趋势层 = 每季更新的流行信息（流行色/单品/风格）
 * 
 * 产品侧调用：
 *   规则 (getRulesForQuery) + 趋势 (queryTrends) → 综合推荐
 */

import {
  TrendReport, TrendQuery, TrendColor, TrendItem,
  TrendStyle, TrendCombo,
} from './types';
import { trendColors2026SS } from './trend_colors';
import { trendItems2026SS } from './trend_items';
import { trendStyles2026SS } from './trend_styles';
import { trendCombos2026SS } from './trend_combos';

/** 当前有效趋势报告 */
export const currentTrendReport: TrendReport = {
  season: '2026春夏',
  year: 2026,
  generatedAt: '2026-05-22',
  colors: trendColors2026SS,
  silhouettes: [],  // 待填充
  items: trendItems2026SS,
  styles: trendStyles2026SS,
  combos: trendCombos2026SS,
};

/**
 * 趋势查询（产品端主入口）
 */
export function queryTrends(query: TrendQuery = {}) {
  let colors = currentTrendReport.colors;
  let items = currentTrendReport.items;
  let styles = currentTrendReport.styles;
  let combos = currentTrendReport.combos;

  // 场景过滤
  if (query.scene) {
    items = items.filter(i => i.scenes.includes(query.scene!));
    combos = combos.filter(c => c.scenes.includes(query.scene!));
  }

  // 身型过滤
  if (query.bodyShape) {
    styles = styles.filter(s =>
      !s.goodFor || s.goodFor.length === 0 || s.goodFor.includes(query.bodyShape!)
    );
  }

  // 热度过滤
  if (query.minHeat) {
    items = items.filter(i => i.heat >= query.minHeat!);
    styles = styles.filter(s => s.heat >= query.minHeat!);
  }

  // 按类别返回
  const result: Partial<TrendReport> = {};
  if (!query.category || query.category === 'colors') result.colors = colors;
  if (!query.category || query.category === 'items') result.items = items;
  if (!query.category || query.category === 'styles') result.styles = styles;
  if (!query.category || query.category === 'combos') result.combos = combos;

  return result;
}

/** 获取最热的 N 个单品 */
export function getHotItems(n = 10): TrendItem[] {
  return [...trendItems2026SS]
    .sort((a, b) => b.heat - a.heat)
    .slice(0, n);
}

/** 获取最热的 N 个风格 */
export function getHotStyles(n = 5): TrendStyle[] {
  return [...trendStyles2026SS]
    .sort((a, b) => b.heat - a.heat)
    .slice(0, n);
}

/** 获取指定场景的热门搭配 */
export function getCombosForScene(scene: string): TrendCombo[] {
  return trendCombos2026SS.filter(c => c.scenes.includes(scene as any));
}

/** 获取流行色板 */
export function getTrendPalette(): TrendColor[] {
  return trendColors2026SS;
}

/** 趋势热度摘要 */
export function getTrendSummary() {
  return {
    season: currentTrendReport.season,
    topColors: trendColors2026SS.filter(c => c.role === '主导色').map(c => c.name).slice(0, 5),
    topItems: getHotItems(5).map(i => i.name),
    topStyles: getHotStyles(5).map(s => s.name),
    hotCombos: trendCombos2026SS.filter(c => c.heat === '🔥🔥🔥').map(c => {
      const parts = Object.values(c.slots).filter(v => typeof v === 'string');
      return parts.slice(0, 4).join(' + ');
    }),
  };
}

export type { TrendReport, TrendQuery, TrendColor, TrendItem, TrendStyle, TrendCombo };
export {
  trendColors2026SS, trendItems2026SS, trendStyles2026SS, trendCombos2026SS,
};
