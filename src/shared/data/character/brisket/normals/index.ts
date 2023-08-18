
import { Skill } from "shared/util/character";
import { Hitbox } from "shared/util/hitbox";
import { Animation } from "shared/util/animation";

export const ForwardKick =
    new Skill.SkillBuilder()
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
                        .IsAttack()
                        .SetName("5K")
                        .SetAnimationId("rbxassetid://14321788726")
                        .Construct()
                )
        )
        .Construct();

export const LowHeavy =
    new Skill.SkillBuilder()
        .SetName("Low Heavy Slash")
        .SetFrameData(
            new Skill.FrameDataBuilder()
                .SetStartup(11)
                .SetActive(6)
                .SetRecovery(21)
                .SetContact(4)
                .SetBlock(8)
                .SetHitbox(
                    new Hitbox.HitboxBuilder()
                        .SetOffset(new Vector3(0, 0.5, 2))
                        .SetSize(new Vector3(2, 2, 3.5))
                        .Construct()
                )
                .SetAnimation(
                    new Animation.AnimationBuilder()
                        .IsAttack()
                        .SetName("2HS")
                        .SetAnimationId("rbxassetid://14322453534")
                        .Construct()
                )
        )
        .Construct();

export const ForwardPunch =
    new Skill.SkillBuilder()
        .SetName("Forward Punch")
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
                        .IsAttack()
                        .SetName("6P")
                        .SetAnimationId("rbxassetid://14321788726")
                        .Construct()
                )
        )
        .Construct();

export const CloseSlash =
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
                            .SetName("C.S")
                            .SetAnimationId("rbxassetid://14289903269")
                            .IsAttack()
                            .Construct()
                    )
            )
            .Construct();

CloseSlash.AddGatling(LowHeavy);
LowHeavy.AddGatling(ForwardKick);
ForwardKick.AddGatling(CloseSlash);