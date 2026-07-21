# Reactive Civic Sun System
<img width="400" height="208" alt="image" src="https://github.com/user-attachments/assets/fa2240af-1b58-4b53-b2b9-d54de88b5a30" />


A generative p5.js sketch: a swarm of orbiting circles that react to each other and to a central "sun," leaving a slowly fading trail of archived circles behind them.

## Features

- **Flocking behavior** — circles repel, attract, and align with nearby neighbors
- **Sun gravity** — circles are pulled toward the sun and nudged into orbit around it
- **Circle lifecycle** — each circle is born, lives, fades, and is archived into a persistent background trail
- **Mouse interaction** — moving the mouse spawns new circles at the cursor
- **Flow field background** — a noise-driven line field animates behind everything
- **Fully tunable** — every visual and behavioral parameter lives in one `SETTINGS` object at the top of [`sketch.js`](sketch.js)

## Running it

This sketch depends on [p5.js](https://p5js.org/). Create an `index.html` alongside `sketch.js`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Reactive Civic Sun System</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
  <style>body { margin: 0; overflow: hidden; }</style>
</head>
<body>
  <script src="sketch.js"></script>
</body>
</html>
```

Then open `index.html` in a browser (or serve the folder with any static file server).

## Customizing

All behavior is controlled from the `SETTINGS` object at the top of `sketch.js` — no need to touch the logic below it. Key sections:

| Section | Controls |
|---|---|
| `sun` | Position, size, glow, and pull/orbit strength |
| `flow` | The animated background line field |
| `activeCircles` | Spawn count, size, speed, flocking forces, and lifecycle timing |
| `archivedCircles` | How faded/archived circles look once retired |
| `mouseSpawn` | Circles created on mouse movement |
| `overlay` | Subtle noise/grain over the final frame |

## Project structure

```
sketch.js   — the sketch (settings + p5.js draw loop)
```
