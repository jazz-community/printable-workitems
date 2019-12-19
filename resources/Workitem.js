define(["dojo/_base/declare",
	"require",
	"./jazzUtilities/modules/build/PrintableWorkItemDraw",
	"./jazzUtilities/modules/build/WorkItemConfiguratorProvider",
	"./jazzUtilities/modules/build/WorkItemPrintProvider",
	"./jazzUtilities/modules/build/PredefineQueryProvider",
	"./jazzUtilities/modules/BabelPolyfill",
	"./jazzUtilities/modules/build/ProcessAttachments",
	"dojo/domReady!",
	"com.ibm.team.apt.web.ui.internal.viewlet.PlanChooserWidget"
], function (declare, require, PrintableWorkItemDraw, WorkItemConfiguratorProvider, WorkItemPrintProvider, PredefineQueryProvider, BabelPolyfill, ProcessAttachments) {

	var BabelPolyfill = com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.BabelPolyfill;
	var PlanChooserWidget = com.ibm.team.apt.web.ui.internal.viewlet.PlanChooserWidget;

	return declare("com.siemens.bt.jazz.viewlet.printableworkitems.Workitem", dojo.global.com.ibm.team.dashboard.web.ui.Viewlet, {
		templatePath: require.toUrl("./templates/Workitem.html", "./templates/Workitem.css"),

		// ID of the Workitem which should get used
		workItemUUID: "",
		// The configuration which should get used
		useConfiguration: "",
		// The predefined Query
		predefineQuery: "",
		// Should a process attachment be used as config
		checkExternalConfiguration: false,
		// Name of the process attachment which should be used
		useExternalConfiguration: "",
		useExternalConfigurationDownload: null,

		// Should Detailed Children be loaded
		useDetailedChildren: false,

		workItemDraw: null,

		_workItemConfiguratorProvider: null,
		_workItemPrintProvider: null,
		_predefineQueryProvider: null,

		/**
		 * Initial the Widget
		 */
		init: function () {

			//For IE and EDGE (ECMAScript 5)
			this.enableIESupport();
			//For IE & EDGE (ES 2015+)
			if (!window._babelPolyfill) {
				new BabelPolyfill().applyPolyfill();
			}

			this.workItemUUID = this.getPreference("useWorkitemUUID"); //corresponds to change work item UUID


			this.checkExternalConfiguration = this.getPreference("checkExternalConfiguration") == "true";
			this.useExternalConfiguration = this.getPreference("useExternalConfiguration");
			this.useConfiguration = this.getPreference("useConfiguration"); //corresponds to change the configuration
			this.predefineQuery = this.getPreference("predefineQuery"); //corresponds to change to predefined Query
			this.useDetailedChildren = this.getPreference("useDetailedChildren"); //corresponds to change if detailed children should be used

			this.workItemDraw = new PrintableWorkItemDraw(this);

			this._workItemConfiguratorProvider = new WorkItemConfiguratorProvider({
				context: this
			});

			this._workItemPrintProvider = new WorkItemPrintProvider({
				context: this
			});

			this._predefineQueryProvider = new PredefineQueryProvider({
				context: this
			});

			this.addSaveButtonToToolbar();

		},

		addSaveButtonToToolbar: function () {

			var element = document.createElement("div");
			element.classList.add("jazz-ui-SimpleToolbar-item");

			var subElement = document.createElement("a");
			subElement.classList.add("jazz-ui-SimpleToolbar-button", "trim-save-button");
			subElement.href = "#";
			subElement.title = "Print";
			subElement.setAttribute("role", "button");
			subElement.setAttribute("aria-label", "Print");
			subElement.style.background = "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAABnUlEQVR42o2S3y+CURjHz1/lP3ERhgsXbF3YjBmWjQ2zMbHlQsamDMn8qgzvEsXURbZy49cylAm9Vkll+zrP6bxJypzts+f7PM/3e96L8zJWcoLHs6gE+88JeOfxkftEtoQzWz38R3MIHM3/fYnXbUEqky+SznziPjiLi8M+cQntq4aVvSWoqTzUNCeVk+SRoBlH2V+uHnY41xB/y8FoPcGI2YOeiR3oB1fR2LUg5g7X2s/wouMcnVMe1NROYnVzG9GXLB6I10KlPiq1ne/JR37KMRLJ9LvAYt9B5Clb8cu3fE57zUs51mF0I64mEU8kYV5ScBX7wCXnKiqhPpoR2ryscF8Kz9zfYTwAax/bRySmIvKoYtrqgcl6iGmLR2iqJsIq4Zp8RPu4AqYf3UXo+hnhmwKhcq4lZXPKsdZhF3zhR04MvpCsopeENEr2XLcNOcFaBrbgPL2Di+MswyW4/9b+b1/L4DZYc/86iCZZmw0Sre/fKOx+zdch3rmh1w7DjB8Gs0TTM4GKmvzinbUfRddtQx1H94uVsmorBr8A2cFbmluSGQAAAAAASUVORK5CYII=')";

			var subImageElement = document.createElement("img");
			subImageElement.src = "../dojo/resources/blank.gif";

			subElement.appendChild(subImageElement);
			element.appendChild(subElement);

			var main = this;

			element.addEventListener("click", function (e) {
				e.preventDefault();

				main._workItemPrintProvider.createChooser(null, {
					preferences: {
						useWorkitemUUID: main.workItemUUID,
						useConfiguration: main.checkExternalConfiguration && main.useExternalConfiguration !== "" ? JSON.stringify(main.useExternalConfigurationDownload) : main.useConfiguration,
						predefineQuery: main.predefineQuery,
						useDetailedChildren: main.useDetailedChildren
					}
				});

			});

			this.getSite().context.toolbar.domNode.children.length === 0 ?
				this.getSite().context.toolbar.domNode.appendChild(element) :
				this.getSite().context.toolbar.domNode.insertBefore(element, this.getSite().context.toolbar.domNode.lastChild);
		},

		/**
		 * Polyfill for everything that IE does not support natively
		 */
		enableIESupport: function () {

			// Allow Foreach for NodeLists
			if (window.NodeList && !NodeList.prototype.forEach) {
				NodeList.prototype.forEach = Array.prototype.forEach;
			}

			// Production steps of ECMA-262, Edition 6, 22.1.2.1
			if (!Array.from) {
				Array.from = (function () {
					var toStr = Object.prototype.toString;
					var isCallable = function (fn) {
						return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
					};
					var toInteger = function (value) {
						var number = Number(value);
						if (isNaN(number)) { return 0; }
						if (number === 0 || !isFinite(number)) { return number; }
						return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
					};
					var maxSafeInteger = Math.pow(2, 53) - 1;
					var toLength = function (value) {
						var len = toInteger(value);
						return Math.min(Math.max(len, 0), maxSafeInteger);
					};

					// The length property of the from method is 1.
					return function from(arrayLike/*, mapFn, thisArg */) {
						// 1. Let C be the this value.
						var C = this;

						// 2. Let items be ToObject(arrayLike).
						var items = Object(arrayLike);

						// 3. ReturnIfAbrupt(items).
						if (arrayLike == null) {
							throw new TypeError('Array.from requires an array-like object - not null or undefined');
						}

						// 4. If mapfn is undefined, then let mapping be false.
						var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
						var T;
						if (typeof mapFn !== 'undefined') {
							// 5. else
							// 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
							if (!isCallable(mapFn)) {
								throw new TypeError('Array.from: when provided, the second argument must be a function');
							}

							// 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
							if (arguments.length > 2) {
								T = arguments[2];
							}
						}

						// 10. Let lenValue be Get(items, "length").
						// 11. Let len be ToLength(lenValue).
						var len = toLength(items.length);

						// 13. If IsConstructor(C) is true, then
						// 13. a. Let A be the result of calling the [[Construct]] internal method 
						// of C with an argument list containing the single item len.
						// 14. a. Else, Let A be ArrayCreate(len).
						var A = isCallable(C) ? Object(new C(len)) : new Array(len);

						// 16. Let k be 0.
						var k = 0;
						// 17. Repeat, while k < len… (also steps a - h)
						var kValue;
						while (k < len) {
							kValue = items[k];
							if (mapFn) {
								A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
							} else {
								A[k] = kValue;
							}
							k += 1;
						}
						// 18. Let putStatus be Put(A, "length", len, true).
						A.length = len;
						// 20. Return A.
						return A;
					};
				}());
			}

			// Allow to user :Scope in the Selection by Query
			try {
				// test for scope support
				document.querySelector(':scope *');
			} catch (error) {
				(function (ElementPrototype) {
					// scope regex
					var scope = /:scope(?![\w-])/gi;
					// polyfill Element#querySelector
					var querySelectorWithScope = polyfill(ElementPrototype.querySelector);

					ElementPrototype.querySelector = function querySelector(selectors) {
						return querySelectorWithScope.apply(this, arguments);
					};

					// polyfill Element#querySelectorAll
					var querySelectorAllWithScope = polyfill(ElementPrototype.querySelectorAll);

					ElementPrototype.querySelectorAll = function querySelectorAll(selectors) {
						return querySelectorAllWithScope.apply(this, arguments);
					};

					// polyfill Element#matches
					if (ElementPrototype.matches) {
						var matchesWithScope = polyfill(ElementPrototype.matches);

						ElementPrototype.matches = function matches(selectors) {
							return matchesWithScope.apply(this, arguments);
						};

					}

					// polyfill Element#closest
					if (ElementPrototype.closest) {
						var closestWithScope = polyfill(ElementPrototype.closest);

						ElementPrototype.closest = function closest(selectors) {
							return closestWithScope.apply(this, arguments);
						};

					}

					function polyfill(qsa) {

						return function (selectors) {
							// whether the selectors contain :scope
							var hasScope = selectors && scope.test(selectors);

							if (hasScope) {
								// fallback attribute
								var attr = 'q' + Math.floor(Math.random() * 9000000) + 1000000;

								// replace :scope with the fallback attribute
								arguments[0] = selectors.replace(scope, '[' + attr + ']');

								// add the fallback attribute
								this.setAttribute(attr, '');

								// results of the qsa
								var elementOrNodeList = qsa.apply(this, arguments);

								// remove the fallback attribute
								this.removeAttribute(attr);

								// return the results of the qsa
								return elementOrNodeList;

							} else {
								// return the results of the qsa
								return qsa.apply(this, arguments);
							}
						};
					}
				})(Element.prototype);
			}

			// Allow to create the "template" tag
			(function () {
				var support = ("content" in document.createElement("template"));

				// Set the content property if missing
				if (!support) {
					var
						/**
						 * Prefer an array to a NodeList
						 * Otherwise, updating the content property of a node
						 * will update the NodeList and we'll loose the nested <template>
						 */
						templates = Array.prototype.slice.call(document.getElementsByTagName("template")),
						template, content, fragment, node, i = 0, j;

					// For each <template> element get its content and wrap it in a document fragment
					while ((template = templates[i++])) {
						content = template.children;
						fragment = document.createDocumentFragment();

						for (j = 0; node = content[j]; j++) {
							fragment.appendChild(node);
						}

						template.content = fragment;
					}
				}

				// Prepare a clone function to allow nested <template> elements
				function clone() {
					var
						templates = this.querySelectorAll("template"),
						fragments = [],
						template,
						i = 0;

					// If the support is OK simply clone and return
					if (support) {
						template = this.cloneNode(true);
						templates = template.content.querySelectorAll("template");

						// Set the clone method for each nested <template> element
						for (; templates[i]; i++) {
							templates[i].clone = clone;
						}

						return template;
					}

					// Loop through nested <template> to retrieve the content property
					for (; templates[i]; i++) {
						fragments.push(templates[i].content);
					}

					// Now, clone the document fragment
					template = this.cloneNode(true);

					// Makes sure the clone have a "content" and "clone" properties
					template.content = this.content;
					template.clone = clone;

					/**
					 * Retrieve the nested <template> once again
					 * Since we just cloned the document fragment,
					 * the content's property of the nested <template> might be undefined
					 * We have to re-set it using the fragment array we previously got
					 */
					templates = template.querySelectorAll("template");

					// Loop to set the content property of each nested template
					for (i = 0; templates[i]; i++) {
						templates[i].content = fragments[i];
						templates[i].clone = clone; // Makes sure to set the clone method as well
					}

					return template;
				}

				var
					templates = document.querySelectorAll("template"),
					template, i = 0;

				// Pollute the DOM with a "clone" method on each <template> element
				while ((template = templates[i++])) {
					template.clone = clone;
				}
			}());

		},

		/**
		 * Get the Preference Provider, for all the Custom Settings
		 * 
		 * @param {Object} preferenceId The ID of the preference
		 */
		getPreferenceProvider: function (preferenceId) {

			switch (preferenceId) {
				case 'useConfiguration':
					return this._workItemConfiguratorProvider;

				case 'predefineQuery':
					return this._predefineQueryProvider;

				default:
					return this._workItemConfiguratorProvider;
			}

		},

		/**
		 * Refresh the Widget by generating the content
		 */
		refresh: function () {

			var mainContent = this;

			while (this._content.firstChild) {
				this._content.removeChild(this._content.firstChild);
			}

			this.getSite().setLoading(true);

			this._content.innerHTML = "";

			if (this.workItemUUID == "") {
				this.showErrorMessage("In order to Start add the UUID of the Workitem you want to use");
				this.getSite().setLoading(false);
				return;
			}

			if (this.checkExternalConfiguration && this.useExternalConfiguration !== "") {

				new ProcessAttachments().getWebContentProcessAttachment(
					mainContent.useExternalConfiguration,
					function (successful, resultJSON, message) {

						if (successful) {
							mainContent.useExternalConfigurationDownload = resultJSON;

							mainContent.workItemDraw.drawTableFromConfiguration(
								mainContent.workItemUUID,
								mainContent.useExternalConfigurationDownload,
								true,
								false,
								mainContent.useDetailedChildren);

						} else {
							mainContent.showErrorMessage(message);
						}

						mainContent.getSite().setLoading(false);

					}
				);

			} else {

				//***********************/
				//Generate the content
				//***********************/

				if (this.useConfiguration == "") {
					this.showErrorMessage("In order to Start add the Configuration you want to use");
					this.getSite().setLoading(false);
					return;
				}


				var _configurationJSON = null;

				try {
					_configurationJSON = JSON.parse(this.useConfiguration);
				} catch (e) {
					_configurationJSON = null;
				}

				// Initialize the process
				if (_configurationJSON != null) {

					this.workItemDraw.drawTableFromConfiguration(this.workItemUUID, _configurationJSON, true, false, this.useDetailedChildren);

				} else {
					this.showErrorMessage("The given Configuration isn't in the correct JSON Format");
				}

			}

		},

		/**
		 * Get the Body from the current Widget
		 * 
		 * @returns {Element} The body of the current widget
		 */
		getHolderElement: function () {
			return this._content;
		},

		/**
		 * Replace the content through a error message
		 * 
		 * @param {String} message Value which should get shown
		 */
		showErrorMessage: function (message) {
			this._updateTitle("Error");
			this._content.innerHTML = "<center>" + message + "</center>";
		},

		/**
		 * Create and return an error message
		 * 
		 * @param {*} message The short version of what happened
		 * @param {*} explanation The explanation for the message
		 * @param {*} useraction The action which the user was performing
		 * 
		 * @returns Generated message
		 */
		_getOperationalErrorText: function (message, explanation, useraction) {
			return message + " " +
				explanation + " " +
				useraction;
		},

		/**
		 * open Settings
		 * 
		 * @param {*} event Event which opened the Settings
		 */
		_handleToggleSettings: function (event) {
			event.preventDefault(); //prevents the link from being loaded
			this.getSite().toggleSettings();
		},

		/**
		 * Gets called automatically when settings are saved
		 * 
		 * @param {*} oldSettings The old Settings
		 * @param {*} newSettings The new Settings
		 */
		settingsChanged: function (oldSettings, newSettings) {
			var _scopeChanged = false;//have to refresh or nay
			var _updatedTitle = false;

			if (newSettings.preferences.useWorkitemUUID !== oldSettings.preferences.useWorkitemUUID) {
				this.workItemUUID = newSettings.preferences.useWorkitemUUID;
				_scopeChanged = true;
			}

			if (newSettings.preferences.useConfiguration !== oldSettings.preferences.useConfiguration) {
				this.useConfiguration = newSettings.preferences.useConfiguration;
				_scopeChanged = true;
			}

			if (newSettings.preferences.useExternalConfiguration !== oldSettings.preferences.useExternalConfiguration) {
				this.useExternalConfiguration = newSettings.preferences.useExternalConfiguration;
				_scopeChanged = true;
			}

			if (newSettings.preferences.checkExternalConfiguration !== oldSettings.preferences.checkExternalConfiguration) {
				this.checkExternalConfiguration = newSettings.preferences.checkExternalConfiguration == "true";
				_scopeChanged = true;
			}

			if (newSettings.preferences.predefineQuery !== oldSettings.preferences.predefineQuery) {
				this.predefineQuery = newSettings.preferences.predefineQuery;
				_scopeChanged = true;
			}

			if (newSettings.preferences.useDetailedChildren !== oldSettings.preferences.useDetailedChildren) {
				this.useDetailedChildren = newSettings.preferences.useDetailedChildren;
				_scopeChanged = true;
			}

			if (_updatedTitle)
				this._updateTitle();
			if (_scopeChanged) {
				this.refresh();
			}
			else {
				this.update();
			}
		},

		/**
		 * Update the Title
		 */
		_updateTitle: function () {
			// name can be unavailable if no read permission on scope item
			//use scope item name except if it is user(default minidash)
			var _forcedTitle = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

			var _translatedSummary = this.workItemDraw._checkRegexAndTranslate("{{summary}}");

			this.getSite().setTitle(
				_forcedTitle == null ?
					(_translatedSummary === "{{summary}}" ?
						"Error: Can't find summary to display" :
						"Workitem: " + _translatedSummary
					) :
					_forcedTitle
			);

		},

	});


});
