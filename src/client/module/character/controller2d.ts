import { Components } from "@flamework/components";
import { Controller, Dependency, OnPhysics, OnRender, OnStart, OnTick } from "@flamework/core";

import { Gamepad, GamepadButtons } from "client/controllers/gamepad.controller";
import { Keyboard } from "client/controllers/keyboard.controller";
import { OnMatchRespawn } from "client/controllers/match.controller";
import { MotionInput } from "client/controllers/motioninput.controller";
import { Mouse } from "client/controllers/mouse.controller";
import { CharacterController } from "client/module/character";
import { CombatController2D } from "client/module/combat/combat2d";
import { ClientFunctions } from "shared/network";
import { ConvertMoveDirectionToMotion, GenerateRelativeVectorFromNormalId, Input, InputMode, InputResult, Motion } from "shared/util/input";
import { EntityState, isStateNeutral, NullifyYComponent, SessionType } from "shared/util/lib";

import Make from "@rbxts/make";
import Object from "@rbxts/object-utils";
import { Players, Workspace } from "@rbxts/services";
import { MatchController, OnArenaChange } from "client/controllers/match.controller";
import { HumanoidController } from "client/module/character/humanoid";
import type _Map from "server/components/map.component";
import { Animator } from "shared/components/animator.component";
import { StatefulComponent } from "shared/components/state.component";
import { MatchData } from "shared/util/lib";

interface ChangedSignals
{
    [stateName: string]: unknown;
}

export abstract class CharacterController2D extends CharacterController implements OnStart, OnMatchRespawn, OnRender, OnArenaChange
{
    private axis?: Vector3;

    protected _arena?: _Map.Arena;

    constructor(
        protected readonly combatController: CombatController2D,
        protected readonly motionInputController: MotionInput.MotionInputController,
        protected readonly humanoidController: HumanoidController,
    )
    {
        super(Dependency<MatchController>(), Dependency<Keyboard>(), Dependency<Mouse>(), Dependency<Gamepad>(), humanoidController);
    }

    private invisibleWallSets = new Set<Folder>();
    onArenaChanged(
        _: string,
        arenaInstance: Model & {
            config: _Map.ConfigurationToValue;
            script?: Actor | undefined;
            model: Folder;
        },
    ): void
    {
        for (const wallSet of this.invisibleWallSets)
            wallSet.Destroy();

        // memory leak begone
        this.invisibleWallSets.clear();

        // TODO: use attachment movers like AlignPosition to keep the player inside of the bounds of the
        // of the arena instead of just disabling movement because people can jump and end up using the momentum
        // to get out of the arena
        //
        // might just use an invisible wall or something for now, will have to figure it out later

        this._arena = arenaInstance;
        this.axis = arenaInstance.config.Axis.Value;

        const { config } = arenaInstance;
        const { Size, Origin } = config;

        const Transparency = 1;
        const CanQuery = false;
        const Parent = Make("Folder", {
            Parent: arenaInstance.model,
            Children: [
                Make("Part", {
                    CFrame: Origin.Value.add(new Vector3(Size.Value.X / 2)),
                    Size: new Vector3(1, Size.Value.Y * 2, 45),
                    Anchored: true,
                    Name: "BoundaryLeft",
                    Transparency,
                    CanQuery,
                }),
                Make("Part", {
                    CFrame: Origin.Value.sub(new Vector3(Size.Value.X / 2)),
                    Size: new Vector3(1, Size.Value.Y * 2, 45),
                    Anchored: true,
                    Name: "BoundaryRight",
                    Transparency,
                    CanQuery,
                }),
                Make("Part", {
                    CFrame: Origin.Value.add(new Vector3(45, Size.Value.Y + 4, 0)),
                    Size: new Vector3(45, 4, 45),
                    Anchored: true,
                    Name: "BoundaryTop",
                    Transparency,
                    CanQuery,
                }),
            ],
            Name: "InvisibleWalls",
        });

        this.invisibleWallSets.add(Parent);
    }

