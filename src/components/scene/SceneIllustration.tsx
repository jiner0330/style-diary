"use client"

interface Props {
  name: string
  moodTags: string[]
  variant?: "card" | "full"
  illustrationUrl?: string | null
}

// 根据场景名关键词匹配主题
function detectTheme(name: string, moodTags: string[]): string {
  const text = name + moodTags.join("")
  if (/书店|咖啡|独处|安静|阅读|书/.test(text)) return "cafe"
  if (/海边|旅行|度假|自由|海|浪|沙滩/.test(text)) return "beach"
  if (/约会|晚宴|酒会|派对|聚会|期待|甜蜜|恋人/.test(text)) return "date"
  if (/婚礼/.test(text)) return "wedding"
  if (/职场|通勤|面试|商务|自信|办公|正式/.test(text)) return "work"
  if (/运动|健身|户外|徒步|骑行|活力/.test(text)) return "outdoor"
  if (/日常|周末|逛街|松弛|购物|brunch/.test(text)) return "daily"
  if (/表达|艺术|创作/.test(text)) return "art"
  if (/释然/.test(text)) return "peace"
  return "cafe" // 默认温馨咖啡
}

export default function SceneIllustration({ name, moodTags, variant = "full", illustrationUrl }: Props) {
  const theme = detectTheme(name, moodTags)
  const h = variant === "card" ? "aspect-[3/4]" : "h-64"

  return (
    <div className={`relative w-full ${h} overflow-hidden`}>
      {illustrationUrl ? (
        <>
          <img
            src={illustrationUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* 暖光叠加 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, rgba(250,247,244,0.25) 0%, transparent 70%)",
            }}
          />
        </>
      ) : (
        <>
          {/* 背景渐变 */}
          <BackgroundGradient theme={theme} />
          {/* 插图元素 */}
          <IllustrationElements theme={theme} variant={variant} />
          {/* 暖光叠加 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, rgba(250,247,244,0.3) 0%, transparent 70%)",
            }}
          />
        </>
      )}
    </div>
  )
}

function BackgroundGradient({ theme }: { theme: string }) {
  const gradients: Record<string, string> = {
    cafe: "linear-gradient(180deg, #F5EDE4 0%, #E8DED1 40%, #DDD4C5 100%)",
    beach: "linear-gradient(180deg, #E8F0F8 0%, #D4E4F0 40%, #F5EDE4 100%)",
    date: "linear-gradient(180deg, #F8EBEE 0%, #F2DEE2 40%, #E8DED1 100%)",
    wedding: "linear-gradient(180deg, #F5F0F3 0%, #EDE0E6 40%, #E8DED1 100%)",
    work: "linear-gradient(180deg, #F0F2F3 0%, #E5E8EA 40%, #E8DED1 100%)",
    outdoor: "linear-gradient(180deg, #EEF2ED 0%, #DDE8D5 40%, #E8DED1 100%)",
    daily: "linear-gradient(180deg, #F7F2EC 0%, #EDE5D8 40%, #E8DED1 100%)",
    art: "linear-gradient(180deg, #F3EEF5 0%, #E8DDEF 40%, #E8DED1 100%)",
    peace: "linear-gradient(180deg, #EDF2F2 0%, #DEE8E8 40%, #E8DED1 100%)",
  }
  return (
    <div
      className="absolute inset-0"
      style={{ background: gradients[theme] || gradients.cafe }}
    />
  )
}

function IllustrationElements({
  theme,
  variant,
}: {
  theme: string
  variant: "card" | "full"
}) {
  const scale = variant === "card" ? 0.55 : 1
  const centerX = variant === "card" ? 50 : 50
  const centerY = variant === "card" ? 45 : 50

  return (
    <svg
      viewBox="0 0 400 280"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
      style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
    >
      {theme === "cafe" && <CafeIllustration cx={centerX} cy={centerY} />}
      {theme === "beach" && <BeachIllustration cx={centerX} cy={centerY} />}
      {theme === "date" && <DateIllustration cx={centerX} cy={centerY} />}
      {theme === "wedding" && <WeddingIllustration cx={centerX} cy={centerY} />}
      {theme === "work" && <WorkIllustration cx={centerX} cy={centerY} />}
      {theme === "outdoor" && <OutdoorIllustration cx={centerX} cy={centerY} />}
      {theme === "daily" && <DailyIllustration cx={centerX} cy={centerY} />}
      {theme === "art" && <ArtIllustration cx={centerX} cy={centerY} />}
      {theme === "peace" && <PeaceIllustration cx={centerX} cy={centerY} />}
    </svg>
  )
}

// ─── 温馨咖啡馆 / 书店 ─────────────────────────────────

function CafeIllustration({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx - 200}, ${cy - 140})`}>
      {/* 窗户 */}
      <rect x={260} y={20} width={90} height={110} rx={6} fill="#FAF7F4" opacity={0.6} />
      <rect x={260} y={20} width={90} height={110} rx={6} fill="none" stroke="#C5BFB8" strokeWidth={2} />
      <line x1={305} y1={20} x2={305} y2={130} stroke="#C5BFB8" strokeWidth={1.5} />
      <line x1={260} y1={75} x2={350} y2={75} stroke="#C5BFB8" strokeWidth={1.5} />
      {/* 窗外光 */}
      <circle cx={305} cy={55} r={14} fill="#FFF8E7" opacity={0.5} />

      {/* 书架 */}
      <rect x={30} y={40} width={70} height={120} rx={4} fill="#B8A99A" opacity={0.3} />
      <rect x={30} y={40} width={70} height={4} rx={1} fill="#A09080" opacity={0.5} />
      <rect x={30} y={80} width={70} height={4} rx={1} fill="#A09080" opacity={0.5} />
      <rect x={30} y={120} width={70} height={4} rx={1} fill="#A09080" opacity={0.5} />
      {/* 书架上的书 — 彩色小方块 */}
      {[
        [38, 48, 12, 28, "#C4A8A3"],
        [55, 52, 10, 24, "#B5C1B4"],
        [70, 48, 14, 28, "#A3B5C4"],
        [36, 88, 16, 28, "#D4C5C2"],
        [58, 90, 12, 26, "#B4C1A8"],
        [74, 88, 10, 24, "#C4A8A3"],
        [40, 128, 14, 28, "#A3B5C4"],
        [62, 130, 12, 26, "#B5C1B4"],
      ].map(([bx, by, bw, bh, color], i) => (
        <rect
          key={i}
          x={bx as number}
          y={by as number}
          width={bw as number}
          height={bh as number}
          rx={2}
          fill={color as string}
          opacity={0.7}
        />
      ))}

      {/* 咖啡杯 */}
      <g transform="translate(170, 100)">
        {/* 杯碟 */}
        <ellipse cx={20} cy={32} rx={28} ry={8} fill="#DDD7CE" opacity={0.7} />
        <ellipse cx={20} cy={30} rx={28} ry={8} fill="#FAF7F4" opacity={0.6} />
        {/* 杯身 */}
        <path d="M8 10 L12 28 Q20 32 28 28 L32 10 Z" fill="#E8DED1" opacity={0.8} stroke="#C5BFB8" strokeWidth={0.8} />
        {/* 把手 */}
        <path d="M32 14 Q40 14 40 20 Q40 26 30 24" fill="none" stroke="#C5BFB8" strokeWidth={2} strokeLinecap="round" />
        {/* 咖啡液 */}
        <ellipse cx={20} cy={12} rx={11} ry={4} fill="#8B7355" opacity={0.5} />
        {/* 蒸汽 */}
        {[
          [16, -8],
          [22, -14],
          [18, -20],
        ].map(([sx, sy], i) => (
          <path
            key={i}
            d={`M${sx} 8 Q${(sx as number) - 3} ${(sy as number) / 2} ${sx} ${sy}`}
            fill="none"
            stroke="#C5BFB8"
            strokeWidth={1.2}
            opacity={0.4 + i * 0.15}
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* 阅读沙发 */}
      <g transform="translate(120, 150)">
        <rect x={0} y={0} width={60} height={35} rx={8} fill="#C4A8A3" opacity={0.4} />
        <rect x={-5} y={-8} width={15} height={43} rx={6} fill="#C4A8A3" opacity={0.35} />
        <rect x={50} y={-8} width={15} height={43} rx={6} fill="#C4A8A3" opacity={0.35} />
        {/* 靠枕 */}
        <ellipse cx={15} cy={12} rx={10} ry={8} fill="#D4C5C2" opacity={0.5} />
      </g>

      {/* 台灯 */}
      <g transform="translate(230, 140)">
        <rect x={6} y={20} width={4} height={30} rx={1} fill="#C5BFB8" opacity={0.5} />
        <path d="M2 20 L14 20 L12 8 L4 8 Z" fill="#F5EDE4" opacity={0.6} stroke="#C5BFB8" strokeWidth={0.8} />
        <circle cx={8} cy={8} r={3} fill="#FFF8E7" opacity={0.5} />
      </g>

      {/* 盆栽 */}
      <g transform="translate(80, 150)">
        <rect x={6} y={18} width={8} height={12} rx={1} fill="#C4A8A3" opacity={0.4} />
        <ellipse cx={10} cy={14} rx={10} ry={6} fill="#B5C1B4" opacity={0.5} />
        <ellipse cx={6} cy={10} rx={8} ry={5} fill="#B4C1A8" opacity={0.4} />
        <ellipse cx={14} cy={8} rx={7} ry={5} fill="#A5B1A4" opacity={0.4} />
      </g>

      {/* 柔和点缀光点 */}
      {[
        [300, 140, 2],
        [160, 60, 1.5],
        [340, 90, 1],
        [100, 50, 1.5],
      ].map(([dx, dy, dr], i) => (
        <circle key={`dot-${i}`} cx={dx as number} cy={dy as number} r={dr as number} fill="#FFF8E7" opacity={0.4}>
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur={`${2 + i}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

// ─── 海边 / 旅行 ────────────────────────────────────────

function BeachIllustration({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx - 200}, ${cy - 140})`}>
      {/* 太阳 */}
      <circle cx={320} cy={50} r={30} fill="#F5D5A0" opacity={0.5} />
      <circle cx={320} cy={50} r={22} fill="#FDE8B0" opacity={0.5} />

      {/* 海浪 — 重叠波浪线 */}
      {[0, 1, 2, 3].map((i) => (
        <path
          key={`wave-${i}`}
          d={`M${-10 + i * 15} ${140 + i * 20} Q${50 + i * 20} ${125 + i * 20} ${110 + i * 15} ${140 + i * 20} Q${170 + i * 20} ${155 + i * 20} ${230 + i * 15} ${140 + i * 20} Q${290 + i * 20} ${125 + i * 20} ${350 + i * 15} ${140 + i * 20} Q${390 + i * 10} ${150 + i * 20} ${420} ${140 + i * 20}`}
          fill="none"
          stroke={["#A3C4D4", "#B3D0DE", "#C4DCE8", "#D4E8F0"][i]}
          strokeWidth={3 - i * 0.5}
          opacity={0.6 - i * 0.12}
          strokeLinecap="round"
        />
      ))}

      {/* 沙滩 */}
      <path d="M0 180 Q100 170 200 185 Q300 195 400 180 L400 280 L0 280 Z" fill="#E8DED1" opacity={0.5} />

      {/* 贝壳 */}
      <g transform="translate(90, 190)">
        <path d="M0 4 Q6 -4 12 4 Q6 2 0 4" fill="#FAF7F4" opacity={0.6} stroke="#C5BFB8" strokeWidth={0.5} />
      </g>
      <g transform="translate(280, 200) scale(0.7)">
        <path d="M0 4 Q6 -4 12 4 Q6 2 0 4" fill="#FAF7F4" opacity={0.5} stroke="#C5BFB8" strokeWidth={0.5} />
      </g>

      {/* 椰树 */}
      <g transform="translate(340, 100)">
        <rect x={8} y={10} width={4} height={70} rx={2} fill="#C5BFB8" opacity={0.4} />
        {[-30, -15, 0, 15, 30].map((angle, i) => (
          <path
            key={i}
            d={`M10 15 Q${10 + angle * 1.2} -${10 + i * 8} ${10 + angle} -${5 + i * 10}`}
            fill="none"
            stroke="#B5C1B4"
            strokeWidth={2.5 - i * 0.2}
            opacity={0.5}
            strokeLinecap="round"
          />
        ))}
        {/* 椰子 */}
        <circle cx={12} cy={14} r={3} fill="#C4A8A3" opacity={0.4} />
      </g>

      {/* 海鸟 */}
      <path d="M60 60 Q65 54 70 60" fill="none" stroke="#C5BFB8" strokeWidth={1} opacity={0.4} />
      <path d="M140 40 Q145 34 150 40" fill="none" stroke="#C5BFB8" strokeWidth={1} opacity={0.3} />
    </g>
  )
}

// ─── 约会 / 晚宴 ────────────────────────────────────────

function DateIllustration({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx - 200}, ${cy - 140})`}>
      {/* 柔光背景圈 */}
      <circle cx={200} cy={120} r={100} fill="#F2DEE2" opacity={0.2} />
      <circle cx={200} cy={120} r={70} fill="#F8EBEE" opacity={0.2} />

      {/* 花束 */}
      <g transform="translate(140, 80)">
        {/* 花茎 */}
        {[-8, -3, 2, 7, 12].map((dx, i) => (
          <line key={i} x1={dx} y1={20} x2={dx + 2} y2={55} stroke="#B5C1B4" strokeWidth={1.5} opacity={0.5} />
        ))}
        {/* 包装纸 */}
        <path d="M-14 40 L0 55 L14 40 Z" fill="#D4C5C2" opacity={0.3} />
        {/* 花朵 */}
        {[-10, 0, 10].map((dx, i) => (
          <g key={i} transform={`translate(${dx}, ${14 + i * 4})`}>
            {[0, 60, 120, 180, 240, 300].map((angle, j) => (
              <ellipse
                key={j}
                cx={0}
                cy={-5}
                rx={2.5}
                ry={5}
                fill={i === 1 ? "#F2DEE2" : "#F8EBEE"}
                opacity={0.6}
                transform={`rotate(${angle})`}
              />
            ))}
            <circle cx={0} cy={0} r={3} fill="#F5D5A0" opacity={0.5} />
          </g>
        ))}
      </g>

      {/* 礼物盒 */}
      <g transform="translate(250, 140)">
        <rect x={0} y={5} width={35} height={30} rx={3} fill="#E8DED1" opacity={0.5} />
        <rect x={0} y={5} width={35} height={30} rx={3} fill="none" stroke="#C5BFB8" strokeWidth={1} />
        <line x1={17.5} y1={5} x2={17.5} y2={35} stroke="#C5BFB8" strokeWidth={1} />
        <line x1={0} y1={20} x2={35} y2={20} stroke="#C5BFB8" strokeWidth={1} />
        {/* 蝴蝶结 */}
        <path d="M12 3 Q17.5 -4 23 3" fill="none" stroke="#C4A8A3" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
        <circle cx={17.5} cy={4} r={3} fill="#C4A8A3" opacity={0.4} />
      </g>

      {/* 飘浮爱心 */}
      {[
        [100, 40, 1],
        [280, 60, 0.8],
        [320, 100, 0.6],
        [160, 30, 0.7],
      ].map(([hx, hy, hs], i) => (
        <g key={`heart-${i}`} transform={`translate(${hx}, ${hy}) scale(${hs})`} opacity={0.3 + i * 0.05}>
          <path
            d="M0 4 C0 0 8 -4 12 2 C16 -4 24 0 24 4 C24 12 12 18 12 18 C12 18 0 12 0 4 Z"
            fill="#D4A8A8"
          />
        </g>
      ))}

      {/* 烛光 */}
      <g transform="translate(180, 140)">
        <rect x={8} y={10} width={8} height={25} rx={1} fill="#F5EDE4" opacity={0.5} />
        <ellipse cx={12} cy={8} rx={4} ry={6} fill="#FDE8B0" opacity={0.4} />
        <circle cx={12} cy={4} r={2} fill="#FFF8E7" opacity={0.5}>
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </g>
    </g>
  )
}

// ─── 婚礼 ────────────────────────────────────────────────

function WeddingIllustration({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx - 200}, ${cy - 140})`}>
      {/* 柔光 */}
      <circle cx={200} cy={120} r={120} fill="#F5F0F3" opacity={0.3} />

      {/* 拱门 */}
      <path d="M120 180 Q120 40 200 40 Q280 40 280 180" fill="none" stroke="#D4C5C2" strokeWidth={3} opacity={0.4} />
      {/* 花环装饰拱门 */}
      {[140, 170, 200, 230, 260].map((dx, i) => (
        <circle key={i} cx={dx} cy={40 + Math.sin((dx - 120) / 160 * Math.PI) * 140} r={6 + i % 3} fill="#F2DEE2" opacity={0.35} />
      ))}

      {/* 戒指 */}
      <g transform="translate(200, 150)">
        <circle cx={-8} cy={0} r={10} fill="none" stroke="#F5D5A0" strokeWidth={2.5} opacity={0.5} />
        <circle cx={8} cy={0} r={10} fill="none" stroke="#F5D5A0" strokeWidth={2.5} opacity={0.5} />
        <circle cx={-3} cy={-3} r={2} fill="#FDE8B0" opacity={0.5} />
      </g>

      {/* 飘落花瓣 */}
      {[
        [100, 40],
        [300, 60],
        [150, 100],
        [280, 110],
        [200, 30],
      ].map(([px, py], i) => (
        <ellipse
          key={i}
          cx={px}
          cy={py}
          rx={4}
          ry={6}
          fill="#F8EBEE"
          opacity={0.3 + i * 0.04}
          transform={`rotate(${i * 30})`}
        />
      ))}
    </g>
  )
}

// ─── 职场 / 通勤 ────────────────────────────────────────

function WorkIllustration({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx - 200}, ${cy - 140})`}>
      {/* 建筑剪影 */}
      {[
        [40, 80, 30, 100],
        [80, 60, 35, 120],
        [125, 90, 28, 90],
        [160, 70, 32, 110],
        [200, 95, 25, 85],
        [280, 65, 40, 115],
        [330, 85, 30, 95],
      ].map(([bx, by, bw, bh], i) => (
        <rect key={i} x={bx} y={by} width={bw} height={bh} rx={2} fill="#C5BFB8" opacity={0.2 + i * 0.03} />
      ))}

      {/* 地面 */}
      <rect x={0} y={175} width={400} height={105} fill="#E8DED1" opacity={0.3} />

      {/* 公文包 */}
      <g transform="translate(180, 150)">
        <rect x={0} y={5} width={40} height={28} rx={4} fill="#B8A99A" opacity={0.4} />
        <rect x={14} y={0} width={12} height={8} rx={2} fill="#A09080" opacity={0.35} />
        <rect x={12} y={4} width={16} height={4} rx={1} fill="#D4C5C2" opacity={0.3} />
      </g>

      {/* 咖啡外带杯 */}
      <g transform="translate(70, 135)">
        <path d="M5 0 L8 30 Q15 33 22 30 L25 0 Z" fill="#FAF7F4" opacity={0.6} stroke="#C5BFB8" strokeWidth={0.8} />
        <rect x={4} y={-3} width={22} height={5} rx={2} fill="#C4A8A3" opacity={0.4} />
      </g>

      {/* 时钟 */}
      <g transform="translate(320, 50)">
        <circle cx={20} cy={20} r={22} fill="#FAF7F4" opacity={0.5} stroke="#C5BFB8" strokeWidth={1.5} />
        <line x1={20} y1={20} x2={20} y2={8} stroke="#C5BFB8" strokeWidth={1.5} strokeLinecap="round" />
        <line x1={20} y1={20} x2={30} y2={20} stroke="#C5BFB8" strokeWidth={1} strokeLinecap="round" />
        <circle cx={20} cy={20} r={2} fill="#C4A8A3" opacity={0.5} />
      </g>
    </g>
  )
}

// ─── 户外 / 运动 ────────────────────────────────────────

function OutdoorIllustration({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx - 200}, ${cy - 140})`}>
      {/* 天空渐变 */}
      <rect x={0} y={0} width={400} height={160} fill="#E8F0F0" opacity={0.3} />

      {/* 远山 */}
      <path d="M0 160 L60 80 L120 130 L180 70 L240 120 L300 60 L360 110 L400 80 L400 180 L0 180 Z" fill="#B5C1B4" opacity={0.3} />
      <path d="M0 160 L80 100 L140 140 L200 90 L260 135 L320 85 L400 130 L400 180 L0 180 Z" fill="#A5B8A0" opacity={0.25} />

      {/* 地面 */}
      <path d="M0 170 Q200 155 400 175 L400 280 L0 280 Z" fill="#C5C9A8" opacity={0.3} />

      {/* 松树 */}
      {[60, 200, 300].map((tx, i) => (
        <g key={i} transform={`translate(${tx}, ${100 + i * 15})`}>
          <polygon points="10,-20 0,5 20,5" fill="#8AAA88" opacity={0.35} />
          <polygon points="10,-35 2,-5 18,-5" fill="#9ABA98" opacity={0.3} />
          <rect x={8} y={5} width={4} height={8} rx={1} fill="#C5BFB8" opacity={0.3} />
        </g>
      ))}

      {/* 太阳 */}
      <circle cx={330} cy={45} r={20} fill="#FDE8B0" opacity={0.35} />

      {/* 小路 */}
      <path d="M160 180 Q200 210 240 180 Q280 200 320 180" fill="none" stroke="#D4C5C2" strokeWidth={6} opacity={0.3} strokeLinecap="round" />
    </g>
  )
}

