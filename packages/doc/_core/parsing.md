---
title: Parsing
parent: Welcome
nav_order: 2
---
# Parsing

A partial javascript parser has been implemented to support expressions. Mostly used in [client](../client), as other pieces in akala, this is free to use.

## Usage Examples

### Basic Arithmetic Parsing

```typescript
const parser = new Parser();
const evaluator = new EvaluatorAsFunction();
const result = parser.parse('b*c+d', false);
console.log((evaluator.eval(result))({ b: 1, c: 2, d: 3 }));
```

### String concat and conditions

```typescript
console.log((evaluator.eval(parser.parse("template || '/' + deviceType + '/new.html'")))({ template: '/devices/virtualstate.html' }));
console.log((evaluator.eval(parser.parse("template || '/' + deviceType + '/new.html'")))({ deviceType: 'pioneer' }));
```

### [Formatters](formatters)

```typescript
class DummyHttpFormatter implements Formatter<string>
{
    public format(value: unknown)
    {
        return `$http on '${value}'`;
    }
}
formatters.register('#http', DummyHttpFormatter, true);

console.log((evaluator.eval(parser.parse("'/my/url' # http")))());
```

### Date Parsing

```typescript
console.log((evaluator.eval(parser.parse("'2018-03-12' # toDate")))({}));
console.log((evaluator.eval(parser.parse("'12/03/18' #toDate:'dd/MM/yy'")))({}));
console.log((evaluator.eval(parser.parse("'03/12/18' #toDate:'MM/dd/yy'")))({}));
console.log((evaluator.eval(parser.parse("'3/12/18' #toDate:'MM/dd/yy'")))({}));
```

### Complex Object Parsing

```typescript
console.log((evaluator.eval(parser.parse("{options:{in:'/api/@domojs/zigate/pending' # http, text:internalName, value:address}}"))({})));
console.log((evaluator.eval(parser.parse("{options:{in:'/api/@domojs/zigate/pending' # http, text:internalName, value:address}}")))({})['options']);
```

### Array Parsing

```typescript
console.log(evaluator.eval(parser.parse('columns[0].title'))({ columns: [{ title: 'pwet' }] }));
```
