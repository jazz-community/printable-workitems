/*******************************************************************************
 * Licensed Materials - Jazz Utilities
 * Copyright by Siemens Schweiz AG
 * Created by Jonas Studer
 *
 * DESCRIPTION
 *******************************************************************************/
define(["dojo/_base/declare",
    "dojo/_base/lang"
], function (declare, lang){
    return declare(null, {
        _store: null,
        siemensWidget: null,

        constructor: function(mainWidget){
            this.siemensWidget = mainWidget;
            this._store = {};
        },

        createStorageroom: function(name, value){
            if(value == undefined) value = null;
            try {
                if(name == undefined) throw "You have to give your storageroom a name";
                if(this._store[name] != undefined) throw "This storageroom is already in use: "+name;
                this._store[name] = lang.clone(value);
            }
            catch(err) {
                this.siemensWidget.displayError("SiemensStorage.createStorage:  "+err, false);
            }
        },

        deleteStorageroom: function(name){
            try {
                if(name == undefined) throw "Name parameter is missing";
                delete this._store[name];
            }
            catch(err) {
                this.siemensWidget.displayError("SiemensStorage.deleteStorage:  "+err, false);
            }
        },

        storageroomInUse: function(storageID){
            return storageID in this._store;
        },

        getAllStoragerooms: function(){
            return Object.keys(this._store);
        },

        getStorageroomCopy: function(name){
            try {
                if(this._store[name] == undefined) throw "This storageroom isn't created: "+name;
                return lang.clone(this._store[name]);
            }
            catch(err){
                this.siemensWidget.displayError("SiemensStorage.getStorage:  "+err, false);
            }
        },

        getStorageroom: function(name){
            try {
                if(this._store[name] == undefined) throw "This storageroom isn't created: "+name;
                return this._store[name];
            }
            catch(err){
                this.siemensWidget.displayError("SiemensStorage.getStorage:  "+err, false);
            }
        },

        setStorageroom: function(name, value){
            try {
                if(!name in this._store) throw "This storageroom'"+name+"' isn't created, please create it before usage";
                if(value == undefined) throw "Value parameter is undefined from : "+name;
                this._store[name] = lang.clone(value);
            }
            catch(err){
                this.siemensWidget.displayError("SiemensStorage.setStorage:  "+err, false);
            }
        },

        setStorageroomByReference: function(name, value){
            try {
                if(!name in this._store) throw "This storageroom'"+name+"' isn't created, please create it before usage";
                if(value == undefined) throw "Value parameter is undefined from : "+name;
                this._store[name] = value;
            }
            catch(err){
                this.siemensWidget.displayError("SiemensStorage.setStorage:  "+err, false);
            }
        }
    });
});