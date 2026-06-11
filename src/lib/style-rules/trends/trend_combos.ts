/**
 * 流行趋势 - 2026春夏当季热门搭配
 * 
 * ⚠️ 数据来源：训练数据 + 时装周街拍趋势知识
 *   每条搭配标记了被目击的场景和信源
 *   建议用小红书/Pinterest/TikTok流行搭配 校对补充
 */

import { TrendCombo } from './types';

export const trendCombos2026SS: TrendCombo[] = [
  {
    slots: {
      上装: '白色修身吊带/背心',
      外套: '宽肩oversized西装（灰/黑/卡其）',
      下装: '拖地阔腿牛仔裤',
      鞋: '渔网芭蕾鞋或尖头猫跟鞋',
      包: '超大软皮托特包',
      配饰: ['金色细框眼镜', '金属大圈耳环'],
    },
    heat: '🔥🔥🔥',
    spotted: '时装周街拍高频 / 小红书/Instagram博主标配',
    scenes: ['职场通勤', '周末brunch', '逛街', '约会'],
    confidence: 'model_inference',
    source: '训练数据 — 宽肩西装+拖地牛仔裤=2026最强街拍公式',
  },
  {
    slots: {
      上装: 'Polo衫（修身短款/针织）',
      下装: '百褶超短裙',
      鞋: '白色中筒袜 + 复古运动鞋',
      配饰: ['棒球帽', '斜挎小包'],
    },
    heat: '🔥🔥🔥',
    spotted: 'Miu Miu SS26秀场 / TikTok tennis-core / 小红书学院风',
    scenes: ['日常休闲', '逛街', '周末brunch'],
    confidence: 'model_inference',
    source: '训练数据 — Miu Miu领衔的运动学院风公式',
  },
  {
    slots: {
      上装: '透视薄纱罩衫',
      上装_内: '黑色抹胸/修身背心',
      下装: '百慕大短裤（西装面料）',
      鞋: '渔夫凉鞋或厚底人字拖',
      包: '草编大托特',
    },
    heat: '🔥🔥🔥',
    spotted: 'Saint Laurent / Dior SS26秀场 + 南法度假博主',
    scenes: ['度假', '周末brunch', '逛街'],
    confidence: 'model_inference',
    source: '训练数据 — 透视层+百慕大裤=2026夏日核心公式',
  },
  {
    slots: {
      连衣裙: '钩针/镂空蕾丝连衣裙',
      鞋: '棕色平底皮凉鞋或牛仔靴',
      包: '草编包或棕色麂皮斜挎包',
      配饰: ['草帽', '层层叠戴的金色项链', '墨镜'],
    },
    heat: '🔥🔥',
    spotted: 'Chloé SS26秀场 / Coachella 2026街拍 / 地中海度假博主',
    scenes: ['度假', '海边', '周末brunch', '约会'],
    confidence: 'model_inference',
    source: '训练数据 — 波西米亚复兴的标志性搭配',
  },
  {
    slots: {
      上装: '解构白衬衫（不对称/超长袖）',
      下装: '缎面/真丝半裙（香槟/橄榄绿/黑）',
      鞋: '尖头小猫跟',
      配饰: ['细腰带', '细框眼镜'],
    },
    heat: '🔥🔥',
    spotted: 'Office Siren风格博主 / 时装周街拍 / Pinterest',
    scenes: ['职场通勤', '约会', '晚宴'],
    confidence: 'model_inference',
    source: '训练数据 — 解构衬衫+光泽半裙=高级通勤',
  },
  {
    slots: {
      上装: '紧身黑色高领/半高领针织',
      下装: '工装降落伞裤（军绿/卡其/黑）',
      鞋: 'Salomon登山鞋或厚底运动鞋',
      包: '尼龙机能斜挎包',
      配饰: ['棒球帽', '银色配饰'],
    },
    heat: '🔥🔥',
    spotted: 'Gorpcore博主 / 东京/首尔街头 / 小红书山系穿搭',
    scenes: ['日常休闲', '户外', '逛街', '书店咖啡馆独处'],
    confidence: 'model_inference',
    source: '训练数据 — Gorpcore都市化核心公式',
  },
  {
    slots: {
      上装: '纯白T恤（重磅棉）',
      下装: '深蓝直筒牛仔裤',
      鞋: '渔网芭蕾鞋（银色/黑色）',
      包: '麂皮棕色斜挎包',
      配饰: ['金色叠戴项链', '墨镜', '棕色皮带'],
    },
    heat: '🔥🔥',
    spotted: '90年代极简博主 / 法式穿搭博主 / 全天候生活场景',
    scenes: ['日常休闲', '周末brunch', '逛街', '书店咖啡馆独处'],
    confidence: 'model_inference',
    source: '训练数据 — 90年代极简的当代版本',
  },
  {
    slots: {
      上装: '修身开襟针织衫（只系中间一粒扣）',
      上装_内: '蕾丝内衣式吊带',
      下装: '黑色铅笔裙（及膝或过膝）',
      鞋: '黑色尖头细高跟',
      包: '黑色小号手拿/肩背两用包',
      配饰: ['极细金项链', '细框眼镜'],
    },
    heat: '🔥🔥',
    spotted: 'Office Siren博主 / Prada秀场 / 约会穿搭',
    scenes: ['约会', '晚宴', '派对'],
    confidence: 'model_inference',
    source: '训练数据 — Office Siren晚间版',
  },
  {
    slots: {
      上装: '全黑修身T恤/高领',
      下装: '拖地阔腿裤（黑色或炭灰）',
      鞋: '厚底乐福鞋或黑色尖头鞋',
      包: '黑色大号托特',
      配饰: ['银色夸张耳饰', '银色手表'],
    },
    heat: '🔥',
    spotted: 'Quiet Luxury博主 / 纽约/巴黎街头 / 极简穿搭',
    scenes: ['职场通勤', '晚宴', '约会'],
    confidence: 'model_inference',
    source: '训练数据 — 全黑极简一直是王牌公式',
  },
  {
    slots: {
      上装: '橄榄绿/卡其色工装衬衫（敞穿）',
      上装_内: '白色修身背心',
      下装: '宽松浅蓝直筒牛仔裤',
      鞋: '棕色工装靴或复古运动鞋',
      配饰: ['棕色皮带', '帆布托特包', '棒球帽'],
    },
    heat: '🔥',
    spotted: '日杂/山系博主 / 周末逛街 / 城市周边户外',
    scenes: ['日常休闲', '户外', '逛街'],
    confidence: 'model_inference',
    source: '训练数据 — 日系山系日常化公式',
  },
];
