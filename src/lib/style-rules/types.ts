/**
 * 穿搭规则库 - 共享类型定义
 */

/** 规则类型 */
export type RuleType = 'must' | 'avoid' | 'prefer';

/** 适用性别 */
export type Gender = 'male' | 'female' | 'unisex';

/** 季节 */
export type Season = '春' | '夏' | '秋' | '冬';

/**
 * 场景（精确匹配用）
 * 每条规则通过 scenes 字段声明自己适用于哪些场景
 * scenes 为空 = 通用规则，所有场景生效
 */
export type Scene =
  | '职场通勤' | '面试' | '正式商务'
  | '约会' | '晚宴' | '酒会' | '派对' | '前男友聚会'
  | '日常休闲' | '周末' | '逛街' | '周末brunch'
  | '书店咖啡馆独处'
  | '运动' | '健身' | '户外' | '徒步' | '骑行'
  | '度假' | '旅行' | '海边' | '城市旅行'
  | '婚礼';

/**
 * 场景覆盖规则
 * 当用户处于特定场景时，某些通用时尚规则需要被覆盖
 * 
 * 例子：骑行场景下，"梨形 avoid 紧身裤" → suppress（骑行裤是功能刚需）
 */
export interface SceneOverride {
  /** 触发覆盖的场景 */
  scene: Scene;
  /** 动作 */
  action: 'suppress' |   // 完全忽略该规则
          'downgrade' |  // 降级：must→prefer, avoid→prefer
          'upgrade';     // 升级：prefer→must
  /** 覆盖后的类型（downgrade/upgrade 时必填） */
  overrideType?: RuleType;
  /** 覆盖理由 */
  reason: string;
}

/** 单品品类 ID */
export type CategoryId = string;

/** 版型 */
export type Fit = '紧身' | '修身' | '合身' | '宽松' | 'oversized';

/** 长度 */
export type Length = '短款' | '常规' | '中长' | '长款';

/** 风格标签 */
export type StyleTag =
  | '休闲' | '通勤' | '街头' | '复古' | '极简'
  | '法式' | '甜美' | '甜酷' | '运动' | '学院' | '日系'
  | '韩系' | '美式' | '商务' | '轻熟' | '森系'
  | '工装' | '机能' | '暗黑' | '清新' | '性感'
  | '文艺' | '老钱' | '波西米亚';

/** 身型 */
export type BodyShape = '梨形' | '苹果形' | '沙漏形' | 'H形' | '倒三角';

/** 条件操作符 */
export type ConditionOp = 'eq' | 'neq' | 'in' | 'not_in' | 'between';

/** 规则条件 */
export interface RuleCondition {
  /** 目标属性路径，如 "上装.版型" "颜色.饱和度" */
  field: string;
  /** 操作符 */
  op: ConditionOp;
  /** 期望值 */
  value: string | string[] | number[];
}

/** 单品品类节点 */
export interface Category {
  id: CategoryId;
  name: string;
  /** 父级分类 */
  parent: '上衣' | '下装' | '外套' | '连衣裙' | '鞋履' | '配饰' | '套装';
  /** 二级子类名 */
  subCategory?: string;
  /** 默认版型 */
  commonFits: Fit[];
  /** 可搭配品类 */
  pairsWith: CategoryId[];
  /** 常见材质 */
  commonMaterials: string[];
  /** 适用季节 */
  seasons: Season[];
}

/** 单条穿搭规则 */
export interface StyleRule {
  /** 唯一标识 */
  id: string;
  /** 规则所属模块 */
  module: 'color' | 'silhouette' | 'occasion' | 'body_shape' | 'layering' | 'material';
  /** 规则名（简短） */
  rule: string;
  /** 规则说明 */
  desc: string;
  /** 条件 */
  condition: RuleCondition | RuleCondition[];
  /** 条件组合逻辑，多条件时使用 */
  conditionLogic?: 'AND' | 'OR';
  /** 规则类型 */
  type: RuleType;
  /** 适用性别 */
  gender: Gender;
  /** 优先级 1-10，10 最高 */
  priority: number;
  /** 适用季节 */
  season: Season[];
  /**
   * 适用场景。空数组 = 通用规则（所有场景生效）。
   * 填了场景ID = 仅这些场景生效。
   */
  scenes: Scene[];
  /** 适用身型 */
  bodyShape?: BodyShape[];
  /**
   * 场景覆盖声明：在特定场景下，本规则应被覆盖。
   * 注意——这是规则主动声明"我在某场景下失效"，
   * 而非外部查询时硬编码覆盖逻辑。
   */
  sceneOverrides?: SceneOverride[];
  /** 标签 */
  tags: string[];
  /** 穿搭示例 */
  examples: string[];
  /** 冲突规则 ID（互相排斥的规则） */
  conflicts?: string[];
}

/** 规则库聚合 */
export interface RuleSet {
  version: string;
  updatedAt: string;
  categories: Category[];
  rules: StyleRule[];
  formulas: OutfitFormula[];
  stylingHacks: StylingHack[];
  bodyDetailRules: BodyDetailRule[];
}

