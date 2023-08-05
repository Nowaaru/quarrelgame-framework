import { Skill, Animation } from "shared/util/character";
import { Hitbox } from "shared/util/hitbox";

export const SlashClose =
    new Skill.SkillBuilder()
        .SetName("Close Slash")
        .SetFrameData(
            new Skill.FrameDataBuilder()
                .SetStartup(7)
                .SetActive(6)
                .SetRecovery(10)
                .SetContact(3)
                .SetBlock(3)
                .SetHitbox(
                    new Hitbox.HitboxBuilder()
                        .SetOffset(new Vector3(0, 0.5, 2))
                        .SetSize(new Vector3(2, 2, 3.5))
                        .Construct()
                )
                .SetAnimation(
                    new Animation.AnimationBuilder()
                        .SetName("SlashClose")
                        .SetAnimationId("rbxassetid://14289903269")
                        .Construct()
                )
        )
        .Construct();

export const ForwardKick =
    new Skill.SkillBuilder()
        .SetGatling(SlashClose)
        .SetName("Forward Kick")
        .SetFrameData(
            new Skill.FrameDataBuilder()
                .SetStartup(6)
                .SetActive(4)
                .SetRecovery(10)
                .SetContact(1)
                .SetBlock(-2)
                .SetHitbox(
                    new Hitbox.HitboxBuilder()
                        .SetOffset(new Vector3(1.5, -0.25, 1.5))
                        .SetSize(new Vector3(2, 2, 2.75))
                        .Construct()
                )
                .SetAnimation(
                    new Animation.AnimationBuilder()
                        .SetName("Forward Kick")
                        .SetAnimationId("rbxassetid://14321788726")
                        .Construct()
                )
        )
        .Construct();
