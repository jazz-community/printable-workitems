![](https://github.com/jazz-community/printable-workitems/workflows/npm%20build/badge.svg)

# Printable Workitem Widget

Don't you hate having to click on every Work-Item in order to view or print the content? And then there is way to much information which nobody needs!

Using this widgets you can create configurations for Work-Items and only display the information which you want to be displayed for you and everyone who views this Widget. You can have multiple Widgets per dashboard and a configuration for every type of Work-Item there is. You will be able to print direct from the Widget without needing to click on the Work-Item ever again. You will be able to print Plans and Querys. Everything the Widget needs is the ID of the Work-Item you want to display in order to display whatever you want.

![image](documentation/images/print-wi-screenshot.PNG)

## Setup

### Download
You can find the latest release on the [releases page of this repository](../../releases).

### Installation
Deploy just like any other update site:

1. Extract the `com.siemens.bt.jazz.viewlet.printableworkitems_updatesite.ini` **file** from the zip file to the `server/conf/ccm/provision_profiles` directory
2. Extract the `com.siemens.bt.jazz.viewlet.printableworkitems_updatesite` **folder** to the `server/conf/ccm/sites` directory
3. Restart the server

### Updating an existing installation
1. Request a server reset in **one** of the following ways:
    * If the server is currently running, call `https://server-address/ccm/admin/cmd/requestReset`
    * Navigate to `https://server-address/ccm/admin?internaltools=true` so you can see the internal tools (on the left in the side-pane).
     Click on `Server Reset` and press the `Request Server Reset` button
    * If your server is down, you can delete the ccm `built-on.txt` file.
     Liberty packed with 6.0.3 puts this file in a subfolder of `server/liberty/servers/clm/workarea/org.eclipse.osgi/**/ccm`. The easiest way to locate the file is by using your operating system's search capabilities.
2. Delete previously deployed updatesite folder
3. Follow the file extraction steps from the section above
4. Restart the server

### Configuration

1. Add the Widget to a Dashboard. The widget can be found in the **"BT AddOns"** category.

For more details please take a look in the [Wiki](../../wiki)

# About this Plug-In
## Contributing
Please use the [Issue Tracker](../../issues) of this repository to report issues or suggest enhancements.

For general contribution guidelines, please refer to [CONTRIBUTING.md](https://github.com/jazz-community/welcome/blob/master/CONTRIBUTING.md)

## Licensing
Copyright (c) Siemens AG. All rights reserved.<br>
Licensed under the [MIT](./LICENSE) License.
