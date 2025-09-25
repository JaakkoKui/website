# Ketunkolo Club Website

A lightweight static website for the **Ketunkolo** club. Includes a landing page, events section, game portal placeholder, and a contact form (client-side only for now).

## Structure
```
index.html              # Main landing page
css/styles.css          # Global styling (dark/light theme)
js/script.js            # Navigation, theme toggle, simple form handler
games/index.html        # Game portal placeholder
assets/favicon.svg      # Favicon / simple logo
```

## Game Uploads
Place your exported web build under `games/<your-game>/` and either:
- Link to it from `games/index.html`, or
- Embed with an `<iframe>` in `index.html` or a dedicated page.

Example:
```html
<iframe src="games/my-game/index.html" title="My Game" loading="lazy" allowfullscreen class="embed"></iframe>
```

## Local Preview
Just open `index.html` in a browser, or serve with a tiny static server for correct relative paths & dev convenience.

### Python (3.x)
```bash
python -m http.server 8080
```
Then open: http://localhost:8080/

### Node (npx serve)
```bash
npx serve .
```

## Theming
A light/dark toggle stores preference in `localStorage`. Customize color tokens in `:root` and `[data-theme="light"]` sections inside `css/styles.css`.

## Contact Form
Currently client-side only: shows a success message but does not send data. To wire it up:
1. Add an endpoint (e.g. serverless function or form backend service)
2. Replace the submit handler in `js/script.js` with a `fetch()` POST call
3. Handle validation and spam protection (e.g., honeypot field or token)

## Accessibility & Performance Notes
- Uses semantic landmarks (`header`, `main`, `nav`, `section`, `footer`)
- Skip link for keyboard users
- Responsive layout with CSS grid/flex
- Minimal JS and no external dependencies

## Next Ideas
- Add Markdown → HTML build pipeline if you want news posts
- Add JSON-driven events loaded dynamically
- Add game version selector and changelog
- Deploy via GitHub Pages / Netlify / Vercel

## License
You choose. If unsure, MIT is a common permissive option.
