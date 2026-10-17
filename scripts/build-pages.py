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
    # file, heading, subtitle, page title (for search results and shares), description
    ('federal', 'Northfix for federal BD and capture', 'Who you know at every agency. Who decides each bid. Who can get you in.',
     'Northfix for federal BD and capture: agencies, pursuits, recompetes',
     'A private relationship map for federal BD and capture: coverage across 160 agencies, pursuit seats, recompetes, teaming partners and SAM.gov notices.'),
    ('pricing', 'Pricing', 'Free to start. Pro for you. Team for the whole shop.',
     'Northfix pricing: Free, Pro and Team plans',
     'Northfix is free to start. Pro is $19.99 a month, $99.99 a year or $249.99 once. Team is $49 per person per month, billed yearly, 30 days free.'),
    ('team', 'Northfix Team', 'Your whole team’s network. Still private.',
     'Northfix Team: an encrypted network map for BD and capture teams',
     'Pool who your BD or capture team knows, end-to-end encrypted: ways in through every teammate, the team federal map, pursuits, pipeline and watchlist.'),
    ('ai', 'Northfix for AI tools', 'Ask your AI about your own network. Answered on your Mac.',
     'Northfix for AI tools: connect Claude to your network',
     'Set up the Northfix connector for Claude Desktop, Cursor and other MCP apps. Ask about your own network. It runs on your Mac; nothing goes to Northfix.'),
    ('support', 'Support', 'Answers, and how to reach us.',
     'Northfix support and help',
     'Help with Northfix: getting your LinkedIn data, syncing, email, calendar and trips, the federal map, SAM.gov notices, Northfix Team, purchases and Android.'),
    ('privacy', 'Privacy Policy', 'Northfix can’t see your network. Here’s exactly what it touches.',
     'Privacy Policy: Northfix',
     'How Northfix handles your data: on your devices and in your own iCloud, with team shares encrypted before they leave.'),
    ('terms', 'Terms of Service', 'The agreement for using Northfix.',
     'Terms of Service: Northfix',
     'Terms of service for the Northfix apps, Northfix Pro, Northfix Team and this website.'),
]
# pages in the main nav, in order: (file or home anchor, label)
NAV_LINKS = [('index.html#today', 'Features'), ('federal', 'Federal'), ('team', 'Team'), ('ai', 'AI tools'),
             ('pricing', 'Pricing'), ('index.html#demo', 'Live demo'), ('support', 'Support')]
OG_IMAGE_ALT = 'Northfix: a private map of your professional network.'

def fill(text):
    line = (f'Northfix Team is {price}.' if price else 'Northfix Team is priced per person and billed yearly, with a 30-day free trial for up to 5 people.')
    return (text.replace('{{email}}', email)
                .replace('{{appStoreUrl}}', html.escape(store or 'index.html#get'))
                .replace('{{teamPriceLine}}', line))

def nav(current=''):
    def link(h, label):
        href = h if '.html' in h else f'{h}.html'
        cur = ' aria-current="page"' if h == current else ''
        return f'    <a href="{href}"{cur}>{label}</a>'
    links = '\n'.join(link(h, label) for h, label in NAV_LINKS)
    return f'''<header class="nav solid" id="nav">
  <a class="brand" href="index.html" aria-label="Northfix home">
    <img src="img/northfix-icon.svg" alt="" width="30" height="30">
    <span>Northfix</span>
  </a>
  <nav aria-label="Sections">
{links}
  </nav>
  <a class="btn btn-small" href="index.html#get">Get Northfix</a>
</header>'''

FOOTER = '''<footer class="foot">
  <div class="wrap foot-inner">
    <a class="brand" href="index.html"><img src="img/northfix-icon.svg" alt="" width="26" height="26"><span>Northfix</span></a>
    <nav aria-label="Footer">
      <a href="federal.html">Federal</a>
      <a href="team.html">Team</a>
      <a href="ai.html">AI tools</a>
      <a href="pricing.html">Pricing</a>
      <a href="support.html">Support</a>
      <a href="privacy.html">Privacy</a>
      <a href="terms.html">Terms</a>
      <a href="mailto:{email}">Contact</a>
    </nav>
    <p class="muted">The people in the demo and videos are made up. LinkedIn, Facebook, Instagram, Snapchat, TikTok, Flighty, TripIt, ZoomInfo, Seamless.AI, Salesforce, HubSpot, Dynamics 365 and Stripe are trademarks of their owners; Northfix isn’t affiliated with them. Northfix is made by Jay Nichols.</p>
  </div>
</footer>'''

# Prices, for structured data. The pages say the same in words; keep both in step with docs/pricing.md in the app repo.
OFFERS = [('Northfix', '0', None), ('Northfix Pro, monthly', '19.99', 'MON'), ('Northfix Pro, yearly', '99.99', 'ANN'),
          ('Northfix Pro, lifetime', '249.99', None), ('Northfix Team, per person, billed yearly', '588', 'ANN')]

