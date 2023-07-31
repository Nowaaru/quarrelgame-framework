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

export const ConvertPercentageToNumber = (percentage: string) => tonumber(percentage.match("(%d+)%%$")[ 0 ]);

