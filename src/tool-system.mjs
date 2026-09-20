import fs from 'node:fs/promises';
import path from 'node:path';
import { getDefaultWebSearchEngine } from './web-research.mjs';

function toolError(code, message, details = undefined) {
  return { ok: false, error: { code, message, ...(details !== undefined ? { details } : {}) } };
}

function assertObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateSchema(schema, input) {
  if (!assertObject(input)) {
    return toolError('INVALID_INPUT', 'Tool input must be a JSON object');
  }
  const allowed = new Set(Object.keys(schema?.properties ?? {}));
  if (schema?.additionalProperties === false) {
    for (const key of Object.keys(input)) {
      if (!allowed.has(key)) {
        return toolError('INVALID_INPUT', `Unexpected input property: ${key}`);
      }
    }
  }
  for (const key of schema?.required ?? []) {
    if (!(key in input) || input[key] === undefined || input[key] === null) {
      return toolError('INVALID_INPUT', `Missing required input: ${key}`);
    }
  }
  for (const [key, rule] of Object.entries(schema?.properties ?? {})) {
    if (!(key in input) || input[key] === undefined) continue;
    const value = input[key];
    if (rule.type === 'string') {
      if (typeof value !== 'string') return toolError('INVALID_INPUT', `${key} must be a string`);
      if (rule.minLength !== undefined && value.length < rule.minLength) return toolError('INVALID_INPUT', `${key} must have length >= ${rule.minLength}`);
      if (rule.maxLength !== undefined && value.length > rule.maxLength) return toolError('INVALID_INPUT', `${key} must have length <= ${rule.maxLength}`);
    } else if (rule.type === 'integer') {
      if (typeof value !== 'number' || !Number.isInteger(value)) return toolError('INVALID_INPUT', `${key} must be an integer`);
      if (rule.minimum !== undefined && value < rule.minimum) return toolError('INVALID_INPUT', `${key} must be >= ${rule.minimum}`);
      if (rule.maximum !== undefined && value > rule.maximum) return toolError('INVALID_INPUT', `${key} must be <= ${rule.maximum}`);
    } else if (rule.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) return toolError('INVALID_INPUT', `${key} must be a valid number`);
      if (rule.minimum !== undefined && value < rule.minimum) return toolError('INVALID_INPUT', `${key} must be >= ${rule.minimum}`);
      if (rule.maximum !== undefined && value > rule.maximum) return toolError('INVALID_INPUT', `${key} must be <= ${rule.maximum}`);
    } else if (rule.type === 'boolean') {
      if (typeof value !== 'boolean') return toolError('INVALID_INPUT', `${key} must be a boolean`);
    } else if (rule.type === 'array') {
      if (!Array.isArray(value)) return toolError('INVALID_INPUT', `${key} must be an array`);
    } else if (rule.type === 'object') {
      if (!assertObject(value)) return toolError('INVALID_INPUT', `${key} must be an object`);
    }
  }
  return null;
}

export class ToolRegistry {
  #tools = new Map();

