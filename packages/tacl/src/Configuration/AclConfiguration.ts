import { Acl } from "./Acl";
import { ProviderCollection } from "./ProviderCollection";

export interface AclConfiguration 
{
    defaultProvider: string;

    providers: ProviderCollection;

    rights: Acl;
}