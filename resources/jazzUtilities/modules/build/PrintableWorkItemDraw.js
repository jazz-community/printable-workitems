define(["dojo/_base/declare"], function (declare) {
  return declare(null, {
    parentWidget: null,
    // Public Value which contents the width of the current configuration
    activeConfigurationWidth: 5,
    // Map with all the keys and values for the translator
    keyValueMap: [],
    predefinedAttributes: null,
    // All Tasks which need to be run, before everything is done
    taskScheduler: [],
    // Pixels per Table-Row-Height
    pixelPerRow: 15,
    // Dynamic-Height ID-List
    dynamicHeightList: [],
    ignoreDynamicValues: false,
    globalChildrenLoaded: 0,
    globalChildrenToBeLoaded: 0,
    globalChildCheckingDone: false,
    dynamicVariableCounter: [],
    _pageSizeOptimize: null,

    /**
     * @static final
     * 
     * All the HTML-Tags, which are allowed by the System
     * to get displayed
     */
    GLOBAL_HTML_ALLOWED_TAGS: "<b><i><u><p><br><a><s><div><span><hr><synthetic><ul><li><ol>",
    constructor: function constructor(parentWidget) {
      this.parentWidget = parentWidget;
    },

    /**
     * Create and Draw the table based on the configuration
     * 
     * @param {String} workitemID The ID of the Workitem which should be used
     * @param {JSON} configuration Configuration to be used
     * 
     * @param {Boolean} updateTitle Should the _updateTitle be called in the parent 
     * @default false
     * 
     * @param {Boolean} skipWebKeysIfNotEmpty Skip reloading keys, if they already loaded
     * @default false
     * 
     * @param {Boolean} allowDeepChild Should the children keys, be loaded in detail with a new request
     * @default false
     * 
     * @param {JSON} _pageSizeOptimize The config which should get applied to the table, for the width and height
     * @default null
     * 
     * @param {JSON} _predefinedAttributes A List with Attributes which should get overwritten
     * @default null
     * @example [{key: "key", value: "value"}]
     * 
     * @param {Boolean} _ignoreDynamicValues Should dynamic values not be displayed
     * @default false
     * 
     * @returns {Element} Table based on the configuration
     */
    drawTableFromConfiguration: function drawTableFromConfiguration(workitemID, configuration) {
      var _this = this;

      var updateTitle = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var skipWebKeysIfNotEmpty = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
      var allowDeepChild = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      var _pageSizeOptimize = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;

      var _predefinedAttributes = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;

      var _ignoreDynamicValues = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : false;

      // Clear remaining Tasks
      this.taskScheduler = [];
      this._pageSizeOptimize = _pageSizeOptimize;
      this.dynamicVariableCounter = [];
      this.ignoreDynamicValues = _ignoreDynamicValues;
      this.globalChildrenLoaded = 0;
      this.globalChildrenToBeLoaded = 0;
      this.globalChildCheckingDone = false;
      this.predefinedAttributes = _predefinedAttributes;

      if (!skipWebKeysIfNotEmpty || skipWebKeysIfNotEmpty && this.keyValueMap.length === 0) {
        this._getDataFromJazz(workitemID, updateTitle, configuration, allowDeepChild, function (mainContainer) {
          if (!allowDeepChild) {
            _this.globalChildCheckingDone = true;

            mainContainer._allDataCollectedFromJazz(updateTitle, configuration);
          }
        });
      } else {
        this.globalChildCheckingDone = true;

        this._allDataCollectedFromJazz(updateTitle, configuration);
      }
    },

    /**
     * Run all the Task which where scheduled
     */
    _runScheduledTasks: function _runScheduledTasks() {
      if (this.taskScheduler.length != 0) {
        for (var i = 0; i < this.taskScheduler.length; i++) {
          this.taskScheduler[i]();
        }

        this.taskScheduler = [];
      }
    },

    /**
     * Run tasks after everything was loaded from Jazz
     * 
     * @param {Boolean} updateTitle Should the _updateTitle function be called in the parent
     * @param {JSON} configuration The configuration which should get applied
     */
    _allDataCollectedFromJazz: function _allDataCollectedFromJazz(updateTitle, configuration) {
      this.dynamicHeightList = [];

      if (this.globalChildCheckingDone) {
        this._applyConfigurationToWorkitem(configuration);

        this._runScheduledTasks();

        if (this.dynamicHeightList.length != 0 && !this.ignoreDynamicValues) {
          this._applyDynamicHeights(updateTitle, configuration);
        } else if (updateTitle) {
          this.parentWidget._updateTitle();
        }
      }
    },

    /**
     * Call when an child was found in order to determent if everything was loaded, that needs to be loaded
     * 
     * @param {Boolean} updateTitle Should the _updateTitle function be called in the parent if successful
     * @param {JSON} configuration The configuration which should get used if successful
     * 
     * @param {Boolean} increment Should the value of found children get incremented
     * @default true
     */
    _childWasLoaded: function _childWasLoaded(updateTitle, configuration) {
      var increment = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

      if (increment) {
        this.globalChildrenLoaded++;
      }

      if (this.globalChildrenToBeLoaded !== 0 && this.globalChildrenLoaded >= this.globalChildrenToBeLoaded) {
        this._allDataCollectedFromJazz(updateTitle, configuration);
      }
    },

    /**
     * Load all the Data from the Jazz Server from a given Workitem
     * 
     * @param {String} workitemID The ID of the Workitem which should get loaded
     * @param {Boolean} updateTitle Should the _updateTitle function be called in the parent
     * @param {JSON} configuration The configuration which should get used
     * @param {Boolean} allowDeepChild Should load detailed information form Children. Will increase amount of requests.
     * @param {Function} _callback Will be called after everting finished
     * 
     * @param {Number} currentChildID The count of the current child. Only required if allowDeepChild is active
     * @default null
     */
    _getDataFromJazz: function _getDataFromJazz(workitemID, updateTitle, configuration, allowDeepChild, _callback) {
      var _this2 = this;

      var currentChildID = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;
      var childEndpointID = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;
      // Make a request to get the Values from Jazz
      jazz.client.xhrGet({
        url: "".concat(this.parentWidget.webURL, "/service/com.ibm.team.workitem.common.internal.rest.IWorkItemRestService/workItemDTO2?includeHistory=false&id=").concat(workitemID),
        error: function error() {
          this.parentWidget.showErrorMessage("Can't request the given ID");
          return null;
        }
      }).then(function (rootResult) {
        if (rootResult == null || rootResult == undefined) {
          _callback(_this2);
        } else {
          // Process all the Data which where returned from Jazz
          _this2._processDataFromJazz(_this2, rootResult, allowDeepChild, currentChildID, updateTitle, configuration, childEndpointID);

          _callback(_this2);
        }
      }.bind(this));
    },

    /**
     * Process the Data which was loaded from the Jazz server
     * 
     * @param {*} mainContainer The main container which is used
     * @param {String} rootResult The result which should get processed as String in the XML content
     * @param {Boolean} allowDeepChild Should detailed information of the children be used
     * @param {Number} currentChildID The reference ID from the children which currently get used
     * @param {Boolean} updateTitle Should the _updateTitle from the parent be called
     * @param {JSON} configuration The configuration which should get used
     * @param {String} childEndpointID
     */
    _processDataFromJazz: function _processDataFromJazz(mainContainer, rootResult, allowDeepChild, currentChildID, updateTitle, configuration, childEndpointID) {
      var _this3 = this;

      if (currentChildID == null) {
        this.keyValueMap = [];
        this.dynamicVariableCounter = [];
      }

      var _xmlContent = null; // For IE

      if (window.ActiveXObject) {
        var oXML = new ActiveXObject("Microsoft.XMLDOM");
        oXML.loadXML(rootResult);
        _xmlContent = oXML;
      } else {
        // Modern Browser
        _xmlContent = new DOMParser().parseFromString(rootResult, "text/xml");
      } // Map all Values from the Workitem level


      _xmlContent.querySelectorAll("value > attributes").forEach(function (queryElement) {
        mainContainer.keyValueMap.push(["".concat(childEndpointID != null && currentChildID != null ? "".concat(childEndpointID, ":").concat(currentChildID, ":") : "").concat(queryElement.querySelector("key").textContent), queryElement.querySelector("value")]);
      }); // Map all parent Values
      // Only one parent will be used, because multiple parents isn't permitted


      var _queryResult = _xmlContent.querySelectorAll("value > linkTypes > endpointId"); //let childCounter = 0;


      var _loop = function _loop(i) {
        var _queryElement = _queryResult[i];
        var hasEndpointID = true;

        if (_queryElement.textContent == "") {
          hasEndpointID = false;
          _queryElement.textContent = _queryElement.closest("linkTypes").querySelector("id").textContent;
        }

        if (currentChildID === null) {
          mainContainer._globalDynamicCounterCreateOrUpdate(_queryElement.textContent);

          _queryElement.closest('linkTypes').querySelectorAll(":scope > linkDTOs").forEach(function (queryChildElement) {
            var queryList = queryChildElement.querySelectorAll(":scope > target > attributes");
            var fakeType = false;

            if (queryList.length == 0) {
              fakeType = true; // Check if Children for HTMLCollection is supported (Not supported in IE)

              if (queryChildElement.children == undefined || queryChildElement.children == null) {
                var n = 0,
                    node,
                    nodes = queryChildElement.childNodes,
                    children = [];

                while (node = nodes[n++]) {
                  if (node.nodeType === 1) {
                    children.push(node);
                  }
                }

                queryList = children;
              } else {
                queryList = Array.from(queryChildElement.children);
              }

              var fakeID = document.createElement("_id");
              var fakeIDSplit = queryChildElement.querySelector(":scope > url").textContent.split("/");
              fakeID.innerText = hasEndpointID && !isNaN(Number(fakeIDSplit[fakeIDSplit.length - 1])) ? fakeIDSplit[fakeIDSplit.length - 1] : mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent);
              queryList.push(fakeID);
              queryList.length = queryList.length == undefined ? queryList.children.length : queryList.length;
            }
            /*****************************************************************/
            // Add the attribute "_url" to all the children, which were found

            /*****************************************************************/


            var fakeURL = queryChildElement.querySelector(":scope > url");

            if (fakeURL != undefined || fakeURL != null) {
              var fakeURLKey = document.createElement("key");
              var fakeURLValue = document.createElement("value");
              fakeURLKey.innerText = "_url";
              fakeURLValue.innerHTML = "<label>".concat(fakeURL.textContent, "</label>");
              var fakeURLHolder = document.createElement("attributes");
              fakeURLHolder.appendChild(fakeURLKey);
              fakeURLHolder.appendChild(fakeURLValue);
              mainContainer.keyValueMap.push(["".concat(_queryElement.textContent, ":").concat(mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent), ":_url"), fakeURLValue]);
            }
            /*****************************************************************/


            if (!allowDeepChild || !hasEndpointID || _queryElement.textContent == "textuallyReferenced") {
              mainContainer._readAttributeValuesWithNoDeepValue(_queryElement, queryList, allowDeepChild, updateTitle, configuration, fakeType);
            } else {
              for (var c = 0; c < queryList.length; c++) {
                var element = queryList[c];

                if (fakeType || element.querySelector("key").textContent.toLowerCase() == "id") {
                  var fakeElementID = null;

                  if (fakeType) {
                    var _fakeURL = queryChildElement.querySelector(":scope > url").textContent;

                    var fakeSplit = _fakeURL.split("/");

                    fakeElementID = Number(fakeSplit[fakeSplit.length - 1]);

                    if (isNaN(fakeElementID) || !_fakeURL.startsWith(window.location.origin)) {
                      mainContainer._readAttributeValuesWithNoDeepValue(_queryElement, queryList, allowDeepChild, updateTitle, configuration, fakeType);

                      break;
                    }
                  } // Create a new request for the Child-Object


                  mainContainer._getDataFromJazz(fakeType ? fakeElementID : element.querySelector("value > id").textContent, updateTitle, configuration, allowDeepChild, function (_requestMainContainer) {
                    _requestMainContainer._childWasLoaded(updateTitle, configuration);
                  }, mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent), _queryElement.textContent);

                  break;
                }
              }
            }

            mainContainer._globalDynamicCounterCreateOrUpdate(_queryElement.textContent);
          });

          if (mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent) !== 0) {
            mainContainer.globalChildrenToBeLoaded += mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent);
            /** Add new Entry for the count of the found types */

            var value = document.createElement("value");
            var label = document.createElement("label");
            label.innerText = mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent);
            value.appendChild(label);
            mainContainer.keyValueMap.push([_queryElement.textContent, value]);
            /******************************************************/
          }
        }
      };

      for (var i = 0; i < _queryResult.length; i++) {
        _loop(i);
      } //apply all the Custom Attributes


      if (this.predefinedAttributes != null) {
        this.predefinedAttributes.forEach(function (element) {
          var value = document.createElement("value");
          var label = document.createElement("label");
          label.innerText = element.value;
          value.appendChild(label);

          _this3.keyValueMap.push([element.key, value]);
        });
      }

      this.globalChildCheckingDone = true;

      if (allowDeepChild && currentChildID == null && mainContainer.globalChildrenToBeLoaded === 0) {
        this._allDataCollectedFromJazz(updateTitle, configuration);
      } else {
        if (allowDeepChild) {
          mainContainer._childWasLoaded(updateTitle, configuration, false);
        }
      }
    },

    /**
     * Read the content of all the Attributes without a second request for details
     * 
     * @param {Object} _queryElement The current Element
     * @param {XML[]} queryList List with all the found Attributes
     * @param {Boolean} allowDeepChild Should detailed values be read
     * @param {Boolean} updateTitle Should the updateTitle function be called
     * @param {JSON} configuration The configuration to use
     * @param {Boolean} fakeType Is this Key-word a attribute of the Workitem
     */
    _readAttributeValuesWithNoDeepValue: function _readAttributeValuesWithNoDeepValue(_queryElement, queryList, allowDeepChild, updateTitle, configuration, fakeType) {
      var _this4 = this;

      queryList.forEach(function (queryAttributeElement) {
        if (fakeType) {
          var keyValue = document.createElement("key");
          keyValue.innerText = queryAttributeElement.tagName;
          var valueElement = document.createElement("value");
          var valueContent = document.createElement("label");
          valueContent.innerText = queryAttributeElement.textContent;
          valueElement.appendChild(valueContent);
          queryAttributeElement.appendChild(keyValue);
          queryAttributeElement.appendChild(valueElement);
        }

        _this4.keyValueMap.push(["".concat(_queryElement.textContent, ":").concat(_this4._globalDynamicCounterGetValueContent(_queryElement.textContent), ":").concat(queryAttributeElement.querySelector("key").textContent), queryAttributeElement.querySelector("value")]);
      });

      if (allowDeepChild) {
        this._childWasLoaded(updateTitle, configuration);
      }
    },

    /**
     * Create a new Entry for a Dynamic-Counter or update the counter
     * 
     * @param {String} name Name of the Dynamic-Counter
     
     * @param {Boolean} forceCreate Overwrite with default value if already existing
     * @default false
     * 
     * @param {Number} valueToAdd How much to add to the counter
     * @default 1
     * 
     * @param {Number} defaultValue Start value of the counter
     * @default 0
     */
    _globalDynamicCounterCreateOrUpdate: function _globalDynamicCounterCreateOrUpdate(name) {
      var forceCreate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var valueToAdd = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
      var defaultValue = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

      for (var i = 0; i < this.dynamicVariableCounter.length; i++) {
        if (this.dynamicVariableCounter[i][0] == name) {
          if (forceCreate) {
            this.dynamicVariableCounter[i][1] = defaultValue;
          } else {
            this.dynamicVariableCounter[i][1] += valueToAdd;
          }

          return;
        }
      }

      this.dynamicVariableCounter.push([name, defaultValue]);
    },

    /**
     * Get the current counter of a specific Dynamic-Counter
     * 
     * @param {String} name Name of the Dynamic-Counter
     * 
     * @returns {Number|undefined} Current count of the Dynamic-Counter
     */
    _globalDynamicCounterGetValueContent: function _globalDynamicCounterGetValueContent(name) {
      for (var i = 0; i < this.dynamicVariableCounter.length; i++) {
        if (this.dynamicVariableCounter[i][0] == name) {
          return this.dynamicVariableCounter[i][1];
        }
      }

      return undefined;
    },

    /**
     * Apply the current configuration which is given as an attribute
     * 
     * @param {JSON} configurationJSON Configuration which is currently used
     */
    _applyConfigurationToWorkitem: function _applyConfigurationToWorkitem(configurationJSON) {
      this.dynamicHeightList = [];

      try {
        // Load the configuration based on the Type of the workitem
        var _activeConfigurationJSON = this._loadConfigurationByWorkitem(configurationJSON); // Check if the could be found any configuration


        if (_activeConfigurationJSON == null) {
          this.parentWidget.showErrorMessage("No configuration can be found or loaded");
          return;
        } // Updates the width value to the value from the current configuration


        this.activeConfigurationWidth = _activeConfigurationJSON.config.width; // Create the Table

        this.parentWidget.getHolderElement().appendChild(this._generateContentTable(_activeConfigurationJSON.config.width, _activeConfigurationJSON.config.height, _activeConfigurationJSON.config.border, _activeConfigurationJSON.config.tablePosition)); // Check if values are in the correct format

        if (_activeConfigurationJSON.values == undefined || !Array.isArray(_activeConfigurationJSON.values)) {
          throw SyntaxError;
        } // Go through each value in the current configuration and draw the container


        for (var _valueCount = 0; _valueCount < _activeConfigurationJSON.values.length; _valueCount++) {
          var _configurationValue = _activeConfigurationJSON.values[_valueCount];

          this._drawContainerInTable(_configurationValue.start, _configurationValue.end, _configurationValue.regionID, _configurationValue.backColor, _configurationValue.borderless);
        } // Go through each value in the current configuration and add text to the container


        for (var _valueCount2 = 0; _valueCount2 < _activeConfigurationJSON.values.length; _valueCount2++) {
          var _configurationValue2 = _activeConfigurationJSON.values[_valueCount2]; // Check if there is any text which should be drawn

          if (_configurationValue2.textContent != null || _configurationValue2.textContent !== "") {
            this._setContentOfContainer(_configurationValue2.start, _configurationValue2.end, _configurationValue2.regionID, _configurationValue2.textContent, _configurationValue2.fontSize, _configurationValue2.textBinding, _configurationValue2.textVertical, _configurationValue2.textColor, _configurationValue2.toolTipContent); //Add ID of found dynamicHeight Value


            if (_configurationValue2.dynamicHeight) {
              this.dynamicHeightList.push(_configurationValue2.regionID);
            }
          }
        }
      } catch (e) {
        this.parentWidget.showErrorMessage("The given JSON - Configuration can't be read");
        console.error(e);
      }
    },

    /**
     * Get the correct Type from the configuration
     * 
     * @param {JSON} configuration The configuration which is used
     * 
     * @returns {JSON} The configuration which was found. If nothing found null will be returned
     */
    _loadConfigurationByWorkitem: function _loadConfigurationByWorkitem(configuration) {
      var _backupID = null;

      var _workItemType = this._checkRegexAndTranslate("{{workItemType}}");

      try {
        for (var i = 0; i < configuration.length; i++) {
          var elementConfiguration = configuration[i];
          var elementConfigurationTypeList = elementConfiguration.type.split(";");

          for (var c = 0; c < elementConfigurationTypeList.length; c++) {
            var elementTypeValue = elementConfigurationTypeList[c];

            if (elementTypeValue == _workItemType) {
              return elementConfiguration;
            } else if (elementTypeValue == "*") {
              _backupID = i;
            }
          }
        }
      } catch (e) {
        return null;
      }

      if (_backupID != null) {
        return configuration[_backupID];
      }

      return null;
    },

    /**
     * Translate a given text which keywords
     * 
     * @param {String} textContent Text which should get Translated
     * 
     * @param {String} _forceSelector Which Node should get read if containing. Null will ignore the forced Node
     * @default null
     * 
     * @param {Boolean} _defaultOnForceFailed If nothing was found, while forcing the Node, should the default-Value get loaded
     * @default true
     * 
     * @returns {String} Formated and Translated text
     */
    _checkRegexAndTranslate: function _checkRegexAndTranslate(textContent) {
      var _this5 = this;

      var regionID = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

      var _forceSelector = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

      var _defaultOnForceFailed = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

      var _mainContainer = this;

      var _regex = /\{\{.*?\}\}/g;

      var _m;

      var _returnValue = textContent;

      while ((_m = _regex.exec(textContent)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (_m.index === _regex.lastIndex) {
          _regex.lastIndex++;
        } // Check every result which got found


        _m.forEach(function (match, groupIndex) {
          var _replaceValue = match; // Remove the "{{" and "}}" characters and split the command

          var _contentID = match.substring(2, match.length - 2).split("#"); // Check if the word contains the "*" character at the beginning or the end


          var _checkEndWith = _contentID[0].startsWith("*");

          var _checkStartWith = _contentID[0].endsWith("*");

          if (_checkStartWith) {
            _contentID[0] = _contentID[0].substring(0, _contentID[0].length - 1);
          } else if (_checkEndWith) {
            _contentID[0] = _contentID[0].substring(1, _contentID[0].length);
          } // Check every value in the List, to check if the key can be found


          for (var i = 0; i < _mainContainer.keyValueMap.length; i++) {
            var _mapElement = _mainContainer.keyValueMap[i];

            if (_mapElement[0] == _contentID[0] || _checkStartWith && _mapElement[0].startsWith(_contentID[0]) || _checkEndWith && _mapElement[0].endsWith(_contentID[0])) {
              // Set the text value which should be replaced with the match
              _replaceValue = _mainContainer._translateValueToText(_mapElement[1], _contentID.length > 1 ? _contentID[1].replace(/\[.*\]/g, "") : null, _forceSelector, _defaultOnForceFailed);

              if (_contentID.length > 1) {
                var returnSmartCommandValue = _this5._checkAndApplySmartCommand(_contentID[0], _contentID[1], _replaceValue, regionID);

                if (!returnSmartCommandValue.show) {
                  _replaceValue = "";
                } else if (returnSmartCommandValue.overwrite !== undefined) {
                  _replaceValue = returnSmartCommandValue.overwrite;
                }
              }

              break;
            }
          } // Check if the match should can be returned empty if nothing was found


          if (_replaceValue === match && _contentID.length > 1 && _contentID[1].startsWith("?")) {
            _replaceValue = "";
          } // Replace the regex value with the found value


          _returnValue = _returnValue.replace(match, _replaceValue);
        });
      } // Return the everything


      return _returnValue;
    },

    /**
     * Translate a value to the text value with optional command
     * 
     * @param {XMLDocument} value The value which should get Translated
     * 
     * @param {String} command Access an extra command after the value was found
     * @default null
     * 
     * @returns {String} Content of the value
     */
    _translateValueToText: function _translateValueToText(value) {
      var _command = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

      var _forceSelector = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

      var _defaultOnForceFailed = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

      // Variables important for the function
      var _mainContainer = this;

      var _allowEmptyReturn = false; // Check if the Return-Value can be empty

      if (Boolean(_command) && _command.charAt(0) == '?') {
        _allowEmptyReturn = true;
        _command = _command.substr(1);
      }

      if (_forceSelector !== null) {
        var returnValue = value.querySelector(":scope > ".concat(_forceSelector));

        if (Boolean(returnValue)) {
          return this._getValueFromXML(value, returnValue, _allowEmptyReturn, _command);
        }

        if (!_defaultOnForceFailed) {
          return _allowEmptyReturn ? "" : "[Unknown-Selector]";
        }
      } // Check the and match Values in the XML Object


      if (Boolean(value.querySelector(":scope > label"))) {
        var _labelValue = value.querySelector(":scope > label");

        return this._getValueFromXML(value, _labelValue, _allowEmptyReturn, _command);
      } else if (Boolean(value.querySelector(":scope > id"))) {
        var _idValue = value.querySelector(":scope > id");

        return this._getValueFromXML(value, _idValue, _allowEmptyReturn, _command);
      } else if (Boolean(value.querySelector(":scope > content"))) {
        var _contentValue = value.querySelector(":scope > content");

        return this._getValueFromXML(value, _contentValue, _allowEmptyReturn, _command);
      } else if (Boolean(value.querySelector(":scope > items"))) {
        // Get list of all items in list
        var _itemsValue = value.querySelectorAll(":scope > items"); // Verify that this is a NodeList or ArrayList


        if (NodeList.prototype.isPrototypeOf(_itemsValue) || Array.isArray(_itemsValue)) {
          // Check if there is any content
          if (_itemsValue.length == 0) {
            return _allowEmptyReturn ? "" : "[Empty-List]";
          } else {
            // Check if there is a command
            if (Boolean(_command)) {
              // Check if the value is a number and isn't bigger than the List
              if (!isNaN(Number(_command)) && _itemsValue.length >= Number(_command) + 1) {
                return this._translateValueToText(_itemsValue[Number(_command)]);
              } else {
                return _itemsValue[_command] != undefined ? _itemsValue[_command] : _allowEmptyReturn ? "" : "[Undefined-Command]";
              }
            } else {
              // Prepare the String to be generated from the List
              var _listReturn = ""; // Go through each value in the List

              _itemsValue.forEach(function (itemElement) {
                // Check if there should be added a ,
                if (_listReturn != "") {
                  _listReturn += ", ";
                } // Translate the XML value from the List to a text


                _listReturn += _mainContainer._translateValueToText(itemElement);
              });

              return _listReturn;
            }
          }
        } else {
          return _allowEmptyReturn ? "" : "[Unknown-Type]";
        }
      } else {
        return _allowEmptyReturn ? "" : "[Empty]";
      }
    },

    /**
     * Check if there is an SmartCommand and apply it afterwards
     * 
     * @param {String} textContentKey The value before the command
     * @default ""
     * 
     * @param {String} command The command which should get checked
     * @default null
     * 
     * @param {String} contentValue The value of the keyValue
     * @default ""
     * 
     * @param {Number} regionID The ID of the region the commands belongs to
     * @default null
     * 
     * @returns {Boolean} Should the Translated value be shown
     */
    _checkAndApplySmartCommand: function _checkAndApplySmartCommand() {
      var textContentKey = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      var command = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var contentValue = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
      var regionID = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
      if (command == null && regionID == null) return true;
      var self = this;
      var bracketRegex = /\[.*\]/g;
      var bracketM;
      var smartCommandConfig = {
        show: true
      };

      while ((bracketM = bracketRegex.exec(command)) !== null) {
        if (bracketM.index === bracketRegex.lastIndex) {
          bracketRegex.lastIndex++;
        }

        bracketM.forEach(function (bracketMatch, bracketGroupIndex) {
          bracketMatch = bracketMatch.slice(1, -1);
          var keyWordList = bracketMatch.split(";");
          keyWordList.forEach(function (keyWordListElement) {
            // Important ! - Everything in brackets, form the Regex, will get included in the split
            var listKeyAndValue = keyWordListElement.split(/([a-zA-Z0-9]{1,})\:/gm); // 0 Item is always empty / "" as String, because of the way the Regex-Split gets calculated
            // There are some exception. This gets handled, by checking if the content is empty or not.

            smartCommandConfig = self._handleSmartCommandKeys(listKeyAndValue[0] !== "" ? listKeyAndValue[0] + listKeyAndValue[1] : listKeyAndValue[1], listKeyAndValue[2], smartCommandConfig);
          });

          self._applySmartCommandConfig(textContentKey, smartCommandConfig, contentValue, regionID);
        });
      }

      return {
        show: smartCommandConfig.show,
        overwrite: smartCommandConfig.overwrite
      };
    },

    /**
     * Allocate all the keys and values
     * 
     * @param {String} key Where the value should get allocated to 
     * @param {String} value The Value which should get allocated to the key
     * 
     * @param {JSON} previousValue What the current allocated values are
     * @default {}
     * 
     * @returns {JSON} Intermediate result of the allocation of the keys and values
     */
    _handleSmartCommandKeys: function _handleSmartCommandKeys(key, value) {
      var previousValue = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      switch (key) {
        //Set the Type
        case "t":
          previousValue.type = value;
          break;
        //Set if the value should be shown 

        case "s":
        case "show":
          previousValue.show = value == "0" ? false : true;
          break;
        //All other keys

        default:
          if (key != undefined && key != "") {
            previousValue[key] = value.replace(/\\\:/g, ":");
          }

          break;
      }

      return previousValue;
    },

    /**
     * Apply all the changes which where collected
     * 
     * @param {String} textContentKey The Value before the command
     * @param {JSON} previousValue The collected results of the command
     * @param {String} keyWordContent The Value which should get placed
     * @param {Number} regionID The ID of the region where it should get applied
     */
    _applySmartCommandConfig: function _applySmartCommandConfig(textContentKey, previousValue, keyWordContent, regionID) {
      var _this6 = this;

      if (previousValue.type === "css" && previousValue.css !== undefined) {
        this.parentWidget.getHolderElement().querySelectorAll('[regionID="' + regionID + '"]').forEach(function (element) {
          previousValue.css.split(",").forEach(function (cssElement) {
            element.style[cssElement] = keyWordContent;
          });
        });
      } else if (previousValue.type === "table" && previousValue.table !== undefined) {
        this.taskScheduler.push(function () {
          var contentHolderElement = _this6.parentWidget.getHolderElement().querySelector('[regionID="' + regionID + '"] > .textHolder > .textContainer > .textDisplay');

          if (contentHolderElement == null) {
            return;
          }

          contentHolderElement.innerHTML = "";

          if (!previousValue.show) {
            return;
          }

          var tableHolderElement = document.createElement("table");
          tableHolderElement.style.width = "calc(100% - 3px)";
          contentHolderElement.style.width = "inherit";
          tableHolderElement.style.color = contentHolderElement.parentNode.style.color;
          tableHolderElement.style.borderCollapse = "collapse";
          tableHolderElement.style.tableLayout = "fixed";
          var borderValue = previousValue.border != undefined ? "1px solid ".concat(previousValue.border) : "none";
          var boldHeader = previousValue.boldHeader != undefined ? previousValue.boldHeader : "0";
          var informationTable = document.createElement("tr");
          var globalTableFilter = new Map();
          var globalTableFormatter = new Map(); //assign filter for not displayed filters

          if (previousValue.filter != undefined) {
            var splitValue = previousValue.filter.split(",");

            for (var i = 0; i < splitValue.length; i++) {
              var element = splitValue[i].split("@");

              if (element.length == 2) {
                globalTableFilter.set(element[0], element[1]);
              }
            }
          }

          previousValue.table.split(",").forEach(function (tableHeaderElement, index) {
            var tableHeaderElementArray = tableHeaderElement.split("&&");
            var tableHeader = document.createElement("th");
            tableHeader.innerText = tableHeaderElementArray[0];
            tableHeader.style.textAlign = contentHolderElement.parentNode.style.textAlign;
            tableHeader.style.border = borderValue;

            for (var _i = 1; _i < tableHeaderElementArray.length; _i++) {
              var _element = tableHeaderElementArray[_i].split("@");

              switch (_element[0]) {
                case "w":
                  tableHeader.style.width = "".concat(_element[1], "%");
                  break;

                case "c":
                  tableHeader.innerText = _element[1];
                  break;

                case "f":
                  // Will overwrite the filtered value 
                  // for this keyword if already created
                  // in the previousValue.filter
                  globalTableFilter.set(tableHeaderElementArray[0], _element[1]);
                  break;

                default:
                  if (_element.length == 2) {
                    globalTableFormatter.set(index, [_element[0], _element[1]]);
                  }

                  break;
              }
            }

            if (boldHeader == "1") {
              tableHeader.innerHTML = _this6._striptTags(tableHeader.innerText.bold(), "<b>");
            }

            informationTable.appendChild(tableHeader);
          });
          tableHolderElement.appendChild(informationTable);

          var _loop2 = function _loop2(_i2) {
            var rowAllowed = true;
            globalTableFilter.forEach(function (value, key) {
              if (rowAllowed) {
                var localCheckingList = [];

                if (value.startsWith("([") && value.endsWith("])")) {
                  var localValue = value.substring(2, value.length - 2);
                  localValue.split("&&").forEach(function (element) {
                    localCheckingList.push(element);
                  });
                } else {
                  localCheckingList.push(value);
                }

                var localTranslatedValue = _this6._checkRegexAndTranslate("{{".concat(textContentKey, ":").concat(_i2, ":").concat(key, "}}"));

                for (var c = 0; c < localCheckingList.length; c++) {
                  var listElement = localCheckingList[c];
                  var filterEqualMode = !listElement.startsWith("!!");

                  if (!filterEqualMode) {
                    listElement = listElement.substring(2, listElement.length);
                  }

                  if (filterEqualMode && localTranslatedValue != listElement || !filterEqualMode && localTranslatedValue == listElement) {
                    rowAllowed = false;

                    if (localCheckingList.length == 1) {
                      break;
                    }
                  } else {
                    rowAllowed = true;
                    break;
                  }
                }
              }
            });

            if (rowAllowed) {
              var valueRowElement = document.createElement("tr");
              previousValue.table.split(",").forEach(function (tableContentElement, index) {
                var tableContentRow = document.createElement("td");
                var translateString = "{{".concat(textContentKey, ":").concat(_i2, ":").concat(tableContentElement.split("&&")[0], "}}");

                var translatedValue = _this6._checkRegexAndTranslate(translateString);

                var formatValue = globalTableFormatter.get(index);

                if (formatValue != undefined && formatValue.length == 2) {
                  switch (formatValue[0]) {
                    case "date":
                      translatedValue = _this6._formateDate(_this6._checkRegexAndTranslate(translateString, null, "id"), formatValue[1]);
                      break;

                    case "link":
                      translatedValue = _this6._formateLink(translatedValue, formatValue[1]);
                      break;

                    case "clickNode":
                      var formatedValueString = "{{".concat(textContentKey, ":").concat(_i2, ":").concat(formatValue[1], "}}");

                      var translatedFormatedValueString = _this6._checkRegexAndTranslate(formatedValueString); // Only create a link, if the Node-Value exists


                      if (formatedValueString !== translatedFormatedValueString) {
                        translatedValue = _this6._formateLink(translatedFormatedValueString, translatedValue);
                      }

                      break;

                    default:
                      break;
                  }
                }

                tableContentRow.innerHTML = _this6._striptTags(translateString == translatedValue ? "-" : translatedValue, _this6.GLOBAL_HTML_ALLOWED_TAGS);
                tableContentRow.style.textAlign = contentHolderElement.parentNode.style.textAlign;
                tableContentRow.style.border = borderValue;
                valueRowElement.appendChild(tableContentRow);
              });
              tableHolderElement.appendChild(valueRowElement);
            }
          };

          for (var _i2 = 0; _i2 < keyWordContent; _i2++) {
            _loop2(_i2);
          }

          contentHolderElement.appendChild(tableHolderElement);
        });
      } else if (previousValue.type === "date" && previousValue.date !== undefined) {
        previousValue.overwrite = this._formateDate(this._checkRegexAndTranslate("{{".concat(textContentKey, "}}"), null, "id"), previousValue.date.toLowerCase());
      } else if (previousValue.type === "link" && previousValue.link !== undefined) {
        previousValue.overwrite = this._formateLink(keyWordContent, previousValue.link);
      } else if (previousValue.type === "image") {
        this.taskScheduler.push(function () {
          var contentHolderElement = _this6.parentWidget.getHolderElement().querySelector('[regionID="' + regionID + '"] > .textHolder > .textContainer > .textDisplay');

          if (contentHolderElement == null) {
            return;
          }

          contentHolderElement.innerHTML = "";

          if (!previousValue.show) {
            return;
          }

          var imageElement = document.createElement("img");

          if (previousValue.src != undefined) {
            imageElement.src = previousValue.src;
          } else if (previousValue.src_by_name != undefined && previousValue.src_by_node != undefined && previousValue.src_by_result) {
            imageElement.src = _this6._getValueFromListByKey(textContentKey, previousValue.src_by_name, previousValue.src_by_node, previousValue.src_by_result, !(previousValue.src_by_case != undefined && previousValue.src_by_case == 0));
          } else {
            imageElement.src = keyWordContent;
          }

          var altValue = previousValue.desc != undefined ? previousValue.desc : "";
          imageElement.alt = altValue;
          imageElement.title = altValue;
          imageElement.style.width = previousValue.width != undefined ? previousValue.width : "auto";
          imageElement.style.height = previousValue.height != undefined ? previousValue.height : "auto";
          contentHolderElement.appendChild(imageElement);
        });
      }
    },

    /**
     * Get the Content of the entry with a specific content in a specific key inside a list
     * 
     * @param {String} textContentKey Name of the List which should get searched
     * @param {String} valueToCheck Which value needs to be found. Allowed to use * at the beginning or
     * 								the end of the value.
     * @param {String} contentKey Where the value should be placed in the list
     * @param {String} resultKey Which value to return from the list when found
     * 
     * @param {Boolean} caseSensitive Should upper/lower case be considered
     * @default caseSensitive: true
     * 
     * @returns {String} Content of the entry
     */
    _getValueFromListByKey: function _getValueFromListByKey(textContentKey, valueToCheck, contentKey, resultKey) {
      var caseSensitive = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : true;

      if (valueToCheck.length == 0) {
        return "";
      }

      if (!caseSensitive) {
        valueToCheck = valueToCheck.toLowerCase();
      }

      var valueCounter = Number(this._checkRegexAndTranslate("{{".concat(textContentKey, "}}")));

      if (!isNaN(valueCounter)) {
        var endsWith = valueToCheck[0] === "*";
        var startsWith = valueToCheck[valueToCheck.length - 1] === "*";

        if (endsWith) {
          valueToCheck = valueToCheck.substring(1, valueToCheck.length);
        }

        if (startsWith) {
          valueToCheck = valueToCheck.substring(0, valueToCheck.length - 1);
        }

        for (var i = 0; i < valueCounter; i++) {
          var checkingCurrentValue = caseSensitive ? this._checkRegexAndTranslate("{{".concat(textContentKey, ":").concat(i, ":").concat(contentKey, "}}")) : this._checkRegexAndTranslate("{{".concat(textContentKey, ":").concat(i, ":").concat(contentKey, "}}")).toLowerCase();

          if (endsWith && startsWith && checkingCurrentValue.includes(valueToCheck) || endsWith && checkingCurrentValue.endsWith(valueToCheck) || startsWith && checkingCurrentValue.startsWith(valueToCheck) || checkingCurrentValue === valueToCheck) {
            return this._checkRegexAndTranslate("{{".concat(textContentKey, ":").concat(i, ":").concat(resultKey, "}}"));
          }
        }
      } else {
        return "";
      }
    },

    /**
     * Format any given date by the given format. If the formation
     * isn't possible, the original date will be returned. 
     * IE and EDGE will always fail and return the original Date
     * 
     * @param {String|Date} keyWordContent The date with should get formated
     * @param {String} formatter How the date should get formated. 
     * Using any character double, will tell the system to add a '0' in front
     * of the value, if it is smaller than 10.
     * 
     * s  = Second,
     * mn = Minute,
     * h  = Hour,
     * d  = Day,
     * m  = Month,
     * yy = Year
     * 
     * @example _formateDate("2019-02-12T14:24:51.838Z", "dd.mm.yyyy")
     * 
     * @returns {String} Formated date if possible, else original date
     */
    _formateDate: function _formateDate(keyWordContent, formatter) {
      //Currently following Characters can't be used            : ; #
      //Characters which can get bypassed by using \{char}      :
      var returnValue = formatter.toLowerCase();
      var dateValue = new Date(keyWordContent); // Check if the Value could get translated to a Date

      if (isNaN(dateValue)) {
        // Set Value of the filed to the content of the Keyword 
        // which is used to call this command
        return keyWordContent;
      }

      returnValue = returnValue.replace(/ss/gm, "".concat(dateValue.getSeconds() < 10 ? "0" : "").concat(dateValue.getSeconds()));
      returnValue = returnValue.replace(/s/gm, dateValue.getSeconds());
      returnValue = returnValue.replace(/mnmn/gm, "".concat(dateValue.getMinutes() < 10 ? "0" : "").concat(dateValue.getMinutes()));
      returnValue = returnValue.replace(/mn/gm, dateValue.getMinutes());
      returnValue = returnValue.replace(/hh/gm, "".concat(dateValue.getHours() < 10 ? "0" : "").concat(dateValue.getHours()));
      returnValue = returnValue.replace(/h/gm, dateValue.getHours());
      returnValue = returnValue.replace(/dd/gm, "".concat(dateValue.getDate() < 10 ? "0" : "").concat(dateValue.getDate()));
      returnValue = returnValue.replace(/d/gm, dateValue.getDate()); // IMPORTANT: MONTH IN JAVASCRIPT START WITH ZERO AS JANUARY !!!!!!!

      returnValue = returnValue.replace(/mm/gm, "".concat(dateValue.getMonth() < 9 ? "0" : "").concat(dateValue.getMonth() + 1));
      returnValue = returnValue.replace(/m/gm, dateValue.getMonth() + 1);
      returnValue = returnValue.replace(/yyyy/gm, "".concat(dateValue.getFullYear()));
      returnValue = returnValue.replace(/yy/gm, "".concat(String(dateValue.getFullYear()).slice(2)));
      return returnValue;
    },

    /**
     * Instead of the URL, create a Link, which is a clickable text.
     * The page will after clicking always be opened in a new Tab.
     * 
     * @param {String} keyWordContent The URL for which should get formated
     * @param {String} formatter The Text, which the URL should display
     * 
     * @returns {String} The Formated URL as String in the HTML-Format
     */
    _formateLink: function _formateLink(keyWordContent, formatter) {
      return "<a href=\"".concat(keyWordContent, "\" target=\"_blank\" rel=\"noopener noreferrer\">").concat(formatter, "</a>");
    },

    /**
     * Get the Value from a given XML value
     * 
     * @param {XMLDocument} xmlDocument The parent of the XML which should get searched
     * @param {XMLDocument} xmlValue The XML, which should get searched
     * @param {Boolean} allowEmptyReturn Can be value, which get returned be empty
     * @param {String} command Access an extra command after the value was found
     * 
     * @returns {String} Content of the XML Value
     */
    _getValueFromXML: function _getValueFromXML(xmlDocument, xmlValue, allowEmptyReturn, command) {
      if (Boolean(command)) {
        // Command found
        if (xmlValue.textContent[command] != undefined) {
          // Command does exists
          return xmlValue.textContent[command];
        } else {
          // Command unknown
          return allowEmptyReturn ? "" : "[Undefined-Command]";
        }
      } else {
        // Command not defined
        return this._matchLinksToText(xmlValue.textContent, xmlDocument.querySelectorAll(":scope > links"));
      }
    },

    /**
     * Add links to a given Texted
     * 
     * @param {String} text Text which should get converted
     * @param {NodeList} links List with all the Links
     * 
     * @returns {String} Text with the links
     */
    _matchLinksToText: function _matchLinksToText(text, links) {
      // Check if the type of the links is correct
      if (Boolean(links) && (NodeList.prototype.isPrototypeOf(links) || Array.isArray(links)) && links.length > 0) {
        var _returnValue = text; // Sort the list of links, based on there position from the highest to the lowest

        var _sortedLinksList = [].slice.call(links).sort(function (a, b) {
          return Number(a.querySelector("offset").textContent) > Number(b.querySelector("offset").textContent) ? -1 : 1;
        }); // Handle every link in the entry


        _sortedLinksList.forEach(function (elementLinkNode) {
          var _elementLinkNodeOffset = Number(elementLinkNode.querySelector("offset").textContent);

          var _elementLinkNodeLength = Number(elementLinkNode.querySelector("length").textContent);

          var _elementLinkNodeWebUri = elementLinkNode.querySelector("weburi").textContent; // Replace the content of the text with the links

          _returnValue = _returnValue.substring(0, _elementLinkNodeOffset) + "<a href='" + _elementLinkNodeWebUri + "' target='_blank' rel='noopener noreferrer'>" + _returnValue.substring(_elementLinkNodeOffset, _elementLinkNodeOffset + _elementLinkNodeLength) + "</a>" + _returnValue.substring(_elementLinkNodeOffset + _elementLinkNodeLength);
        });

        return _returnValue;
      } else {
        return text;
      }
    },

    /**
     * Strip all the unneeded HTML Tags from a HTML Text
     * 
     * @param {String} input The HTML text
     * @param {String} allowed All the Tags which are allowed to be used
     * 
     * @returns {String} Text with escaped HTML Tags
     * 
     * @example _striptTags("<b><u>My</u> allowed <i>Tag</i></b> an this is <center><li>my forbidden</li> Tag</center>", "<b><i><u><p>")
     */
    _striptTags: function _striptTags(input, allowed) {
      // Remove whitespace and unnecessary characters 
      allowed = (((allowed || '') + '').toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join(''); // Create the Regex which should be used

      var _tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
          _commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi; // Replace the content based on the Tags

      return input.replace(_commentsAndPhpTags, '') // Check if the tag is in list
      .replace(_tags, function (_0, _1) {
        // Verify if there is something, that should be replaced
        return allowed.indexOf('<' + _1.toLowerCase() + '>') > -1 ? _0 : _0.replace("<", "&lt;").replace(">", "&gt;");
      });
    },

    /**
     * Generate the table where the content will be set
     * 
     * @param {Number} width How many cells per row
     * @param {Number} height How many rows
     * @param {String} tablePosition Where the table should be positioned to
     * 
     * @returns {Element} Table with the size of the given parameters
     */
    _generateContentTable: function _generateContentTable(width, height, border) {
      var tablePosition = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "center";

      // Check if there is any value and the value is a number
      if (width == null || height == null || !Number(width) || !Number(height)) {
        return null;
      }

      try {
        var _tableElement = document.createElement("table");

        _tableElement.classList.add("workitemTable"); // Change the position of the table


        switch (tablePosition) {
          case "left":
            _tableElement.style.marginLeft = "unset";
            break;

          case "right":
            _tableElement.style.marginRight = "unset";
            break;
        }

        if (this._pageSizeOptimize !== null) {
          if (this._pageSizeOptimize.height !== undefined) {
            //_tableElement.style.height = this._pageSizeOptimize.height + "px";
            _tableElement.style.height = this._pageSizeOptimize.height;
          }

          if (this._pageSizeOptimize.width !== undefined) {
            //_tableElement.style.width = this._pageSizeOptimize.width + "px";
            _tableElement.style.width = this._pageSizeOptimize.width;
          }
        }

        if (border === undefined || border === true) {
          _tableElement.classList.add("border");
        }

        for (var h = 0; h < height; h++) {
          var tableRowElement = document.createElement("tr");

          for (var w = 0; w < width; w++) {
            var tableCellElement = document.createElement("td");
            tableCellElement.setAttribute("tableID", this._calculateIDByPosition(w, h));
            tableRowElement.appendChild(tableCellElement);
          }

          _tableElement.appendChild(tableRowElement);
        }

        return _tableElement;
      } catch (e) {
        return null;
      }
    },

    /**
     * Generate all the Containers and add some basic css based on the parameters,
     * which were provided.
     * 
     * @param {*} startPosition The coordinates where the container starts
     * @param {*} endPosition The coordinates where the container ends
     * 
     * @param {Number} regionID The ID of the Region this container should belong to
     * @default null
     * 
     * @param {String} backgroundColor The background color of the container
     * @default null
     * 
     * @param {Boolean} borderless If the regions should have a border or not
     * @default null
     */
    _drawContainerInTable: function _drawContainerInTable(startPosition, endPosition) {
      var _regionID = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

      var _backgroundColor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

      var _borderless = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      if (startPosition == null || endPosition == null || startPosition.x == undefined || startPosition.y == undefined || isNaN(startPosition.x) || isNaN(startPosition.y) || endPosition.x == undefined || endPosition.y == undefined || isNaN(endPosition.x) || isNaN(endPosition.y)) {
        throw SyntaxError;
      } // Rearrange the positions in order to draw the container correctly


      var _rearrangedPositions = this._rearrangePositions(startPosition, endPosition); // Go through each possible position for the region


      for (var x = _rearrangedPositions[0].x; x <= _rearrangedPositions[1].x; x++) {
        // Ignore negative X - Axis
        if (x < 0) {
          continue;
        }

        for (var y = _rearrangedPositions[0].y; y <= _rearrangedPositions[1].y; y++) {
          // Ignore negative Y - Axis
          if (y < 0) {
            continue;
          }

          var _generatedID = this._calculateIDByPosition(x, y); // Get the Element with an give ID


          var _elementByPosition = this.parentWidget.getHolderElement().querySelector('[tableID="' + _generatedID + '"]'); // Check if the element, which gets changed, even exists


          if (_elementByPosition == null) {
            // If the ID can't be found, ignore everything and go the the next one
            continue;
          }

          _elementByPosition.style.backgroundColor = _backgroundColor == null ? "" : _backgroundColor; // Check if the Border should be overwritten and add a border to the edge if the position is correct

          if (!_borderless) {
            _elementByPosition.style.border = "none";
            var _borderDefaultSettings = "1px solid black";

            if (y === _rearrangedPositions[0].y) {
              _elementByPosition.style.borderTop = _borderDefaultSettings;
            }

            if (y === _rearrangedPositions[1].y) {
              _elementByPosition.style.borderBottom = _borderDefaultSettings;
            }

            if (x === _rearrangedPositions[0].x) {
              _elementByPosition.style.borderLeft = _borderDefaultSettings;
            }

            if (x === _rearrangedPositions[1].x) {
              _elementByPosition.style.borderRight = _borderDefaultSettings;
            }
          } // Setting the RegionID for use in the future, but will not
          // be used yet.


          if (_regionID != null) {
            _elementByPosition.setAttribute("regionID", _regionID);
          }
        }
      }
    },

    /**
     * Set the content of a given container
     *  
     * @param {*} startPosition The coordinates where the container starts
     * @param {*} endPosition The coordinates where the container ends
     * 
     * @param {Number} regionID The id of the region for the container
     * @default null
     * 
     * @param {String} textContent The content which should get displayed
     * @default ""
     * 
     * @param {Number} textFont The size of the text inside the container
     * @default 10
     * 
     * @param {String} textBinding Alignment of the content
     * @default "left"
     * 
     * @param {String} textVertical Vertical position of the content
     * @default "top"
     * 
     * @param {String} textColor The color of the text
     * @default "#ffffff"
     * 
     * @param {String} toolTipContent The tooltip shown
     * @default ""
     * 
     */
    _setContentOfContainer: function _setContentOfContainer(startPosition, endPosition) {
      var _regionID = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

      var _textContent = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "";

      var _textFont = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 10;

      var _textBinding = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : "left";

      var _textVertical = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : "top";

      var _textColor = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : "#ffffff";

      var _toolTipContent = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : "";

      var _rearrangedPositions = this._rearrangePositions(startPosition, endPosition); // Remove all negative Vales, in order to draw the Text correct
      // and not to start from a not possible id


      if (_rearrangedPositions[0].x < 0) {
        _rearrangedPositions[0].x = 0;
      }

      if (_rearrangedPositions[0].y < 0) {
        _rearrangedPositions[0].y = 0;
      }

      if (_rearrangedPositions[1].x < 0) {
        _rearrangedPositions[1].x = 0;
      }

      if (_rearrangedPositions[1].y < 0) {
        _rearrangedPositions[1].y = 0;
      } // Check if the content contains any value


      if (Boolean(_textContent)) {
        // Get the start and end element of the container based on there ID
        var _startElement = this.parentWidget.getHolderElement().querySelector("[tableID=\"".concat(this._calculateIDByPosition(_rearrangedPositions[0].x, _rearrangedPositions[0].y), "\"]"));

        var _endElement = this.parentWidget.getHolderElement().querySelector("[tableID=\"".concat(this._calculateIDByPosition(_rearrangedPositions[1].x, _rearrangedPositions[1].y), "\"]")); // Check if the both start and end elements exists


        if (_startElement == null || _endElement == null) {
          return;
        } // Remove all the Text which else would overlap


        while (_startElement.hasChildNodes()) {
          _startElement.removeChild(_startElement.childNodes[0]);
        } // Calculate the boundaries and size of the start and end element


        var _startElementBoundaries = this._calculateBoundariesOfElement(_startElement);

        var _endElementBoundaries = this._calculateBoundariesOfElement(_endElement); // Create element to hold the text and keep the size of the
        // cell of the table


        var _textHolderElement = document.createElement("div");

        _textHolderElement.classList.add("textHolder"); // Create the Element and Text


        var _textContainerElement = document.createElement("div");

        _textContainerElement.classList.add("textContainer"); //Set the tooltip if any can be found


        if (Boolean(_toolTipContent)) {
          _textContainerElement.setAttribute("title", _toolTipContent);
        }

        var _textDisplayElement = document.createElement("div");

        _textDisplayElement.classList.add("textDisplay");

        _textDisplayElement.innerHTML = this._striptTags(this._checkRegexAndTranslate(_textContent, _regionID), this.GLOBAL_HTML_ALLOWED_TAGS);
        _textDisplayElement.style.verticalAlign = _textVertical;
        _textDisplayElement.style.width = "inherit"; // Resize the element in order to hold the text inside of the full
        // container instead of using the size of the table cell.
        // -1 Needs to be done in order to ignore the boarder which is 1 px

        _textContainerElement.style.width = "".concat(_endElementBoundaries.left - _startElementBoundaries.left + _endElementBoundaries.width - 5, "px");
        _textContainerElement.style.height = "".concat(_endElementBoundaries.top - _startElementBoundaries.top + _endElementBoundaries.height - 3, "px"); // Show the Browser the room for the vertical alignment

        _textContainerElement.style.lineHeight = _textContainerElement.style.height;
        _textContainerElement.style.marginLeft = "2px";
        _textContainerElement.style.marginTop = "2px"; // Add Style to the element

        _textContainerElement.style.fontSize = "".concat(_textFont * 10, "%");
        _textContainerElement.style.textAlign = _textBinding;
        _textContainerElement.style.color = _textColor;

        _textContainerElement.appendChild(_textDisplayElement);

        _textHolderElement.appendChild(_textContainerElement);

        _startElement.appendChild(_textHolderElement);
      }
    },

    /**
     * Calculate the ID of an position
     * 
     * @param {Number} x The X-Axe position
     * @param {Number} y The Y-Axe position
     * 
     * @returns {Number} The ID of the item at the given position
     */
    _calculateIDByPosition: function _calculateIDByPosition(x, y) {
      return y * this.activeConfigurationWidth + x;
    },

    /**
     * Rearrange the start and end Position in order for the start positions
     * to be smaller than the end positions
     * 
     * @param {[]} startPosition The Position where the start point is
     * @param {[]} endPosition  The Position where the end point is
     * 
     * @returns {[[],[]]} Rearranged start and end position
     */
    _rearrangePositions: function _rearrangePositions(startPosition, endPosition) {
      if (this._calculateIDByPosition(startPosition.x, startPosition.y) > this._calculateIDByPosition(endPosition.x, endPosition.y)) {
        var _virtualStartPosition = startPosition;
        startPosition = endPosition;
        endPosition = _virtualStartPosition;
      }

      if (startPosition.x > endPosition.x) {
        var _virtualStartPositionX = startPosition.x;
        startPosition.x = endPosition.x;
        endPosition.x = _virtualStartPositionX;
      }

      if (startPosition.y > endPosition.y) {
        var _virtualStartPositionY = startPosition.y;
        startPosition.y = endPosition.y;
        endPosition.y = _virtualStartPositionY;
      }

      return [startPosition, endPosition];
    },

    /**
     * Calculate the boundaries of an given element
     * 
     * @param {Element} element Element which should get be calculated
     * 
     * @returns {Object} Boundaries in JSON format
     */
    _calculateBoundariesOfElement: function _calculateBoundariesOfElement(element) {
      // Get the rectangle which surrounds the element
      var _rect = element.getBoundingClientRect(),
          _scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
          _scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      return {
        top: Number( // Get the distance from the top of the page to the element
        Number(_rect.top + _scrollTop).toFixed(2)),
        left: Number( // Get the distance from the left ot the page to the element
        Number(_rect.left + _scrollLeft).toFixed(2)),
        width: Number( // Get the width of the element
        Number(_rect.width).toFixed(2)),
        height: Number( // Get the height of the element
        Number(_rect.height).toFixed(2))
      };
    },

    /**
     * Apply dynamic Heights by changing a deep copy configuration and redrawing the table
     * 
     * @param {Boolean} updateTitle Should "updateTitle" function get called
     * @param {JSON} _configuration 
     */
    _applyDynamicHeights: function _applyDynamicHeights(updateTitle, _configuration) {
      var _this7 = this;

      try {
        if (this.ignoreDynamicValues || this.dynamicHeightList.length == 0) {
          this.parentWidget.updateTitle();
          return;
        } //Create a deep copy


        var configuration = JSON.parse(JSON.stringify(_configuration));

        var _applyConfiguration = this._loadConfigurationByWorkitem(configuration);

        if (_applyConfiguration == null) {
          this.parentWidget.updateTitle();
          return;
        }

        _applyConfiguration.values.forEach(function (element) {
          if (_this7.dynamicHeightList.includes(element.regionID)) {
            var currentSizeHolder = _this7.parentWidget.getHolderElement().querySelector("[regionID=\"".concat(element.regionID, "\"]"));

            if (currentSizeHolder != null) {
              // Add X amount of pixels, because else everything is cut off very tight
              var currentSize = currentSizeHolder.querySelector(":scope .textDisplay").offsetHeight + 5;
              var currentRows = element.end.y - element.start.y + 1;
              var needRowsTotal = Math.ceil(currentSize / _this7.pixelPerRow);
              var diffNeedCurrent = needRowsTotal - currentRows; //Start doing stuff

              element.end.y = element.start.y + needRowsTotal - 1;
              element.dynamicHeight = false;
              _applyConfiguration.config.height += diffNeedCurrent;

              _applyConfiguration.values.forEach(function (childElement) {
                if (childElement.start.y > element.start.y) {
                  childElement.start.y += diffNeedCurrent;
                  childElement.end.y += diffNeedCurrent;
                }
              });
            }
          }
        });

        this.parentWidget.getHolderElement().innerHTML = "";
        this.dynamicHeightList = [];

        this._allDataCollectedFromJazz(updateTitle, configuration);
      } catch (e) {
        console.error(e);
        this.parentWidget.updateTitle();
      }
    }
  });
});