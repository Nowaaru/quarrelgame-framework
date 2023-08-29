import { Controller, Modding } from "@flamework/core";
import { ContentProvider } from "@rbxts/services";

interface OnAssetLoad {
    onAssetLoadFailed?(assetId: string, errorMessage: string): void;
    onAssetLoading?(assetId: string): void;
    onAssetLoaded?(assetId: string): void;
}

@Controller({
    loadOrder: 1,
    })
export class ResourceController implements OnAssetLoad
{
    private readonly assetLoadListeners = new Set<OnAssetLoad>();

    private readonly preloadedAssets = new Set<string>();

    private readonly preloadQueue = new Set<string>();

    private readonly loadedInstanceMap = new Map<string, Set<Instance>>();

    constructor()
    {
        Modding.onListenerAdded<OnAssetLoad>((object) => this.assetLoadListeners.add(object));
        Modding.onListenerRemoved<OnAssetLoad>((object) => this.assetLoadListeners.delete(object));
    }

    public onAssetLoaded(assetId: string): void
    {
        this.preloadedAssets.add(assetId);
    }

    public onAssetLoading(assetId: string): void
    {
        this.preloadQueue.delete(assetId);
    }

    private assetLoadedHandler(assetId: string, assetFetchStatus: Enum.AssetFetchStatus, instance?: Instance): Enum.AssetFetchStatus | void
    {
        switch (assetFetchStatus)
        {
            case Enum.AssetFetchStatus.Failure:

                this.assetLoadListeners.forEach((object) => object.onAssetLoadFailed?.(assetId, "Asset fetch failed."));

                return assetFetchStatus;

            case Enum.AssetFetchStatus.Success:
                this.assetLoadListeners.forEach((object) => object.onAssetLoaded?.(assetId));
                if (instance)

                    this.loadedInstanceMap.set(assetId, this.loadedInstanceMap.get(assetId)?.add(instance) ?? new Set([ instance ]));

                return assetFetchStatus;

            case Enum.AssetFetchStatus.TimedOut:
                this.assetLoadListeners.forEach((object) => object.onAssetLoadFailed?.(assetId, "Asset fetch timed out."));
                break;

            case Enum.AssetFetchStatus.Loading:
                this.assetLoadListeners.forEach((object) => object.onAssetLoading?.(assetId));
                break;

            case Enum.AssetFetchStatus.None:
                /* falls through */
            default:
                break;
        }


    }

    public requestPreloadInstance<T extends Instance>(instance: T): Promise<void>
    {
        return new Promise((res, rej) =>
        {
            ContentProvider.PreloadAsync([ instance ], (contentId, fetchStatus) =>
            {
            });
        }) as never;
    }

    public requestPreloadInstances<T extends Instance>(instances: T[]): Promise<void>
    {
        
        
        return new Promise<void>((res, rej) =>
        {
            ContentProvider.PreloadAsync(instances, (contentId, fetchStatus) => 
            {
                this.assetLoadedHandler(contentId, fetchStatus);
            });

            res();
        }) as never;
    }

    public requestPreloadAsset(assetId: string)
    {
        if (this.preloadQueue.has(assetId))

            return Promise.resolve();

        return new Promise((res, rej) =>
        {
            this.preloadQueue.add(assetId);

            const fetchLoadedSignal = ContentProvider.GetAssetFetchStatusChangedSignal(assetId).Connect((assetFetchStatus) =>
            {
                const assetLoadResult = this.assetLoadedHandler(assetId, assetFetchStatus);
                if (assetLoadResult !== undefined)

                    fetchLoadedSignal.Disconnect();
            });
        });
    }

    public requestBatchPreloadAssets(assetIds: string[])
    {
        return new Promise<void>((res, rej) =>
        {
            Promise.allSettled(assetIds.map((assetId) => this.requestPreloadAsset(assetId)));
        });
    }
}