import { Controller, Dependency, OnInit, OnStart, OnTick } from "@flamework/core";
import Make from "@rbxts/make";
import { Workspace } from "@rbxts/services";
import { CharacterController } from "client/module/character";
import { HumanoidController } from "client/module/character/humanoid";
import { InputMode, InputResult, MotionInput as MotionInputType } from "shared/util/input";
import * as input from "shared/util/input";
import { NullifyYComponent } from "shared/util/lib";
import { Client } from "./client.controller";
import { Keyboard, OnKeyboardInput } from "./keyboard.controller";

export type Frames = number;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MotionInput
{

    export import Motion = input.Motion;

    export const None = [ Motion.Neutral ];

    export import Input = input.Input;
    export interface OnMotionInput
    {
        onMotionInput(motionInput: MotionInputType, filteredInput: MotionInputType): void;
    }

    abstract class LockedMotionInput
    {
        abstract GetInputs(): (Motion | Input)[];

        abstract GetInputsFilterNeutral(): (Motion | Input)[];
    }

    export class MotionInput // TODO: implement partial motion-input matching
    {
        constructor(private character: Model & { Humanoid: Humanoid; })
        {}

        public PushDirection(motionDirection: Motion)
        {
            this.inputs.push(motionDirection);
        }

        public FinishInput(finalInput: Input): LockedMotionInput
        {
            const inputs = [ ...this.GetInputs(false), finalInput ] as MotionInputType;

            const outClass = new class
            {
                GetInputs(): MotionInputType
                {
                    return inputs;
                }

                GetInputsFilterNeutral(): MotionInputType
                {
                    return inputs.filter((input) => input !== Motion.Neutral);
                }
            }();

            for (const handler of Dependency<MotionInputController>().motionInputEventHandlers)
                handler.onMotionInput(outClass.GetInputs(), outClass.GetInputsFilterNeutral());

            return outClass;
        }

        public GetInputs(padNeutral = true)
        {
            if (padNeutral && this.inputs[0] !== Motion.Neutral)
            {
                const res = [ ...this.inputs ];
                res.unshift(Motion[input.ConvertMoveDirectionToMotion(Dependency<MotionInputController>().getDirection())[0]]);

                return res;
            }

            return this.inputs;
        }

        private inputs: Motion[] = [];
    }

    /**
     * The controller that handles motion inputs,
     * intended for 2D combat.
     *
     * Has a priority of 2.
     */
    @Controller({
        loadOrder: 2,
    })
    export class MotionInputController implements OnTick
    {
        public readonly motionInputEventHandlers = new Set<OnMotionInput>();

        private currentMotionInput?: MotionInput;

        private motionInputTimeoutLimit: Frames = 16;

        private motionInputTimeout: Frames = -1;

        private direction = Vector3.zero;

        private characterController?: CharacterController;

        constructor(private readonly client: Client)
        {}

        public pushToMotionInput(input: Motion | Input): void | LockedMotionInput
        {
            // print("pushed motion/input:", input in Input ? Input[input as never] : Motion[input as never]);
            if (this.client.character)
            {
                this.currentMotionInput = this.currentMotionInput
                    ?? new MotionInput(this.client.character as never);
                if (input in Input)
                {
                    const finishedInput = this.currentMotionInput.FinishInput(input as Input);
                    this.currentMotionInput = undefined;

                    return finishedInput;
                }
                else if (input in Motion)
                {
                    this.currentMotionInput.PushDirection(input as Motion);
                    this.motionInputTimeout = -1;
                }
            }
        }

        /**
         * Bind the current character controller to the motion
         * input controller.
         *
         * @param characterController The character controller to bind.
         */
        public BindController<T extends CharacterController>(characterController: T)
        {
            this.characterController = characterController;
        }

        /**
         * Check if a character controller is bound to this motion
         * input controller.
         */
        public IsBound()
        {
            return !!this.characterController;
        }

        /**
         * Retrieve the motion direction from
         * the current input device.
         *
         * Inverts the input depending on the {@link relativeTo}parameter.
         *
         * @param relativeTo The CFrame that determines how inputs are
         * modified.
         */
        public GetMotionDirection(relativeTo: CFrame)
        {
            assert(this.characterController, "no character controller bound.");
            const keyboardDirectionMap = this.characterController.GetKeybinds();
            const keyboard = Dependency<Keyboard>();

            let totalVector = Vector3.zero;

            keyboardDirectionMap.forEach((normal, code) =>
            {
                if (keyboard.isKeyDown(code))
                {
                    const { Top, Bottom, Back: Left, Front: Right } = Enum.NormalId;
                    const { character } = Dependency<Client>();
                    if (character)
                    {
                        const { LookVector } = character.GetPivot();
                        const facingUnit = NullifyYComponent(LookVector).Dot(NullifyYComponent(relativeTo.Position).Unit);
                        const isFacingAway = facingUnit < 0;

                        if (isFacingAway && ([ Left, Right ] as Enum.NormalId[]).includes(normal))
                        {
                            switch ( normal )
                            {
                                case Left:
                                    normal = Right;
                                    break;

                                case Right:
                                    normal = Left;
                                    break;
                            }
                        }

                        if (character.GetPivot().Y < relativeTo.Y && [ Top, Bottom ] as EnumItem[])
                        {
                            switch ( normal )
                            {
                                case Top:
                                    normal = Bottom;
                                    break;

                                case Bottom:
                                    normal = Top;
                                    break;
                            }
                        }
                    }

                    if (relativeTo)
                    {
                        totalVector = totalVector.add(
                            input.GenerateRelativeVectorFromNormalId(relativeTo, normal),
                        );
                    }
                    else
                    {
                        totalVector = totalVector.add(Vector3.FromNormalId(normal));
                    }
                }
            });

            return totalVector.Magnitude > 0 ? totalVector.Unit : totalVector;
        }

        public setDirection(direction: Vector3)
        {
            return this.direction = direction;
        }

        public getDirection()
        {
            return this.direction;
        }

        public getMotionInputInProgress()
        {
            return this.currentMotionInput?.GetInputs(false);
        }

        public willTimeout()
        {
            return this.motionInputTimeout > this.motionInputTimeoutLimit;
        }

        public clear()
        {
            return this.currentMotionInput = undefined;
        }

        onTick()
        {
            if (this.currentMotionInput)
            {
                const currentInputList = this.currentMotionInput.GetInputs(false);
                if (currentInputList[currentInputList.size() - 1] === Motion.Neutral)
                {
                    if (this.motionInputTimeout >= this.motionInputTimeoutLimit)
                    {
                        // TEST:: keep the input queue for things like charge inputs
                        const isMotionOnly = currentInputList.size() === 1 && Motion[currentInputList[0]];
                        if (!isMotionOnly)
                        {
                            this.motionInputTimeout = -1;
                            this.currentMotionInput = undefined;

                            print("motion input timed out");
                        }
                        else
                        {
                            // print("bad - input list:", currentInputList);
                        }

                        return;
                    }
                }

                if (this.motionInputTimeout < 0)
                    this.motionInputTimeout = 0;
                else
                    this.motionInputTimeout += 1;

                return;
            }

            this.motionInputTimeout = -1;
        }
    }
}
