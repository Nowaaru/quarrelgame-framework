import { BaseComponent, Component } from "@flamework/components";
import { Keyboard, OnKeyboardInput } from "client/controllers/keyboard.controller";
import { Gamepad, GamepadButtons, OnGamepadInput } from "client/controllers/gamepad.controller";
import { Mouse } from "client/controllers/mouse.controller";
import { InputMode, InputResult } from "shared/util/input";
import { Controller, OnInit, OnRender, OnTick } from "@flamework/core";
import { ContextActionService, Players, Workspace } from "@rbxts/services";
import { OnRespawn } from "./client.controller";
import Make from "@rbxts/make";

export abstract class CharacterController implements OnGamepadInput, OnRespawn
{
    protected character?: Model;

    protected player = Players.LocalPlayer;

    protected alignPos?: AlignPosition;

    constructor(private readonly keyboard: Keyboard, private readonly mouse: Mouse, private readonly gamepad: Gamepad)
    {}

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

                    totalVector = totalVector.add( this.GenerateRelativeVectorFromNormalId(relativeTo, normal) );

                else totalVector = totalVector.add( Vector3.FromNormalId(normal) );
            }

        });

        return totalVector !== Vector3.zero ? totalVector.Unit: totalVector;
    }

    private thisMovementAction?: BoundActionInfo
    public DisableMovement()
    {
        const movementAction = ContextActionService.GetBoundActionInfo("Movement");
        this.thisMovementAction = movementAction;

        assert(movementAction, "movement action not found");
        ContextActionService.BindActionAtPriority(
            "NullifyMovement",
            (id, state, {KeyCode}) =>
            {
                return Enum.ContextActionResult.Sink;
            },
            false,
            movementAction.priorityLevel + 1,
            ...movementAction.inputTypes.filter((n) => !typeIs(n, "string")) as Array<Enum.KeyCode | Enum.PlayerActions> | Array<Enum.UserInputType>
        );
    }

    public EnableMovement()
    {
        ContextActionService.UnbindAction("NullifyMovement");
        delete this.thisMovementAction;
    }

    public ToggleMovement()
    {
        if (this.thisMovementAction)

            this.EnableMovement();

        else this.DisableMovement();
    }

    onRespawn(character: Model): void
    {
        this.character = character;
        if (this.thisMovementAction)

            this.EnableMovement();
    }

    abstract onGamepadInput(buttonPressed: GamepadButtons, inputMode: InputMode): boolean | InputResult | (() => boolean | InputResult);

    protected enabled = false;

    SetEnabled(enabled: boolean, target: Model): void
    SetEnabled(enabled = true)
    {
        this.enabled = enabled;
    }
}