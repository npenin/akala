#  (2022-11-09)


### Bug Fixes

* #10 6e164e7
* ac new gracefully ends 6647f80
* adapt to trigger new definition 8c2d136
* add exports to mongo 9c6d18a
* add extends adn dependencies on the container interface 4eedb66
* add logs before publish b1b15be
* add metadata when using ipc bb26b03
* add missing dependency 3d0b4df
* add missing package required property ba0c9df
* add missing proxy command to establish the bridge 9596ae9
* add pm processor when proxying 3dbeb5e
* add preAction before displaying usage 1316b59
* add recursive path creation 3f7ffa7
* add stdin to pm cli e07437a
* add transaction on dbset 81305d5
* added missing yaml dependency fa66dd1
* added remote pm socket support 074d6cf
* adding getOwnPropertyDescriptor to try to fix Object.assign d969335
* additional exports to provide better typing on dependent projects 099279c
* allow for any property on errors a529558
* any implementation fixed 3302fc0
* any on mongodb efa6f5d
* aritificial bump ae0e129
* artificial bump 60cc1c1
* assign id after insert ce42919
* automate implementation f76a995
* **automate:** stdio fc9a326
* avoids workflow leaks in context db4662a
* aws take from environment 357d1e7
* bad regex syntax da56074
* better file init 1087260
* better fork description d059b69
* better support for closed socket requests 9b38a60
* better support for compound keys a571109
* better support for metadata on closed remote containers 71ec84d
* better support for non-mapped sidecars ec502f8
* binding constructor 8294d0f
* bindings are less intrusive 3ef2783
* broken command processor 22afbc0
* bump dependent 5e89235
* bump dependents proper references f734b61
* cannot read undefined config object 0cc01be
* cleanup $disconnect registration on ready 4aaf9bd
* Cli implementation a6c7103
* cli parsing a28c8fe
* Cli wait fixed bac25a8
* client compilation 4815fd5
* client package 4f14fd3
* close outputs after generate 1d87b9d
* code clean up 11726cb
* command help with mandatory positional parameter f6002a8
* commands stay in order c3358c1
* CommandWithAffinityProcessor better detection 9ff4857
* compilation c7efdb0
* compilation e63e92e
* compilation after typescript 4.4 upgrade 2828ff9
* compilation issue 6734227
* compilation issue 4735be5
* connect fails when connect on mapping is undefined 16bdd27
* connect should failed if mapping is not found 4392197
* connect when connecting to pm 7494ae0
* consider pm container from options 56960e4
* **core:** interpolate miss return f6c87b1
* correct name assignment in fork 3deb98f
* count and any pipelines d38a6c6
* crash on parsing remote bcb17fe
* default version ignore to decline 01cb0f7
* define commands in sidecar c71d334
* dependencies d61f681
* discover cli usage 697946b
* discover implementation 3502bed
* display for pmSocket config info c3b908b
* docker build cfdaf4e
* ensure vanilla leverages generators 0aedf98
* enumerate on configuration objects a61e720
* error flow in composite middleware ec36174
* error serialization b3156ad
* error support in jsonrpc 82c2f34
* export AggregateErrors f4285e2
* export parseMetadata 8870389
* expose jsonrpc client id fd0f873
* fix automate runner ae9c216
* fix for commands ac new 166c9ee
* fix model registration and serialization 7236001
* fix pm startup 9f53b54
* fix the pubsub path 77cdd2f
* fix use on router 64f54b9
* force metadata command registration in remote container 840d6dd
* force socket processor on pm forks 0874275
* fork broken 8a998fc
* fork knows about pm metadata ef4ebdc
* fs discovery 0d34eea
* fs middleware after discovery changes d97fcca
* fs processor too catchy ccafa48
* generate command f04839c
* generate now keeps existing additional meta information (extends and dependencies) 9445157
* git push tags fc8e609
* handle bridges/proxy 69ae6f2
* handle default init 5482bcb
* handle empty orders in connectByPreference d35a80b
* handle non-specified pm socket option dfd5212
* hasOwnKeys now returns correct keys 76a062e
* health check reliability 98df0c9
* help now works where no socket is available 92ecda4
* honoring preferRemote 6fa76bc
* http to support custom injector 12a25f8
* implement own resolve to prevent resolving to main 07e3e69
* improve config get return type c40bcd5
* improve error logging 1b4ae07
* improve generate performance 88f6fee
* improve get-version 2f156a3
* improve http implementation 9e55419
* improve performance of metadata lookup 81cf56a
* improve remote sidecars defaults eef7b24
* improve start/stop doc e4be495
* improve support for extends f6622ee
* improve typing for errorMiddlewares 2b7047f
* improve usage with objects 91d1f50
* improved logging support 8c81e18
* improved ready command for remote containers ffd2a17
* improves command detection ff43e85
* infinite loop a5ae318
* initial pm setup 57f516a
* inject usage after move to full meta cmd 2cbda96
* injector inheritance fa3f724
* json model definition parsing 0770dab
* jsonrpc now breaks with standard jsonrpc error aa06e7c
* jsonrpc process on fork is passthrough e0482ec
* jsonrpc processor 497616c
* jsonrpc prperly send parameters 3f6c761
* jsonrpc trigger c95d27f
* limited git tag scope 7da0acb
* log format 403e66b
* log only enumerable props 3070ee3
* logger as non enumerable property 43fdcba
* logging namespace in jsonrpc 54214a8
* ls lists existing containers 3548afe
* made connect and fork more reliable and resilient 6c0c24f
* made cron as non spreadable 34d3f69
* mapAsync 64a258e
* metadata declaration on fork 9856bd0
* metadata does not rely on container name, but on key registration dd72fc3
* metadata lookup eaa12c1
* metadata lookup on start da0c4d7
* middleware copy/paste issue 69757ce
* **mongodb:** exclude generated field from being updated 1785a29
* move dependency from devdep 36139a4
* nested container processing 8997869
* new cc does not require destination to be a folder 51d1efd
* normalize path 58c9fcd
* optional parameter in connect 606b68b
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
* path to container schema 796e981
* path to container schema 86b982d
* performance refactor fix 4602906
* pm cli command usage a9ff0bf
* pm connect when manual forking ed7357e
* pm start a40a583
* preferRemote now also allows less preferred connection 28e50f2
* prevent breaks after disconnect 27df465
* prevent commands override 019f44f
* prevent duplicate containers/procesors on multiple calls per socket 42efc58
* prevent send on closed socket 85de789
* proper error serialization support 54a819d
* proper parameter binding for bump-dependents 7459c86
* proper positional option 4b10b61
* proper pubsub container 7978b92
* proper typing on store create 83caee7
* properly generate module from hierarchy dc28cb0
* provide proper variable to bumps dependents 82f8ddb
* proxy handling of properties update 47f6102
* publish new version f9f4db9
* push before tagging d980dd0
* ready command in pm works in both forks and remote cfb974f
* ready command works properly d9b10c2
* reduce silly logging 378e856
* regex broken c50b9b9
* regex exec is not iterable ca695eb
* reload metadata now call metadata with deep flag df33263
* reload-metadata definition fixed b807fc2
* remote conect 3f1db76
* remote container command registration f3b0728
* remote pm proxy 633b1b5
* remote ready failing dcc0fc1
* remove _trigger when sending over jsonrpc 9fac492
* remove confusing inject property on commands 9c45241
* remove container.ts in sidecar cc48571
* remove debugger statement 955f084
* remove duplicate binary operator 4930340
* remove duplicate foreach in publish 09d9fe5
* remove duplicated code in pm start command 3a91342
* remove failure masking 7c4ae85
* remove over proxyfying bc948b3
* remove over proxyfying 5da8a29
* remove stateless 2de9622
* remove triple-beam dependency c44bd2e
* remove winston dependency 3dcad68
* removed mock-require usage 99587ba
* removed mock-require usage 448f5be
* rename package 87b433b
* resolve legacy config lookup 5dceab9
* resolve path in new cc 58cb93c
* restore broken cli feature 6f563ef
* revert last change 1332114
* runnerMiddleware more type friendly 7bf1a25
* set log level for any namespace e1b1025
* sidecar builder 26673b1
* sidecar command definition 69f9b21
* sidecar init with single store config 5551424
* sidecar proxy calls bbc414f
* sidecar storage building 7285f5d
* sidecar store init 057f271
* sidecar to remote containers f795c56
* sidecar use pm when provided bf320f3
* silent disconnect failures 81d65aa
* sort excludes non workspace dependencies 0f33d15
* sort supports correct structure bf17f91
* sort workspaces before publish 01b675e
* sorted workspace is used as an output ab61117
* spread is not considering non enumerable properties 394438a
* start command 4f924c6
* start command args scope dd89375
* start updates commands 8dc01de
* stateless cli gateway working 17d705f
* stdin support 57f5ca7
* stdin support 23979ba
* stop generating loggers for numeric keys 75a1324
* **storage:** add nameInStorage support 5b863d1
* **storage:** any works properly 84f3b5e
* support for multiple keys 7de775a
* support for no workspace dependencies 0703731
* support for no workspace dependencies 9210550
* support normalize files in modules 4a34d95
* swap build dependencies f7d45dd
* switch processes state to object 5aa41a4
* trigger signature 28e77a1
* update all commands 8f54036
* update CLI definitions 7281b40
* update command definition 85c2891
* update commands cli definition 5b7f8f1
* update dependencies and regenerate metadata 0c83667
* update jsdoc 49357c6
* update lock and commands.json files eeae419
* update lock file 974b089
* update package publication to public 6d71bdc
* update ready command for remote containers 823810d
* update ready comment definition ebb8c05
* update reference to field 471f538
* update to commands  major version 180608a
* update to commands major version 0631f6e
* update to new commands major version 5e0bed5
* update to ws 8.0 ce769f9
* update workspace parameter binding 6b6b07b
* updateCommands now removes all commands before re-registering 7bc2f3d
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
* add bridge support 0e4d6a4
* add cli gateway af0fd60
* add Configuration getters and setters c5dad91
* add createIfEmpty flag on config load 2a47d59
* add crud package 8d71ea4
* add custom inject in jsonrpc processor 4fc1720
* add extends support df13246
* add ignore failure support f9929cf
* add jsdoc a43ab28
* add keepAttached for pm start 2bef670
* add lazy helper 5530746
* add middleware with priority handling 461c1a4
* add MiddlewareRunnerMiddleware d0e9aff
* add mongodb support b51751a
* add multistore 7d0f562
* add name fs discovery 27fe77d
* add new app package ac81505
* add new module command to build a folder structure 2cc7008
* add openapi generation d1f7bd3
* add plugins mechanism c9aee01
* add position information on positional parameters c8cb21b
* add possibility for custom file format 0360c2f
* add possibility to parse filename 335cc97
* add reload-metadata on pm 654247f
* add rest args on cli e6966a9
* add runnerMiddleware as export ff4c95a
* add sidecar models to configuration 8389089
* add sidecars accessor c7792a7
* add stateless initial support 8605db0
* add stdin as param f7babf8
* add stdio middleware 1934e21
* add support for -- in CLI bf64441
* add support for breaking change parsing 3ad998a
* add support for jobs and schedules (as a SqlAgent) 11927b5
* add support for shell script failure ignore 4b1dcc1
* add support for untagged packages (yet) 6fbed9c
* add where signature for more flexibility a8d0f14
* added winston as a logger system 065bae0
* cli now supports stream results 155e7ba
* container can now act as middlewares 9484e39
* cron complete implementation 40ad48b
* embedded cron implementation in workflow 9c518f0
* enable cli help/documentation c141969
* enforce logger on buildCliContext dd636e1
* error message is retrieved if wait is specified e93f204
* errors like are now true errors 954d0a8
* first pubsub commit 78b31e1
* improve middleware behaviour 89f0a24
* improve trigger defintiion 0eecae1
* improved implement command 8a98c02
* InteractError now using Binding for more possible usecases d9da85f
* jsonrpc disconnect support for server and proxies 5d7128c
* leverage suncalc c674f46
* move to serve with AbortSignal 53d811d
* moved to middleware approach 69d4ba5
* new aws-lambda module 97806aa
* releasing sidecar eb0c959
* removing problematic extend function 5daa1db
* return ProxyConfiguration correct type when strongly typed eeaeee0
* sidecar now fallback to proxy on pm 4ebe153
* support for commands through pm 3954c8a
* support for nested object mapping affb3e2
* support for triggers 624ae86
* support node module when no ./ prefix ad871e3
* support normalize require config af16029
* support oneway messages by throwing undefined 6a18260
* switched from raw debug to logger from core efef2da
* update command behavior 2fb6184
* update configuration structure 8a395ff


### BREAKING CHANGES

* inject property does not exist on commands anymore
* File.from renamed to File.fromJson
* extend helper no more is
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



