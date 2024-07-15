import { RecipleRegistryCache } from 'reciple-registry-cache';

export default new RecipleRegistryCache({
    // The folder where the cache will be stored (default: ./node_modules/.cache/reciple-registry-cache/)
    cacheFolder: undefined,

    // The maximum age of the cache in milliseconds (default: 86400000 = 24 hours)
    maxCacheAgeMs: undefined
});