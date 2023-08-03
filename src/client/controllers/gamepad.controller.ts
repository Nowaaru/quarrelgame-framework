import { Controller, Modding, OnStart } from "@flamework/core";
import { Gamepad as ClackGamepad } from "@rbxts/clack";
import { InputMode, InputProcessed, InputResult } from "shared/util/input";
import { FunctionParameters } from "@flamework/networking/out/types";

import EventEmitter from "@rbxts/task-event-emitter";

export interface OnGamepadInput {
    onGamepadInput?(buttonPressed: GamepadButtons, inputMode: InputMode): (InputResult | boolean | (() => boolean | InputResult))
    onProcessedGamepadInput?(...args: FunctionParameters<OnGamepadInput["onGamepadInput"]>): ReturnType<OnGamepadInput["onGamepadInput"]>
}

export type GamepadButtons =
            Enum.KeyCode.ButtonA | Enum.KeyCode.ButtonB | Enum.KeyCode.ButtonY |
            Enum.KeyCode.ButtonX | Enum.KeyCode.ButtonL1 | Enum.KeyCode.ButtonL2 |
            Enum.KeyCode.ButtonL3 | Enum.KeyCode.ButtonR1 | Enum.KeyCode.ButtonR2 |
            Enum.KeyCode.ButtonR3 | Enum.KeyCode.ButtonSelect | Enum.KeyCode.ButtonStart |
            Enum.KeyCode.DPadLeft | Enum.KeyCode.DPadRight | Enum.KeyCode.DPadUp |
            Enum.KeyCode.DPadDown;
/**
 * @module Gamepad/Gamepad
 */
@Controller({
    loadOrder: 1,
    })

export class Gamepad implements OnStart
{
    private readonly clackGamepadInstance = new ClackGamepad();

    private readonly gamepadListeners = new Set<OnGamepadInput>();

    onInit()
    {
        Modding.onListenerAdded<OnGamepadInput>((object) =>
        {
            this.gamepadListeners.add(object);
        });
        Modding.onListenerRemoved<OnGamepadInput>((object) =>
        {
            this.gamepadListeners.delete(object);
        });
    }

    onStart()
    {

        this.clackGamepadInstance.buttonDown.Connect((pressedButton, wasProcessed) =>
        {
            this.buttonDown.emit(pressedButton);
        });
        this.clackGamepadInstance.buttonUp.Connect((pressedButton, wasProcessed) =>
        {
            this.buttonUp.emit(pressedButton);
            this.gamepadListeners.forEach((gamepadInputObject) =>
            {

                if (wasProcessed)
                {
                    gamepadInputObject.onProcessedGamepadInput?.(pressedButton, InputMode.Release);

                    return;
                }

                gamepadInputObject.onGamepadInput?.(pressedButton, InputMode.Release);
            });
        });
    }

    public ButtonHeldFor(buttonToPress: GamepadButtons, duration: number): EventEmitter<[]>
    {
        const returnedEmitter = new EventEmitter();
        let buttonPressInitTime: number | undefined;


        const _cn = this.clackGamepadInstance.buttonDown.Connect((con) =>
        {
            buttonPressInitTime = os.clock();
        });

        const _dn = this.clackGamepadInstance.buttonUp.Connect((con) =>
        {
            if (typeIs(buttonPressInitTime, "nil")) return;
            if (buttonPressInitTime! >= duration)
            {
                _dn.Disconnect();
                _cn.Disconnect();

                returnedEmitter.emit();
            }
            buttonPressInitTime = undefined;
        });

        return returnedEmitter;
    }

    public Puppeteer(buttonToPress: GamepadButtons, inputMode: InputMode, isProcessed?: boolean): boolean
    {
        if (inputMode === InputMode.Release)

            this.clackGamepadInstance.buttonUp.Fire(buttonToPress, !!isProcessed);

        else this.clackGamepadInstance.buttonDown.Fire(buttonToPress, !!isProcessed);

        return true;
    }

    public areButtonsDown(buttons: GamepadButtons[], processFiltering = InputProcessed.Either): boolean
    {
        const allValidPressedButtons = (
            [...[...this.allHeldButtons].map((k) => <const>[k, false]),
                ...[...this.allHeldButtonsProcessed].map((k) => <const>[k, true])
            ]
        ).filter(([key, isProcessed]) =>
        {
            return (processFiltering === InputProcessed.Either) ||
                (processFiltering === InputProcessed.Processed && isProcessed) ||
                (processFiltering === InputProcessed.Unprocessed && !isProcessed);
        }).map(([k]) => k);

        return buttons.filter((n,i) => buttons.findIndex((l) => l === n) === i).every((k) => allValidPressedButtons.includes(k));
    }

    public readonly buttonDown = new EventEmitter<[buttonPressed: GamepadButtons]>();

    public readonly buttonUp = new EventEmitter<[buttonPressed: GamepadButtons]>();

    public readonly buttonHeld = new EventEmitter<[buttonPressed: GamepadButtons, durationPressed: number]>();

    private readonly allHeldButtons = new Set<Enum.KeyCode>();

    private readonly allHeldButtonsProcessed = new Set<Enum.KeyCode>();
}
