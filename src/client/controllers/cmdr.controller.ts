import { Controller, OnInit, OnStart } from "@flamework/core";
import { CmdrClient } from "@rbxts/cmdr";

/*
 * The controller responsible for handling the
 * command backend for the framework. Utilizes `@rbxts/cmdr`.
 *
 * Has a priority of -1.
 */
@Controller({
    loadOrder: -1,
})
export class CommandController implements OnInit
{
    private activationKeys: Enum.KeyCode[] = new Array<Enum.KeyCode>();

    onInit()
    {
        this.applyActivationKeys();
    }

    private applyActivationKeys()
    {
        CmdrClient.SetActivationKeys(this.activationKeys);
    }

    public SetKeys(...keys: Enum.KeyCode[])
    {
        this.activationKeys = keys;
        this.applyActivationKeys();
    }
}
