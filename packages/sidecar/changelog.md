#  (2024-10-08)


### Bug Fixes

* add node as an export condition 2e70542
* add-script and yamlloader 38208f0
* additional exports to provide better typing on dependent projects 3082146
* allow pm yto start 6a757f6
* aritificial bump 3f50335
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* build issue after update to @akala/core e3d0b1b
* bump version dc1b5d3
* compilation 0179a74
* define commands in sidecar f55e8b6
* downgrade all packages to support both cjs and mjs cd58dc1
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* fix generate and tsconfig files f6e44d6
* fix model registration and serialization 632446d
* get rid of last json import ce03a47
* move to ESM 6b55a07
* normalized modules to work in esm and cjs c9e7650
* path to container schema 9f4404e
* pubsub import assert 0f90707
* remove confusing inject property on commands 94e3058
* remove container.ts in sidecar e26ae31
* remove winston dependency 026dabc
* sidecar builder ef2ea38
* sidecar command definition b03fb4c
* sidecar init with single store config 29f3ec4
* sidecar storage building 57656f8
* sidecar store init 52944d0
* update after storage upgrade fec8829
* update lock and commands.json files 6d828a3
* update lock file 960047c
* update package definitions e8f89f1
* update to new branch json url 777d26d


### Code Refactoring

* rename app to sidecar 1480ca8


### Features

* add $init function for easier usage 2e86c8c
* add multistore 63ccbd5
* add plugins mechanism 9ab498a
* add reload-metadata on pm a28066f
* add sidecar models to configuration a64f5ec
* add sidecars accessor 95ff3cb
* fix sidecar a44be3c
* have both CJS and ESM at once b07f75b
* move Deferred and Serializable(Object) to core 240544f
* releasing sidecar ccd0060
* return ProxyConfiguration correct type when strongly typed 0198e0d
* update to ESM 500be75


### BREAKING CHANGES

* can only work with ESM now
* Deferred and Serializable(Object) moved to core instead of json-rpc-ws causing dependencies break.
* core and json-rpc-ws dependencies swapped because of afore mentioned breaking change
* inject property does not exist on commands anymore
* cli does not use winston as a logger anymore
* rename app to sidecar



