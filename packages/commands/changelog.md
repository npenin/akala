#  (2024-08-03)


### Bug Fixes

* allow using jsonrpc trigger in browser 49a8733
* auth handlers behvior 523c6fa
* improve openapi support and json schema interpretation 26536bc
* improve type support in metadata generation 22c4a00
* jsonrpc will adapt based on the trigger ccff55b
* main container is now really acting as a proxy a015d3f
* metadata definition when bundled by vite af23a0c
* metadata definition when bundled by vite 71c5337
* remove extra logging fee977b
* resolve file URLs before trying to read stats 2538a4e
* schema typing cff3813
* simplify and fix jsonrpc invoke 24ce2dc
* update after core breaking change d8b299b
* update after event emitter upgrade in code 65ef31f
* update to node 22 b16b801
* use static import instead of dynamic import 0ba9fce


### Features

* add connection id on jsonrpc processors fe38734
* add generate ts from schema command 9cefb0c
* add more type exports 5266053
* add required attribute on auth config f131e8c
* auth validator now expects a commandprocessor handle like 2f1b907
* create an http client processor from url e44d9fd
* export generator helper functions ac613f5
* first auth implementation in http client a36d32f
* improve metadata generation with typing from schema 55f4242
* improve open api support c99299c


### BREAKING CHANGES

* Schema configuration uses the standard $defs to define definitions
* auth validator expects a commandprocessor handle like
* no more passthrough JsonRpc member



