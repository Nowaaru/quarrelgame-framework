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