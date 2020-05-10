#!/bin/sh
yarn set version berry
yarn
yarn pm-fork pm $@