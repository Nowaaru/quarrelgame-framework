import Make from "@rbxts/make";
import Signal from "@rbxts/signal";

import { HttpService, RunService } from "@rbxts/services";
import { GetTickRate } from "./lib";

import type { Animator } from "shared/components/animator.component";
interface PlayOptions
{
    Speed?: number;
    Preload?: boolean;
    FadeTime?: number;
    Weight?: number;
}

export namespace Animation
{
    export interface AnimationData
    {
        name: string;
        assetId: string;

        isAttackAnimation?: boolean;
        priority?: Enum.AnimationPriority;
        loop?: boolean;
    }

    enum AnimationState
    {
        PLAYING,
        STOPPED,
        PAUSED,
    }

    /**
     * Determines the priority of animations
     * when determining weights for stepping.
     */
    enum StepPriority
    {
        /**
         * A special property that forces this animation to
         * be stepped regardless of other priorites.
         *
         * Good for integral animations, like world animators.
         */
        CRITICAL = "CRITICAL",
        /**
         * The highest priority.
         *
         * Good for action animations.
         */
        HEAVY = 0x3,
        /**
         * The middleground priority.
         * Good for walking animations.
         */
        MEDIUM = 0x2,
        /**
         * The lowest priority.
         * Good for idle animations.
         */
        LIGHT = 0x1,
    }

    /**
     * A more fine animation player to allow for
     * animations of different frametimes, more
     * events, and in-depth animation debug utiities.
     */
    export class AnimationPlayer
    {
        private static allPlayers: Set<AnimationPlayer> = new Set();
        static {
            const allAnimations = new Set<AnimationPlayer>();
            RunService.PreAnimation.Connect(() =>
            {

            });
        }

        public StepPriority: StepPriority | number = StepPriority.MEDIUM;

        public State: AnimationState = AnimationState.STOPPED;

        /**
         * The controller this animation is playing on.
         *
         * 📝 Can be an interface, or an instance.
         */
        public readonly Controller: {Play: Callback};

        /**
         * How long the animation has been playing
         * since the start time.
         */
        public readonly Progress = 4;

        /**
         * How fast the animation plays.
         */
        public Rate = 1;

        constructor(private readonly animation: Animation, Controller: { Play: Callback })
        {
            this.Controller = Controller;
        }
    }

    export class Animation
    {
        public readonly Animation: Instances["Animation"];

        public readonly AnimationTrack: Instances["AnimationTrack"];

        public readonly AnimationData: Animation.AnimationData;

        public readonly IsAttackAnimation;

        private readonly Name;

        private readonly Id;

        private GameLength = 0;

        public readonly Priority: Enum.AnimationPriority;

        public readonly AnimationId: string;

        public Ended: Signal<() => void> = new Signal();

        public Loop: Signal<() => void> = new Signal();

        public KeyframeReached: Signal<() => void> = new Signal();

        /**
        * Returns a signal that is fired when the progress is passed.
        *
        * @param loop Whether this signal should persist upon loop.
        */
        public Progress(duration: number, loop: boolean): Signal<() => void>
        {
            const _thisSignal = new Signal<() => void>();

            let conn: RBXScriptConnection | undefined = this.AnimationTrack.GetPropertyChangedSignal("TimePosition").Connect(() =>
            {
                if (!this.AnimationTrack.IsPlaying)

                    return;

                _thisSignal.Fire();
                if (loop)
                {
                    conn?.Disconnect();
                    conn = undefined;
                }
            });

            return _thisSignal;
        }

