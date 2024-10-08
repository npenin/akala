#  (2024-10-08)


### Bug Fixes

* add logs before publish 6061f9e
* add missing dependency 55c7a20
* add missing package required property 292cd28
* add node as an export condition 2e70542
* add support for more types (doc and style) 4c5c171
* add xe settings to force logging adf379d
* add-script and yamlloader 38208f0
* allow pm yto start 6a757f6
* angular type def after dep upgrade ec3c290
* angular type def after dep upgrade 14fdea4
* artificial bump d26d08e
* artificial bump 6b6a0b6
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* **automate:** stdio 861db3c
* bump dependent c094bac
* bump dependents proper references aa422cf
* bump version dc1b5d3
* commands stay in order 3dd95c6
* commit parsing when empty commit message 4d0feec
* default version ignore to decline 938a1a5
* **deps:** update dependency @yarnpkg/core to v3 9ff276e
* double bump 4ec5500
* downgrade all packages to support both cjs and mjs cd58dc1
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* empty mail parsing 169c0e6
* fix generate and tsconfig files f6e44d6
* fix semantic releases workflow 94ff2c3
* git push tags 563e7ae
* git-semver-tags after upgrade 16cde4e
* improve browser usage ac6f14b
* improve get-version bff69e2
* improve logging when no version is found e97920e
* last semantic releases step as shell script 4cac6d9
* limited git tag scope c031aae
* made connect and fork more reliable and resilient ecb1b48
* move dependency from devdep 694de9d
* move to ESM 6b55a07
* no realy change but it works 92e084d
* normalized modules to work in esm and cjs c9e7650
* output name from inner semantic-releases script aaa1709
* package name tagging d939453
* path to container schema 9f4404e
* proper changelog extension ec5367c
* proper parameter binding for bump-dependents d9ed8d6
* provide proper variable to bumps dependents 5921792
* publish reuses latest tag 21bc3ed
* push before tagging 490a5f8
* ready command in pm works in both forks and remote 31fde71
* release number detection b0aeb62
* remove confusing inject property on commands 94e3058
* remove duplicate foreach in publish 3430541
* remove failure masking 9af986d
* removed useless bump 70a6f83
* renamed ignore to decline (to follow yarn convention) 2cf8407
* require dependent packages broken 7b3f12d
* reset minor and patch number depending on the bump b1fc8f0
* sidecar to remote containers 33df73e
* sort excludes non workspace dependencies 162419f
* sort supports correct structure 6789bb5
* sort workspaces before publish 532bf69
* sorted workspace is used as an output b7b6bec
* start command dbdfc72
* storing bumps 353870f
* support for no workspace dependencies fe05fa6
* support for no workspace dependencies 859310e
* update after conventional breaking changes 58e7914
* update after the breaking change in conventional changelog 942e471
* update after the breaking change in conventional changelog 9b305e5
* update after the breaking change in conventional changelog 87a4667
* update all commands cf893ab
* update command definition 91c46d3
* update dependencies and regenerate metadata 79412a7
* update lock and commands.json files 6d828a3
* update lock file 960047c
* update package definitions e8f89f1
* update package publication to public 43ef479
* update ready command for remote containers 18a555c
* update ready comment definition 7220126
* update to latest @akala/core 28c28a7
* update to new branch json url 777d26d
* update workspace parameter binding 19d16b6
* variable leak 45bb72a
* variable renaming 88368f1
* workflow output 4c870c8
* wrong property name usage 141bf4c
* wrong version c4d5bc8
* wrong version 0c96423
* yarn publish will ignore private 9c291ca
* yarn runs in shell mode ef2451e


### Features

* add changelog support 8271d11
* add failure support 7519533
* add reload-metadata on pm a28066f
* add semantic releases fd3649f
* add support for breaking change parsing a8a8870
* add support for shell script failure ignore d3455ab
* add support for untagged packages (yet) 7719056
* add tagging when publishing + add re-tag workflow f06b899
* deprecate CJS implemtations for many packages bcddb76
* enable cli help/documentation 26eb4f3
* have both CJS and ESM at once b07f75b
* implement full release with automate fe874e9
* improve commit analysis aa455f9
* improve middleware behaviour 99aa466
* provide workspace info with bump 0f5233d
* switch from yarn version to manual bump 3a6dbe5
* update to ESM 500be75


### BREAKING CHANGES

* CJS is no more supported
* inject property does not exist on commands anymore



