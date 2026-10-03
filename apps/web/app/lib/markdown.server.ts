import rehypeShiki, { type RehypeShikiOptions } from '@shikijs/rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const LANGS = [
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'json',
  'html',
  'css',
  'bash',
  'shell',
  'python',
  'php',
  'java',
  'kotlin',
  'dart',
  'go',
  'rust',
  'c',
  'cpp',
  'csharp',
  'swift',
  'sql',
  'yaml',
  'dockerfile',
  'markdown',
];

/**
 * Markdown des utilisateurs → HTML sûr.
 * Le HTML brut est ignoré et le résultat est nettoyé (rehype-sanitize) AVANT la coloration
 * du code : seul Shiki, qui est de confiance, ajoute des styles.
 */
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeShiki, {
    themes: { light: 'github-light', dark: 'github-dark' },
    langs: LANGS,
    fallbackLanguage: 'text',
    defaultLanguage: 'text',
  } as RehypeShikiOptions)
  .use(rehypeStringify);

export async function renderMarkdown(markdown: string): Promise<string> {
  return String(await processor.process(markdown));
}
