/**
 * 穿搭规则库 - 流行趋势类型定义
 * 
 * 趋势层 vs 规则层：
 *   规则层 = 不随时间变化的知识（色彩理论、版型法则、身型穿搭）
 *   趋势层 = 每季更新的流行信息（流行色、流行单品、流行风格）
 * 
 * 更新频率：
 *   每季1次 — 时装周后2-4周内更新
 *   信源优先级：Runway > 品牌官方 > 专业趋势机构 > 社交媒体
 */

import { CategoryId, Season, Scene, StyleTag, BodyShape } from '../types';

/** 趋势数据置信度 */
export type Confidence = 'high' | 'medium' | 'low' | 'model_inference';

/** 流行色条目 */
export interface TrendColor {
  name: string;
  hex: string;
  /** 色系 */
  family: string;
  /** 在调色板中的角色 */
  role: '主导色' | '辅助色' | '点缀色';
  /** 推荐搭配色 */
  pairWith: string[];
  /** 适合肤色 */
  skinTone?: '暖黄皮友好' | '冷白皮友好' | '所有肤色';
  /** 数据置信度 */
  confidence: Confidence;
  /** 信源 */
  source: string;
}

/** 流行廓形/版型 */
export interface TrendSilhouette {
  name: string;
  /** 影响的身体部位 */
  bodyPart: string;
  desc: string;
  /** 适合身型 */
  goodFor?: BodyShape[];
  /** 不适合身型 */
  avoidFor?: BodyShape[];
  /** 推荐搭配 */
  pairWith: string[];
  confidence: Confidence;
  source: string;
}

/** 流行单品 */
export interface TrendItem {
  name: string;
  /** 对应品类ID */
  categoryId: CategoryId;
  /** 热度 1-10 */
  heat: number;
  /** 为什么火 */
  why: string;
  /** 推荐搭配 */
  styleWith: string[];
  /** 适合场景 */
  scenes: Scene[];
  confidence: Confidence;
  source: string;
}

/** 流行风格 */
export interface TrendStyle {
  name: string;
  /** 热度 1-10 */
  heat: number;
  /** 关键词 */
  keywords: string[];
  /** 风格起源 */
  origin: string;
  /** 代表品牌或人物 */
  icons: string[];
  /** 适合身型 */
  goodFor?: BodyShape[];
  confidence: Confidence;
  source: string;
}

/** 当季热门搭配 */
export interface TrendCombo {
  /** 槽位：key 可包含 "上装_内" 等叠穿变体 */
  slots: Record<string, string | string[]>;
  /** 热度 */
  heat: '🔥' | '🔥🔥' | '🔥🔥🔥';
  /** 出现场景 */
  spotted: string;
  /** 适合场景 */
  scenes: Scene[];
  confidence: Confidence;
  source: string;
}

/** 趋势数据包 */
export interface TrendReport {
  season: string;
  year: number;
  generatedAt: string;
  colors: TrendColor[];
  silhouettes: TrendSilhouette[];
  items: TrendItem[];
  styles: TrendStyle[];
  combos: TrendCombo[];
}

/** 趋势查询 */
export interface TrendQuery {
  /** 限定类别 */
  category?: 'colors' | 'silhouettes' | 'items' | 'styles' | 'combos';
  /** 场景过滤 */
  scene?: Scene;
  /** 身型过滤 */
  bodyShape?: BodyShape;
  /** 最低热度 */
  minHeat?: number;
}
