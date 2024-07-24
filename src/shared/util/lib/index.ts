import { Dependency } from "@flamework/core";
import { Players, ReplicatedStorage, RunService } from "@rbxts/services";
import { ClientFunctions } from "shared/network";

import type { Entity } from "server/components/entity.component";
import type MapNamespace from "server/components/map.component";
import type { ParticipantAttributes } from "server/components/participant.component";
import type { MatchPhase, MatchSettings, MatchState } from "server/services/matchservice.service";
import type { SchedulerService } from "server/services/scheduler.service";
import type Character from "shared/util/character";

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

export enum SessionType
{
    Singleplayer,
    Multiplayer,
}

export interface MatchData
{
    /** The match's settings. */
    Settings: MatchSettings;

    /** The match's current state. */
    Phase: MatchPhase;

    /** The IDs of the match's current participants. */
    Participants: Array<ParticipantAttributes>;

    /** The match's current state. */
    State: MatchState<
        Entity.PlayerCombatantAttributes,
        Entity.EntityAttributes
    >;

    /** The match's current map. */
    Map: Folder;

    /** The match's current arena. */
    Arena: Model & {
        /** The model of the arena. */
        model: Folder;
        /** Arena parameters. */
        config: MapNamespace.ConfigurationToValue;
        /** Arena controller. */
        script?: Actor;
    };

    MatchId: string;
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
     * A state where the Entity is
     * blocking.
     *
     * Unused on MoveDirection-based
     * blocking.
     */
    Block,

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
     * A state where the Entity
     * is about to jump.
     */
    Jumping,

    /**
     * A state where the Entity is
     * midair.
     */
    Midair,

    /**
     * A state where the Entity
     * is landing.
     */
    Landing,

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

export function isStateNegative(state: EntityState)
{
    return [
        EntityState.Startup,
        EntityState.Recovery,
        EntityState.Attack,
        EntityState.Hitstun,
        EntityState.HitstunCrouching,
        EntityState.Knockdown,
        EntityState.KnockdownHard,
        EntityState.Jumping,
        EntityState.Landing,
        EntityState.Dash,
    ].includes(state);
}

export function isStateCounterable(state: EntityState)
{
    return [ EntityState.Startup, EntityState.Attack ].includes(state);
}

export function isStateAggressive(state: EntityState)
{
    return [
        EntityState.Startup,
        EntityState.Attack,
        EntityState.Recovery,
    ].includes(state);
}

export function isStateNeutral(state: EntityState)
{
    return [
        EntityState.Idle,
        EntityState.Crouch,
        EntityState.Walk,
        EntityState.Jumping,
        EntityState.Midair,
        EntityState.Landing,
    ].includes(state);
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
export const Jump = (Character: Model & { Humanoid: Humanoid; PrimaryPart: BasePart; }, JumpDistance = 26) =>
{
    const { X, Y, Z } = Character.Humanoid.MoveDirection;
    const thisImpulse = new Vector3(math.sign(0), 1, math.sign(0)).mul(Character.PrimaryPart.AssemblyMass * JumpDistance);
    Character.PrimaryPart.ApplyImpulse(thisImpulse);
    Character.Humanoid.SetAttribute("JumpDirection", Character.Humanoid.MoveDirection);

    if (Character.GetAttribute("State") === EntityState.Jumping)
    {
        const _conn = Character.Humanoid.GetPropertyChangedSignal("FloorMaterial").Connect(() =>
        {
            if (Character.Humanoid.FloorMaterial !== Enum.Material.Air)
            {
                _conn.Disconnect();
                Character.Humanoid.SetAttribute("JumpDirection", undefined);
            }
        });
    }

    return Promise.resolve(true);
};

/**
 * Make a character dash.
 */
export const PhysicsDash = (Character: Model & { Humanoid: Humanoid; PrimaryPart: BasePart; }, direction = Character.PrimaryPart.CFrame.LookVector.mul(-1), dashPower = 28, conserveMomentum = true) =>
{
    const thisImpulse = direction.Unit.mul(Character.PrimaryPart.AssemblyMass * dashPower);

    if (conserveMomentum)
        Character.PrimaryPart.ApplyImpulse(thisImpulse);
    else
        Character.PrimaryPart.AssemblyLinearVelocity = thisImpulse;

    return Promise.resolve(true);
};

export const ConstraintDash = (Character: Model & { Humanoid: Humanoid; PrimaryPart: BasePart; }, direction = Character.PrimaryPart.CFrame.LookVector.mul(-1), dashPower = 28, conserveMomentum = true) =>
{
    const thisImpulse = direction.Unit;
    const entityAttachment = Character.PrimaryPart.FindFirstChild("MainAttachment");
    assert(entityAttachment, "mainattachment could not be found");

    return Promise.resolve(true);
}

export const CFrameDash = (Character: Model & { Humanoid: Humanoid; PrimaryPart: BasePart; }, direction = Character.PrimaryPart.CFrame.LookVector.mul(-1), dashPower = 28, conserveMomentum = true) =>
{
    const thisImpulse = direction.Unit;
    const entityAttachment = Character.PrimaryPart.FindFirstChild("MainAttachment");
    assert(entityAttachment, "mainattachment could not be found");

    return Promise.resolve(true);
}

/**
 * Remove the Y component of a Vector or CFrame.
 * Good for determining whether a character is facing another
 * only on a specific set of axes.
 */
export function NullifyYComponent(item: CFrame): CFrame;
export function NullifyYComponent(item: Vector3): Vector3;
export function NullifyYComponent(
    item: Vector3 | CFrame,
): Vector3 | CFrame
{
    return (typeIs(item, "CFrame") ? new CFrame(item.Position.mul(new Vector3(1, 0, 1))).mul(item.Rotation) : item.mul(new Vector3(1, 0, 1)));
}

export { getEnumValues } from "shared/util/lib/other/enum";
export type ForChild<A extends {}, T extends keyof A = keyof A> = (child: T) => A[T] extends Instance ? A[T] : never;
