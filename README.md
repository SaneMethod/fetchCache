fetchCache
==========

fetchCache is an extension of the [Fetch API](https://developer.mozilla.org/en/docs/Web/API/Fetch_API) that
 allows you to store the responses to fetch requests. This is useful for reducing the bandwidth that
 your application consumes, or for offline app usage. Responses are stored using any object implementing the
[storage interface](https://developer.mozilla.org/en-US/docs/Web/API/Storage), such as
[localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

Note that, due to the limitations of localStorage (or sessionStorage), if using these objects to store responses,
only values that can be serialized as a string (including JSON) can be stored.

# Usage

## Parameters
```javascript
	fetch('url', {
		method: 'GET',
		localCache   : true,        // Required. Either a boolean, in which case localStorage will be used, or
		an object that implements the Storage interface.

		cacheTTL     : 1,           // Optional. In hours, default is 5.
		cacheKey     : 'post',      // Optional. If not included, a cacheKey will be generated from the URL, the
		content-type header and the request body, if available.
		isCacheValid : function(){  // Optional. A function that should return a boolean value.
			return true;
		}
	}).then(function(response){
	    // The response is available here.
	});
```
On your Fetch request you get 4 new parameters :

* localCache
	* Turn localCache on/off, or specify an object implementing the Storage interface to use.
	* Default: false
* cacheTTL
    * Time in hours the entry should be valid.
    * Use a float to indicate a fractional percentage of an hour - e.g. ```0.5``` for 1/2 hour.
    * Default : 5 hours
* cacheKey
	* CacheKey is the key that will be used to store the response in localStorage. It allows you to delete your cached value easily with, for example, the localStorage.removeItem() function.
	* Default: URL + Content-Type header (if any) + request body (if any)
* isCacheValid
	* This function must return true or false. On false, the cached response is removed.
	* Default: null

## JSON Fetch Example
```javascript
    fetch('url', {
        method: 'GET',
        credentials: 'include',
        localCache: true,
        cacheKey: 'cachedJSON'
    }).then((res) => {
        return res.json();
    }).then((json) => {
        // Your json parsed response is available here, either direct from the server,
        // or pulled from the cache if a cached value for the specified cacheKey is available.
    });
```

## Notes

* You can delete the cache by using ```localStorage.clear()```, or by using ```localStorage.removeItem('cacheKey')```
if you specified a cacheKey. Note the above assumes you're using localStorage - replace as appropriate with your
Storage interface implementing object.
* You can pre-load content with this plugin. You just have do to an initial fetch request with the same
cacheKey.

# Installation

You can use either ```bower``` or ```npm``` to install, or download manually.

## Bower:
```
bower install fetchCache
```

## NPM:
```
npm install fetchCache
```

As we override the native fetch, this code should be added to your project such that it runs before any other code
which calls fetch (i.e. in the browser, include it in a header or body script tag before your other script(s)).

# License

This project is distributed under Apache 2 License. See LICENSE.txt for more information.
