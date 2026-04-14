#!/usr/bin/env node
/**
 * publish-post.mjs
 * Usage: node publish-post.mjs <path/to/post.docx> [--dry-run]
 *
 * Converts a .docx file to an HTML blog post, adds a card to blog.html,
 * and commits + pushes everything to git.
 */

import mammoth from 'mammoth';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const docxPath = args.find(a => !a.startsWith('--'));

if (!docxPath) {
  console.error('Usage: node publish-post.mjs <path/to/post.docx> [--dry-run]');
  process.exit(1);
}

const absDocxPath = path.resolve(docxPath);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a filename (without extension) to a URL-safe slug */
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Format a Date as "Month YYYY" */
function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Estimate reading time in minutes from word count */
function readingTime(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Extract the text of the first <h1> or <h2> from an HTML string */
function extractTitle(html, fallback) {
  const m = html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
  if (!m) return fallback;
  return m[1].replace(/<[^>]+>/g, '').trim();
}

/** Strip the first heading element from HTML (it becomes the page <h1>) */
function stripFirstHeading(html) {
  return html.replace(/<h[12][^>]*>[\s\S]*?<\/h[12]>/i, '').trim();
}

// ── Step 1: Convert docx → HTML ───────────────────────────────────────────────
console.log(`\n📄  Reading ${path.basename(absDocxPath)}…`);

let rawHtml;
try {
  const result = await mammoth.convertToHtml({ path: absDocxPath });
  rawHtml = result.value;
  if (result.messages.length) {
    result.messages.forEach(m => console.warn(`   ⚠  mammoth: ${m.message}`));
  }
  console.log('✅  Converted docx → HTML');
} catch (err) {
  console.error(`❌  Failed to convert docx: ${err.message}`);
  process.exit(1);
}

// ── Step 2: Derive metadata ───────────────────────────────────────────────────
const basename = path.basename(absDocxPath, path.extname(absDocxPath));
const slug = toSlug(basename);
const title = extractTitle(rawHtml, basename);
const bodyHtml = stripFirstHeading(rawHtml);
const today = new Date();
const dateLabel = formatDate(today);
const mins = readingTime(rawHtml.replace(/<[^>]+>/g, ' '));
const outputFile = path.join(__dirname, `post-${slug}.html`);
const outputFilename = `post-${slug}.html`;

console.log(`📝  Title  : ${title}`);
console.log(`🔗  Slug   : ${slug}`);
console.log(`📅  Date   : ${dateLabel}`);
console.log(`⏱   Read   : ${mins} min read`);

// ── Step 3: Build the full HTML page ─────────────────────────────────────────
const postHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- SEO -->
  <title>${title} — MathLedX</title>
  <meta name="description" content="" />

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />

  <!-- Site styles -->
  <link rel="stylesheet" href="styles.css" />

  <!-- Blog post styles -->
  <style>
    /* ── Post header ── */
    .post-hero {
      background: var(--bg, #ffffff);
      border-bottom: 1px solid var(--border, #e5e3de);
      padding: calc(var(--nav-h, 68px) + 56px) 0 56px;
    }
    .post-hero-inner {
      max-width: 740px;
      margin: 0 auto;
    }
    .post-category {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--blue, #1a56db);
      margin-bottom: 20px;
    }
    .post-hero h1 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: clamp(1.9rem, 4vw, 2.75rem);
      font-weight: 800;
      line-height: 1.18;
      color: var(--navy, #0f1f3d);
      margin: 0 0 24px;
      letter-spacing: -0.02em;
    }
    .post-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
      color: var(--text-subtle, #6b7280);
    }
    .post-meta-dot {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: var(--text-subtle, #6b7280);
      display: inline-block;
    }
    .post-meta strong {
      color: var(--text, #1a1a2e);
      font-weight: 600;
    }

    /* ── Post body ── */
    .post-body {
      padding: 64px 0 80px;
      background: var(--bg, #ffffff);
    }
    .post-content {
      max-width: 740px;
      margin: 0 auto;
      font-family: 'Inter', sans-serif;
      font-size: 1.0625rem;
      line-height: 1.8;
      color: var(--text, #1a1a2e);
    }
    .post-content p {
      margin: 0 0 1.5em;
    }
    .post-content h2 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--navy, #0f1f3d);
      margin: 2.5em 0 0.75em;
      letter-spacing: -0.01em;
      line-height: 1.3;
    }
    .post-content h2:first-child {
      margin-top: 0;
    }
    .post-content h3 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--navy, #0f1f3d);
      margin: 2em 0 0.5em;
      line-height: 1.4;
    }
    .post-content strong {
      font-weight: 600;
      color: var(--navy, #0f1f3d);
    }
    .post-content em {
      font-style: italic;
      color: var(--text, #1a1a2e);
    }
    .post-content ul,
    .post-content ol {
      margin: 0 0 1.5em 1.5em;
      padding: 0;
    }
    .post-content li {
      margin-bottom: 0.5em;
    }

    /* Divider */
    .post-divider {
      border: none;
      border-top: 1px solid var(--border, #e5e3de);
      margin: 2.5em 0;
    }

    /* ── Email CTA ── */
    .post-cta {
      background: var(--bg-alt, #f8f7f4);
      border-top: 1px solid var(--border, #e5e3de);
      border-bottom: 1px solid var(--border, #e5e3de);
      padding: 64px 0;
    }
    .post-cta-inner {
      max-width: 560px;
      margin: 0 auto;
      text-align: center;
    }
    .post-cta-label {
      font-family: 'Inter', sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--blue, #1a56db);
      margin-bottom: 16px;
    }
    .post-cta h2 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 1.625rem;
      font-weight: 700;
      color: var(--navy, #0f1f3d);
      margin: 0 0 12px;
      letter-spacing: -0.01em;
      line-height: 1.3;
    }
    .post-cta p {
      font-family: 'Inter', sans-serif;
      font-size: 1rem;
      color: var(--text-subtle, #6b7280);
      line-height: 1.6;
      margin: 0 0 28px;
    }
    .post-cta-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    /* ── Responsive ── */
    @media (max-width: 800px) {
      .post-hero { padding: 48px 0 40px; }
      .post-content { font-size: 1rem; }
      .post-content h2 { font-size: 1.3rem; }
    }
  </style>
</head>
<body>

  <!-- ═══ NAV ═══ -->
  <header class="nav" role="banner">
    <div class="nav-inner">
      <a href="index.html" class="logo-pill" aria-label="MathLedX home">
        <img src="images/MathLedX%20(2).png" alt="MathLedX" />
      </a>
      <nav class="nav-links" aria-label="Primary navigation">
        <a href="index.html" class="nav-link">Home</a>
        <a href="curriculum.html" class="nav-link">Curriculum</a>
        <a href="tutoring.html" class="nav-link">Tutoring</a>
        <a href="blog.html" class="nav-link active">Blog</a>
      </nav>
      <a href="tutoring.html" class="btn-primary btn-sm nav-cta">Book Tutoring</a>
      <button class="menu-toggle" id="menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <div class="mobile-menu" id="mobile-menu" aria-label="Mobile navigation">
    <div class="mobile-menu-inner">
      <a href="index.html" class="mobile-nav-link">Home</a>
      <a href="curriculum.html" class="mobile-nav-link">Curriculum</a>
      <a href="tutoring.html" class="mobile-nav-link">Tutoring</a>
      <a href="blog.html" class="mobile-nav-link active">Blog</a>
      <a href="tutoring.html" class="btn-primary mobile-cta">Book Tutoring</a>
    </div>
  </div>

  <!-- ═══ POST HEADER ═══ -->
  <section class="post-hero">
    <div class="container">
      <div class="post-hero-inner fade-up">
        <div class="post-category">General</div>
        <h1>${title}</h1>
        <div class="post-meta">
          <strong>Rich Hollinger</strong>
          <span class="post-meta-dot"></span>
          ${dateLabel}
          <span class="post-meta-dot"></span>
          ${mins} min read
        </div>
      </div>
    </div>
  </section>

  <!-- ═══ POST BODY ═══ -->
  <article class="post-body">
    <div class="container">
      <div class="post-content fade-up">

        ${bodyHtml}

        <hr class="post-divider" />

        <p style="color: var(--text-subtle, #6b7280); font-size: 0.9375rem;">
          <strong style="color: var(--navy, #0f1f3d);">Rich Hollinger</strong> is a high school math teacher at San Marino High School and the founder of MathLedX. He holds a B.A. in Mathematics and a Master's in Math Education.
        </p>

      </div>
    </div>
  </article>

  <!-- ═══ POST CTA ═══ -->
  <section class="post-cta">
    <div class="container">
      <div class="post-cta-inner fade-up">
        <div class="post-cta-label">More Like This</div>
        <h2>Want the next post in your inbox?</h2>
        <p>I write about the specific ways the math system fails capable students — and what parents can actually do about it. No jargon. No fluff.</p>
        <div class="post-cta-actions">
          <a href="tutoring.html" class="btn-primary btn-lg">
            Book a Free Consultation
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M3 8.5h11M9.5 4l4.5 4.5L9.5 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
          <a href="blog.html" class="btn-outline btn-lg">Back to Blog</a>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══ FOOTER ═══ -->
  <footer class="footer" role="contentinfo">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="index.html" class="logo-pill" style="margin-bottom:4px;" aria-label="MathLedX home">
            <img src="images/MathLedX%20(2).png" alt="MathLedX" style="height:28px;" />
          </a>
          <p>Built by a math teacher who had to figure it out the hard way.</p>
        </div>
        <div>
          <div class="footer-col-title">Pages</div>
          <ul class="footer-links">
            <li><a href="index.html">Home</a></li>
            <li><a href="curriculum.html">Curriculum</a></li>
            <li><a href="tutoring.html">Tutoring</a></li>
            <li><a href="blog.html">Blog</a></li>
          </ul>
        </div>
        <div>
          <div class="footer-col-title">Contact</div>
          <ul class="footer-links">
            <li class="footer-contact-item">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1.5 3.5h13v9h-13v-9zm0 0l6.5 5.5 6.5-5.5" stroke="rgba(255,255,255,0.4)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <a href="mailto:richhollinger@mathledx.com">richhollinger@mathledx.com</a>
            </li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-copy">&copy; 2026 MathLedX. All rights reserved.</p>
        <div class="footer-legal">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </div>
    </div>
  </footer>

  <script src="main.js"></script>
</body>
</html>
`;

// ── Step 4: Write the post file ───────────────────────────────────────────────
try {
  writeFileSync(outputFile, postHtml, 'utf8');
  console.log(`✅  Saved → ${outputFilename}`);
} catch (err) {
  console.error(`❌  Could not write post file: ${err.message}`);
  process.exit(1);
}

// ── Step 5: Add card to blog.html ─────────────────────────────────────────────
const blogPath = path.join(__dirname, 'blog.html');
let blogHtml;
try {
  blogHtml = readFileSync(blogPath, 'utf8');
} catch (err) {
  console.error(`❌  Could not read blog.html: ${err.message}`);
  process.exit(1);
}

const POSTS_END = '<!-- POSTS_END -->';
const CTA_MARKER = '<!-- ═══ CTA ═══ -->';

// Build the new card HTML
const newCard = `
      <a href="${outputFilename}" class="blog-card fade-up">
        <div class="blog-thumb">
          <div class="blog-thumb-math">∑</div>
          <div class="blog-thumb-overlay"></div>
        </div>
        <div class="blog-content">
          <div class="blog-tag">General</div>
          <h2 class="blog-title">${title}</h2>
          <div class="blog-meta">
            <span>Rich Hollinger</span>
            <span class="blog-meta-dot"></span>
            <span>${dateLabel}</span>
            <span class="blog-meta-dot"></span>
            <span>${mins} min read</span>
          </div>
        </div>
      </a>`;

let updatedBlog;

if (blogHtml.includes(POSTS_END)) {
  // Sentinel exists — insert the card before it
  updatedBlog = blogHtml.replace(POSTS_END, `${newCard}\n      ${POSTS_END}`);
  console.log('✅  Inserted card into existing Recent Posts section in blog.html');
} else if (blogHtml.includes(CTA_MARKER)) {
  // No sentinel yet — create the Recent Posts section before the CTA
  const recentSection = `
  <!-- ═══ RECENT POSTS ═══ -->
  <section class="section">
    <div class="container">
      <div class="section-label fade-up" style="margin-bottom: 24px;">Recent Posts</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
${newCard}
      </div>
      ${POSTS_END}
    </div>
  </section>

  `;
  updatedBlog = blogHtml.replace(CTA_MARKER, recentSection + CTA_MARKER);
  console.log('✅  Created new Recent Posts section in blog.html');
} else {
  console.warn('⚠   Could not find insertion point in blog.html — card not added');
  updatedBlog = blogHtml;
}

try {
  writeFileSync(blogPath, updatedBlog, 'utf8');
  console.log('✅  Updated blog.html');
} catch (err) {
  console.error(`❌  Could not write blog.html: ${err.message}`);
  process.exit(1);
}

// ── Step 6: Git commit & push ─────────────────────────────────────────────────
if (dryRun) {
  console.log('\n⏭   --dry-run: skipping git steps');
  console.log(`\n🎉  Done! Post would be published as: ${outputFilename}`);
  process.exit(0);
}

function run(cmd, label) {
  console.log(`\n⚙   ${label}…`);
  try {
    const out = execSync(cmd, { cwd: __dirname, encoding: 'utf8', stdio: 'pipe' });
    if (out.trim()) console.log(out.trim());
  } catch (err) {
    console.error(`❌  ${label} failed:\n${err.stderr || err.message}`);
    process.exit(1);
  }
  console.log(`✅  ${label}`);
}

run('git add .', 'git add');
run(`git commit -m "Add post: ${title}"`, 'git commit');
run('git push', 'git push');

console.log(`\n🎉  Published! → ${outputFilename}`);
