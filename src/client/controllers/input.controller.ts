import { Components } from "@flamework/components";
import { Controller, Dependency, Modding, OnInit, OnStart } from "@flamework/core";
import { Clack, Gamepad as ClackGamepad, Prefer } from "@rbxts/clack";
import { Players } from "@rbxts/services";

import Signal from "@rbxts/signal";
import { Gamepad, type GamepadButtons, OnGamepadInput } from "client/controllers/gamepad.controller";
import { Keyboard, OnKeyboardInput } from "client/controllers/keyboard.controller";
import { Mouse } from "client/controllers/mouse.controller";

import { InputMode, InputResult, InputType } from "shared/util/input";

export interface OnInputTypeChange
{
    onInputTypeChange(newInputType: InputType): void;
}

export { GamepadButtons, OnGamepadInput } from "client/controllers/gamepad.controller";
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
        public readonly gamepad: Gamepad,
    )
    {}

    onInit()
    {
        print("Main controller initialized.");
        this.prefer = new Prefer();
    }

    onGamepadInput(buttonPressed: GamepadButtons, inputMode: InputMode): InputResult | boolean | (() => boolean | InputResult)
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
                    this.InputTypeChanged.Fire(InputType.Gamepad);
                    break;

                default:
                    /* falls through */
                case Clack.InputType.MouseKeyboard:
                    this.InputTypeChanged.Fire(InputType.MouseKeyboard);
                    break;
            }
        });

        Modding.onListenerAdded<OnInputTypeChange>((object) => this.inputChangedListeners.add(object));
        Modding.onListenerRemoved<OnInputTypeChange>((object) => this.inputChangedListeners.delete(object));

        this.InputTypeChanged.Connect((newInputType) =>
        {
            for (const inputChangedListener of this.inputChangedListeners)
                inputChangedListener.onInputTypeChange(newInputType);
        });
    }

    public GetInputType()
    {
        return this.prefer.getPreferredInput() === Clack.InputType.Gamepad ? InputType.Gamepad : InputType.MouseKeyboard;
    }

    public InputTypeChanged = new Signal<(NewInput: InputType) => void>();

    private prefer!: Prefer;
}
