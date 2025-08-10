import { type Acl } from './Acl.js';
import { type ProviderCollection } from './ProviderCollection.js';

export interface AclConfiguration 
{
    defaultProvider: string;

    providers: ProviderCollection;

    rights: Acl;
}
