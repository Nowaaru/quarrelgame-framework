import { Dependency } from "@flamework/core";
import { Players, RunService } from "@rbxts/services";
import { ClientFunctions } from "shared/network";

import type { SchedulerService } from "server/services/scheduler.service";

declare global
{
    class Error
    {
        public readonly why: string;

        public ToString(): string
    }

    interface ErrorKind
    {
        why: string;
    }
}

export enum SprintState {
    Walking,
    Sprinting
}

/**
 * An enum describing
 * the possible states an
 * Entity can be in.
 */
export enum EntityState {
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
export enum HitResult {
    Whiffed,
    Blocked,
    Contact,
    Counter,
}

/**
 * The region where the Hitbox
 * will hit.
 */
export enum HitboxRegion {
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
    Overhead
}

export enum BlockMode {
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

export const ConvertPercentageToNumber = (percentage: string) => tonumber(percentage.match("(%d+)%%$")[ 0 ]);
export const GetTickRate = () => (RunService.IsServer()
    ? Dependency<SchedulerService>().GetTickRate()
    : (ClientFunctions.GetGameTickRate().await()[ 1 ] as number | undefined));

export { getEnumValues } from "shared/util/lib/other/enum";

