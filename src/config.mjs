try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch (e) {}

export function loadConfig(env = process.env) {
  return {
    nodeEnv: env.NODE_ENV ?? 'development',
    port: Number(env.API_PORT ?? 3000),
    databaseUrl: env.DATABASE_URL || env.POSTGRES_URL || env.SUPABASE_DB_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL_NON_POOLING || env.SUPABASE_POSTGRES_URL,
    databaseSsl: env.DATABASE_SSL !== 'false',
    appOrigin: env.APP_ORIGIN ?? 'http://localhost:3000',
    cookieSecure: env.COOKIE_SECURE === 'true',
    sessionTtlSeconds: Number(env.SESSION_TTL_SECONDS ?? 2_592_000),
    openaiApiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL ?? 'gpt-4o-mini',
    openaiBaseUrl: env.OPENAI_BASE_URL,
    openaiTimeoutMs: Number(env.OPENAI_TIMEOUT_MS ?? 15_000),
    openaiMaxRetries: Number(env.OPENAI_MAX_RETRIES ?? 1),
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    geminiTimeoutMs: Number(env.GEMINI_TIMEOUT_MS ?? 15_000),
    groqApiKey: env.GROQ_API_KEY,
    groqModel: env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    elevenlabsApiKey: env.ELEVENLABS_API_KEY,
    elevenlabsVoiceId: env.ELEVENLABS_VOICE_ID,
    ttsProvider: env.TTS_PROVIDER ?? (env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'openai'),
    voiceProvider: env.VOICE_PROVIDER,
    aiProvider: env.AI_PROVIDER ?? (env.OPENAI_API_KEY ? 'openai' : 'free'),
    googleClientId: env.GOOGLE_CLIENT_ID || '604379040176-dca2rmd9akrtds0rhf62e3ojleer4udl.apps.googleusercontent.com',
    googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl: env.GOOGLE_CALLBACK_URL || null,
  };
}
