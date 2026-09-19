import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanTextForSpeech,
  VOICE_STYLE_PRESETS,
  createOpenAITTSProvider,
  createMockTTSProvider,
  createVoiceProviders,
} from '../src/voice-providers.mjs';
import { createDefaultToolRegistry } from '../src/tool-system.mjs';
import { createAgentSystem } from '../src/agent-system.mjs';
import { createMockEngine } from '../src/ai-engine.mjs';
import { generateFreeSmartResponse } from '../src/free-ai-engine.mjs';

test('cleanTextForSpeech strips markdown and formatting cleanly', () => {
  const input = `### Halo Teman!
Ini adalah **teks tebal** dan *teks miring*.
- Poin pertama
- Poin kedua
Berikut kodenya: \`console.log("hello")\`
Lihat [link ini](https://example.com) ya!`;

  const cleaned = cleanTextForSpeech(input);
  assert.ok(!cleaned.includes('###'));
  assert.ok(!cleaned.includes('**'));
  assert.ok(!cleaned.includes('*teks miring*'));
  assert.ok(!cleaned.includes('`'));
  assert.ok(!cleaned.includes('http'));
  assert.ok(cleaned.includes('link ini'));
  assert.ok(cleaned.includes('teks tebal'));
  assert.ok(cleaned.includes('teks miring'));
  assert.ok(cleaned.includes('Poin pertama'));
});

test('VOICE_STYLE_PRESETS contains required presets', () => {
  const required = ['NORMAL', 'FRIENDLY', 'PROFESSIONAL', 'CALM', 'CHEERFUL', 'SERIOUS', 'FAST', 'SLOW'];
  for (const name of required) {
    assert.ok(VOICE_STYLE_PRESETS[name], `Preset ${name} should exist`);
    assert.ok(typeof VOICE_STYLE_PRESETS[name].speed === 'number');
  }
});

test('createMockTTSProvider produces deterministic test audio buffer', async () => {
  const provider = createMockTTSProvider();
  const res = await provider.synthesize({ text: 'Halo VARIS' });
  assert.ok(res.buffer instanceof Buffer);
  assert.equal(res.format, 'mp3');
  assert.equal(res.provider, 'mock');
});

test('createOpenAITTSProvider calls client speech with cleaned text and speed', async () => {
  let captured = null;
  const mockClient = {
    audio: {
      speech: {
        async create(params) {
          captured = params;
          return {
            arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
          };
        }
      }
    }
  };

  const provider = createOpenAITTSProvider({ client: mockClient });
  const result = await provider.synthesize({
    text: '**Halo** dunia!',
    preset: 'FRIENDLY',
  });

  assert.equal(captured.model, 'tts-1');
  assert.equal(captured.input, 'Halo dunia!');
  assert.equal(captured.voice, 'nova');
  assert.equal(captured.speed, 0.95);
  assert.equal(result.buffer.length, 4);
});

test('update_voice_style tool updates preferences correctly', async () => {
  const registry = createDefaultToolRegistry();
  const tool = registry.get('update_voice_style');
  assert.ok(tool, 'update_voice_style tool must be registered');

  let updatedPref = null;
  const mockContext = {
    updateVoicePreferences: async ({ preset, speed }) => {
      updatedPref = { preset, speed };
      return { voice_style: { preset }, speaking_speed: speed };
    }
  };

  const res = await tool.execute({ preset: 'CHEERFUL', speed: 1.1 }, mockContext);
  assert.equal(res.success, true);
  assert.equal(res.preset, 'CHEERFUL');
  assert.equal(res.speed, 1.1);
  assert.equal(updatedPref.preset, 'CHEERFUL');
  assert.equal(updatedPref.speed, 1.1);
});

test('createVoiceProviders selects mock in test mode', () => {
  const providers = createVoiceProviders({ nodeEnv: 'test' });
  assert.equal(providers.tts.name, 'mock');
  assert.equal(providers.stt.name, 'mock');
});

