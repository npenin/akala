import { CommandProcessor, CommandResult, Commands } from "@akala/storage";
import { Collection, Db, MongoClient } from "mongodb";

export default class extends CommandProcessor<Db>
{
    private client: Db;

    visitUpdate<T>(cmd: Commands<T>): PromiseLike<CommandResult>
    {
        return this.client.collection(cmd.model.nameInStorage)
            .updateMany(cmd.model.getKeys(cmd.record), { $set: cmd.record })
            .then(r => ({ recordsAffected: r.matchedCount, ...r }));
    }
    visitDelete<T>(cmd: Commands<T>): PromiseLike<CommandResult>
    {
        return this.client.collection(cmd.model.nameInStorage)
            .deleteMany(cmd.model.getKeys(cmd.record))
            .then(r => ({ recordsAffected: r.deletedCount, ...r }));
    }
    visitInsert<T>(cmd: Commands<T>): PromiseLike<CommandResult>
    {
        return this.client.collection(cmd.model.nameInStorage)
            .insertOne(cmd.record)
            .then(r => ({ recordsAffected: 1, ...r }));
    }
    init(options: Db): void
    {
        this.client = options;
    }

}