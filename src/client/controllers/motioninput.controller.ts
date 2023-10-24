import { Controller, Dependency, OnInit, OnStart, OnTick } from "@flamework/core";
import { HumanoidController } from "client/module/character/humanoid";
import { InputMode, InputResult } from "shared/util/input";
import * as input from "shared/util/input";
import { Client } from "./client.controller";
import { Keyboard, OnKeyboardInput } from "./keyboard.controller";

export type Frames = number;

export namespace MotionInput
{
    export import Motion = input.Motion;

    export const None = [ Motion.Neutral ];

    export import Input = input.Input;
    export interface OnMotionInput
    {
        onMotionInput(motionInput: MotionInput): void;
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
            const inputs = [ ...this.GetInputs(false), finalInput ];

            return new class
            {
                GetInputs()
                {
                    return inputs;
                }

                GetInputsFilterNeutral()
                {
                    return inputs.filter((input) => input !== Motion.Neutral);
                }
            }();
        }

        public GetInputs(padNeutral = true)
        {
            if (padNeutral && this.inputs[0] !== Motion.Neutral)
            {
                const res = [ ...this.inputs ];
                res.unshift(Motion[input.ConvertMoveDirectionToMotion(Dependency<MotionInputController>().getDirection())[0]]);

                return res;
            }

            return [ ...this.inputs ];
        }

        private inputs: Motion[] = [];
    }

    @Controller({})
    export class MotionInputController implements OnTick
    {
        private currentMotionInput?: MotionInput;

        private motionInputTimeoutLimit: Frames = 16;

        private motionInputTimeout: Frames = -1;

        private direction = Vector3.zero;

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
