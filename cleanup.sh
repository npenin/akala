#!/bin/sh
find packages -name dist -exec rm -R {} \;
find packages -name node_modules -exec rm -R {} \;
find packages -name tsconfig.tsbuildinfo -exec rm -R {} \;
yarn
