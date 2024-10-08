#  (2024-10-08)


### Bug Fixes

* $bridge implementation 4b8ffed
* add akala as export 0fc25ef
* add metadata when using ipc d2d9409
* add missing proxy command to establish the bridge 2a8c081
* add node as an export condition 2e70542
* add pm processor when proxying 95bb77a
* add provenance 7e40a49
* add stdin to pm cli 915a119
* add support for soft kill when remote connected b12b3b9
* add-script and yamlloader 38208f0
* added remote pm socket support c4b26b3
* akala cli 7e6bff2
* allow pm to start 84e99d3
* allow pm yto start 6a757f6
* artificial bump 8dfb1e0
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* **automate:** stdio 861db3c
* better fork description 0094d07
* better stateless detection 3d359af
* better support for compound keys 855e97c
* better support for metadata on closed remote containers abd2bd5
* better support for non-mapped sidecars f3b922c
* bridge and proxy commands ef7ee19
* build + schema d312cad
* build fix after jsonrpc breaking change c1dd5a4
* bump version dc1b5d3
* cleanup $disconnect registration on ready 86481c3
* client prepack 8d71408
* commands default path 37d7ff9
* commands stay in order 3dd95c6
* compilation 929a418
* config file option name d43fd2d
* connect fails when connect on mapping is undefined bd7a45b
* connect should failed if mapping is not found 295532b
* connect when connecting to pm 2fa223a
* consider pm container from options 7c10b5f
* correct name assignment in fork bb3e709
* crash on parsing remote 372edf7
* dependencies e0aba41
* discover cli usage 5a26eab
* discover implementation 62085ff
* display for pmSocket config info 55a2bfb
* downgrade all packages to support both cjs and mjs cd58dc1
* eliminate the need for json import 1d10930
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* export parseMetadata 27b8798
* fix after config upgrade 9d3cb7e
* fix generate and tsconfig files f6e44d6
* fix pm startup cad581c
* force metadata command registration in remote container 1d1ec70
* force socket processor on pm forks dac8f1a
* fork broken 388815e
* fork knows about pm metadata 6b1dc63
* handle bridges/proxy 3d43667
* handle non-specified pm socket option b225cef
* health check reliability 1f5a2d1
* help now works where no socket is available 0626b14
* imported event class from node 86f3ae3
* improve browser usage ac6f14b
* improve module resolution 194dd71
* improve openapi support and json schema interpretation 071da4b
* improve performance of metadata lookup dd08461
* improve remote sidecars defaults 44b001d
* improve spanasync resilience 9430c66
* improve start reliability 02cb82e
* improve start/stop doc 5bc5066
* improved logging support 76174a5
* improved ready command for remote containers 0aafb00
* infinite loop cb53d27
* init leverage ESM 8967ff3
* initial pm setup c4e7f7a
* jsonrpc process on fork is passthrough 61f3631
* ls lists existing containers 911d3ab
* made connect and fork more reliable and resilient ecb1b48
* make new as sync again and create newAsync dfc10d4
* make pm work with connect args 76d77dc
* metadata declaration on fork 19e5725
* metadata lookup 4ed47f3
* metadata lookup on start 277fcd2
* move cli to esm 7059095
* move socket name as part of socket options ecbfb57
* move to ESM 6b55a07
* normalize support for custom conditions f325a88
* normalized modules to work in esm and cjs c9e7650
* optional parameter in connect 3ca8b23
* path to bins 8e7266a
* path to container schema 9f4404e
* performance refactor fix 2a64eae
* pm cli command usage d7e8fa9
* pm connect when manual forking 2be9cab
* pm fork 669b1f5
* pm log implementation 0135966
* pm start c3facba
* pm start command 90762ab
* proper positional option dff5a17
* ready command in pm works in both forks and remote 31fde71
* ready command works properly 6c760fd
* reload metadata now call metadata with deep flag 0d16fa6
* reload-metadata definition fixed c3fc006
* remote conect 9b309cc
* remote container command registration c148997
* remote pm proxy 6a514d1
* remote ready failing 1a29c42
* remove confusing inject property on commands 94e3058
* remove duplicated code in pm start command 1c66030
* remove extra pm logging 86f0d75
* remove stateless bf9ca5f
* removed mock-require usage 5fa4c30
* resolve legacy config lookup ab1dd2f
* restore broken cli feature e56c880
* revert some changes to fix build a67e5f7
* set connect configuration 3e23790
* sidecar command definition b03fb4c
* sidecar proxy calls 33644d5
* sidecar to remote containers 33df73e
* sidecar use pm when provided fc89462
* split start and start-self 5fe8f17
* start command dbdfc72
* start command args scope 5c3f14c
* start updates commands 7e9f12c
* stateless cli gateway working fe1c6a6
* stop command 5291930
* swap build dependencies 4ec03cc
* switch processes state to object 44fa4fa
* trying to fix docker files 5cbec4c
* update after cli option update aec649f
* update after core breaking change 61b2a6c
* update after core breaking change be738bb
* update all commands cf893ab
* update CLI definitions 5a31abe
* update command definitions 0c4088c
* update commands file 19703de
* update dependencies and regenerate metadata 79412a7
* update jsdoc f1654fb
* update lock and commands.json files 6d828a3
* update lock file 960047c
* update metadata 25249e9
* update package definitions e8f89f1
* update pm metadata ba513df
* update ready command for remote containers 18a555c
* update ready comment definition 7220126
* update to new branch json url 777d26d
* update to new commands major version a024e1d
* update ts generated files 0d778b5
* upgrade to latest commands 1bf0edc
* use config from akala when starting pm 98d370c
* use pm config when possible 55d0802
* use signal to close pm connection a2e8e66
* wrong container name on fork c53962c
* wrong version 763d599


### Features

* add bridge support b07b1ba
* add keepAttached for pm start ef6fa67
* add reload-metadata on pm a28066f
* add stateless initial support f37ef01
* add the possibility to load programs with file urls dfbb9cb
* cli now supports stream results 70f9a69
* deprecate CJS implemtations for many packages bcddb76
* enable cli help/documentation 26eb4f3
* error message is retrieved if wait is specified 21165b9
* export meta definition 3916055
* export spanAsync 3d4403b
* expose start command to self-host pm cf57038
* have both CJS and ESM at once b07f75b
* initial aws sdk implementation 4febd2a
* InteractError now using Binding for more possible usecases c747c39
* move Deferred and Serializable(Object) to core 240544f
* move ErrorWithStatus to core 04d5530
* move to serve with AbortSignal 8449080
* return ProxyConfiguration correct type when strongly typed 0198e0d
* sidecar does not crash if there is no pm detected 02f2423
* sidecar now fallback to proxy on pm 1702596
* support for commands through pm 975f8d5
* switched from raw debug to logger from core b2c7d2d
* update configuration structure 49e1753
* update ready to event instead of promise 284eae4
* update to ESM 500be75


### BREAKING CHANGES

* CJS is no more supported
* .pm.config.json is now read from CWD instead of HOMEDIR
* serveMetadata signature change
* config option renamed to configFile
* Deferred and Serializable(Object) moved to core instead of json-rpc-ws causing dependencies break.
* core and json-rpc-ws dependencies swapped because of afore mentioned breaking change
* inject property does not exist on commands anymore
* Configuration structure has been reshaped



