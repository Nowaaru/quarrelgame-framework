declare namespace ControlModule
{
    interface ControlModule
    {
        GetMoveVector(): Vector3;

        GetActiveController(): ControlModule;

        UpdateActiveControlModuleEnabled(): void;

        Enable(enable?: boolean): void;

        Disable(): void;

        SelectComputerMovementModule(): LuaTuple<[unknown, boolean]>;

        SelectTouchModule(): LuaTuple<[unknown, boolean]>;

        GetClickToMoveController(): ControlModule.ClickToMoveController.ClickToMove;
    }

    namespace ClickToMoveController
    {
        interface ClickToMove
        {
            DisconnectEvents(): void;

            Start(): void;

            Stop(): void;

            CleanupPath(): void;

            Enable(enable: boolean, enableWASD: boolean, touchJumpController: unknown): void;

            SetShowPath(value: boolean): void;

            GetShowPath(): boolean;

            SetWaypointTexture(texture: string): void;

            GetWaypointTexture(): string;

            SetWaypointRadius(radius: number): void;

            GetWaypointRadius(): number;

            SetEndWaypointTexture(): void;

            GetEndWaypointTexture(): string;

            SetWaypointsAlwaysOnTop(alwaysOnTop: boolean): void;

            GetWaypointsAlwaysOnTop(): boolean;

            SetFailureAnimationEnabled(enabled: boolean): void;

            GetFailureAnimationEnabled(): boolean;

            SetIgnoredPartsTag(tag: string): void;

            GetIgnoredPartsTag(): string;

            SetUseDirectPath(directPath: boolean): void;

            GetUseDirectPath(): boolean;

            SetAgentSizeIncreaseFactor(increaseFactorPercent: number): void;

            GetAgentSizeIncreaseFactor(): number;

            SetUnreachableWaypointTimeout(timeoutInSec: number): void;

            GetUnreachableWaypointTimeout(): number;

            SetUserJumpEnabled(jumpEnabled: boolean): boolean;

            GetUserJumpEnabled(): boolean;

            MoveTo(position: Vector3, showPath: boolean, useDirectPath: boolean): boolean;
        }
    }
}
