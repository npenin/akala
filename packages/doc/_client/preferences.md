# Preferences

Currently, there is only 1 preference, but other may come.

## Preferred casing

When generating application and pages, you may want to specify a preferred casing for your files.

```bash
akala sdk client set-preferred-casing <casing>
```

Currently, the following casings are supported:

| casing | Input | Example |
| --- | --- | --- |
| camel | `this is_my-input` | thisIsMyInput |
| pascal| `this is_my-input` | ThisIsMyInput |
| kebab| `this is_my-input` | this-is-my-input |
| snake| `this is_my-input` | this_is_my_input |
