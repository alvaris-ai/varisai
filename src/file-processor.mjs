// ==========================================================
// VARIS AI — Real Multimodal File & Document Processor
// Processes workspace files, documents, and code attachments
// for LLM context injection and multimodal vision models.
// ==========================================================

import path from 'node:path';

export const SUPPORTED_EXTENSIONS = Object.freeze({
  TEXT: ['.txt', '.md', '.markdown', '.json', '.csv', '.tsv', '.yaml', '.yml', '.xml', '.html', '.css', '.scss'],
  CODE: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.sql', '.sh', '.bash'],
  DOCUMENT: ['.pdf', '.doc', '.docx'],
  IMAGE: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'],
});

/**
 * Format file content for AI prompt ingestion
 */
export function formatFileForPrompt({ filename, content, mimeType, maxChars = 24_000 }) {
  if (!content) return '';

  let sanitized = content;
  if (typeof content === 'string' && content.length > maxChars) {
    sanitized = content.slice(0, maxChars) + `\n\n... [Content truncated: ${content.length - maxChars} characters omitted]`;
  }

  const ext = path.extname(filename).toLowerCase();
  let lang = 'plaintext';
  if (['.js', '.mjs', '.cjs'].includes(ext)) lang = 'javascript';
  else if (['.ts', '.tsx'].includes(ext)) lang = 'typescript';
  else if (ext === '.py') lang = 'python';
  else if (ext === '.json') lang = 'json';
  else if (ext === '.html') lang = 'html';
  else if (ext === '.css') lang = 'css';
  else if (ext === '.sql') lang = 'sql';
  else if (ext === '.md') lang = 'markdown';
  else if (ext === '.csv') lang = 'csv';

  return `--- FILE ATTACHMENT: ${filename} ---
\`\`\`${lang}
${sanitized}
\`\`\`
--- END OF ATTACHMENT ---`;
}

/**
 * Inspect and extract text representation from raw buffer or string
 */
export async function processUploadedFile({ filename, buffer, mimeType }) {
  const ext = path.extname(filename).toLowerCase();

  // 1. Text & Code files
  if (
    SUPPORTED_EXTENSIONS.TEXT.includes(ext) ||
    SUPPORTED_EXTENSIONS.CODE.includes(ext) ||
    mimeType?.startsWith('text/') ||
    mimeType?.includes('json') ||
    mimeType?.includes('javascript')
  ) {
    const text = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer || '');
    return {
      type: 'text',
      filename,
      content: text,
      charCount: text.length,
      isMultimodal: false,
    };
  }

  // 2. Images (Multimodal)
  if (SUPPORTED_EXTENSIONS.IMAGE.includes(ext) || mimeType?.startsWith('image/')) {
    const base64 = Buffer.isBuffer(buffer) ? buffer.toString('base64') : '';
    const resolvedMime = mimeType || (ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg');
    return {
      type: 'image',
      filename,
      mimeType: resolvedMime,
      dataUrl: `data:${resolvedMime};base64,${base64}`,
      isMultimodal: true,
      content: `[Image Attachment: ${filename} (${resolvedMime})]`,
    };
  }

  // 3. Fallback Binary / Raw Documents
  const rawText = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer || '');
  return {
    type: 'document',
    filename,
    content: rawText,
    charCount: rawText.length,
    isMultimodal: false,
  };
}
