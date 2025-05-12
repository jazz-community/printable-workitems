define([
	'dojo/on',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'require',
	'./PrintableWorkitemPanelDialog',
	'./PrintableWorkItemDraw',
	'./../DojoSweetAlert',
	'./WorkItemPlanDialog',
	'dojo/text!./../PrintUI.html',
	'dojo/text!./../../../templates/Workitem.css',
	"com.ibm.team.dashboard.web.ui.DashboardConstants",
	'com.ibm.team.workitem.viewlets.web.ui.internal.utils.WorkItemQueryChooser'],
	function (on, declare, lang, require, PrintableWorkitemPanelDialog, PrintableWorkItemDraw, DojoSweetAlert, WorkItemPlanDialog, template, printStyle) {

		var PrintableWorkitemPanelDialog = com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.src.PrintableWorkitemPanelDialog;

		var DojoSweetAlert = com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.DojoSweetAlert;
		var WorkItemPlanDialog = com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.src.WorkItemPlanDialog;

		var DashboardConstants = com.ibm.team.dashboard.web.ui.DashboardConstants;
		var WorkItemQueryChooser = com.ibm.team.workitem.viewlets.web.ui.internal.utils.WorkItemQueryChooser;

		return declare("com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.src.WorkItemPrintProvider", dojo.global.com.ibm.team.dashboard.web.ui.CustomPreferenceProvider, {

			/**
			 * @override super
			 */
			context: null,
			webURL: null,

			_printableWorkItemDraw: null,

			_queryList: [],
			_queryListID: 0,

			_queryWorkItemDataList: [],
			_planWorkItemList: [],

			useDetailedChildren: false,

			_globalConfiguration: null,
			_globalQueryResult: {},
			_globalSingleWorkItemID: null,
			_globalPrintConfig: null,

			_globalPredefinedQuery: "",

			_globalLastQueryDto: null,

			_globalDialogPrimaryTitle: "Setup for Print",

			constructor: function (args) {
				this.context = args.context;
				this.webURL = this.context.webURL;
			},

			/**
			 * 
			 * @param value 
			 * 
			 * @override super
			 */
			getLabel: function (value) {
				return "Ready to Print";
			},

			/**
			 * 
			 * @param onOK 
			 * @param settings 
			 * @param viewlet 
			 * 
			 * @override super
			 */
			createChooser: function (onOK, settings, viewlet) {
				var _this = this;

				if (typeof swal === 'undefined') {
					new DojoSweetAlert().applySwal();
				}

				this._queryList = [];
				this._queryListID = 0;

				this.printUITemplate = function (template) {
					var newTemplate = document.createElement("template");
					var html = template.trim();
					newTemplate.innerHTML = html;

					return newTemplate.content.firstChild;
				};

				this._printableWorkitemPanelDialog = new PrintableWorkitemPanelDialog({
					nestedStyledBox: true,
					padding: 0
				});

				//this._printableWorkitemPanelDialog.showAsDialog(this._globalDialogPrimaryTitle, null, "90%");
				this._printableWorkitemPanelDialog.showAsDialog(this._globalDialogPrimaryTitle, null, "calc(100% - 17px)");
				this._printableWorkitemPanelDialog.insertParamHTML("");

				this.getDOMElement().appendChild(
					this.printUITemplate(template)
				);

				this._globalLastQueryDto = null;

				this._globalPrintConfig = null;

				this._globalConfiguration = JSON.parse(settings.preferences.useConfiguration);

				this._globalPredefinedQuery = settings.preferences.predefineQuery != "" ? JSON.parse(settings.preferences.predefineQuery) : "";

				this._globalSingleWorkItemID = settings.preferences.useWorkitemUUID;

				this.useDetailedChildren = settings.preferences.useDetailedChildren;

				this._printableWorkItemDraw = new PrintableWorkItemDraw(this);

				this._createSinglePrintableConfiguration();

				var self = this;

				on(this.getTemplateDOMElementByID("select\\.pageOptimize"), "change", function (evt) {

					try {
						self._globalPrintConfig = evt.target.value === "" ? null : JSON.parse(evt.target.value);
					} catch (e) {
						self._globalPrintConfig = null;
						console.error("Print config is invalid: ".concat(evt.target.value));
						swal("Invalid Print-Config", "The selected Print-Config isn't valid: \n\"".concat(evt.target.selectedOptions[0].label, "\""), "error");
						// Change back to the Default/Null value, with no Print-Config
						evt.target.value = "";
					}

					if (self._globalLastQueryDto === null && self._planWorkItemList.length == 0) {
						self._createSinglePrintableConfiguration();

					} else if (self._planWorkItemList.length != 0) {
						self._handleFoundItemList(
							self._planWorkItemList
						);
					} else {
						self._applyFoundQuery(self._globalLastQueryDto);
					}

				});

				on(this.getTemplateDOMElementByID("button\\.print"), "click", function (evt) {

					try {

						var regex = /\<script .*\>(.*)\<\/script\>/gm;

						var printWindow = window.open('', '');

						printWindow.document.write(document.getElementsByTagName("head")[0].outerHTML.replace(regex, ""));
						printWindow.document.write(printWindow.document.getElementsByTagName("head")[0].innerHTML += "<style>".concat(printStyle, "</style>"));
						printWindow.document.write("<body></body>");

						printWindow.document.close();

						printWindow.document.getElementsByTagName("body")[0].appendChild(
							self.getTemplateDOMElementByID("holder\\.table").cloneNode(true)
						);

						printWindow.document.getElementsByTagName("body")[0].children[0].style.width = "100%";

						printWindow.document.title = "Printable Workitem Print";
						printWindow.focus();

						var textContainerArray = printWindow.document.getElementsByClassName("textContainer");

						for (var i = 0; i < textContainerArray.length; i++) {
							var element = textContainerArray[i];
							var startSize = element.style.width.replace("px", "");
							element.style.width = "".concat(startSize - 3, "px");
						}

						if (!evt.altKey) {
							setTimeout(function () {
								printWindow.print();
								printWindow.close();
							}, 100);
						}

					} catch (e) {
						console.warn("Error occurred while trying to print. Error: ".concat(e));
						printWindow.close();
						swal(
							"Printing Error",
							"An error has occurred, while trying to print the configuration. Please try something from the list below.\n- Try again later\n- Reload the page\n- Change your browser (It's recommended to use Chrome)",
							"error");
					}

				});

				on(this.getTemplateDOMElementByID("button\\.query"), "click", function () {

					var mainContainer = _this;

					new WorkItemQueryChooser({
						title: "Select the query you'd like to use",
						scope: DashboardConstants.SCOPE_CONTRIBUTOR,
						onOk: function (queryDto) {
							mainContainer._applyFoundQuery(queryDto);
						},
						multiSelect: false,
						suppressCrossRepoQueries: true
					});

				});


				if (this._globalPredefinedQuery != "") {
					on(this.getTemplateDOMElementByID("button\\.query\\.load\\.predefined"), "click", function () {
						if (_this._globalPredefinedQuery != "") {
							_this._applyFoundQuery(_this._globalPredefinedQuery);
						}
					});
				} else {
					this.getTemplateDOMElementByID("button\\.query\\.load\\.predefined").setAttribute("hidden", "");
				}

				on(this.getTemplateDOMElementByID("button\\.plan\\.select"), "click", function () {

					var mainContainer = _this;

					new WorkItemPlanDialog().getListFromPlan().then(
						function (data) {
							mainContainer._updateDialogHeader("".concat(mainContainer._globalDialogPrimaryTitle, ", Plan is selected"));

							mainContainer._handleFoundItemList(
								data
							);
						}, function (error) {
							console.warn(error);
						}
					);

				});

				on(this.getTemplateDOMElementByID("button\\.query\\.select\\.allChecked"), "click", function () {
					_this._queryResultSelectAll(0);
				});

				on(this.getTemplateDOMElementByID("button\\.query\\.select\\.allUnChecked"), "click", function () {
					_this._queryResultSelectAll(1);
				});

				on(this.getTemplateDOMElementByID("button\\.query\\.select\\.allToggle"), "click", function () {
					_this._queryResultSelectAll(2);
				});

				on(this.getTemplateDOMElementByID("button\\.plan\\.select\\.allRanked"), "click", function () {
					// Check if there are any Plans at all
					if (_this._planWorkItemList.length != 0) {
						_this._queryResultSelectAll(3);
					}
				});

				//The last used AdvancedSelectionQuery
				var lastAdvancedSelectionQuery = "";
				on(this.getTemplateDOMElementByID("button\\.query\\.select\\.allAdvanced"), "click", function () {
					swal({
						title: "Enter Query for selection",
						content: {
							element: "input",
							type: "text",
							attributes: {
								placeholder: "Query . . .",
								value: lastAdvancedSelectionQuery
							}
						},
						button: {
							text: 'Apply',
							closeModal: true
						}
					}).then(function (inputQuery) {

						// Check if there is any Input
						if (!inputQuery) {
							return;
						}

						lastAdvancedSelectionQuery = inputQuery;

						var inputList = [];

						inputQuery.
							replace(/\;$/g, '').
							replace(/start/ig, 0).
							replace(/end/ig, Number.MAX_SAFE_INTEGER).
							replace(/ /g, '').
							split(";").
							forEach(function (element) {
								var inputQueryList = element.split("-");

								if (inputQueryList.length != 2 || inputQueryList[1] == "") {
									swal("Wrong format", "Please use the following format: 'start.id' - 'end.id'", "error");
									return;
								}

								var extraValueList = inputQueryList[1].split("&");

								var v1 = Number(inputQueryList[0]);
								var v2 = Number(extraValueList[0]);

								if (isNaN(v1) || isNaN(v2)) {
									swal("Not a number", "One of the values, isn't a number", "error");
									return;
								}

								var extraValueHolder = [];

								if (extraValueList.length > 1) {

									for (var i = 1; i < extraValueList.length; i++) {
										var extraElementValueList = extraValueList[i].split(/([a-z|A-Z|0-9]+)/g);

										if (extraElementValueList.length > 1 && extraElementValueList[1] != "") {
											extraValueHolder.push(
												{
													type: extraElementValueList[0],
													value: extraElementValueList[1]
												}
											);
										}
									}
								}

								inputList.push(
									{
										start: v1 < v2 ? v1 : v2,
										end: v1 >= v2 ? v1 : v2,
										extraValue: extraValueHolder
									}
								);

							});

						self._queryResultSelectAll(4, inputList);

					});
				});

				on(this.getTemplateDOMElementByID("button\\.bottom"), "click", function () {
					_this.getTemplateDOMElementByID("button\\.print").scrollIntoView();
				});

				on(this.getTemplateDOMElementByID("button\\.close"), "click", function () {
					_this._printableWorkitemPanelDialog.closeDialog();
				});

				on(this.getTemplateDOMElementByID("button\\.redraw"), "click", function () {
					if (_this._globalLastQueryDto !== null) {
						_this._applyFoundQuery(_this._globalLastQueryDto);
					} else {
						swal("No Value", "No Query found to be reloaded", "info");
					}
				});

			},

			/**
			 * Update the header of the current dialogbox
			 * 
			 * @param {String} content The text which should be displayed as the header
			 */
			_updateDialogHeader: function (content) {
				if (this._printableWorkitemPanelDialog && this._printableWorkitemPanelDialog._dialog && this._printableWorkitemPanelDialog._dialog._heading) {
					this._printableWorkitemPanelDialog._dialog._heading.innerText = content;
				}
			},

			/**
			 * Create a configuration as table, and places it in the printing queue
			 * 
			 * @param {String} _id The ID of the Workitem where the configuration should get applied
			 * @default null
			 * 
			 * @param {Boolean} _clear Should the content of the holder be cleared
			 * @default true
			 * 
			 * @param {JSON} _customAttribute The custom attribute which should get pushed the renderer
			 * @default null
			 */
			_createSinglePrintableConfiguration: function () {
				var _id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
				var _clear = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
				var _customAttribute = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

				if (_clear) {
					this.getTemplateDOMElementByID("table").innerHTML = "";
				}

				this._printableWorkItemDraw.drawTableFromConfiguration(
					_id == null ? this._globalSingleWorkItemID : _id,
					this._globalConfiguration,
					// Update Title function gets called
					true,
					// Update Dynamic Values, if already loaded
					false,
					// Should detailed children be loaded
					this.useDetailedChildren,
					// Use a predefined size for better printing
					this._globalPrintConfig,
					// Custom Attribute
					_customAttribute
				);
			},

			/**
			 * Apply and get all the Data from a Query and start the 
			 * generation off all the tables
			 * 
			 * @param {JSON} queryDto Query Data which should get used
			 */
			_applyFoundQuery: function (queryDto) {

				this._globalLastQueryDto = queryDto;

				this._updateDialogHeader("".concat(this._globalDialogPrimaryTitle, ", Query: ").concat(queryDto.name));

				window.scrollTo(0, 0);

				swal({
					title: "Loading from Jazz . . .",
					text: "Please wait",
					buttons: false,
					closeOnClickOutside: false,
					closeOnEsc: false
				});

				var data = "startIndex=0&maxResults=50000&filterAttribute=&filterValue=&filterByExactMatch=false&itemId=".concat(queryDto.itemId, "&projectAreaItemId=").concat(queryDto.projectAreaItemId);

				var mainContainer = this;

				var xhr = new XMLHttpRequest();
				xhr.withCredentials = true;

				xhr.addEventListener("readystatechange", function () {
					var _this2 = this;
					if (this.readyState === 4) {

						if (this.status.toString().startsWith("2")) {

							var resultList = JSON.parse(this.responseText)['soapenv:Body'].response.returnValue.value.rows;

							//Clear the Table
							mainContainer.getTemplateDOMElementByID("query\\.select").innerHTML = "";

							if (resultList != undefined) {

								var itemList = [];

								resultList.forEach(function (element) {
									itemList.push({
										id: element.id,
										type: element.labels[0],
										summary: element.labels[2]
									});
								});

								mainContainer._handleFoundItemList(itemList, true);

							} else {

								setTimeout(function () {
									swal.close();
									window.scrollTo(0, 0);

									var holdElement = mainContainer.getTemplateDOMElementByID("query\\.select");
									if (holdElement) {
										holdElement.innerHTML = "No Items found with this Query";
									}

									mainContainer.getTemplateDOMElementByID("holder\\.table").innerHTML = "";

									swal({
										title: "Query Resolve Empty",
										text: "No Items found with this Query",
										icon: "error"
									});
								}, 100);

							}

						} else {
							setTimeout(function () {
								console.error("Status: ".concat(_this2.status, ", Reason: ").concat(_this2.statusText, " \n URL: ").concat(_this2.responseURL));
								swal({
									title: "Query Resolve Error",
									text: "Status: ".concat(_this2.status, ", Message: ").concat(_this2.status == '0' ? 'No Internet Connection' : _this2.statusText),
									icon: "error"
								});
								window.scrollTo(0, 0);
								mainContainer.getTemplateDOMElementByID("query\\.select").innerHTML = "Can't resolve Query";
								mainContainer.getTemplateDOMElementByID("holder\\.table").innerHTML = "";
							}, 100);
						}
					}
				});

				var url = net.jazz.ajax._contextRoot;
				xhr.open("POST", "".concat(url && url.length > 0 ? url : 'https://localhost:7443/jazz', "/service/com.ibm.team.workitem.common.internal.rest.IQueryRestService/getResultSet"), true);
				xhr.setRequestHeader("Accept-Language", "en-US,en;q=0.9");
				xhr.setRequestHeader("X-com-ibm-team-configuration-versions", "LATEST");
				xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
				xhr.setRequestHeader("Pragma", "no-cache");
				xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
				xhr.setRequestHeader("accept", "text/json");
				xhr.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0, private");
				xhr.setRequestHeader("cache-control", "no-cache");

				xhr.send(data);
			},

			/**
			 * Generate the Holder for the WorkItems which where found
			 * 
			 * @param {Array<JSON>} itemList List with all the WorkItems 
			 * 
			 * @param {Boolean} ignoreClear Shouldn't the content be cleared
			 * @default false
			 */
			_handleFoundItemList: function (itemList) {
				var ignoreClear = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

				swal({
					title: "Generating . . .",
					text: "Please wait",
					buttons: false,
					closeOnClickOutside: false,
					closeOnEsc: false
				});

				var holdElement = this.getTemplateDOMElementByID("query\\.select");
				if (!ignoreClear) {
					holdElement.innerHTML = "";
				}

				var tableHolderElement = this.getTemplateDOMElementByID("holder\\.table");
				tableHolderElement.innerHTML = "";

				this._queryList = [];
				this._queryListID = 0;

				this._planWorkItemList = [];
				this._queryWorkItemDataList = [];

				var itemCounter = 0;

				var mainContainer = this;

				itemList.forEach(function (element) {

					var divElement = document.createElement("div");
					divElement.style.display = "flex";

					var labelElement = document.createElement("label");
					labelElement.classList.add("truncate");
					labelElement.classList.add("queryElement");

					var checkBoxElement = document.createElement("input");
					checkBoxElement.type = "checkbox";
					checkBoxElement.setAttribute("checked", true);
					checkBoxElement.setAttribute("workitemID", element.id);
					checkBoxElement.setAttribute("localCount", ++itemCounter);

					labelElement.addEventListener("click", function (evt) {
						mainContainer._querySelectorUpdate();
					});

					labelElement.appendChild(checkBoxElement);

					var labelValue = "".concat(element.localRank ? "Rank: " + (element.rank == null ? "(!) " : "") + element.localRank + " | " : "", " ").concat(element.type, " ").concat(element.id, ": ").concat(element.summary);

					if (element.localRank) {
						mainContainer._planWorkItemList.push(element);
					} else {
						element.generatedID = itemCounter;
						mainContainer._queryWorkItemDataList.push(element);
					}

					labelElement.innerHTML += " " + labelValue;
					labelElement.setAttribute("title", labelValue);

					divElement.appendChild(labelElement);
					holdElement.appendChild(divElement);

					var tableHolderQueryElement = document.createElement("table");
					tableHolderQueryElement.classList.add("workitemTable");
					tableHolderQueryElement.setAttribute("queryID", element.id);
					tableHolderQueryElement.style.display = "inline-table";
					tableHolderQueryElement.style.marginLeft = "10px";
					tableHolderQueryElement.style.marginBottom = "10px";

					tableHolderElement.appendChild(tableHolderQueryElement);

					mainContainer._queryList.push(element.id);

				});

				this._createSinglePrintableConfiguration(
					this._queryList[this._queryListID],
					false,
					this._getAttributesForWorkItem(this._queryList[this._queryListID])
				);

			},

			/**
			 * Get all the custom attributes for the given workitem
			 * 
			 * @param {Number} workitemID The ID of the Workitem
			 * 
			 * @returns {Array<JSON>} All the Keys and values that need to be set
			 */
			_getAttributesForWorkItem: function (workitemID) {

				var returnValue = [];

				if (this._planWorkItemList.length != 0) {

					var planData = this._planWorkItemList.find(function (element) { return element.id == workitemID; });

					if (planData != null) {
						for (var key in planData) {
							if (planData.hasOwnProperty(key)) {
								returnValue.push({
									key: "com.siemens.bt.jazz.printableworkitems.custom.plan.".concat(key),
									value: planData[key]
								});
							}
						}
					}

				} else {

					var queryElement = this._queryWorkItemDataList.find(function (element) { return element.id == workitemID; });

					if (queryElement != null) {
						returnValue.push({
							key: "com.siemens.bt.jazz.printableworkitems.custom.query.position",
							value: queryElement.generatedID
						});
					}

				}

				return returnValue.length == 0 ? null : returnValue;

			},

			/**
			 * Hide all the Tables which aren't selected
			 */
			_querySelectorUpdate: function () {
				var _this3 = this;
				this.getTemplateDOMElementByID("query\\.select").querySelectorAll("[type=checkbox]").forEach(function (element) {

					_this3.getDOMElement().querySelector(":scope .workitemTable[queryid='".concat(element.getAttribute("workitemid"), "']")).style.display =
						element.checked ? "inline-table" : "none";

				});
			},

			/**
			 * Use a mode on all the displayed checkboxes,
			 * which aren't struck through
			 * 
			 * @param {Number} mode How the checkbox should get handled.
			 * 				0 = true
			 * 				1 = false
			 * 				2 = toggle
			 * 				3 = ranked
			 * 				4 = custom-select
			 * 
			 * @param {any} data Additional data for the sort if needed
			 */
			_queryResultSelectAll: function () {
				var mode = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
				var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

				var self = this;

				this.getTemplateDOMElementByID("query\\.select").querySelectorAll(":scope [type=checkbox]").forEach(function (element) {

					if (!element.disabled) {

						var elementID = element.getAttribute("workitemID");
						var localItemID = element.getAttribute("localCount");

						if (elementID && localItemID) {

							switch (mode) {
								// Select All
								case 0:
									element.checked = true;
									break;

								// Deselect All
								case 1:
									element.checked = false;
									break;

								// Toggle All
								case 2:
									element.checked = !element.checked;
									break;

								// Select Ranked
								case 3:
									var planListData = self._planWorkItemList.find(function (x) { return x.id == elementID; });
									element.checked = planListData && planListData.rank;
									break;

								// Custom Selection with input-data
								case 4:

									var foundValue = false;

									element.checked = false;

									for (var i = 0; i < data.length; i++) {
										var dataElement = data[i];
										if (localItemID >= dataElement.start && localItemID <= dataElement.end) {

											if (dataElement.extraValue && dataElement.extraValue.length != 0) {

												var extraValueAllowed = false;

												for (var extraValueIndex = 0; extraValueIndex < dataElement.extraValue.length; extraValueIndex++) {
													var extraValueElement = dataElement.extraValue[extraValueIndex];

													switch (extraValueElement.type) {
														case '%':

															if (!isNaN(extraValueElement.value)) {
																extraValueAllowed = Number(localItemID) % Number(extraValueElement.value) == 0;
															} else {
																extraValueAllowed = false;
															}

															break;

														default:
															extraValueAllowed = false;
															break;
													}

													if (
														!extraValueAllowed && data.length == 1 ||

														extraValueAllowed && data.length > 1) {
														break;
													}

												}

												foundValue = extraValueAllowed;

												if (
													!extraValueAllowed && data.length == 1 ||

													extraValueAllowed && data.length > 1) {
													break;
												}

											} else {
												foundValue = true;
											}

										}
									}

									if (foundValue) {
										element.checked = foundValue;
									}

									break;

								default:
									element.checked = true;
									break;
							}

						} else {
							element.checked = false;
							element.disabled = true;
						}

					}

				});

				this._querySelectorUpdate();

			},

			/**
			 * Get the content of the Dialog
			 * 
			 * @returns {Element} Element surrounding the content of the Dialog 
			 */
			getDOMElement: function () {
				return this._printableWorkitemPanelDialog.domNode.querySelector("td > [data-dojo-attach-point='_mainSectionLeft']");
			},

			/**
			 * Get the Element where the table will get placed
			 * 
			 * @returns {Element} Element where the Table will be placed
			 * 
			 * @requires PrintableWorkitemPanelDialog
			 * @override PrintableWorkitemPanelDialog.getHolderElement
			 */
			getHolderElement: function () {
				if (this._queryList.length === 0) {
					return this.getDOMElement().querySelector(":scope .workitemTable");
				} else {
					return this.getDOMElement().querySelector(":scope .workitemTable[queryid='".concat(this._queryList[this._queryListID], "']"));
				}
			},

			/**
			 * Get the full ID of an Element based on the given value
			 * 
			 * @param {String} value The short ID of the Element which should get returned
			 * 
			 * @returns {String} the full id which points to the element
			 */
			getTemplateElementFullIDByID: function (value) {
				return "#com\\.siemens\\.bt\\.jazz\\.viewlet\\.printableworkitems\\.jazzUtilities\\.modules\\.WorkItemPrintProvider\\.ui\\.".concat(value);
			},

			/**
			 * Get an Element based on the ID
			 * 
			 * @param {String} value The ID of the Element which should get returned
			 * 
			 * @returns {Element} The element with the corresponding ID
			 */
			getTemplateDOMElementByID: function (value) {
				return this.getDOMElement().querySelector(this.getTemplateElementFullIDByID(value));
			},


			/**
			 * Is called if the drawer finds an error
			 * 
			 * @param message Error Message from the drawer
			 * 
			 * @override PrintableWorkItemDraw.showErrorMessage
			 */
			showErrorMessage: function (message) {
				if (this._queryList.length !== 0) {
					console.warn("Found Error for ".concat(this._queryList[this._queryListID], ": ").concat(message));
					var checkBoxElement = this.getTemplateDOMElementByID("query\\.select").querySelector(":scope [type=checkbox][workitemid='".concat(this._queryList[this._queryListID], "']"));
					checkBoxElement.checked = false;
					checkBoxElement.setAttribute("disabled", "true");
					checkBoxElement.parentNode.style.textDecoration = "line-through";
					checkBoxElement.parentNode.setAttribute("title", "Error: ".concat(message));
					this.getDOMElement().querySelector(":scope .workitemTable[queryid='".concat(this._queryList[this._queryListID], "']")).style.display = "none";
				} else {
					console.warn("Found Error: ".concat(message));
				}
			},

			/**
			 * Is called after the Table was drawn.
			 * 
			 * @override PrintableWorkItemDraw._updateTitle
			 */
			_updateTitle: function () {
				if (this._queryList.length !== 0) {
					this._queryListID++;

					if (this._queryList.length > this._queryListID) {

						document.querySelector(".swal-text").innerHTML = "Please Wait [".concat(this._queryListID, " / ").concat(this._queryList.length, "]");

						if (this.getTemplateDOMElementByID("query\\.select").querySelector("[type=checkbox][workitemid='".concat(this._queryList[this._queryListID], "']")).checked) {

							this._createSinglePrintableConfiguration(
								this._queryList[this._queryListID],
								false,
								this._getAttributesForWorkItem(this._queryList[this._queryListID])
							);

						} else {
							this._updateTitle();
						}
					} else {
						swal.close();
						this._queryList = [];
						this._queryListID = 0;
					}
				}
			}

		});

	});
