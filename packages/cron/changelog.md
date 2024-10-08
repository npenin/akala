#  (2024-10-08)


### Bug Fixes

* add missing proxy command to establish the bridge 2a8c081
* add node as an export condition 2e70542
* add-script and yamlloader 38208f0
* allow pm yto start 6a757f6
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* bump version dc1b5d3
* commands stay in order 3dd95c6
* downgrade all packages to support both cjs and mjs cd58dc1
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* fix generate and tsconfig files f6e44d6
* improve openapi support and json schema interpretation 071da4b
* made connect and fork more reliable and resilient ecb1b48
* made cron as non spreadable 803391c
* move to ESM 6b55a07
* normalized modules to work in esm and cjs c9e7650
* package build dependencies 7bffcf0
* path to container schema 27a816b
* ready command in pm works in both forks and remote 31fde71
* regex exec is not iterable 6fbeff3
* reload-metadata definition fixed c3fc006
* remove confusing inject property on commands 94e3058
* remove implicit node dependency d05de85
* remove winston dependency 026dabc
* revert some changes to fix build a67e5f7
* sidecar to remote containers 33df73e
* start command dbdfc72
* update all commands cf893ab
* update CLI definitions 5a31abe
* update dependencies and regenerate metadata 79412a7
* update jsdoc f1654fb
* update lock and commands.json files 6d828a3
* update lock file 960047c
* update package definitions e8f89f1
* update to new branch json url 777d26d
* update ts generated files 0d778b5
* wrong version e6e0b33


### Features

* add reload-metadata on pm a28066f
* add support for jobs and schedules (as a SqlAgent) 58e6a49
* cron complete implementation c9d491f
* deprecate CJS implemtations for many packages bcddb76
* have both CJS and ESM at once b07f75b
* leverage suncalc 658a3ac
* move Deferred and Serializable(Object) to core 240544f
* update to ESM 500be75


### BREAKING CHANGES

* CJS is no more supported
* Deferred and Serializable(Object) moved to core instead of json-rpc-ws causing dependencies break.
* core and json-rpc-ws dependencies swapped because of afore mentioned breaking change
* inject property does not exist on commands anymore
* cli does not use winston as a logger anymore



