/**
 * The medium the User is using
 * to interact with the client.
 */
export enum InputType
{
    Gamepad,
    MouseKeyboard,
}

/**
 * The state of an input.
 */
export enum InputMode
{
    Release,
    Press,
    Up = InputMode["Release"],
    Down = InputMode["Press"],
}

/**
 * Whether the input was allowed
 * or denied.
 */
export enum InputResult
{
    Success,
    Fail,
}

/**
 * Whether an input was processed by the
 * game client.
 */
export enum InputProcessed
{
    Processed,
    Unprocessed,
    Either,
}

/**
 * A directional input.
 */
export type CommandNormal = [Motion, Input];

/**
 * An input that translates to an attack in the game.
 */
export enum Input
{
    Dash = "DS",
    Dust = "DT",
    Sweep = "SP",

    Punch = "P",
    Kick = "K",
    Slash = "S",
    Heavy = "HS",

    Roman = "RC",
    Burst = "BR",
}

/**
 * A direction of movement.
 */
export enum Motion
{
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
        [ new Vector3(0, 1, 0), Motion.Up ],
        [ new Vector3(0, 0.5, 0.5), Motion.UpForward ],
        [ new Vector3(0, 0.5, -0.5), Motion.UpBack ],
        [ new Vector3(0, -1, 0), Motion.Down ],
        [ new Vector3(0, -0.5, 0.5), Motion.DownForward ],
        [ new Vector3(0, -0.5, -0.5), Motion.DownBack ],
        [ new Vector3(0, 0, 0.5), Motion.Forward ],
        [ new Vector3(0, 0, 0), Motion.Neutral ],
        [ new Vector3(0, 0, -1), Motion.Back ],
    ] as const).map((n) => [ n[0].Unit, n[1] ]);

    // const closest: [keyof typeof Motion, number] = [ Motion[Motion.Neutral] as keyof typeof Motion, 0 ];

    // for (const [ vector, motion ] of moveDirectionMap)
    // {
    //     const dot = vector.Dot(moveDirection.Unit);
    //     const [ closestMotion, closestDot ] = closest;
    //
    //     if (dot > closestDot)
    //     {
    //         // const out = [ Motion[motion] as keyof typeof Motion, vector.Dot(moveDirection.Unit) ] as const;
    //         closest.clear();
    //         closest.push(Motion[motion] as keyof typeof Motion, dot);
    //
    //         print(Motion[motion], ">", closestMotion, "::", dot);
    //         // if (vector === Vector3.zero)
    //         // return [ Motion[motion] as keyof typeof Motion, 0 ];
    //
    //         // return out;
    //     }
    // }

    const closest = moveDirectionMap.reduce((acc, curr, idx) =>
    {
        const [ vector, motion ] = curr;
        const [ vecAcc, dotAcc ] = acc;
        const dotCurr = vector.Dot(moveDirection.Unit);

        print("yeah:", dotCurr, dotAcc, moveDirection.Unit, Motion[motion]);
        if (dotCurr > dotAcc)
            return [ Motion[motion] as keyof typeof Motion, dotCurr ];

        return acc;
    }, [ Motion[Motion.Neutral] as keyof typeof Motion, 0 ]);

    return closest as never; // [ Motion[Motion.Neutral] as keyof typeof Motion, Vector3.zero.Dot(moveDirection) ];
}

export const isCommandNormal = (attack: unknown[]): attack is [Motion, Input] => !!(Motion[attack[0] as Motion] && Input[attack[1] as never]) && attack.size() === 2;
export function isInput(input: unknown): input is Input
{
    return !!Input[input as never];
}

export type MotionInput = Array<Motion | Input>;
