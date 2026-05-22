-- ============================================================
-- Style Diary · 衣橱搭配系统 数据库 Schema
-- Supabase 迁移 SQL — 在 SQL Editor 中一次性执行
-- ============================================================

-- 清理旧表（如有）
DROP TABLE IF EXISTS generation_history CASCADE;
DROP TABLE IF EXISTS outfit_accessories CASCADE;
DROP TABLE IF EXISTS outfits CASCADE;
DROP TABLE IF EXISTS clothing_items CASCADE;

-- 清理旧枚举
DROP TYPE IF EXISTS color_group CASCADE;
DROP TYPE IF EXISTS clothing_category CASCADE;

-- 1. 品类枚举（和前端 ClothingCategory 一致）
CREATE TYPE clothing_category AS ENUM (
  'top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory'
);

-- 2. 色系枚举（用于 AI 筛选）
CREATE TYPE color_group AS ENUM (
  'light', 'dark', 'warm', 'cool', 'neutral'
);

-- ============================================================
-- 核心表
-- ============================================================

-- ✨ 用户衣橱单品
CREATE TABLE clothing_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    clothing_category NOT NULL,
  sub_category TEXT,           -- 版型: bubble_sleeve_top / a_line_skirt
  color       TEXT,            -- 色值 #E8B4B8 或自然语言描述
  color_group color_group,     -- AI 筛选用
  material    TEXT,            -- 针织 / 雪纺 / 棉
  pattern     TEXT,            -- 纯色 / 碎花 / 条纹 / 波点
  style_tags  TEXT[] DEFAULT '{}', -- {"甜美","法式"}
  detail      TEXT,            -- 设计细节: "腰间交叉绑带收腰"
  image_url   TEXT,            -- Supabase Storage 公开 URL
  created_at  TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_category CHECK (category IN (
    'top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory'
  ))
);

CREATE INDEX idx_clothing_user ON clothing_items(user_id);
CREATE INDEX idx_clothing_category ON clothing_items(user_id, category);
CREATE INDEX idx_clothing_style ON clothing_items USING GIN(style_tags);

-- 📋 保存的搭配方案
CREATE TABLE outfits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,     -- "约会甜妹风"
  scene_id    UUID,              -- FK → scenes (可为空，后续加)
  dress       UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  top         UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  bottom      UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  outerwear   UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  shoes       UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  bag         UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_outfits_user ON outfits(user_id);

-- 🔗 搭配方案中的配饰（多对多）
CREATE TABLE outfit_accessories (
  outfit_id UUID REFERENCES outfits(id) ON DELETE CASCADE,
  item_id   UUID REFERENCES clothing_items(id) ON DELETE CASCADE,
  PRIMARY KEY (outfit_id, item_id)
);

-- 🖼️ AI 生图记录
CREATE TABLE generation_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id       UUID REFERENCES outfits(id) ON DELETE SET NULL,
  image_url       TEXT NOT NULL,
  prompt          TEXT,
  mode            TEXT,       -- edits / text_to_image
  review_score    INT,
  review_comment  TEXT,
  review_style    INT,        -- 风格匹配 /25
  review_color    INT,        -- 色彩协调 /25
  review_silhouette INT,      -- 版型平衡 /25
  review_occasion INT,        -- 场合适配 /25
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gen_history_user ON generation_history(user_id);

-- ============================================================
-- RLS 策略：每个用户只看自己的数据
-- ============================================================

ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;

-- clothing_items
CREATE POLICY "用户查看自己的衣物"
  ON clothing_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户添加自己的衣物"
  ON clothing_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户更新自己的衣物"
  ON clothing_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户删除自己的衣物"
  ON clothing_items FOR DELETE
  USING (auth.uid() = user_id);

-- outfits
CREATE POLICY "用户查看自己的搭配方案"
  ON outfits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户创建搭配方案"
  ON outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户更新自己的搭配方案"
  ON outfits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户删除自己的搭配方案"
  ON outfits FOR DELETE
  USING (auth.uid() = user_id);

-- outfit_accessories（通过 outfit_id 关联 outfits 检查 user_id）
CREATE POLICY "用户操作自己搭配的配饰"
  ON outfit_accessories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_accessories.outfit_id
      AND outfits.user_id = auth.uid()
    )
  );

-- generation_history
CREATE POLICY "用户查看自己的生成记录"
  ON generation_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户创建生成记录"
  ON generation_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Storage Bucket
-- ============================================================

-- 创建 bucket（如已存在则忽略）
INSERT INTO storage.buckets (id, name, public)
VALUES ('wardrobe', 'wardrobe', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS：先删后建避免重复报错
DROP POLICY IF EXISTS "公开可读" ON storage.objects;
DROP POLICY IF EXISTS "用户可上传" ON storage.objects;
DROP POLICY IF EXISTS "用户可删除自己的文件" ON storage.objects;

CREATE POLICY "公开可读"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wardrobe');

CREATE POLICY "用户可上传"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wardrobe'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "用户可删除自己的文件"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wardrobe'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
