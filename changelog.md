#  (2024-08-18)


* fix:base64 helpers generating empty data 0ed3fad


### Bug Fixes

* #10 6e164e7
* #988 3b5ade8
* ac new gracefully ends 6647f80
* adapt to trigger new definition 8c2d136
* add akala as export ff84fdc
* add browser export condition 6113968
* add exports to mongo 9c6d18a
* add extends adn dependencies on the container interface 4eedb66
* add generate script 5fd0dff
* add logs 39b7a0b
* add logs before publish b1b15be
* add metadata when using ipc bb26b03
* add missing dependency 3d0b4df
* add missing package required property ba0c9df
* add missing proxy command to establish the bridge 9596ae9
* add more files to the browser field 21d7d48
* add more logs 02b939a
* add node as an export condition 4aa41a8
* add pm processor when proxying 3dbeb5e
* add preAction before displaying usage 1316b59
* add processCommand as exported function 6f3e8d6
* add recursive path creation 3f7ffa7
* add remote type (for async ops) edd9b3b
* add salt on User model 51b2f11
* add source map flag when running cli f1d4c85
* add stdin to pm cli e07437a
* add support for constants 4fa2c21
* add support for device authorization 3aff229
* add support for more types (doc and style) 16c929d
* add support for ParsedObject 0480efd
* add support for soft kill when remote connected 002abdb
* add transaction on dbset 81305d5
* add vite/test as a package 7eeaccc
* add xe settings to force logging 9ccf9fd
* add-script and yamlloader 7dd85c7
* added missing yaml dependency fa66dd1
* added remote pm socket support 074d6cf
* adding getOwnPropertyDescriptor to try to fix Object.assign d969335
* additional exports to provide better typing on dependent projects 099279c
* akala cli 36766df
* akala cli initrr handling 0f028ce
* akala init support 528791e
* akala init support 246f796
* allow akala plugin to be used 7d1b06b
* allow all registered containers to be served d12f617
* allow for any property on errors a529558
* allow more general pages e3183ad
* allow non existent form elements f66a4f9
* allow pm to start 8b93d56
* allow pm yto start d498d2b
* allow style setting 05b1266
* allow using jsonrpc trigger in browser 49a8733
* angular type def after dep upgrade b44e1b5
* angular type def after dep upgrade fc4698f
* any implementation fixed 3302fc0
* any on mongodb efa6f5d
* aritificial bump ae0e129
* artificial bump 71246a7
* artificial bump a0d4ed3
* artificial bump 41ca81d
* artificial bump 701d7bf
* artificial bump 11de458
* artificial bump b1e6a5d
* artificial bump ae7848d
* artificial bump e5e8cf5
* artificial bump 59763e7
* artificial bump 60cc1c1
* artificially bump protocol-parser eee3cb7
* assign id after insert ce42919
* async CLI init 484a0b4
* async router 6bd9cf3
* auth handlers behvior 523c6fa
* automate after upgrade af5b0d5
* automate after upgrade 02e0707
* automate after upgrade a0f3b80
* automate after upgrade 4235afe
* automate fixed d357937
* automate implementation f76a995
* **automate:** stdio fc9a326
* avoids workflow leaks in context db4662a
* aws take from environment 357d1e7
* **aws:** fix trigger handler 7c6e57f
* bad regex syntax da56074
* better file init 1087260
* better fork description d059b69
* better stateless detection d236456
* better support for closed socket requests 9b38a60
* better support for compound keys a571109
* better support for metadata on closed remote containers 71ec84d
* better support for non-mapped sidecars ec502f8
* better support for processor eb55667
* binding constructor 8294d0f
* Binding new implementation b287d4c
* bindings are less intrusive 3ef2783
* broken command processor 22afbc0
* browser exports 8888cc6
* browser implementation (remove implicit reference to node) ef786d1
* build fix after jsonrpc breaking change b807513
* build issue after update to @akala/core fc8465c
* build issue after update to @akala/core 1cd037a
* build with angular 17 be60411
* build with angular 17 9d3fcb6
* buildsetter e6b5c6e
* bump dependent 5e89235
* bump dependents proper references f734b61
* bump lambda version 41d34c2
* bump version 4a791be
* bump version 0457468
* bump version b88263c
* bump version because of previous workflow failures 5ce650e
* bump version to fix version order 5ec7806
* cannot read undefined config object 0cc01be
* cjs build dcd7057
* cjs build d3e9a4e
* cleanup $disconnect registration on ready 4aaf9bd
* cli args parsing 6db1a80
* cli crashing when succeeding 4e7d4bb
* Cli implementation a6c7103
* cli options when no options is provided b3d131c
* cli parsing 0736bf7
* cli parsing a28c8fe
* Cli wait fixed bac25a8
* client compilation 4815fd5
* client outlet commands management 5533e79
* client package 4f14fd3
* client prepack 6bcd1b9
* **client:** simplify inheritance chain 91573ab
* close outputs after generate 1d87b9d
* code clean up 11726cb
* command config resolution 4df15f2
* command configuration path resolution 5bf471e
* command help with mandatory positional parameter f6002a8
* commands default path 0bb1723
* commands discovery when using delegate 938fad2
* commands stay in order c3358c1
* CommandWithAffinityProcessor better detection 9ff4857
* compilation c760ee3
* compilation c7efdb0
* compilation e63e92e
* compilation after typescript 4.4 upgrade 2828ff9
* compilation issue 6734227
* compilation issue 4735be5
* composers are now returning disposables but are not async anymore 87dfcce
* config file option name 3068006
* config file save fallback f1a3db7
* config key export 15d144d
* config secret read cfe4d5e
* connect fails when connect on mapping is undefined 16bdd27
* connect should failed if mapping is not found 4392197
* connect when connecting to pm 7494ae0
* connectByPreference not working with sockets bc8a5e1
* consider pm container from options 56960e4
* copy paste issue 45cc227
* **core:** interpolate miss return f6c87b1
* correct name assignment in fork 3deb98f
* count and any pipelines d38a6c6
* crash on parsing remote bcb17fe
* CVE-2022-25881 #988 11a4e2a
* data-bind with object 2f089e5
* default version ignore to decline 01cb0f7
* define commands in sidecar c71d334
* delete config property 3a15cc7
* dependencies d61f681
* direct invocation if init-akala 3f23bad
* discover cli usage 697946b
* discover implementation 3502bed
* display for pmSocket config info c3b908b
* distinct implementation fix 9381907
* do not overwrite option when coming from usage 23d206e
* docker build cfdaf4e
* docker files to not have local pipe fba3777
* double bump 04d40b6
* downgrade all packages to support both cjs and mjs 991c494
* downgrade all packages to support both cjs and mjs 56f6136
* downgrade all packages to support both cjs and mjs 5c64966
* eachAsync when pushing new items in the process b6e9573
* edge case cli implementation 9b91c43
* edge case with distinct 6cfd43b
* eliminate the need for json import 5d5af48
* embrace esm even more 3e7d10a
* embrace esm even more b3b8e9d
* enable jsonrpc on clients 0adf62b
* encode secrets to base64 97c3145
* ensure vanilla leverages generators 0aedf98
* enumerate on configuration objects a61e720
* error flow in composite middleware ec36174
* error serialization b3156ad
* error support in jsonrpc 82c2f34
* evaluator as function with constants 4822874
* exclude urls from normalization a4915c9
* export AggregateErrors f4285e2
* export Configurations type to allow augmentation e2851fc
* export parseMetadata 8870389
* export proper webcomponent decorator 37be990
* expose jsonrpc client id fd0f873
* fix after config upgrade 90625ec
* fix automate runner ae9c216
* fix distinct 2430a6c
* fix for akala init 8678bf3
* fix for commands ac new 166c9ee
* fix generate and tsconfig files b44bd4c
* fix keepOrder on distinct 68b62b3
* fix model registration and serialization 7236001
* fix pm startup 9f53b54
* fix semantic releases workflow 290d342
* fix skip typings fdb4e7d
* fix the pubsub path 77cdd2f
* fix use on router 64f54b9
* fix wrong update on import 2bd50cc
* fixing config plugins loading ab30ee8
* force metadata command registration in remote container 840d6dd
* force socket processor on pm forks 0874275
* fork broken 8a998fc
* fork knows about pm metadata ef4ebdc
* form serialization 69c521c
* form serialization d45c28a
* fs discovery 0d34eea
* fs middleware after discovery changes d97fcca
* fs processor too catchy ccafa48
* generate command f04839c
* generate keeps all extra fields bcda761
* generate now keeps existing additional meta information (extends and dependencies) 9445157
* get hash has conterpart verify since the switch to sign 33c251e
* get rid of last json import e4e402a
* git push tags fc8e609
* git-semver-tags after upgrade eca26a2
* gives scope as a parameter and not the binding scope 964080f
* handle bridges/proxy 69ae6f2
* handle case when middleware failed but continues a623d8e
* handle default init 5482bcb
* handle direct invokes f4a524e
* handle edge case on cli usage discovery 2f01e20
* handle empty orders in connectByPreference d35a80b
* handle non provided description in doc a3685e6
* handle non-specified pm socket option dfd5212
* handle normalize on rest parameters 2a0b6a4
* handle result properly 373a7a9
* handle unary operator in evaluator a9c10e3
* hasListener signature 896a1b9
* hasOwnKeys now returns correct keys 76a062e
* health check reliability 98df0c9
* help now works where no socket is available 92ecda4
* helps compile under angular 28383e6
* helps compile under angular 330ae98
* honoring preferRemote 6fa76bc
* hotreplace supports watch dad4897
* http to support custom injector 12a25f8
* ignore commands without source dfce88b
* implement config unwrap 2998a9c
* implement externalized pages f649a86
* implement own resolve to prevent resolving to main 07e3e69
* implement real world Page class 5915665
* imported event class from node d8bbc36
* impove popover reliability 6eceadc
* improve $serve input consistency 02c151c
* improve browser usage 05dd7ea
* improve call expression support 82c92b4
* improve cli trigger performances ad23d0d
* improve compiler (giving up for now) f23e3f6
* improve config get return type c40bcd5
* improve config typing d14ab8b
* improve consistency of base64 helpers ca29f9d
* improve error logging 1b4ae07
* improve generate performance 88f6fee
* improve get-version 2f156a3
* improve http implementation 9e55419
* improve i18n to provide html in case we are replacing innerText 7d1007c
* improve logging when no version is found 84ce4b1
* improve module resolution af07cf8
* improve openapi support and json schema interpretation 26536bc
* improve parsing performance and correctness cffc750
* improve path normalization 928d77b
* improve performance of metadata lookup 81cf56a
* improve reliability on commands 9e25e0b
* improve remote sidecars defaults eef7b24
* improve session management a162477
* improve session management based on socket lifetime 545bbf2
* improve spanasync resilience 7c1b792
* improve start reliability 7e059a0
* improve start/stop doc e4be495
* improve support for extends f6622ee
* improve type support in metadata generation 22c4a00
* improve typing after commands update f9d323b
* improve typing after commands update 6ef2e78
* improve typing consistency 7b40797
* improve typing for errorMiddlewares 2b7047f
* improve usage in browser 8c69317
* improve usage in browser be570f3
* improve usage with objects 91d1f50
* improve vite test case acb17fd
* improve windows support f724070
* improved logging support 8c81e18
* improved ready command for remote containers ffd2a17
* improves command detection ff43e85
* infinite loop a5ae318
* infinite loop when file does not exist a909c09
* init leverage ESM 557af46
* initial pm setup 57f516a
* inject usage after move to full meta cmd 2cbda96
* injector inheritance fa3f724
* injector logging cb345e7
* injector self registration 5bf320a
* interact error support 769abbe
* interact errors happen on program and not root 363c943
* interacterror support 8d37bc7
* json model definition parsing 0770dab
* json rpc handle always remaps args 246a2a2
* json schema internal references 409c98d
* jsonrpc now breaks with standard jsonrpc error aa06e7c
* jsonrpc process on fork is passthrough e0482ec
* jsonrpc processor 497616c
* jsonrpc prperly send parameters 3f6c761
* jsonrpc trigger c95d27f
* jsonrpc will adapt based on the trigger ccff55b
* lambda indexes not respected 481cdc5
* lambda processor 8aac501
* lambda processor 4636a42
* lambda processor 3d01ca7
* lambda processor generate proper call 63b997b
* length const a5fab1c
* limited git tag scope 7da0acb
* log format 403e66b
* log only enumerable props 3070ee3
* logger as non enumerable property 43fdcba
* logging namespace in jsonrpc 54214a8
* login result 7042634
* lookup on windows 0108f6b
* ls lists existing containers 3548afe
* made connect and fork more reliable and resilient 6c0c24f
* made cron as non spreadable 34d3f69
* main container is now really acting as a proxy a015d3f
* make new as sync again and create newAsync 6afff9d
* make page and Scope available to the wild a613874
* make peer dependency as mandatory fd097ef
* make pm work with connect args ec5e1fc
* many fixes in auth c1631c9
* mapAsync 64a258e
* metadata declaration on fork 9856bd0
* metadata definition when bundled by vite af23a0c
* metadata definition when bundled by vite 71c5337
* metadata does not rely on container name, but on key registration dd72fc3
* metadata lookup eaa12c1
* metadata lookup on start da0c4d7
* middleware copy/paste issue 69757ce
* missing import assertion e29c18a
* mocha test command 540a441
* model definition build 01f1024
* **mongodb:** exclude generated field from being updated 1785a29
* move aws-sdk to optional peer dependency 6e177a5
* move cli to esm 3f28f3a
* move dependency from devdep 36139a4
* move from abortsignal to abortcontroller c2849a6
* move from require to import to support esm 6ee5ce4
* move socket name as part of socket options 97dd422
* move to ESM 6ef0335
* moved commands to internal event emitter bea79a2
* multiple readline calls failure + removing line break f3ab1be
* nested container processing 8997869
* nested injector resolution f7dff91
* new cc does not require destination to be a folder 51d1efd
* new considered as part of the folder name a37810f
* no realy change but it works 2eb003e
* normalization and edge cases in cli 874a97f
* normalize behavior with relativeTo 30021e6
* normalize causes issue if not URL 4879fb0
* normalize on windows e3b9cd1
* normalize on windows 2c31c9f
* normalize path 58c9fcd
* normalize require properly imports packages ea8e772
* normalize support for custom conditions 6d876fd
* normalized modules to work in esm and cjs 88ffcca
* normalizing on usage options a3dd875
* observable builders support Bindings ec41f39
* omit client package for now 6f16b17
* optional parameter in connect 606b68b
* output formatting f747eff
* output name from inner semantic-releases script 52382c6
* overload selection e8bdeef
* package build dependencies 3f14f37
* package name tagging cd9de24
* package.json to reduce vulnerabilities 2a1cae1
* packages/docker/Dockerfile to reduce vulnerabilities 7d43d77
* packages/docker/Dockerfile-arm to reduce vulnerabilities 7fd23ac
* packages/docker/Dockerfile-arm to reduce vulnerabilities 93d2550
* packages/docker/slim.dockerfile to reduce vulnerabilities e52f865
* packages/docker/slim.dockerfile to reduce vulnerabilities 3aeee37
* parser more reliable 5c92e5a
* parser with parameters e2d6149
* path can now be retrieved using property 2d3125e
* path to bins 11cfa04
* path to command metadata 4fc8111
* path to container schema 796e981
* path to container schema 86b982d
* path to handler 8ee4c94
* performance refactor fix 4602906
* piped bindings 196d01d
* pm cli command usage a9ff0bf
* pm connect when manual forking ed7357e
* pm fork 52b9ba7
* pm start a40a583
* pm start command c0e613c
* preferRemote now also allows less preferred connection 28e50f2
* prevent breaks after disconnect 27df465
* prevent commands override 019f44f
* prevent duplicate containers/procesors on multiple calls per socket 42efc58
* prevent inifinite loop when no matching option can be found 3912b94
* prevent send on closed socket 85de789
* proper binary execution 7a3bfbc
* proper error serialization support 54a819d
* proper exit code on help ad8e0ad
* proper exit code on help c13524e
* proper lambda error handling df396e4
* proper parameter binding for bump-dependents 7459c86
* proper positional option 4b10b61
* proper pubsub container 7978b92
* proper stdio support 17464ae
* proper typing on store create 83caee7
* proper use of normalize for plugins 130102e
* properly generate module from hierarchy dc28cb0
* propery switch parser 04da73e
* provide proper variable to bumps dependents 82f8ddb
* proxy handling of properties update 47f6102
* publish new version f9f4db9
* publish workflow 63be9de
* pubsub import assert b4584a8
* push before tagging d980dd0
* readline implementation ab16fa7
* ready command in pm works in both forks and remote cfb974f
* ready command works properly d9b10c2
* record event on aws 4fd90b3
* recursive commands named according to folder 5609fbc
* redirect also allows relative url 74c6118
* reduce silly logging 378e856
* refactor after core helpers removal 2224c96
* reference to jsonrpc on browser condition 4af11a3
* regex broken c50b9b9
* regex exec is not iterable ca695eb
* relative to config file cli imports 2257c34
* reliability issue on sonarcloud 0702240
* reliability issue on sonarcloud 206d11a
* reliability issue on sonarcloud + few improvements 6fe65a6
* reload metadata now call metadata with deep flag df33263
* reload-metadata definition fixed b807fc2
* remote conect 3f1db76
* remote container command registration f3b0728
* remote pm proxy 633b1b5
* remote ready failing dcc0fc1
* remove _trigger when sending over jsonrpc 9fac492
* remove assert dependency 2a90cb2
* remove asset command depending on webpack 9c81e0a
* remove compiler from config 5d3772f
* remove confusing inject property on commands 9c45241
* remove container.ts in sidecar cc48571
* remove debugger statement 955f084
* remove dependency to orchestrator 6892977
* remove duplicate binary operator 4930340
* remove duplicate foreach in publish 09d9fe5
* remove duplicated code in pm start command 3a91342
* remove extra logging 44879ac
* remove extra logging 7312458
* remove extra logging fee977b
* remove extra trace 552ccef
* remove extra ts declaration 0283564
* remove failure masking 7c4ae85
* remove hrtime dependency f85fb22
* remove http imports to support treeshaking for browsers a0d87cb
* remove http routing f9f43de
* remove implicit node dependency 603f890
* remove implicit node dependency efb3674
* remove import of removed dependency 8a11cef
* remove jsonrpc from browser field b45e8cb
* remove legacy controls d7082d2
* remove node:crypto dependency 3f659b0
* remove over proxyfying bc948b3
* remove over proxyfying 5da8a29
* remove require call 6f09130
* remove stateless 2de9622
* remove stdio logging 6600099
* remove stream dependency when used in browser d3313b5
* remove triggers from browser 85ce5a8
* remove triple-beam dependency c44bd2e
* remove util dependency 4c90028
* remove webpack dependencies f51db45
* remove webpack dependency ab0e87c
* remove winston dependency 3dcad68
* removed mock-require usage 99587ba
* removed mock-require usage 448f5be
* rename aws-sdk f4dfa32
* rename package 87b433b
* rename to TeardownManager deb360c
* require dependent packages broken 66a3877
* reset minor and patch number depending on the bump 1a1a0da
* resolve file URLs before trying to read stats 2538a4e
* resolve legacy config lookup 5dceab9
* resolve path in new cc 58cb93c
* restore broken cli feature 6f563ef
* revert last change 1332114
* revert some changes to fix build 77b19cf
* run 3f574ee
* runnerMiddleware more type friendly 7bf1a25
* runtime bug 53caad3
* schema typing cff3813
* secret key transfer to nested config 77702ce
* serve SHOULD return after the server is started 7e21fa4
* set connect configuration 5b633a8
* set log level for any namespace e1b1025
* shebang on akala CLI e893277
* sidecar builder 26673b1
* sidecar command definition 69f9b21
* sidecar init with single store config 5551424
* sidecar proxy calls bbc414f
* sidecar storage building 7285f5d
* sidecar store init 057f271
* sidecar to remote containers f795c56
* sidecar use pm when provided bf320f3
* silent disconnect failures 81d65aa
* simplify and fix jsonrpc invoke 24ce2dc
* simplify http trigger 2a65ce2
* simplify url handler 09b9261
* smaller secret footprint b41b636
* sort excludes non workspace dependencies 0f33d15
* sort supports correct structure bf17f91
* sort workspaces before publish 01b675e
* sorted workspace is used as an output ab61117
* split start and start-self 8ebb5f7
* spread is not considering non enumerable properties 394438a
* start command 4f924c6
* start command args scope dd89375
* start updates commands 8dc01de
* stateless cli gateway working 17d705f
* stdin support 57f5ca7
* stdin support 23979ba
* stop assuming scope delimiter e86ae02
* stop assuming scope delimiter c7f2e24
* stop generating loggers for numeric keys 75a1324
* storage 611386c
* **storage:** add nameInStorage support 5b863d1
* **storage:** any works properly 84f3b5e
* storing bumps 2d271f7
* support for async imports in cli plugins c5687da
* support for multiple keys 7de775a
* support for nested commands 564e4e7
* support for no workspace dependencies 0703731
* support for no workspace dependencies 9210550
* support improved for esm 2a0a627
* support non object events d3264ad
* support non object events ae9476a
* support normalize files in modules 4a34d95
* support outlet cleanup 0e1d206
* support when @akala/config is not loaded 511f427
* swap build dependencies f7d45dd
* switch from xml2js to fast-xml-parser 0abd31b
* switch processes state to object 5aa41a4
* switch to own base64 to prevent buffer dependencies 67ea439
* take device id when provided 25f6389
* ternary expression and op ce4abe8
* testing the backtick replacement 14bd2fb
* tree shaking issue c239808
* trigger signature 28e77a1
* try to add hmr disconnect support 36a99d9
* trying to add promise to solve "handled" lambda 62bad72
* trying to fix docker files 2b8ce52
* trying to make Page as PageWithOutlet b642699
* typing 8851307
* unliased interact errors a16496a
* unparse options eed10c8
* update after base64 update 3e2c264
* update after base64 update d581037
* update after base64 update 24bb306
* update after cli option update 06e3cb5
* update after conventional breaking changes 06481aa
* update after core and storage upgrade 842e780
* update after core breaking change 6fd28e8
* update after core breaking change 4291683
* update after core breaking change a0ef044
* update after core breaking change d8b299b
* update after core breaking change d0849e5
* update after core breaking change d7860ee
* update after core changes cd2512a
* update after core changes 66a1ca7
* update after core changes 576dc73
* update after core upgrade 089678e
* update after evaluator is not returning promise 8781838
* update after event emitter upgrade in code 65ef31f
* update after storage upgrade f54ef18
* update after storage upgrade f34e36f
* update after the breaking change in conventional changelog 12078eb
* update after the breaking change in conventional changelog 76ebf7f
* update after the breaking change in conventional changelog d6ed3d0
* update all commands 8f54036
* update CLI definitions 7281b40
* update command definition 85c2891
* update command definitions 594a29a
* update command with affinity priority 03f05f2
* update commands cli definition 5b7f8f1
* update commands file 6365b5d
* update dependencies and regenerate metadata 0c83667
* update jsdoc 49357c6
* update lock and commands.json files eeae419
* update lock file 3576076
* update lock file f142c2b
* update lock file 974b089
* update lockfile 5eda712
* update metadata 884c851
* update package definitions 300a978
* update package publication to public 6d71bdc
* update ready command for remote containers 823810d
* update ready comment definition ebb8c05
* update reference to field 471f538
* update source-map-support imports a8d5065
* update test script f730fdf
* update to commands  major version 180608a
* update to commands major version 0631f6e
* update to latest @akala/core 69118f6
* update to latest pages types 48e1683
* update to match client updates + testing http auth with api key 71b2bd1
* update to new commands major version 5e0bed5
* update to node 22 b16b801
* update to ws 8.0 ce769f9
* update vite test package d82f7f4
* update workspace parameter binding 6b6b07b
* updateCommands now removes all commands before re-registering 7bc2f3d
* upgrade to latest commands 2801d27
* use config from akala when starting pm 51f3898
* use existing base64 encoder ebd748e
* use signal to close pm connection 02bc3d5
* use static import instead of dynamic import 0ba9fce
* variable leak adef56b
* variable renaming f825597
* vite implementation 34cf2a9
* webcomponent implementation 2fe5b2e
* windows resolution 57d6d98
* workflow output 3fca50e
* workflow parallelism 2d6a442
* workflow runner 220953a
* wrong container name on fork 61bc05a
* wrong error handling in options cdf92b0
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
* yarn reshuffle deps 8a982e5
* yarn runs in shell mode e77591a
* **yarn:** have to use an rc version of the plugin version 107768d


