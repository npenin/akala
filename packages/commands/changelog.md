#  (2024-10-08)


### Bug Fixes

* ac new gracefully ends 540e246
* add "camelcasification" on generated names b8e07b9
* add akala as export 0fc25ef
* add extends adn dependencies on the container interface 7ee1481
* add more files to the browser field aa9b864
* add node as an export condition 2e70542
* add provenance 7e40a49
* add support for soft kill when remote connected b12b3b9
* add-script and yamlloader 38208f0
* akala cli 7e6bff2
* akala cli initrr handling 0474016
* akala init support bde3ba3
* akala init support bebb0f5
* allow all registered containers to be served 01961d7
* allow for any property on errors b0389f6
* allow pm yto start 6a757f6
* allow using jsonrpc trigger in browser 6aa7071
* artificial bump faefcde
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* async CLI init 4c71008
* auth handlers behvior 9462b4f
* **automate:** stdio 861db3c
* better support for closed socket requests 7e98da0
* broken command processor 0940ce6
* browser implementation (remove implicit reference to node) 0283043
* build + schema d312cad
* bump version dc1b5d3
* bump version 5f003ef
* bump version because of previous workflow failures 60372e0
* Cli implementation 200d64c
* cli parsing 0c484a5
* Cli wait fixed 8ef8927
* client package 3a63d9b
* close outputs after generate 4c4f0e4
* comand schema config schema 24c2088
* command config resolution b7cdfdf
* command configuration path resolution 9164203
* commands default path 37d7ff9
* commands stay in order 3dd95c6
* commands.json resolution + install script d562a13
* CommandWithAffinityProcessor better detection e63195c
* config file save fallback 539d661
* connectByPreference honors preferRemote as preferrence f3c0ff8
* connectByPreference not working with sockets eecf82e
* copy paste issue 452a162
* create 1 trigger per jsonrpc provider 128b36f
* **deps:** update dependency ws to v8 93a65d0
* direct invocation if init-akala 52f59c7
* downgrade all packages to support both cjs and mjs cd58dc1
* downgrade all packages to support both cjs and mjs d2c799a
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* enable jsonrpc on clients 8487890
* error support in jsonrpc eb922c2
* export Configurations type to allow augmentation 9d3f5e0
* export parseMetadata 27b8798
* expose jsonrpc client id 2bd9b79
* FileSystem processor reports better relative paths 303162d
* fix for akala init 80ea43f
* fix for commands ac new 28db826
* fix generate and tsconfig files f6e44d6
* fs discovery 58346f9
* fs middleware after discovery changes 5b98a45
* fs processor too catchy d8a7bac
* generate command bfb21bc
* generate keeps all extra fields d6fc989
* generate now keeps existing additional meta information (extends and dependencies) af16b76
* handle bridges/proxy 3d43667
* handle empty orders in connectByPreference 68b37eb
* handle non provided description in doc 3ac7347
* helps compile under angular 4c8979a
* honoring preferRemote e0e498b
* http to support custom injector 87e4d42
* ignore commands without source 248b089
* implement own resolve to prevent resolving to main 1bee921
* improve $serve input consistency 0127c54
* improve browser usage ac6f14b
* improve cli trigger performances 03d08ad
* improve command generator 87777b5
* improve generate performance 20f22b7
* improve module resolution 194dd71
* improve openapi support and json schema interpretation 071da4b
* improve reliability on commands 162430a
* improve schema support 8c47d1a
* improve schema support 7a21e14
* improve start/stop doc 5bc5066
* improve support for extends e0c1e7e
* improve type support in metadata generation 36adc33
* improve usage in browser 85df5da
* improve usage in browser 5fa4382
* improves command detection d358afb
* infinite loop when file does not exist 1323c22
* inject usage after move to full meta cmd 8bbdda6
* json rpc handle always remaps args f5857f7
* json schema internal references 102e155
* jsonrpc now breaks with standard jsonrpc error ff86110
* jsonrpc processor 1dde6f3
* jsonrpc prperly send parameters 41c0129
* jsonrpc trigger 04ca4e0
* jsonrpc will adapt based on the trigger 7738492
* logging namespace in jsonrpc 815e03a
* lookup on windows 1afc137
* made connect and fork more reliable and resilient ecb1b48
* main container is now really acting as a proxy 20d2a9d
* metadata definition when bundled by vite 12b64fe
* metadata definition when bundled by vite 66ac365
* metadata does not rely on container name, but on key registration d494121
* mocha test command fbf25a1
* move from abortsignal to abortcontroller 514b4ba
* move from require to import to support esm e6755ad
* move socket name as part of socket options ecbfb57
* move to ESM 6b55a07
* moved commands to internal event emitter f4cd64f
* nested container processing 23cbaac
* new cc does not require destination to be a folder 8529add
* new considered as part of the folder name 85291fb
* normalized modules to work in esm and cjs c9e7650
* path to bins 8e7266a
* path to container schema 9f4404e
* preferRemote now also allows less preferred connection 3886c26
* prevent commands override 790f6a7
* prevent duplicate containers/procesors on multiple calls per socket d5349f3
* prevent inifinite loop when no matching option can be found 3fb554d
* prevent send on closed socket 993d0b3
* proper error serialization support f9582f6
* proper positional option dff5a17
* properly generate module from hierarchy 9c140f0
* ready command in pm works in both forks and remote 31fde71
* recursive commands named according to folder d9cd149
* reference to jsonrpc on browser condition 7019f68
* remove _trigger when sending over jsonrpc 96d4a88
* remove assert dependency ba323f6
* remove confusing inject property on commands 94e3058
* remove debugger statement 3fd57c4
* remove extra logging d8ef621
* remove extra trace f2f103a
* remove extra ts declaration 38a0b6d
* remove jsonrpc from browser field 60e8a61
* remove over proxyfying 6378620
* remove over proxyfying 1af9648
* remove postinstall steps e8b6506
* remove require call d3fbea1
* remove stateless bf9ca5f
* remove stream dependency when used in browser 0b4117d
* remove triggers from browser 458f29b
* require dependent packages broken 7b3f12d
* resolve file URLs before trying to read stats f3d9ca7
* resolve path in new cc 621ffd9
* restore broken cli feature e56c880
* revert some changes to fix build a67e5f7
* schema typing 852eeb9
* serve SHOULD return after the server is started 7215c03
* sidecar command definition b03fb4c
* sidecar to remote containers 33df73e
* silent disconnect failures 9116ad1
* simplify and fix jsonrpc invoke 09af7a5
* simplify url handler cec7182
* stateless cli gateway working fe1c6a6
* stdin support ec2a0d2
* stdin support 8117996
* support improved for esm 61c8016
* support when @akala/config is not loaded c1a3b8b
* testing the backtick replacement 03193ca
* tree shaking issue cae5505
* typing 15ef366
* update after cli option update aec649f
* update after core breaking change c4a38ba
* update after core changes 1d66bfe
* update after event emitter upgrade in code 8963640
* update all commands cf893ab
* update CLI definitions 5a31abe
* update command definitions 0c4088c
* update command with affinity priority 19c79bd
* update commands cli definition f6dd221
* update jsdoc f1654fb
* update lock and commands.json files 6d828a3
* update lock file 960047c
* update metadata 25249e9
* update package definitions e8f89f1
* update ready command for remote containers 18a555c
* update ready comment definition 7220126
* update source-map-support imports ee12278
* update to new branch json url 777d26d
* update to node 22 eee965c
* update ts generated files 0d778b5
* updateCommands now removes all commands before re-registering cc59e42
* use static import instead of dynamic import 4fa4631
* wrong version f23a776
* yarn reshuffle deps 345500e


