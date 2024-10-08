#  (2024-10-08)


### Bug Fixes

* add node as an export condition 2e70542
* add-script and yamlloader 38208f0
* allow pm yto start 6a757f6
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* build issue after update to @akala/core 7e83b52
* bump version dc1b5d3
* commands stay in order 3dd95c6
* compilation issue 680f778
* downgrade all packages to support both cjs and mjs cd58dc1
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* fix generate and tsconfig files f6e44d6
* fix the pubsub path 4d987b3
* get rid of last json import ce03a47
* improve openapi support and json schema interpretation 071da4b
* improve typing after commands update 1a9f12f
* made connect and fork more reliable and resilient ecb1b48
* move to ESM 6b55a07
* normalized modules to work in esm and cjs c9e7650
* path to container schema 9f4404e
* proper pubsub container 76ecef2
* ready command in pm works in both forks and remote 31fde71
* remove confusing inject property on commands 94e3058
* remove stateless bf9ca5f
* revert some changes to fix build a67e5f7
* sidecar command definition b03fb4c
* sidecar to remote containers 33df73e
* start command dbdfc72
* swap build dependencies 4ec03cc
* update all commands cf893ab
* update dependencies and regenerate metadata 79412a7
* update lock and commands.json files 6d828a3
* update lock file 960047c
* update package definitions e8f89f1
* update ready command for remote containers 18a555c
* update ready comment definition 7220126
* update to new branch json url 777d26d
* update ts generated files 0d778b5
* wrong version 6bff830


### Features

* add pubsub trigger 590c7c9
* add reload-metadata on pm a28066f
* deprecate CJS implemtations for many packages bcddb76
* first pubsub commit ff9353e
* have both CJS and ESM at once b07f75b
* update to ESM 500be75


### BREAKING CHANGES

* CJS is no more supported
* inject property does not exist on commands anymore



