/**
 * Memoria Renderer
 */
const path = require('path');
const { formatDate, extractExcerpt, slugify } = require('./utils');

/**
 * Convert consecutive <img> tags in HTML into a horizontal slideshow.
 * Detects 2+ consecutive images (optionally wrapped in <p>) and replaces
 * them with a slide container with prev/next buttons and dot indicators.
 */
function convertConsecutiveImagesToSlideshow(html) {
  // Regex: find 2+ consecutive image blocks (img possibly wrapped in <p>)
  const consecutiveImgRegex = /((?:<p[^>]*>\s*)?<img[^>]+>(?:\s*<\/p>)?(?:\s*(?:<p[^>]*>\s*)?<img[^>]+>(?:\s*<\/p>)?)+)/g;

  return html.replace(consecutiveImgRegex, function(match) {
    const imgTagRegex = /<img[^>]+>/g;
    const imgTags = match.match(imgTagRegex);
    if (!imgTags || imgTags.length < 2) return match;

    const photosList = imgTags.map(function(tag) {
      const srcMatch = tag.match(/src=["']([^"']+)["']/);
      const altMatch = tag.match(/alt=["']([^"']*)["']/);
      return { url: srcMatch ? srcMatch[1] : '', caption: altMatch ? altMatch[1] : '' };
    });

    const sid = Math.random().toString(36).substr(2, 9);
    const containerId = 'cs_' + sid;
    const photosVar = 'csPhotos_' + sid;

    const dots = photosList.map(function(_, i) {
      return '<span class="content-slideshow-dot' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '"></span>';
    }).join('');

    const prevBtn = '<button class="content-slideshow-prev" onclick="csNav(\'' + containerId + '\',\'' + photosVar + '\',-1)" aria-label="上一张">‹</button>';
    const nextBtn = '<button class="content-slideshow-next" onclick="csNav(\'' + containerId + '\',\'' + photosVar + '\',1)" aria-label="下一张">›</button>';

    const slidesScript = '<script>' +
      'var ' + photosVar + '=' + JSON.stringify(photosList) + ';' +
      'function csNav(cid,pv,dir){' +
      'var c=parseInt(document.getElementById(cid).getAttribute("data-current"))||0;' +
      'var photos=window[pv];' +
      'var n=(c+dir+photos.length)%photos.length;' +
      'var p=photos[n];' +
      'var main=document.getElementById(cid).querySelector(".content-slideshow-main");' +
      'if(p&&main)main.innerHTML="<img src="+p.url+" alt="+p.caption+">";' +
      'document.getElementById(cid).querySelectorAll(".content-slideshow-dot").forEach(function(d,i){d.classList.toggle("active",i===n);});' +
      'document.getElementById(cid).setAttribute("data-current",n);' +
      '}' +
      '</' + 'script>';

    return '<div class="content-slideshow" id="' + containerId + '" data-current="0">' +
      prevBtn + nextBtn +
      '<div class="content-slideshow-main">' + imgTags[0] + '</div>' +
      '<div class="content-slideshow-dots">' + dots + '</div>' +
      '</div>' +
      slidesScript;
  });
}

function applyTemplate(template, { title, page, content }) {
  return template
    .replace(/{{PAGE_TITLE}}/g, title || 'Memoria')
    .replace('{{PAGE}}', page || 'home')
    .replace(/{{BLOGS_ACTIVE}}/g, page === 'blogs' ? ' active' : '')
    .replace(/{{VLOGS_ACTIVE}}/g, page === 'vlogs' ? ' active' : '')
    .replace(/{{PHOTO_ACTIVE}}/g, page === 'photo' ? ' active' : '')
    .replace(/{{ABOUT_ACTIVE}}/g, page === 'about' ? ' active' : '')
    .replace(/{{HOME_ACTIVE}}/g, page === 'home' ? ' active' : '')
    .replace('{{PAGE_CONTENT}}', content);
}

// ── Timeline entry ──────────────────────────────────────────────────────

