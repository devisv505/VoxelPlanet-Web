# VoxelPlanet documentation site

The online guide for VoxelPlanet: one static page with a spinning 3D planet, search, and interactive
bits for the controls, the terrain tool and the Planet Editor. There's no build step, no framework and
nothing to install. It's plain HTML, CSS and JavaScript, so GitHub Pages can serve the folder as it is.

## Try it locally

Open a terminal in this folder and start any static server, for example:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. (Double-clicking `index.html` mostly works too, but the 3D planet
is an ES module, and some browsers won't load modules from `file://`.)

## Put it on GitHub Pages

1. Create a new repository on GitHub, for example `voxelplanet-docs`. It needs to be public, unless
   your plan includes Pages for private repositories.
2. Push this folder to it:

   ```bash
   git init
   git add .
   git commit -m "VoxelPlanet docs"
   git branch -M main
   git remote add origin https://github.com/<you>/voxelplanet-docs.git
   git push -u origin main
   ```

3. On GitHub, open the repository's **Settings › Pages**. Under **Build and deployment**, set
   **Source** to **Deploy from a branch**, then pick **main** and **/ (root)** and click **Save**.
4. Wait a minute or two. The site appears at `https://<you>.github.io/voxelplanet-docs/`, and the
   Pages settings page shows the link once it's live.

Every later push to `main` republishes the site by itself.

All links in the page are relative, so it works under the `/<repository>/` path without changes. The
empty `.nojekyll` file tells GitHub to serve the files as they are instead of running Jekyll on them.
Keep it.

**Your own domain (optional).** In **Settings › Pages › Custom domain**, enter something like
`docs.example.com`, then add a CNAME record for it at your DNS provider pointing to
`<you>.github.io`. GitHub explains the details on that same page.

## Things to fill in

At the top of `assets/js/site.js`:

```js
var SITE = {
  assetStoreUrl: '',   // the Asset Store page, once it's live
  supportEmail: '',    // the address you want people to write to
  discordUrl: 'https://discord.gg/PeTNV3FUrN'
};
```

An empty value hides its button: the **Asset Store** button (next to *Download the PDF guide* at the
top) and the **Email support** card under *Credits and support* stay hidden until you fill them in.

The version shown in the header ("Docs · v1.0") is plain text in `index.html`.

## Updating the content

- **Text** lives in `index.html`, one `<section>` per chapter, in the same order as the PDF guide.
  Search builds itself from the page, so new text is searchable without extra work.
- **The PDF** is `assets/VoxelPlanet_User_Guide.pdf`, a copy of the one in the Unity project
  (`Assets/DEV505/VoxelPlanet/Documentation`). Copy it over again whenever you rebuild it.
- **Screenshots** are in `assets/img`. Most are the same pictures as the PDF guide
  (`Docs/AssetStore/images` in the Unity project). `editor_planet.png` is a crop of
  `editor_terrain.png`.
- **The 3D planet** in the header is `assets/js/planet.js`. The six presets and their colours are in
  the `PLANETS` list at the top. three.js loads from the jsDelivr CDN. If WebGL or the CDN isn't
  available, the page shows `assets/img/orbit.jpg` in its place.

## What the page keeps in the browser

Two things, in `localStorage`, and nothing leaves the browser:

- `vp-theme` is the light or dark choice.
- `vp-steps` holds the ticks in the *Getting started* checklist.

## Files

```
index.html                     the whole guide
assets/css/site.css            styles, dark and light themes, phone layout
assets/js/site.js              search, tabs, controls explorer, hotspots, stepper, filters
assets/js/planet.js            the 3D planet (three.js)
assets/img/                    screenshots and the favicon
assets/VoxelPlanet_User_Guide.pdf
.nojekyll                      serve files as they are on GitHub Pages
```
