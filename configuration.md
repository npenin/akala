# Configuration

Configuration in the akala stack that provides commands for configuration.

You may want to check a live project to see how commands can be written: [see in pm commands](https://github.com/npenin/akala/tree/master/packages/pm/src/commands).
Typescript is preferred, but not mandatory.

# History

The configuration idea came from what [uci provides on openwrt](https://openwrt.org/docs/guide-user/base-system/uci)

Its purpose is to support configurations (and nested configurations).

# Setup

If you want to use the configuration module the same way as uci, you may just use `uci2`. 

Alternatively, you may imported to the `akala` cli with the following line and then be guided with the help

`akala plugins add @akala/config/akala`
