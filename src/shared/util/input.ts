import Character, { Skill } from "./character";

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

const rawDirectionMap: (readonly [Vector3, Motion])[] = ([
    [ new Vector3(0, 0.5), Motion.Up ],
    [ new Vector3(0.5, 0.5), Motion.UpForward ],
    [ new Vector3(-0.5, 0.5), Motion.UpBack ],
    [ new Vector3(0, -0.5), Motion.Down ],
    [ new Vector3(0.5, -0.5), Motion.DownForward ],
    [ new Vector3(-0.5, -0.5), Motion.DownBack ],
    [ new Vector3(0, 0), Motion.Neutral ],
    [ new Vector3(0.5, 0), Motion.Forward ],
    [ new Vector3(-0.5, 0), Motion.Back ],
] as const).map((n) => [ n[0], n[1] ]);

const moveDirectionMap: typeof rawDirectionMap = rawDirectionMap.map((n) => [ n[0].Unit, n[1] ]);

export function ConvertMoveDirectionToMotion(moveDirection: Vector3): readonly [motion: keyof typeof Motion, dot: number]
{
    moveDirection = new Vector3(moveDirection.X, moveDirection.Y, -moveDirection.Z);
    const closest = moveDirectionMap.map(([ vector, motion ]) =>
    {
        const dotCurr = vector.Dot(moveDirection.Unit);

        return [ Motion[motion], dotCurr ] as const;
    }).filter(([ , dot ]) => dot > 0).sort(([ , a ], [ , b ]) => a < b)
        .reduce((acc, cur) =>
        {
            const [ , dot ] = cur;
            if (dot > acc[1])
                return cur;

            return acc;
        }, [ Motion[Motion.Neutral], 0 ] as readonly [string, number]);

    return closest as never;
}

export function ConvertMotionToMoveDirection(motion: Motion): Vector3
{
    for (const [ moveDirection, value ] of rawDirectionMap)
    {
        if (motion === value)
            return moveDirection;
    }

    return Vector3.zero;
}

function temporarySwap(array: unknown[])
{
    let left = undefined;
    let right = undefined;
    const length = array.size();
    for (left = 0, right = length - 1; left < right; left += 1, right -= 1)
    {
        const temporary = array[left];
        array[left] = array[right];
        array[right] = temporary;
    }

    return array;
}

/**
 * Search `character`'s skills and return an array of
 * all skills that are similar to `motion`, sorted
 * by heat and filtering non-correlating entries.
 *
 * TODO: Check for general cardinal direction navigation by
 * looking for specific directions within the non-cardinal
 * directions (S/NW, S/NE), DownLeft should qualify for Down and Left.
 */
export function validateMotion(input: (Motion | Input)[], character: Character.Character, minHeat: number = 2): Skill.Skill[] | undefined
{
    const { Skills } = character;
    const reversedInput = temporarySwap(input);

    const filteredSkills = [ ...Skills ].mapFiltered((skill) =>
    {
        const { MotionInput } = skill;
        const reversedMotion = temporarySwap([ ...MotionInput ]);

        let heat = 0;
        for (const [ i, input ] of pairs(reversedInput))
        {
            // print("!!", reversedMotion[i - 1], input, reversedMotion.size(), "/", reversedInput.size());
            if (reversedMotion[i - 1] === input)
                heat++;
        }

        if (heat >= minHeat)
            return [ heat, skill ] as const;

        return undefined;
    });

    return filteredSkills.size() > 0 ? filteredSkills.map(([ , skill ]) => skill) : undefined;
}

export const isCommandNormal = (attack: unknown[]): attack is [Motion, Input] => !!(Motion[attack[0] as Motion] && Input[attack[1] as never]) && attack.size() === 2;
export function isInput(input: unknown): input is Input
{
    return !!Input[input as never];
}

export function GenerateRelativeVectorFromNormalId(
    relativeTo: CFrame,
    normal: Enum.NormalId,
)
{
    return relativeTo.VectorToWorldSpace(Vector3.FromNormalId(normal));
}

export function isCurrentMotionDashInput(
    inputs: MotionInput
)
{
    const motionSize = inputs.size()
    if (motionSize < 4)
        return false;

    const primaryInput = inputs[motionSize - 1];
    return primaryInput !== Motion.Neutral && primaryInput && inputs[motionSize - 3] === primaryInput && inputs[motionSize - 4]
}

export type MotionInput = Array<Motion | Input>;
