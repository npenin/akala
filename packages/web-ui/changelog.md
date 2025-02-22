#  (2025-02-22)


### Bug Fixes

* button needs cursor b50cf6b
* card are non-interactive unless "actionable" 6147f7c
* control tint is now 25% alpha instead of 15% e5331a5
* ensure popover needs htmlelement a6c1ba4
* postcss composer ceb628e
* postcss composer stops crashing if file does not exist 06083a6
* table to use text color (for sort arrow highlight) 2fdb215


### Code Refactoring

* move teardown manager to core 86374cf


### Features

* add local paging support 71cd61f
* add non-interactive to still be able to levrage variables f7cc51b
* add table sorting 836f7da
* add TablePager 4b5d6c8


### BREAKING CHANGES

* teardown manager is not available in client anymore
* cards will not have hover effect anymore unless they are actionable



