import { AccessRule } from "../access-rule";

export type Acl = Array<AccessRule & { targetProvider?: string }>;