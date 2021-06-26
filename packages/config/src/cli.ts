#!/usr/bin/env node
import { Cli } from '@akala/commands';
import * as path from 'path'

Cli.fromFileSystem(path.resolve(__dirname, './commands'), path.join(__dirname, '../')).then(cli => cli.start());