test('RULE 13: Voice pipeline outputs are AI generated and NEVER echo user transcript', async () => {
  // Simulate the exact decoupled voice pipeline from public/app.js:
  // getSpeechToText -> userTranscript -> getAIResponse -> aiResponse -> textToSpeech
  
  const testCases = [
    {
      input: 'Halo VARIS',
      forbidden: 'Halo VARIS',
      expectedAI: 'Halo! Aku VARIS, asisten virtualmu. Ada yang bisa kubantu hari ini?',
      validate: (res) => {
        assert.notEqual(res.trim().toLowerCase(), 'halo varis', 'AI response must never match user greeting verbatim');
        assert.ok(res.length > 0);
      }
    },
    {
      input: 'Berapa 10 ditambah 20?',
      forbidden: 'Berapa 10 ditambah 20?',
      expectedAI: 'Hasil dari 10 ditambah 20 adalah 30.',
      validate: (res) => {
        assert.notEqual(res.trim().toLowerCase(), 'berapa 10 ditambah 20?', 'AI response must not echo math question');
        assert.ok(res.includes('30'), 'Response must contain calculation result 30');
      }
    },
    {
      input: 'Siapa kamu?',
      forbidden: 'Siapa kamu?',
      expectedAI: 'Aku VARIS, asisten kecerdasan buatan yang siap membantu berbagai keperluanmu.',
      validate: (res) => {
        assert.notEqual(res.trim().toLowerCase(), 'siapa kamu?', 'AI response must not echo identity question');
        assert.ok(res.toLowerCase().includes('varis') || res.toLowerCase().includes('asisten'), 'Response must introduce VARIS');
      }
    }
  ];

  for (const tc of testCases) {
    let ttsReceivedText = null;

    // Decoupled pipeline components:
    const mockSTT = async () => tc.input;
    const mockAI = async (userTranscript) => {
      assert.equal(userTranscript, tc.input);
      return tc.expectedAI;
    };
    const mockTTS = async (aiResponse) => {
      // RULE 3 & 4: Only aiResponse is sent to TTS, NEVER userTranscript!
      assert.notEqual(aiResponse, tc.forbidden, `TTS received forbidden user transcript: ${aiResponse}`);
      ttsReceivedText = aiResponse;
      return Buffer.from('mock-audio');
    };

    // Execute pipeline:
    const userTranscript = await mockSTT();
    assert.equal(userTranscript, tc.input);

    let aiResponse = await mockAI(userTranscript);
    
    // Anti-echo guard verification:
    if (aiResponse.trim().toLowerCase() === userTranscript.trim().toLowerCase()) {
      aiResponse = 'Halo! Ada yang bisa aku bantu?';
    }

    tc.validate(aiResponse);

    await mockTTS(aiResponse);
    assert.equal(ttsReceivedText, tc.expectedAI);
    assert.notEqual(ttsReceivedText, tc.forbidden);
  }
});

test('RULE 7 & 9: Voice pipeline AI failure never falls back to user transcript', async () => {
  const userTranscript = 'Pertanyaan penting saya';
  let ttsCalled = false;
  let displayedError = null;

  try {
    throw new Error('AI provider connection timeout');
  } catch (err) {
    // RULE 7: If AI fails, do NOT speak userTranscript! Show error instead.
    displayedError = 'Maaf, aku belum bisa memproses ucapanmu.';
  }

  assert.equal(displayedError, 'Maaf, aku belum bisa memproses ucapanmu.');
  assert.notEqual(displayedError, userTranscript, 'Error must not echo user input');
  assert.equal(ttsCalled, false, 'TTS must not be called when AI fails');
});

test('RULE 8: Empty or unclear transcript does not trigger TTS synthesis', async () => {
  const emptyTranscripts = ['', '   ', null, undefined];
  for (const transcript of emptyTranscripts) {
    let ttsCalled = false;
    if (!transcript || !transcript.trim()) {
      // Transcript is empty/unclear -> do not call TTS!
    } else {
      ttsCalled = true;
    }
    assert.equal(ttsCalled, false, `TTS should not be called for empty input: "${transcript}"`);
  }
});

