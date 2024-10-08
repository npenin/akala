#  (2024-10-08)


### Bug Fixes

* add node as an export condition 2e70542
* add provenance 7e40a49
* add-script and yamlloader 38208f0
* allow akala plugin to be used 889514c
* allow pm yto start 6a757f6
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* automate after upgrade cb80980
* automate after upgrade 323f08f
* automate after upgrade 0ad7303
* automate after upgrade a9e64da
* automate fixed 27bf5e1
* automate implementation 2d1bb7b
* **automate:** stdio 861db3c
* **automate:** wrong error reporting on cli 6cbcdbb
* avoids workflow leaks in context 9227e29
* build issue after update to @akala/core e3d0b1b
* bump version dc1b5d3
* bypass item if undefined in foreach de6105d
* client compilation c66325e
* compilation issue 680f778
* compilation issue f7ad107
* downgrade all packages to support both cjs and mjs cd58dc1
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* fix automate runner 77e099c
* fix generate and tsconfig files f6e44d6
* improve browser usage ac6f14b
* improve error logging 5f68dcf
* improve openapi support and json schema interpretation 071da4b
* log format 42f97c5
* log only enumerable props 2cdd969
* move from abortsignal to abortcontroller 514b4ba
* move socket name as part of socket options ecbfb57
* move to ESM 6b55a07
* normalized modules to work in esm and cjs c9e7650
* output formatting 021bc7d
* package build dependencies 7bffcf0
* path to command metadata 98a349c
* path to container schema 9f4404e
* pm start command 90762ab
* proper stdio support 9c34394
* reduce silly logging bc8f548
* remove confusing inject property on commands 94e3058
* remove stdio logging 043e6b2
* remove winston dependency 026dabc
* require dependent packages broken 7b3f12d
* revert some changes to fix build a67e5f7
* runnerMiddleware more type friendly 4dc10e2
* spread is not considering non enumerable properties 499317b
* update after cli option update aec649f
* update after core breaking change 57734b2
* update all commands cf893ab
* update dependencies and regenerate metadata 79412a7
* update lock and commands.json files 6d828a3
* update lock file 960047c
* update package definitions e8f89f1
* update to commands major version d4478a4
* update to latest @akala/core 28c28a7
* update to new branch json url 777d26d
* update ts generated files 0d778b5
* workflow parallelism 5998acc
* workflow runner de369a2
* wrong version ff0910e
* wrong version 9deecdc


### Features

* add abort signal on CliContext 8c449b3
* add autotmate as an akala plugin efa245a
* add condition support and fix error report d60dfbf
* add failure support 7519533
* add ignore failure support 2a4ea9c
* add MiddlewareRunnerMiddleware b1a4552
* add runnerMiddleware as export 3d053f3
* add stdio middleware 10e0044
* allow for relative path in cli f240d15
* automate supports any runner and log is a new one bfd4519
* **automate:** adds support for context 3b8119d
* **automate:** rename if to condition 7c97484
* **automate:** workflow agent full operational c806c56
* deprecate CJS implemtations for many packages bcddb76
* embedded cron implementation in workflow d365314
* enable cli help/documentation 26eb4f3
* enforce logger on buildCliContext d8963c8
* have both CJS and ESM at once b07f75b
* improve middleware behaviour 99aa466
* move Deferred and Serializable(Object) to core 240544f
* move to serve with AbortSignal 8449080
* moved to middleware approach 8668033
* support for triggers 030bf37
* support node module when no ./ prefix 18773a8
* support normalize require config 5c4496c
* update to ESM 500be75


### BREAKING CHANGES

* CJS is no more supported
* serveMetadata signature change
* Deferred and Serializable(Object) moved to core instead of json-rpc-ws causing dependencies break.
* core and json-rpc-ws dependencies swapped because of afore mentioned breaking change
* inject property does not exist on commands anymore
* cli does not use winston as a logger anymore
* relative path has to start with ./
* renamed enqueue command to start



