# Bearings website

The marketing site for Bearings, a private map of your professional network for iPhone, iPad, Mac, Apple Watch and Android.

It's a static site with no cookies, analytics or ads. Hosting is Cloudflare Pages (preferred) or GitHub Pages.

## Pages

| Page | Source |
| --- | --- |
| Home | `index.html`, `styles.css`, `js/site.js` |
| Bearings Team, with the security overview | `content/team.html` |
| Support | `content/support.html` |
| Privacy Policy | `content/privacy.html` |
| Terms of Service | `content/terms.html` |
| Not found | built by the script |

The pages in `content/` hold only their body. To change one, edit it there, then run:

```sh
python3 scripts/build-pages.py
```

That wraps each page in the shared header and footer. It also refreshes the home page's canonical link, share image, structured data, footer and App Store button, and writes `sitemap.xml`, `robots.txt` and `CNAME`. Settings live in `site.json`:

| Setting | What it does |
| --- | --- |
| `url` | The address the site is served from today |
| `customDomain` | Your domain, like `getbearings.app`. When set, it replaces `url` everywhere and writes `CNAME` |
| `email` | The contact address on every page |
| `appStoreUrl` | Once the app is approved: turns the launch button into "Download on the App Store" |
| `teamPrice` | Once decided, like `$49 per person per month, billed yearly`. Shown on the Team page |

## What's live on the home page

The hero compass, Today's five, Ask, the federal map and the team overview all run the real Bearings engine (`js/engine.js`) on its built-in sample network of 680 made-up people. "Take it for a spin" loads the web build of the app from `demo/`.

## Media

The videos and screenshots are recorded from the real iOS app by the **Bearings site media** workflow in the app repo, which publishes them to its `site-media` branch. To refresh everything after an app change:

```sh
./scripts/update.sh /path/to/Network-Order-of-Battle
```

## Going live on your own domain

1. **Buy the domain.** Cloudflare Registrar sells domains at cost and keeps the DNS in the same place as the hosting.
2. **Let GitHub deploy to Cloudflare.** Create a Cloudflare API token with the Cloudflare Pages Edit permission. Add it to this repo's secrets as `CLOUDFLARE_API_TOKEN`, along with `CLOUDFLARE_ACCOUNT_ID`. Every push to `main` then deploys (see `.github/workflows/deploy.yml`). The first run creates the Pages project `bearings`.
3. **Attach the domain.** In Cloudflare, open Workers & Pages, then `bearings`, then Custom domains, and add the domain and `www`.
4. **Point the site at it.** Set `customDomain` in `site.json`, run the build script, and push.
5. **Email.** Cloudflare Email Routing can forward an address like `hello@` at your domain to your inbox for free. Then set `email` in `site.json`.
6. **The team server.** Give it `team.` at your domain, so invite links carry your name. See `server/team/README.md` in the app repo.
7. **The app and store listing.** Update the App Store support, marketing and privacy URLs, and the privacy link in the app, to the new domain.

## Before taking payments for Bearings Team

- Have a lawyer review `content/terms.html`, especially the refund, liability and governing-law sections.
- Stripe asks for a public terms page, refund policy and contact method. All three are on the site.
