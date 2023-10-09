import { Controller, Dependency, OnInit, OnStart, OnTick } from "@flamework/core";
import { OnMatchRespawn } from "client/controllers/client.controller";
import { Gamepad, GamepadButtons } from "client/controllers/gamepad.controller";
import { Keyboard } from "client/controllers/keyboard.controller";
import { MatchController } from "client/controllers/match.controller";
import { Mouse } from "client/controllers/mouse.controller";
import { CharacterController } from "client/module/character";
import { InputMode, InputResult } from "shared/util/input";
import { CombatController3D } from "../combat/combat3d";

export abstract class CharacterController3D extends CharacterController implements OnStart, OnMatchRespawn, OnInit
{
    constructor()
    {
        super(Dependency<MatchController>(), Dependency<Keyboard>(), Dependency<Mouse>(), Dependency<Gamepad>());
    }

    protected keyboardDirectionMap: Map<Enum.KeyCode, Enum.NormalId> = new Map([
        [ Enum.KeyCode.W, Enum.NormalId.Front ],
        [ Enum.KeyCode.A, Enum.NormalId.Left ],
        [ Enum.KeyCode.S, Enum.NormalId.Back ],
        [ Enum.KeyCode.D, Enum.NormalId.Right ],
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
