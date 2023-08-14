import { Controller, OnStart, OnInit, OnTick } from "@flamework/core";
import { Keyboard, OnKeyboardInput } from "./keyboard.controller";
import { InputMode, InputResult, Motion, Input } from "shared/util/input";


export type Frames = number;

export namespace GameInput {
    export interface OnMotionInput {
        onMotionInput(motionInput: MotionInput): void;
    }

    interface LockedMotionInput
    {
        GetInputs(): (Motion | Input)[],

        inputs: (Motion | Input)[]
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

            return {
                inputs: [],

                GetInputs()
                {
                    return inputs;
                }
            };
        }

        private inputs: Motion[] = [];
    }

    @Controller({})
    export class MotionInputController implements OnStart, OnInit, OnTick, OnKeyboardInput
    {
        private currentMotionInput?: MotionInput;

        private motionInputTimeoutLimit: Frames = 8;

        private motionInputTimeout: Frames = -1;

        onKeyboardInput(buttonPressed: Enum.KeyCode, inputMode: InputMode): boolean | InputResult | (() => boolean | InputResult)
        {
            return false;
        }

        constructor(private readonly keyboard: Keyboard)
        {}

        private pushToMotionInput(input: Motion | Input)
        {

            this.currentMotionInput = this.currentMotionInput ?? new MotionInput();
            if (input in Input)

                this.currentMotionInput.FinishInput(input as Input);

            if (input in Motion)

                this.currentMotionInput.PushDirection(input as Motion);

        }

        onTick()
        {
            if (this.currentMotionInput)
            {
                if (this.motionInputTimeout >= this.motionInputTimeoutLimit)

                    this.currentMotionInput = undefined;

                else this.motionInputTimeout += 1;

                return;
            }
        }

        onInit()
        {

        }

        onStart()
        {

        }
    }
}