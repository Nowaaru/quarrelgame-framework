export enum InputType {
    Gamepad,
    MouseKeyboard,
}

export enum InputMode {
    Release,
    Press,
    Up = InputMode[ "Release" ],
    Down = InputMode[ "Press" ]
}

export enum InputResult {
    Success,
    Fail,
}

export enum InputProcessed {
    Processed,
    Unprocessed,
    Either,
}

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