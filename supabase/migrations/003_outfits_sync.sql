-- 跨设备同步：outfits 表增加 gender 和 accessories 列
ALTER TABLE outfits ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE outfits ADD COLUMN IF NOT EXISTS accessories TEXT[];

-- 索引：按用户查询保存方案
CREATE INDEX IF NOT EXISTS idx_outfits_user_id ON outfits(user_id);