// ─── 日常 / 周末 / 逛街 ─────────────────────────────────

function DailyIllustration({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx - 200}, ${cy - 140})`}>
      {/* 购物袋 */}
      <g transform="translate(100, 100)">
        <rect x={0} y={10} width={35} height={40} rx={3} fill="#D4C5C2" opacity={0.35} />
        <path d="M5 10 L10 -5 L25 -5 L30 10" fill="none" stroke="#D4C5C2" strokeWidth={2} opacity={0.4} />
      </g>
      <g transform="translate(150, 115) scale(0.8)">
        <rect x={0} y={10} width={30} height={35} rx={3} fill="#E8DED1" opacity={0.35} />
        <path d="M5 10 L10 -5 L20 -5 L25 10" fill="none" stroke="#E8DED1" strokeWidth={2} opacity={0.4} />
      </g>

      {/* 镜子/试衣镜 */}
      <g transform="translate(270, 60)">
        <rect x={0} y={15} width={50} height={90} rx={6} fill="#E8EDF2" opacity={0.3} stroke="#C5BFB8" strokeWidth={2} />
        <rect x={0} y={15} width={50} height={90} rx={6} fill="none" stroke="#D4D9DE" strokeWidth={1} opacity={0.3} />
        {/* 高光 */}
        <line x1={12} y1={30} x2={12} y2={85} stroke="#FAF7F4" strokeWidth={3} opacity={0.3} strokeLinecap="round" />
      </g>

      {/* 花 */}
      <g transform="translate(60, 150)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <ellipse
            key={i}
            cx={0}
            cy={-6}
            rx={3}
            ry={6}
            fill="#F2DEE2"
            opacity={0.4}
            transform={`rotate(${angle})`}
          />
        ))}
        <circle cx={0} cy={0} r={4} fill="#FDE8B0" opacity={0.35} />
        <line x1={0} y1={8} x2={0} y2={30} stroke="#B5C1B4" strokeWidth={1.5} opacity={0.4} />
      </g>
    </g>
  )
}

// ─── 艺术 / 表达 ────────────────────────────────────────

function ArtIllustration({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx - 200}, ${cy - 140})`}>
      {/* 画架 */}
      <g transform="translate(160, 60)">
        <line x1={30} y1={0} x2={30} y2={90} stroke="#C5BFB8" strokeWidth={2} opacity={0.4} />
        <line x1={0} y1={80} x2={60} y2={80} stroke="#C5BFB8" strokeWidth={2} opacity={0.35} />
        <line x1={30} y1={30} x2={0} y2={80} stroke="#C5BFB8" strokeWidth={1.5} opacity={0.3} />
        <line x1={30} y1={30} x2={60} y2={80} stroke="#C5BFB8" strokeWidth={1.5} opacity={0.3} />
        {/* 画布 */}
        <rect x={5} y={5} width={50} height={40} rx={2} fill="#FAF7F4" opacity={0.5} stroke="#C5BFB8" strokeWidth={1} />
        {/* 画布上的色块 */}
        <circle cx={22} cy={22} r={8} fill="#C4A8A3" opacity={0.3} />
        <rect x={30} y={18} width={12} height={14} rx={1} fill="#A3B5C4" opacity={0.25} />
        <path d="M10 30 L18 18 L26 30 Z" fill="#B5C1B4" opacity={0.25} />
      </g>

      {/* 调色板 */}
      <g transform="translate(300, 150)">
        <ellipse cx={20} cy={15} rx={25} ry={18} fill="#E8DED1" opacity={0.4} />
        {([
          [8, 8, "#C4A8A3"],
          [22, 6, "#B5C1B4"],
          [32, 12, "#A3B5C4"],
          [28, 20, "#F5D5A0"],
          [14, 18, "#D4C5C2"],
        ] as [number, number, string][]).map(([px, py, fill], i) => (
          <circle key={i} cx={px} cy={py} r={4} fill={fill} opacity={0.45} />
        ))}
      </g>

      {/* 飞舞颜料点 */}
      {([
        [80, 50, "#C4A8A3"],
        [300, 40, "#B5C1B4"],
        [350, 80, "#A3B5C4"],
        [120, 100, "#F5D5A0"],
      ] as [number, number, string][]).map(([dx, dy, fill], i) => (
        <circle key={i} cx={dx} cy={dy} r={3 + i % 3} fill={fill} opacity={0.3}>
          <animate attributeName="cy" values={`${dy};${(dy as number) - 10};${dy}`} dur={`${3 + i}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

// ─── 释然 / 宁静 ────────────────────────────────────────

function PeaceIllustration({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx - 200}, ${cy - 140})`}>
      {/* 圆月 */}
      <circle cx={300} cy={60} r={35} fill="#F5EDE4" opacity={0.4} />
      <circle cx={300} cy={60} r={28} fill="#FAF7F4" opacity={0.4} />

      {/* 远山剪影 */}
      <path d="M0 160 L80 90 L160 140 L240 80 L320 130 L400 70 L400 200 L0 200 Z" fill="#B8C5C5" opacity={0.2} />

      {/* 水面 */}
      <rect x={0} y={170} width={400} height={110} fill="#DEE8E8" opacity={0.25} />
      {/* 月光倒影 */}
      {[0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx={300 + i * 5}
          cy={180 + i * 25}
          rx={12 - i * 3}
          ry={2}
          fill="#FAF7F4"
          opacity={0.08 - i * 0.02}
        />
      ))}

      {/* 飘落树叶 */}
      {[
        [80, 30, 15],
        [140, 60, -10],
        [200, 40, 25],
        [350, 80, -20],
      ].map(([lx, ly, rot], i) => (
        <ellipse
          key={i}
          cx={lx}
          cy={ly}
          rx={5}
          ry={9}
          fill="#B5C1B4"
          opacity={0.25}
          transform={`rotate(${rot} ${lx} ${ly})`}
        >
          <animate
            attributeName="cy"
            values={`${ly};${(ly as number) + 30};${(ly as number) + 60}`}
            dur={`${4 + i * 2}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.25;0.15;0"
            dur={`${4 + i * 2}s`}
            repeatCount="indefinite"
          />
        </ellipse>
      ))}

      {/* 长凳 */}
      <g transform="translate(50, 170)">
        <rect x={0} y={5} width={60} height={6} rx={2} fill="#C5BFB8" opacity={0.25} />
        <rect x={8} y={11} width={5} height={20} rx={1} fill="#C5BFB8" opacity={0.2} />
        <rect x={47} y={11} width={5} height={20} rx={1} fill="#C5BFB8" opacity={0.2} />
      </g>
    </g>
  )
}
