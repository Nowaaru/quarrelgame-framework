import { OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";
import { CombatService } from "server/services/combat.service";
import { RunService, TweenService, Workspace } from "@rbxts/services";
import Signal from "@rbxts/signal";
import { EffectsService } from "server/services/effects.service";
export namespace Physics {
    export namespace Impulse {
        export class ConstantImpulse
        {
            private static Impulses = new Set<ConstantImpulse>();

            /**
             * Apply an Impulse to a PhysicsEntity.
             * @param target The PhysicsEntity to apply the impulse on.
             * @param direction The direction to push the PhysicsEntity.
             * @param velocity The speed of the impulse.
             */
            constructor(
                private readonly target: PhysicsEntity<PhysicsAttributes, Model & { PrimaryPart: BasePart }>,
                private readonly direction: Vector3,
                private velocity: number,
            )
            {
                // normalize
                this.direction = this.direction.Magnitude > 1 ? (this.direction.div(this.direction.Magnitude)) : this.direction;

                this.SetVelocity(velocity);
                this.target.Deleted.Once(() =>
                {
                    this.Stop();
                });
            }

            public SetVelocity(velocity: number)
            {
                this.velocity = velocity;
            }

            public Apply()
            {
                ConstantImpulse.Impulses.add(this);
                this.ImpulseEvent = RunService.PostSimulation.Connect((deltaPerStep) =>
                {
                    return Promise.try(() =>
                    {
                        const primaryPart = this.target.GetPrimaryPart();
                        const primaryCFrame = primaryPart.GetPivot();
                        primaryPart.PivotTo(primaryCFrame.add(this.direction.mul(this.velocity * deltaPerStep)));
                        primaryPart.Anchored = true;
                    }).catch((e) =>
                    {
                        warn(`An error occured within an impulse: \n${e}`);
                        this.Stop();
                    });
                });
            }

            public Stop()
            {
                this.ImpulseEvent = this.ImpulseEvent?.Disconnect();
                ConstantImpulse.Impulses.delete(this);
            }

            public isEnabled()
            {
                return !!this.ImpulseEvent;
            }

            private ImpulseEvent?: RBXScriptConnection | void;
        }

        export class PhysicsImpulse
        {
            /**
             * A physics impulse applied using {@link BasePart.ApplyImpulse BasePart.ApplyImpulse()}.
             * Immutable.
             */
            constructor(
                private readonly target: PhysicsEntity<PhysicsAttributes, Model & { PrimaryPart: BasePart }>,
                private readonly direction: Vector3,
                private readonly velocity: number,
            )
            {}

            Apply()
            {
                this.target.GetPrimaryPart().ApplyImpulse(this.direction.mul(this.velocity));
            }
        }
    }
    export interface PhysicsAttributes {
        /**
         * How quickly the item falls and how far it can get knocked back.
         * Also determines how susceptible the item is to bouncing and rolling.
         */
        Weight: number,

        /**
         * The knockback resistance of the item.
         */
        Inertia: number,
    }

    @Component({
        defaults: {
        Weight: 100,
        Inertia: 1,
        }
        })
    export class PhysicsEntity<A extends PhysicsAttributes, I extends Model & { PrimaryPart: BasePart } > extends BaseComponent<A,I> implements OnStart
    {
        constructor(protected readonly combatService: CombatService, private readonly effectsService: EffectsService)
        {
            super();
            this.mainAttachment = new Instance("Attachment");

            this.mainVelocity.ForceLimitMode = Enum.ForceLimitMode.Magnitude;
            this.mainAttachment.Parent = this.effectsService.globalAttachmentOrigin;

            const { AssemblyRootPart } = this.GetPrimaryPart();
            if (AssemblyRootPart)

                AssemblyRootPart.Massless = true;
        }

        onStart()
        {
            assert(this.GetPrimaryPart(), "entity does not have a primary part");
            const deletedHandler = this.GetPrimaryPart().AncestryChanged.Connect(() =>
            {
                if (this.GetPrimaryPart().IsDescendantOf(Workspace))
                {
                    this.Deleted.Fire();
                    this.Deleted.Destroy();
                    deletedHandler.Disconnect();
                }
            });
        }

        public RotateFacing(towards: Vector3): void
        public RotateFacing(towards: Instance & { Position: Vector3 }): void
        public RotateFacing(towards: Instance & { Position: Vector3 } | Vector3)
        {
            const primaryPart = this.GetPrimaryPart();

            if (typeIs(towards, "Instance"))
            {
                primaryPart.PivotTo(CFrame.lookAt(primaryPart.Position, towards.Position));

                return;
            }

            primaryPart.PivotTo(CFrame.lookAt(primaryPart.Position, primaryPart.Position.add(towards)));
        }

        public ConstantImpulse(direction: Vector3, velocity: number): Impulse.ConstantImpulse
        {
            return new Impulse.ConstantImpulse(this, direction, velocity);
        }

        public PhysicsImpulse(direction: Vector3, velocity: number): Impulse.PhysicsImpulse
        {
            return new Impulse.PhysicsImpulse(this, direction, velocity);
        }

        public CFrame(): CFrame
        {
            return this.instance.GetPivot();
        }

        public GetPrimaryPart(): BasePart
        {
            return this.instance.PrimaryPart;
        }

        public Forward(): Vector3
        {
            return this.instance.GetPivot().LookVector;
        }

        public Backward(): Vector3
        {
            return this.Forward().mul(-1);
        }

        public Right(): Vector3
        {
            return this.instance.GetPivot().RightVector;
        }

        public Left(): Vector3
        {
            return this.Right().mul(-1);
        }

        public Up(): Vector3
        {
            return this.instance.GetPivot().UpVector;
        }

        public Down(): Vector3
        {
            return this.Up().mul(-1);
        }

        public Deleted = new Signal<() => void>();

        private readonly mainAttachment;

        private readonly mainVelocity = new Instance("LinearVelocity", this.instance.PrimaryPart);
    }
}