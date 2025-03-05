---
title: Modules
parent: Welcome
nav_order: 2
---
# Modules

Modules in akala are not modules as in nodejs, but rather equivalent to packages. They are providing a logic seggregation between various pieces of software. Again inspired from angularjs, modules are just a kind of injectors with a life cycle :

- activate
- ready

```ts
var aModule=module('a');
aModule.register('hello', 'world')
aModule.ready(['hello'], function(a)
{
  console.log(a);
});
aModule.start(); //trigger internally the life cycle and eventually prompts 'world' to the console.
```

Of course, modules would not be modules without dependency injection. For that, modules internally use [orchestrator](//npmjs.org/orchestrator) (the same library as used in [gulp](https://gulpjs.com/)).

```ts
var aModule=module('a');
var bModule=module('b', aModule);
var cModule=module('c', aModule);
var dModule=module('d', bModule, 'c');
aModule.register('hello', 'world')
aModule.ready(['hello'], function(a)
{
  console.log(a);
});
dModule.start(); //trigger internally the life cycle and eventually prompts 'world' to the console.
```

Note: modules are registered in a dedicated injector, itself registered in the default injector as $modules
