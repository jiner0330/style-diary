/**
 * 流行趋势 - 2026春夏流行风格
 * 
 * ⚠️ 数据来源：训练数据中的风格趋势知识
 *   建议用 Lyst Index / 小红书年度风格报告 / TikTok趋势标签 校对更新
 */

import { TrendStyle } from './types';

export const trendStyles2026SS: TrendStyle[] = [
  {
    name: '波西米亚复兴（Boho 2.0）',
    heat: 10,
    keywords: ['钩针', '流苏', '麂皮', '大地色', '层次叠戴', '印花混搭', '宽松廓形'],
    origin: 'Chloé SS26 秀场由 Chemena Kamali 执掌后的方向性重塑，引发整个行业的波西米亚回潮',
    icons: ['Chloé', 'Isabel Marant', 'Sienna Miller', 'Zoë Kravitz'],
    confidence: 'model_inference',
    source: '训练数据 — 多品牌秀场 + 社交媒体共振',
  },
  {
    name: '办公室妖姬（Office Siren）',
    heat: 9,
    keywords: ['紧身铅笔裙', '解开3颗扣的衬衫', '细框眼镜', '尖头小猫跟', '黑色/深蓝/灰色调', '蕾丝内衣式内搭'],
    origin: 'TikTok 原生风格标签，从2024-25发酵至主流。Miu Miu / Prada / Saint Laurent的办公室场景造型推波助澜',
    icons: ['Miu Miu', 'Prada', 'Bella Hadid', 'Gabbriette'],
    confidence: 'model_inference',
    source: '训练数据 — TikTok + 多品牌办公室主题秀场',
  },
  {
    name: '安静的奢华 2.0（Quiet Luxury）',
    heat: 8,
    keywords: ['无logo', '顶级面料', '灰/米/黑/藏蓝', '极简剪裁', '羊绒', '丝绸', '无品牌辨识度的质感'],
    origin: '从 Succession/The Row 美学延续，2026版更强调廓形而非仅仅面料——极简但雕塑感',
    icons: ['The Row', 'Loro Piana', 'Khaite', 'Brunello Cucinelli'],
    confidence: 'model_inference',
    source: '训练数据 — Quiet Luxury 多季持续演变',
  },
  {
    name: '山系/机能风（Gorpcore）',
    heat: 8,
    keywords: ['冲锋衣', '工装裤', '多口袋', '户外凉鞋', 'Salomon', 'Arc\'teryx', '渔夫帽', '尼龙面料'],
    origin: '户外品牌日常化 + 城市人对功能性的审美疲劳反弹——把登山装备穿进咖啡馆',
    icons: ['Arc\'teryx', 'Salomon', 'The North Face', 'and wander'],
    goodFor: ['H形', '倒三角'],
    confidence: 'model_inference',
    source: '训练数据 — Gorpcore多季主流化趋势',
  },
  {
    name: '运动学院风（Sporty Prep）',
    heat: 7,
    keywords: ['Polo衫', '百褶裙', '棒球帽', '网球裙', '白色中筒袜', '复古运动鞋', '条纹滚边'],
    origin: 'Miu Miu / Gucci 对学院风的运动化改造 + 网球core/Tenniscore的社交媒体热度',
    icons: ['Miu Miu', 'Gucci', 'Wales Bonner', 'Zendaya（Challengers宣传造型）'],
    confidence: 'model_inference',
    source: '训练数据 — 运动+学院跨界趋势',
  },
  {
    name: '90年代极简主义回归',
    heat: 8,
    keywords: ['细吊带连衣裙', '宽松西装', '白T+牛仔裤', '极简配饰', '中性色', 'Calvin Klein式审美'],
    origin: '整个90年代时尚偶像（Carolyn Bessette-Kennedy / Kate Moss）的审美循环回归',
    icons: ['Calvin Klein 90s', 'Jil Sander', 'Carolyn Bessette-Kennedy', 'Kendall Jenner'],
    confidence: 'model_inference',
    source: '训练数据 — 90年代风格周期性回归',
  },
  {
    name: '新中式 3.0',
    heat: 8,
    keywords: ['立领', '盘扣', '马面裙', '香云纱', '宋锦', '水墨印花', '东方廓形+现代剪裁'],
    origin: '中国本土设计师品牌（Uma Wang / Ms Min / Samuel Guì Yang）+ 国际市场对中国元素的重新理解',
    icons: ['Uma Wang', 'Ms Min', 'Samuel Guì Yang', 'Ziggy Chen', '小红书博主生态'],
    confidence: 'model_inference',
    source: '训练数据 — 新中式多季持续升温',
  },
  {
    name: '辣妹风进化（Y2K → Indie Sleaze）',
    heat: 7,
    keywords: ['低腰裤', '复古T恤', '做旧皮夹克', '烟熏妆', '宽松牛仔裤', '匡威/马丁靴'],
    origin: 'Y2K审美疲劳后向2000年代后期的邋遢摇滚/独立音乐场景的回归',
    icons: ['早期的Kate Moss', 'Alexa Chung', 'The Strokes MV造型'],
    confidence: 'model_inference',
    source: '训练数据 — Y2K后风格迭代',
  },
];
