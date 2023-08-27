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

    private assetLoadedHandler(assetId: string, assetFetchStatus: Enum.AssetFetchStatus): Enum.AssetFetchStatus | void
    {
        switch (assetFetchStatus)
        {
            case Enum.AssetFetchStatus.Failure:

                this.assetLoadListeners.forEach((object) => object.onAssetLoadFailed?.(assetId, "Asset fetch failed."));

                return assetFetchStatus;

            case Enum.AssetFetchStatus.Success:
                this.assetLoadListeners.forEach((object) => object.onAssetLoaded?.(assetId));

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

    public requestPreloadInstance<T extends Instance>(instance: T): T extends {
        [K: `${string}Id`]: string;
    } ? Promise<void> : never
    {
        return new Promise((res, rej) =>
        {
            ContentProvider.PreloadAsync([ instance ], (contentId, fetchStatus) =>
            {
                const loadedResult = this.assetLoadedHandler(contentId, fetchStatus);
                if (loadedResult && loadedResult !== Enum.AssetFetchStatus.Failure)

                    this.loadedInstanceMap.set(contentId, this.loadedInstanceMap.get(contentId)?.add(instance) ?? new Set([ instance ]));

            });
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

    public requestBatchPreloadAsset(assetIds: string[])
    {
        return new Promise<void>((res, rej) =>
        {
            Promise.allSettled(assetIds.map((assetId) => this.requestPreloadAsset(assetId)));
        });
    }
}