        constructor(private readonly animator: Animator.Animator, animationData: Animation.AnimationData)
        {
            const { assetId, priority, name, loop } = animationData;
            this.Animation = Make("Animation", {
                AnimationId: assetId,
                Name: name,
            });

            this.AnimationData = animationData;

            this.Name = name;
            this.Id = `${this.Name}-${HttpService.GenerateGUID(false)}`;

            this.AnimationTrack = animator.GetAnimator().LoadAnimation(this.Animation);
            this.AnimationTrack.Priority = priority ?? Enum.AnimationPriority.Action;
            this.AnimationTrack.Looped = loop ?? false;

            this.Priority = this.AnimationTrack.Priority;
            this.AnimationId = this.Animation.AnimationId;
            this.IsAttackAnimation = this.AnimationData.isAttackAnimation;

            this.AnimationTrack.Ended.Connect(() =>
            {
                if (animator.attributes.ActiveAnimation === this.Id)
                    animator.attributes.ActiveAnimation = undefined;

                this.Ended.Fire();
            });

            this.AnimationTrack.DidLoop.Connect(() =>
            {
                this.Loop.Fire();
            });

            this.Loaded = new Promise<void>((res) =>
            {
                while (!this.AnimationTrack)
                    task.wait();

                if (this.AnimationTrack.Length > 0 ?? this.AnimationTrack.IsPropertyModified("Length"))
                    return res();

                do
                task.wait();
                while (this.AnimationTrack.Length === 0);

                const tickRate = GetTickRate();
                if (tickRate)
                    this.GameLength = tickRate * this.AnimationTrack.Length;

                return res();
            });
        }

        public IsPlaying()
        {
            return this.AnimationTrack.IsPlaying;
        }

        public IsPaused()
        {
            return this.AnimationTrack.Speed === 0 && this.IsPlaying();
        }

        public IsLoaded()
        {
            if (this.AnimationTrack.IsPropertyModified("Length"))
                return true;

            return false;
        }

        public readonly Loaded;

        public async Play(playOptions?: PlayOptions): Promise<this>
        {
            return new Promise((res) =>
            {
                print(`Animation ${this.Animation.GetFullName()} is now playing.`);
                this.AnimationTrack.Stopped.Once(() =>
                {
                    print(`Animation ${this.Animation.GetFullName()} has stopped.`);
                });

                if (playOptions?.Preload)
                {
                    return this.Loaded.then(() =>
                    {
                        this.animator.attributes.ActiveAnimation = this.Id;
                        this.AnimationTrack.Looped = this.AnimationData.loop ?? false;
                        this.AnimationTrack.Play(playOptions?.FadeTime, playOptions?.Weight, playOptions?.Speed ?? 1);

                        return res(this);
                    });
                }

                this.animator.attributes.ActiveAnimation = this.Id;
                this.AnimationTrack.Looped = this.AnimationData.loop ?? false;
                this.AnimationTrack.Play(playOptions?.FadeTime, playOptions?.Weight, playOptions?.Speed ?? 1);

                return res(this);
            });
        }

        public async Pause(): Promise<this>
        {
            this.AnimationTrack?.AdjustSpeed(0);

            return this;
        }

        public async Resume(): Promise<this>
        {
            this.AnimationTrack?.AdjustSpeed(1);

            return this;
        }

        public async Stop({ fadeTime, yieldFade }: { fadeTime?: number; yieldFade?: boolean; }): Promise<this>
        {
            print(`Animation ${this.Animation.GetFullName()} is stopping with paramters: {${fadeTime}, ${yieldFade}}`);
            this.AnimationTrack.Stop(fadeTime);
            if (this.animator.attributes.ActiveAnimation === this.Id)
                this.animator.attributes.ActiveAnimation = undefined;

            if (yieldFade)
                task.wait(fadeTime);

            return this;
        }
    }
    export class AnimationBuilder
    {
        private assetId?: string;

        private priority?: Enum.AnimationPriority;

        private name?: string;

        private loop = false;

        private attack = false;

        public SetName(name: string)
        {
            this.name = name;

            return this;
        }

        public SetLooped(loop: boolean)
        {
            this.loop = loop;

            return this;
        }

        public SetAnimationId(animationId: string): this
        {
            this.assetId = animationId;

            return this;
        }

        public SetPriority(priority: Enum.AnimationPriority = Enum.AnimationPriority.Action)
        {
            this.priority = priority;

            return this;
        }

        public IsAttack(isAttack = true)
        {
            this.attack = isAttack;

            return this;
        }

        public Construct(): Readonly<AnimationData>
        {
            assert(this.assetId, "Builder incomplete! Asset Id is unset.");
            assert(this.name, "Builder incomplete! Name is unset.");

            return {
                assetId: this.assetId,
                priority: this.priority,
                name: this.name,
                loop: this.loop,
                isAttackAnimation: this.attack,
            } as const;
        }
    }
}
