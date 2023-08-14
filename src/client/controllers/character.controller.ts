import { BaseComponent, Component } from "@flamework/components";
import { Keyboard, OnKeyboardInput } from "client/controllers/keyboard.controller";
import { Gamepad, GamepadButtons, OnGamepadInput } from "client/controllers/gamepad.controller";
import { Mouse } from "client/controllers/mouse.controller";
import { InputMode, InputResult } from "shared/util/input";
import { Controller, OnRender, OnTick } from "@flamework/core";
import { ContextActionService, Players, Workspace } from "@rbxts/services";
import { OnRespawn } from "./client.controller";
import Make from "@rbxts/make";

export abstract class CharacterController implements OnGamepadInput, OnRespawn
{
    protected character?: Model;

    protected player = Players.LocalPlayer;

    protected alignPos?: AlignPosition;

    constructor(private readonly keyboard: Keyboard, private readonly mouse: Mouse, private readonly gamepad: Gamepad)
    {
        ContextActionService.BindAction(
            "Movement",
            (id, state, {KeyCode}) =>
            {
                return Enum.ContextActionResult.Sink;
            },
            false,
            ...Enum.PlayerActions.GetEnumItems()
        );
    }

    abstract readonly keyboardDirectionMap: Map<Enum.KeyCode, Enum.NormalId>;

    protected GenerateRelativeVectorFromNormalId(relativeTo: CFrame, normal: Enum.NormalId)
    {
        return relativeTo.VectorToWorldSpace( Vector3.FromNormalId(normal) );
    }

    public GetMoveDirection(relativeTo?: CFrame)
    {
        let totalVector = Vector3.zero;
        this.keyboardDirectionMap.forEach((normal, code) =>
        {
            if (this.keyboard.isKeyDown(code))
            {
                if (relativeTo)
                {
                    print(`total vector before adding ${code}`);
                    totalVector = totalVector.add( this.GenerateRelativeVectorFromNormalId(relativeTo, normal) );
                }
                else totalVector = totalVector.add( Vector3.FromNormalId(normal) );
            }

        });

        return totalVector !== Vector3.zero ? totalVector.Unit: totalVector;
    }

    onRespawn(character: Model): void
    {
        this.character = character;
    }

    abstract onGamepadInput(buttonPressed: GamepadButtons, inputMode: InputMode): boolean | InputResult | (() => boolean | InputResult);

    protected enabled = false;

    SetEnabled(enabled: boolean, target: Model): void
    SetEnabled(enabled = true)
    {
        this.enabled = enabled;
    }
}