def app_ld(desc):
    def offer(name, amount, unit):
        o = {'@type': 'Offer', 'name': name, 'price': amount, 'priceCurrency': 'USD', 'url': f'{base}/pricing.html'}
        if unit: o['priceSpecification'] = {'@type': 'UnitPriceSpecification', 'price': amount, 'priceCurrency': 'USD', 'billingDuration': 1, 'unitCode': unit}
        return o
    return {'@context': 'https://schema.org', '@type': 'SoftwareApplication', 'name': 'Northfix',
            'applicationCategory': 'BusinessApplication', 'operatingSystem': 'iOS, iPadOS, macOS, watchOS, Android',
            'description': desc, 'url': f'{base}/', 'image': f'{base}/media/og.jpg',
            'offers': [offer(*o) for o in OFFERS], 'author': {'@type': 'Person', 'name': 'Jay Nichols'}}

def ld_script(data):
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'

def share_tags(title, desc, url):
    """Open Graph and X/Twitter tags, shared by every page."""
    t, d = html.escape(title), html.escape(desc)
    return f'''<meta property="og:site_name" content="Northfix">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:image" content="{base}/media/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{html.escape(OG_IMAGE_ALT)}">
<meta property="og:url" content="{url}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{t}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="{base}/media/og.jpg">'''

def head(title, desc, path, extra=''):
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
{share_tags(title, desc, url)}
<link rel="icon" href="img/northfix-icon.svg" type="image/svg+xml">
<link rel="icon" href="img/favicon-64.png" sizes="64x64">
<link rel="apple-touch-icon" href="img/apple-touch-icon.png">
<link rel="stylesheet" href="styles.css">{extra}
</head>'''

WIDE = {'pricing'}  # pages laid out wider than reading width, for side-by-side plans

def page(name, heading, sub, title, desc):
    body = fill((ROOT / 'content' / f'{name}.html').read_text())
    crumbs = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'Northfix', 'item': f'{base}/'},
        {'@type': 'ListItem', 'position': 2, 'name': heading, 'item': f'{base}/{name}.html'}]}
    extra = '\n' + ld_script(crumbs)
    if name == 'pricing': extra += '\n' + ld_script(app_ld(desc))
    cls = 'doc doc-wide wrap' if name in WIDE else 'doc wrap'
    return f'''{head(title, desc, f'{name}.html', extra)}
<body class="subpage">
<a class="skip" href="#main">Skip to content</a>
{nav(name)}
<main id="main">
<section class="page-hero night"><div class="wrap"><h1>{html.escape(heading)}</h1><p>{html.escape(sub)}</p></div></section>
<article class="{cls}">
{body}
</article>
</main>
{FOOTER.format(email=email)}
</body>
</html>
'''

for name, *rest in PAGES:
    (ROOT / f'{name}.html').write_text(page(name, *rest))

# 404: GitHub Pages and Cloudflare Pages both serve 404.html for missing paths
nf = f'''{head('Page not found: Northfix', 'That page isn’t here.', '404.html', chr(10) + '<meta name="robots" content="noindex">')}
<body class="subpage">
{nav()}
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
home_title = html.unescape(re.search(r'<title>(.*?)</title>', idx).group(1))
home_desc = html.unescape(re.search(r'<meta name="description" content="([^"]*)">', idx).group(1))
# the home page's own share tags are written here, so drop any hand-written copies outside the block
idx = re.sub(r'<meta (property="og:(title|description|type)"|name="twitter:card") content="[^"]*">\n(?=(?:(?!<!-- /BUILD:head -->).)*<!-- BUILD:head -->)', '', idx, flags=re.S)
site_ld = {'@context': 'https://schema.org', '@type': 'WebSite', 'name': 'Northfix', 'url': f'{base}/'}
meta = f'''<!-- BUILD:head -->
<link rel="canonical" href="{base}/">
{share_tags(home_title, home_desc, f'{base}/')}
{ld_script(app_ld('A private map of your professional network: who is waiting on you, who changed jobs, and your warmest way into any agency or company.'))}
{ld_script(site_ld)}
<!-- /BUILD:head -->'''
idx = re.sub(r'<!-- BUILD:head -->.*?<!-- /BUILD:head -->', meta, idx, flags=re.S) if '<!-- BUILD:head -->' in idx else idx.replace('<link rel="stylesheet" href="styles.css">', meta + '\n<link rel="stylesheet" href="styles.css">')
btn = (f'<a class="btn" id="storeLink" href="{html.escape(store)}">Download on the App Store</a>' if store
       else f'<a class="btn" id="storeLink" href="mailto:{email}?subject=Tell%20me%20when%20Northfix%20launches">Email me when it launches</a>')
idx = re.sub(r'<a class="btn" id="storeLink"[^>]*>[^<]*</a>', btn, idx)
idx = re.sub(r'<footer class="foot">.*?</footer>', FOOTER.format(email=email), idx, flags=re.S)
idx = idx.replace('href="https://www.jaynichols.net/bearings/privacy.html"', 'href="privacy.html"')
(ROOT / 'index.html').write_text(idx)

urls = [''] + [f'{n}.html' for n, *_ in PAGES]  # 404 stays out
(ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{base}/{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n')
(ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /demo/\n\nSitemap: {base}/sitemap.xml\n')
cname = ROOT / 'CNAME'
if domain: cname.write_text(domain + '\n')
elif cname.exists(): cname.unlink()
print(f'Built {len(PAGES)} pages, 404, sitemap and robots for {base}')
