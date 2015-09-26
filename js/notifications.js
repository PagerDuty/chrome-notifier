// Simple script to poll PagerDuty API for new incidents, and trigger a Chrome notification for
// any it finds. Will also give user ability to ack/resolve incidents right from the notifs.

// TODO use chrome.alarms instead

// Helper wrappers for HTTP methods.
function HTTP()
{
  this.GET = function GET(url, callback)
  {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function()
    {
      if (xhr.readyState == 4)
      {
        try
        {
          callback(JSON.parse(xhr.responseText));
        }
        catch(e)
        {
          // Ignore any parsing errors and carry on.
        } 
      }
    };
    xhr.send();
  }
  
  this.PUT = function PUT(url)
  {
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.send();
  }
}

function PagerDutyNotifier()
{
  // Members
  var self = this; // Self-reference
 
  self.pollInterval = 15; // Number of seconds between checking for new notifications.
  self.account      = ""; // The PagerDuty account name you want to notify on.

  self.http      = new HTTP();   // Helper for HTTP calls.
  self.incidents = new Object(); // Why the fuck doesn't chrome.notifications have a .get(id) method?
                                 // Fuck it, just store ourselves for now.

  // Ctor  
  self._construct = function _construct()
  {  
    // Set up the poller.
    setInterval(function() { self.pollNewIncidents(); }, self.pollInterval * 1000);
    self.pollNewIncidents();  
  
    // Setup event listeners.
    self.setupEventHandlers();
    
    // Retrieved saved configuration.
    chrome.storage.sync.get(
    {
      pdAccountId: '',
      pdPollInterval: 15
    },
    function(items)
    {
      self.pollInterval = items.pdPollInterval;
      self.account = items.pdAccountId;
    });
  }
  
  // This will set up any event handlers we need.
  self.setupEventHandlers = function setupEventHandlers()
  { 
    // Add event handlers for button clicks to make the necessary API calls.
    chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex)
    {
      var incident = self.incidents[notificationId];
      switch (buttonIndex)
      {
        case 0: // Acknowledge
          self.http.PUT('https://' + self.account + '.pagerduty.com/api/v1/incidents/' + incident.id + '/acknowledge');
          break;

        case 1: // Resolve
          self.http.PUT('https://' + self.account + '.pagerduty.com/api/v1/incidents/' + incident.id + '/resolve');
          break;
      }
    });

    // Add event handler for when a notification is clicked to load the incident in a new tab.
    chrome.notifications.onClicked.addListener(function(notificationId)
    {
      window.open(self.incidents[notificationId].html_url);
    });
  }

  // This is the poller action, which will trigger an API request and then pass any incidents
  // it gets to the parsing function.
  self.pollNewIncidents = function pollNewIncidents()
  {
    // Sanity check that an account has been set.
    if (self.account == "") { return; }
  
    // Clear any previous incident state we were storing
    self.incidents = new Object();
  
    // We only want events triggered since we last polled.
    var since = new Date();
    since.setSeconds(since.getSeconds() - self.pollInterval);

    self.http.GET('https://' + self.account + '.pagerduty.com/api/v1/incidents?'
                    + 'status=triggered&'
                    + 'urgency=high&'
                    + 'since=' + since.toISOString(),
                  self.parseIncidents);
  }

  // This will parse the AJAX response and trigger notifications for each incident.
  self.parseIncidents = function parseIncidents(data)
  {
    for (var i in data.incidents) { self.triggerNotification(data.incidents[i]); }
  }
  
  // This will trigger the actual notification based on an incident object.
  self.triggerNotification = function triggerNotification(incident)
  {
    chrome.notifications.create(incident.id,
    {
      type: "basic",
      title: incident.trigger_summary_data.subject,
      message: "Service: " + incident.service.name,
      iconUrl: chrome.extension.getURL("img/icon-256.png"),
      priority: 2,
      isClickable: true,
      contextMessage: incident.html_url.replace('https://','').split(/[/?#]/)[0],
      buttons: [
        { title: "Acknowledge" },
        { title: "Resolve" }
      ]
    });

    // SUPERHACK: Update our internal list
    self.incidents[incident.id] = incident;
  }
  
  self._construct();
}

var _pdNotifier = new PagerDutyNotifier();
