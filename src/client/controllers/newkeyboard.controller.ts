import Signal from "@rbxts/signal";
import { Controller, OnStart, OnInit } from "@flamework/core"
import { ContextActionService, RunService } from "@rbxts/services"
import { InputMode } from "shared/util/input";

type Callable<T extends defined, Signature extends Callback> = T & Signature;

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
 *
 * Should be used in place of ContextActionService and 
 * UserInputService as this satisfies both.
 */

/*
 * The controller responsible for handling keyboard
 * inputs.
 *
 * Has a load order of 1.
 */

interface OnKeyPressed 
{
    onKeyboardInput(actionName: string, inputState: Enum.UserInputState, inputObject: InputObject): void;
}

/*
 * A class that represents a keyboard input
 * that is directly connected to the distance
 * between two instances.
 */
class Leash 
{
    public LeashBroken: Signal<() => void> = new Signal();

    constructor(position: Vector3, instance: PVInstance, range: number = 50)
    {
        let heartbeatConnection: RBXScriptConnection | void = RunService.Heartbeat.Connect(() =>
        {
            if (instance.GetPivot().Position.sub(position).Magnitude >= 50)
            {
                this.LeashBroken.Fire();
                task.defer(() => this.LeashBroken.Destroy())

                heartbeatConnection = heartbeatConnection?.Disconnect();
            }
        })
    }
}


class Keybind
{
    constructor(Key: Enum.KeyCode, ActionName: string, ActionState: InputMode = InputMode.Down)
    {
        this.Key = Key;
        this.ActionName = ActionName;
        this.ActionState = ActionState;

        const currentMetatable = getmetatable(this) as LuaMetatable<Keybind>;
        currentMetatable.__call = (_, ...args: unknown[]) =>
        {
            this.Action?.(...args);
        }
    }

    public readonly Key: Enum.KeyCode;

    public readonly ActionName: string

    public readonly ActionState: InputMode;

    private readonly Action: (...args: unknown[]) => void = () => undefined;

    public Priority: number = math.huge;
}

@Controller({
    loadOrder: 1,
})
export class Keyboard implements OnStart, OnInit
{
    private readonly Keybinds = new Map<Enum.KeyCode, Array<Keybind>>();

    onStart(): void 
    {
        ContextActionService.BindAction("QGFInputProcessor", 
            (actionName: string, state: Enum.UserInputState, inputObject: InputObject) => 
            {
                this.genericInputProcessor(actionName, state, inputObject);
            },
            false,
            ...Enum.KeyCode.GetEnumItems());
    }

    onInit(): void | Promise<void> 
    {
        ContextActionService.UnbindAllActions()
    }

    public Bind(keyCode: Enum.KeyCode): Callable<Keybind, Keybind["Action"]>
    {
        error("This function has not been implemented.");
        

        return 1 as unknown as never;
    }

    public Unbind(binding: Keybind | Enum.KeyCode)
    {
        switch (typeOf(binding))
        {
            case "table":
            {
                const bindingKey = (binding as Keybind).Key;
                if (!bindingKey)

                    this.Keybinds.set(bindingKey, []);

                const bindingArray = this.Keybinds.get(bindingKey);
                const bindingIndex = bindingArray?.findIndex((e) => e === binding);
                if (bindingIndex && bindingIndex !== -1)

                    bindingArray!.remove(bindingIndex);

                break;
            }

            case "EnumItem":
                this.Keybinds.set(binding as Enum.KeyCode, []);
                break;

            default:
                error(`invalid binding parameter type: ${typeOf(binding)}`)
        }
    }

    private genericInputProcessor(actionName: string, inputState: Enum.UserInputState, inputObject: InputObject)
    {
        return true;
    }
}
