import { Service, OnStart, OnInit, Modding } from "@flamework/core";
import { RunService } from "@rbxts/services";
import { ServerFunctions } from "shared/network";

export interface OnFrame {
    /**
     * Fires whenever a Scheduler frame passes.
     */
    onFrame(dt: number): void
}

/**
 * The Scheduler service.
 *
 * Runs at a lower rate than the game.
 * Animations should be at this frame rate.
 */
@Service({})
export class SchedulerService implements OnStart, OnInit
{
    private tickListeners: Set<OnFrame> = new Set();

    private dtFrameCounter = 0;

    onInit()
    {
        Modding.onListenerAdded<OnFrame>((listener) => this.tickListeners.add(listener));
        Modding.onListenerRemoved<OnFrame>((listener) => this.tickListeners.delete(listener));
    }

    onStart()
    {
        let _unmanagedDtFrameCounter = 0;

        RunService.Heartbeat.Connect((dt) =>
        {
            _unmanagedDtFrameCounter += dt;
            if (_unmanagedDtFrameCounter >= 1 / this.gameTickRate)
            {
                this.Tick(_unmanagedDtFrameCounter);
                _unmanagedDtFrameCounter = 0;
            }
        });

        ServerFunctions.GetGameTickRate.setCallback(() => this.gameTickRate);
    }

    private async Tick(dt: number)
    {
        this.dtFrameCounter = dt;

        this.tickListeners.forEach((listener) =>
        {
            listener.onFrame(this.dtFrameCounter);
        });
    }

    public async WaitForNextTick(): Promise<number>
    {
        return new Promise((res) =>
        {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const that = this;
            const artificialListener = {
                onFrame(dt)
                {
                    that.tickListeners.delete(artificialListener);
                    res(dt);
                },
            } as OnFrame;

            this.tickListeners.add(artificialListener);
        });
    }

    public GetTickRate()
    {
        return this.gameTickRate;
    }

    private readonly gameTickRate = 24;
}