#  (2024-10-08)


### Bug Fixes

* add node as an export condition 2e70542
* add preAction before displaying usage e444ad5
* add provenance 7e40a49
* add source map flag when running cli 1965fa5
* akala cli 7e6bff2
* allow pm yto start 6a757f6
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* bad regex syntax a9c499f
* better support for compound keys 855e97c
* bump version dc1b5d3
* bump version c3dbe4e
* cli args parsing 889d046
* cli crashing when succeeding 239ef5c
* cli options when no options is provided 07d68bd
* cli parsing cc4cb76
* cli parsing 0c484a5
* cli usage formatting c0932bb
* Cli wait fixed 8ef8927
* client compilation c66325e
* client package 3a63d9b
* command help with mandatory positional parameter 1e5045e
* commands discovery when using delegate 1fa4192
* config file save fallback 539d661
* consider pm container from options 7c10b5f
* display for pmSocket config info 55a2bfb
* do not overwrite option when coming from usage 673313c
* downgrade all packages to support both cjs and mjs cd58dc1
* edge case cli implementation f31815f
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* enable formatting on config file d1f18fa
* enable jsonrpc on clients 8487890
* exclude urls from normalization 24337e6
* fix automate runner 77e099c
* fixing config plugins loading 2967c95
* handle edge case on cli usage discovery 9d7c392
* handle normalize on rest parameters 5909f9e
* handle result properly f126e99
* improve browser usage ac6f14b
* improve path normalization fdf2ef2
* improve usage with objects 9c52c53
* improve windows support 26e39af
* interact error support 35cf967
* interact errors happen on program and not root 74827bb
* interacterror support 7a145a3
* logger as non enumerable property d6401c5
* lookup on windows 1afc137
* missing import assertion ba3728e
* move from abortsignal to abortcontroller 514b4ba
* move to ESM 6b55a07
* multiple readline calls failure + removing line break 33c8295
* normalization and edge cases in cli d3bf1a9
* normalize behavior with relativeTo e169928
* normalize causes issue if not URL 0560abe
* normalize on windows e84ded6
* normalize on windows eb06974
* normalize path b543a2c
* normalize require properly imports packages 69fc60b
* normalize support for custom conditions f325a88
* normalized modules to work in esm and cjs c9e7650
* normalizing on usage options f306ac6
* package template with better prepack script d2ea356
* path to bins 8e7266a
* performance refactor fix 2a64eae
* pm cli command usage d7e8fa9
* pm fork 669b1f5
* proper exit code on help 1260db7
* proper exit code on help ddb0efb
* proper use of normalize for plugins afd0715
* readline implementation 0d2b930
* regex broken 300e2fe
* relative to config file cli imports beb7ddf
* remove winston dependency 026dabc
* removed mock-require usage 658d18a
* require dependent packages broken 7b3f12d
* restore broken cli feature e56c880
* shebang on akala CLI 2f1aec2
* stateless cli gateway working fe1c6a6
* support for async imports in cli plugins 50d11ae
* support normalize files in modules 4fefe9c
* unliased interact errors 45835cb
* unparse options b2cd179
* update after cli option update aec649f
* update after core breaking change 57734b2
* update after core changes 940b919
* update dependencies and regenerate metadata 79412a7
* update lock file 960047c
* update package definitions e8f89f1
* update source-map-support imports ee12278
* windows resolution 22a3537
* wrong error handling in options f3be2cb
* wrong version 63085f4


### Features

* add abort signal on CliContext 8c449b3
* add curry variant to improve typing bcd4ae9
* add interact error from pm bdc145c
* add name variations ed3866d
* add position information on positional parameters c02e484
* add rest args on cli 8c8ee74
* add support for -- in CLI 3d28a28
* add support for dashes for command args 9467a7e
* added winston as a logger system 65d3e7f
* allow for relative path in cli f240d15
* enable cli help/documentation 26eb4f3
* enforce logger on buildCliContext d8963c8
* have both CJS and ESM at once b07f75b
* make format a middleware cf32976
* move ErrorWithStatus to core 04d5530
* options usage now replaces parameters in backticks 6207856
* support normalize require config 5c4496c
* switched from raw debug to logger from core b2c7d2d
* update to ESM 500be75


### BREAKING CHANGES

* cli does not use winston as a logger anymore



