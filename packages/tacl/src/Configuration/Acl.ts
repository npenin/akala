import { AccessRule } from '../access-rule.js';

export type Acl = Array<AccessRule & { targetProvider?: string }>;