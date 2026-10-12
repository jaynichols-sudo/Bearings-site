#!/usr/bin/env python3
"""Builds the site's extra pages and keeps every page in step with site.json.

Run after changing site.json or anything in content/:  python3 scripts/build-pages.py

- content/<page>.html  ->  <page>.html, wrapped in the shared header and footer
- index.html: canonical link, share image, structured data, store button and footer
- sitemap.xml, robots.txt, and CNAME (when a custom domain is set)
"""
import json, re, html
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
cfg = json.loads((ROOT / 'site.json').read_text())
domain = cfg.get('customDomain', '').strip()
base = (f'https://{domain}' if domain else cfg['url']).rstrip('/')
email = cfg['email']
store = cfg.get('appStoreUrl', '').strip()
price = cfg.get('teamPrice', '').strip()
today = date.today().isoformat()

PAGES = [
    # file, title, subtitle, description
    ('team', 'Northfix Team', 'Your whole team’s network. Still private.',
     'Pool who your business development team knows, end-to-end encrypted. Ways in through every teammate, the team federal map, team pursuits and the team watchlist.'),
    ('ai', 'Northfix for AI tools', 'Ask your AI about your own network. Answered on your Mac.',
     'Let Claude, Cursor and other AI apps answer questions about your own network: who you know at an agency, your warmest way in, who is waiting on you. Answered on your Mac; nothing goes to Northfix.'),
    ('support', 'Support', 'Answers, and how to reach us.',
     'Help with Northfix: getting your LinkedIn data, syncing, email and calendar, the federal map, Northfix Team, purchases and Android.'),
    ('privacy', 'Privacy Policy', 'Northfix can’t see your network. Here’s exactly what it touches.',
     'How Northfix handles your data: on your devices and in your own iCloud, with team shares encrypted before they leave.'),
    ('terms', 'Terms of Service', 'The agreement for using Northfix.',
     'Terms of service for the Northfix apps, Northfix Pro, Northfix Team and this website.'),
]

def fill(text):
    line = (f'Northfix Team is {price}.' if price else 'Northfix Team is priced per person and billed yearly, with a 30-day free trial for up to 5 people.')
    return (text.replace('{{email}}', email)
                .replace('{{appStoreUrl}}', html.escape(store or 'index.html#get'))
                .replace('{{teamPriceLine}}', line))

NAV = '''<header class="nav solid" id="nav">
  <a class="brand" href="index.html" aria-label="Northfix home">
    <img src="img/northfix-icon.svg" alt="" width="30" height="30">
    <span>Northfix</span>
  </a>
  <nav aria-label="Sections">
    <a href="index.html#today">Features</a>
    <a href="team.html"{team}>Team</a>
    <a href="ai.html"{ai}>AI tools</a>
    <a href="index.html#demo">Live demo</a>
    <a href="support.html"{support}>Support</a>
  </nav>
  <a class="btn btn-small" href="index.html#get">Get Northfix</a>
</header>'''

FOOTER = '''<footer class="foot">
  <div class="wrap foot-inner">
    <a class="brand" href="index.html"><img src="img/northfix-icon.svg" alt="" width="26" height="26"><span>Northfix</span></a>
    <nav aria-label="Footer">
      <a href="team.html">Team</a>
      <a href="ai.html">AI tools</a>
      <a href="support.html">Support</a>
      <a href="privacy.html">Privacy</a>
      <a href="terms.html">Terms</a>
      <a href="mailto:{email}">Contact</a>
    </nav>
    <p class="muted">The people in the demo and videos are made up. LinkedIn, Facebook, Instagram, Snapchat, TikTok, ZoomInfo, Seamless.AI, Salesforce and Stripe are trademarks of their owners; Northfix isn’t affiliated with them. Northfix is made by Jay Nichols.</p>
  </div>
</footer>'''

def head(title, desc, path):
    url = f'{base}/{path}' if path else f'{base}/'
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#0D0A17">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:image" content="{base}/media/og.jpg">
<meta property="og:url" content="{url}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="img/northfix-icon.svg" type="image/svg+xml">
<link rel="icon" href="img/favicon-64.png" sizes="64x64">
<link rel="apple-touch-icon" href="img/apple-touch-icon.png">
<link rel="stylesheet" href="styles.css">
</head>'''

def page(name, title, sub, desc):
    body = fill((ROOT / 'content' / f'{name}.html').read_text())
    full = title if name in ('team', 'ai') else f'{title}: Northfix'
    cur = lambda n: ' aria-current="page"' if name == n else ''
    nav = NAV.format(team=cur('team'), ai=cur('ai'), support=cur('support'))
    return f'''{head(full, desc, f'{name}.html')}
