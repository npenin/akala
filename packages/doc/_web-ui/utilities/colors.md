---
---

# Colors

Since Apple designs very nice looking systems, `@akala/web-ui` heavily inspires from [Apple design guidelines](https://developer.apple.com/design/human-interface-guidelines/color#Specifications) for css variable names and values.

Should you want to tweak the colors, you only need to customize the `--accent` color and all the components will adapt to this new accent color.  By default, the accent color will be the Apple blue color. You are free to change the accent color to any color or one of the provided "system" colors:

- `--system-red`
- `--system-green`
- `--system-blue`
- `--system-yellow`
- `--system-orange`
- `--system-pink`
- `--system-purple`
- `--system-teal`
- `--system-indigo`

## Root Colors

- `--black`: #000000
- `--white`: #FFFFFF
- `--dark-gray`: #3c3c43
- `--light-gray`: #F2F2F7
- `--medium-gray`: #D1D1D6
- `--separator-gray`: #C6C6C8
- `--highlight-yellow`: #FFFF00
- `--blue-link`: var(--accent, var(--system-blue))
- `--blue-selection`: #D6E4FF
- `--opaque-separator`: #D1D1D6
- `--secondary-background`: var(--light-gray)
- `--light-background`: #FFFFFF
- `--dark-background`: #1C1C1E
- `--grid-color`: #E5E5E5
- `--shadow-color-light`: #0000001a
- `--shadow-color-dark`: #00000059
- `--highlight-color`: var(--system-red)
- `--unemphasized-selected-text`: #C6C6C8
- `--unemphasized-selected-background`: #E5E5E5

## Accent Colors

- `--control-accent-color`: var(--system-blue)
- `--control-color`: var(--control-accent-color)
- `--highlight-color`: var(--highlight-yellow)
- `--selected-control-color`: var(--control-accent-color)
- `--selected-control-text-color`: var(--white)
- `--find-highlight-color`: var(--highlight-yellow)

## Light Mode Colors

- `--system-red`: #FF3B30
- `--system-green`: #34C759
- `--system-blue`: #007AFF
- `--system-yellow`: #FFCC00
- `--system-orange`: #FF9500
- `--system-pink`: #FF2D55
- `--system-purple`: #AF52DE
- `--system-teal`: #5AC8FA
- `--system-indigo`: #5856D6
- `--system-gray`: #8e8e93
- `--system-gray2`: #aeaeb2
- `--system-gray3`: #c7c7cc
- `--system-gray4`: #d1d1d6
- `--system-gray5`: #e5e5ea
- `--system-gray6`: #f2f2f7

## Dark Mode Colors

- `--system-red`: #FF453A
- `--system-green`: #30D158
- `--system-blue`: #0A84FF
- `--system-yellow`: #FFDD57
- `--system-orange`: #FF9F0A
- `--system-pink`: #FF2D55
- `--system-purple`: #AF52DE
- `--system-teal`: #64D2FF
- `--system-indigo`: #5E6AD2
- `--system-gray`: #8e8e93
- `--system-gray2`: #636366
- `--system-gray3`: #48484a
- `--system-gray4`: #3a3a3c
- `--system-gray5`: #2c2c2e
- `--system-gray6`: #1c1c1e

## WACG considerations

In many places, I tried to keep at least the [AA contrast level](https://www.w3.org/TR/WCAG21/#contrast-minimum).

Even though it may not be perfect, you may leverage this function for your own needs. It basically computes the best contrast for your `--text-color` based on your `--background-color`

```css
--text-color: hsl(from var(--background-color) h s calc(50 - ((round(down, round(up, (l - 50) / 50) + 1 / 2) - 0.5) * 2) * 50));
```
