# akala-core

# Context

Akala is aimed to be dependency injection framework (and more) available both on [client](client) side and [server](server) side.

# Features

This library provides the core features to be expanded by akala-server and akala-client :
- dependency injection
- two way data binding
- restricted set of jaascript parsing
- modules
- helpers

# Dependency injection
At the core of all modern frameworks live dependency injectors. The choice have been made here to make dependency injector available and usable for any kind of purpose. You may create an injector by simply instantiating a `new Injector()`.
Injectors also have the possibility to inherit registration from another one see sample below :
```ts
var a = new Injector();
var b = new Injector(a);
a.register('hello', 'world');
console.log(b.resolve('hello')); //world
```

Injectors also support simple expression parsing:
```ts
var a = new Injector();
var b = new Injector(a);
a.register('foo', {'hello': 'world'});
console.log(b.resolve('foo.hello')); //world
```

Finally please note that there is a default injector. If no parent injector is specified, all injectors would inherit from it

# Bindings
## History
Initally the binding idea came from .NET WPF. There we have the binding concept and the possibility to have 2 way data bindings. Then came angularjs with another presentation of 2 way data bindings. The approach taken here is to make fully accessible, just as another building block.

## Usage
Bindings are very easy to use and have 1 clear limitation (for now): they only support the . (dot) notation.
see examples below :
```ts
var o={x:{a:1, b:2, c:3}, a:[{a:4, b:5, c:6}], foo:'bar'}
var bindingXA=new Binding('x.a', o);
o.x.a=-1 // does not trigger binding update as used outside of binding "context"
var setterXA=Binding.getSetter(o, 'x.a');
setterXA(-1);
```

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

# Parsing
A partial javascript parser has been implemented to support expressions. Mostly used in [client](client), as other pieces in akala, this is free to use.

_documentation coming soon_