    private lastFrameNormal: Vector3 = Vector3.zero;
    onRender()
    {
        const axis = this.axis,
            bound = this.motionInputController.IsBound(),
            character = this.character,
            enabled = this.enabled,
            match = this.matchController.GetMatchData();

        if (!enabled)
            return;

        if (!character)
            throw "no character";

        if (!match)
            throw "no match data";

        if (!axis)
            throw "no axis";

        if (!bound)
            throw "not bound";
        // else
        // print("bound now :D");

        const { X, Z } = axis;
        if (this.alignPos?.Attachment0)
        {
            this.alignPos.Position = new Vector3(X, 0, Z);
            this.alignPos.MaxAxesForce = new Vector3(math.sign(X), 0, math.sign(Z))
                .Cross(new Vector3(0, 1, 0))
                .mul(12000);
        }

        const playerHumanoid = character.FindFirstChild("Humanoid") as
            | Humanoid
            | undefined;

        const axisDirection = CFrame.lookAt(Vector3.zero, axis);
        let axisRotatedOrigin: CFrame;

        const sessionType = match.Participants.size() > 1 ? SessionType.Multiplayer : SessionType.Singleplayer;
        switch ( sessionType )
        {
            case (SessionType.Multiplayer):
            {
                if (match.Participants.size() === 2)
                {
                    const targetPlayer = Players.GetPlayers().find((e) =>
                        e.GetAttribute("ParticipantId")
                            === match.Participants.find(({ ParticipantId }) => ParticipantId !== this.player.GetAttribute("ParticipantId"))
                    );

                    assert(targetPlayer, "no target player");
                    assert(targetPlayer.Character, "target player has no character");

                    axisRotatedOrigin = CFrame.lookAt(
                        NullifyYComponent(this.character!.GetPivot()).Position,
                        NullifyYComponent(targetPlayer.Character.GetPivot()).Position,
                    );

                    print("playing multiplayer");
                    break;
                }

                print("playing multiplayer with a lot of people");

                /* falls through */
            }

            default:
            {
                const { Origin, Axis } = match.Arena.config;
                const { Position } = Origin.Value;
                axisRotatedOrigin = CFrame.lookAt(Position, Position.add(Axis.Value));
            }
        }

        assert(axisRotatedOrigin, "no axis rotated origin");
        const playerDirection = this.GetMoveDirection(axisRotatedOrigin);
        const combatDirection = this.motionInputController.GetMotionDirection(axisRotatedOrigin);
        const currentMotion = this.motionInputController.getMotionInputInProgress();
        const [ [ playerMotion ], [ combatMotion ] ] = [ playerDirection, combatDirection ].map(ConvertMoveDirectionToMotion);

        if (this.lastFrameNormal !== playerDirection || !currentMotion || currentMotion[currentMotion.size() - 1] !== Motion[combatMotion])
        {
            if (this.motionInputController.willTimeout())
                this.motionInputController.clear();

            this.motionInputController.pushToMotionInput(Motion[combatMotion]);
            // print(`[${motion}, (${playerDirection})] =>`, [ ...(currentMotion ?? [ Motion.Neutral ]), Motion[motion] ].map((n) => Motion[n]).join(", "));
        }

        const currentLastFrameNormal = this.lastFrameNormal;
        this.lastFrameNormal = playerDirection;
        if (playerHumanoid)
        {
            playerHumanoid.AutoRotate = false;
            const bottomNormal = GenerateRelativeVectorFromNormalId(
                axisDirection,
                Enum.NormalId.Bottom,
            );
            const topNormal = GenerateRelativeVectorFromNormalId(
                axisDirection,
                Enum.NormalId.Top,
            );

            const eqLeniency = 0.5;
            const currentState = character.GetAttribute("State") as EntityState;

            if (playerDirection.Dot(bottomNormal) > eqLeniency)
            {
                const lastFrameDot = currentLastFrameNormal.Dot(bottomNormal);
                if (playerHumanoid.FloorMaterial !== Enum.Material.Air)
                {
                    if (lastFrameDot <= eqLeniency)
                    {
                        if (isStateNeutral(currentState))
                            ClientFunctions.Crouch(EntityState.Crouch);
                    }
                }

                return;
            }
            else if (playerDirection.Dot(topNormal) > eqLeniency)
            {
                const lastFrameDot = currentLastFrameNormal.Dot(topNormal);
                if (lastFrameDot <= eqLeniency)
                {
                    if (playerHumanoid.FloorMaterial !== Enum.Material.Air)
                    {
                        // print(
                        //     `🚀 ~ file: 2dcontroller.controller.ts:65 ~ lastFrameDot:`,
                        //     lastFrameDot,
                        // );
                        ClientFunctions.Jump();
                    }
                }
            }
            else if (currentState === EntityState.Crouch)
            {
                ClientFunctions.Crouch(EntityState.Idle);
            }

            if (playerHumanoid.FloorMaterial === Enum.Material.Air && playerHumanoid.GetAttribute("JumpDirection"))
                playerHumanoid.Move(playerHumanoid.GetAttribute("JumpDirection") as Vector3);
            else
                playerHumanoid.Move(playerDirection);
        }
    }

