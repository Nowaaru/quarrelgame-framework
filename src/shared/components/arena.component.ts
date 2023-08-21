import { OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";
import { quarrelAssets } from "shared/util/lib";
import { Identifier } from "shared/util/identifier";

/**
 * The attributes of an Arena instance.
 */
interface ArenaAttributes {
    /**
     * The maximum amount of participants.
     */
    MaxParticipants: number;
    /**
     * The ID of the folder that contains the arena.
     */
    ArenaId: string;
    /**
     * The Id of the host of the arena. This is typically the
     * match host or the private server owner.
     */
    Host: string | number;

    id: string;
}

@Component({})
export class ArenaComponent extends BaseComponent<ArenaAttributes, Folder> implements OnStart
{
    private arena!: Model;

    private readonly id = Identifier.GenerateComponentId(this, "id");

    onStart()
    {
        this.arena = quarrelAssets.model.arena.FindFirstChild(this.attributes.ArenaId)?.Clone() as Model;
        assert(this.arena, `arena of ID ${this.attributes.ArenaId} does not exist.`);

        this.arena.Parent = this.instance;
        this.instance.Name = "Arena";
    }
}