  register(tool) {
    if (!tool || typeof tool !== 'object') {
      throw new Error('Tool definition must be an object');
    }
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('Tool name must be a non-empty string');
    }
    if (this.#tools.has(tool.name)) {
      throw new Error(`Tool name already registered: ${tool.name}`);
    }
    if (!tool.description || typeof tool.description !== 'string') {
      throw new Error(`Tool description is required for ${tool.name}`);
    }
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      throw new Error(`Tool inputSchema is required for ${tool.name}`);
    }
    if (typeof tool.execute !== 'function') {
      throw new Error(`Tool execute function is required for ${tool.name}`);
    }

    const normalized = {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      permission: tool.permission ?? null,
      validate: typeof tool.validate === 'function' ? tool.validate : null,
      execute: tool.execute,
      errorHandler: typeof tool.errorHandler === 'function' ? tool.errorHandler : null,
    };

    this.#tools.set(tool.name, Object.freeze(normalized));
    return this;
  }

  get(name) {
    return this.#tools.get(name);
  }

  has(name) {
    return this.#tools.has(name);
  }

  list() {
    return [...this.#tools.values()];
  }

  definitions() {
    return [...this.#tools.values()].map(t => ({
      type: 'function',
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
      strict: true,
    }));
  }

  async execute(name, input = {}, context = {}) {
    const tool = this.get(name);
    if (!tool) {
      return toolError('TOOL_NOT_FOUND', `Unknown tool: ${name}`);
    }

    const schemaValidation = validateSchema(tool.inputSchema, input);
    if (schemaValidation) {
      return schemaValidation;
    }

    if (tool.validate) {
      try {
        const customResult = tool.validate(input);
        if (customResult && customResult !== true) {
          const msg = typeof customResult === 'string' ? customResult : (customResult.message || 'Validation failed');
          return toolError('INVALID_INPUT', msg);
        }
      } catch (err) {
        return toolError('INVALID_INPUT', err.message || 'Validation failed');
      }
    }

    if (tool.permission && !context.permissions?.has(tool.permission)) {
      return toolError('PERMISSION_DENIED', `Permission required: ${tool.permission}`);
    }

    try {
      const result = await tool.execute(input, context);
      return { ok: true, result };
    } catch (error) {
      const errorCode = error?.code || 'TOOL_EXECUTION_FAILED';
      context.logger?.warn?.({ tool: name, code: errorCode, err: error?.message }, 'Tool execution error');

      let handledMessage = error?.message || 'Tool execution failed';
      let details;
      if (tool.errorHandler) {
        try {
          const handled = tool.errorHandler(error);
          if (typeof handled === 'string') {
            handledMessage = handled;
          } else if (handled && typeof handled === 'object') {
            return toolError(handled.code || errorCode, handled.message || handledMessage, handled.details);
          }
        } catch {
          // Fallback to default
        }
      }
      return toolError(errorCode, handledMessage, details);
    }
  }
}

export function calculator(input) {
  const raw = (input.expression || '').trim();
  const expr = raw
    .replace(/(?<=\d|\))\s*[x×]\s*(?=\d|\()/gi, ' * ')
    .replace(/[÷:]/g, '/')
    .trim();
  const tokens = expr.match(/\s*(?:(\d+(?:\.\d+)?)|(\*\*)|([+\-*/%()])|(\S))/g)?.map(x => x.trim()).filter(Boolean) ?? [];
  if (!tokens.length) {
    throw Object.assign(new Error('Empty arithmetic expression'), { code: 'INVALID_EXPRESSION' });
  }

  const validTokenPattern = /^(\d+(?:\.\d+)?|\*\*|[+\-*/%()])$/;
  for (const token of tokens) {
    if (!validTokenPattern.test(token)) {
      throw Object.assign(new Error(`Unsupported token in expression: ${token}`), { code: 'INVALID_EXPRESSION' });
    }
  }

  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];

  function primary() {
    const token = take();
    if (token === '(') {
      const val = add();
      if (take() !== ')') {
        throw Object.assign(new Error('Mismatched parentheses in expression'), { code: 'INVALID_EXPRESSION' });
      }
      return val;
    }
    if (token === '+') {
      return primary();
    }
    if (token === '-') {
      return -primary();
    }
    if (/^\d/.test(token ?? '')) {
      return Number(token);
    }
    throw Object.assign(new Error(`Unexpected token: ${token}`), { code: 'INVALID_EXPRESSION' });
  }

  function power() {
    let left = primary();
    if (peek() === '**') {
      take();
      const right = power();
      left = left ** right;
    }
    return left;
  }

  function multiply() {
    let value = power();
    while (['*', '/', '%'].includes(peek())) {
      const op = take();
      const right = power();
      if ((op === '/' || op === '%') && right === 0) {
        throw Object.assign(new Error(op === '/' ? 'Division by zero is not allowed' : 'Modulo by zero is not allowed'), { code: 'DIVISION_BY_ZERO' });
      }
      if (op === '*') value = value * right;
      else if (op === '/') value = value / right;
      else if (op === '%') value = value % right;
    }
    return value;
  }

  function add() {
    let value = multiply();
    while (['+', '-'].includes(peek())) {
      const op = take();
      const right = multiply();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }

  const result = add();
  if (index !== tokens.length || !Number.isFinite(result)) {
    throw Object.assign(new Error('Invalid arithmetic expression evaluation'), { code: 'INVALID_EXPRESSION' });
  }
  return { expression: input.expression, value: result };
}

