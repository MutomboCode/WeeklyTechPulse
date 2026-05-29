const LANG_COLORS = {
  Python: '#3572A5', TypeScript: '#2B7489', JavaScript: '#F1E05A',
  Java: '#B07219', Go: '#00ADD8', Rust: '#DEA584', 'C++': '#F34B7D',
  'C#': '#178600', Ruby: '#701516', Shell: '#89E051', Kotlin: '#A97BFF'
};

async function fetchBlogPosts() {
  const res = await fetch('https://aws.amazon.com/blogs/machine-learning/feed/', {
    headers: { 'User-Agent': 'WeeklyTechPulse/1.0' }
  });
  if (!res.ok) throw new Error(`Blog RSS failed: ${res.status}`);
  const xml = await res.text();

  const posts = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = m[1];
    const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]>/) || item.match(/<title>(.*?)<\/title>/))?.[1]?.trim() || '';
    const link  = (item.match(/<link>\s*(https?:\/\/[^\s<]+)/) || [])[1] || '';
    const pub   = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
    const auth  = (item.match(/<dc:creator><!\[CDATA\[(.*?)\]\]>/) || item.match(/<author>(.*?)<\/author>/))?.[1]?.trim() || '';
    const desc  = (item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>/) || [])[1]
      ?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 220) || '';
    const cats  = [...item.matchAll(/<category><!\[CDATA\[(.*?)\]\]>/g)].map(c => c[1]);
    if (title && link) {
      posts.push({ title, link, pubDate: pub ? new Date(pub).toISOString() : new Date().toISOString(), author: auth, summary: desc, categories: cats });
    }
    if (posts.length >= 10) break;
  }
  return posts;
}

async function fetchGitHubRepos() {
  const res = await fetch('https://api.github.com/orgs/aws/repos?sort=updated&per_page=15&type=all', {
    headers: { 'User-Agent': 'WeeklyTechPulse/1.0', Accept: 'application/vnd.github.v3+json' }
  });
  if (!res.ok) throw new Error(`GitHub API failed: ${res.status}`);
  const repos = await res.json();
  return repos.map(r => ({
    name: r.name,
    description: r.description || '',
    language: r.language || '',
    lang_color: LANG_COLORS[r.language] || '#8B949E',
    stargazers_count: r.stargazers_count || 0,
    html_url: r.html_url,
    pushed_at: r.pushed_at
  }));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  try {
    const [posts, repos] = await Promise.all([fetchBlogPosts(), fetchGitHubRepos()]);
    res.json({ posts, repos, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, fetchedAt: new Date().toISOString() });
  }
};
