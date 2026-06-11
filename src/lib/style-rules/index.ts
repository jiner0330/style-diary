/**
 * 穿搭规则库 - 聚合入口
 * 
 * 场景匹配规则：
 *   1. 规则 scenes 为空 → 通用规则，所有场景生效
 *   2. 规则 scenes 非空 → 仅当 query.scene 在列表中时生效
 *   3. 场景覆盖 sceneOverrides → 高频功能场景覆盖时尚规则
 * 
 * 用法：
 *   import { getRulesForQuery } from './rules';
 *   const rules = getRulesForQuery({
 *     gender: 'female', bodyShape: '梨形', season: '春', scene: '骑行',
 *   });
 */

import { StyleRule, RuleSet, Category, RuleCondition, RuleType, Scene, BodyShape, Season, RuleQuery, FormulaQuery, HackQuery, BodyDetailQuery, OutfitFormula, StylingHack, BodyDetailRule } from './types';
import { categories, categoryMap, categoryGroups, parentMap } from './categories';
import { colorRules } from './color';
import { silhouetteRules } from './silhouette';
import { occasionRules } from './occasion';
import { bodyShapeRules } from './body_shape';
import { layeringRules } from './layering';
import { materialRules } from './material';
import { formulas } from './formulas';
import { stylingHacks } from './styling_hacks';
import { bodyDetailRules } from './body_details';

/** 聚合所有规则 */
const allRules: StyleRule[] = [
  ...colorRules,
  ...silhouetteRules,
  ...occasionRules,
  ...bodyShapeRules,
  ...layeringRules,
  ...materialRules,
];

/** 规则库完整对象 */
export const ruleSet: RuleSet = {
  version: '1.2.0',
  updatedAt: '2026-05-22',
  categories,
  rules: allRules,
  formulas,
  stylingHacks,
  bodyDetailRules,
};

/** 按模块获取规则 */
export function getRulesByModule(module: StyleRule['module']): StyleRule[] {
  return allRules.filter(r => r.module === module);
}

/**
 * 查询接口：产品和 AI 调用的核心方法
 * 
 * 场景匹配（精确）：
 *   - 规则.scenes 为空 → 通用规则，所有场景生效
 *   - 规则.scenes 非空 → 仅 query.scene 在其中时生效
 * 
 * 场景覆盖（sceneOverrides）：
 *   - 规则声明了 sceneOverrides → 在指定场景下修改规则行为
 *   - suppress：完全移除规则
 *   - downgrade：must→prefer, avoid→prefer
 *   - upgrade：prefer→must
 */
