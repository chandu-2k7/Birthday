-- ============================================================================
-- SUPABASE SCHEMA FOR MAGICAL BIRTHDAY SURPRISE WEBSITE
-- Permanent Cloud Media Storage (Photos & Videos)
-- ============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project (or create a new free project)
-- 3. Go to the "SQL Editor" in the left sidebar
-- 4. Paste this entire file into the SQL Editor and click "Run"
-- ============================================================================

-- 1. CREATE DATABASE TABLE: media_items
-- Stores metadata and public URLs for all uploaded photos and videos
CREATE TABLE IF NOT EXISTS public.media_items (
    id TEXT PRIMARY KEY,                       -- e.g. 'photo_0', 'video_1'
    media_type TEXT NOT NULL,                  -- 'photo' or 'video'
    slot_index INTEGER NOT NULL,               -- 0 to 5 for photos, 0 to 2 for videos
    file_name TEXT,                            -- Original uploaded filename
    file_type TEXT,                            -- MIME type, e.g. 'image/jpeg', 'video/mp4'
    file_size BIGINT,                          -- File size in bytes
    public_url TEXT NOT NULL,                  -- Permanent public Supabase CDN URL
    storage_path TEXT NOT NULL,                -- Storage path in 'birthday-media' bucket
    title TEXT,                                -- Optional caption / recipient clip name
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Index for speedy queries by media type and slot
CREATE INDEX IF NOT EXISTS idx_media_items_type_slot ON public.media_items(media_type, slot_index);

-- 2. CREATE STORAGE BUCKET: birthday-media
-- Public bucket for photos and videos so all shared link visitors can view media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'birthday-media',
    'birthday-media',
    true,
    104857600, -- 100MB max per file (supports high quality birthday video clips)
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON DATABASE TABLE
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

-- 3A. PUBLIC READ: Anyone who visits your shared website URL can view the media
DROP POLICY IF EXISTS "Public can view all birthday media" ON public.media_items;
CREATE POLICY "Public can view all birthday media"
    ON public.media_items
    FOR SELECT
    USING (true);

-- 3B. ADMIN WRITE: Only the logged-in owner can insert new media items
DROP POLICY IF EXISTS "Owner can insert media items" ON public.media_items;
CREATE POLICY "Owner can insert media items"
    ON public.media_items
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 3C. ADMIN UPDATE: Only the logged-in owner can update media items
DROP POLICY IF EXISTS "Owner can update media items" ON public.media_items;
CREATE POLICY "Owner can update media items"
    ON public.media_items
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- 3D. ADMIN DELETE: Only the logged-in owner can delete media items
DROP POLICY IF EXISTS "Owner can delete media items" ON public.media_items;
CREATE POLICY "Owner can delete media items"
    ON public.media_items
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- ============================================================================
-- 4. STORAGE BUCKET POLICIES (storage.objects)
-- ============================================================================

-- 4A. PUBLIC READ: Anyone can download/stream photos and videos
DROP POLICY IF EXISTS "Public can view birthday media files" ON storage.objects;
CREATE POLICY "Public can view birthday media files"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'birthday-media');

-- 4B. ADMIN INSERT: Only logged-in owner can upload files to bucket
DROP POLICY IF EXISTS "Owner can upload birthday media files" ON storage.objects;
CREATE POLICY "Owner can upload birthday media files"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'birthday-media' AND auth.role() = 'authenticated');

-- 4C. ADMIN UPDATE: Only logged-in owner can replace files in bucket
DROP POLICY IF EXISTS "Owner can update birthday media files" ON storage.objects;
CREATE POLICY "Owner can update birthday media files"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'birthday-media' AND auth.role() = 'authenticated');

-- 4D. ADMIN DELETE: Only logged-in owner can delete files in bucket
DROP POLICY IF EXISTS "Owner can delete birthday media files" ON storage.objects;
CREATE POLICY "Owner can delete birthday media files"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'birthday-media' AND auth.role() = 'authenticated');

-- ============================================================================
-- 5. OPTIONAL: INSTANT DEMO / DIRECT UPLOAD POLICY (Fallback)
-- If you want to test uploads immediately without creating an admin user in Supabase Auth,
-- you can uncomment the following 2 policies. For strict security, leave them commented out.
-- ============================================================================
-- CREATE POLICY "Anon upload fallback" ON public.media_items FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Anon storage fallback" ON storage.objects FOR ALL USING (bucket_id = 'birthday-media') WITH CHECK (bucket_id = 'birthday-media');
