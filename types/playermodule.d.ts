declare namespace PlayerModule
{
    export interface PlayerModule
    {
        cameras: CameraModule.CameraModule;

        controls: ControlModule.ControlModule;

        GetControls(): ControlModule.ControlModule;

        GetCameras(): CameraModule.CameraModule;

        GetClickToMoveController(): ControlModule.ClickToMoveController.ClickToMove;
    }
}
