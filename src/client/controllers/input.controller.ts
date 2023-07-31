import { Components } from "@flamework/components";
import { Controller, OnStart, OnInit, Dependency, Modding } from "@flamework/core";
import { Prefer, Clack, Gamepad as ClackGamepad } from "@rbxts/clack";
import { Players } from "@rbxts/services";

import { Keyboard, OnKeyboardInput } from "client/controllers/keyboard.controller";
import { Mouse } from "client/controllers/mouse.controller";
import { Gamepad, OnGamepadInput, type GamepadButtons } from "client/controllers/gamepad.controller";
import EventEmitter from "@rbxts/task-event-emitter";
import { Signal, SignalCallback, SignalParams, SignalWait } from "@rbxts/beacon";

import { InputType, InputMode, InputResult } from "shared/utility/input";

export interface OnInputTypeChange {
    onInputTypeChange(newInputType: InputType): void;
}

export { OnGamepadInput, GamepadButtons } from "client/controllers/gamepad.controller";
export { OnKeyboardInput } from "client/controllers/keyboard.controller";

/**
 * @description High-level combined interface of the classes {@link Gamepad Gamepad}, {@link Mouse Mouse}, and {@link Keyboard Keyboard}
 * Exports several utility lifetime events.
 */
@Controller({
    loadOrder: 2,
    })
export class Input implements OnStart, OnInit, OnGamepadInput
{

    private inputChangedListeners = new Set<OnInputTypeChange>();

    constructor(
        public readonly keyboard: Keyboard,
        public readonly mouse: Mouse,
        public readonly gamepad: Gamepad
    )
    {}

    onInit()
    {
        print("Main controller initialized.");
        this.prefer = new Prefer();
    }

    onGamepadInput(buttonPressed: GamepadButtons, inputMode: InputMode): (InputResult | boolean | (() => boolean | InputResult))
    {
        return () => true;
    }

    onStart()
    {
        this.prefer.observePreferredInput((newInputType) =>
        {
            switch ( newInputType )
            {
                case Clack.InputType.Gamepad:
                    this.InputTypeChanged.emit(InputType.Gamepad);
                    break;

                default:
                    /* falls through */
                case Clack.InputType.MouseKeyboard:
                    this.InputTypeChanged.emit(InputType.MouseKeyboard);
                    break;

            }
        });

        Modding.onListenerAdded<OnInputTypeChange>((object) => this.inputChangedListeners.add(object));
        Modding.onListenerRemoved<OnInputTypeChange>((object) => this.inputChangedListeners.delete(object));

        this.InputTypeChanged.subscribe((newInputType) =>
        {
            for (const inputChangedListener of this.inputChangedListeners)

                inputChangedListener.onInputTypeChange(newInputType);
        });
    }

    public GetInputType()
    {
        return this.prefer.getPreferredInput() === Clack.InputType.Gamepad ? InputType.Gamepad : InputType.MouseKeyboard;
    }

    public InputTypeChanged = new EventEmitter<[NewInput: InputType]>();

    private prefer!: Prefer;
}