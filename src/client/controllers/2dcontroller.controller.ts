import { Components } from "@flamework/components";
import { Controller, Dependency, OnPhysics, OnRender, OnStart, OnTick } from "@flamework/core";

import { CharacterController } from "./character.controller";
import { Keyboard } from "client/controllers/keyboard.controller";
import { ConvertMoveDirectionToMotion, InputMode, InputResult, Motion } from "shared/util/input";
import { Mouse } from "client/controllers/mouse.controller";
import { Gamepad, GamepadButtons } from "client/controllers/gamepad.controller";
import { OnRespawn } from "client/controllers/client.controller";
import { CombatController } from "./combat.controller";
import Make from "@rbxts/make";
import { ClientFunctions } from "shared/network";
import { EntityState } from "shared/util/lib";
import { MotionInput } from "./motioninput.controller";

interface ChangedSignals {
    [stateName: string]: unknown,
}

@Controller({})
export class CharacterController2D extends CharacterController implements OnStart, OnRespawn, OnRender
{
    private axis?: Vector3;

    constructor(
        private readonly combatController: CombatController,
        private readonly motionInputController: MotionInput.MotionInputController,
    )
    {
        super(Dependency<Keyboard>(), Dependency<Mouse>(), Dependency<Gamepad>());
    }

    private lastFrameNormal: Vector3 = Vector3.zero;
    onRender()
    {
        if (!this.character)

            return;

        if (!this.axis)

            return;

        const {X, Y, Z} = this.axis;
        if (this.alignPos?.Attachment0)
        {
            this.alignPos.Position = new Vector3(X, 0, Z);
            this.alignPos.MaxAxesForce = new Vector3(math.sign(X), 0, math.sign(Z))
                .Cross(new Vector3(0, 1, 0))
                .mul(12000);
        }

        const playerHumanoid = this.character.FindFirstChild("Humanoid") as Humanoid | undefined;
        const axisDirection = CFrame.lookAt(Vector3.zero, this.axis);
        const playerDirection = this.GetMoveDirection(axisDirection);

        const [motion,] = ConvertMoveDirectionToMotion(playerDirection);
        if (this.lastFrameNormal !== playerDirection)

            this.motionInputController.pushToMotionInput(Motion[ motion ]);


        const currentLastFrameNormal = this.lastFrameNormal;
        this.lastFrameNormal = playerDirection;
        if (playerHumanoid)
        {
            playerHumanoid.AutoRotate = false;
            const bottomNormal = this.GenerateRelativeVectorFromNormalId(axisDirection, Enum.NormalId.Bottom);
            const topNormal = this.GenerateRelativeVectorFromNormalId(axisDirection, Enum.NormalId.Top);
            const eqLeniency = 0.5;


            const currentState = this.character.GetAttribute("State");
            if (playerDirection.Dot(bottomNormal) > eqLeniency)
            {
                const lastFrameDot = currentLastFrameNormal.Dot(bottomNormal);
                if (playerHumanoid.FloorMaterial !== Enum.Material.Air)
                {
                    if (lastFrameDot <= eqLeniency)
                    {
                        if (currentState === EntityState.Idle)

                            ClientFunctions.Crouch(EntityState.Crouch);

                        else if (currentState === EntityState.Crouch)

                            ClientFunctions.Crouch(EntityState.Idle);
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
                        print(`🚀 ~ file: 2dcontroller.controller.ts:65 ~ lastFrameDot:`, lastFrameDot);
                        ClientFunctions.Jump();
                    }
                }
            }
            else if (currentState === EntityState.Crouch)

                ClientFunctions.Crouch(EntityState.Idle);

            if (playerHumanoid.FloorMaterial === Enum.Material.Air && playerHumanoid.GetAttribute("JumpDirection"))

                playerHumanoid.Move(playerHumanoid.GetAttribute("JumpDirection") as Vector3);

            else playerHumanoid.Move(playerDirection);
        }
    }

    onStart(): void
    {
        print("2D Character Controller started.");
    }

    onRespawn(character: Model): void
    {
        this.character = character;
        const rootPart = character.WaitForChild("HumanoidRootPart") as BasePart;

        this.alignPos = Make("AlignPosition", {
            Mode: Enum.PositionAlignmentMode.OneAttachment,
            ApplyAtCenterOfMass: true,
            MaxAxesForce: Vector3.zero,
            Parent: rootPart,

            Attachment0: rootPart.WaitForChild("RootAttachment") as Attachment,
            ForceLimitMode: Enum.ForceLimitMode.PerAxis,
            Responsiveness: 200,
        });
    }

    public readonly keyboardDirectionMap: Map<Enum.KeyCode, Enum.NormalId> = new Map([
        [Enum.KeyCode.W, Enum.NormalId.Top],
        [Enum.KeyCode.A, Enum.NormalId.Back],
        [Enum.KeyCode.S, Enum.NormalId.Bottom],
        [Enum.KeyCode.D, Enum.NormalId.Front]
    ] as [Enum.KeyCode, Enum.NormalId][])

    onGamepadInput(buttonPressed: GamepadButtons, inputMode: InputMode): boolean | InputResult | (() => boolean | InputResult)
    {
        return false;
    }

    SetAxisTowardsModel(towards: Model)
    {
        assert(this.character, "character is not defined");
        this.axis = towards.GetPivot().Position.sub(this.character?.GetPivot().Position).Unit;
    }

    SetAxis(axis: Enum.NormalId | Vector3)
    {
        assert(this.character, "character is not defined");
        this.axis = typeIs(axis, "EnumItem") ? Vector3.FromNormalId(axis) : axis;
    }

    SetEnabled(enabled: boolean)
    {
        this.enabled = true;
    }
}