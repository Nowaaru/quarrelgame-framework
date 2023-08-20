import { Controller, OnStart, OnInit, OnTick } from "@flamework/core";
import { Keyboard, OnKeyboardInput } from "./keyboard.controller";
import { InputMode, InputResult } from "shared/util/input";
import * as input from "shared/util/input";

export type Frames = number;

export namespace MotionInput {
    export import Motion = input.Motion;

    export import Input = input.Input;
    export interface OnMotionInput {
        onMotionInput(motionInput: MotionInput): void;
    }

    abstract class LockedMotionInput
    {
        abstract GetInputs(): (Motion | Input)[]

        abstract GetInputsFilterNeutral(): (Motion | Input)[]
    }

    export class MotionInput
    {
        constructor()
        {}

        public PushDirection(motionDirection: Motion)
        {
            this.inputs.push(motionDirection);
        }

        public FinishInput(finalInput: Input): LockedMotionInput
        {
            const inputs = [...this.inputs, finalInput];

            return new class
            {
                private inputs = inputs;

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

        public GetInputs()
        {
            return [... this.inputs ];
        }

        private inputs: Motion[] = [];
    }

    @Controller({})
    export class MotionInputController implements OnTick
    {
        private currentMotionInput?: MotionInput;

        private motionInputTimeoutLimit: Frames = 16;

        private motionInputTimeout: Frames = -1;

        constructor(private readonly keyboard: Keyboard)
        {}

        public pushToMotionInput(input: Motion | Input): void | LockedMotionInput
        {
            print("pushed motion/input:", input in Input ? Input[ input as never ] : Motion[ input as never ]);
            this.currentMotionInput = this.currentMotionInput ?? new MotionInput();
            if (input in Input)
            {
                const finishedInput = this.currentMotionInput.FinishInput(input as Input);
                this.currentMotionInput = undefined;

                return finishedInput;
            }
            else if (input in Motion)

                this.currentMotionInput.PushDirection(input as Motion);
        }

        onTick()
        {
            if (this.currentMotionInput)
            {
                const currentInputList = this.currentMotionInput.GetInputs();
                if (currentInputList[ currentInputList.size() - 1 ] === Motion.Neutral)
                {
                    if (this.motionInputTimeout >= this.motionInputTimeoutLimit)
                    {
                        print("motion input timed out");
                        this.motionInputTimeout = -1;
                        this.currentMotionInput = undefined;
                    }
                    else this.motionInputTimeout += 1;
                }

                return;
            }

            this.motionInputTimeout = -1;
        }
    }
}