    onStart(): void
    {
        print("2D Character Controller started.");
    }

    async onMatchRespawn(character: Model): Promise<void>
    {
        super.onMatchRespawn(character);
        const rootPart = character.WaitForChild("HumanoidRootPart") as BasePart;

        this.alignPos = Make("AlignPosition", {
            Mode: Enum.PositionAlignmentMode.OneAttachment,
            Enabled: false,
            ApplyAtCenterOfMass: true,
            MaxAxesForce: Vector3.zero,
            Parent: rootPart,

            Attachment0: rootPart.WaitForChild("RootAttachment") as Attachment,
            ForceLimitMode: Enum.ForceLimitMode.PerAxis,
            Responsiveness: 200,
        });

        // TODO: fix bug that prevents this part in the controller from running
        const currentMatch = await ClientFunctions.GetCurrentMatch();
        if (currentMatch?.Arena)
        {
            const components = Dependency<Components>();

            this.character = character;
            character.WaitForChild("Humanoid").WaitForChild("Animator");
            components.addComponent(character, Animator.Animator);
            components.addComponent(character, StatefulComponent);

            this.SetAxis(currentMatch.Arena.config.Axis.Value);
            this.SetEnabled(true);

            Workspace.CurrentCamera!.CameraSubject = character.FindFirstChildWhichIsA("Humanoid") as Humanoid;
        }
    }

    public readonly keyboardDirectionMap: Map<Enum.KeyCode, Enum.NormalId> = new Map([
        [ Enum.KeyCode.W, Enum.NormalId.Top ],
        [ Enum.KeyCode.A, Enum.NormalId.Back ],
        [ Enum.KeyCode.S, Enum.NormalId.Bottom ],
        [ Enum.KeyCode.D, Enum.NormalId.Front ],
    ] as [Enum.KeyCode, Enum.NormalId][]);

    onGamepadInput(
        buttonPressed: GamepadButtons,
        inputMode: InputMode,
    ): boolean | InputResult | (() => boolean | InputResult)
    {
        return false;
    }

    SetAxisTowardsModel(towards: Model)
    {
        assert(this.character, "character is not defined");
        this.axis = towards
            .GetPivot()
            .Position.sub(this.character?.GetPivot().Position).Unit;
    }

    SetAxis(axis: Enum.NormalId | Vector3)
    {
        assert(this.character, "character is not defined");
        this.axis = typeIs(axis, "EnumItem") ? Vector3.FromNormalId(axis) : axis;
    }

    SetEnabled(enabled: boolean)
    {
        this.enabled = true;
        if (enabled)
            this.DisableRobloxMovement();
        else
            this.EnableRobloxMovement();
    }
}
