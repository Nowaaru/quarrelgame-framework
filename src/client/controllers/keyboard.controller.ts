import { Controller, Modding, OnInit, OnStart } from "@flamework/core";
import { FunctionParameters } from "@flamework/networking/out/types";
import { Keyboard as ClackKeyboard } from "@rbxts/clack";
import Signal from "@rbxts/signal";
import { InputMode, InputProcessed, InputResult } from "shared/util/input";

// TODO:
// use UserInputService

/*
 * TODO: New Implementation:
 *
 * Use ContextActionService and
 * dump all of the keys. The Keyboard
 * can expose an arbitrary onKeyPressed/onProcessedKeyPressed
 * or the user can bind specific keys through a function
 * that interfaces ContextActionService:BindAction.
 *
 * This allows for the developer to specify whether an action
 * is to override a more insignificant option (esp. for
 * transformative moves)
 */
export interface OnKeyboardInput
{
    onKeyboardInput?(buttonPressed: Enum.KeyCode, inputMode: InputMode): InputResult | boolean | (() => boolean | InputResult);
    onProcessedKeyboardInput?: OnKeyboardInput["onKeyboardInput"];
}

/*
 * The controller responsible for handling keyboard
 * inputs.
 *
 * Has a load order of 1.
 */
@Controller({
    loadOrder: 1,
})
export class Keyboard implements OnStart, OnInit
{
    private readonly clackKeyboardInstance = new ClackKeyboard();

    private keyboardListeners = new Set<OnKeyboardInput>();

    onInit(): void | Promise<void>
    {
        Modding.onListenerAdded<OnKeyboardInput>((object) =>
        {
            this.keyboardListeners.add(object);
        });
        Modding.onListenerRemoved<OnKeyboardInput>((object) =>
        {
            this.keyboardListeners.delete(object);
        });
    }

    onStart()
    {
        this.clackKeyboardInstance.keyDown.Connect((pressedKey, isProcessed) =>
        {
            const key: "allHeldKeysProcessed" | "allHeldKeys" = `allHeldKeys${isProcessed ? "Processed" : ""}`;

            if (!this[key].has(pressedKey))
                this[key].add(pressedKey);

            this.keyDown.Fire(pressedKey);
            this.keyboardListeners.forEach((keyboardInputObject) =>
            {
                if (isProcessed)

                    task.spawn(() => keyboardInputObject.onProcessedKeyboardInput?.(pressedKey, InputMode.Press));


                task.spawn(() => keyboardInputObject.onKeyboardInput?.(pressedKey, InputMode.Press));
            });
        });

        this.clackKeyboardInstance.keyUp.Connect((pressedKey, isProcessed) =>
        {
            const key: "allHeldKeysProcessed" | "allHeldKeys" = `allHeldKeys${isProcessed ? "Processed" : ""}`;

            this[key].delete(pressedKey);
            this.keyUp.Fire(pressedKey);
            this.keyboardListeners.forEach((keyboardInputObject) =>
            {
                if (isProcessed)

                    task.spawn(() => keyboardInputObject.onProcessedKeyboardInput?.(pressedKey, InputMode.Release));


                task.spawn(() => keyboardInputObject.onKeyboardInput?.(pressedKey, InputMode.Release));
            });
        });
    }

    public keyHeldFor(keyToPress: Enum.KeyCode, duration: number): Signal<() => void>
    {
        const returnedFireter = new Signal();
        let keyPressInitTime: number | undefined;

        const _cn = this.clackKeyboardInstance.keyDown.Connect((con) =>
        {
            print("lok ok 1");
            if (con === keyToPress && keyPressInitTime === undefined)
                keyPressInitTime = os.clock();
        });

        const _dn = this.clackKeyboardInstance.keyUp.Connect((con) =>
        {
            if (con !== keyToPress)
                return;

            if (keyPressInitTime === undefined)
                return;

            if (os.clock() >= keyPressInitTime + duration)
            {
                _dn.Disconnect();
                _cn.Disconnect();

                returnedFireter.Fire();
                returnedFireter.Destroy();
            }

            keyPressInitTime = undefined;
        });

        return returnedFireter;
    }

    public Puppeteer(keyToPress: Enum.KeyCode, inputMode: InputMode, isProcessed?: boolean): boolean
    {
        if (inputMode === InputMode.Release)
            this.clackKeyboardInstance.keyUp.Fire(keyToPress, !!isProcessed);
        else
            this.clackKeyboardInstance.keyDown.Fire(keyToPress, !!isProcessed);

        return true;
    }

    public isKeyDown(key: Enum.KeyCode, processFiltering = InputProcessed.Either)
    {
        return this.areKeysDown([ key ], processFiltering);
    }

    public areKeysDown(keys: Enum.KeyCode[], processFiltering = InputProcessed.Either): boolean
    {
        const allValidPressedKeys = [
            ...[ ...this.allHeldKeys ].map((k) => [ k, false ] as const),
            ...[ ...this.allHeldKeysProcessed ].map((k) => [ k, true ] as const),
        ]
            .filter(([ key, isProcessed ]) =>
            {
                return (processFiltering === InputProcessed.Either) || (processFiltering === InputProcessed.Processed && isProcessed)
                    || (processFiltering === InputProcessed.Unprocessed && !isProcessed);
            }).map(([ k ]) => k);

        return keys.filter((n, i) => keys.findIndex((l) => l === n) === i).every((k) => allValidPressedKeys.includes(k));
    }

    public readonly keyDown = new Signal<(keyPressed: Enum.KeyCode) => void>();

    public readonly keyUp = new Signal<(keyPressed: Enum.KeyCode) => void>();

    public readonly keyHeld = new Signal<(keyPressed: Enum.KeyCode, durationPressed: number) => void>();

    private readonly allHeldKeys = new Set<Enum.KeyCode>();

    private readonly allHeldKeysProcessed = new Set<Enum.KeyCode>();
}
