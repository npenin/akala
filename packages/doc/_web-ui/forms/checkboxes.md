---
title: Checkboxes
---

# Checkboxes

This documentation covers the different states and appearances of checkboxes.

## States

Checkboxes can be in the following states:

- **Normal**: The default state of the checkbox.
- **Hovered**: When the mouse pointer is over the checkbox.
- **Active**: When the checkbox is being clicked.
- **Focused**: When the checkbox is focused using the keyboard.
- **Disabled**: When the checkbox is disabled and cannot be interacted with.

## Variants

### Standard Checkboxes

Standard checkboxes can be in the following states:

- **Unchecked**
- **Checked**
- **Indeterminate**

### Checkbox Switches

Checkbox switches are styled differently but have the same states as standard checkboxes:

- **Unchecked**
- **Checked**
- **Indeterminate**

## Examples

### Standard Checkboxes

```html
<input type="checkbox">
```

### Checkbox Switches

```html
<input type="checkbox" class="switch">
```

## Customization

### Variables for Any Checkbox

You can customize the look and feel of any checkbox using the following CSS variables:

- `--control-background-color`: Background color of the checkbox.
- `--control-border-color`: Border color of the checkbox.
- `--control-text-color`: Text color of the checkbox.
- `--control-accent-color`: Accent color when the checkbox is checked.
- `--hover-background-color`: Background color when the checkbox is hovered.
- `--hover-text-color`: Text color when the checkbox is hovered.
- `--hover-border-color`: Border color when the checkbox is hovered.
- `--active-background-color`: Background color when the checkbox is active.
- `--active-text-color`: Text color when the checkbox is active.
- `--active-border-color`: Border color when the checkbox is active.
- `--disabled-background-color`: Background color when the checkbox is disabled.
- `--disabled-text-color`: Text color when the checkbox is disabled.
- `--disabled-border-color`: Border color when the checkbox is disabled.
- `--control-border-radius`: Border radius of the checkbox.

You may check the [interactable](../components/interactable) concept to see more variables

### Variables for Checkbox Switches Only

You can customize the look and feel of checkbox switches using the following additional CSS variables:

- `--size`: Size of the checkbox switch.
- `--spacing`: Spacing inside the checkbox switch.
