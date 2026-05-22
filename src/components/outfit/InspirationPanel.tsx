"use client"

interface Props {
  sceneName?: string
  storyText?: string
  moodTags?: string[]
}

export default function InspirationPanel({ sceneName, storyText, moodTags }: Props) {
  return (
    <div className="h-full flex flex-col p-4 bg-soft-white/80 border-l border-warm-gray/20">
      {/* 场景信息 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-charcoal">场景灵感</h3>

        {sceneName && (
          <div className="text-xs text-rose font-medium">{sceneName}</div>
        )}

        {moodTags && moodTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {moodTags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-cream/50 text-[10px] text-warm-gray"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {storyText && (
          <p className="text-[11px] text-warm-gray leading-relaxed line-clamp-6">
            {storyText}
          </p>
        )}

        <div className="border-t border-warm-gray/20 pt-3">
          <p className="text-[11px] text-warm-gray/60 leading-relaxed">
            <span className="text-rose/60">💡 配色灵感</span>
            <br />
            这个场景适合莫兰迪色系，柔和不抢眼但有质感。试试玫瑰粉 + 雾霾蓝的组合。
          </p>
        </div>

        <div className="border-t border-warm-gray/20 pt-3">
          <p className="text-[11px] text-warm-gray/60 leading-relaxed">
            <span className="text-rose/60">👗 搭搭提示</span>
            <br />
            不确定怎么搭？先让搭搭给你 3 套方案作为起点，在此基础上自由修改。
          </p>
        </div>
      </div>
    </div>
  )
}
