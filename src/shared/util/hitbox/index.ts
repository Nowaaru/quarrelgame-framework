import { Components } from "@flamework/components";
import { Dependency } from "@flamework/core";
import RaycastHitbox, { HitboxObject } from "@rbxts/raycast-hitbox";
import { HttpService } from "@rbxts/services";
import { $env } from "rbxts-transform-env";
import { Skill } from "shared/util/character";

import type { QuarrelGame } from "server/services/quarrelgame.service";
import { EntityState } from "../lib";

type Frames = number;
export namespace Hitbox {
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
        private readonly hitbox: Omit<Hitbox, "Initialize">;

        private readonly raycastHitbox: HitboxObject;

        constructor(hitbox: Hitbox, private readonly target: BasePart | Bone, private readonly skill: Skill.Skill)
        {
            this.hitbox = hitbox;

            this.raycastHitbox = new RaycastHitbox(target);

            this.raycastHitbox.Visualizer = $env.boolean("DEBUG_VISUALIZER");

            const {size: {X,Y,Z}, disjointOffset} = hitbox;
            const sides = [new Vector3(X), new Vector3(0,Y), new Vector3(0,0,Z)] as const;

            this.raycastHitbox.SetPoints(target, [
                ...sides.map((n) => n.add(disjointOffset)),
                ...sides.map((n) => n.mul(-1).add(disjointOffset))
            ]);

            this.raycastHitbox.HitStart();

            this.raycastHitbox.OnHit.Connect(async (hitPart, hitHumanoid) =>
            {
                const hitModel = hitHumanoid?.FindFirstAncestorWhichIsA("Model");
                assert(hitHumanoid, "hit humanoid is not found");
                assert(hitModel, "hit model is not found");

                const entityImport = await import("server/components/entity.component");
                const entityComponent = Dependency<Components>().getComponent(hitModel, entityImport.Entity.Entity);
                assert(entityComponent, "entity component not found");

                const quarrelGameService = await import("server/services/quarrelgame.service");
                assert(quarrelGameService, "quarrel game service not found");

                const hitboxModel = target.FindFirstAncestorWhichIsA("Model");
                assert(hitboxModel, "hitbox does not belong to a model");

                const hitboxPossessor = hitboxModel?.GetAttribute("ParticipantOwner")
                    ? Dependency<QuarrelGame>().GetParticipantFromId((target.GetAttribute("ParticipantOwner") as string)!)?.character
                    : hitboxModel;

                assert(hitboxPossessor, "could not find hitbox possessor");

                const entityIsBlocking = entityComponent.IsBlocking(hitboxPossessor.GetPivot().Position);
                const possessorEntityComponent = Dependency<Components>().getComponent(hitboxPossessor, entityImport.Entity.Entity);
                const { hitRegion } = this.hitbox;
                if (entityIsBlocking)
                {
                    if (entityComponent.IsState(EntityState.Crouch))
                    {
                        if (hitRegion === HitboxRegion.Overhead)

                            entityComponent.SetState(EntityState.HitstunCrouching);

                        else

                            entityComponent.AddBlockStun(skill.FrameData.BlockStunFrames);

                    }

                }
                else
                {
                    if (entityComponent.IsState(EntityState.Crouch))

                        entityComponent.SetState(EntityState.HitstunCrouching);

                    else entityComponent.SetState(EntityState.Hitstun);

                    if (possessorEntityComponent)

                        entityComponent.Counter(possessorEntityComponent);

                    else print("no possessorEntityComponent");
                }
            });
        }

        public Stop()
        {
            this.raycastHitbox.HitStop();
        }
    }
}