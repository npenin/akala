import { CommandProcessor, CommandResult, Commands } from "@akala/storage";
import { Generator, ModelMode } from "@akala/storage/dist/server/common";
import { Db } from "mongodb";

export default class extends CommandProcessor<Db>
{
    private client: Db;

    visitUpdate<T>(cmd: Commands<T>): PromiseLike<CommandResult>
    {
        return this.client.collection(cmd.model.nameInStorage)
            .updateMany(cmd.model.getKeys(cmd.record), { $set: Object.fromEntries(Object.entries(cmd.record).filter(e => cmd.model.members[e[0]]?.generator !== Generator.native && cmd.model.members[e[0]]?.generator !== Generator.uuid)) })
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
            .then(r =>
            {
                cmd.model.membersAsArray.filter(m => m.nameInStorage == '_id').forEach(m => m.mode == ModelMode.Attribute && (cmd.record[m.name] = r.insertedId as any));
                return { recordsAffected: 1, ...r }
            });
    }
    init(options: Db): void
    {
        this.client = options;
    }

}