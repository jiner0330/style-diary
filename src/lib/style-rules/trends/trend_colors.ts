/**
 * 流行趋势 - 2026春夏流行色板
 * 
 * ⚠️ 数据来源说明：
 *   - 以色环理论和时装周多季色彩延续性为基础推断
 *   - 标记为 model_inference 的条目来自训练数据中的时尚知识
 *   - 建议用 Pantone Fashion Color Trend Report SS26 校对更新
 * 
 * 更新方式：
 *   1. 访问 pantone.com → Fashion Color Trend Report
 *   2. 浏览 Vogue Runway → SS26 色彩趋势总结
 *   3. 替换或补充本文件数据
 */

import { TrendColor } from './types';

export const trendColors2026SS: TrendColor[] = [
  // ═══════════ 主导色 ═══════════
  {
    name: '黄油黄',
    hex: '#FFF4B8',
    family: '黄色系',
    role: '主导色',
    pairWith: ['纯白', '米白', '浅灰', '牛仔蓝', '巧克力棕'],
    skinTone: '暖黄皮友好',
    confidence: 'model_inference',
    source: '训练数据 — 待 Pantone SS26 报告校对',
  },
  {
    name: '薄荷绿',
    hex: '#B8E6C8',
    family: '绿色系',
    role: '主导色',
    pairWith: ['白色', '奶油色', '浅蓝', '米色', '灰色'],
    skinTone: '所有肤色',
    confidence: 'model_inference',
    source: '训练数据 — 待 Pantone SS26 报告校对',
  },
  {
    name: '天空粉蓝',
    hex: '#B5D8EB',
    family: '蓝色系',
    role: '主导色',
    pairWith: ['白色', '卡其', '棕色', '奶油色'],
    skinTone: '冷白皮友好',
    confidence: 'model_inference',
    source: '训练数据 — 多季延续性趋势',
  },
  {
    name: '番茄红',
    hex: '#E63946',
    family: '红色系',
    role: '主导色',
    pairWith: ['白色', '黑色', '牛仔蓝', '卡其'],
    skinTone: '所有肤色',
    confidence: 'model_inference',
    source: '训练数据 — 2026春夏秀场色彩回归趋势',
  },
  {
    name: '薰衣草紫',
    hex: '#C9B1D4',
    family: '紫色系',
    role: '主导色',
    pairWith: ['白色', '灰色', '米色', '浅蓝'],
    skinTone: '所有肤色',
    confidence: 'model_inference',
    source: '训练数据 — 紫色系多季延续',
  },

  // ═══════════ 辅助色 ═══════════
  {
    name: '巧克力棕',
    hex: '#5C4033',
    family: '棕色系',
    role: '辅助色',
    pairWith: ['黄油黄', '薄荷绿', '奶油白', '浅蓝'],
    skinTone: '所有肤色',
    confidence: 'model_inference',
    source: '训练数据 — 棕色持续作为新中性色',
  },
  {
    name: '沙色',
    hex: '#D2B48C',
    family: '棕色系',
    role: '辅助色',
    pairWith: ['白色', '黑色', '橄榄绿', '深蓝'],
    skinTone: '暖黄皮友好',
    confidence: 'model_inference',
    source: '训练数据 — 大地色持续流行',
  },
  {
    name: '灰蓝',
    hex: '#7B8FA1',
    family: '蓝色系',
    role: '辅助色',
    pairWith: ['白色', '奶油色', '棕色', '黑色'],
    skinTone: '所有肤色',
    confidence: 'model_inference',
    source: '训练数据 — 低饱和蓝多季稳定',
  },
  {
    name: '复古橄榄绿',
    hex: '#6B705C',
    family: '绿色系',
    role: '辅助色',
    pairWith: ['卡其', '米白', '棕色', '黑色'],
    skinTone: '暖黄皮友好',
    confidence: 'model_inference',
    source: '训练数据 — 工装/户外风格延续',
  },

  // ═══════════ 点缀色 ═══════════
  {
    name: '电光橙',
    hex: '#FF6B35',
    family: '橙色系',
    role: '点缀色',
    pairWith: ['白色', '黑色', '深蓝', '灰色'],
    skinTone: '冷白皮友好',
    confidence: 'model_inference',
    source: '训练数据 — 小面积亮色点缀趋势',
  },
  {
    name: '金属银',
    hex: '#C0C0C0',
    family: '灰色系',
    role: '点缀色',
    pairWith: ['黑色', '白色', '深蓝', '酒红'],
    skinTone: '所有肤色',
    confidence: 'model_inference',
    source: '训练数据 — metallic回归趋势',
  },
  {
    name: '亮粉',
    hex: '#FF69B4',
    family: '粉色系',
    role: '点缀色',
    pairWith: ['白色', '灰色', '牛仔蓝'],
    skinTone: '冷白皮友好',
    confidence: 'model_inference',
    source: '训练数据 — Barbiecore余波',
  },

  // ═══════════ 中性色定番 ═══════════
  {
    name: '奶油白',
    hex: '#FFFDD0',
    family: '白色系',
    role: '主导色',
    pairWith: ['所有流行色'],
    skinTone: '所有肤色',
    confidence: 'high',
    source: '多季持续 — 稳定的中性色基调',
  },
  {
    name: '炭灰',
    hex: '#36454F',
    family: '灰色系',
    role: '辅助色',
    pairWith: ['奶油白', '黄油黄', '番茄红', '金属银'],
    skinTone: '所有肤色',
    confidence: 'high',
    source: '多季持续 — 稳定中性色',
  },
];
