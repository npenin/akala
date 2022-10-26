import { CommandResult, Store } from "@akala/storage";

export default function create<T, TypeName extends string>(db: Store<{ [key in TypeName]: T }>, type: TypeName, entities: T[] | T): PromiseLike<CommandResult[]>
{
    if (!Array.isArray(entities))
        entities = [entities];
    var set = db.set<T>(type);
    var transaction = db.beginTransaction()
    entities.forEach(entity => transaction.enlist(set.create(entity)));
    return db.commitTransaction();
}