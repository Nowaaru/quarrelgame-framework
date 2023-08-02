import { Players } from "@rbxts/services";

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

export enum EntityState {
    Idle,
    Dash,
    Walk,

    KnockdownHard,
    KnockdownSoft,
    Knockdown,

    Crouch,
    CrouchBlocking,

    Midair,
    Attacking,
}

export const ConvertPercentageToNumber = (percentage: string) => tonumber(percentage.match("(%d+)%%$")[ 0 ]);
export { getEnumValues } from "shared/utility/lib/other/enum";

