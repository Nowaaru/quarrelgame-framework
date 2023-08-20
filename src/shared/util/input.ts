/**
 * The medium the User is using
 * to interact with the client.
 */
export enum InputType {
    Gamepad,
    MouseKeyboard,
}

/**
 * The state of an input.
 */
export enum InputMode {
    Release,
    Press,
    Up = InputMode[ "Release" ],
    Down = InputMode[ "Press" ]
}

/**
 * Whether the input was allowed
 * or denied.
 */
export enum InputResult {
    Success,
    Fail,
}

/**
 * Whether an input was processed by the
 * game client.
 */
export enum InputProcessed {
    Processed,
    Unprocessed,
    Either,
}

/**
 * A directional input.
 */
export type CommandNormal = readonly [Motion, Input];

export enum Input {
    Dash = "DS",

    Punch = "P",
    Kick = "K",
    Slash = "S",
    Heavy = "HS",

    Roman = "RC",
    Burst = "BR"
}

export enum Motion {
    DownBack = 1,
    Down = 2,
    DownForward = 3,
    Back = 4,
    Neutral = 5,
    Forward = 6,
    UpBack = 7,
    Up = 8,
    UpForward = 9,
}

const motionDirectionLeniency = 0.85;
export function ConvertMoveDirectionToMotion(moveDirection: Vector3): readonly [keyof typeof Motion, number]
{
    // -Z is forward (for some reason), fix that
    moveDirection = new Vector3(moveDirection.X, moveDirection.Y, -moveDirection.Z);

    const moveDirectionMap: (readonly [Vector3, Motion])[] = ([
        [new Vector3(0, 1, 0), Motion.Up],
        [new Vector3(0, -1, 0), Motion.Down],
        [new Vector3(0, 0, 0.5), Motion.Forward],
        [new Vector3(0, 0.5, 0.5), Motion.UpForward],
        [new Vector3(0, 0, 0), Motion.Neutral],
        [new Vector3(0, 0.5, -0.5), Motion.UpBack],
        [new Vector3(0, -0.5, -0.5), Motion.DownBack],
        [new Vector3(0, -0.5, 0.5), Motion.DownForward],
        [new Vector3(0, 0, -1), Motion.Back],
    ] as const).map((n) => [n[ 0 ].Unit, n[ 1 ]]);

    for (const [vector, motion] of moveDirectionMap)
    {
        if (vector.Dot(moveDirection.Unit) > motionDirectionLeniency)
        {
            const out = [Motion[ motion ] as keyof typeof Motion, vector.Dot(moveDirection.Unit)] as const;
            if (vector === Vector3.zero)

                return [ Motion[ motion ] as keyof typeof Motion, 0];

            return out;
        }
    }

    return [ Motion[ Motion.Neutral ] as keyof typeof Motion, Vector3.zero.Dot(moveDirection)];
}

export type MotionInput = Array<Motion | Input>;