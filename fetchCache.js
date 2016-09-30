/**
 * Copyright (c) Christopher Keefer, 2016.
 * https://github.com/SaneMethod/fetchCache
 *
 * Override fetch in the global context to allow us to cache the response to fetch in a Storage interface
 * implementing object (such as localStorage).
 */
(function (fetch) {
    /* If the context doesn't support fetch, we won't attempt to patch in our
     caching using fetch, for obvious reasons. */
    if (!fetch) return;

    /**
     * Generate the cache key under which to store the local data - either the cache key supplied,
     * or one generated from the url, the Content-type header (if specified) and the body (if specified).
     *
     * @returns {string}
     */
    function genCacheKey(url, settings) {
        var {headers:{'Content-type': type}} = ('headers' in settings) ? settings : {headers: {}},
            {body} = settings;

        return settings.cacheKey || url + (type || '') + (body || '');
    }

    /**
     * Determine whether we're using localStorage or, if the user has specified something other than a boolean
     * value for options.localCache, whether the value appears to satisfy the plugin's requirements.
     * Otherwise, throw a new TypeError indicating what type of value we expect.
     *
     * @param {boolean|object} storage
     * @returns {boolean|object}
     */
    function getStorage(storage) {
        if (!storage) return false;
        if (storage === true) return self.localStorage;
        if (typeof storage === "object" && 'getItem' in storage &&
            'removeItem' in storage && 'setItem' in storage) {
            return storage;
        }
        throw new TypeError("localCache must either be a boolean value, " +
            "or an object which implements the Storage interface.");
    }

    /**
     * Remove the item specified by cacheKey and its attendant meta items from storage.
     *
     * @param {Storage|object} storage
     * @param {string} cacheKey
     */
    function removeFromStorage(storage, cacheKey) {
        storage.removeItem(cacheKey);
        storage.removeItem(cacheKey + 'cachettl');
        storage.removeItem(cacheKey + 'dataType');
    }

    /**
     * Cache the response into our storage object.
     * We clone the response so that we can drain the stream without making it
     * unavailable to future handlers.
     *
     * @param {string} cacheKey Key under which to cache the data string. Bound in
     * fetch override.
     * @param {Storage} storage Object implementing Storage interface to store cached data
     * (text or json exclusively) in. Bound in fetch override.
     * @param {Number} hourstl Number of hours this value shoud remain in the cache.
     * Bound in fetch override.
     * @param {Response} response
     */
    function cacheResponse(cacheKey, storage, hourstl, response) {
        var cres = response.clone(),
            dataType = (response.headers.get('Content-Type') || 'text/plain').toLowerCase();

        cres.text().then((text) => {
            try {
                storage.setItem(cacheKey, text);
                storage.setItem(cacheKey + 'cachettl', +new Date() + 1000 * 60 * 60 * hourstl);
                storage.setItem(cacheKey + 'dataType', dataType);
            } catch (e) {
                // Remove any incomplete data that may have been saved before the exception was caught
                removeFromStorage(storage, cacheKey);
                console.log('Cache Error: ' + e, cacheKey, text);
            }
        });

        return response;
    }

    /**
     * Create a new response containing the cached value, and return a promise
     * that resolves with this response.
     *
     * @param value
     * @param dataType
     * @returns {Promise}
     */
    function provideResponse(value, dataType) {
        var response = new Response(
            value,
            {
                status: 200,
                statusText: 'success',
                headers: {
                    'Content-Type': dataType
                }
            }
        );

        return new Promise(function (resolve, reject) {
            resolve(response);
        });
    }

    /**
     * Override fetch on the global context, so that we can intercept
     * fetch calls and respond with locally cached content, if available.
     * New parameters available on the call to fetch:
     * localCache   : true // required - either a boolean (if true, localStorage is used,
     * if false request is not cached or returned from cache), or an object implementing the
     * Storage interface, in which case that object is used instead.
     * cacheTTL     : 5, // optional, cache time in hours, default is 5. Use float numbers for
     * values less than a full hour (e.g. `0.5` for 1/2 hour).
     * cacheKey     : 'post', // optional - key under which cached string will be stored.
     * isCacheValid : function  // optional - return true for valid, false for invalid.
     */
    self.fetch = function (url, settings) {
        var storage = getStorage(settings.localCache),
            hourstl = settings.cacheTTL || 5,
            cacheKey = genCacheKey(url, settings),
            cacheValid = settings.isCacheValid,
            ttl,
            value,
            dataType;

        if (!storage) return fetch(url, settings);

        ttl = storage.getItem(cacheKey + 'cachettl');

        if (cacheValid && typeof cacheValid === 'function' && !cacheValid()) {
            removeFromStorage(storage, cacheKey);
            ttl = 0;
        }

        if (ttl && ttl < +new Date()) {
            removeFromStorage(storage, cacheKey);
        }

        value = storage.getItem(cacheKey);

        if (!value) {
            /* If not cached, we'll make the request and add a then block to the resulting promise,
             in which we'll cache the result. */
            return fetch(url, settings).then(cacheResponse.bind(null, cacheKey, storage, hourstl));
        }

        /* Value is cached, so we'll simply create and respond with a promise of our own,
         and provide a response object. */
        dataType = storage.getItem(cacheKey + 'dataType') || 'text/plain';
        return provideResponse(value, dataType);
    };
})(self.fetch);