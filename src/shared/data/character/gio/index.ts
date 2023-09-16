import { Animation } from "shared/util/animation";
import { Character, Skill } from "shared/util/character";
import { Hitbox } from "shared/util/hitbox";
import { Input, Motion } from "shared/util/input";
import { EntityState } from "shared/util/lib";
import { CloseSlash, ForwardKick, LowHeavy } from "./normals";

const Gio = new Character.CharacterBuilder3D()
    .SetName("Vannagio")
    .SetDescription("Test character")
    .SetSubheader("5K: THE CHARACTER")
    .SetHeader("CHECK THIS DASH")
    .SetModel(Character.CharacterModel.jane as never)
    .SetEasiness(5)
    .SetAttack(Input.Slash, CloseSlash)
    .SetAttack(Input.Kick, ForwardKick)
    .SetAttack(Input.Heavy, LowHeavy)
    .SetAnimation(
        EntityState.Idle,
        new Animation.AnimationBuilder()
            .SetName("Idle")
            .SetAnimationId("rbxassetid://14280621593")
            .SetPriority(Enum.AnimationPriority.Idle)
            .SetLooped(true)
            .Construct(),
    )
    .SetAnimation(
        EntityState.Crouch,
        new Animation.AnimationBuilder()
            .SetName("Crouch")
            .SetAnimationId("rbxassetid://14288051389")
            .SetPriority(Enum.AnimationPriority.Movement)
            .SetLooped(true)
            .Construct(),
    )
    .AddSkill(
        new Skill.SkillBuilder()
            .SetName("Test Skill")
            .SetDescription("A test skill.")
            .SetFrameData(
                new Skill.FrameDataBuilder()
                    .SetAnimation(
                        new Animation.AnimationBuilder()
                            .SetName("Test Skill")
                            .SetAnimationId("rbxassetid://14280676559")
                            .SetPriority(Enum.AnimationPriority.Action)
                            .Construct(),
                    )
                    .SetStartup(4)
                    .SetActive(6)
                    .SetRecovery(-4)
                    .SetHitbox(
                        new Hitbox.HitboxBuilder()
                            .SetOffset()
                            .SetSize(new Vector3(7, 7, 7))
                            .Construct(),
                    ),
            )
            .SetMotionInput([Motion.Down, Motion.DownForward, Motion.Forward, Input.Slash]) // 236S
            .SetGaugeRequired(25)
            .SetGroundedType(Skill.SkillGroundedType.Ground)
            .SetReversal(false)
            .Construct(),
    )
    .Construct();

export = Gio;
