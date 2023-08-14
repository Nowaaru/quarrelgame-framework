import { Controller, OnStart, OnInit, OnTick } from "@flamework/core";
import { CharacterController } from "./character.controller";
import { InputMode, InputResult } from "shared/util/input";
import { GamepadButtons } from "./gamepad.controller";
import { OnRespawn } from "./client.controller";

@Controller({})
export class CharacterController3D extends CharacterController implements OnStart, OnRespawn, OnInit
{
    public keyboardDirectionMap: Map<Enum.KeyCode, Enum.NormalId> = new Map([
        [Enum.KeyCode.W, Enum.NormalId.Front],
        [Enum.KeyCode.A, Enum.NormalId.Left],
        [Enum.KeyCode.S, Enum.NormalId.Back],
        [Enum.KeyCode.D, Enum.NormalId.Right]
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