function formatDateCard(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function timelineEntry(item, side) {
  const dateFormatted = formatDate(item.date);
  const dateCardFormatted = formatDateCard(item.date);
  const excerpt = item.type === 'photo'
    ? (item.description || `${(item.photos || []).length} 张照片`)
    : extractExcerpt(item.content || item.description || '');
  const typeDir = { blog: 'blog', vlog: 'vlog', photo: 'photo' };
  const dir = typeDir[item.type] || 'blog';
  const href = `/${dir}/${slugify(item.title)}/`;
  const ctaLabel = item.type === 'blog' ? 'Read More' : item.type === 'vlog' ? 'Watch' : 'View';

  // Image: only render if item has cover (blog) or thumbnail (vlog/photo) — no placeholders
  let imgUrl = '';
  if (item.type === 'blog' && item.cover) imgUrl = item.cover;
  else if (item.type === 'blog' && item.thumbnail) imgUrl = item.thumbnail;
  else if (item.type === 'vlog' && item.thumbnail) imgUrl = item.thumbnail;
  else if (item.type === 'photo' && item.thumbnail) imgUrl = item.thumbnail;

  const imgHtml = imgUrl
    ? `<img src="${imgUrl}" alt="${item.title}" class="timeline-card-image" loading="lazy">`
    : '';

  const descHtml = item.type === 'photo' && item.description
    ? `<p class="timeline-card-desc">${item.description}</p>` : '';
  const excerptHtml = item.type === 'photo' ? '' : (excerpt ? `<p class="timeline-card-excerpt">${excerpt}</p>` : '');

  const cardBody = `<div class="timeline-card-body"><h2 class="timeline-card-title">${item.title}</h2><p class="timeline-card-date">${dateCardFormatted}</p>${descHtml}${excerptHtml}<span class="timeline-card-cta">${ctaLabel} →</span></div>`;

  // Alternate sides: connector and node are inside timeline-entry (not card-row)
  // Left: card on right side, connector+node on left side (at axis)
  // Right: connector+node on right side (at axis), card on left side
  return `
    <div class="timeline-entry" data-side="${side}">
      ${side === 'left'
        ? `<div class="timeline-card-row"><a href="${href}" class="timeline-card">${imgHtml}${cardBody}</a></div><div class="timeline-connector"></div><div class="timeline-node"><div class="timeline-dot"></div></div>`
        : `<div class="timeline-node"><div class="timeline-dot"></div></div><div class="timeline-connector"></div><div class="timeline-card-row"><a href="${href}" class="timeline-card">${imgHtml}${cardBody}</a></div>`}
    </div>`;
}

// ── Timeline page ────────────────────────────────────────────────────────

function renderTimelinePage({ items, pageTitle, page }, template) {
  const byYear = {};
  for (const item of items) {
    const year = new Date(item.date).getFullYear();
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(item);
  }
  const years = Object.keys(byYear).sort((a, b) => b - a);

  let idx = 0;
  const timelineHtml = years.map(year => {
    const entries = byYear[year].map(item => {
      const side = idx % 2 === 0 ? 'left' : 'right';
      idx++;
      return timelineEntry(item, side);
    }).join('');
    return `<div class="timeline-entries">${entries}</div>`;
  }).join('');

  const content = `
    <div class="timeline-page">
      <div class="timeline-header">
        <h1>${pageTitle}</h1>
        <p>${items.length} 条记录</p>
      </div>
      ${timelineHtml}
      <div class="scroll-sentinel" data-page="1"></div>
    </div>`;

  return applyTemplate(template, { title: `${pageTitle} — Memoria`, page, content });
}

// ── Homepage (stats + tag filter + recent timeline) ────────────────────

function renderIndex({ blogs, vlogs, photos, all }, template) {
  // Stats
  const tagSet = new Set();
  all.forEach(item => (item.tags || []).forEach(t => tagSet.add(t)));
  const sortedTags = Array.from(tagSet).sort();
  const tagsFilterHtml = sortedTags.map(t =>
    `<button class="tag-filter-btn" data-tag="${t}">${t}</button>`
  ).join('');

  // Build all-items list for tag filtering
  const allItemsHtml = all.map(item => {
    const typeDir = { blog: 'blog', vlog: 'vlog', photo: 'photo' };
    const dir = typeDir[item.type] || 'blog';
    const href = `/${dir}/${slugify(item.title)}/`;
    const typeLabel = { blog: '随笔', vlog: '影像', photo: '相册' };
    // Blog: use cover or thumbnail only if non-empty; no image if none
    // Vlog: use thumbnail if available
    // Photo: use thumbnail if available
    let imgUrl = '';
    if (item.type === 'blog' && item.cover) imgUrl = item.cover;
    else if (item.type === 'blog' && item.thumbnail) imgUrl = item.thumbnail;
    else if (item.type === 'vlog' && item.thumbnail) imgUrl = item.thumbnail;
    else if (item.type === 'photo' && item.thumbnail) imgUrl = item.thumbnail;
    const imgHtml = imgUrl
      ? `<img src="${imgUrl}" alt="${item.title}" class="home-item-thumb" loading="lazy">`
      : '';
    return `
      <div class="home-item" data-item-tags="${(item.tags || []).join(',')}">
        <a href="${href}" class="home-item-link">
          ${imgHtml}
          <div class="home-item-body">
            <div class="home-item-meta">
              <span class="home-item-type">${typeLabel[item.type] || item.type}</span>
              <time class="home-item-date">${formatDate(item.date)}</time>
            </div>
            <h2 class="home-item-title">${item.title}</h2>
          </div>
        </a>
      </div>`;
  }).join('');

  const content = `
    <div class="home-page">
      <!-- Hero Stats -->
      <section class="home-stats">
        <div class="home-stats-title">Memoria</div>
        <div class="home-stats-grid">
          <div class="stat-card">
            <div class="stat-number">${blogs.length}</div>
            <div class="stat-label">随笔</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${vlogs.length}</div>
            <div class="stat-label">影像</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${photos.length}</div>
            <div class="stat-label">相册</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${sortedTags.length}</div>
            <div class="stat-label">标签</div>
          </div>
        </div>
      </section>

      <!-- Tag Filter -->
      ${tagsFilterHtml ? `
      <div class="home-tag-filter" id="tagFilterBar">
        <button class="tag-filter-btn active" data-tag="all">全部</button>
        ${tagsFilterHtml}
      </div>` : ''}

      <!-- All Items (filtered) -->
      <div class="home-items" id="homeItems">
        ${allItemsHtml}
      </div>
      <div class="scroll-sentinel" data-page="1"></div>
    </div>

    <style>
      /* Home Stats */
      .home-stats {
        padding: 3.5rem 2rem 2rem;
        max-width: 960px;
        margin: 0 auto;
        text-align: center;
      }
      .home-stats-title {
        font-family: 'Georgia', serif;
        font-size: clamp(2rem, 8vw, 3.5rem);
        color: var(--color-accent);
        margin-bottom: 2rem;
        letter-spacing: -0.02em;
      }
      .home-stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        max-width: 600px;
        margin: 0 auto 2rem;
      }
      @media (max-width: 500px) { .home-stats-grid { grid-template-columns: repeat(2, 1fr); } }
      .stat-card {
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        border-radius: 12px;
        padding: 1.2rem 1rem;
        text-align: center;
      }
      .stat-number {
        font-family: 'Georgia', serif;
        font-size: 2.2rem;
        font-weight: 700;
        color: var(--color-accent);
        line-height: 1;
        margin-bottom: 0.3rem;
      }
      .stat-label {
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }

      /* Tag filter */
      .home-tag-filter {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        justify-content: center;
        padding: 0 1.5rem 1.5rem;
        max-width: 960px;
        margin: 0 auto;
      }
      .tag-filter-btn {
        flex-shrink: 0;
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid transparent;
        border-radius: 20px;
        padding: 0.3rem 0.9rem;
        font-size: 0.82rem;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .tag-filter-btn:hover, .tag-filter-btn.active {
        background: var(--color-accent);
        color: #fff;
      }

      /* Home items list */
      .home-items {
        max-width: 960px;
        margin: 0 auto;
        padding: 0 2rem 3rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .home-item { border-radius: 12px; overflow: hidden; }
      .home-item.hidden { display: none; }
      .home-item-link {
        display: flex;
        gap: 1rem;
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        border-radius: 12px;
        overflow: hidden;
        text-decoration: none;
        color: inherit;
        transition: border-color 0.2s, transform 0.2s;
      }
      .home-item-link:hover { border-color: var(--color-accent); transform: translateY(-2px); }
      .home-item-thumb {
        width: 120px;
        height: 80px;
        object-fit: cover;
        flex-shrink: 0;
      }
      .home-item-thumb-placeholder {
        width: 120px;
        height: 80px;
        background: var(--color-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-muted);
      }
      .home-item-thumb-placeholder i svg { width: 24px; height: 24px; stroke: currentColor; stroke-width: 2; fill: none; }
      .home-item-body { flex: 1; padding: 0.8rem 0.8rem 0.8rem 0; display: flex; flex-direction: column; justify-content: center; }
      .home-item-meta { display: flex; gap: 0.6rem; align-items: center; margin-bottom: 0.25rem; }
      .home-item-type { font-size: 0.7rem; background: var(--color-surface); color: var(--color-accent-cool); padding: 0.1rem 0.5rem; border-radius: 4px; }
      .home-item-date { font-size: 0.72rem; color: var(--color-text-muted); }
      .home-item-title { font-size: 0.95rem; font-weight: 600; color: var(--color-text); line-height: 1.3; }

      @media (max-width: 500px) {
        .home-items { padding: 0 1rem 6rem; }
        .home-item-thumb { width: 90px; height: 65px; }
        .home-stats { padding: 2rem 1rem 1.5rem; }
      }
    </style>`;

  return applyTemplate(template, { title: '首页 — Memoria', page: 'home', content });
}

// ── Blogs ──────────────────────────────────────────────────────────────

function renderBlogs({ blogs }, template) {
  return renderTimelinePage({ items: blogs, pageTitle: '随笔', page: 'blogs' }, template);
}

// ── Vlogs ───────────────────────────────────────────────────────────────

function renderVlogs({ vlogs }, template) {
  return renderTimelinePage({ items: vlogs, pageTitle: '影像', page: 'vlogs' }, template);
}

// ── Photos ─────────────────────────────────────────────────────────────

function renderPhotos({ photos }, template) {
  const photoItems = photos.map(p => ({
    ...p,
    description: p.description || (p.photos ? `${p.photos.length} 张照片` : ''),
  }));
  return renderTimelinePage({ items: photoItems, pageTitle: '相册', page: 'photo' }, template);
}

// ── About ───────────────────────────────────────────────────────────────

function renderAbout(aboutData, template) {
  const content = `<div class="about-body">${aboutData || '<p style="color:var(--color-text-muted);">暂无内容</p>'}</div>`;
  return applyTemplate(template, { title: '关于 — Memoria', page: 'about', content });
}

// ── Blog Detail ────────────────────────────────────────────────────────

function renderBlogDetail(item, siblings, template) {
  const dateFormatted = formatDate(item.date);
  const tagsHtml = (item.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  const idx = siblings.findIndex(s => slugify(s.title) === slugify(item.title));
  const prev = idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const next = idx > 0 ? siblings[idx - 1] : null;
  function itemHref(it) { return `/blog/${slugify(it.title)}/`; }

  let coverHtml = '';
  if (item.cover) coverHtml = `<img src="${item.cover}" alt="${item.title}" class="detail-cover" loading="lazy">`;
  else if (item.thumbnail) coverHtml = `<img src="${item.thumbnail}" alt="${item.title}" class="detail-cover" loading="lazy">`;

  let slideshowHtml = '';
  if (item.photos && item.photos.length > 0) {
    const photosList = item.photos;
    if (photosList.length === 1) {
      slideshowHtml = `<div class="detail-slideshow-single"><img src="${photosList[0].url}" alt="" loading="lazy">${photosList[0].caption ? `<p class="slideshow-caption">${photosList[0].caption}</p>` : ''}</div>`;
    } else {
      const thumbs = photosList.map((p, i) =>
        `<div class="slideshow-thumb${i === 0 ? ' active' : ''}" onclick="showSlide(${i})"><img src="${p.url}" alt="${p.caption || ''}" loading="lazy"></div>`
      ).join('');
      const prevNextBtns = `
        <button class="slideshow-prev-btn" onclick="event.stopPropagation();stopAutoplay();showSlide((__cs-1+__blogPhotos.length)%__blogPhotos.length);startAutoplay();" aria-label="上一张">‹</button>
        <button class="slideshow-next-btn" onclick="event.stopPropagation();stopAutoplay();showSlide((__cs+1)%__blogPhotos.length);startAutoplay();" aria-label="下一张">›</button>`;
      slideshowHtml = `
        <div class="detail-slideshow" id="blogSlideshow" style="position:relative;">
          ${prevNextBtns}
          <div class="slideshow-main"><img src="${photosList[0].url}" alt="" id="slideshowMainImg" loading="lazy"></div>
          <div class="slideshow-thumbs">${thumbs}</div>
          <div class="slideshow-caption" id="slideshowCaption">${photosList[0].caption || ''}</div>
        </div>
        <script>
        var __blogPhotos=${JSON.stringify(photosList)};
        var __cs=0;
        var __blogTimer=null;
        function showSlide(n){
          __cs=n;
          document.getElementById('slideshowMainImg').src=__blogPhotos[n].url;
          document.getElementById('slideshowCaption').textContent=__blogPhotos[n].caption||'';
          document.querySelectorAll('.slideshow-thumb').forEach(function(t,i){t.classList.toggle('active',i===n);});
        }
        function advanceSlide(){showSlide((__cs+1)%__blogPhotos.length);}
        function startAutoplay(){__blogTimer=setInterval(advanceSlide,3000);}
        function stopAutoplay(){if(__blogTimer){clearInterval(__blogTimer);__blogTimer=null;}}
        window.showSlide=showSlide;
        window.startAutoplay=startAutoplay;
        window.stopAutoplay=stopAutoplay;
        var __slideshowEl=document.getElementById('blogSlideshow');
        if(__slideshowEl){
          __slideshowEl.addEventListener('mouseenter',stopAutoplay);
          __slideshowEl.addEventListener('mouseleave',startAutoplay);
        }
        startAutoplay();
        </script>`;
    }
  }

  const content = `
    <div class="detail-page">
      <h1 class="detail-title">${item.title}</h1>
      <div class="detail-meta"><time datetime="${item.date}">${dateFormatted}</time>${tagsHtml}</div>
      ${coverHtml}
      ${slideshowHtml}
      <div class="prose">${convertConsecutiveImagesToSlideshow(item.content)}</div>
      <nav class="detail-nav">
        ${prev ? `<div class="detail-nav-prev"><a href="${itemHref(prev)}" class="detail-nav-btn">← ${prev.title}</a></div>` : '<div class="detail-nav-prev"><span class="detail-nav-placeholder"></span></div>'}
        ${next ? `<div class="detail-nav-next"><a href="${itemHref(next)}" class="detail-nav-btn">${next.title} →</a></div>` : '<div class="detail-nav-next"><span class="detail-nav-placeholder"></span></div>'}
      </nav>
    </div>`;

  return applyTemplate(template, { title: `${item.title} — Memoria`, page: 'blogs', content });
}

// ── Photo Detail ───────────────────────────────────────────────────────

function renderPhotoDetail(item, siblings, template) {
  const dateFormatted = formatDate(item.date);
  const tagsHtml = (item.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  const idx = siblings.findIndex(s => slugify(s.title) === slugify(item.title));
  const prev = idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const next = idx > 0 ? siblings[idx - 1] : null;
  function itemHref(it) { return `/photo/${slugify(it.title)}/`; }

  if (!item.photos || item.photos.length === 0) {
    return applyTemplate(template, { title: `${item.title} — Memoria`, page: 'photo', content: `<div class="detail-page"><p>暂无照片</p></div>` });
  }
  const photosList = item.photos;
  const photosGrid = photosList.map((p, i) =>
    `<div class="detail-photo-item" onclick="openLightbox(${i})"><img src="${p.url}" alt="${p.caption || ''}" loading="lazy">${p.caption ? `<div class="detail-photo-caption">${p.caption}</div>` : ''}</div>`
  ).join('');

  const content = `
    <div class="detail-page">
      <h1 class="detail-title">${item.title}</h1>
      <div class="detail-meta"><time datetime="${item.date}">${dateFormatted}</time>${tagsHtml}</div>
      ${item.description ? `<p class="detail-desc">${item.description}</p>` : ''}
      <div class="photo-grid-detail">${photosGrid}</div>
      <nav class="detail-nav">
        ${prev ? `<div class="detail-nav-prev"><a href="${itemHref(prev)}" class="detail-nav-btn">← ${prev.title}</a></div>` : '<div class="detail-nav-prev"><span class="detail-nav-placeholder"></span></div>'}
        ${next ? `<div class="detail-nav-next"><a href="${itemHref(next)}" class="detail-nav-btn">${next.title} →</a></div>` : '<div class="detail-nav-next"><span class="detail-nav-placeholder"></span></div>'}
      </nav>
      <script>window.__memoriaPhotos=${JSON.stringify(photosList)};</script>
    </div>`;

  return applyTemplate(template, { title: `${item.title} — Memoria`, page: 'photo', content });
}

// ── Vlog Detail ─────────────────────────────────────────────────────────

function renderVlogDetail(item, siblings, template) {
  const dateFormatted = formatDate(item.date);
  const tagsHtml = (item.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  const idx = siblings.findIndex(s => slugify(s.title) === slugify(item.title));
  const prev = idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const next = idx > 0 ? siblings[idx - 1] : null;
  function itemHref(it) { return `/vlog/${slugify(it.title)}/`; }

  let videoHtml = '';
  if (item.video) {
    if (item.video.includes('youtube.com') || item.video.includes('youtu.be')) {
      videoHtml = `<div class="video-embed"><iframe src="${item.video}" frameborder="0" allowfullscreen loading="lazy"></iframe></div>`;
    } else {
      videoHtml = `<div class="video-native"><video src="${item.video}" controls preload="metadata"></video></div>`;
    }
  }

  const content = `
    <div class="detail-page">
      <h1 class="detail-title">${item.title}</h1>
      <div class="detail-meta"><time datetime="${item.date}">${dateFormatted}</time>${tagsHtml}</div>
      ${videoHtml}
      <div class="prose">${convertConsecutiveImagesToSlideshow(item.content)}</div>
      <nav class="detail-nav">
        ${prev ? `<div class="detail-nav-prev"><a href="${itemHref(prev)}" class="detail-nav-btn">← ${prev.title}</a></div>` : '<div class="detail-nav-prev"><span class="detail-nav-placeholder"></span></div>'}
        ${next ? `<div class="detail-nav-next"><a href="${itemHref(next)}" class="detail-nav-btn">${next.title} →</a></div>` : '<div class="detail-nav-next"><span class="detail-nav-placeholder"></span></div>'}
      </nav>
    </div>`;

  return applyTemplate(template, { title: `${item.title} — Memoria`, page: 'vlogs', content });
}

// ── Unified detail dispatcher ────────────────────────────────────────────

function renderDetail(item, siblings, template) {
  if (item.type === 'photo') return renderPhotoDetail(item, siblings, template);
  if (item.type === 'vlog') return renderVlogDetail(item, siblings, template);
  return renderBlogDetail(item, siblings, template);
}

module.exports = {
  renderIndex,
  renderBlogs,
  renderVlogs,
  renderPhotos,
  renderAbout,
  renderDetail,
};