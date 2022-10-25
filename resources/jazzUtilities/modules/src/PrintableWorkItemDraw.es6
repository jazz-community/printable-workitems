define(["dojo/_base/declare",
], function (declare) {

	return declare(null, {

		parentWidget: null,

		// Public Value which contents the width of the current configuration
		activeConfigurationWidth: 5,
		// Map with all the keys and values for the translator
		keyValueMap: [],
		predefinedAttributes: [],

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

		toggleApplyHideSet: null,

		_pageSizeOptimize: null,

		_months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],

		/**
		 * @static final
		 * 
		 * All the HTML-Tags, which are allowed by the System
		 * to get displayed
		 */
		GLOBAL_HTML_ALLOWED_TAGS: "<b><i><u><p><br><a><s><div><span><hr><synthetic><ul><li><ol><svg><g><path>",

		constructor: function (parentWidget) {
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
		drawTableFromConfiguration: function (workitemID, configuration, updateTitle = false, skipWebKeysIfNotEmpty = false, allowDeepChild = false, _pageSizeOptimize = null, _predefinedAttributes = null, _ignoreDynamicValues = false) {

			// Clear remaining Tasks
			this.taskScheduler = [];

			this._pageSizeOptimize = _pageSizeOptimize;

			this.dynamicVariableCounter = [];
			this.ignoreDynamicValues = _ignoreDynamicValues;

			this.globalChildrenLoaded = 0;
			this.globalChildrenToBeLoaded = 0;

			this.globalChildCheckingDone = false;

			this.toggleApplyHideSet = new Set();

			this.predefinedAttributes = !_predefinedAttributes ? [] : _predefinedAttributes;

			if (!skipWebKeysIfNotEmpty || (skipWebKeysIfNotEmpty && this.keyValueMap.length === 0)) {

				this._getDataFromJazz(workitemID, updateTitle, configuration, allowDeepChild, (mainContainer) => {

					if (!allowDeepChild) {
						this.globalChildCheckingDone = true;
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
		_runScheduledTasks: function () {
			if (this.taskScheduler.length != 0) {
				for (let i = 0; i < this.taskScheduler.length; i++) {
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
		_allDataCollectedFromJazz: function (updateTitle, configuration) {

			this.dynamicHeightList = [];

			if (this.globalChildCheckingDone) {

				this._applyConfigurationToWorkitem(configuration);

				this._runScheduledTasks();

				if (this.dynamicHeightList.length != 0 && !this.ignoreDynamicValues) {

					this._applyDynamicHeights(updateTitle, configuration);

				} else {

					if (updateTitle) {
						this.parentWidget._updateTitle();
					}

					this.onFinishedDrawing();
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
		_childWasLoaded: function (updateTitle, configuration, increment = true) {
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
		_getDataFromJazz: function (workitemID, updateTitle, configuration, allowDeepChild, _callback, currentChildID = null, childEndpointID = null) {

			// Make a request to get the Values from Jazz
			jazz.client.xhrGet({
				url: `${this.parentWidget.webURL}/service/com.ibm.team.workitem.common.internal.rest.IWorkItemRestService/workItemDTO2?includeHistory=false&id=${workitemID}`,
				error: function () {
					this.parentWidget.showErrorMessage("Can't request the given ID");
					return null;
				}
			}).then(((rootResult) => {

				if (rootResult == null || rootResult == undefined) {
					_callback(this);
				} else {
					// Process all the Data which where returned from Jazz
					this._processDataFromJazz(this, rootResult, allowDeepChild, currentChildID, updateTitle, configuration, childEndpointID);
					_callback(this);
				}

			}).bind(this));

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
		_processDataFromJazz: function (mainContainer, rootResult, allowDeepChild, currentChildID, updateTitle, configuration, childEndpointID) {

			if (currentChildID == null) {
				this.keyValueMap = [];
				this.dynamicVariableCounter = [];
			}

			let _xmlContent = null;

			// For IE
			if (window.ActiveXObject) {
				let oXML = new ActiveXObject("Microsoft.XMLDOM");
				oXML.loadXML(rootResult);
				_xmlContent = oXML;
			} else {
				// Modern Browser
				_xmlContent = (new DOMParser()).parseFromString(rootResult, "text/xml");
			}

			// Map all Values from the Workitem level
			_xmlContent.querySelectorAll("value > attributes").forEach((queryElement) => {
				mainContainer.keyValueMap.push([
					`${childEndpointID != null && currentChildID != null ? `${childEndpointID}:${currentChildID}:` : ""}${queryElement.querySelector("key").textContent}`,
					queryElement.querySelector("value")
				]);
			});

			// Map all parent Values
			// Only one parent will be used, because multiple parents isn't permitted
			let _queryResult = _xmlContent.querySelectorAll("value > linkTypes > endpointId");

			//let childCounter = 0;
			for (let i = 0; i < _queryResult.length; i++) {
				let _queryElement = _queryResult[i];

				let hasEndpointID = true;

				if (_queryElement.textContent == "") {
					hasEndpointID = false;
					_queryElement.textContent = _queryElement.closest("linkTypes").querySelector("id").textContent;
				}

				if (currentChildID === null) {

					mainContainer._globalDynamicCounterCreateOrUpdate(_queryElement.textContent);

					_queryElement.closest('linkTypes').querySelectorAll(":scope > linkDTOs").forEach((queryChildElement) => {

						let queryList = queryChildElement.querySelectorAll(":scope > target > attributes");
						let fakeType = false;

						if (queryList.length == 0) {
							fakeType = true;

							// Check if Children for HTMLCollection is supported (Not supported in IE)
							if (queryChildElement.children == undefined || queryChildElement.children == null) {

								let n = 0, node, nodes = queryChildElement.childNodes, children = [];
								while (node = nodes[n++]) {
									if (node.nodeType === 1) {
										children.push(node);
									}
								}
								queryList = children;

							} else {
								queryList = Array.from(queryChildElement.children);
							}

							let fakeID = document.createElement("_id");
							let fakeIDSplit = queryChildElement.querySelector(":scope > url").textContent.split("/");
							fakeID.innerText = hasEndpointID && !isNaN(Number(fakeIDSplit[fakeIDSplit.length - 1])) ? fakeIDSplit[fakeIDSplit.length - 1] : mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent);
							queryList.push(fakeID);

							queryList.length = queryList.length == undefined ? queryList.children.length : queryList.length;
						}

						/*****************************************************************/
						// Add the attribute "_url" to all the children, which were found
						/*****************************************************************/
						let fakeURL = queryChildElement.querySelector(":scope > url");
						if (fakeURL != undefined || fakeURL != null) {

							let fakeURLKey = document.createElement("key");
							let fakeURLValue = document.createElement("value");

							fakeURLKey.innerText = "_url";
							fakeURLValue.innerHTML = `<label>${fakeURL.textContent}</label>`;

							let fakeURLHolder = document.createElement("attributes");
							fakeURLHolder.appendChild(fakeURLKey);
							fakeURLHolder.appendChild(fakeURLValue);

							mainContainer.keyValueMap.push([
								`${_queryElement.textContent}:${mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent)}:_url`,
								fakeURLValue
							]);
						}
						/*****************************************************************/

						if (!allowDeepChild || !hasEndpointID || _queryElement.textContent == "textuallyReferenced") {

							mainContainer._readAttributeValuesWithNoDeepValue(_queryElement, queryList, allowDeepChild, updateTitle, configuration, fakeType);

						} else {

							for (let c = 0; c < queryList.length; c++) {
								const element = queryList[c];

								if (fakeType || element.querySelector("key").textContent.toLowerCase() == "id") {

									let fakeElementID = null;

									if (fakeType) {
										let fakeURL = queryChildElement.querySelector(":scope > url").textContent;
										let fakeSplit = fakeURL.split("/");
										fakeElementID = Number(fakeSplit[fakeSplit.length - 1]);

										if (isNaN(fakeElementID) || !fakeURL.startsWith(window.location.origin)) {
											mainContainer._readAttributeValuesWithNoDeepValue(_queryElement, queryList, allowDeepChild, updateTitle, configuration, fakeType);
											break;
										}

									}

									// Create a new request for the Child-Object
									mainContainer._getDataFromJazz(
										fakeType ? fakeElementID : element.querySelector("value > id").textContent,
										updateTitle,
										configuration,
										allowDeepChild,
										(_requestMainContainer) => {
											_requestMainContainer._childWasLoaded(updateTitle, configuration);
										},
										mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent),
										_queryElement.textContent
									);

									break;
								}
							}

						}

						mainContainer._globalDynamicCounterCreateOrUpdate(_queryElement.textContent);

					});

					if (mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent) !== 0) {

						mainContainer.globalChildrenToBeLoaded += mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent);

						/** Add new Entry for the count of the found types */
						let value = document.createElement("value");
						let label = document.createElement("label");

						label.innerText = mainContainer._globalDynamicCounterGetValueContent(_queryElement.textContent);
						value.appendChild(label);

						mainContainer.keyValueMap.push([
							_queryElement.textContent,
							value
						]);
						/******************************************************/

					}

				}

			}

			//apply all current Custom Attributes
			this._applyCustomCurrentAttributeToPredefined();

			//apply all the Custom Attributes
			this.predefinedAttributes.forEach(element => {

				let value = document.createElement("value");
				let label = document.createElement("label");

				label.innerText = element.value;
				value.appendChild(label);

				this.keyValueMap.push([
					element.key,
					value
				]);

			});

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
		 * Get the current user which is logged in
		 */
		_getCurrentUser: function () {
			return com.ibm.team.repository.web.client.internal.AUTHENTICATED_CONTRIBUTOR;
		},

		/**
		 * Apply all the Data for current values
		 *  - User
		 *  - Date
		 */
		_applyCustomCurrentAttributeToPredefined: function () {

			// Add Current User
			const userDataKeys = ['archived', 'emailAddress', 'immutable', 'itemId', 'modified', 'name', 'stateId', 'userId'];

			let currentUserData = this._getCurrentUser();
			if (currentUserData) {
				userDataKeys.forEach(key => {
					this._addPredefinedKeyValue(`current.user.${key}`, currentUserData[key]);
				})
			}
			else {
				console.warn("Failed to load the current user");
			}

			// Add Current Date
			const now = Date.now();
			const currentDate = new Date(now);
			const dateString = currentDate.toUTCString();

			this._addPredefinedKeyValue('current.date', dateString);
			this._addPredefinedKeyValue('current.date.f.g.time', this._formateDate(now, 'hh\:mnmn\:ss'));

			this._addPredefinedKeyValue('current.date.f.g.date', this._formateDate(now, 'dd/mm/yyyy'));
			this._addPredefinedKeyValue('current.date.f.us.date', this._formateDate(now, 'mm/dd/yyyy'));

			this._addPredefinedKeyValue('current.date.l.time', currentDate.toTimeString());
			this._addPredefinedKeyValue('current.date.l.date', currentDate.toDateString());
		},

		/**
		 * Add new Key and Value to the predefined Attribute list
		 * 
		 * @param {string} key 
		 * @param {string} value 
		 */
		_addPredefinedKeyValue: function (key, value) {
			this.predefinedAttributes.push({
				key: key,
				value: value
			});
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
		_readAttributeValuesWithNoDeepValue: function (_queryElement, queryList, allowDeepChild, updateTitle, configuration, fakeType) {

			queryList.forEach((queryAttributeElement) => {

				if (fakeType) {
					let keyValue = document.createElement("key");
					keyValue.innerText = queryAttributeElement.tagName;

					let valueElement = document.createElement("value");
					let valueContent = document.createElement("label");
					valueContent.innerText = queryAttributeElement.textContent;
					valueElement.appendChild(valueContent);

					queryAttributeElement.appendChild(keyValue);
					queryAttributeElement.appendChild(valueElement);
				}

				this.keyValueMap.push([
					`${_queryElement.textContent}:${this._globalDynamicCounterGetValueContent(_queryElement.textContent)}:${queryAttributeElement.querySelector("key").textContent}`,
					queryAttributeElement.querySelector("value")
				]);
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
		_globalDynamicCounterCreateOrUpdate: function (name, forceCreate = false, valueToAdd = 1, defaultValue = 0) {

			for (let i = 0; i < this.dynamicVariableCounter.length; i++) {
				if (this.dynamicVariableCounter[i][0] == name) {
					if (forceCreate) {
						this.dynamicVariableCounter[i][1] = defaultValue;
					} else {
						this.dynamicVariableCounter[i][1] += valueToAdd;
					}
					return;
				}
			}
			this.dynamicVariableCounter.push([
				name,
				defaultValue
			]);

		},

		/**
		 * Get the current counter of a specific Dynamic-Counter
		 * 
		 * @param {String} name Name of the Dynamic-Counter
		 * 
		 * @returns {Number|undefined} Current count of the Dynamic-Counter
		 */
		_globalDynamicCounterGetValueContent: function (name) {
			for (let i = 0; i < this.dynamicVariableCounter.length; i++) {
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
		_applyConfigurationToWorkitem: function (configurationJSON) {

			this.dynamicHeightList = [];

			try {

				// Load the configuration based on the Type of the workitem
				let _activeConfigurationJSON = this._loadConfigurationByWorkitem(configurationJSON);

				// Check if the could be found any configuration
				if (_activeConfigurationJSON == null) {
					this.parentWidget.showErrorMessage("No configuration can be found or loaded");
					return;
				}

				// Updates the width value to the value from the current configuration
				this.activeConfigurationWidth = _activeConfigurationJSON.config.width;

				// Create the Table
				this.parentWidget.getHolderElement().appendChild(
					this._generateContentTable(
						_activeConfigurationJSON.config.width,
						_activeConfigurationJSON.config.height,
						_activeConfigurationJSON.config.border,
						_activeConfigurationJSON.config.tablePosition
					)
				);

				// Check if values are in the correct format
				if (_activeConfigurationJSON.values == undefined || !Array.isArray(_activeConfigurationJSON.values)) {
					throw SyntaxError;
				}

				// Go through each value in the current configuration and draw the container
				for (let _valueCount = 0; _valueCount < _activeConfigurationJSON.values.length; _valueCount++) {

					let _configurationValue = _activeConfigurationJSON.values[_valueCount];

					this._drawContainerInTable(
						_configurationValue.start,
						_configurationValue.end,
						_configurationValue.regionID,
						_configurationValue.backColor,
						_configurationValue.borderless
					);

				}

				// Go through each value in the current configuration and add text to the container
				for (let _valueCount = 0; _valueCount < _activeConfigurationJSON.values.length; _valueCount++) {

					let _configurationValue = _activeConfigurationJSON.values[_valueCount];

					// Check if there is any text which should be drawn
					if (_configurationValue.textContent != null || _configurationValue.textContent !== "") {
						this._setContentOfContainer(
							_configurationValue.start,
							_configurationValue.end,
							_configurationValue.regionID,
							_configurationValue.textContent,
							_configurationValue.fontSize,
							_configurationValue.textBinding,
							_configurationValue.textVertical,
							_configurationValue.textColor,
							_configurationValue.toolTipContent
						);

						//Add ID of found dynamicHeight Value
						if (_configurationValue.dynamicHeight) {
							this.dynamicHeightList.push(_configurationValue.regionID);
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
		_loadConfigurationByWorkitem: function (configuration) {

			let _backupID = null;
			let _workItemType = this._checkRegexAndTranslate("{{workItemType}}");

			try {

				for (let i = 0; i < configuration.length; i++) {

					let elementConfiguration = configuration[i];
					let elementConfigurationTypeList = elementConfiguration.type.split(";");

					for (let c = 0; c < elementConfigurationTypeList.length; c++) {
						let elementTypeValue = elementConfigurationTypeList[c];

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
		_checkRegexAndTranslate: function (textContent, regionID = null, _forceSelector = null, _defaultOnForceFailed = true) {

			let _mainContainer = this;

			let _regex = /\{\{.*?\}\}/g;
			let _m;

			let _returnValue = textContent;

			while ((_m = _regex.exec(textContent)) !== null) {
				// This is necessary to avoid infinite loops with zero-width matches
				if (_m.index === _regex.lastIndex) {
					_regex.lastIndex++;
				}

				// Check every result which got found
				_m.forEach((match, groupIndex) => {

					let _replaceValue = match;

					// Remove the "{{" and "}}" characters and split the command
					let _contentID = (match.substring(2, match.length - 2))
						.split("#");

					// Check if the word contains the "*" character at the beginning or the end
					let _checkEndWith = _contentID[0].startsWith("*");
					let _checkStartWith = _contentID[0].endsWith("*");

					if (_checkStartWith) {
						_contentID[0] = _contentID[0].substring(0, _contentID[0].length - 1);
					} else if (_checkEndWith) {
						_contentID[0] = _contentID[0].substring(1, _contentID[0].length);
					}

					// Check every value in the List, to check if the key can be found
					for (let i = 0; i < _mainContainer.keyValueMap.length; i++) {
						let _mapElement = _mainContainer.keyValueMap[i];

						if (
							_mapElement[0] == _contentID[0] ||
							(_checkStartWith && _mapElement[0].startsWith(_contentID[0])) ||
							(_checkEndWith && _mapElement[0].endsWith(_contentID[0]))
						) {
							// Set the text value which should be replaced with the match
							_replaceValue = _mainContainer._translateValueToText(
								_mapElement[1],
								_contentID.length > 1 ? _contentID[1].replace(/\[.*\]/g, "") : null,
								_forceSelector,
								_defaultOnForceFailed
							);

							if (_contentID.length > 1) {
								let returnSmartCommandValue = this._checkAndApplySmartCommand(_contentID[0], _contentID[1], _replaceValue, regionID);
								if (!returnSmartCommandValue.show) {
									_replaceValue = "";
								} else if (returnSmartCommandValue.overwrite !== undefined) {
									_replaceValue = returnSmartCommandValue.overwrite;
								}
							}

							break;
						}

					}

					// Check if the match should can be returned empty if nothing was found
					if (_replaceValue === match && _contentID.length > 1 && _contentID[1].startsWith("?")) {
						_replaceValue = "";
					}

					// Replace the regex value with the found value
					_returnValue = _returnValue.replace(match, _replaceValue);

				});

			}

			// Return the everything
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
		_translateValueToText: function (value, _command = null, _forceSelector = null, _defaultOnForceFailed = true) {

			// Variables important for the function
			let _mainContainer = this;
			let _allowEmptyReturn = false;

			// Check if the Return-Value can be empty
			if (Boolean(_command) && _command.charAt(0) == '?') {
				_allowEmptyReturn = true;
				_command = _command.substr(1);
			}

			if (_forceSelector !== null) {

				const returnValue = value.querySelector(`:scope > ${_forceSelector}`);

				if (Boolean(returnValue)) {
					return this._getValueFromXML(value, returnValue, _allowEmptyReturn, _command);
				}

				if (!_defaultOnForceFailed) {
					return _allowEmptyReturn ? "" : "[Unknown-Selector]";
				}

			}

			// Check the and match Values in the XML Object
			if (Boolean(value.querySelector(":scope > label"))) {
				let _labelValue = value.querySelector(":scope > label");
				return this._getValueFromXML(value, _labelValue, _allowEmptyReturn, _command);
			} else if (Boolean(value.querySelector(":scope > id"))) {
				let _idValue = value.querySelector(":scope > id");
				return this._getValueFromXML(value, _idValue, _allowEmptyReturn, _command);
			} else if (Boolean(value.querySelector(":scope > content"))) {
				let _contentValue = value.querySelector(":scope > content");
				return this._getValueFromXML(value, _contentValue, _allowEmptyReturn, _command);
			} else if (Boolean(value.querySelector(":scope > items"))) {

				// Get list of all items in list
				let _itemsValue = value.querySelectorAll(":scope > items");

				// Verify that this is a NodeList or ArrayList
				if (NodeList.prototype.isPrototypeOf(_itemsValue) || Array.isArray(_itemsValue)) {

					// Check if there is any content
					if (_itemsValue.length == 0) {
						return _allowEmptyReturn ? "" : "[Empty-List]";
					} else {

						// Check if there is a command
						if (Boolean(_command)) {
							// Check if the value is a number and isn't bigger than the List
							if (!isNaN(Number(_command)) && _itemsValue.length >= (Number(_command) + 1)) {
								return this._translateValueToText(_itemsValue[Number(_command)]);
							} else {
								return _itemsValue[_command] != undefined ? _itemsValue[_command] : (_allowEmptyReturn ? "" : "[Undefined-Command]");
							}
						} else {
							// Prepare the String to be generated from the List
							let _listReturn = "";

							// Go through each value in the List
							_itemsValue.forEach((itemElement) => {
								// Check if there should be added a ,
								if (_listReturn != "") {
									_listReturn += ", ";
								}

								// Translate the XML value from the List to a text
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
		_checkAndApplySmartCommand: function (textContentKey = "", command = null, contentValue = "", regionID = null) {

			if (command == null && regionID == null) return true;

			let self = this;

			const bracketRegex = /\[.*\]/g;
			let bracketM;

			let smartCommandConfig = { show: true };

			while ((bracketM = bracketRegex.exec(command)) !== null) {
				if (bracketM.index === bracketRegex.lastIndex) {
					bracketRegex.lastIndex++;
				}

				bracketM.forEach((bracketMatch, bracketGroupIndex) => {

					bracketMatch = bracketMatch.slice(1, -1);

					let keyWordList = bracketMatch.split(";");

					keyWordList.forEach(keyWordListElement => {

						// Important ! - Everything in brackets, form the Regex, will get included in the split
						let listKeyAndValue = keyWordListElement.split(/([a-zA-Z0-9]{1,})\:/gm);

						// 0 Item is always empty / "" as String, because of the way the Regex-Split gets calculated
						// There are some exception. This gets handled, by checking if the content is empty or not.
						smartCommandConfig = self._handleSmartCommandKeys(
							listKeyAndValue[0] !== "" ? listKeyAndValue[0] + listKeyAndValue[1] : listKeyAndValue[1],
							listKeyAndValue[2],
							smartCommandConfig
						);

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
		_handleSmartCommandKeys: function (key, value, previousValue = {}) {

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
		_applySmartCommandConfig: function (textContentKey, previousValue, keyWordContent, regionID) {

			if (previousValue.type === "css" && previousValue.css !== undefined) {

				this.parentWidget.getHolderElement().querySelectorAll('[regionID="' + regionID + '"]').forEach(element => {

					previousValue.css.split(",").forEach(cssElement => {

						element.style[cssElement] = keyWordContent;

					});

				});

			} else if (previousValue.type === "table" && previousValue.table !== undefined) {

				this.taskScheduler.push(() => {

					let contentHolderElement = this.parentWidget.getHolderElement().querySelector('[regionID="' + regionID + '"] > .textHolder > .textContainer > .textDisplay');

					if (contentHolderElement == null) {
						return;
					}

					contentHolderElement.innerHTML = "";

					if (!previousValue.show) {
						return;
					}

					let tableHolderElement = document.createElement("table");
					tableHolderElement.style.width = "calc(100% - 3px)";
					contentHolderElement.style.width = "inherit";
					tableHolderElement.style.color = contentHolderElement.parentNode.style.color;
					tableHolderElement.style.borderCollapse = "collapse";
					tableHolderElement.style.tableLayout = "fixed";

					let borderValue = previousValue.border != undefined ? `1px solid ${previousValue.border}` : "none";

					let boldHeader = previousValue.boldHeader != undefined ? previousValue.boldHeader : "0";

					let informationTable = document.createElement("tr");

					let globalTableFilter = new Map();
					let globalTableFormatter = new Map();

					//assign filter for not displayed filters
					if (previousValue.filter != undefined) {
						let splitValue = previousValue.filter.split(",");
						for (let i = 0; i < splitValue.length; i++) {
							const element = splitValue[i].split("@");
							if (element.length == 2) {
								globalTableFilter.set(
									element[0],
									element[1]
								);
							}
						}
					}

					previousValue.table.split(",").forEach((tableHeaderElement, index) => {

						let tableHeaderElementArray = tableHeaderElement.split("&&");

						let tableHeader = document.createElement("th");
						tableHeader.innerText = tableHeaderElementArray[0];
						tableHeader.style.textAlign = contentHolderElement.parentNode.style.textAlign;
						tableHeader.style.border = borderValue;

						for (let i = 1; i < tableHeaderElementArray.length; i++) {
							const element = tableHeaderElementArray[i].split("@");

							switch (element[0]) {
								case "w":
									tableHeader.style.width = `${element[1]}%`;
									break;

								case "c":
									tableHeader.innerText = element[1];
									break;

								case "f":
									// Will overwrite the filtered value 
									// for this keyword if already created
									// in the previousValue.filter
									globalTableFilter.set(
										tableHeaderElementArray[0],
										element[1]
									);
									break;

								default:
									if (element.length == 2) {
										globalTableFormatter.set(
											index,
											[element[0], element[1]]
										);
									}
									break;
							}

						}

						if (boldHeader == "1") {
							tableHeader.innerHTML = this._striptTags(tableHeader.innerText.bold(), "<b>");
						}


						informationTable.appendChild(tableHeader);
					});
					tableHolderElement.appendChild(informationTable);

					for (let i = 0; i < keyWordContent; i++) {

						let rowAllowed = true;

						globalTableFilter.forEach((value, key) => {

							if (rowAllowed) {

								let localCheckingList = [];

								if (value.startsWith("([") && value.endsWith("])")) {
									let localValue = value.substring(2, value.length - 2);

									localValue.split("&&").forEach(element => {
										localCheckingList.push(element);
									});

								} else {
									localCheckingList.push(value);
								}

								let localTranslatedValue = this._checkRegexAndTranslate(`{{${textContentKey}:${i}:${key}}}`);

								for (let c = 0; c < localCheckingList.length; c++) {
									const listElement = localCheckingList[c];

									let filterEqualMode = !listElement.startsWith("!!");

									if (!filterEqualMode) {
										listElement = listElement.substring(2, listElement.length);
									}

									if (
										(filterEqualMode && localTranslatedValue != listElement)
										||
										(!filterEqualMode && localTranslatedValue == listElement)
									) {
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

							let valueRowElement = document.createElement("tr");

							previousValue.table.split(",").forEach((tableContentElement, index) => {

								let tableContentRow = document.createElement("td");

								let translateString = `{{${textContentKey}:${i}:${tableContentElement.split("&&")[0]}}}`;
								let translatedValue = this._checkRegexAndTranslate(translateString);

								let formatValue = globalTableFormatter.get(index);
								if (formatValue != undefined && formatValue.length == 2) {

									switch (formatValue[0]) {
										case "date":
											translatedValue = this._formateDate(
												this._checkRegexAndTranslate(translateString, null, "id"),
												formatValue[1]
											);
											break;

										case "link":
											translatedValue = this._formateLink(translatedValue, formatValue[1]);
											break;

										case "clickNode":
											let formatedValueString = `{{${textContentKey}:${i}:${formatValue[1]}}}`;
											let translatedFormatedValueString = this._checkRegexAndTranslate(formatedValueString);
											// Only create a link, if the Node-Value exists
											if (formatedValueString !== translatedFormatedValueString) {
												translatedValue = this._formateLink(
													translatedFormatedValueString,
													translatedValue
												);
											}
											break;

										default:
											break;
									}

								}

								tableContentRow.innerHTML = this._striptTags(translateString == translatedValue ? "-" : translatedValue, this.GLOBAL_HTML_ALLOWED_TAGS);
								tableContentRow.style.textAlign = contentHolderElement.parentNode.style.textAlign;
								tableContentRow.style.border = borderValue;

								valueRowElement.appendChild(tableContentRow);
							});

							tableHolderElement.appendChild(valueRowElement);

						}
					}

					contentHolderElement.appendChild(tableHolderElement);

				});

			} else if (previousValue.type === "date" && previousValue.date !== undefined) {

				previousValue.overwrite = this._formateDate(
					this._checkRegexAndTranslate(`{{${textContentKey}}}`, null, "id"),
					previousValue.date.toLowerCase()
				);

			} else if (previousValue.type === "link" && previousValue.link !== undefined) {

				previousValue.overwrite = this._formateLink(keyWordContent, previousValue.link);

			} else if (previousValue.type === "image") {

				this.taskScheduler.push(() => {

					let contentHolderElement = this.parentWidget.getHolderElement().querySelector('[regionID="' + regionID + '"] > .textHolder > .textContainer > .textDisplay');

					if (contentHolderElement == null) {
						return;
					}

					contentHolderElement.innerHTML = "";

					if (!previousValue.show) {
						return;
					}

					let imageElement = document.createElement("img");

					if (previousValue.src != undefined) {
						imageElement.src = previousValue.src;
					} else if (previousValue.src_by_name != undefined && previousValue.src_by_node != undefined && previousValue.src_by_result) {

						imageElement.src = this._getValueFromListByKey(
							textContentKey,
							previousValue.src_by_name,
							previousValue.src_by_node,
							previousValue.src_by_result,
							(!(previousValue.src_by_case != undefined && previousValue.src_by_case == 0))
						);

					} else {
						imageElement.src = keyWordContent;
					}

					let altValue = previousValue.desc != undefined ? previousValue.desc : "";
					imageElement.alt = altValue;
					imageElement.title = altValue;

					imageElement.style.width = previousValue.width != undefined ? previousValue.width : "auto";
					imageElement.style.height = previousValue.height != undefined ? previousValue.height : "auto";

					contentHolderElement.appendChild(imageElement);

				});

			} else if (previousValue.type === "toggle") {

				this.taskScheduler.push(() => {
					let contentHolderElement = this.parentWidget.getHolderElement().querySelector('[regionID="' + regionID + '"] > .textHolder > .textContainer > .textDisplay');

					if (contentHolderElement == null) {
						return;
					}

					contentHolderElement.innerHTML = "";

					if (!previousValue.show) {
						return;
					}

					let svgContainer = document.createElement('div');
					const hidden = (previousValue.default && previousValue.default == "hidden");

					svgContainer.classList.add(`rotate-z-${hidden ? '90' : '0'}`);
					svgContainer.innerHTML = '<svg class="no-event" fill="currentColor" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"	 width="100%" height="100%" viewBox="0 0 284.929 284.929" style="enable-background:new 0 0 284.929 284.929;"	 xml:space="preserve"><g>	<path d="M282.082,76.511l-14.274-14.273c-1.902-1.906-4.093-2.856-6.57-2.856c-2.471,0-4.661,0.95-6.563,2.856L142.466,174.441		L30.262,62.241c-1.903-1.906-4.093-2.856-6.567-2.856c-2.475,0-4.665,0.95-6.567,2.856L2.856,76.515C0.95,78.417,0,80.607,0,83.082		c0,2.473,0.953,4.663,2.856,6.565l133.043,133.046c1.902,1.903,4.093,2.854,6.567,2.854s4.661-0.951,6.562-2.854L282.082,89.647		c1.902-1.903,2.847-4.093,2.847-6.565C284.929,80.607,283.984,78.417,282.082,76.511z"/></g></svg>';

					contentHolderElement.appendChild(svgContainer);

					if (this.ignoreDynamicValues || !Boolean(previousValue.toggle)) {
						return;
					}

					let self = this;

					svgContainer.setAttribute('toggle', previousValue.toggle);

					svgContainer.classList.add("pointer");
					svgContainer.addEventListener('click', (event) => {
						let sourceElement = event.srcElement;
						const isVisible = sourceElement.classList.contains('rotate-z-90');

						sourceElement.getAttribute('toggle').split(',').forEach((id) => {
							if (Number(id) != NaN) {
								self._setRegionVisibilityByID(id, isVisible);
							}
						});

						sourceElement.classList.toggle('rotate-z-0');
						sourceElement.classList.toggle('rotate-z-90');
					});

					if (hidden) {
						previousValue.toggle.split(',').forEach((id) => {
							if (Number(id) != NaN) {
								self.toggleApplyHideSet.add(id);
							}
						});
					}

					if (previousValue.blink) {
						const color = previousValue.blink.replace('-', '').replace('_', '#');
						const parentHolder = contentHolderElement.parentNode.parentNode.parentNode;

						if (parentHolder) {
							parentHolder.style.setProperty('--blink-color', color);
							parentHolder.classList.add('blink');
						}
					}

				});

			}

		},

		/**
		 * Set the visibility from a Region
		 * 
		 * @param {String} region Id of the region
		 * @param {Boolean} isVisible Should the Region be visible or not
		 */
		_setRegionVisibilityByID: function (region, isVisible) {
			this.parentWidget.getHolderElement().querySelectorAll(`[regionID='${region}']`).forEach((entry) => {
				entry.style.display = isVisible ? 'table-cell' : 'none';
			});
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
		_getValueFromListByKey: function (textContentKey, valueToCheck, contentKey, resultKey, caseSensitive = true) {

			if (valueToCheck.length == 0) { return ""; }

			if (!caseSensitive) {
				valueToCheck = valueToCheck.toLowerCase();
			}

			const valueCounter = Number(this._checkRegexAndTranslate(`{{${textContentKey}}}`));

			if (!isNaN(valueCounter)) {

				const endsWith = valueToCheck[0] === "*";
				const startsWith = valueToCheck[valueToCheck.length - 1] === "*";

				if (endsWith) {
					valueToCheck = valueToCheck.substring(1, valueToCheck.length);
				}

				if (startsWith) {
					valueToCheck = valueToCheck.substring(0, valueToCheck.length - 1);
				}

				for (let i = 0; i < valueCounter; i++) {

					const checkingCurrentValue =
						caseSensitive ?
							this._checkRegexAndTranslate(`{{${textContentKey}:${i}:${contentKey}}}`) :
							this._checkRegexAndTranslate(`{{${textContentKey}:${i}:${contentKey}}}`).toLowerCase();

					if (
						(endsWith && startsWith && checkingCurrentValue.includes(valueToCheck)) ||
						(endsWith && checkingCurrentValue.endsWith(valueToCheck)) ||
						(startsWith && checkingCurrentValue.startsWith(valueToCheck)) ||
						(checkingCurrentValue === valueToCheck)
					) {
						return this._checkRegexAndTranslate(`{{${textContentKey}:${i}:${resultKey}}}`);
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
		_formateDate: function (keyWordContent, formatter) {

			//Currently following Characters can't be used            : ; #
			//Characters which can get bypassed by using \{char}      :

			let returnValue = formatter.toLowerCase();
			let dateValue = new Date(keyWordContent);

			// Check if the Value could get translated to a Date
			if (isNaN(dateValue)) {
				// Set Value of the filed to the content of the Keyword 
				// which is used to call this command
				return keyWordContent;
			}

			returnValue = returnValue.replace(/ss/gm, `${dateValue.getSeconds() < 10 ? "0" : ""}${dateValue.getSeconds()}`);
			returnValue = returnValue.replace(/s/gm, dateValue.getSeconds());

			returnValue = returnValue.replace(/mnmn/gm, `${dateValue.getMinutes() < 10 ? "0" : ""}${dateValue.getMinutes()}`);
			returnValue = returnValue.replace(/mn/gm, dateValue.getMinutes());

			returnValue = returnValue.replace(/hh/gm, `${dateValue.getHours() < 10 ? "0" : ""}${dateValue.getHours()}`);
			returnValue = returnValue.replace(/h/gm, dateValue.getHours());

			returnValue = returnValue.replace(/dd/gm, `${dateValue.getDate() < 10 ? "0" : ""}${dateValue.getDate()}`);
			returnValue = returnValue.replace(/d/gm, dateValue.getDate());

			// Temporary replace to not replace chars in the string of the month
			returnValue = returnValue.replace(/mmmm/gm, '%____%');
			returnValue = returnValue.replace(/mmm/gm, '%___%');

			// IMPORTANT: MONTH IN JAVASCRIPT START WITH ZERO AS JANUARY !!!!!!!
			returnValue = returnValue.replace(/mm/gm, `${dateValue.getMonth() < 9 ? "0" : ""}${dateValue.getMonth() + 1}`);
			returnValue = returnValue.replace(/m/gm, dateValue.getMonth() + 1);

			returnValue = returnValue.replace(/yyyy/gm, `${dateValue.getFullYear()}`);
			returnValue = returnValue.replace(/yy/gm, `${String(dateValue.getFullYear()).slice(2)}`);

			// Finally replace the temporary placeholder with the accrual value
			returnValue = returnValue.replace(/%____%/gm, this._months[dateValue.getMonth()]);
			returnValue = returnValue.replace(/%___%/gm, this._months[dateValue.getMonth()].substr(0, 3));

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
		_formateLink: function (keyWordContent, formatter) {
			return `<a href="${keyWordContent}" target="_blank" rel="noopener noreferrer">${formatter}</a>`;
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
		_getValueFromXML: function (xmlDocument, xmlValue, allowEmptyReturn, command) {

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
		_matchLinksToText: function (text, links) {

			// Check if the type of the links is correct
			if (Boolean(links) && (NodeList.prototype.isPrototypeOf(links) || Array.isArray(links)) && links.length > 0) {
				let _returnValue = text;

				// Sort the list of links, based on there position from the highest to the lowest
				let _sortedLinksList = [].slice.call(links).sort((a, b) => {
					return Number(a.querySelector("offset").textContent) > Number(b.querySelector("offset").textContent) ? -1 : 1;
				});

				// Handle every link in the entry
				_sortedLinksList.forEach((elementLinkNode) => {
					let _elementLinkNodeOffset = Number(elementLinkNode.querySelector("offset").textContent);
					let _elementLinkNodeLength = Number(elementLinkNode.querySelector("length").textContent);
					let _elementLinkNodeWebUri = elementLinkNode.querySelector("weburi").textContent;

					// Replace the content of the text with the links
					_returnValue = _returnValue.substring(0, _elementLinkNodeOffset) +
						"<a href='" + _elementLinkNodeWebUri + "' target='_blank' rel='noopener noreferrer'>" +
						_returnValue.substring(_elementLinkNodeOffset, (_elementLinkNodeOffset + _elementLinkNodeLength)) + "</a>" +
						_returnValue.substring(_elementLinkNodeOffset + _elementLinkNodeLength);
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
		_striptTags: function (input, allowed) {

			// Remove whitespace and unnecessary characters 
			allowed = (((allowed || '') + '')
				.toLowerCase()
				.match(/<[a-z][a-z0-9]*>/g) || [])
				.join('');

			// Create the Regex which should be used
			let _tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
				_commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;

			// Replace the content based on the Tags
			return input.replace(_commentsAndPhpTags, '')
				// Check if the tag is in list
				.replace(_tags, (_0, _1) => {
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
		_generateContentTable: function (width, height, border, tablePosition = "center") {

			// Check if there is any value and the value is a number
			if (width == null || height == null || !Number(width) || !Number(height)) {
				return null;
			}

			try {
				let _tableElement = document.createElement("table");
				_tableElement.classList.add("workitemTable");

				// Change the position of the table
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

				for (let h = 0; h < height; h++) {

					let tableRowElement = document.createElement("tr");

					for (let w = 0; w < width; w++) {

						let tableCellElement = document.createElement("td");

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
		_drawContainerInTable: function (startPosition, endPosition, _regionID = null, _backgroundColor = null, _borderless = false) {

			if (
				startPosition == null || endPosition == null ||
				startPosition.x == undefined || startPosition.y == undefined || isNaN(startPosition.x) || isNaN(startPosition.y) ||
				endPosition.x == undefined || endPosition.y == undefined || isNaN(endPosition.x) || isNaN(endPosition.y)
			) {
				throw SyntaxError;
			}

			// Rearrange the positions in order to draw the container correctly
			let _rearrangedPositions = this._rearrangePositions(startPosition, endPosition);

			// Go through each possible position for the region
			for (let x = _rearrangedPositions[0].x; x <= _rearrangedPositions[1].x; x++) {

				// Ignore negative X - Axis
				if (x < 0) {
					continue;
				}

				for (let y = _rearrangedPositions[0].y; y <= _rearrangedPositions[1].y; y++) {

					// Ignore negative Y - Axis
					if (y < 0) {
						continue;
					}

					let _generatedID = this._calculateIDByPosition(x, y);

					// Get the Element with an give ID
					let _elementByPosition = this.parentWidget.getHolderElement().querySelector('[tableID="' + _generatedID + '"]');

					// Check if the element, which gets changed, even exists
					if (_elementByPosition == null) {
						// If the ID can't be found, ignore everything and go the the next one
						continue;
					}

					_elementByPosition.style.backgroundColor = _backgroundColor == null ? "" : _backgroundColor;

					// Check if the Border should be overwritten and add a border to the edge if the position is correct
					if (!_borderless) {

						_elementByPosition.style.border = "none";

						let _borderDefaultSettings = "1px solid black";

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

					}

					// Setting the RegionID for use in the future, but will not
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
		_setContentOfContainer: function (startPosition, endPosition, _regionID = null, _textContent = "", _textFont = 10, _textBinding = "left", _textVertical = "top", _textColor = "#ffffff", _toolTipContent = "") {

			let _rearrangedPositions = this._rearrangePositions(startPosition, endPosition);

			// Remove all negative Vales, in order to draw the Text correct
			// and not to start from a not possible id
			if (_rearrangedPositions[0].x < 0) { _rearrangedPositions[0].x = 0; }
			if (_rearrangedPositions[0].y < 0) { _rearrangedPositions[0].y = 0; }
			if (_rearrangedPositions[1].x < 0) { _rearrangedPositions[1].x = 0; }
			if (_rearrangedPositions[1].y < 0) { _rearrangedPositions[1].y = 0; }

			// Check if the content contains any value
			if (Boolean(_textContent)) {

				// Get the start and end element of the container based on there ID
				let _startElement = this.parentWidget.getHolderElement().querySelector(`[tableID="${this._calculateIDByPosition(_rearrangedPositions[0].x, _rearrangedPositions[0].y)}"]`);
				let _endElement = this.parentWidget.getHolderElement().querySelector(`[tableID="${this._calculateIDByPosition(_rearrangedPositions[1].x, _rearrangedPositions[1].y)}"]`);

				// Check if the both start and end elements exists
				if (_startElement == null || _endElement == null) {
					return;
				}

				// Remove all the Text which else would overlap
				while (_startElement.hasChildNodes()) {
					_startElement.removeChild(_startElement.childNodes[0]);
				}

				// Calculate the boundaries and size of the start and end element
				let _startElementBoundaries = this._calculateBoundariesOfElement(_startElement);
				let _endElementBoundaries = this._calculateBoundariesOfElement(_endElement);

				// Create element to hold the text and keep the size of the
				// cell of the table
				let _textHolderElement = document.createElement("div");
				_textHolderElement.classList.add("textHolder");

				// Create the Element and Text
				let _textContainerElement = document.createElement("div");
				_textContainerElement.classList.add("textContainer");

				//Set the tooltip if any can be found
				if (Boolean(_toolTipContent)) {
					_textContainerElement.setAttribute("title", _toolTipContent);
				}

				let _textDisplayElement = document.createElement("div");
				_textDisplayElement.classList.add("textDisplay");

				_textDisplayElement.innerHTML = this._striptTags(this._checkRegexAndTranslate(_textContent, _regionID), this.GLOBAL_HTML_ALLOWED_TAGS);
				_textDisplayElement.style.verticalAlign = _textVertical;
				_textDisplayElement.style.width = "inherit";

				// Resize the element in order to hold the text inside of the full
				// container instead of using the size of the table cell.
				// -1 Needs to be done in order to ignore the boarder which is 1 px
				_textContainerElement.style.width = `${(((_endElementBoundaries.left - _startElementBoundaries.left) + _endElementBoundaries.width) - 5)}px`;
				_textContainerElement.style.height = `${(((_endElementBoundaries.top - _startElementBoundaries.top) + _endElementBoundaries.height) - 3)}px`;

				// Show the Browser the room for the vertical alignment
				_textContainerElement.style.lineHeight = _textContainerElement.style.height;

				_textContainerElement.style.marginLeft = "2px";
				_textContainerElement.style.marginTop = "2px";

				// Add Style to the element
				_textContainerElement.style.fontSize = `${(_textFont * 10)}%`;
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
		_calculateIDByPosition: function (x, y) {
			return ((y * this.activeConfigurationWidth) + x);
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
		_rearrangePositions: function (startPosition, endPosition) {

			if (this._calculateIDByPosition(startPosition.x, startPosition.y) > this._calculateIDByPosition(endPosition.x, endPosition.y)) {
				let _virtualStartPosition = startPosition;

				startPosition = endPosition;
				endPosition = _virtualStartPosition;
			}

			if (startPosition.x > endPosition.x) {
				let _virtualStartPositionX = startPosition.x;

				startPosition.x = endPosition.x;
				endPosition.x = _virtualStartPositionX;
			}

			if (startPosition.y > endPosition.y) {
				let _virtualStartPositionY = startPosition.y;

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
		_calculateBoundariesOfElement: function (element) {

			// Get the rectangle which surrounds the element
			let _rect = element.getBoundingClientRect(),
				_scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
				_scrollTop = window.pageYOffset || document.documentElement.scrollTop;

			return {
				top: Number(
					// Get the distance from the top of the page to the element
					Number(_rect.top + _scrollTop).toFixed(2)
				),
				left: Number(
					// Get the distance from the left ot the page to the element
					Number(_rect.left + _scrollLeft).toFixed(2)
				),
				width: Number(
					// Get the width of the element
					Number(_rect.width).toFixed(2)
				),
				height: Number(
					// Get the height of the element
					Number(_rect.height).toFixed(2)
				)
			};
		},

		/**
		 * Apply dynamic Heights by changing a deep copy configuration and redrawing the table
		 * 
		 * @param {Boolean} updateTitle Should "updateTitle" function get called
		 * @param {JSON} _configuration 
		 */
		_applyDynamicHeights: function (updateTitle, _configuration) {

			try {

				if (this.ignoreDynamicValues || this.dynamicHeightList.length == 0) {
					this.parentWidget.updateTitle();
					return;
				}

				//Create a deep copy
				let configuration = JSON.parse(JSON.stringify(_configuration));

				let _applyConfiguration = this._loadConfigurationByWorkitem(configuration);

				if (_applyConfiguration == null) {
					this.parentWidget.updateTitle();
					return;
				}

				_applyConfiguration.values.forEach(element => {

					if (this.dynamicHeightList.includes(element.regionID)) {

						const currentSizeHolder = this.parentWidget.getHolderElement().querySelector(`[regionID="${element.regionID}"]`);

						if (currentSizeHolder != null) {

							// Add X amount of pixels, because else everything is cut off very tight
							const currentSize = currentSizeHolder.querySelector(":scope .textDisplay").offsetHeight + 5;
							const currentRows = (element.end.y - element.start.y) + 1;

							const needRowsTotal = Math.ceil(currentSize / this.pixelPerRow);
							const diffNeedCurrent = needRowsTotal - currentRows;

							//Start doing stuff
							element.end.y = (element.start.y + needRowsTotal) - 1;
							element.dynamicHeight = false;

							_applyConfiguration.config.height += diffNeedCurrent;

							_applyConfiguration.values.forEach(childElement => {

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

		},

		/**
		 * Called when everything has finished drawing
		 */
		onFinishedDrawing: function () {
			// Resolve all the toggle Regions which are hidden by default
			this.toggleApplyHideSet.forEach(toggleID => this._setRegionVisibilityByID(toggleID, false));
		},

	});

});
