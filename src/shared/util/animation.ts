import Make from "@rbxts/make";
import Signal from "@rbxts/signal";

import { HttpService } from "@rbxts/services";
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
            if (this.animator.attributes.ActiveAnimation === this.Id)
                this.animator.attributes.ActiveAnimation = undefined;

            this.AnimationTrack.Stop(fadeTime);
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
