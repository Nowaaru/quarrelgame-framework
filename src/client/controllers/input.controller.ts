import { Controller, Modding, OnInit, OnStart } from "@flamework/core";
import { ContextActionService, UserInputService } from "@rbxts/services";
import { OnRespawn } from "./client.controller";

export interface MouseEvents
{
    onMouseMoved?(mousePosition: Vector2, delta: Vector2): void;
    onMouseClick?(at: Vector2): void;
    onFocusLost?(when: number): void;
    onFocusGained?(when: number): void;
}

export interface KeyboardEvents
{
    onKeyPressed?(inputObject: InputObject): void;
    onKeyReleased?(inputObject: InputObject): void;
}

@Controller({})
export default class Input implements OnStart, OnInit, OnRespawn
{
    protected MouseEventListeners: Set<MouseEvents> = new Set();
    protected KeyboardEventListeners: Set<KeyboardEvents> = new Set();

    constructor()
    {}

    onRespawn(): void {
        // Remove all original Roblox keybinds before continuing.
        for (const [ ActionName ] of [...ContextActionService.GetAllBoundActionInfo()].filter((e) => e[0].match("Rbx")[0] !== undefined))

            ContextActionService.UnbindAction(ActionName)
    }

    onInit()
    {
        Modding.onListenerAdded<MouseEvents>((listener) =>
        {
            this.MouseEventListeners.add(listener);
        })

        Modding.onListenerRemoved<MouseEvents>((listener) =>
        {
            this.MouseEventListeners.delete(listener);
        })

        Modding.onListenerAdded<KeyboardEvents>((listener) =>
        {
            this.KeyboardEventListeners.add(listener);
        })

        Modding.onListenerRemoved<KeyboardEvents>((listener) =>
        {
            this.KeyboardEventListeners.delete(listener);
        })
    }

    private gameFocused = false;
    onStart(): void 
    {
        ContextActionService.BindAction(
            "GenericMouse", 
            (name, _, obj) => this.GenericMouseInputHandler(name, obj), 
            false,
            Enum.UserInputType.MouseMovement)

        ContextActionService.BindAction(
            "GenericKeyboard", 
            (name, _, obj) => this.GenericKeyboardInputHandler(name, obj), 
            false,
            Enum.UserInputType.Keyboard);

        UserInputService.WindowFocused.Connect(() =>
        {
            this.gameFocused = true;
            for (const listener of this.MouseEventListeners)

                task.spawn(() => listener.onFocusGained?.(DateTime.now().UnixTimestampMillis))
        })

        UserInputService.WindowFocusReleased.Connect(() =>
        {
            this.gameFocused = false;
            for (const listener of this.MouseEventListeners)

                task.spawn(() => listener.onFocusLost?.(DateTime.now().UnixTimestampMillis))
        })
    }

    public RegisterInputClass(inputClass: string)
    {
        /* FIXME:
         * my god i hope i stub
         * my toe
         */
        return new 
            (class InputClass {
                public BindInput(actionName: string, inputHandler: (inputObject: InputObject) => Enum.ContextActionResult | boolean | undefined | void, keys: (Enum.KeyCode | Enum.UserInputType)[])
                {
                    const actionId = `ShooterGame.${inputClass}.${actionName}`;
                    ContextActionService.BindAction(actionId, (_,__,inputObject) => inputHandler(inputObject), false, ...keys)

                    return new 
                        (class Keybind {
                            public Unbind()
                            {
                                ContextActionService.UnbindAction(actionId);
                                return true;
                            }
                        })()
                }
            })();
    }

    private GenericMouseInputHandler(actionName: string, inputObject: InputObject)
    {
        if (!this.gameFocused)

            return;
            
        const Position2D = new Vector2(inputObject.Position.X, inputObject.Position.Y);
        const Delta2D = new Vector2(inputObject.Delta.X, inputObject.Delta.Y);
        for (const listener of this.MouseEventListeners)

            task.spawn(() => listener.onMouseMoved?.(Position2D, Delta2D));
    }

    private GenericKeyboardInputHandler(actionName: string, inputObject: InputObject)
    {
        if (!this.gameFocused)

            return;

        switch (inputObject.UserInputState)
        {
            case Enum.UserInputState.Begin:

                for (const listener of this.KeyboardEventListeners)

                    task.spawn(() => listener.onKeyPressed?.(inputObject))

            break;

            case Enum.UserInputState.End:

                for (const listener of this.KeyboardEventListeners)

                    task.spawn(() => listener.onKeyReleased?.(inputObject))

            break;
        }

    }
}
