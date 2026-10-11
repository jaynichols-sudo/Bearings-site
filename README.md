# Bearings website

The marketing site for Bearings, a private map of your professional network for iPhone, iPad, Mac, Apple Watch and Android.

It's a static site with no build step and no tracking. GitHub Pages serves it straight from `main`.

## What's live on the page

The hero compass, Today's five, Ask and the federal map all run the real Bearings engine (`js/engine.js`) on its built-in sample network of 680 made-up people. The "Take it for a spin" section loads the full web build of the app from `demo/`.

## Where the media comes from

The videos and screenshots are recorded from the real iOS app by the **Bearings site media** workflow in the app repo. That workflow publishes them to the `site-media` branch there.

To refresh everything after an app change:

```sh
./scripts/update.sh /path/to/Network-Order-of-Battle
```

That copies the latest engine and web demo, pulls the clips and screenshots, and re-encodes them for the web.

## Files

| Path | What it is |
| --- | --- |
| `index.html`, `styles.css`, `js/site.js` | The page |
| `js/engine.js` | The Bearings engine, built from the app repo |
| `demo/` | The web build of the app, for the live demo |
| `media/clips/` | Feature videos (MP4) and their poster frames |
| `media/shots/` | Clean screenshots from the simulator |

## When the app is in the App Store

Change the `#storeLink` button in `index.html` to point at the App Store page and relabel it "Download on the App Store".