// ═══════════════════════════════════════
// 新模块类型
// ═══════════════════════════════════════

/** 穿搭公式：经过验证的单品组合 */
export interface OutfitFormula {
  id: string;
  /** 公式名 */
  name: string;
  /** 槽位：部位 → 单品类型。key 可包含 "上装_内" / "上装_外" 等叠穿变体 */
  slots: Record<string, string | string[]>;
  /** 所属风格 */
  style: StyleTag;
  /** 难度 1-5 */
  difficulty: number;
  /** 适用性别 */
  gender: Gender;
  /** 适用季节 */
  season: Season[];
  /** 适用场景 */
  scenes: Scene[];
  /** 适用身型 */
  bodyShape?: BodyShape[];
  /** 为什么这个组合有效 */
  why: string;
  /** 变体建议 */
  variations: string[];
  /** 具体搭配示例 */
  example: string;
}

/** 穿搭技巧/作弊码 */
export interface StylingHack {
  id: string;
  /** 技巧名 */
  name: string;
  /** 类别 */
  category: '塞衣角' | '卷袖口' | '挽裤脚' | '配饰' | '腰带' | '衬衫' | '叠穿细节' | '比例调整';
  /** 技巧说明 */
  desc: string;
  /** 适用性别 */
  gender: Gender;
  /** 适用场景 */
  scenes?: Scene[];
  /** 适用身型 */
  bodyShape?: BodyShape[];
  /** 标签 */
  tags: string[];
  /** 示例 */
  examples: string[];
}

/** 细粒度身体特征规则 */
export interface BodyDetailRule {
  id: string;
  /** 特征类别 */
  category: '脖子' | '肩部' | '手臂' | '胸部' | '腰部' | '臀部' | '腿部' | '小腿' | '脚踝' | '身高';
  /** 特征值 */
  trait: string;
  /** 穿搭建议 */
  advice: string;
  /** 推荐（单品/元素） */
  recommend: string[];
  /** 避免 */
  avoid: string[];
  /** 适用性别 */
  gender: Gender;
  /** 标签 */
  tags: string[];
  /** 示例 */
  examples: string[];
}

/** 查询接口 */
export interface RuleQuery {
  gender?: Gender;
  bodyShape?: BodyShape;
  season?: Season;
  /** 场景（精确匹配 scenes 字段） */
  scene?: Scene;
  /** 仅返回 hard 规则 */
  hardOnly?: boolean;
  /** 按优先级排序 */
  sortByPriority?: boolean;
  /** 限定模块 */
  modules?: StyleRule['module'][];
  /** 匹配标签 */
  tags?: string[];
}

/** 穿搭公式查询 */
export interface FormulaQuery {
  gender?: Gender;
  bodyShape?: BodyShape;
  season?: Season;
  scene?: Scene;
  style?: StyleTag;
  /** 难度上限 */
  maxDifficulty?: number;
}

/** 穿搭技巧查询 */
export interface HackQuery {
  gender?: Gender;
  scene?: Scene;
  bodyShape?: BodyShape;
  category?: StylingHack['category'];
}

/** 身体特征查询 */
export interface BodyDetailQuery {
  gender?: Gender;
  /** 特征列表 */
  traits?: string[];
  category?: BodyDetailRule['category'];
}

// ═══════════════════════════════════════
// 搭配评估
// ═══════════════════════════════════════

/** 一套搭配中的单品 */
export interface OutfitItem {
  /** 品类ID */
  categoryId: CategoryId;
  /** 用户自定义属性（覆盖默认推断） */
  attrs?: {
    版型?: Fit;
    长度?: Length;
    领口?: string;
    颜色名?: string;
    hex?: string;
    材质?: string;
    图案?: string;
  };
}

/** 用户画像 */
export interface UserProfile {
  gender: Gender;
  bodyShape?: BodyShape;
  /** 细粒度身体特征（来自 body_detail 查询） */
  traits?: string[];
  /** 肤色 */
  skinTone?: '暖黄皮' | '冷白皮' | '中性皮';
}

/** 单条规则评估结果 */
export interface RuleResult {
  ruleId: string;
  rule: string;
  module: string;
  type: RuleType;
  /** 是否通过（must/avoid 被违反 = false, prefer 不满足不算 fail） */
  passed: boolean;
  /** 违反时的扣分原因 */
  reason?: string;
  /** 匹配到的穿搭公式/技巧 */
  matchedFormula?: string;
  matchedHack?: string;
}

/** 搭配评估结果 */
export interface EvaluationResult {
  /** 总分 0-100 */
  score: number;
  /** 基础分70，加减后 clamp */
  baseScore: number;
  /** 通过的规则数 */
  passed: number;
  /** 违反的规则 */
  violations: RuleResult[];
  /** 通过的规则（prefer满足/must通过） */
  positives: RuleResult[];
  /** 修改建议 */
  suggestions: string[];
  /** 命中穿搭公式 */
  formulas: string[];
  /** 适用穿搭技巧 */
  hacks: string[];
  /** 详细规则结果 */
  details: RuleResult[];
}
