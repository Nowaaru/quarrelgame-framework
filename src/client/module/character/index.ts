import Make from "@rbxts/make";
import { ContextActionService, Players } from "@rbxts/services";
import { Gamepad, GamepadButtons, OnGamepadInput } from "client/controllers/gamepad.controller";
import { Keyboard } from "client/controllers/keyboard.controller";
import { OnMatchRespawn } from "client/controllers/match.controller";
import { MatchController } from "client/controllers/match.controller";
import { Mouse } from "client/controllers/mouse.controller";
import { GenerateRelativeVectorFromNormalId, InputMode, InputResult } from "shared/util/input";
import { HumanoidController } from "./humanoid";

export abstract class CharacterController implements OnGamepadInput, OnMatchRespawn
{
    protected abstract readonly keyboardDirectionMap: Map<Enum.KeyCode, Enum.NormalId>;

    protected character?: Model;

    protected player = Players.LocalPlayer;

    protected alignPos?: AlignPosition;

    constructor(
        protected readonly matchController: MatchController,
        protected readonly keyboard: Keyboard,
        protected readonly mouse: Mouse,
        protected readonly gamepad: Gamepad,
        protected readonly humanoidController: HumanoidController,
    )
    {}

    public GetMoveDirection(relativeTo: CFrame)
    {
        let totalVector = Vector3.zero;
        this.keyboardDirectionMap.forEach((normal, code) =>
        {
            if (this.keyboard.isKeyDown(code))

                if (relativeTo)

                    totalVector = totalVector.add(GenerateRelativeVectorFromNormalId(relativeTo, normal));

                else

                    totalVector = totalVector.add(Vector3.FromNormalId(normal));
        });

        return totalVector.Magnitude > 0 ? totalVector.Unit : totalVector;
    }

    private theseMovementActions?: BoundActionInfo[];
    public DisableRobloxMovement()
    {
        //FIXME: 
        //what the hell is going on over here??
        this.theseMovementActions = [
            ...ContextActionService.GetAllBoundActionInfo(),
        ]
            .filter(([ k, n ]) => !!k.match("move(.*)Action")[0])
            .map(([ k, n ]) => n);
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
                (a, b) => [ ...a, ...b.inputTypes ] as never,
                [],
            ),
        );
    }

    public GetKeybinds()
    {
        return new ReadonlyMap([ ...this.keyboardDirectionMap ]);
    }

    public EnableRobloxMovement()
    {
        ContextActionService.UnbindAction("NullifyMovement");
        delete this.theseMovementActions;
    }

    public ToggleRobloxMovement()
    {
        if (this.theseMovementActions)
            this.EnableRobloxMovement();
        else
            this.DisableRobloxMovement();
    }

    onMatchRespawn(character: Model): void
    {
        print("on respawnded!!");
        this.character = character;

        if (this.theseMovementActions)
            this.EnableRobloxMovement();
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