export function getRulesForQuery(query: RuleQuery): StyleRule[] {
  // ===== 1. 基础过滤 =====
  let rules = allRules;

  // 性别
  if (query.gender) {
    rules = rules.filter(r => r.gender === query.gender || r.gender === 'unisex');
  }

  // 季节
  const season = query.season;
  if (season) {
    rules = rules.filter(r => r.season.includes(season));
  }

  // 身型
  const bodyShape = query.bodyShape;
  if (bodyShape) {
    rules = rules.filter(r =>
      !r.bodyShape || r.bodyShape.length === 0 || r.bodyShape.includes(bodyShape)
    );
  }

  // ===== 2. 场景精确匹配 =====
  const scene = query.scene;
  if (scene) {
    rules = rules.filter(r => {
      // 通用规则：scenes 为空，所有场景生效
      if (r.scenes.length === 0) return true;
      // 场景专属规则：scenes 包含查询场景才生效
      return r.scenes.includes(scene);
    });
  }

  // ===== 3. 场景覆盖（sceneOverrides） =====
  if (query.scene) {
    const overriddenIds = new Set<string>();
    const overriddenRules: StyleRule[] = [];

    for (const rule of rules) {
      if (!rule.sceneOverrides || rule.sceneOverrides.length === 0) continue;

      // 查找匹配当前场景的 override
      const override = rule.sceneOverrides.find(o => o.scene === scene);
      if (!override) continue;

      switch (override.action) {
        case 'suppress':
          // 完全移除该规则
          overriddenIds.add(rule.id);
          break;

        case 'downgrade':
          overriddenIds.add(rule.id);
          overriddenRules.push({
            ...rule,
            id: rule.id + '_downgraded',
            type: override.overrideType || 'prefer',
            desc: rule.desc + ` （${override.reason}）`,
          });
          break;

        case 'upgrade':
          overriddenIds.add(rule.id);
          overriddenRules.push({
            ...rule,
            id: rule.id + '_upgraded',
            type: override.overrideType || 'must',
            desc: rule.desc + ` （${override.reason}）`,
          });
          break;
      }
    }

    // 移除被 suppress 的原规则
    rules = rules.filter(r => !overriddenIds.has(r.id));
    // 加入被 downgrade/upgrade 的新规则
    rules = [...rules, ...overriddenRules];
  }

  // ===== 4. 模块过滤 =====
  if (query.modules && query.modules.length > 0) {
    rules = rules.filter(r => query.modules!.includes(r.module));
  }

  // ===== 5. 标签匹配 =====
  if (query.tags && query.tags.length > 0) {
    rules = rules.filter(r =>
      query.tags!.some(t => r.tags.some(rt => rt.includes(t)))
    );
  }

  // ===== 6. 硬规则 =====
  if (query.hardOnly) {
    rules = rules.filter(r => r.type === 'must' || r.type === 'avoid');
  }

  // ===== 7. 排序 =====
  if (query.sortByPriority !== false) {
    rules = [...rules].sort((a, b) => b.priority - a.priority);
  }

  return rules;
}

/**
 * 按场景分组返回规则，方便前端按模块展示
 */
export function getRulesGroupedForQuery(query: RuleQuery) {
  const rules = getRulesForQuery(query);

  return {
    must: rules.filter(r => r.type === 'must'),
    avoid: rules.filter(r => r.type === 'avoid'),
    prefer: rules.filter(r => r.type === 'prefer'),
    all: rules,
    count: rules.length,
  };
}

// ===== 穿搭公式查询 =====

export function getFormulas(query: FormulaQuery): OutfitFormula[] {
  let result = formulas;

  const gender = query.gender;
  if (gender) {
    result = result.filter(f => f.gender === gender || f.gender === 'unisex');
  }
  const season = query.season;
  if (season) {
    result = result.filter(f => f.season.includes(season));
  }
  const scene = query.scene;
  if (scene) {
    result = result.filter(f => f.scenes.length === 0 || f.scenes.includes(scene));
  }
  const bodyShape = query.bodyShape;
  if (bodyShape) {
    result = result.filter(f => !f.bodyShape || f.bodyShape.length === 0 || f.bodyShape.includes(bodyShape));
  }
  if (query.style) {
    result = result.filter(f => f.style === query.style);
  }
  if (query.maxDifficulty) {
    const max = query.maxDifficulty;
    result = result.filter(f => f.difficulty <= max);
  }

  return result;
}

// ===== 穿搭技巧查询 =====

export function getStylingHacks(query: HackQuery): StylingHack[] {
  let result = stylingHacks;

  const gender = query.gender;
  if (gender) {
    result = result.filter(h => h.gender === gender || h.gender === 'unisex');
  }
  const scene = query.scene;
  if (scene) {
    result = result.filter(h => !h.scenes || h.scenes.length === 0 || h.scenes.includes(scene));
  }
  const bodyShape = query.bodyShape;
  if (bodyShape) {
    result = result.filter(h => !h.bodyShape || h.bodyShape.length === 0 || h.bodyShape.includes(bodyShape));
  }
  if (query.category) {
    result = result.filter(h => h.category === query.category);
  }

  return result;
}

// ===== 身体特征查询 =====

