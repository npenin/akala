---
title: Akala Documentation
---

<!-- Place this tag where you want the button to render. -->
<a class="github-button" href="https://github.com/sponsors/npenin" data-color-scheme="no-preference: light; light: light; dark: dark;" data-icon="octicon-heart" data-size="large" aria-label="Sponsor @npenin on GitHub">Sponsor</a>
<a class="github-button" href="https://github.com/npenin/akala" data-color-scheme="no-preference: light; light: light; dark: dark;" data-icon="octicon-star" data-size="large" aria-label="Star npenin/akala on GitHub">Star</a>

# Welcome

Akala is a framework that aims to provide kind of a mix between [angular](https://angular.io), [redux](https://redux.js.org), [uci](https://openwrt.org/docs/guide-user/base-system/uci) and [pm2](https://pm2.io/).

It is composed of multiple layers

- [jsonrpc](jsonrpc): base communication layer (obviously other protocols can be used, but this one is the firstclass choice).
- [core](core): base layer containing all necessary implementations for subsequent layers: modules, dependency injection, 2way data binding, ...
- [commands](commands): base layer to implement a redux-like system.
- [configuration](configuration): on top of commands, sits the configuration layer. It has various way to control configuration content, so could be used without commands, but having commands implementation makes it depending on commands layer.
- [storage](storage): storage layer is my vision of an ORM in javascript. (currently not many providers are supported, but it might grow in the future).
- [cli](cli): CLI helpers to build your own CLI or enrich akala.

Up to here, all previously mentioned layers are usable from either client or server side (understand browser or nodejs). Then comes the platform specific layers.

- [pm](pm): process manager. It says it all: this layer is a docker like system which you can control using the [commands](commands)layer. Each process can be started with its own arguments (like a docker container).
- [server](server): node layer. It basically supports server side command triggers like http (This permits to have commands being served by http).
- [client](client): browser layer heavily inspired from angularjs and angular from a concept perspective, but with a radically different usage approach.

Finally comes the helpers to help you leverage this big framework.

- [web-ui](web-ui): a (twitter) bootstrap equivalent, leveraging [postcss](https://postcss.org).

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear' } } }%%
flowchart TB
    authentication ---> commands & core
   automate-yamlloader ---> automate & config & pm
   automate ---> cli & commands & config & core & cron & json-rpc-ws & pm & pubsub & server
   aws-lambda ---> commands & core
   cli ---> core
   client ---> commands & core
   commands ---> cli & core & json-rpc-ws
   config ---> commands & core
   cron ---> commands & core & pubsub
   gateway ---> cli & core & json-rpc-ws
   json-rpc-ws ---> core
   jwt ---> core
   pm ---> cli & commands & config & core & json-rpc-ws
   pubsub ---> commands & core & pm
   semantic-release ---> cli & commands
   server ---> commands & core & json-rpc-ws & pm
   sidecar ---> cli & commands & config & core & pm & storage
   storage ---> core
   storage-mongodb ---> core & storage
   vite ---> client & commands & core & json-rpc-ws
   web-ui ---> client & commands & core
    authentication -.-> jwt & pm & server & storage

    click authentication "_authentication" "Go to authentication documentation"
   click automate-yamlloader "_automate-yamlloader" "Go to automate-yamlloader documentation"
   click automate "_automate" "Go to automate documentation"
   click aws-lambda "_aws-lambda" "Go to aws-lambda documentation"
   click cli "_cli" "Go to cli documentation"
   click client "_client" "Go to client documentation"
   click commands "_commands" "Go to commands documentation"
   click config "_config" "Go to config documentation"
   click core "_core" "Go to core documentation"
   click cron "_cron" "Go to cron documentation"
   click gateway "_gateway" "Go to gateway documentation"
   click json-rpc-ws "_jsonrpc" "Go to json-rpc-ws documentation"
   click jwt "_jwt" "Go to jwt documentation"
   click pm "_pm" "Go to pm documentation"
   click protocol-parser "_protocol-parser" "Go to protocol-parser documentation"
   click pubsub "_pubsub" "Go to pubsub documentation"
   click semantic-release "_semantic-release" "Go to semantic-release documentation"
   click server "_server" "Go to server documentation"
   click sidecar "_sidecar" "Go to sidecar documentation"
   click storage "_storage" "Go to storage documentation"
   click storage-mongodb "_storage-mongodb" "Go to storage-mongodb documentation"
   click tacl "_tacl" "Go to tacl documentation"
   click vite "_vite" "Go to vite documentation"
   click web-ui "_web-ui" "Go to web-ui documentation"
```

<!-- Place this tag in your head or just before your close body tag. -->
<script async defer src="https://buttons.github.io/buttons.js"></script>