<body class="subpage">
<a class="skip" href="#main">Skip to content</a>
{nav}
<main id="main">
<section class="page-hero night"><div class="wrap"><h1>{html.escape(title)}</h1><p>{html.escape(sub)}</p></div></section>
<article class="doc wrap">
{body}
</article>
</main>
{FOOTER.format(email=email)}
</body>
</html>
'''

for name, title, sub, desc in PAGES:
    (ROOT / f'{name}.html').write_text(page(name, title, sub, desc))

# 404: GitHub Pages and Cloudflare Pages both serve 404.html for missing paths
nf = f'''{head('Page not found: Northfix', 'That page isn’t here.', '404.html')}
<body class="subpage">
{NAV.format(team='', ai='', support='')}
<main id="main">
<section class="page-hero night lost"><div class="wrap"><h1>Off course?</h1><p>That page isn’t here. It may have moved, or the link may have a typo.</p>
<div class="cta-row"><a class="btn" href="index.html">Go to the home page</a><a class="btn btn-ghost" href="support.html">Get help</a></div></div></section>
</main>
{FOOTER.format(email=email)}
</body>
</html>
'''
# a 404 can be served at any depth, so its relative links resolve from the site root
root_path = '/' if domain else '/' + base.split('/', 3)[3].strip('/') + '/'
(ROOT / '404.html').write_text(nf.replace('<meta charset="utf-8">', f'<meta charset="utf-8">\n<base href="{root_path}">', 1))

# index.html: everything between the BUILD markers is regenerated
idx = (ROOT / 'index.html').read_text()
ld = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', 'name': 'Northfix',
    'applicationCategory': 'BusinessApplication', 'operatingSystem': 'iOS, iPadOS, macOS, watchOS, Android',
    'description': 'A private map of your professional network: who is waiting on you, who changed jobs, and your warmest way into any agency or company.',
    'url': f'{base}/', 'image': f'{base}/media/og.jpg',
    'offers': [{'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD', 'name': 'Northfix'},
               {'@type': 'Offer', 'price': '99.99', 'priceCurrency': 'USD', 'name': 'Northfix Pro, yearly'}],
    'author': {'@type': 'Person', 'name': 'Jay Nichols'},
}
meta = f'''<!-- BUILD:head -->
<link rel="canonical" href="{base}/">
<meta property="og:url" content="{base}/">
<meta property="og:image" content="{base}/media/og.jpg">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<!-- /BUILD:head -->'''
idx = re.sub(r'<!-- BUILD:head -->.*?<!-- /BUILD:head -->', meta, idx, flags=re.S) if '<!-- BUILD:head -->' in idx else idx.replace('<link rel="stylesheet" href="styles.css">', meta + '\n<link rel="stylesheet" href="styles.css">')
idx = re.sub(r'<meta property="og:image" content="https://[^"]*/media/og\.jpg">\n(?!<script)', '', idx)
btn = (f'<a class="btn" id="storeLink" href="{html.escape(store)}">Download on the App Store</a>' if store
       else f'<a class="btn" id="storeLink" href="mailto:{email}?subject=Tell%20me%20when%20Northfix%20launches">Email me when it launches</a>')
idx = re.sub(r'<a class="btn" id="storeLink"[^>]*>[^<]*</a>', btn, idx)
idx = re.sub(r'<footer class="foot">.*?</footer>', FOOTER.format(email=email), idx, flags=re.S)
idx = idx.replace('href="https://www.jaynichols.net/bearings/privacy.html"', 'href="privacy.html"')
(ROOT / 'index.html').write_text(idx)

urls = [''] + [f'{n}.html' for n, *_ in PAGES]
(ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{base}/{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n')
(ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /demo/\n\nSitemap: {base}/sitemap.xml\n')
cname = ROOT / 'CNAME'
if domain: cname.write_text(domain + '\n')
elif cname.exists(): cname.unlink()
print(f'Built {len(PAGES)} pages, 404, sitemap and robots for {base}')
