// Helper wrappers for PagerDuty API methods.
export default function PDAPI(apiKey, version = 2) {
    // Members
    var self = this;   // Self-reference
    self.apiKey = apiKey; // API key used for requests.
    self.userAgent = "pd-chrome-notifier-" + chrome.runtime.getManifest().version; // Will be in the X-Requested-With header of requests.

    // Perform a GET request, and trigger the callback with the result.
    this.GET = function GET(url, callback, error_callback = null) {
        const headers = new Headers();
        headers.append('X-Requested-With', self.userAgent);
        headers.append('X-PagerDuty-Api-Local', 1);
        headers.append('Accept', "application/vnd.pagerduty+json;version=" + version);

        // If we have a valid API key, authenticate using that.
        if (self.apiKey != null && self.apiKey.length == 20) {
            headers.append('Authorization', 'Token token=' + self.apiKey);
        }

        const init = {
            method: "GET",
            headers: headers,
            mode: "cors",
            cache: "default"
        };

        fetch(url, init).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    try {
                        callback(data);
                    }
                    catch (e) {
                        if (error_callback != null) { error_callback(res.statusText, res.statusText); }
                    }
                });
            } else {
                console.error(res);
                if (error_callback != null) { error_callback(res.statusText, res.statusText); }
            }
        });
    };

    // Fire and forget a PUT request.
    this.PUT = function PUT(url, data) {
        const headers = new Headers();
        headers.append('X-Requested-With', self.userAgent);
        headers.append('X-PagerDuty-Api-Local', 1);
        headers.append('Accept', "application/vnd.pagerduty+json;version=" + version);

        // If we have a valid API key, authenticate using that.
        if (self.apiKey != null && self.apiKey.length == 20) {
            headers.append('Authorization', 'Token token=' + self.apiKey);
        }

        headers.append('Content-Type', 'application/json');

        const init = {
            method: "PUT",
            headers: headers,
            mode: "cors",
            cache: "default",
            body: data
        };

        fetch(url, init).then((res) => {
            if (!res.ok) {
                console.error(res.status);
            }
        });
    };
}
