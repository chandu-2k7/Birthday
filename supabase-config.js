/**
 * ============================================================================
 * SUPABASE CLOUD CONFIGURATION
 * Permanent Online Storage for Birthday Surprise Photos & Videos
 * ============================================================================
 * 
 * Instructions:
 * 1. Log in to your Supabase project: https://supabase.com/dashboard
 * 2. Go to Project Settings -> API
 * 3. Copy your "Project URL" and "anon / public" API key
 * 4. Paste them into the fields below, or enter them directly via the 
 *    "☁️ Cloud Sync" button on the website interface.
 * 
 * NOTE: It is completely safe to put the 'anon' public key here in frontend code.
 * Supabase protects your database using Row Level Security (RLS).
 * NEVER put your 'service_role' secret key here!
 * ============================================================================
 */

(function () {
  const DEFAULT_CONFIG = {
    // Replace with your Supabase Project URL (e.g. "https://abcdefghijklm.supabase.co")
    url: "https://YOUR_PROJECT_ID.supabase.co",

    // Replace with your Supabase public 'anon' key (starts with 'eyJ...')
    anonKey: "YOUR_SUPABASE_ANON_KEY",

    // Storage bucket name (created by supabase-schema.sql)
    bucketName: "birthday-media",

    // Database table name
    tableName: "media_items"
  };

  // Allow overrides from localStorage so credentials can be set dynamically via UI modal
  function getActiveConfig() {
    const savedUrl = localStorage.getItem("magical_sb_url");
    const savedKey = localStorage.getItem("magical_sb_key");

    const url = (savedUrl && savedUrl.trim()) || DEFAULT_CONFIG.url;
    const anonKey = (savedKey && savedKey.trim()) || DEFAULT_CONFIG.anonKey;

    return {
      url: url,
      anonKey: anonKey,
      bucketName: DEFAULT_CONFIG.bucketName,
      tableName: DEFAULT_CONFIG.tableName
    };
  }

  function isConfigured() {
    const config = getActiveConfig();
    return (
      Boolean(config.url) &&
      Boolean(config.anonKey) &&
      !config.url.includes("YOUR_PROJECT_ID") &&
      !config.anonKey.includes("YOUR_SUPABASE_ANON_KEY") &&
      config.url.startsWith("https://")
    );
  }

  function saveCredentials(url, anonKey) {
    if (url) localStorage.setItem("magical_sb_url", url.trim());
    if (anonKey) localStorage.setItem("magical_sb_key", anonKey.trim());
  }

  function clearCredentials() {
    localStorage.removeItem("magical_sb_url");
    localStorage.removeItem("magical_sb_key");
  }

  window.SUPABASE_CONFIG = {
    get: getActiveConfig,
    isConfigured: isConfigured,
    saveCredentials: saveCredentials,
    clearCredentials: clearCredentials
  };
})();