### Code Refactoring

* remove next in async each/map/grep aaec2ab
* rename app to sidecar e304029


### Features

* add $container to fs inject e766ea3
* add $init function for easier usage 3f4fa32
* add $init-akala as an init command when running any command in a given container bdfbef5
* add abort signal on CliContext 7e11e23
* add auth trigger support f99de4c
* add authentication support 0159173
* add authentication support f7b37aa
* add autotmate as an akala plugin d8ebbdc
* add base64 converter to be runtime agnostic 990891d
* add bin in webdav 563472b
* add bridge support 0e4d6a4
* add calls support + fix stackoverfow d89fecf
* add cli gateway af0fd60
* add client early sdk 4f77893
* add close on click outside support on popover 43875c4
* add Configuration getters and setters c5dad91
* add connection id on jsonrpc processors fe38734
* add Control base class d20a03b
* add createIfEmpty flag on config load 2a47d59
* add crud package 8d71ea4
* add cssclasscomposer 7f581e4
* add curry variant to improve typing 9dc4325
* add custom inject in jsonrpc processor 4fc1720
* add disabled option on fs 14bb609
* add discover command for client 76f8cea
* add distinct helpers dda8544
* add env to get command name b744175
* add env to injectables 59915ab
* add event and i18n composers 2b98ed5
* add extends support df13246
* add form-urlencoded as a content type 6bcb79e
* add FormComposer and other helpers to simplify rampup 95887d2
* add generate ts from schema command 9cefb0c
* add generate-schema d920d1b
* add get to get events on event emitter df6bbbf
* add HttpStatusCodes 7fc22e5
* add ignore failure support f9929cf
* add init command 4ca928f
* add interact error from pm 026bbbb
* add jsdoc a43ab28
* add json formatter b8613d5
* add JWT 6e5d4ce
* add JWT dependency 4155ac6
* add JWT serialization/parsing 066668d
* add keepAttached for pm start 2bef670
* add lazy helper 5530746
* add LogProcessor 5216528
* add middleware with priority handling 461c1a4
* add MiddlewareRunnerMiddleware d0e9aff
* add mongodb support b51751a
* add more type exports 5266053
* add multistore 7d0f562
* add name fs discovery 27fe77d
* add name variations 166ab73
* add new app package ac81505
* add new module command to build a folder structure 2cc7008
* add observables (to eventually replace Binding) fccb33f
* add openapi generation d1f7bd3
* add optionGetter instead of optionName on composers adfb1e0
* add options to generate bae28ed
* add other expression visitors 99134c7
* add parent injector as container constructor parameter ab40186
* add plugins mechanism c9aee01
* add popover component ef2e38f
* add position information on positional parameters c8cb21b
* add possibility for custom file format 0360c2f
* add possibility to parse filename 335cc97
* add possibility to serve all containers at once 2be5987
* add preparsed buffer f585393
* add preRender event c58ca99
* add processing with lambda 650c4f5
* add protocol handlers dc6c1b6
* add protocol parser from domojs 9c50b37
* add pubsub trigger c98ffd1
* add QuestionDot operator (optional member access) a9542d0
* add reload-metadata on pm 654247f
* add required attribute on auth config f131e8c
* add rest args on cli e6966a9
* add runnerMiddleware as export ff4c95a
* add schema validation e1d2b41
* add scope injection token c79c09c
* add secret support in configuration 9a511f3
* add serve cli dc82fc9
* add sidecar models to configuration 8389089
* add sidecars accessor c7792a7
* add sourmap optional support f6b0275
* add stateless initial support 8605db0
* add stdin as param f7babf8
* add stdio middleware 1934e21
* add support config property deletion f44cfab
* add support for -- in CLI bf64441
* add support for breaking change parsing 3ad998a
* add support for dashes for command args 26955b9
* add support for external document (like iframes) 0d39ae4
* add support for injectmap 8ac6fb1
* add support for jobs and schedules (as a SqlAgent) 11927b5
* add support for many cases e545e2e
* add support for mjs and cjs files discovery dc3c17a
* add support for render functions 7d24d00
* add support for shell script failure ignore 4b1dcc1
* add support for ternary expressions ae26a11
* add support for ternary expressions 203a380
* add support for untagged packages (yet) 6fbed9c
* add sync routers f22b631
* add synchronous middleware 75141d3
* add tcp remote protocol handler 9d5dbfb
* add ternary expression b7fab70
* add the possibility to load programs with file urls dbbc1a6
* add translation support on documentation 168cbbf
* add typed variant fcdd604
* add url handler 623cb3b
* add vite module 1912fc7
* add web component decorator 0083280
* add where signature for more flexibility a8d0f14
* add whoami 9fd5aaa
* add windows service install support 3b9af3a
* added winston as a logger system 065bae0
* allow both jsonrpc and jsonrpcbrowser to co-exist bfde876
* allow defined events retrieval 5e0ac45
* allow disable/enabe user f843eb5
* allow enabling logger on namespace 9c445a4
* allow for relative path in cli bcccff1
* allow model definition to be passed in store create a06f2b4
* allow more string "errors" in router 1a9608f
* allow options on json-rpc-ws (like protocols) 6682a53
* allow options on json-rpc-ws (like protocols) 013046d
* allow reversible formatters f66c2bc
* allow specifying array for nested resolutions a1a21b4
* allow state in events 925d85b
* allow to keepOrder in distinct e6eb507
* allow translator to receive current values 905c5a7
* allow URLs as parameter in Http client 3231b9d
* auth validator now expects a commandprocessor handle like 2f1b907
* cli now supports stream results 155e7ba
* **client:** allow relative URL building from current URL aed194f
* considered as v1.0 3ed2008
* container can now act as middlewares 9484e39
* continued daemonize impl 82694f1
* create an http client processor from url e44d9fd
* cron complete implementation 40ad48b
* deprecate CJS implemtations for many packages 4d927a9
* deprecate CJS implemtations for many packages bde4b1c
* embedded cron implementation in workflow 9c518f0
* enable cli help/documentation c141969
* enable env on cli containers 88cbdbe
* enforce logger on buildCliContext dd636e1
* error message is retrieved if wait is specified e93f204
* errors like are now true errors 954d0a8
* export event emitter 750ac11
* export generator helper functions ac613f5
* export processor 528d2ad
* export spanAsync 93a722d
* expose observables and removes legacy binding 4fdb791
* first auth implementation in http client a36d32f
* first pubsub commit 78b31e1
* first try with some somponents 293f0dd
* fix config secret key load in akala cli 5f74332
* fix sidecar f1705d6
* handle cookies on redirect fb6e2ab
* handle readable streams f9ab4d8
* handle readable streams cf632e3
* have both CJS and ESM at once cecd11a
* implement auth c98e0f9
* implement serve in cli 1decbb4
* implement support typings 4c5d3e4
* implements new controls 9a16e1b
* improve event-emitter typing 7a72d14
* improve metadata generation with typing from schema 55f4242
* improve middleware behaviour 89f0a24
* improve open api support c99299c
* improve trigger defintiion 0eecae1
* improved implement command 8a98c02
* InteractError now using Binding for more possible usecases d9da85f
* Interpolator returns expressions ce21e5c
* jsonrpc disconnect support for server and proxies 5d7128c
* leverage latest upgrades 4bba7c4
* leverage suncalc c674f46
* login workflow works 4921c7d
* make expression parsing sync cbbec58
* make format a middleware 8e8ec9a
* move Deferred and Serializable(Object) to core 6507e1d
* move ErrorWithStatus to core f3de950
* move to ESM c7365f4
* move to serve with AbortSignal 53d811d
* moved to middleware approach 69d4ba5
* new aws-lambda module 97806aa
* new aws-sdk package e7c6217
* open api generator considers schema if available b7736d6
* options usage now replaces parameters in backticks b4ab80b
* part watches for data changes 32cdc0b
* provide real Date formatter afb969e
* re-enable client publish 87a0f62
* re-implement Binding from scratch e84fa76
* re-publish client 25bff4a
* releasing sidecar eb0c959
* remove asynchronicity in controls 7ba4b4c
* remove circular dependency between controls and template + export template cache to help having hot reload b71ba32
* remove parser and use the core parser 5bd3d9d
* removing problematic extend function 5daa1db
* rename part to outlet 51dc808
* return ProxyConfiguration correct type when strongly typed eeaeee0
* sidecar does not crash if there is no pm detected fc1d20e
* sidecar now fallback to proxy on pm 4ebe153
* simplify event emitter typing 3496d5e
* split injector implementation a07efc0
* start implementation of page builder 45f08c0
* start testing nocode (giving up for now) d9cc762
* started webdav module c663dba
* support for commands through pm 3954c8a
* support for config file path with needle 1243d91
* support for nested object mapping affb3e2
* support for potential callback 54c6554
* support for triggers 624ae86
* support node module when no ./ prefix ad871e3
* support normalize require config af16029
* support oneway messages by throwing undefined 6a18260
* switch from TypedArray to ArrayBuffer ce32b68
* switch from yarn version to manual bump 56c3e0a
* switch to custom event emitter b20b059
* switch to ESM decorators 19762ba
* switch to URL handler for processor registration 341872b
* switched from raw debug to logger from core efef2da
* update command behavior 2fb6184
* update configuration structure 8a395ff
* update ready to event instead of promise 161b347
* update to ESM 87800a0
* update to outlets 0ead02c
* upgrade to verifyHash and getHash 779d7ec
* upgrade with latest client version a82b2f9
* use existing dispose symbol and template needs disposable 0af55b0


