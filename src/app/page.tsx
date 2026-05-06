import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-8 px-6">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-semibold tracking-wider text-charcoal">
          风格日记
        </h1>
        <p className="text-sm text-warm-gray leading-relaxed">
          和小裁一起，为生活的每个重要时刻
          <br />
          找到属于你的搭配
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/auth"
          className="w-full py-3 text-center rounded-2xl bg-rose text-soft-white
                     font-medium tracking-wide transition-all active:scale-[0.98]"
        >
          开始探索
        </Link>
        <Link
          href="/auth"
          className="w-full py-3 text-center rounded-2xl border border-warm-gray
                     text-charcoal font-medium tracking-wide transition-all
                     active:scale-[0.98]"
        >
          我已有账号
        </Link>
      </div>
    </div>
  )
}
