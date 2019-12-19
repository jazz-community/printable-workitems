/*******************************************************************************
 * Licensed Materials - Jazz Utilities Copyright by Siemens Schweiz AG Created
 * by Jonas Studer
 *
 * This is the abstract class for all widgets which are created by Siemens.
 *
 * Public functions: +buildTopMenu --> Creates a Menu on top of the widget
 * +displayError --> Displays the given error message and hide the contentPane
 *
 ******************************************************************************/

define(
    [ "dojo/_base/declare", "require", "dojo/query",
        "./modules/SiemensStorage",
        "./modules/InfoDialog", "dijit/MenuBar", "dijit/DropDownMenu",
        "dijit/MenuItem", "dijit/PopupMenuBarItem", "dijit/Toolbar",
        "dijit/form/DropDownButton", "dijit/ProgressBar",
        "dojo/dom-attr", "dojo/dom-construct",
        "com.ibm.team.dashboard.web.ui.Viewlet" ],
    function(declare, require, query, Storage, InfoDialog,
             MenuBar, DropDownMenu, MenuItem, PopupMenuBarItem, Toolbar,
             DropDownButton, ProgressBar, domAttr, domConstruct) {
        return declare(
            dojo.global.com.ibm.team.dashboard.web.ui.Viewlet,
            {
                templatePath : require
                    .toUrl("./templates/SiemensViewlet.html"),
                ABSTRACTVERSION : "0.9.5",
                WIDGETVERSION : null,
                WIDGETNAME : null,

                hasError : null,
                debugMode : null,

                infoDialog : null,
                storage : null,
                // blockDisplay: null,
                topMenuBar : null,
                progressBar : null,
                softRefresh : null,

                initialize : function() {
                    console.log("Started SiemensAbstractWidget Version: "
                        + this.ABSTRACTVERSION);
                    if (this.getSite().viewletDefinition.version !== undefined) {
                        this.WIDGETVERSION = this.getSite().viewletDefinition.version;
                        this.WIDGETNAME = this.getSite().viewletDefinition.name;
                        console.log("Widget " + this.WIDGETNAME
                            + " startet with version: "
                            + this.WIDGETVERSION);
                    }
                    this.storage = new Storage(this);
                    this.infoDialog = new InfoDialog(this);
                    this.hasError = false;
                    this.debugMode = false;
                },

                buildTopMenu : function() {
                    var topMenuDiv = query(".topMenu", this.id)[0];
                    topMenuDiv.style.display = "";
                    this.topMenuBar = new MenuBar({
                        className : "menuBar"
                    });

                    var pSubMenu = new DropDownMenu({});
                    pSubMenu
                        .addChild(new MenuItem(
                            {
                                label : "Version: "
                                    + this.getSite().viewletDefinition.version
                            }));

                    this.topMenuBar.addChild(new PopupMenuBarItem({
                        className : "aboutMenu",
                        label : "About",
                        style : {
                            cssFloat : "right"
                        },
                        popup : pSubMenu
                    }));
                    this.topMenuBar.placeAt(topMenuDiv);
                    this.topMenuBar.startup();
                },

                debugMessage : function(message) {
                    if (this.debugMode) {
                        console.log("Debug: " + message);
                    }
                },

                startLoadingScreen : function(message, isSoftRefresh) {
                    this.softRefresh = isSoftRefresh;
                    if (isSoftRefresh) {
                        return;
                    }
                    if (!message) {
                        message = "Loading...";
                    }
                    var content = this.createLoadContent(message);
                    query(".contentPane", this.id)[0].style.display = "none";
                    var loadScreen = query(".loadingScreen", this.id)[0];
                    this.progressBar.startup();
                    loadScreen.style.display = "";
                    loadScreen.innerHTML = '';
                    loadScreen.appendChild(content);
                },

                setLoadingProgress : function(percent) {
                    if (this.softRefresh) {
                        return;
                    }
                    this.progressBar.set({
                        value : percent
                    });
                    if (percent > 99) {
                        var self = this;
                        setTimeout(
                            function() {
                                query(".contentPane", self.id)[0].style.display = "";
                                query(".loadingScreen", self.id)[0].style.display = "none";
                            }, 1000);
                    }
                },

                createLoadContent : function(message) {
                    var contentTable = domConstruct.create("table", {
                        style : {
                            marginLeft : "auto",
                            marginRight : "auto"
                        }
                    });
                    domConstruct.place(this.createMessageArea(message),
                        contentTable);
                    domConstruct.place(this.createProgressBar(),
                        contentTable);
                    return contentTable;
                },

                createMessageArea : function(message) {
                    var row = domConstruct.create("tr");
                    var data = domConstruct.create("td");
                    domConstruct.create("div", {
                        innerHTML : message
                    }, data);
                    domConstruct.place(data, row);
                    return row;
                },

                createProgressBar : function() {
                    var row = domConstruct.create("tr");
                    var data = domConstruct.create("td");
                    this.progressBar = new ProgressBar({
                        value : 0,
                        style : "width: 150px"
                    });
                    this.progressBar.placeAt(data);
                    domConstruct.place(data, row);
                    return row;
                },

                /**
                 *
                 * Fatal means, its printed to the UI, otherwise it just
                 * logs the error.
                 */
                displayError : function(errorMessage, fatal) {
                    console.error(errorMessage);
                    if (fatal) {
                        this.infoDialog.hideDialog();
                        this.hasError = true;
                        query(".contentPane", this.id)[0].style.display = "none";
                        query(".loadingScreen", this.id)[0].style.display = "none";

                        var errorDiv = query(".errorPane", this.id)[0];
                        errorDiv.style.display = "block";
                        errorDiv.innerHTML = '';
                        var ns = document.createTextNode(errorMessage);
                        errorDiv.appendChild(ns);
                    }
                },

                deactivateError : function() {
                    this.hasError = false;
                    query(".contentPane", this.id)[0].style.display = "";
                    var errorDiv = query(".errorPane", this.id)[0].style.display = "none";
                }
            });
    });