### BREAKING CHANGES

* CJS is no more supported
* CJS is no more supported
* Schema configuration uses the standard $defs to define definitions
* call expression now has a typedexpression as method and not a constant anymore
* SubscriptionManager renamed to TeardownManager
* auth validator expects a commandprocessor handle like
* no more passthrough JsonRpc member
* old controls are removed
* binary operators are string enums
* DataBindComposer is not registered by default
* controls do  instanciate asynchronously anymore
* returns Uint8Array instead of ArrayBuffer
* switch from TypedArray to ArrayBuffer for base64 and utf8 operations
* previous controls are not working any more
* rename part to outlet
* Binding from scratch may not contain all methods as it used to
* remove useless async/await usage
* legacy Router and Routes renamed to RouterAsync
* legacy Middlewares renamed to XXXMiddlewareAsync
* Injector renamed to SimpleInjector
* expressions visitor is not async anymore
* expression visitor is not returning promises anymore
* rename $$injector to bootstrapModule
* remove useless helpers
* Event is forbidden in the provided map type parameter
* name is now separated by a # and not a : anymore.
* name is now separated by a # and not a : anymore.
* module and orchestrator are now using this new implementation
* legacy LogProcessor has been renamed to LogEventProcessor
* LogProcessor has been renamed to LogEventProcessor
* implementations using NextFunction will not work any longer.
* new returns Promise to allow the key load when not provided
* added signatures that may break dependent libraries
* now evaluator returns a Promise and not the ParsedFunction directly
* first release
* .pm.config.json is now read from CWD instead of HOMEDIR
* ESM decorators are not compatible with legacy decorators
* serveMetadata signature change
* can only work with ESM now
* config option renamed to configFile
* index.mts moved to handler.ts
* move to ESM to support tree shaking
* Deferred and Serializable(Object) moved to core instead of json-rpc-ws causing dependencies break.
* core and json-rpc-ws dependencies swapped because of afore mentioned breaking change
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



