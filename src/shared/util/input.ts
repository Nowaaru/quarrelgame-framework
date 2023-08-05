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
    Up = 8,
    UpForward = 9,
    Forward = 5,
    DownForward = 3,
    Down = 2,
    DownBack = 1,
    Back = 4,
    UpBack = 7,
}

export type MotionInput = Array<Motion | Input>;