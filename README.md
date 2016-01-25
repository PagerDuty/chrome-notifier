# PagerDuty Chrome Notifier
:exclamation: **_Built for PagerDuty Hack Day and not extensively tested, use at own risk._**

A Google Chrome extension to show PagerDuty notifications using Chrome's notification API. The notification will display some information about the alert, along with buttons to acknowledge and resolve it right from the notification!

![An example of the notifications.](example.png)

All you need to do for it to work is to have an active session on your PagerDuty subdomain, or provide a PagerDuty API key for your account.

## Using an API Key
The extension can be used without having to provide an API key, however, in that case, it will only work if you have an active session for your PagerDuty domain. That means you must be logged into your domain, but you don't need to keep the tab open.

If you decide to use an API key instead, you can use either a read-only key, or a read/write key. If you use a read-only key, then the Acknowledge and Resolve buttons will not function, as they would not have permission to update your incidents. If you prefer to use a read-only key, you can configure the extension to remove these action buttons from the notifications.

## Configuration Options

* **Account Subdomain** - (Required) The subdomain for your PagerDuty account. If your account is https://example.pagerduty.com, you would use "example".
* **PagerDuty API Key** - (Optional) An API key for your PagerDuty account. If not provided, an active session on your subdomain is needed. If a read-only key is provided, then the Acknowledge/Resolve buttons will be non-functional.
* **Filter Users** - (Optional) A list of comma-separated user ID's, which will only trigger notifications for incidents assigned to those users.
* **Filter Services** - (Optional) A list of comma-separated service ID's, which will only trigger notifications for incidents that are part of those services.
* **Include Low Urgency Alerts?** - If checked, then you will receive notifications for low urgency alerts.
* **Remove Ack/Resolve Buttons?** - If checked, the Acknowledge/Resolve buttons are removed from the notification. You should use this if you only wish to provide a read-only API key.
* **Open incident in new tab on acknowledge?** - If checked, whenever you click the "Acknowledge" button, the incident page will be opened in a new tab.
* **Play a notification sound?** - If checked, a short sound will play whenever a new notification is triggered.


## License
[Apache 2](http://www.apache.org/licenses/LICENSE-2.0) (See LICENSE file)

## Contributing
1. Fork it ( https://github.com/PagerDuty/chrome-notifier/fork )
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request.
