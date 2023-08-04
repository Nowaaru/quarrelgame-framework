import { Components } from "@flamework/components";
import { Dependency } from "@flamework/core";
import RaycastHitbox, { HitboxObject } from "@rbxts/raycast-hitbox";
import { HttpService, RunService, Workspace } from "@rbxts/services";
import { $env } from "rbxts-transform-env";
import { Skill } from "shared/util/character";

import type { QuarrelGame } from "server/services/quarrelgame.service";
import { EntityState } from "../lib";
import Make from "@rbxts/make";
import Signal from "@rbxts/signal";

type Frames = number;
export namespace Hitbox {
    export enum HitResult {
        Blocked,
        Contact,
    }

    export class HitboxBuilder
    {
        private readonly defaultSize = new Vector3(4,4,4);

        private readonly hitboxId = HttpService.GenerateGUID(false);

        private size: Vector3 = this.defaultSize;

        private disjointOffset: Vector3 = Vector3.zero;

        private frameDuration?: Frames;

        private hitRegion = HitboxRegion.High;

        /**
         * Set the size of the hitbox.
         * @param size The size of the hitbox.
         */
        public SetSize(size = this.defaultSize)
        {
            this.size = size;

            return this;
        }

        /**
         * Set the offset of the Hitbox.
         * @param offset The offset of the hitbox.
         */
        public SetOffset(offset = Vector3.zero)
        {
            this.disjointOffset = offset;

            return this;
        }

        public SetDuration(frames?: Frames)
        {
            this.frameDuration = frames;

            return this;
        }

        /**
         * Set where the hitbox will process contacts.
         * @param region The region that the hitbox will hit.
         */
        public SetRegion(region: HitboxRegion)
        {
            this.hitRegion = region;

            return this;
        }

        private Compile(): HitboxProps
        {
            const { disjointOffset, frameDuration, size, hitboxId, hitRegion } = this;

            return {
                hitboxId,
                disjointOffset,
                frameDuration,
                size,
                hitRegion
            };
        }

        public Construct()
        {
            return new Hitbox(this.Compile());
        }
    }

    /**
     * The region where the Hitbox
     * will hit.
     */
    enum HitboxRegion {
        /**
         * The attack can be blocked by
         * crouch-blocking entities only.
         */
        Low,
        /**
         * The attack can be blocked by
         * standing-blocking entities or
         * crouch-blocking entities.
         */
        High,
        /**
         * The attack can be blocked by
         * standing-blocking entities only.
         */
        Overhead
    }
    interface HitboxProps {
        size: Vector3;
        disjointOffset: Vector3;
        frameDuration?: number;
        hitboxId: string;
        hitRegion: HitboxRegion;
    }

    export class Hitbox
    {
        public readonly size;

        public readonly hitboxId;

        public readonly disjointOffset;

        public readonly hitRegion;

        /**
         * A hitbox instance.
         */
        constructor({
            size,
            disjointOffset,
            hitboxId,
            hitRegion
        }: HitboxProps)
        {
            this.disjointOffset = disjointOffset;
            this.size = size;
            this.hitboxId = hitboxId;
            this.hitRegion = hitRegion;
        }

        public Initialize(target: BasePart | Bone, skill: Skill.Skill)
        {
            return new ActiveHitbox(this, target, skill);
        }
    }

    export class ActiveHitbox
    {
        public readonly Contact: Signal<(contactedModel: Model, contactType: HitResult) => void> = new Signal();

        private readonly hitbox: Omit<Hitbox, "Initialize">;

        private readonly hitProcessor: RBXScriptConnection;

        private hitboxVisualizer?: BasePart;

        private contactedModels: Set<Model> = new Set();

        private active = true;

