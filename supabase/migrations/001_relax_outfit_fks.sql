-- 迁移：将 outfits 表单品列从 UUID FK 改为 TEXT
-- 原因：系统预设单品 ID（如 top-01、openai_xxx）不是 UUID，FK 约束导致保存失败

-- 1. 先删除外键约束
ALTER TABLE outfits DROP CONSTRAINT IF EXISTS outfits_dress_fkey;
ALTER TABLE outfits DROP CONSTRAINT IF EXISTS outfits_top_fkey;
ALTER TABLE outfits DROP CONSTRAINT IF EXISTS outfits_bottom_fkey;
ALTER TABLE outfits DROP CONSTRAINT IF EXISTS outfits_outerwear_fkey;
ALTER TABLE outfits DROP CONSTRAINT IF EXISTS outfits_shoes_fkey;
ALTER TABLE outfits DROP CONSTRAINT IF EXISTS outfits_bag_fkey;

ALTER TABLE outfit_accessories DROP CONSTRAINT IF EXISTS outfit_accessories_item_id_fkey;

-- 2. 再修改列类型
ALTER TABLE outfits
  ALTER COLUMN dress TYPE TEXT,
  ALTER COLUMN top TYPE TEXT,
  ALTER COLUMN bottom TYPE TEXT,
  ALTER COLUMN outerwear TYPE TEXT,
  ALTER COLUMN shoes TYPE TEXT,
  ALTER COLUMN bag TYPE TEXT;

ALTER TABLE outfit_accessories
  ALTER COLUMN item_id TYPE TEXT;