export function getBodyDetailRules(query: BodyDetailQuery): BodyDetailRule[] {
  let result = bodyDetailRules;

  if (query.gender) {
    result = result.filter(r => r.gender === query.gender || r.gender === 'unisex');
  }
  if (query.traits && query.traits.length > 0) {
    result = result.filter(r => query.traits!.includes(r.trait));
  }
  if (query.category) {
    result = result.filter(r => r.category === query.category);
  }

  return result;
}

/** 获取规则统计 */
export function getStats() {
  const byModule = {} as Record<string, number>;
  const byType = { must: 0, avoid: 0, prefer: 0 };
  const byGender = { male: 0, female: 0, unisex: 0 };
  let withScenes = 0;
  let withOverrides = 0;

  for (const r of allRules) {
    byModule[r.module] = (byModule[r.module] || 0) + 1;
    byType[r.type]++;
    byGender[r.gender]++;
    if (r.scenes.length > 0) withScenes++;
    if (r.sceneOverrides && r.sceneOverrides.length > 0) withOverrides++;
  }

  return {
    totalRules: allRules.length,
    totalCategories: categories.length,
    withSceneRules: withScenes,
    withOverrides,
    byModule,
    byType,
    byGender,
  };
}

// 导出所有子模块和类型
export {
  categories, categoryMap, categoryGroups, parentMap,
  colorRules, silhouetteRules, occasionRules,
  bodyShapeRules, layeringRules, materialRules,
  formulas, stylingHacks, bodyDetailRules,
};
export type { StyleRule, RuleSet, Category, RuleCondition, Scene, BodyShape, Season, RuleQuery, OutfitFormula, FormulaQuery, StylingHack, HackQuery, BodyDetailRule, BodyDetailQuery,
  OutfitItem, UserProfile, EvaluationResult, RuleResult };

// ═══════════════════════════════════════
// 搭配评估引擎
// ═══════════════════════════════════════

import { OutfitItem, UserProfile, EvaluationResult, RuleResult, Fit, Length } from './types';

// ── 计算字段 helper ──

/** hex → HSL */
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  let r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? ((b - r) / d + 2) : ((r - g) / d + 4);
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** 明度→中文 */
function lightnessLabel(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return '中';
  return hsl.l >= 70 ? '高' : hsl.l <= 35 ? '低' : '中';
}

/** 饱和度→中文 */
function saturationLabel(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return '中';
  return hsl.s >= 60 ? '高' : hsl.s <= 25 ? '低' : '中';
}

/** 色系判断 */
function colorFamily(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return '中性色';
  const h = hsl.h, s = hsl.s, l = hsl.l;
  if (s <= 10) return l >= 90 ? '白色系' : l <= 15 ? '黑色系' : '灰色系';
  if (s <= 25 && (h < 40 || h > 200)) return '中性色';
  if (h <= 25 || h >= 330) return '红色系';
  if (h <= 45) return '橙色系';
  if (h <= 70) return '黄色系';
  if (h <= 155) return '绿色系';
  if (h <= 200) return '蓝色系';
  if (h <= 270) return '紫色系';
  return '粉色系';
}

/** 材质→厚度 */
function materialThickness(mat: string): string {
  const thick = ['羊毛','羊绒','羽绒','灯芯绒','粗花呢','皮革','皮质','皮','麂皮','毛呢','摇粒绒'];
  const thin = ['真丝','丝绸','雪纺','薄纱','蕾丝','亚麻','麻','莫代尔','天丝'];
  const m = mat.toLowerCase();
  if (thick.some(t => m.includes(t))) return '厚';
  if (thin.some(t => m.includes(t))) return '薄';
  return '中';
}

/** 材质→光泽 */
function materialSheen(mat: string): string {
  const shiny = ['真丝','丝绸','缎面','漆皮','丝绒','天鹅绒','亮片'];
  const m = mat.toLowerCase();
  if (shiny.some(s => m.includes(s))) return '光泽';
  return '哑光';
}

// ── 品类→父级映射 ──
function getParent(categoryId: string): string {
  const cat = categoryMap[categoryId];
  return cat ? cat.parent : '';
}

