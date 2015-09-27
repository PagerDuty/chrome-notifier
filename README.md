# PagerDuty Chrome Notifier
A Google Chrome extension to show PagerDuty notifications using Chrome's notification API. The notification will display some information about the alert, along with buttons to acknowledge and resolve it right from the notification!

All you need to do for it to work is to have an active session on your PagerDuty subdomain, or provide a PagerDuty API key for your account.

## Configuration Options

* Account Subdomain - (Required) The subdomain for your PagerDuty account. If your account is https://example.pagerduty.com, you would use "example".
* PagerDuty API Key - (Optional) An API key for your PagerDuty account. If not provided, an active session on your subdomain is needed. If a read-only key is provided, then the Acknowledge/Resolve buttons will be non-functional.
* Poll Interval - (Required) The number of seconds to wait between requests to the PagerDuty API to check for new incidents. Minimum is 15 seconds between polls.
* Include Low Urgency Alerts? - If checked, then you will receive notifications for low urgency alerts.
* Remove Ack/Resolve Buttons? - If checked, the Acknowledge/Resolve buttons are removed from the notification. You should use this if you only wish to provide a read-only API key.
* Filter Users - (Optional) A list of comma-separated user ID's, which will only trigger notifications for incidents assigned to those users.

## Contributors
* Rich Adams (https://richadams.me)

## License
See LICENSE file.

