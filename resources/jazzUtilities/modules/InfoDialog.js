define(["dojo/_base/declare",
    "require",
    "dijit/Dialog",
    "dijit/ProgressBar",
    "dojo/dom-construct",
    "dojo/query",
    "dijit/form/Button",
    "dojo/fx"
], function (declare, require, Dialog, ProgressBar, domConstruct, query, Button, coreFx){
    return declare(null, {
        INFO_HEADER: "<b>Information</b><br>",
        mainWidget: null,

        infoPage: null,
        messageArea: null,
        buttonArea: null,
        loadingArea: null,
        progressBar: null,

        okButton: null,
        refreshButton: null,

        errorDelayInSec: null,
        intervall: null,
        timer: null,

        constructor: function(mainWidget){
            this.mainWidget = mainWidget;
            this.infoPage = query(".infoDialog", this.mainWidget.id)[0]
            this.init();
        },

        init: function(){
            this.messageArea = domConstruct.create("div", {style: {width: "80%", paddingLeft: "10%", height: "60%", overflow: "auto"}}, this.infoPage);
            this.loadingArea = domConstruct.create("div", {style: {width: "100%", height: "15%", display:"none"}}, this.infoPage);
            this.buttonArea = domConstruct.create("div", {style: {width: "100%"}}, this.infoPage);
        },

        openDialog: function(){
            this.infoPage.style.display = "";
            coreFx.slideTo({
                node: this.infoPage,
                top: "0",
                left: "not"
            }).play();
        },

        hideDialog: function(){
            coreFx.slideTo({
                node: this.infoPage,
                top: "-250",
                left: "not"
            }).play();
            if(this.intervall) clearInterval(this.intervall);
            if(this.progressBar) this.progressBar.destroy();
            this.loadingArea.style.display = "none";
            this.infoPage.style.display = "none";
        },

        cleanUp: function(){
            if(this.loadingArea) this.loadingArea.style.display = "none";
            if(this.infoPage) this.infoPage.style.display = "none";
            if(this.okButton) this.okButton.destroy();
            if(this.refreshButton) this.refreshButton.destroy();
            if(this.progressBar) this.progressBar.destroy();
        },

        createLoadingDialog: function(message){
            this.cleanUp();
            this.writeToMessageArea(message);
            this.enableLoadingArea();
            this.setErrorTimer();
            this.openDialog();
        },

        createInfoDialog: function(message){
            this.cleanUp();
            this.writeToMessageArea(message);
            this.createOkButton();
            this.openDialog();
        },

        writeToMessageArea: function(message){
            this.messageArea.innerHTML = this.INFO_HEADER+message;
        },

        enableLoadingArea: function(errorDelayInSec){
            this.errorDelayInSec = (errorDelayInSec) ? errorDelayInSec : 4;
            this.createProgressBar();
            this.loadingArea.style.display = "";
        },

        createOkButton: function(){
            var self=this;
            this.okButton = new Button({
                label: "Ok",
                onClick: function(){
                    self.hideDialog();
                }
            }).placeAt(this.infoPage);
        },

        createRefreshButton: function(){
            var self=this;
            this.refreshButton = new Button({
                label: "Refresh",
                onClick: function(){
                    self.hideDialog();
                    setTimeout(function(){
                        self.refreshButton.destroy();
                        self.mainWidget.refresh();
                    }, 1000);
                }
            }).placeAt(this.infoPage);
        },

        createProgressBar: function(){
            this.progressBar = new ProgressBar({
                value: 0,
                style: "width: 80%; left: 10%"
            });
            this.progressBar.placeAt(this.loadingArea);
        },

        setErrorTimer: function(){
            this.timer = this.errorDelayInSec;
            var self = this;
            this.intervall = setInterval(function() {
                if(self.timer <= 0){
                    self.throwErrorMessage();
                }
                self.timer--;
            }, 1000);
        },

        throwErrorMessage: function(message){
            var message = (message) ? message : "An Error occured.<br> Please refresh the widget.";
            this.writeToMessageArea(message);
            this.progressBar.destroy();
            if(this.intervall) clearInterval(this.intervall);
            this.createRefreshButton();
        },

        setProgress: function(percent){
            if(this.progressBar){
                this.progressBar.set("value", percent);
                if(percent > 99){
                    this.writeToMessageArea("Process done!");
                    if(this.intervall) clearInterval(this.intervall);
                    var self = this;
                    setTimeout(function(){
                        self.hideDialog();
                    }, 800);
                } else {
                    this.timer = this.errorDelayInSec;
                }
            }
        },
    });
});