// ── 单品属性查找表构建 ──
function buildItemProps(item: OutfitItem): Record<string, string> {
  const props: Record<string, string> = {};
  const cat = categoryMap[item.categoryId];
  const parent = cat ? cat.parent : '';
  const name = cat ? cat.name : item.categoryId;

  // 版型：优先用户指定 → 默认值取第一个
  const fit = item.attrs?.版型 || (cat?.commonFits?.[0]);
  if (fit) {
    props['版型'] = fit;
    if (parent) props[parent + '.版型'] = fit;
    if (name) props[name + '.版型'] = fit;
    props[item.categoryId + '.版型'] = fit;
  }

  // 长度推断
  let length = item.attrs?.长度;
  if (!length) {
    if (item.categoryId.includes('shorts') || item.categoryId.includes('tank')) length = '短款';
    else if (item.categoryId.includes('coat') || item.categoryId.includes('trench') || item.categoryId.includes('puffer')) length = '中长';
    else length = '常规';
  }
  props['长度'] = length;
  if (parent) props[parent + '.长度'] = length;

  // 领口推断
  let neckline = item.attrs?.领口;
  if (!neckline) {
    if (item.categoryId.includes('turtleneck')) neckline = '高领';
    else if (item.categoryId.includes('vneck')) neckline = 'V领';
    else if (item.categoryId.includes('crew')) neckline = '圆领';
    else if (item.categoryId.includes('shirt') && !item.categoryId.includes('tshirt')) neckline = '翻领';
    else if (item.categoryId.includes('tank')) neckline = '吊带';
  }
  if (neckline) {
    props['领口'] = neckline;
    if (parent) props[parent + '.领口'] = neckline;
  }

  // 颜色
  if (item.attrs?.hex) {
    props['颜色.hex'] = item.attrs.hex;
    props['颜色.色系'] = colorFamily(item.attrs.hex);
    props['颜色.明度'] = lightnessLabel(item.attrs.hex);
    props['颜色.饱和度'] = saturationLabel(item.attrs.hex);
  }
  if (item.attrs?.颜色名) {
    props['颜色'] = item.attrs.颜色名;
  }

  // 材质
  if (item.attrs?.材质) {
    props['材质'] = item.attrs.材质;
    props['材质.厚度'] = materialThickness(item.attrs.材质);
    props['材质.光泽'] = materialSheen(item.attrs.材质);
    if (parent) props[parent + '.材质'] = item.attrs.材质;
  }

  // 品类信息
  props['品类'] = item.categoryId;
  props['品类名'] = name;
  props['分类'] = parent;

  return props;
}

// ── 条件匹配 ──
function matchCondition(
  cond: { field: string; op: string; value: string | string[] | number[] },
  outfitProps: Record<string, string>[],
  globalProps: Record<string, string>,
): boolean {
  const { field, op, value } = cond;

  // 全局字段（全身色块数量等）
  if (field.startsWith('全身.')) {
    const key = field.replace('全身.', '');
    const actual = globalProps[key];
    if (!actual) return true; // 无法计算 → 默认通过
    if (op === 'eq') return actual === String(value);
    if (op === 'between') {
      const [lo, hi] = (value as string[]).map(Number);
      const n = Number(actual);
      return n >= lo && n <= hi;
    }
    return true;
  }

  // 搭配级字段（层数等）
  if (field.startsWith('搭配.')) {
    const key = field.replace('搭配.', '');
    const actual = globalProps[key];
    if (!actual) return true;
    return actual === String(value);
  }

  // 用户字段
  if (field.startsWith('用户.')) {
    return true; // 用户信息已在 getRulesForQuery 过滤，此处不需要重复匹配
  }

  // 单品级字段：遍历所有单品，任一匹配即通过
  for (const props of outfitProps) {
    const actual = props[field];
    if (!actual) continue;
    if (op === 'eq' && actual === String(value)) return true;
    if (op === 'neq') {
      if (actual === String(value)) return false; // 任一违反即不通过
      continue;
    }
    if (op === 'in') {
      const vals = value as string[];
      if (vals.some(v => actual.includes(v))) return true;
    }
    if (op === 'not_in') {
      const vals = value as string[];
      if (vals.some(v => actual.includes(v))) return false;
      continue;
    }
  }

  // 多条件 AND：所有条件都通过才算通过
  return op === 'neq' || op === 'not_in'; // 到达这里说明没命中任何单品，neq/not_in 算通过
}

