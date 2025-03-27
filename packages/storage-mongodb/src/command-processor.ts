import { CommandProcessor, CommandResult, Commands } from "@akala/storage";
import { Generator, ModelMode } from "@akala/storage";
import { Db } from "mongodb";

export default class extends CommandProcessor<Db>
{
    private client: Db;

    visitUpdate<T>(cmd: Commands<T>): PromiseLike<CommandResult>
    {
        return this.client.collection(cmd.model.nameInStorage)
            .updateMany(cmd.model.getKeys(cmd.record), {
                $set: Object.fromEntries(
                    Object.entries(cmd.record).
                        filter(e => cmd.model.members[e[0]]?.generator !== Generator.native && cmd.model.members[e[0]]?.generator !== Generator.uuid).
                        map(e => [cmd.model.members[e[0]].nameInStorage, e[1]])
                )
            })
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
            .insertOne(Object.fromEntries(Object.entries(cmd.record).map(e => [cmd.model.members[e[0]].nameInStorage, e[1]])))
            .then(r =>
            {
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                cmd.model.membersAsArray.filter(m => m.nameInStorage == '_id').forEach(m => m.mode == ModelMode.Attribute && (cmd.record[m.nameInStorage] = r.insertedId as any));
                return { recordsAffected: 1, ...r }
            });
    }
    init(options: Db): void
    {
        this.client = options;
    }

}
