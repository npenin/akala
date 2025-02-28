#  (2025-02-28)


### Bug Fixes

* #S6661 234a6f5
* add final line break to files to match with https://github.com/yarnpkg/yarn/issues/2675 623cec5
* add more logging 1bc54b5
* add more logging in automate e788de4
* add support for INIT_CWD variable abd70ea
* artificial bump 51ca8e8
* artificially bump akala c6407f8
* cleanup imports b23f5de
* cleanup script 2ae6f22
* CLI handle optional path 26605aa
* config as akala plugin 211cc6b
* edge cases when template is not defined 412b6f6
* ensure akala is not postinstalled 272b1ee
* ensure postinstall completes 10c4a72
* force set configFile path f22123d
* git rev list command cd73e5a
* i18n uses the core Translator interface 6dd0a83
* inherit options from parent context 7080536
* leverage core case converters 63bcf6b
* postinstall logger 186decb
* postinstall script ac0b390
* postinstall to leverage config 4d2cbbe
* provide proper logging 2e02b06
* rename root project to prevent conflicts with new akala project fff5646
* revert to cayman b7cd5e2
* stop re-exporting spawnAsync from cli 2c2e894
* strongly type built CliContext state 81df5e6
* typo in filename 098f7a1
* update after akala cli refactoring f69a2f4
* update after core breaking change 6ea3ca9
* update after core Translator interface upgrade a6500a1
* use helpers from @akala/cli 74292f2
* xpm issues bd430af


### Features

* add akala plugin as referenced in doc ef39d5c
* add bootstrap functions which registers all web-ui control with a predefined naming dd2ae8f
* add case converters + tests ab359d1
* add cli npm and yarn helpers from pm d23234f
* add close on FileGenerator db6fd88
* add doc from gh-pages branch a024fed
* add NO_AKALAPOSTINSTALL support bebd6b1
* add xpm (but not leverage it yet) 84f1def
* export cli-helper, yarn-helper  and npm-helper ce23f8e
* export Generator type and allow actionIfExists to prevent to generate a file if result ===false 32ae777
* first CLI client generator working !!! 2ab3f9e
* first version 409539e
* improve translator interface d3884d0
* remove legacy global injector functions 29d5996
* switch to nodejs postinstall script 2128399


### BREAKING CHANGES

* Injectable require TArgs
* spawnAsync being available in cli, use that one instead of the one from pm
* i18n unifies with translator, which breaks the previous implementation
* Translator should now support objects as first parameter



