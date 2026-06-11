-- ============================================================
-- 002_user_events · 用户行为埋点表
-- 用于追踪场景使用、搭配行为、生成漏斗
-- ============================================================

CREATE TABLE IF NOT EXISTS user_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event       TEXT NOT NULL,
  scene_id    UUID,
  properties  JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 按用户 + 事件类型 + 时间查询（漏斗分析、场景使用统计）
CREATE INDEX IF NOT EXISTS idx_events_user ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_event ON user_events(user_id, event);
CREATE INDEX IF NOT EXISTS idx_events_scene ON user_events(scene_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON user_events(created_at);

-- RLS
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户写入自己的埋点"
  ON user_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户查看自己的埋点"
  ON user_events FOR SELECT
  USING (auth.uid() = user_id);
