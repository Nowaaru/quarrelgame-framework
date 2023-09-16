import { BaseComponent, Component } from "@flamework/components";
import { Controller, OnInit, OnRender, OnTick } from "@flamework/core";
import Make from "@rbxts/make";
import Object from "@rbxts/object-utils";
import { ContextActionService, Players, Workspace } from "@rbxts/services";
import { Gamepad, GamepadButtons, OnGamepadInput } from "client/controllers/gamepad.controller";
import { Keyboard, OnKeyboardInput } from "client/controllers/keyboard.controller";
import { Mouse } from "client/controllers/mouse.controller";
import { InputMode, InputResult } from "shared/util/input";
import { OnRespawn } from "./client.controller";
import { MatchController } from "./match.controller";

export abstract class CharacterController implements OnGamepadInput, OnRespawn
{
    protected character?: Model;

    protected player = Players.LocalPlayer;

    protected alignPos?: AlignPosition;

    constructor(
        protected readonly matchController: MatchController,
        protected readonly keyboard: Keyboard,
        protected readonly mouse: Mouse,
        protected readonly gamepad: Gamepad,
    )
    {}

    abstract readonly keyboardDirectionMap: Map<Enum.KeyCode, Enum.NormalId>;

    protected GenerateRelativeVectorFromNormalId(
        relativeTo: CFrame,
        normal: Enum.NormalId,
    )
    {
        return relativeTo.VectorToWorldSpace(Vector3.FromNormalId(normal));
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
                    totalVector = totalVector.add(
                        this.GenerateRelativeVectorFromNormalId(relativeTo, normal),
                    );
                }
                else
                {
                    totalVector = totalVector.add(Vector3.FromNormalId(normal));
                }
            }
        });

        return totalVector !== Vector3.zero ? totalVector.Unit : totalVector;
    }

    private theseMovementActions?: BoundActionInfo[];
    public DisableRobloxMovement()
    {
        this.theseMovementActions = [
            ...ContextActionService.GetAllBoundActionInfo(),
        ]
            .filter(([k, n]) => !!k.match("move(.*)Action")[0])
            .map(([k, n]) => n);
        const actionPriority = this.theseMovementActions
            .map((n) => n.priorityLevel ?? Enum.ContextActionPriority.High)
            .reduce((a, b) => math.max(a, b));
        assert(this.theseMovementActions, "movement actions not found");
        ContextActionService.BindActionAtPriority(
            "NullifyMovement",
            (id, state, { KeyCode }) =>
            {
                return Enum.ContextActionResult.Sink;
            },
            false,
            actionPriority + 1,
            ...this.theseMovementActions.reduce(
                (a, b) => [...a, ...b.inputTypes] as never,
                [],
            ),
        );
    }

    public EnableRobloxMovement()
    {
        ContextActionService.UnbindAction("NullifyMovement");
        delete this.theseMovementActions;
    }

    public ToggleRobloxMovement()
    {
        if (this.theseMovementActions)
        {
            this.EnableRobloxMovement();
        }
        else
        {
            this.DisableRobloxMovement();
        }
    }

    onRespawn(character: Model): void
    {
        this.character = character;
        if (this.theseMovementActions)
        {
            this.EnableRobloxMovement();
        }
    }

    abstract onGamepadInput(
        buttonPressed: GamepadButtons,
        inputMode: InputMode,
    ): boolean | InputResult | (() => boolean | InputResult);

    protected enabled = false;

    SetEnabled(enabled: boolean, target: Model): void;
    SetEnabled(enabled = true)
    {
        this.enabled = enabled;
    }
}
