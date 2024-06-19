import { Component, Components } from "@flamework/components";
import { HttpService, Players, Workspace } from "@rbxts/services";
import { ServerEvents } from "shared/network";
import { Identifier } from "shared/util/identifier";
import { EntityState } from "shared/util/lib";
import { StateAttributes, StatefulComponent } from "./state.component";

import { Entity as EntityNamespace } from "shared/components/entity.component";

import { Dependency } from "@flamework/core";
import Signal from "@rbxts/signal";
import type { Skill } from "shared/util/character";
import * as lib from "shared/util/lib";
import { ControllerComponent } from "./controller.component";

/**
 * Events that can be registered onto an entity.
 */
export enum EntityEvent
{
    /*
     * Called when the entity is adorned to the model.
     */
    CREATE = 0x0,
    /*
     * Called when the entity's state changes.
     */
    STATE = 0x1,
    /*
     * Called when the entity's health changes.
     */
    HEALTH = 0x2,
    /*
     * Called when the entity dies.
     */
    DEAD = 0x3,
    /**
     * Called when a combatant executes a skill.
     */
    SKILL = 0x4,
    /**
     * Called when combatant attacks another combatant.
     */
    ATTACK = 0x5,
    /**
     * Called when a combatant is damaged by another combatant.
     */
    ATTACKED = 0x6,
}

export interface EntityEventHandler
{
    [EntityEvent.CREATE]: () => void;
    [EntityEvent.STATE]: (oldState: string, newState: string) => void;
    [EntityEvent.HEALTH]: (oldHealth: number, newHealth: number) => void;
    [EntityEvent.DEAD]: (by: Entity) => void;
    [EntityEvent.SKILL]: (skill: Skill.Skill) => void;
    [EntityEvent.ATTACK]: (by: Entity) => void;
    [EntityEvent.ATTACKED]: (by: Entity) => void;
}

export interface EntityAttributes extends StateAttributes
{
    /**
     * The ID of the entity.
     */
    EntityId: string;
    /**
     * The maximum health of the entity.
     */
    MaxHealth: number;
    /**
     * The current health of the entity.
     */
    Health: number;

    /**
     * The amount of frames that the entity
     * is physically frozen for.
     *
     * When this integer is above 0, the entity's
     * current animation is stopped and they are
     * stuck in place for this many frames.
     */
    HitStop: number | -1;
}

@Component({
    defaults: {
        MaxHealth: 100,
        Health: 100,

        HitStop: -1,

        EntityId: "generate",
        State: EntityState.Idle,
    },
})
export class Entity<
    I extends EntityAttributes = EntityAttributes,
> extends StatefulComponent<
    I,
    Model & { PrimaryPart: BasePart; Humanoid: Humanoid; }
