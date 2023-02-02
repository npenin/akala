#!/bin/sh
find packages -name node_modules -exec rm -R {} \;
yarn
find packages -name dist -exec rm -R {} \;
find packages -name lib -exec rm -R {} \;
find packages -name tsconfig.esm.tsbuildinfo -exec rm -R {} \;
find packages -name tsconfig.cjs.tsbuildinfo -exec rm -R {} \;
