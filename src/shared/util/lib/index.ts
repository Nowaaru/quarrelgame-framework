import { Dependency } from "@flamework/core";
import { Players, ReplicatedStorage, RunService } from "@rbxts/services";
import { ClientFunctions } from "shared/network";

import type { Entity } from "server/components/entity.component";
import type { SchedulerService } from "server/services/scheduler.service";
import type Character from "../character";

export const QuarrelGameFolder = ReplicatedStorage.WaitForChild("QuarrelGame") as Folder;
export const QuarrelCommands = QuarrelGameFolder.WaitForChild("QuarrelGame/cmdr") as Folder;
export const QuarrelAssets = <T extends Record<string, Character.CharacterRig>>() => QuarrelGameFolder.WaitForChild("QuarrelGame/assets") as QuarrelAssets<T>;
export const QuarrelModels = <T extends Record<string, Character.CharacterRig>>() => QuarrelAssets<T>().model;
export const QuarrelMaps = QuarrelAssets().model.map;

interface CharacterModel
{}

export interface QuarrelAssets<CharacterModels extends CharacterModel> extends Folder
{
    model: Folder & {
        map: Folder;

        character: {
            [key in keyof CharacterModels]: Character.CharacterRig;
        };
    };
}

/**
 * Whether a character is
 * sprinting or walking.
 */
export enum SprintState
{
    Walking,
    Sprinting,
}

/**
 * An enum describing
 * the possible states an
 * Entity can be in.
 */
export enum EntityState
{
    /**
     * A state where the Entity is
     * in their most neutral state.
     */
    Idle,
    /**
     * A state where the Entity
     * is dashing.
     */
    Dash,
    /**
     * A state where the Entity
     * is walking.
     */
    Walk,

    /**
     * A state where the Entity
     * was hit.
     */
    Hitstun,
    /**
     * A state where the Entity
     * was hit while crouching.
     */
    HitstunCrouching,

    /**
     * A state where the Entity
     * was slammed down onto the
     * floor.
     */
    KnockdownHard,
    /**
     * A state where the Entity
     * was knocked off their feet
     * and landed on the floor.
     */
    Knockdown,

    /**
     * A state where the Entity
     * is crouching.
     */
    Crouch,

    /**
     * A state where the Entity is
     * blocking.
     *
     * Unused on MoveDirection-based
     * blocking.
     */
    Block,

    /**
     * A state where the Entity is
     * midair.
     */
    Midair,

    /**
     * A state where the Entity is
     * starting up their attack.
     */
    Startup,
    /**
     * A state where the Entity has
     * active hit frames.
     */
    Attack,
    /**
     * A state where the Entity is
     * vulnerable after whiffing an
     * attack.
     */
    Recovery,

    /**
     * A variant of the Recovery
     * state where the Entity is able
     * to cancel their move.
     *
     * @deprecated
     */
    RecoveryPositive,
}

/**
 * The result of a skill making
 * contact with an Entity.
 */
export enum HitResult
{
    /**
     * If the attack missed.
     */
    Whiffed,
    /**
     * If the attack was blocked.
     */
    Blocked,
    /**
     * If the hit landed.
     */
    Contact,
    /**
     * If the hit landed and put the entity in a counter state.
     */
    Counter,
}

/**
 * Results of an offensive interaction.
 */
export interface HitData<Attacked extends Entity.EntityAttributes, Attacker extends Entity.CombatantAttributes>
{
    hitResult: HitResult | Promise<HitResult>;
    attacked?: Entity.Entity<Attacked>;
    attacker: Entity.Combatant<Attacker>;
}

/**
 * The region where the Hitbox
 * will hit.
 */
export enum HitboxRegion
{
    /**
     * The attack can be blocked by
     * crouch-blocking entities only.
     */
    Low,
    /**
     * The attack can be blocked by
     * standing-blocking entities or
     * crouch-blocking entities.
     */
    High,
    /**
     * The attack can be blocked by
     * standing-blocking entities only.
     */
    Overhead,
}

/**
 * Methods of blocking.
 */
export enum BlockMode
{
    /**
     * Attacks are blocked relative to the MoveDirection
     * of the character.
     */
    MoveDirection,
    /**
     * Attacks are blocked relative to the direction
     * the character is facing.
     */
    Orientation,
}

/**
 *  Convert a percentage string to a number.
 */
export const ConvertPercentageToNumber = (percentage: string) => tonumber(percentage.match("(%d+)%%$")[0]);
/**
 * Get the tick rate.
 */
export const GetTickRate =
    () => (RunService.IsServer() ? Dependency<SchedulerService>().GetTickRate() : (ClientFunctions.GetGameTickRate().await()[1] as number | undefined));

/**
 * Make a character jump.
 */
export const Jump = (Character: Model & { Humanoid: Humanoid; PrimaryPart: BasePart; }, JumpDistance = 56) =>
{
    const { X, Y, Z } = Character.Humanoid.MoveDirection;
    const thisImpulse = new Vector3(math.sign(X), 1, math.sign(Z)).mul(Character.PrimaryPart.AssemblyMass * JumpDistance);
    Character.PrimaryPart.ApplyImpulse(thisImpulse);
    Character.Humanoid.SetAttribute("JumpDirection", Character.Humanoid.MoveDirection);

    const _conn = Character.Humanoid.GetPropertyChangedSignal("FloorMaterial").Connect(() =>
    {
        if (Character.Humanoid.FloorMaterial !== Enum.Material.Air)
        {
            _conn.Disconnect();
            Character.Humanoid.SetAttribute("JumpDirection", undefined);
        }
    });

    return Promise.resolve(true);
};

export { getEnumValues } from "shared/util/lib/other/enum";
export type ForChild<A extends {}, T extends keyof A = keyof A> = (child: T) => A[T] extends Instance ? A[T] : never;
