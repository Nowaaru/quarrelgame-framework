import { Controller, OnInit, OnStart, OnTick } from "@flamework/core";
import { InputMode, InputResult } from "shared/util/input";
import { CharacterController } from "./character.controller";
import { OnRespawn } from "./client.controller";
import { GamepadButtons } from "./gamepad.controller";

@Controller({})
export class CharacterController3D extends CharacterController implements OnStart, OnRespawn, OnInit
{
    public keyboardDirectionMap: Map<Enum.KeyCode, Enum.NormalId> = new Map([
        [Enum.KeyCode.W, Enum.NormalId.Front],
        [Enum.KeyCode.A, Enum.NormalId.Left],
        [Enum.KeyCode.S, Enum.NormalId.Back],
        [Enum.KeyCode.D, Enum.NormalId.Right],
    ] as [Enum.KeyCode, Enum.NormalId][]);

    onGamepadInput(buttonPressed: GamepadButtons, inputMode: InputMode): boolean | InputResult | (() => boolean | InputResult)
    {
        return false;
    }

    onInit()
    {
    }

    onStart()
    {
    }
}
