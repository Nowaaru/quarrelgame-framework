import { BaseComponent, Component } from "@flamework/components";
import { Controller, OnStart, OnInit, Reflect, Modding } from "@flamework/core";
import { Mouse as ClackMouse } from "@rbxts/clack";
import { Players, UserInputService } from "@rbxts/services";
import EventEmitter from "@rbxts/task-event-emitter";
import { InputMode } from "shared/utility/input";
import { Cursor } from "./cursor.controller";

export enum MouseButton {
    Left,
    Middle,
    Right
}

export interface ScrollMovement {
    direction: ScrollDirection,
    value: number
}

export enum ScrollDirection {
    Up,
    Down
}

export interface MouseMovement {
    delta: readonly [x: number, y: number];
    position: readonly [x: number, y: number];
}

export interface OnMouseMove {
    onMouseMove?(movement: MouseMovement): void;
    onMouseWheel?(direction: ScrollMovement): void;
    onMouseButtonStateChanged?(mouseButton: MouseButton, inputMode: InputMode): void;
}

export enum LockType {
    Center,
    Current
}

@Controller({
    loadOrder: 1,
    })
export class Mouse implements OnStart
{
    constructor()
    {}

    onStart()
    {
        this.rawMouse = Players.LocalPlayer.GetMouse()!;
        Modding.onListenerAdded<OnMouseMove>((object) => this.listeners.add(object));
        Modding.onListenerRemoved<OnMouseMove>((object) => this.listeners.delete(object));

        const mouseButtonHandler = (key: InputObject, mode: InputMode) =>
        {
            switch (key.UserInputType)
            {
                case Enum.UserInputType.MouseButton1:
                    for (const listener of this.listeners)
                    {
                        if (mode === InputMode.Down)

                            this.pressedButtons.add(MouseButton.Left);

                        else this.pressedButtons.delete(MouseButton.Left);

                        listener.onMouseButtonStateChanged?.(MouseButton.Left, mode);
                    }
                    break;
                case Enum.UserInputType.MouseButton2:
                    for (const listener of this.listeners)
                    {
                        if (mode === InputMode.Down)

                            this.pressedButtons.add(MouseButton.Right);

                        else this.pressedButtons.delete(MouseButton.Right);

                        listener.onMouseButtonStateChanged?.(MouseButton.Right, mode);
                    }
                    break;
                case Enum.UserInputType.MouseButton3:
                    for (const listener of this.listeners)
                    {
                        if (mode === InputMode.Down)

                            this.pressedButtons.add(MouseButton.Middle);

                        else this.pressedButtons.delete(MouseButton.Middle);

                        listener.onMouseButtonStateChanged?.(MouseButton.Middle, mode);
                    }
            }
        };

        UserInputService.InputBegan.Connect((key) => mouseButtonHandler(key, InputMode.Down));
        UserInputService.InputEnded.Connect((key) => mouseButtonHandler(key, InputMode.Up));
        UserInputService.InputChanged.Connect((key) =>
        {
            if (key.UserInputType === Enum.UserInputType.MouseMovement)
            {
                for (const listener of this.listeners)
                {
                    listener.onMouseMove?.({
                        delta: [key.Delta.X, key.Delta.Y] as const,
                        position: [key.Position.X, key.Position.Y] as const,
                    });
                }
            }
            else if (key.UserInputType === Enum.UserInputType.MouseWheel)
            {
                for (const listener of this.listeners)
                {
                    listener.onMouseWheel?.({
                        value: key.Delta.Z,
                        direction: key.Delta.Z > 0 ? ScrollDirection.Up : ScrollDirection.Down,
                    });
                }
            }
        });
    }

    public Destroy()
    {
        if (this.isMouseLocked)

            this.clackInstance.unlockAndDestroy();

        else this.clackInstance.destroy();
    }

    public Position(): [x: number, y: number]
    {
        const currentPosition = this.clackInstance.getPosition();

        return [currentPosition.X, currentPosition.Y];
    }

    public Lock(lockType = LockType.Center)
    {
        if (!this.isMouseLocked)
        {
            this.isMouseLocked = true;
            if (lockType === LockType.Center)

                return this.clackInstance.lockCenter();

            return this.clackInstance.lock();
        }

        return this.clackInstance.unlock();
    }

    public Unlock()
    {
        return this.clackInstance.unlock();
    }

    public IsMouseLocked()
    {
        return this.isMouseLocked;
    }

    private pressedButtons: Set<MouseButton> = new Set();

    public GetPressedButtons()
    {
        return this.pressedButtons;
    }

    private isMouseLocked = false;

    private clackInstance = new ClackMouse();

    private rawMouse!: PlayerMouse;

    private listeners = new Set<OnMouseMove>();
}