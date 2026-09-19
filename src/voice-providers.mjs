import OpenAI from 'openai';

export const VOICE_STYLE_PRESETS = {
  NORMAL: { speed: 0.92, stability: 0.5, similarity_boost: 0.75, voice: 'nova' },
  FRIENDLY: { speed: 0.95, stability: 0.45, similarity_boost: 0.8, voice: 'nova' },
  PROFESSIONAL: { speed: 0.90, stability: 0.65, similarity_boost: 0.85, voice: 'echo' },
  CALM: { speed: 0.85, stability: 0.75, similarity_boost: 0.8, voice: 'shimmer' },
  CHEERFUL: { speed: 1.0, stability: 0.4, similarity_boost: 0.85, voice: 'nova' },
  SERIOUS: { speed: 0.88, stability: 0.7, similarity_boost: 0.9, voice: 'onyx' },
  FAST: { speed: 1.15, stability: 0.5, similarity_boost: 0.75, voice: 'nova' },
  SLOW: { speed: 0.8, stability: 0.6, similarity_boost: 0.75, voice: 'nova' },
};

export function cleanTextForSpeech(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`([^`]+)`/g, '$1')     // remove inline code ticks
    .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold
    .replace(/\*(.*?)\*/g, '$1')     // remove italic
    .replace(/_{1,2}(.*?)_{1,2}/g, '$1')
    .replace(/#{1,6}\s+/g, '')       // remove header hashes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove markdown links, keep label
    .replace(/^[*\-•+]\s+/gm, '')   // remove list bullets
    .replace(/^\d+\.\s+/gm, '')      // remove numbered list
    .replace(/~{2}(.*?)~{2}/g, '$1') // remove strikethrough
    .replace(/[><]/g, '')            // remove blockquotes/brackets
    .replace(/\s+/g, ' ')            // normalize whitespace
    .trim();
}

export function createOpenAITTSProvider({ apiKey, client }) {
  if (!apiKey && !client) {
    return {
      name: 'openai',
      async synthesize() {
        const err = new Error('OpenAI API key is not configured for TTS');
        err.code = 'AI_NOT_CONFIGURED';
        throw err;
      }
    };
  }
  const openai = client ?? new OpenAI({ apiKey });
  return {
    name: 'openai',
    async synthesize({ text, voice, speed, preset = 'NORMAL' }) {
      const cleaned = cleanTextForSpeech(text) || text;
      const resolvedPreset = VOICE_STYLE_PRESETS[preset?.toUpperCase()] ?? VOICE_STYLE_PRESETS.NORMAL;
      const targetVoice = voice || resolvedPreset.voice || 'nova';
      const targetSpeed = (speed !== undefined && speed !== null) ? Number(speed) : (resolvedPreset.speed || 0.92);

      try {
        const response = await openai.audio.speech.create({
          model: 'tts-1',
          voice: targetVoice,
          input: cleaned,
          speed: Math.max(0.5, Math.min(2.0, targetSpeed)),
          response_format: 'mp3',
        });
        return {
          buffer: Buffer.from(await response.arrayBuffer()),
          format: 'mp3',
          voice: targetVoice,
          speed: targetSpeed,
          provider: 'openai'
        };
      } catch (err) {
        throw Object.assign(new Error(`OpenAI TTS synthesis failed: ${err.message}`), { code: 'TTS_FAILED' });
      }
    }
  };
}

export function createElevenLabsTTSProvider({ apiKey, defaultVoiceId = '21m00Tcm4TlvDq8ikWAM' }) {
  if (!apiKey) {
    return {
      name: 'elevenlabs',
      async synthesize() {
        const err = new Error('ElevenLabs API key is not configured');
        err.code = 'AI_NOT_CONFIGURED';
        throw err;
      }
    };
  }

  return {
    name: 'elevenlabs',
    async synthesize({ text, voice, preset = 'NORMAL' }) {
      const cleaned = cleanTextForSpeech(text) || text;
      const resolvedPreset = VOICE_STYLE_PRESETS[preset?.toUpperCase()] ?? VOICE_STYLE_PRESETS.NORMAL;
      const voiceId = voice || defaultVoiceId;

      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      const payload = {
        text: cleaned,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: resolvedPreset.stability ?? 0.5,
          similarity_boost: resolvedPreset.similarity_boost ?? 0.75,
        }
      };

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail?.message || `ElevenLabs returned HTTP ${res.status}`);
        }

        const buffer = Buffer.from(await res.arrayBuffer());
        return {
          buffer,
          format: 'mp3',
          voice: voiceId,
          provider: 'elevenlabs'
        };
      } catch (err) {
        throw Object.assign(new Error(`ElevenLabs TTS failed: ${err.message}`), { code: 'TTS_FAILED' });
      }
    }
  };
}

export function createMockTTSProvider() {
  return {
    name: 'mock',
    async synthesize({ text, voice = 'mock-voice', speed = 1.0 }) {
      // Mock MP3 header and audio content for deterministic testing
      return {
        buffer: Buffer.from(`ID3...mock-tts-audio-for:${cleanTextForSpeech(text)}`),
        format: 'mp3',
        voice,
        speed,
        provider: 'mock'
      };
    }
  };
}

export function createOpenAISTTProvider({ apiKey, client }) {
  if (!apiKey && !client) {
    return {
      name: 'openai',
      async transcribe() {
        const err = new Error('OpenAI API key is not configured for STT');
        err.code = 'AI_NOT_CONFIGURED';
        throw err;
      }
    };
  }
  const openai = client ?? new OpenAI({ apiKey });
  return {
    name: 'openai',
    async transcribe({ file, language = 'id' }) {
      try {
        const response = await openai.audio.transcriptions.create({
          file,
          model: 'whisper-1',
          language,
          temperature: 0.2,
        });
        return { text: response.text?.trim() || '' };
      } catch (err) {
        throw Object.assign(new Error(`OpenAI STT failed: ${err.message}`), { code: 'STT_FAILED' });
      }
    }
  };
}

export function createMockSTTProvider() {
  return {
    name: 'mock',
    async transcribe({ text = 'Halo VARIS' }) {
      return { text };
    }
  };
}

export function createVoiceProviders(config = {}) {
  const isTest = config.nodeEnv === 'test' || config.voiceProvider === 'mock';

  // TTS selection
  let tts;
  if (isTest) {
    tts = createMockTTSProvider();
  } else if (config.ttsProvider === 'elevenlabs' || (config.elevenlabsApiKey && !config.openaiApiKey)) {
    tts = createElevenLabsTTSProvider({
      apiKey: config.elevenlabsApiKey,
      defaultVoiceId: config.elevenlabsVoiceId,
    });
  } else if (config.openaiApiKey) {
    tts = createOpenAITTSProvider({ apiKey: config.openaiApiKey });
  } else {
    tts = {
      name: 'unconfigured',
      async synthesize() {
        const err = new Error('No TTS provider is configured. Please set OPENAI_API_KEY or ELEVENLABS_API_KEY.');
        err.code = 'AI_NOT_CONFIGURED';
        throw err;
      }
    };
  }

  // STT selection
  let stt;
  if (isTest) {
    stt = createMockSTTProvider();
  } else if (config.openaiApiKey) {
    stt = createOpenAISTTProvider({ apiKey: config.openaiApiKey });
  } else {
    stt = {
      name: 'unconfigured',
      async transcribe() {
        const err = new Error('No STT provider is configured. Please set OPENAI_API_KEY.');
        err.code = 'AI_NOT_CONFIGURED';
        throw err;
      }
    };
  }

  // Voice profiles management
  const profiles = {
    async createVoiceProfile({ name, file }) {
      if (isTest) {
        return { provider_voice_id: `mock-voice-${Date.now()}`, name: name || 'Custom Voice' };
      }
      const err = new Error('Direct voice cloning requires ElevenLabs API credentials with voice add permissions.');
      err.code = 'NOT_SUPPORTED';
      throw err;
    },
    async deleteVoiceProfile() {
      return true;
    },
    async getVoices() {
      return ['nova', 'shimmer', 'echo', 'onyx', 'fable', 'alloy'];
    }
  };

  return {
    tts,
    stt,
    profiles,
    cleanTextForSpeech,
    VOICE_STYLE_PRESETS,
  };
}