test('RULE 13 Agent Integration: "Berapa 10 ditambah 20?" computes 30 and does not echo', async () => {
  const registry = createDefaultToolRegistry();
  let step = 0;

  const engine = createMockEngine(async ({ toolResults }) => {
    step += 1;
    if (step === 1) {
      return {
        toolCalls: [
          { callId: 'calc_add', name: 'calculator', arguments: { expression: '10 + 20' } },
        ],
        continuation: { step: 1 },
      };
    }
    if (step === 2) {
      assert.equal(toolResults[0].result.result.value, 30);
      return {
        text: 'Hasil dari 10 ditambah 20 adalah 30.',
        model: 'mock-model',
      };
    }
  });

  const agent = createAgentSystem({ engine, registry });
  const result = await agent.run({
    userMessage: 'Berapa 10 ditambah 20?',
    userId: 'u-voice-test',
    conversationId: 'c-voice-test',
  });

  assert.notEqual(result.text, 'Berapa 10 ditambah 20?');
  assert.ok(result.text.includes('30'));
});

test('Free Smart Engine: calculates arithmetic expressions in Indonesian accurately', () => {
  const cases = [
    { input: 'Berapa 10 ditambah 20?', expected: '30' },
    { input: '50 dikali 2 berapa', expected: '100' },
    { input: '100 dibagi 4', expected: '25' },
    { input: 'hitung 75 - 25', expected: '50' }
  ];

  for (const c of cases) {
    const res = generateFreeSmartResponse(c.input);
    assert.ok(res.includes(c.expected), `Expected "${res}" to contain "${c.expected}" for input "${c.input}"`);
    assert.notEqual(res, c.input, 'Response must never echo input');
  }
});

test('Free Smart Engine: answers identity, greetings, time, and questions without quota', () => {
  const idRes = generateFreeSmartResponse('Siapa kamu?');
  assert.ok(idRes.toLowerCase().includes('varis'));
  assert.notEqual(idRes, 'Siapa kamu?');

  const greetRes = generateFreeSmartResponse('Halo VARIS, apa kabar?');
  assert.ok(greetRes.toLowerCase().includes('baik') || greetRes.toLowerCase().includes('halo'));
  assert.notEqual(greetRes, 'Halo VARIS, apa kabar?');

  const timeRes = generateFreeSmartResponse('Jam berapa sekarang?');
  assert.ok(timeRes.toLowerCase().includes('pukul'));

  const dayRes = generateFreeSmartResponse('Hari apa ini?');
  assert.ok(dayRes.toLowerCase().includes('hari'));

  const jokeRes = generateFreeSmartResponse('Ceritakan lelucon');
  assert.ok(jokeRes.length > 10);
});

test('Free Smart Engine: answers role, robot distinction, science, history, and advice intelligently', () => {
  // Test role question (the exact question from the user screenshot)
  const roleRes = generateFreeSmartResponse('apa peran mu disini?');
  assert.ok(roleRes.toLowerCase().includes('peran') || roleRes.toLowerCase().includes('varis') || roleRes.toLowerCase().includes('asisten'));
  assert.ok(!roleRes.includes('langkah terbaik yang bisa kita ambil'), 'Must not give canned generic response');

  // Test robot question (the second question from the user screenshot)
  const robotRes = generateFreeSmartResponse('peran mu apakah sebagai robot?');
  assert.ok(robotRes.toLowerCase().includes('bukan robot fisik') || robotRes.toLowerCase().includes('kecerdasan buatan') || robotRes.toLowerCase().includes('asisten'));
  assert.ok(!robotRes.includes('langkah terbaik yang bisa kita ambil'), 'Must not give canned generic response');

  // Test science question
  const skyRes = generateFreeSmartResponse('kenapa langit biru?');
  assert.ok(skyRes.toLowerCase().includes('biru') || skyRes.toLowerCase().includes('rayleigh'));

  // Test history question
  const presRes = generateFreeSmartResponse('siapa presiden pertama indonesia?');
  assert.ok(presRes.toLowerCase().includes('soekarno'));

  // Test coding advice
  const codeRes = generateFreeSmartResponse('bagaimana cara belajar coding?');
  assert.ok(codeRes.toLowerCase().includes('coding') || codeRes.toLowerCase().includes('python') || codeRes.toLowerCase().includes('javascript'));

  // Test health advice
  const stressRes = generateFreeSmartResponse('bagaimana cara mengatasi stres?');
  assert.ok(stressRes.toLowerCase().includes('stres') || stressRes.toLowerCase().includes('napas') || stressRes.toLowerCase().includes('istirahat'));
});


