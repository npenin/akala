#  (2025-03-20)


### Bug Fixes

* add more logs a905ac4
* add strong typing to refactored functions 69758db
* busbox compatibility by switching from env -S to env and enabling sourcemap in js a510d42
* cli returns mainprogram (to prevent multiple init if processing multiple times 2979e96
* context inheritance during install 2a2a587
* cwd init 03ed2d1
* default logging level f8f9a2c
* hasYarn detection to prevent it to crash 6980e95
* improper config init 70efb0d
* inherit options from parent context 3bb58b9
* install command should now handle any package (as long as it contains an akala plugin) 7bec66f
* options setup 185ffa4
* provide proper logging 445a133
* remove production flag on npm helper e5b0919
* remove useless config parameter 21b41cb
* revert options copy on buildCliContextFromContext 084cf1a
* strongly type built CliContext state ce294ef
* switch from try catch to URL.canParse e766f24
* update after breaking change 78d6ba4
* update after core breaking change 6379673
* xpm init 0fb1f90
* xpm setup a7e9418
* yarn and npm not discovered in spawnAsync 3101a2b


### Features

* add client install support 63a020d
* code from akala helper to trigger akala install b95b3bb
* enable general purpose verbose flag e49a4fb
* enable info logging by default 521849c
* expose xpm f60e75a
* make help accessible everywhere by any clicontext e18be04
* plugins can now be installed with the current cli "program" f535bc0


### BREAKING CHANGES

* enforces stricter options typing