### Features

* add $container to fs inject c8efc7e
* add $init-akala as an init command when running any command in a given container 8b9574a
* add auth trigger support bf25dfd
* add authentication support 630d5a3
* add authentication support 47c56d5
* add bridge support b07b1ba
* add connection id on jsonrpc processors 7465604
* add custom inject in jsonrpc processor 1af1f84
* add disabled option on fs a84d023
* add extends support e1156dd
* add generate ts from schema command 79f5e6e
* add generate-schema 7d4a622
* add jsdoc b0594fa
* add LogProcessor d6f37e6
* add more type exports 37459b3
* add name fs discovery 1977596
* add new module command to build a folder structure 6d86971
* add openapi generation 048c59d
* add options to generate 075f193
* add parent injector as container constructor parameter a3090f7
* add plugins for ts and metadata generation 5040281
* add possibility to serve all containers at once 4a421f5
* add protocol handlers 9bd6667
* add reload-metadata on pm a28066f
* add required attribute on auth config 7fa68e3
* add rest args on cli 8c8ee74
* add schema validation a247c14
* add stateless initial support f37ef01
* add stdin as param ef92cf2
* add support for mjs and cjs files discovery a24de18
* add tcp remote protocol handler fd663ad
* add translation support on documentation 7f2b77e
* add typed variant ab3e802
* allow both jsonrpc and jsonrpcbrowser to co-exist 7fa6fa3
* allow for relative path in cli f240d15
* auth validator now expects a commandprocessor handle like 3ac9ab8
* **command:** upgrades command definitions to new generation layout d621ea3
* container can now act as middlewares 0dd977f
* create an http client processor from url b6dbf3e
* enable cli help/documentation 26eb4f3
* enable env on cli containers 5713a25
* export generator helper functions d6ad31e
* first auth implementation in http client 042a5ab
* handle readable streams 90133e6
* handle readable streams e8933ce
* have both CJS and ESM at once b07f75b
* helps developer adding scripts to package to generate commands metadata 6ebd060
* implement serve in cli a9b7a2f
* implement support typings 12615a2
* improve metadata generation with typing from schema a9dad6c
* improve open api support 7f4b8a2
* improve trigger defintiion c49fc9d
* improved implement command 57881cb
* initial aws sdk implementation 4febd2a
* jsonrpc disconnect support for server and proxies 20a92ae
* move Deferred and Serializable(Object) to core 240544f
* move ErrorWithStatus to core 04d5530
* move to serve with AbortSignal 8449080
* new modules are ESM only b7c29de
* open api generator considers schema if available 1ea1364
* removing problematic extend function 4a66e5a
* sidecar now fallback to proxy on pm 1702596
* support for commands through pm 975f8d5
* support normalize require config 5c4496c
* support oneway messages by throwing undefined 1e2f5c7
* switch to URL handler for processor registration a80a214
* switched from raw debug to logger from core b2c7d2d
* update command behavior 3e82c13
* update to ESM 500be75


### BREAKING CHANGES

* Configuration do not allow only string, but any Resolvable type
* http-client may not be working yet
* Schema configuration uses the standard $defs to define definitions
* auth validator expects a commandprocessor handle like
* no more passthrough JsonRpc member
* name is now separated by a # and not a : anymore.
* name is now separated by a # and not a : anymore.
* legacy LogProcessor has been renamed to LogEventProcessor
* LogProcessor has been renamed to LogEventProcessor
* serveMetadata signature change
* Deferred and Serializable(Object) moved to core instead of json-rpc-ws causing dependencies break.
* core and json-rpc-ws dependencies swapped because of afore mentioned breaking change
* inject property does not exist on commands anymore
* extend helper no more is
* triggers first generic parameter is expected to be a args array
* All command processors require a command metadata.
* Containers use a composite middleware as processor
* Command renamed to SelfDefinedCommand (as it is not useful any more)
* Removed CommandNameProcessor concept



