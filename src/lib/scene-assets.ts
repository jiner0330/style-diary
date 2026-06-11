/**
 * 场景素材映射 — 插画和音频的本地路径
 * 数据库 scenes 表暂不支持直接写入时，由此文件补全 illustration_url 和 ambient_sound_url
 */

interface SceneAsset {
  illustration_url: string
  ambient_sound_url: string | null
}

const SCENE_ASSETS: Record<string, SceneAsset> = {
  "周末 brunch": {
    illustration_url: "/scenes/weekend-brunch.png",
    ambient_sound_url: "/scenes/weekend-brunch.m4a",
  },
  "书店咖啡馆独处": {
    illustration_url: "/scenes/bookstore-cafe.png",
    ambient_sound_url: "/scenes/bookstore-cafe.m4a",
  },
  "重要汇报日": {
    illustration_url: "/scenes/presentation-day.png",
    ambient_sound_url: "/scenes/presentation-day.m4a",
  },
  "第一次约会": {
    illustration_url: "/scenes/first-date.png",
    ambient_sound_url: "/scenes/first-date.m4a",
  },
  "一个人看展": {
    illustration_url: "/scenes/solo-exhibition.png",
    ambient_sound_url: "/scenes/solo-exhibition.m4a",
  },
  "三天海边旅行": {
    illustration_url: "/scenes/beach-trip.png",
    ambient_sound_url: "/scenes/beach-trip.m4a",
  },
  "前任会出现的聚会": {
    illustration_url: "/scenes/ex-party.png",
    ambient_sound_url: "/scenes/ex-party.m4a",
  },
}

export function enrichScene<T extends { name: string; illustration_url: string | null; ambient_sound_url: string | null }>(scene: T): T {
  const asset = SCENE_ASSETS[scene.name]
  if (!asset) return scene
  return {
    ...scene,
    illustration_url: scene.illustration_url || asset.illustration_url,
    ambient_sound_url: scene.ambient_sound_url || asset.ambient_sound_url,
  }
}
