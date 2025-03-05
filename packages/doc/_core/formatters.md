---
parent: Welcome
nav_order: 2
---

# Formatters

## Introduction

This document provides an overview of the core formatters available in the system. Each formatter serves a specific purpose and can be used to manipulate data in various ways. The formatters are categorized into two main types:

- **Formatter**: A formatter that transforms a value into a specific format.
- **ReversibleFormatter**: A formatter that can both format and unformat a value, allowing for bidirectional transformation.

The following sections describe the usage and functionality of each core formatter.

### reverseFormatter

The `reverseFormatter` function takes a `ReversibleFormatter` class and returns a new `ReversibleFormatter` that reverses the format and unformat methods. This function is used to generate the `#toDate` formatter from the `#date` formatter.

#### Usage

```javascript
const reversedFormatter = reverseFormatter(DateFormatter);
const originalDate = reversedFormatter('yyyy-MM-dd').format('2023-10-05');
console.log(originalDate); // Outputs: Date object representing '2023-10-05'
```

## Core Provided Formatters

### #not

Negates a boolean value.

#### Usage

```javascript
const result = new Negate().format(true);
console.log(result); // Outputs: false
```

### #bool

Converts a value to a boolean.

#### Usage

```javascript
const result = new Booleanize().format(0);
console.log(result); // Outputs: false
```

### #json

Formats a value as JSON.

#### Usage

```javascript
const jsonString = new Json().format({ key: 'value' });
console.log(jsonString); // Outputs: '{"key":"value"}'
```

#### Reversed

```javascript
const obj = new Json().unformat('{"key":"value"}');
console.log(obj); // Outputs: { key: 'value' }
```

### #date

Formats and unformat a date value according to the specified format string.

#### Usage

```javascript
const formattedDate = new DateFormatter('yyyy-MM-dd').format(new Date());
console.log(formattedDate); // Outputs: '2023-10-05'
```

#### Supported Format Specifiers

- `y`: Year
- `M`: Month
- `d`: Day
- `h`: Hour
- `m`: Minute
- `s`: Second

### #toDate

toDate is simply the reversed DateFormatter (using `reverseFormatter`).
Converts a formatted date string back to its original Date object.

#### Usage

```javascript
const date = new DateFormatter('yyyy-MM-dd').unformat('2023-10-05');
console.log(date); // Outputs: Date object representing '2023-10-05'
```

#### Supported Format Specifiers

- `y`: Year
- `M`: Month
- `d`: Day
- `h`: Hour
- `m`: Minute
- `s`: Second

### #debounce

Debounces a function call.

#### Usage

```javascript
const debouncedFunction = new Debounce(300).unformat(() => console.log('Called!'));
debouncedFunction(); // Will log 'Called!' after 300ms if not called again within that time.
```
