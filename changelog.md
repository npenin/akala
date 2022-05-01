#  (2022-05-01)


### Bug Fixes

* #10 6e164e7
* adapt to trigger new definition 8c2d136
* add missing dependency 3d0b4df
* add missing package required property ba0c9df
* add recursive path creation 3f7ffa7
* add stdin to pm cli e07437a
* added missing yaml dependency fa66dd1
* added remote pm socket support 074d6cf
* adding getOwnPropertyDescriptor to try to fix Object.assign d969335
* allow for any property on errors a529558
* aritificial bump ae0e129
* artificial bump 60cc1c1
* automate implementation f76a995
* avoids workflow leaks in context db4662a
* better file init 1087260
* better support for non-mapped sidecars ec502f8
* binding constructor 8294d0f
* bindings are less intrusive 3ef2783
* bump dependent 5e89235
* bump dependents proper references f734b61
* cannot read undefined config object 0cc01be
* Cli implementation a6c7103
* cli parsing a28c8fe
* client compilation 4815fd5
* client package 4f14fd3
* code clean up 11726cb
* compilation after typescript 4.4 upgrade 2828ff9
* compilation issue 6734227
* compilation issue 4735be5
* connect fails when connect on mapping is undefined 16bdd27
* correct name assignment in fork 3deb98f
* crash on parsing remote bcb17fe
* default version ignore to decline 01cb0f7
* dependencies d61f681
* discover cli usage 697946b
* discover implementation 3502bed
* docker build cfdaf4e
* enumerate on configuration objects a61e720
* error flow in composite middleware ec36174
* error serialization b3156ad
* export AggregateErrors f4285e2
* fix automate runner ae9c216
* fix model registration and serialization 7236001
* force metadata command registration in remote container 840d6dd
* fs discovery 0d34eea
* fs middleware after discovery changes d97fcca
* fs processor too catchy ccafa48
* git push tags fc8e609
* handle default init 5482bcb
* hasOwnKeys now returns correct keys 76a062e
* health check reliability 98df0c9
* honoring preferRemote 6fa76bc
* improve config get return type c40bcd5
* improve error logging 1b4ae07
* improve get-version 2f156a3
* improve performance of metadata lookup 81cf56a
* improve remote sidecars defaults eef7b24
* improve support for extends f6622ee
* improved logging support 8c81e18
* improved ready command for remote containers ffd2a17
* improves command detection ff43e85
* inject usage after move to full meta cmd 2cbda96
* json model definition parsing 0770dab
* jsonrpc processor 497616c
* jsonrpc trigger c95d27f
* limited git tag scope 7da0acb
* log format 403e66b
* log only enumerable props 3070ee3
* logger as non enumerable property 43fdcba
* made connect and fork more reliable and resilient 6c0c24f
* made cron as non spreadable 34d3f69
* mapAsync 64a258e
* metadata lookup eaa12c1
* metadata lookup on start da0c4d7
* middleware copy/paste issue 69757ce
* move dependency from devdep 36139a4
* nested container processing 8997869
* normalize path 58c9fcd
* output formatting f747eff
* output name from inner semantic-releases script 52382c6
* package build dependencies 3f14f37
* package name tagging cd9de24
* package.json to reduce vulnerabilities 2a1cae1
* packages/docker/Dockerfile to reduce vulnerabilities 7d43d77
* packages/docker/Dockerfile-arm to reduce vulnerabilities 7fd23ac
* packages/docker/Dockerfile-arm to reduce vulnerabilities 93d2550
* packages/docker/slim.dockerfile to reduce vulnerabilities 3aeee37
* parser more reliable 5c92e5a
* path can now be retrieved using property 2d3125e
* path to command metadata 4fc8111
* pm start a40a583
* prevent commands override 019f44f
* proper parameter binding for bump-dependents 7459c86
* provide proper variable to bumps dependents 82f8ddb
* push before tagging d980dd0
* reduce silly logging 378e856
* regex exec is not iterable ca695eb
* remote container command registration f3b0728
* remote pm proxy 633b1b5
* remote ready failing dcc0fc1
* remove duplicate binary operator 4930340
* remove duplicate foreach in publish 09d9fe5
* remove failure masking 7c4ae85
* remove triple-beam dependency c44bd2e
* remove winston dependency 3dcad68
* removed mock-require usage 99587ba
* removed mock-require usage 448f5be
* resolve legacy config lookup 5dceab9
* revert last change 1332114
* runnerMiddleware more type friendly 7bf1a25
* set log level for any namespace e1b1025
* sidecar builder 26673b1
* sidecar command definition 69f9b21
* sidecar init with single store config 5551424
* sidecar storage building 7285f5d
* sidecar store init 057f271
* sidecar to remote containers f795c56
* spread is not considering non enumerable properties 394438a
* stdin support 57f5ca7
* stdin support 23979ba
* stop generating loggers for numeric keys 75a1324
* support for no workspace dependencies 0703731
* support for no workspace dependencies 9210550
* support normalize files in modules 4a34d95
* swap build dependencies f7d45dd
* switch processes state to object 5aa41a4
* trigger signature 28e77a1
* update all commands 8f54036
* update command definition 85c2891
* update commands cli definition 5b7f8f1
* update dependencies and regenerate metadata 0c83667
* update ready command for remote containers 823810d
* update ready comment definition ebb8c05
* update reference to field 471f538
* update to commands  major version 180608a
* update to commands major version 0631f6e
* update to new commands major version 5e0bed5
* update to ws 8.0 ce769f9
* update workspace parameter binding 6b6b07b
* variable leak adef56b
* variable renaming f825597
* workflow output 3fca50e
* workflow runner 220953a
* wrong container name on fork 61bc05a
* wrong property name usage fa163c0
* wrong version 837fcae
* wrong version 56620cc
* wrong version 76af8ea
* wrong version 6049530
* wrong version b27f1c4
* wrong version fcbd340
* wrong version d9e1eba
* wrong version 3b7cb3d
* wrong version 5875831
* wrong version a90e425
* wrong version b12be97
* wrong version 045d0df
* wrong version bceabbe
* wrong version a0fbaf2
* wrong version bc6f00c
* wrong version dac87ef
* wrong version b7a5ede
* wrong version 3ed20ad
* yarn publish will ignore private a176556
* yarn runs in shell mode e77591a
* **yarn:** have to use an rc version of the plugin version 107768d


