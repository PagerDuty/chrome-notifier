// Helper wrappers for PagerDuty API methods.
function PDAPI(apiKey, version = 2)
{
    // Members
    var self       = this;   // Self-reference
    self.apiKey    = apiKey; // API key used for requests.
    self.userAgent = "pd-chrome-notifier-" + chrome.app.getDetails().version; // Will be in the X-Requested-With header of requests.

    // Wrapper for generic XMLHttpRequest stuff
    this.prepareRequest = function prepareRequest(method, url)
    {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader("X-Requested-With", self.userAgent);
        xhr.setRequestHeader("X-PagerDuty-Api-Local", 1);
        xhr.setRequestHeader("Accept", "application/vnd.pagerduty+json;version=" + version);

        // If we have a valid API key, authenticate using that.
        if (self.apiKey != null && self.apiKey.length == 20)
        {
            xhr.setRequestHeader("Authorization", "Token token=" + self.apiKey);
        }

        return xhr;
    }

    // Perform a GET request, and trigger the callback with the result.
    this.GET = function GET(url, callback, error_callback = null)
    {
        var req = self.prepareRequest("GET", url);
        req.onreadystatechange = function()
        {
            if (req.readyState == 4)
            {
                try
                {
                    callback(JSON.parse(req.responseText));
                }
                catch(e)
                {
                    if (error_callback != null) { error_callback(req.status, req.responseText); }
                }
            }
        };
        req.send();
    }

    // Fire and forget a PUT request.
    this.PUT = function PUT(url, data)
    {
        var req = self.prepareRequest("PUT", url);
        req.setRequestHeader("Content-Type", "application/json");
        req.send(data);
    }
}
