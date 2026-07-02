/**
 * build-blogs.js
 *
 * Runs at Netlify build time (see netlify.toml).
 * Reads every markdown file inside /posts (created by the Decap CMS "Blog Posts"
 * collection), converts each one into a plain JS object, and writes them all
 * out to /posts.json — a file the live site fetches at runtime to render the
 * blog cards and article modal.
 *
 * This means: publishing a new post in the CMS -> commit lands in /posts ->
 * Netlify rebuilds -> this script regenerates posts.json -> new post appears
 * on the site automatically. No manual HTML editing required.
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

marked.setOptions({ gfm: true, breaks: false });

const postsDir = path.join(__dirname, 'posts');
const outFile = path.join(__dirname, 'posts.json');

if (!fs.existsSync(postsDir)) {
  console.log('No /posts folder found — writing empty posts.json');
  fs.writeFileSync(outFile, '[]');
  process.exit(0);
}

const files = fs
  .readdirSync(postsDir)
  .filter((f) => f.toLowerCase().endsWith('.md') && f.toLowerCase() !== 'readme.md');

const posts = files
  .map((filename) => {
    try {
      const raw = fs.readFileSync(path.join(postsDir, filename), 'utf8');
      const { data, content } = matter(raw);

      // Decap saves filenames like 2026-07-02-my-post-title.md — strip the
      // leading date prefix to get a clean, readable slug.
      const slug = filename
        .replace(/\.md$/i, '')
        .replace(/^\d{4}-\d{2}-\d{2}-/, '');

      const bodyHtml = marked.parse(content || '');

      return {
        slug,
        title: data.title || 'Untitled',
        category: data.category || 'General',
        readtime: data.readtime || '',
        date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        image: data.image || '',
        summary: data.summary || '',
        bodyHtml,
      };
    } catch (err) {
      console.error(`Skipping ${filename} — failed to parse:`, err.message);
      return null;
    }
  })
  .filter(Boolean);

// Newest first
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

fs.writeFileSync(outFile, JSON.stringify(posts, null, 2));
console.log(`✅ Generated posts.json with ${posts.length} post(s).`);