// ── 主评估函数 ──

export function evaluateOutfit(
  outfit: OutfitItem[],
  profile: UserProfile,
  options: { season: Season; scene?: Scene },
): EvaluationResult {
  const { season, scene } = options;

  // 1. 获取适用规则
  const rules = getRulesForQuery({
    gender: profile.gender,
    bodyShape: profile.bodyShape,
    season,
    scene,
  });

  // 2. 构建单品属性表
  const outfitProps = outfit.map(item => buildItemProps(item));

  // 3. 计算全局属性
  const globalProps: Record<string, string> = {};
  // 全身色块数量（去重颜色）
  const uniqueColors = new Set(outfit.flatMap(item => {
    const color = item.attrs?.hex ? colorFamily(item.attrs.hex) : (item.attrs?.颜色名 || '');
    return color ? [color] : [];
  }));
  // 排除黑白灰（三色法则不算黑白灰）
  const nonNeutralColors = [...uniqueColors].filter(c =>
    !['白色系','黑色系','灰色系','中性色'].includes(c)
  );
  globalProps['色块数量'] = String(nonNeutralColors.length);

  // 全身高饱和单品数量
  let highSatCount = 0;
  for (const item of outfit) {
    if (item.attrs?.hex) {
      const hsl = hexToHsl(item.attrs.hex);
      if (hsl && hsl.s >= 60) highSatCount++;
    }
  }
  globalProps['高饱和单品数量'] = String(highSatCount);

  // 全身光泽单品数量
  let sheenCount = 0;
  for (const item of outfit) {
    if (item.attrs?.材质 && materialSheen(item.attrs.材质) === '光泽') sheenCount++;
  }
  globalProps['光泽单品数量'] = String(sheenCount);

  // 全身纹理单品数量（有图案/非纯色）
  let patternCount = 0;
  for (const item of outfit) {
    if (item.attrs?.图案 && item.attrs.图案 !== '纯色') patternCount++;
  }
  globalProps['纹理单品数量'] = String(patternCount);

  // 全身皮革单品数量
  let leatherCount = 0;
  for (const item of outfit) {
    const mat = item.attrs?.材质 || '';
    if (mat.includes('皮革') || mat.includes('皮') || mat.includes('漆皮') || mat.includes('麂皮')) leatherCount++;
  }
  globalProps['皮革单品数量'] = String(leatherCount);

  // 全身版型（全部紧身时触发 body_015）
  const allFits = outfitProps.map(p => p['版型']).filter(Boolean);
  const allTight = allFits.length > 0 && allFits.every(f => f === '紧身' || f === '修身');
  globalProps['版型'] = allTight ? '全部紧身' : 'mixed';

  // 全身材质厚度
  const allThicknesses = outfitProps.map(p => p['材质.厚度']).filter(Boolean);
  const uniqueThicknesses = new Set(allThicknesses);
  globalProps['材质厚度'] = uniqueThicknesses.size === 1 ? '全部相同' : 'mixed';

  // 露肤区域计数
  let exposedZones = 0;
  for (const item of outfit) {
    const neckline = outfitProps[outfit.indexOf(item)]['领口'];
    const length = outfitProps[outfit.indexOf(item)]['长度'];
    if (neckline === '吊带' || neckline === '一字肩') exposedZones++;
    if (length === '短款' && getParent(item.categoryId) === '下装') exposedZones++;
  }
  globalProps['露肤区域数量'] = String(exposedZones);

  // 搭配层数
  const layers = new Set(outfit.map(i => getParent(i.categoryId)));
  let layerCount = 0;
  if (layers.has('上衣') || layers.has('内搭')) layerCount++;
  if (layers.has('外套')) layerCount++;
  globalProps['层数'] = String(layerCount);

  // 4. 逐条评估
  const details: RuleResult[] = [];
  const violations: RuleResult[] = [];
  const positives: RuleResult[] = [];

  for (const rule of rules) {
    const conds = Array.isArray(rule.condition) ? rule.condition : [rule.condition];
    const logic = rule.conditionLogic || 'AND';

    let matched = false;
    if (logic === 'AND') {
      matched = conds.every(c => matchCondition(c as any, outfitProps, globalProps));
    } else {
      matched = conds.some(c => matchCondition(c as any, outfitProps, globalProps));
    }

    const result: RuleResult = {
      ruleId: rule.id,
      rule: rule.rule,
      module: rule.module,
      type: rule.type,
      passed: true,
    };

    if (rule.type === 'must') {
      // must: 条件触发 → 必须满足，否则违反
      // 条件未触发 → 不适用，跳过
      if (matched) {
        // 对must来说，条件匹配 = 规则生效，此时需要检查是否违反
        // 目前must的条件本身就是"应该做什么"，匹配即表示推荐这么做
        // 真正违反的检查：如果条件是"必须X"，但outfit没做到X
        // 简化处理：must条件匹配 = 建议采用，不匹配不算违反
        result.passed = true;
        positives.push(result);
      }
    } else if (rule.type === 'avoid') {
      // avoid: 条件匹配 = 触发了该避免的情况 = 违反
      if (matched) {
        result.passed = false;
        result.reason = `触发应避免的规则：${rule.desc.substring(0, 60)}`;
        violations.push(result);
      }
    } else {
      // prefer: 条件匹配 = 做得对 = 加分
      if (matched) {
        result.passed = true;
        positives.push(result);
      }
    }

    details.push(result);
  }

  // 5. 匹配公式和技巧
  const matchedFormulas: string[] = [];
  const matchedHacks: string[] = [];

  if (scene) {
    const fs = getFormulas({ gender: profile.gender, season, scene });
    for (const f of fs) {
      const slotCount = Object.keys(f.slots).length;
      let matchCount = 0;
      for (const item of outfit) {
        const name = categoryMap[item.categoryId]?.name || '';
        const slots = Object.entries(f.slots).filter(([k, v]) => typeof v === 'string' && (v as string).includes(name));
        matchCount += slots.length;
      }
      if (matchCount >= Math.max(1, slotCount / 2)) {
        matchedFormulas.push(`${f.name} (难度${f.difficulty})`);
      }
    }

    const hs = getStylingHacks({ gender: profile.gender, scene });
    matchedHacks.push(...hs.slice(0, 3).map(h => h.name));
  }

  // 6. 计算分数
  const baseScore = 70;
  const avoidPenalty = violations.filter(v => v.type === 'avoid').length * 5;
  const preferBonus = Math.min(positives.filter(p => p.type === 'prefer').length, 15);
  const score = Math.max(0, Math.min(100, baseScore - avoidPenalty + preferBonus));

  // 7. 生成建议
  const suggestions: string[] = [];
  for (const v of violations) {
    suggestions.push(`⚠️ ${v.rule}: ${v.reason?.replace('触发应避免的规则：', '')}`);
  }
  if (violations.length === 0) {
    suggestions.push('✅ 未触发任何应避免的规则');
  }
  if (preferBonus >= 10) {
    suggestions.push(`👍 命中了${preferBonus}条推荐规则，搭配完成度高`);
  }
  if (matchedFormulas.length > 0) {
    suggestions.push(`👗 接近的穿搭公式：${matchedFormulas.join('；')}`);
  }

  return {
    score,
    baseScore,
    passed: positives.length,
    violations,
    positives,
    suggestions,
    formulas: matchedFormulas,
    hacks: matchedHacks,
    details,
  };
}
