import { Controller, Modding, OnInit, OnStart } from "@flamework/core";
import { FunctionParameters } from "@flamework/networking/out/types";
import { Keyboard as ClackKeyboard } from "@rbxts/clack";
import { InputMode, InputProcessed, InputResult } from "shared/util/input";

import EventEmitter from "@rbxts/task-event-emitter";

export interface OnKeyboardInput
{
    onKeyboardInput?(buttonPressed: Enum.KeyCode, inputMode: InputMode): InputResult | boolean | (() => boolean | InputResult);
    onProcessedKeyboardInput?(...args: FunctionParameters<OnKeyboardInput["onKeyboardInput"]>): ReturnType<OnKeyboardInput["onKeyboardInput"]>;
}

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

            this.keyDown.emit(pressedKey);
            this.keyboardListeners.forEach((keyboardInputObject) =>
            {
                if (isProcessed)
                {
                    keyboardInputObject.onProcessedKeyboardInput?.(pressedKey, InputMode.Press);

                    return;
                }

                keyboardInputObject.onKeyboardInput?.(pressedKey, InputMode.Press);
            });
        });

        this.clackKeyboardInstance.keyUp.Connect((pressedKey, isProcessed) =>
        {
            const key: "allHeldKeysProcessed" | "allHeldKeys" = `allHeldKeys${isProcessed ? "Processed" : ""}`;

            this[key].delete(pressedKey);
            this.keyUp.emit(pressedKey);
            this.keyboardListeners.forEach((keyboardInputObject) =>
            {
                if (isProcessed)
                {
                    keyboardInputObject.onProcessedKeyboardInput?.(pressedKey, InputMode.Release);

                    return;
                }

                keyboardInputObject.onKeyboardInput?.(pressedKey, InputMode.Release);
            });
        });
    }

    public keyHeldFor(keyToPress: Enum.KeyCode, duration: number): EventEmitter<[]>
    {
        const returnedEmitter = new EventEmitter();
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

                returnedEmitter.emit();
                returnedEmitter.destroy();
            }

            keyPressInitTime = undefined;
        });

        return returnedEmitter;
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

    public readonly keyDown = new EventEmitter<[keyPressed: Enum.KeyCode]>();

    public readonly keyUp = new EventEmitter<[keyPressed: Enum.KeyCode]>();

    public readonly keyHeld = new EventEmitter<[keyPressed: Enum.KeyCode, durationPressed: number]>();

    private readonly allHeldKeys = new Set<Enum.KeyCode>();

    private readonly allHeldKeysProcessed = new Set<Enum.KeyCode>();
}
