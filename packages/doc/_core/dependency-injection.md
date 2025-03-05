---
title: Dependency Injection
parent: Welcome
nav_order: 2
---
# Dependency Injection

At the core of all modern frameworks live dependency injectors. The choice have been made here to make dependency injector available and usable for any kind of purpose. You may create an injector by simply instantiating a `new SimpleInjector()`.
Injectors also have the possibility to inherit registration from another one see sample below :

```ts
var a = new SimpleInjector();
var b = new SimpleInjector(a);
a.register('hello', 'world');
console.log(b.resolve('hello')); //world
```

Injectors also support simple expression parsing:

```ts
var a = new SimpleInjector();
var b = new SimpleInjector(a);
a.register('foo', {'hello': 'world'});
console.log(b.resolve('foo.hello')); //world
```

Finally please note that there is a default injector (`defaultInjector`). If no parent injector is specified, all injectors would inherit from it
