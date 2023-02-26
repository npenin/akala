import { Acl } from './Acl.js';
import { ProviderCollection } from './ProviderCollection.js';

export interface AclConfiguration 
{
    defaultProvider: string;

    providers: ProviderCollection;

    rights: Acl;
}