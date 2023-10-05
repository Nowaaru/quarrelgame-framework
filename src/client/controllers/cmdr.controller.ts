import { Controller, OnInit, OnStart } from "@flamework/core";
import { CmdrClient } from "@rbxts/cmdr";

@Controller({})
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