### Code Refactoring

* rename app to sidecar e304029


### Features

* add $container to fs inject e766ea3
* add $init function for easier usage 3f4fa32
* add Configuration getters and setters c5dad91
* add extends support df13246
* add ignore failure support f9929cf
* add lazy helper 5530746
* add middleware with priority handling 461c1a4
* add MiddlewareRunnerMiddleware d0e9aff
* add multistore 7d0f562
* add new app package ac81505
* add plugins mechanism c9aee01
* add runnerMiddleware as export ff4c95a
* add sidecar models to configuration 8389089
* add sidecars accessor c7792a7
* add stdin as param f7babf8
* add stdio middleware 1934e21
* add support for -- in CLI bf64441
* add support for breaking change parsing 3ad998a
* add support for jobs and schedules (as a SqlAgent) 11927b5
* add support for shell script failure ignore 4b1dcc1
* add support for untagged packages (yet) 6fbed9c
* added winston as a logger system 065bae0
* cli now supports stream results 155e7ba
* container can now act as middlewares 9484e39
* cron complete implementation 40ad48b
* embedded cron implementation in workflow 9c518f0
* enforce logger on buildCliContext dd636e1
* errors like are now true errors 954d0a8
* first pubsub commit 78b31e1
* improve middleware behaviour 89f0a24
* improve trigger defintiion 0eecae1
* improved implement command 8a98c02
* InteractError now using Binding for more possible usecases d9da85f
* jsonrpc disconnect support for server and proxies 5d7128c
* leverage suncalc c674f46
* moved to middleware approach 69d4ba5
* releasing sidecar eb0c959
* return ProxyConfiguration correct type when strongly typed eeaeee0
* support for commands through pm 3954c8a
* support for triggers 624ae86
* support node module when no ./ prefix ad871e3
* support normalize require config af16029
* switched from raw debug to logger from core efef2da
* update command behavior 2fb6184
* update configuration structure 8a395ff


### BREAKING CHANGES

* cli does not use winston as a logger anymore
* rename app to sidecar
* Configuration structure has been reshaped
* Configuration is now the default export
* relative path has to start with ./
* renamed enqueue command to start
* triggers first generic parameter is expected to be a args array
* All command processors require a command metadata.
* Containers use a composite middleware as processor
* Command renamed to SelfDefinedCommand (as it is not useful any more)
* Removed CommandNameProcessor concept



