# HTML Design Handoff

HTML Design Handoff turns plain HTML prototypes into local, Figma-like handoff pages. It is meant for teams that sketch product screens in HTML and want frontend developers to inspect layout, text, spacing, color, and element bounds without opening Figma, Mockplus, or a browser devtools-heavy workflow.

## What It Generates

For every `.html` file in the project root, the tool creates a standalone file in `handoff/`:

- `handoff/index.html`: an entry page for all generated handoff pages
- `handoff/*-handoff.html`: one inspectable handoff page per source HTML file

Each handoff page includes:

- a layer tree for visible DOM elements
- an iframe preview of the original HTML
- click-to-select element inspection
- Chinese design specs for width, height, text, font, line height, color, opacity, spacing, and CSS snippets
- red measurement guides for selected elements
- inspect mode and interaction mode, so interactive prototypes can still be clicked
- a `Specs JSON` export for frontend or design-data comparison

## Requirements

- Node.js 18 or newer
- npm

No browser extension, design platform account, or paid design tool is required.

## Install

```bash
npm install
```

## Usage

Put your source HTML files in the project root, then run:

```bash
npm run build
```

Open the generated entry file:

```text
handoff/index.html
```

Or open a specific generated page:

```text
handoff/your-page-handoff.html
```

## Recommended Workflow

1. Create or export your HTML prototype.
2. Place the `.html` file in the project root.
3. Run `npm run build`.
4. Send the generated `handoff/` files to frontend developers.
5. Developers open the generated handoff HTML locally and inspect the page like a lightweight Figma Inspect view.

## HTML Authoring Tips

The tool reads real browser layout data, so better HTML produces better specs.

- Give important modules clear class names.
- Keep key text in its own element when it needs independent inspection.
- Set explicit `font-size` and `line-height` for important text.
- Avoid putting too many visual responsibilities on one large wrapper element.
- Use real spacing with CSS margin, padding, flex, or grid instead of visual-only screenshots.
- Keep interactions as normal links, buttons, or JavaScript events so interaction mode can preserve them.

## Modes

`标注模式` is for design inspection. Click elements to view specs.

`交互模式` lets clicks pass through to the original HTML, so prototype links and buttons can work normally.

## Units

Visible specs use CSS `px`, which is the unit frontend developers usually implement directly.

The exported `Specs JSON` can also include scaled design data for comparison with tools that use 2x design canvases, but the main UI intentionally shows one clear unit.

## Scripts

```bash
npm run build
npm test
```

## What This Is Good For

- turning AI-generated HTML prototypes into developer-readable handoff files
- reducing manual redraw work in Figma or Mockplus
- sharing inspectable local specs with frontend engineers
- checking whether generated HTML contains enough design information for implementation

## Current Limitations

- It cannot recover design intent that is missing from the HTML. If the source HTML has no explicit line height, the tool can only estimate it from browser-rendered layout.
- It reads DOM/CSS layout, not original design-tool layers.
- Very complex animations or canvas-rendered UIs may not expose useful element-level specs.
- Generated specs are best treated as developer handoff guidance, not as a replacement for a mature design system.

## License

MIT
