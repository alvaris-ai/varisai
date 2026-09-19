import OpenAI from 'openai';

export function createVoiceAdapter(config) {
  const providerType = config.voiceProvider || (config.openaiApiKey ? 'openai' : 'unconfigured');

  if (providerType === 'unconfigured') {
    const throwErr = () => {
      const err = new Error('Voice provider is not configured. Please add OPENAI_API_KEY to your environment variables.');
      err.code = 'AI_NOT_CONFIGURED';
      throw err;
    };
    return {
      async synthesize() { throwErr(); },
      async createVoiceProfile() { throwErr(); },
      async deleteVoiceProfile() { throwErr(); },
      async getVoices() { throwErr(); }
    };
  }

  if (providerType === 'openai') {
    const openaiClient = new OpenAI({
      apiKey: config.openaiApiKey,
    });

    return {
      async synthesize({ text, voice = 'nova', speed = 0.92, voice_style = {} }) {
        try {
          // Clean text: strip markdown symbols before sending to TTS for crystal-clear pronunciation
          const cleanedText = text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/#{1,6}\s+/g, '')
            .replace(/`{1,3}[^`]*`{1,3}/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/^[-*•]\s+/gm, '')
            .trim();

          const response = await openaiClient.audio.speech.create({
            model: 'tts-1',
            voice: voice || 'nova',
            input: cleanedText || text,
            speed: Number(speed) || 0.92,
            response_format: 'mp3',
          });
          return { buffer: Buffer.from(await response.arrayBuffer()) };
        } catch (error) {
          throw Object.assign(new Error(`Speech synthesis failed: ${error.message}`), { code: 'TTS_FAILED' });
        }
      },
      async createVoiceProfile({ file, name }) {
        const err = new Error('OpenAI custom voice cloning is not publicly supported');
        err.code = 'NOT_SUPPORTED';
        throw err;
      },
      async deleteVoiceProfile({ providerVoiceId }) {
        const err = new Error('OpenAI custom voice cloning is not publicly supported');
        err.code = 'NOT_SUPPORTED';
        throw err;
      },
      async getVoices() {
        return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
      }
    };
  }

  // Mock Provider for testing UI and end-to-end integration without OpenAI limits
  if (providerType === 'mock') {
    return {
      async synthesize({ text, voice = 'alloy', speed = 1.0, voice_style = {} }) {
        // Return a dummy small MP3 buffer for testing
        // For real testing we just need it to not fail and return something streamable
        const dummyMp3 = Buffer.from('ID3...dummy-audio-content'); 
        return { buffer: dummyMp3 };
      },
      async createVoiceProfile({ file, name }) {
        // Simulate processing time
        await new Promise(r => setTimeout(r, 1500));
        return {
          provider_voice_id: `mock-voice-${Date.now()}`,
          name: name || 'Custom Voice'
        };
      },
      async deleteVoiceProfile({ providerVoiceId }) {
        return true;
      },
      async getVoices() {
        return ['mock-1', 'mock-2'];
      }
    };
  }

  throw new Error(`Unsupported voice provider: ${providerType}`);
}