        constructor(hitbox: Hitbox, private readonly target: BasePart | Bone, private readonly skill: Skill.Skill)
        {
            this.hitbox = hitbox;

            const targetCFrame = target.CFrame.add(target.CFrame.VectorToWorldSpace(this.hitbox.disjointOffset.mul(new Vector3(1,1,-1))));
            const preferredHitboxVisualizer = this.hitboxVisualizer = Make("Part", {
                Parent: Workspace,
                CFrame: targetCFrame,
                Size: this.hitbox.size,

                Anchored: true,
                CanQuery: false,
                CanCollide: false,
                CanTouch: false,
            });


            Make("Highlight", {
                Adornee: preferredHitboxVisualizer,
                FillTransparency: 0.8,
                OutlineTransparency: 0.9,

                Parent: preferredHitboxVisualizer,
            });

            task.delay(3, () =>
            {
                preferredHitboxVisualizer.Destroy();
            });

            const overlapParams = new OverlapParams();
            overlapParams.FilterDescendantsInstances = [target.FindFirstAncestorWhichIsA("Model")].filterUndefined();
            overlapParams.FilterType = Enum.RaycastFilterType.Exclude;

            this.hitProcessor = RunService.Heartbeat.Connect(async () =>
            {
                const instancesInHitbox = Workspace.GetPartBoundsInBox(targetCFrame, this.hitbox.size, overlapParams);
                const nonCachedModels = instancesInHitbox.mapFiltered((i) => i.FindFirstAncestorWhichIsA("Model")).filter((j) => !this.contactedModels.has(j));

                if (nonCachedModels.isEmpty())

                    return;

                nonCachedModels.map((m) => [m, m.FindFirstChildWhichIsA("Humanoid")] as const)
                    .filter((n) => !!n[ 1 ])
                    .filter(([o], p, q) => q.findIndex(([r]) => r === o) === p) // remove duplicates
                    .forEach(async([hitModel, hitHumanoid]) =>
                    {
                        this.contactedModels.add(hitModel);

                        assert(hitHumanoid, "hit humanoid is not found");
                        assert(hitModel, "hit model is not found");

                        const entityImport = await import("server/components/entity.component");
                        const entityComponent = Dependency<Components>().getComponent(hitModel, entityImport.Entity.Combatant);

                        print("model hit! :: ", hitModel);
                        if (entityComponent)
                        {
                            const quarrelGameService = await import("server/services/quarrelgame.service");
                            assert(quarrelGameService, "quarrel game service not found");

                            const hitboxModel = target.FindFirstAncestorWhichIsA("Model");
                            assert(hitboxModel, "hitbox does not belong to a model");

                            const hitboxPossessor = hitboxModel?.GetAttribute("ParticipantOwner")
                                    ? Dependency<QuarrelGame>().GetParticipantFromId((target.GetAttribute("ParticipantOwner") as string)!)?.character
                                    : hitboxModel;

                            assert(hitboxPossessor, "could not find hitbox possessor");

                            const entityIsBlocking = entityComponent.IsBlocking(hitboxPossessor.GetPivot().Position);
                            const possessorEntityComponent = Dependency<Components>().getComponent(hitboxPossessor, entityImport.Entity.Combatant);
                            const { hitRegion } = this.hitbox;
                            if (entityIsBlocking)
                            {
                                if (entityComponent.IsState(EntityState.Crouch))
                                {
                                    if (hitRegion === HitboxRegion.Overhead)
                                    {
                                        this.Contact.Fire(hitModel, HitResult.Contact);
                                        entityComponent.SetState(EntityState.HitstunCrouching);
                                    }
                                    else
                                    {
                                        this.Contact.Fire(hitModel, HitResult.Blocked);
                                        entityComponent.AddBlockStun(skill.FrameData.BlockStunFrames);
                                    }

                                    return;
                                }

                                if (hitRegion === HitboxRegion.Low)
                                {
                                    this.Contact.Fire(hitModel, HitResult.Contact);
                                    entityComponent.SetState(EntityState.Hitstun);
                                }
                                else
                                {

                                    this.Contact.Fire(hitModel, HitResult.Blocked);
                                    entityComponent.AddBlockStun(skill.FrameData.BlockStunFrames);
                                }

                                return;

                            }

                            this.Contact.Fire(hitModel, HitResult.Contact);
                            if (entityComponent.IsState(EntityState.Crouch))

                                entityComponent.SetState(EntityState.HitstunCrouching);

                            else entityComponent.SetState(EntityState.Hitstun);

                            if (possessorEntityComponent)

                                entityComponent.Counter(possessorEntityComponent);

                            else print("no possessorEntityComponent");

                        }
                    });
            });
        }

        public Stop()
        {
            if (!this.active)

                return;

            this.active = false;
            this.contactedModels.clear();
            this.hitProcessor.Disconnect();
            this.Contact.Destroy();
        }
    }
}