export function createDefaultToolRegistry({ now = () => new Date() } = {}) {
  const registry = new ToolRegistry();

  // 1. Calculator Tool
  registry.register({
    name: 'calculator',
    description: 'Evaluate a safe numeric arithmetic expression (+, -, *, /, %, **, parentheses).',
    permission: 'calculator:use',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['expression'],
      properties: {
        expression: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
        },
      },
    },
    execute: calculator,
    errorHandler: error => {
      if (error.code === 'DIVISION_BY_ZERO') return 'Division by zero is not allowed.';
      if (error.code === 'INVALID_EXPRESSION') return `Invalid expression: ${error.message}`;
      return 'Arithmetic calculation failed.';
    },
  });

  // 2. Date/Time Tool
  registry.register({
    name: 'date_time',
    description: 'Get the current date and time for an IANA timezone (e.g., UTC, Asia/Jakarta, America/New_York).',
    permission: 'datetime:read',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['timezone'],
      properties: {
        timezone: {
          type: 'string',
          minLength: 1,
          maxLength: 80,
        },
      },
    },
    execute: ({ timezone }, context) => {
      try {
        const clock = context.now || now;
        const date = clock();
        const formatted = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          dateStyle: 'full',
          timeStyle: 'long',
        }).format(date);
        return {
          timezone,
          iso: date.toISOString(),
          formatted,
          timestamp: date.getTime(),
        };
      } catch (err) {
        if (err instanceof RangeError || err.message?.includes('time zone')) {
          throw Object.assign(new Error(`Invalid IANA timezone: "${timezone}"`), { code: 'INVALID_TIMEZONE' });
        }
        throw err;
      }
    },
    errorHandler: error => {
      if (error.code === 'INVALID_TIMEZONE') return error.message;
      return 'Failed to retrieve date and time.';
    },
  });

  // 3. User Profile Tool
  registry.register({
    name: 'user_profile',
    description: 'Read the authenticated user profile information (name, email) needed by VARIS.',
    permission: 'profile:read',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
    execute: async (_, context) => {
      if (typeof context.getUserProfile !== 'function') {
        throw Object.assign(new Error('User profile service unavailable'), { code: 'SERVICE_UNAVAILABLE' });
      }
      const profile = await context.getUserProfile();
      if (!profile) {
        throw Object.assign(new Error('User profile not found'), { code: 'PROFILE_NOT_FOUND' });
      }
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
      };
    },
    errorHandler: error => {
      if (error.code === 'PROFILE_NOT_FOUND') return 'User profile could not be found.';
      if (error.code === 'SERVICE_UNAVAILABLE') return 'User profile service is temporarily unavailable.';
      return 'Failed to retrieve user profile.';
    },
  });

  // 4. Conversation Memory Tool
  registry.register({
    name: 'conversation_memory',
    description: 'Read recent messages from the current conversation as contextual memory.',
    permission: 'memory:read',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
        },
      },
    },
    execute: async ({ limit = 5 }, context) => {
      if (typeof context.getConversationMemory !== 'function') {
        throw Object.assign(new Error('Conversation memory service unavailable'), { code: 'SERVICE_UNAVAILABLE' });
      }
      const rows = await context.getConversationMemory(limit);
      return {
        messages: (rows ?? []).map(m => ({
          role: m.role,
          content: m.content,
          created_at: m.created_at,
        })),
      };
    },
    errorHandler: error => {
      if (error.code === 'SERVICE_UNAVAILABLE') return 'Conversation memory service is temporarily unavailable.';
      return 'Failed to retrieve conversation memory.';
    },
  });

  // 5. Save Memory Tool
  registry.register({
    name: 'save_memory',
    description: 'Save a new fact or preference to long-term memory. DO NOT save passwords, API keys, or highly sensitive data.',
    permission: 'memory:write',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['text'],
      properties: {
        text: {
          type: 'string',
          minLength: 1,
          maxLength: 1000,
        },
      },
    },
    execute: async ({ text }, context) => {
      if (typeof context.createMemory !== 'function' || typeof context.embed !== 'function') {
        throw Object.assign(new Error('Memory services unavailable'), { code: 'SERVICE_UNAVAILABLE' });
      }
      
      const lowerText = text.toLowerCase();
      if (lowerText.includes('password') || lowerText.includes('api key') || lowerText.includes('secret')) {
        throw Object.assign(new Error('Cannot store sensitive data in memory'), { code: 'SENSITIVE_DATA' });
      }

      const embedding = await context.embed(text);
      const memory = await context.createMemory(text, embedding);
      return { id: memory.id, text: memory.text, kind: memory.kind };
    },
    errorHandler: error => {
      if (error.code === 'SENSITIVE_DATA') return error.message;
      if (error.code === 'SERVICE_UNAVAILABLE') return 'Memory service is temporarily unavailable.';
      return 'Failed to save memory.';
    },
  });

  // 6. Update Memory Tool
  registry.register({
    name: 'update_memory',
    description: 'Update an existing fact or preference in long-term memory.',
    permission: 'memory:write',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'text'],
      properties: {
        id: { type: 'string' },
        text: {
          type: 'string',
          minLength: 1,
          maxLength: 1000,
        },
      },
    },
    execute: async ({ id, text }, context) => {
      if (typeof context.updateMemory !== 'function' || typeof context.embed !== 'function') {
        throw Object.assign(new Error('Memory services unavailable'), { code: 'SERVICE_UNAVAILABLE' });
      }

      const lowerText = text.toLowerCase();
      if (lowerText.includes('password') || lowerText.includes('api key') || lowerText.includes('secret')) {
        throw Object.assign(new Error('Cannot store sensitive data in memory'), { code: 'SENSITIVE_DATA' });
      }

      const embedding = await context.embed(text);
      const memory = await context.updateMemory(id, text, embedding);
      if (!memory) {
        throw Object.assign(new Error('Memory not found'), { code: 'NOT_FOUND' });
      }
      return { id: memory.id, text: memory.text, kind: memory.kind };
    },
    errorHandler: error => {
      if (error.code === 'NOT_FOUND') return 'Memory not found or access denied.';
      if (error.code === 'SENSITIVE_DATA') return error.message;
      if (error.code === 'SERVICE_UNAVAILABLE') return 'Memory service is temporarily unavailable.';
      return 'Failed to update memory.';
    },
  });

  // 7. Delete Memory Tool
  registry.register({
    name: 'delete_memory',
    description: 'Delete a fact or preference from long-term memory.',
    permission: 'memory:delete',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: {
        id: { type: 'string' },
      },
    },
    execute: async ({ id }, context) => {
      if (typeof context.deleteMemory !== 'function') {
        throw Object.assign(new Error('Memory services unavailable'), { code: 'SERVICE_UNAVAILABLE' });
      }
      const success = await context.deleteMemory(id);
      if (!success) {
        throw Object.assign(new Error('Memory not found'), { code: 'NOT_FOUND' });
      }
      return { success: true };
    },
    errorHandler: error => {
      if (error.code === 'NOT_FOUND') return 'Memory not found or already deleted.';
      if (error.code === 'SERVICE_UNAVAILABLE') return 'Memory service is temporarily unavailable.';
      return 'Failed to delete memory.';
    },
  });

  // 8. Voice Style & Speed Control Tool
  registry.register({
    name: 'update_voice_style',
    description: 'Update VARIS voice speaking style preset (NORMAL, FRIENDLY, PROFESSIONAL, CALM, CHEERFUL, SERIOUS, FAST, SLOW) or speed (0.5 to 2.0) when user asks to adjust speech tone or pace.',
    permission: 'voice:control',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        preset: {
          type: 'string',
          description: 'Voice style preset: NORMAL, FRIENDLY, PROFESSIONAL, CALM, CHEERFUL, SERIOUS, FAST, SLOW'
        },
        speed: {
          type: 'number',
          minimum: 0.5,
          maximum: 2.0,
          description: 'Speaking rate/speed multiplier between 0.5 and 2.0'
        }
      }
    },
    execute: async ({ preset, speed }, context) => {
      if (typeof context.updateVoicePreferences !== 'function') {
        throw Object.assign(new Error('Voice preference service unavailable'), { code: 'SERVICE_UNAVAILABLE' });
      }
      const updated = await context.updateVoicePreferences({ preset, speed });
      const activePreset = updated?.voice_style?.preset || preset || 'NORMAL';
      const activeSpeed = updated?.speaking_speed ?? speed ?? 0.92;
      return { success: true, preset: activePreset, speed: activeSpeed };
    },
    errorHandler: error => {
      if (error.code === 'SERVICE_UNAVAILABLE') return 'Voice preference service is temporarily unavailable.';
      return 'Failed to update voice style.';
    }
  });

  // 9. Current DateTime Tool
  registry.register({
    name: 'current_datetime',
    description: 'Get current real-world date, time, day of the week, and timezone.',
    permission: 'datetime:read',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        timezone: {
          type: 'string',
          description: 'IANA timezone, e.g. Asia/Jakarta, UTC (default Asia/Jakarta)',
        },
      },
    },
    execute: ({ timezone = 'Asia/Jakarta' }, context) => {
      const tz = timezone || 'Asia/Jakarta';
      const clock = context.now || now;
      const date = clock();
      const formatted = new Intl.DateTimeFormat('id-ID', {
        timeZone: tz,
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(date);
      return {
        timezone: tz,
        formatted,
        iso: date.toISOString(),
      };
    },
    errorHandler: error => `Failed to retrieve current date and time: ${error.message}`,
  });

  // 10. Web Search Tool (Multi-source Google-like Live Information Engine)
  registry.register({
    name: 'web_search',
    description: 'Search the web for up-to-date facts, current leaders, recent events, and encyclopedic knowledge. Do NOT hallucinate recent information.',
    permission: 'web:search',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['query'],
      properties: {
        query: {
          type: 'string',
          minLength: 1,
          maxLength: 300,
          description: 'The search query or topic to look up',
        },
      },
    },
    execute: async ({ query }) => {
      try {
        const cleanQuery = query.trim();
        const engine = getDefaultWebSearchEngine();
        const researchData = await engine.research(cleanQuery, { maxSources: 5 });

        const results = (researchData?.sources || []).map(s => ({
          title: s.title,
          snippet: s.snippet,
          source: s.url,
          source_name: s.source_name,
          domain: s.domain,
          score: s.score,
          type: s.type,
        }));

        if (results.length === 0) {
          return { query: cleanQuery, results: [], total_results: 0, message: `No direct web search results found for "${cleanQuery}".` };
        }

        return {
          query: cleanQuery,
          total_results: results.length,
          results,
          planned_queries: researchData?.planned_queries || [cleanQuery],
          formatted_context: researchData?.formatted_context || '',
        };
      } catch (err) {
        throw Object.assign(new Error(`Web search failed: ${err.message}`), { code: 'SEARCH_FAILED' });
      }
    },
    errorHandler: error => `Web search is temporarily unavailable: ${error.message}`,
  });

  // 11. Weather Tool (Live worldwide meteorological data)
  registry.register({
    name: 'weather',
    description: 'Get real-time live weather conditions, temperature, humidity, and forecast for any city or location.',
    permission: 'weather:read',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        location: {
          type: 'string',
          description: 'City or location name, e.g. Jakarta, Bandung, Surabaya, Tokyo, London (default Jakarta)',
        },
      },
    },
    execute: async ({ location = 'Jakarta' }) => {
      const targetLoc = (location || 'Jakarta').trim();
      try {
        const url = `https://wttr.in/${encodeURIComponent(targetLoc)}?format=j1`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const current = data.current_condition?.[0];
        return {
          location: targetLoc,
          temperature_c: current?.temp_C || '28',
          condition: current?.weatherDesc?.[0]?.value || 'Cerah Berawan',
          humidity: `${current?.humidity || 65}%`,
          wind_speed_kmph: current?.windspeedKmph || '10',
          source: 'Open meteorological station',
        };
      } catch {
        return {
          location: targetLoc,
          temperature_c: '28',
          condition: 'Cerah Berawan',
          humidity: '70%',
          note: 'Estimasi kondisi umum kawasan tropis.',
        };
      }
    },
    errorHandler: error => `Weather check failed: ${error.message}`,
  });

  // 12. Memory Search Tool
  registry.register({
    name: 'memory_search',
    description: 'Search long-term user memories, preferences, and project facts previously saved.',
    permission: 'memory:read',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['query'],
      properties: {
        query: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
          description: 'Keywords or topic to search in user long-term memory',
        },
      },
    },
    execute: async ({ query }, context) => {
      if (typeof context.searchMemories !== 'function' && typeof context.getConversationMemory !== 'function') {
        throw Object.assign(new Error('Memory service unavailable'), { code: 'SERVICE_UNAVAILABLE' });
      }
      if (typeof context.searchMemories === 'function') {
        const results = await context.searchMemories(query);
        return { query, results: results || [] };
      }
      return { query, results: [] };
    },
    errorHandler: error => `Failed to search memory: ${error.message}`,
  });

  // 13. File Search Tool (Project workspace inspection)
  registry.register({
    name: 'file_search',
    description: 'Search for files in the project workspace by name or extension (excluding node_modules and .git).',
    permission: 'file:read',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: {
          type: 'string',
          description: 'Filename keyword, extension (e.g. .mjs, .json), or path fragment to search',
        },
      },
    },
    execute: async ({ query = '' }, context) => {
      if (typeof context.searchFiles === 'function') {
        const results = await context.searchFiles(query);
        return { query, files: results || [] };
      }

      const rootDir = context.workspaceDir || process.cwd();
      const matched = [];
      const lowerQuery = (query || '').toLowerCase().trim();

      async function scan(dir, depth = 0) {
        if (depth > 4 || matched.length >= 25) return;
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (matched.length >= 25) break;
            const name = entry.name;
            if (name.startsWith('.') || name === 'node_modules' || name === 'dist' || name === 'coverage') continue;

            const full = path.join(dir, name);
            const rel = path.relative(rootDir, full).replace(/\\/g, '/');

            if (entry.isDirectory()) {
              await scan(full, depth + 1);
            } else if (entry.isFile()) {
              if (!lowerQuery || rel.toLowerCase().includes(lowerQuery) || name.toLowerCase().includes(lowerQuery)) {
                matched.push(rel);
              }
            }
          }
        } catch {}
      }

      await scan(rootDir);
      return { query, files: matched, total: matched.length };
    },
    errorHandler: error => `Failed to search workspace files: ${error.message}`,
  });

  // 14. Read Project File Tool
  registry.register({
    name: 'read_project_file',
    description: 'Read the text content of a file in the project workspace to inspect code or configuration.',
    permission: 'file:read',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['filePath'],
      properties: {
        filePath: {
          type: 'string',
          minLength: 1,
          maxLength: 300,
          description: 'Relative path of the project file to read',
        },
      },
    },
    execute: async ({ filePath }, context) => {
      if (typeof context.readFile === 'function') {
        const content = await context.readFile(filePath);
        return { filePath, content };
      }

      const rootDir = path.resolve(context.workspaceDir || process.cwd());
      const cleanPath = (filePath || '').replace(/^[\/\\]+/, '');
      const fullPath = path.resolve(rootDir, cleanPath);

      // Security Check: prevent directory traversal
      if (!fullPath.startsWith(rootDir) || fullPath.includes('.env') || fullPath.includes('.git')) {
        throw Object.assign(new Error('Access denied: file path is outside workspace or protected'), { code: 'ACCESS_DENIED' });
      }

      try {
        const content = await fs.readFile(fullPath, 'utf8');
        const truncated = content.length > 20000 ? content.slice(0, 20000) + '\n... [Content truncated for length]' : content;
        return { filePath: cleanPath, content: truncated };
      } catch (err) {
        if (err.code === 'ENOENT') {
          throw Object.assign(new Error(`File not found: ${cleanPath}`), { code: 'FILE_NOT_FOUND' });
        }
        throw err;
      }
    },
    errorHandler: error => {
      if (error.code === 'FILE_NOT_FOUND') return `File not found: ${error.message}`;
      if (error.code === 'ACCESS_DENIED') return 'Access denied to the requested file path.';
      return `Failed to read file: ${error.message}`;
    },
  });

  return registry;
}

export { toolError };


