import { Controller, OnStart, OnInit } from "@flamework/core";
import { CmdrClient } from "@rbxts/cmdr";

@Controller({})
export class CmdrController implements OnInit {
    onInit()
    {
        CmdrClient.SetActivationKeys([Enum.KeyCode.Tilde, Enum.KeyCode.Backquote])
    }
}