>
{
    private readonly id = Identifier.GenerateComponentId(this, "EntityId");

    private readonly dogtags: Map<string, readonly [damage: number, time: number]> = new Map();

    private readonly entityEvents: Map<EntityEvent, Callback[]> = new Map();

    protected readonly controller!: ControllerComponent;

    constructor()
    {
        super();
        this.onAttributeChanged("EntityId", () =>
        {
            if (this.attributes.EntityId !== this.id)
                this.attributes.EntityId = this.id;
        });

        this.onAttributeChanged("Health", (newHealth, oldHealth) =>
        {
            if (newHealth !== oldHealth)
            {
                if (newHealth <= 0)
                    this.FireEvent(EntityEvent.DEAD, undefined as never); // TODO: add killer dogtags
            }
        });

        this.onAttributeChanged("MaxHealth", (newMaxHealth, oldMaxHealth) =>
        {
            this.attributes.Health = newMaxHealth * (this.attributes.Health / oldMaxHealth);
        });

        const leftLeg = this.instance.FindFirstChild("Left Leg") as BasePart;
        if (this.humanoid.HipHeight <= 0 && leftLeg)
            this.SetHipHeight(leftLeg.Size.Y);

        this.controller = Dependency<Components>().addComponent(this.instance, ControllerComponent)!;
    }

    onStart(): void
    {
        super.onStart();
        this.FireEvent(EntityEvent.CREATE);

        // the entitystate might actually be a number, don't remember! will fix if it causes problems
        this.onAttributeChanged("State", (newState, oldState) => this.FireEvent(EntityEvent.STATE, oldState as string, newState as string));
        this.onAttributeChanged("Health", (newHealth, oldHealth) => this.FireEvent(EntityEvent.HEALTH, oldHealth as number, newHealth as number));
    }

    private tickDowns: Set<defined> = new Set();
    protected tickDown<V = I>(
        attr: keyof {
            [K in keyof V as V[K] extends number ? K : never]: number;
        },
    )
    {
        const attributeKey = tostring(attr) as keyof I;
        const attributeValue = this.attributes[attributeKey];
        assert(
            attr && attr in this.attributes,
            `invalid attribute: ${attributeKey as string}`,
        );
        assert(
            typeIs(attributeValue, "number"),
            `invalid attribute type of ${attributeKey as string} for tickDown: ${typeOf(attr)}`,
        );

        // wait for one extra frame if the tickdown
        // was just applied
        if (this.tickDowns.has(attributeKey))
        {
            if (attributeValue > 0)
                this.setAttribute(attributeKey, (attributeValue - 1) as never);
            else if (attributeValue !== -1)
            {
                this.tickDowns.delete(attributeKey);
                this.setAttribute(attributeKey, -1 as never);
            }
        }
        else if (attributeValue > 0)
        {
            this.tickDowns.add(attributeKey);
        }
    }

    /**
     * Register a dogtag to this entity.
     */
    public RegisterDogtag(posessor: string, damage: number)
    {
        const [ what ] = this.dogtags.get(posessor) ?? [ 0 ];
        this.dogtags.set(posessor, [ damage + what, os.time() ]);
    }

    /**
     * Fetch the most significant dogtag from
     * this entity. A fetching function can also be supplied
     * if a custom functionality is desired.
     */
    public FetchSignificantDogtag(): readonly [who: string, significance: number];
    public FetchSignificantDogtag(handler?: Callback, dogtagTimeout = 270)
    {
        if (handler)
            return handler(this.dogtags);

        const formattedTags = [ ...this.dogtags ].map(([ who, [ what, when ] ]) =>
        {
            return [ who, what, when ] as const;
        }).filter(([ who, , when ]) => when + dogtagTimeout >= os.time());

        formattedTags.sort(([ , what1, when1 ], [ , what2, when2 ]) =>
        {
            return what1 < what2;
        });

        return [ formattedTags[0][0], formattedTags[0][1] ] as const;
    }

    /**
     * Register an event that is fired later in the game loop.
     */
    public RegisterEvent<T extends EntityEvent>(characterEvent: T, handler: EntityEventHandler[T])
    {
        const { entityEvents } = this;
        entityEvents.set(characterEvent, [ ...(entityEvents.get(characterEvent) ?? []), handler ]);

        return new class
        {
            public readonly id: number = entityEvents.size() - 1;
            public readonly event: number = characterEvent;
            public readonly ["__tostring"] = () => `ID 0x${characterEvent}-${this.id}`;
        }();
    }

    /**
     * Fire all registered events bound to the event identifier.
     */
    public FireEvent<T extends EntityEvent>(
        characterEvent: T | number,
        ...params: typeof characterEvent extends T ? Parameters<EntityEventHandler[T]> : unknown[]
    ): Promise<unknown>
    {
        assert(this.entityEvents.has(characterEvent), `character event ${characterEvent} does not exist`);

        return Promise.allSettled(this.entityEvents.get(characterEvent)!.map(async e => e(...params)));
    }

    public SetHitstop(hitstop: number)
    {
        this.attributes.HitStop = hitstop;
    }

    public ClearHitstop()
    {
        this.attributes.HitStop = -1;
    }

    public Jump()
    {
        return new Promise<boolean>((res) =>
        {
            const playerFromCharacter = Players.GetPlayerFromCharacter(this.instance);
            if (playerFromCharacter)
                return ServerEvents.Jump(playerFromCharacter, this.instance);

            lib.Jump(this.instance);

            return res(true);
        });
    }

    public IsGrounded()
    {
        const isPhysicallyGrounded = this.humanoid.FloorMaterial !== Enum.Material.Air;
        if (isPhysicallyGrounded)
            return true;

        const characterPosition = this.instance.GetPivot();
        const raycastParams = new RaycastParams();
        raycastParams.FilterDescendantsInstances = [
            Workspace.WaitForChild("CharacterContainer"),
        ];
        raycastParams.FilterType = Enum.RaycastFilterType.Exclude;

        const boxResult = Workspace.Blockcast(
            characterPosition,
            this.instance.GetExtentsSize(),
            new Vector3(0, -this.humanoid.HipHeight * 1.125, 0),
            raycastParams,
        );

        if (boxResult)
            return true;

        return false;
    }

    public IsMoving()
    {
        return this.humanoid.MoveDirection !== Vector3.zero;
    }

    public GetPrimaryPart()
    {
        assert(this.instance.PrimaryPart, "primary part not found");

        return this.instance.PrimaryPart;
    }

    public SetHipHeight(hipheight: number)
    {
        this.humanoid.HipHeight = hipheight;
    }

    public readonly humanoid = this.instance.WaitForChild("Humanoid") as Humanoid;

    public readonly entityId = HttpService.GenerateGUID(false);
}
