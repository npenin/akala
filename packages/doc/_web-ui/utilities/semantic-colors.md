---
---

# Semantic Colors

## Semantic Color Classes

### `.danger`

- `--control-accent-color`: var(--system-red)

### `.warning`

- `--control-accent-color`: var(--system-yellow)

### `.success`

- `--control-accent-color`: var(--system-green)

### `.info`

- `--control-accent-color`: var(--system-blue)

## Helpers

### `.pastel`

The pastel class (in combination with one of the semantic colors) will help you have softer colors but still identifiable by the user.

- `--desaturate-ratio`: .5
- `--current-accent-color`: the current semantic color desaturated by the `--desaturate-ratio` and 90% to 100% lighter.

### `.text`

- `--control-text-color`: takes the current color with a lightness maxed at 40%

### `.bg`

- `background-color`: current color
- `color`: text color computed based on [WACG considerations](./colors#WACG%20consirerations)

### `.text-bg`

- `color`: var(--control-text-color)
- `background-color`: var(--current-control-tint)

## Tables

Tables can follow the semantic color applied to it. Striped variations will also follow.

You may also decide to apply semantic colors to a dedicated row. Of course, in that case, it would override the striped colors.
