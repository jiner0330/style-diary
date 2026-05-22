"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import {
  MEASUREMENT_RANGES, SHOULDER_WIDTHS,
  SKIN_TONE_LABELS, GENDER_LABELS,
  getBodyTypeLabels, getBodyTypeOptions,
  getHeightRanges, getWeightRanges, getAllStyleTags,
} from "@/lib/utils"
import type { Gender, SkinTone, BodyType } from "@/types"
import toast from "react-hot-toast"

const SKIN_TONES: SkinTone[] = ['warm', 'cool', 'neutral']

export default function OnboardingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState(1)

  // Step 1: 性别 + 昵称
  const [gender, setGender] = useState<Gender | "">("")
  const [nickname, setNickname] = useState("")

  // Step 2: 身体数据
  const [height, setHeight] = useState("")
  const [weight, setWeight] = useState("")
  const [bust, setBust] = useState("")
  const [waist, setWaist] = useState("")
  const [hip, setHip] = useState("")
  const [shoulder, setShoulder] = useState("")
  const [bodyType, setBodyType] = useState<BodyType | "">("")
  const [skinTone, setSkinTone] = useState<SkinTone | "">("")

  // Step 3: 风格偏好
  const [styleTags, setStyleTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // 根据性别动态获取选项
  const bodyTypeOptions = useMemo(() => gender ? getBodyTypeOptions(gender) : [], [gender])
  const bodyTypeLabels = useMemo(() => gender ? getBodyTypeLabels(gender) : {}, [gender])
  const heightRanges = useMemo(() => gender ? getHeightRanges(gender) : [], [gender])
  const weightRanges = useMemo(() => gender ? getWeightRanges(gender) : [], [gender])
  const styleTagOptions = useMemo(() => gender ? getAllStyleTags(gender) : [], [gender])

  // 切换性别时，清空已选的身体数据和风格标签
  function handleGenderChange(g: Gender) {
    setGender(g)
    setHeight("")
    setWeight("")
    setBodyType("")
    setStyleTags([])
  }

  // 登录态检查
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("请先登录")
        router.push("/auth")
      } else {
        setChecking(false)
      }
    }
    check()
  }, [router])

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-warm-gray animate-pulse">正在验证登录状态...</p>
      </div>
    )
  }

  function toggleStyleTag(tag: string) {
    setStyleTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  function canProceedStep1() {
    return gender !== "" && nickname.trim() !== ""
  }

  function canProceedStep2() {
    return height && weight && bust && waist && hip &&
           shoulder && bodyType && skinTone
  }

  function canProceedStep3() {
    return styleTags.length >= 3
  }

  async function handleFinish() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("未登录")

      const { error } = await supabase.from("user_profiles").insert({
        user_id: user.id,
        gender,
        nickname: nickname.trim(),
        height_range: height,
        weight_range: weight,
        bust_range: bust,
        waist_range: waist,
        hip_range: hip,
        shoulder_width: shoulder,
        body_type: bodyType,
        skin_tone: skinTone,
        style_tags: styleTags,
      })

      if (error) throw error
      toast.success("搭搭已经记住你的数据了 ✨")
      router.push("/scenes")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "保存失败"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 px-6 py-8">
      {/* 步骤指示器 */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
              ${step === s ? 'bg-rose text-soft-white' : step > s ? 'bg-pea text-soft-white' : 'bg-warm-gray/30 text-warm-gray'}`}>
              {step > s ? '✓' : s}
            </div>
            {s < 3 && <div className="w-4 h-px bg-warm-gray" />}
          </div>
        ))}
      </div>

      {/* ===== Step 1: 性别 + 昵称 ===== */}
      {step === 1 && (
        <div className="flex-1 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold text-charcoal">先认识一下</h2>
            <p className="text-sm text-warm-gray">穿搭不分性别，搭搭都能帮到你</p>
          </div>

          <div>
            <label className="block text-sm text-charcoal mb-2">我是</label>
            <div className="flex gap-3">
              {(Object.entries(GENDER_LABELS) as [Gender, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleGenderChange(value)}
                  className={`flex-1 py-4 rounded-xl text-base font-medium border transition-all
                    ${gender === value
                      ? 'border-rose bg-rose/10 text-rose'
                      : 'border-warm-gray text-warm-gray hover:border-rose/50'}`}
                >
                  {label === '女生' ? '👩 ' : '👨 '}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-charcoal mb-1.5">昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="大家怎么叫你？"
              className="w-full px-4 py-3 rounded-xl border border-warm-gray bg-soft-white
                         text-charcoal focus:outline-none focus:border-rose transition-colors"
            />
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!canProceedStep1()}
            className="w-full py-3 rounded-2xl bg-rose text-soft-white font-medium
                       tracking-wide transition-all active:scale-[0.98]
                       disabled:opacity-40 disabled:active:scale-100"
          >
            下一步
          </button>
        </div>
      )}

      {/* ===== Step 2: 身体数据 ===== */}
      {step === 2 && (
        <div className="flex-1 space-y-5">
          <h2 className="text-xl font-semibold text-charcoal text-center">
            让搭搭了解你的身材
          </h2>

          {[
            { label: '身高', value: height, set: setHeight, options: heightRanges },
            { label: '体重', value: weight, set: setWeight, options: weightRanges },
            { label: '胸围', value: bust, set: setBust, options: MEASUREMENT_RANGES },
            { label: '腰围', value: waist, set: setWaist, options: MEASUREMENT_RANGES },
            { label: '臀围', value: hip, set: setHip, options: MEASUREMENT_RANGES },
          ].map(({ label, value, set, options }) => (
            <div key={label}>
              <label className="block text-sm text-charcoal mb-1.5">{label}</label>
              <select
                value={value}
                onChange={(e) => set(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-warm-gray bg-soft-white
                           text-charcoal focus:outline-none focus:border-rose transition-colors"
              >
                <option value="">请选择</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}

          <div>
            <label className="block text-sm text-charcoal mb-1.5">肩宽</label>
            <div className="flex gap-2">
              {SHOULDER_WIDTHS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShoulder(s)}
                  className={`flex-1 py-3 rounded-xl text-sm border transition-all
                    ${shoulder === s
                      ? 'border-rose bg-rose/10 text-rose'
                      : 'border-warm-gray text-warm-gray hover:border-rose/50'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-charcoal mb-1.5">体型分类</label>
            <div className="grid grid-cols-2 gap-2">
              {bodyTypeOptions.map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBodyType(b)}
                  className={`py-3 rounded-xl text-sm border transition-all
                    ${bodyType === b
                      ? 'border-rose bg-rose/10 text-rose'
                      : 'border-warm-gray text-warm-gray hover:border-rose/50'}`}
                >
                  {bodyTypeLabels[b]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-charcoal mb-1.5">肤色冷暖</label>
            <div className="flex gap-2">
              {SKIN_TONES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSkinTone(s)}
                  className={`flex-1 py-3 rounded-xl text-sm border transition-all
                    ${skinTone === s
                      ? 'border-rose bg-rose/10 text-rose'
                      : 'border-warm-gray text-warm-gray hover:border-rose/50'}`}
                >
                  {SKIN_TONE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-2xl border border-warm-gray text-charcoal
                         font-medium tracking-wide transition-all active:scale-[0.98]"
            >
              上一步
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2()}
              className="flex-1 py-3 rounded-2xl bg-rose text-soft-white font-medium
                         tracking-wide transition-all active:scale-[0.98]
                         disabled:opacity-40 disabled:active:scale-100"
            >
              下一步
            </button>
          </div>
        </div>
      )}

      {/* ===== Step 3: 风格偏好 ===== */}
      {step === 3 && (
        <div className="flex-1 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold text-charcoal">你的风格偏好</h2>
            <p className="text-sm text-warm-gray">选 3-8 个你喜欢的风格标签</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {styleTagOptions.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleStyleTag(tag)}
                className={`px-4 py-2 rounded-full text-sm border transition-all
                  ${styleTags.includes(tag)
                    ? 'border-rose bg-rose text-soft-white'
                    : 'border-warm-gray text-warm-gray hover:border-rose/50'}`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 rounded-2xl border border-warm-gray text-charcoal
                         font-medium tracking-wide transition-all active:scale-[0.98]"
            >
              上一步
            </button>
            <button
              onClick={handleFinish}
              disabled={!canProceedStep3() || saving}
              className="flex-1 py-3 rounded-2xl bg-rose text-soft-white font-medium
                         tracking-wide transition-all active:scale-[0.98]
                         disabled:opacity-40 disabled:active:scale-100"
            >
              {saving ? "保存中..." : `完成（${styleTags.length}）`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
