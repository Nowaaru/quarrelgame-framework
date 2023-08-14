export namespace Animation {
    export interface AnimationData {
        name: string,
        assetId: string,

        isAttackAnimation?: boolean,
        priority?: Enum.AnimationPriority
        loop?: boolean,
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