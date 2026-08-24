-- 游客衣橱桶：公开读（图片 URL 可直接访问），匿名可写（先体验不登录）
-- 上传走 /api/wardrobe（服务端识别 + 上传），登录后由 /api/wardrobe 迁移到用户私有桶

insert into storage.buckets (id, name, public)
values ('guest-wardrobe', 'guest-wardrobe', true)
on conflict (id) do nothing;

-- 匿名角色可上传（RLS 策略，只允许写 guest-wardrobe 桶）
drop policy if exists "guest_wardrobe_anon_upload" on storage.objects;
create policy "guest_wardrobe_anon_upload"
on storage.objects
for insert
to anon
with check (bucket_id = 'guest-wardrobe');
