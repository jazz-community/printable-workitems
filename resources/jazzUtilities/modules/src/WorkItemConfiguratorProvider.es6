define([
	'dojo/on',
	'dojo/dom-style',
	'dojo/dom-class',
	'dojo/mouse',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'require',
	'./PrintableWorkitemPanelDialog',
	'./PrintableWorkItemDraw',
	'./../DojoSweetAlert',
	"./ProcessAttachments",
	'dojo/text!./../ConfiguratorUI.html',
], function (on, domStyle, domClass, mouse, declare, lang, require, PrintableWorkitemPanelDialog, PrintableWorkItemDraw, DojoSweetAlert, ProcessAttachments, template) {

	var PrintableWorkitemPanelDialog = com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.build.PrintableWorkitemPanelDialog;
	var DojoSweetAlert = com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.DojoSweetAlert;

	return declare("com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.build.WorkItemConfiguratorProvider", dojo.global.com.ibm.team.dashboard.web.ui.CustomPreferenceProvider, {

		/*
		 * Properties
		 */
		context: null,
		webURL: null,

		configuratorUITemplate: null,

		currentConfiguration: null,
		currentConfigurationID: 0,

		externalCurrentConfiguration: null,

		currentSelectedRegion: null,

		useDetailedChildren: false,

		checkExternalConfiguration: false,
		useExternalConfiguration: "",

		useWorkitemUUID: null,
		_printableWorkItemDraw: null,

		_firstClickedID: null,

		_lastFoundRegionID: 100,

		_onOk: null,

		previewMode: false,

		currentEditorStatus: 0,
		currentEditorStatusEnum: Object.freeze(
			{
				"region_create": 0,
				"region_select": 1,
				"region_delete": 2
			}
		),

		/**
		 * Constructor
		 * 
		 * @param {Object} args Arguments for the Provider
		 */
		constructor: function (args) {
			this.context = args.context;
			this.webURL = this.context.webURL;
		},

		/**
		 * 
		 * @param value 
		 * @override Super
		 */
		getLabel: function (value) {

			if (this.context.checkExternalConfiguration && this.context.useExternalConfiguration !== "") {
				return "Config is loaded externally";
			} else {
				return this.context.useConfiguration === null ? 'Config not loaded yet' : `Found ${JSON.parse(this.context.useConfiguration).length} Config(s)`;
			}

		},

		/**
		 * 
		 * @param {Function} onOk onOk(String value, String prefId)
		 * @param {Object} settings . Object preferences
		 *								. <Type-1> <Preference-ID-1>
		 *								. <Type-2> <Preference-ID-2>
		 *								. ...
		 *								. <Type-N> <Preference-ID-N>
		 *							. Number scope
		 *							. String scopeItemId
		 *							. boolean showBackground
		 *							. String title
		 *							. Number trim
		 *							. boolean userTitle
		 * @param {Object} viewlet 
		 * 
		 * @override super
		 */
		createChooser: function (onOk, settings, viewlet) {

			if (typeof swal === 'undefined') {
				new DojoSweetAlert().applySwal();
			}

			if (settings.preferences.useWorkitemUUID === "") {
				window.alert("Please set the ID of the Workitem");
				return;
			}

			//Allow to use save outside
			this._onOk = onOk;

			/************************************************* */
			// Update the Template
			/************************************************* */
			this.configuratorUITemplate = (template) => {
				let newTemplate = document.createElement("template");
				let html = template.trim();
				newTemplate.innerHTML = html;

				return newTemplate.content.firstChild;
			};
			/************************************************* */

			this.checkExternalConfiguration = settings.preferences.checkExternalConfiguration == "true";
			this.useExternalConfiguration = settings.preferences.useExternalConfiguration;


			this.currentConfiguration = JSON.parse(settings.preferences.useConfiguration);
			this.currentConfigurationID = 0;

			this.externalCurrentConfiguration = null;

			this._recalculateRegionIDs();

			this._printableWorkitemPanelDialog = new PrintableWorkitemPanelDialog({
				nestedStyledBox: true,
				padding: 0
			});

			let content = document.createElement("p");
			content.innerText = "Values";

			this._printableWorkitemPanelDialog.showAsDialog('Printable Workitems Configurator', null, "1150px");

			this._printableWorkitemPanelDialog.insertParamHTML("");

			this.useWorkitemUUID = settings.preferences.useWorkitemUUID;

			this.useDetailedChildren = settings.preferences.useDetailedChildren;

			this._printableWorkItemDraw = new PrintableWorkItemDraw(this);

			this.currentSelectedRegion = null;

			this.currentEditorStatus = this.currentEditorStatusEnum.region_create;

			this._generateConfiguratorUI();

			domClass.add(this.getTemplateDOMElementByID("view\\.table"), "hidden");

			this.getTemplateDOMElementByID("data\\.config\\.location").value = this.checkExternalConfiguration ? "attachment" : "workitem";

		},

		/**
		 * Update everything, based on the location where the configuration is getting loaded from
		 */
		configLocationChangedRedraw: function () {

			if (this.checkExternalConfiguration) {

				swal({
					title: "Loading Attachment List . . .",
					text: "Please wait",
					buttons: false,
					closeOnClickOutside: false,
					closeOnEsc: false,
				});

				new ProcessAttachments().getWebLoadAllProcessAttachments(
					(successful, attachmentList, message) => {

						const selectElement = this.getTemplateDOMElementByID("attachment\\.path\\.current");
						selectElement.innerHTML = ""; // Delete all the children

						if (attachmentList.length > 0) {

							attachmentList.forEach(element => {
								let o = document.createElement("option");
								o.setAttribute("value", element);
								o.textContent = element;

								selectElement.appendChild(o);
							});

							// "Backup" the configuration Data
							this.externalCurrentConfiguration = this.currentConfiguration;

							this._setCurrentSelectedAttachment(
								this.useExternalConfiguration == "" ?
									attachmentList[0]
									:
									this.useExternalConfiguration
							);

							swal.close();
						} else {

							if (successful) {
								swal("No Values", "No valid Attachment were found", "warning");
							} else {
								swal("Request Failed", message, "error");
							}

						}

					}
				);

			} else {

				this.currentConfigurationID = 0;
				this.currentEditorStatus = this.currentEditorStatusEnum.region_create;

				if (this.externalCurrentConfiguration != null) {
					this.currentConfiguration = this.externalCurrentConfiguration;
				}

				this._updateSelectedRegion(null);
				this._updateTypes();

			}

			this.getDOMElement().querySelectorAll("[attachmentValue]").forEach(element => {

				let attributeValue = element.getAttribute("attachmentValue");
				const reverseAttribute = attributeValue.startsWith("!");

				if (reverseAttribute) {
					attributeValue = attributeValue.substr(1);
				}

				if ((this.checkExternalConfiguration && !reverseAttribute) || (!this.checkExternalConfiguration && reverseAttribute)) {
					element.setAttribute(attributeValue, "true");
				} else {
					element.removeAttribute(attributeValue);
				}

			});

			this._printableWorkitemPanelDialog._dialog.updatePosition();

		},

		/**
		 * Redraw the Table and all the content in it
		 */
		redrawPanelContent: function () {

			this.getHolderElement().innerHTML = "";

			let fakeConfiguration = Object.assign({}, this._getCurrentConfiguration())

			fakeConfiguration.type = `*;${fakeConfiguration.type}`;

			this._printableWorkItemDraw.drawTableFromConfiguration(
				this.useWorkitemUUID,
				[fakeConfiguration],
				// Update Title function gets called
				true,
				// Don't update Dynamic Values, if already loaded
				true,
				// Should detailed children be loaded
				this.useDetailedChildren,
				// Should the print be optimized
				null,
				// Are there predefined attributes
				null,
				// Should dynamic values not be shown in the UI
				true
			);

			this.getTemplateDOMElementByID("data\\.height").value = this._getCurrentConfiguration().config.height;
			this.getTemplateDOMElementByID("data\\.width").value = this._getCurrentConfiguration().config.width;

			// Sets the config border, if not defined
			if (this._getCurrentConfiguration().config.border === undefined) { this._getCurrentConfiguration().config.border = true; }
			this.getTemplateDOMElementByID("data\\.border").checked = this._getCurrentConfiguration().config.border;

			// Sets the position of the table to default, if not defined
			if (this._getCurrentConfiguration().config.tablePosition === undefined) { this._getCurrentConfiguration().config.tablePosition = "center"; }
			this.getTemplateDOMElementByID("data\\.table\\.position").value = this._getCurrentConfiguration().config.tablePosition;

			domStyle.set(this.getTemplateDOMElementByID("toggle\\.grid"), "backgroundColor", (this.previewMode ? "lightgreen" : "orangered"));

		},

		/**
		 * Update all the RegionIDs in order to not have gaps
		 * in the order of the regions
		 */
		_recalculateRegionIDs: function () {

			let newRegionID = null;

			for (let i = 0; i < this._getCurrentConfiguration().values.length; i++) {
				const element = this._getCurrentConfiguration().values[i];

				element.regionID = i;
				newRegionID = i;
			}

			this._lastFoundRegionID = newRegionID === null ? 0 : newRegionID + 1;
		},

		/**
		 * Get next RegionID and update the value
		 * 
		 * @returns {Number} Next free RegionID
		 */
		_getNextRegionID: function () {
			return this._lastFoundRegionID++;
		},

		/**
		 * Create a new Region for the current used configuration
		 * 
		 * @param {Array} start The coordinates where the region should start
		 * @param {Array} end The coordinates where the region should end
		 * 
		 * @param {Number} regionid The ID of the region which the Region should have.
		 * If the ID is null, the next best possibility will be used.
		 * @default null
		 * 
		 * @param {String} textContent What the text of the Region should be
		 * @default null
		 * 
		 * @param {String} backColor The color which will get used for the background of the region
		 * @default #ff0000
		 * 
		 * @param {Number} fontSize The size of the font for the region
		 * @default 10
		 * 
		 * @param {String} textBinding Where the text should get aligned to
		 * @default left
		 * 
		 * @param {String} textVertical Where the text is vertical positioned
		 * @default top
		 * 
		 * @param {Boolean} borderless Should the border of the region be removed
		 * @default false
		 * 
		 * @param {String} textColor The color which the text will use
		 * @default #ffffff
		 */
		_addNewRegion: function (start, end, regionid = null, textContent = null, backColor = "#ff0000", fontSize = 10, textBinding = "left", textVertical = "top", borderless = false, textColor = "#ffffff") {

			if (backColor == "#ff0000") {
				backColor = this.getTemplateDOMElementByID("default\\.background\\.color").value;
			}

			if (textColor == "#ffffff") {
				textColor = this.getTemplateDOMElementByID("default\\.font\\.color").value;
			}

			if (regionid === null) {
				regionid = this._getNextRegionID();
			}

			let rearrangedPositions = this._printableWorkItemDraw._rearrangePositions(start, end);

			this._getCurrentConfiguration().values.push(
				{
					regionID: regionid,
					start: rearrangedPositions[0],
					end: rearrangedPositions[1],
					backColor: backColor,
					textContent: textContent,
					fontSize: fontSize,
					textBinding: textBinding,
					textVertical: textVertical,
					borderless: borderless,
					textColor: textColor
				}
			);

			this._updateSelectedRegion(regionid);

			this._firstClickedID = null;

			this.redrawPanelContent();

		},

		/**
		 * Remove a given region from the current used Configuration
		 * 
		 * @param {Number} regionID The id of the region which should get removed
		 */
		_removeRegion: function (regionID) {

			for (let i = 0; i < this._getCurrentConfiguration().values.length; i++) {
				const element = this._getCurrentConfiguration().values[i];

				if (Number(element.regionID) === Number(regionID)) {

					this._getCurrentConfiguration().values.splice(i, 1);
					this._updateSelectedRegion(null);
					this.redrawPanelContent();
					break;
				}
			}
		},

		/**
		 * Create a new Type in the current configuration
		 * 
		 * @param {String} typeName The name of the new type
		 * @param {JSON} typeConfiguration The configuration with should get adapted to the new type
		 * @default null
		 */
		_addNewType: function (typeName, typeConfiguration = null) {

			for (let i = 0; i < this.currentConfiguration.length; i++) {
				const element = this.currentConfiguration[i];

				if (element.type === typeName) {
					swal("Error", "Type already exists", "error");
					return;
				}
			}

			this.currentConfiguration.push(
				{
					type: typeName,
					config: typeConfiguration === null ? {
						width: 24,
						height: 15,
					} : typeConfiguration.config,
					values: typeConfiguration === null ? [] : typeConfiguration.values
				}
			);

			this._updateTypes(typeName);
			this._switchType(typeName);

			swal("Created", "New Type was created", "success");

			return;

		},

		/**
		 * Try to delete a Type based on the name of the type
		 * 
		 * @param {String} typeName The name of the type which should get deleted
		 */
		_deleteType: function (typeName) {

			if (this.currentConfiguration.length > 1) {

				swal({
					title: "Are you sure?",
					text: "Once deleted, you will not be able to undo this action",
					icon: "warning",
					buttons: true,
					dangerMode: true,
				}).then((willDelete) => {
					if (willDelete) {

						for (let i = 0; i < this.currentConfiguration.length; i++) {
							const element = this.currentConfiguration[i];

							if (element.type === typeName) {

								this.currentConfiguration.splice(i, 1);
								this.currentConfigurationID = 0;
								this._recalculateRegionIDs();

								this._updateSelectedRegion(null);
								this._updateTypes();
								this.redrawPanelContent();

								swal("Removed", "The Type was deleted successfully", "success");

								return;
							}
						}
					} else {
						swal("The action was cancelled");
					}
				});

			} else {
				swal("Error", "This action can't be done to the last Type", "error");
			}

		},

		/**
		 * Switch the type which is currently selected based on the name of the new Type
		 * 
		 * @param {String} typeName Name of the Type which should get switched to
		 */
		_switchType: function (typeName) {

			for (let i = 0; i < this.currentConfiguration.length; i++) {
				const element = this.currentConfiguration[i];

				if (element.type === typeName) {
					this.currentConfigurationID = i;
					this._recalculateRegionIDs();

					this._updateSelectedRegion(null);
					this.getTemplateDOMElementByID("type\\.current").value = typeName;
					this.redrawPanelContent();

					return;
				}
			}

		},

		/**
		 * Try to rename the current selected Type
		 * 
		 * @param {String} newName The new name of the current type
		 */
		_renameType: function (newName) {

			for (let i = 0; i < this.currentConfiguration.length; i++) {
				const element = this.currentConfiguration[i];

				if (element.type === newName) {
					swal("Error", "Type already exists", "error");
					return;
				}
			}

			this._getCurrentConfiguration().type = newName;

			this._updateSelectedRegion(null);
			this._updateTypes(newName);
			this.redrawPanelContent();

			swal("Renamed", "Type was renamed", "success");

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
		 */
		getHolderElement: function () {
			return this.getDOMElement().querySelector(":scope .configuratorUI.preview");
		},

		/**
		 * Get the full ID of an Element based on the given value
		 * 
		 * @param {String} value The short ID of the Element which should get returned
		 * 
		 * @returns {String} the full id which points to the element
		 */
		getTemplateElementFullIDByID: function (value) {
			return `#com\\.siemens\\.bt\\.jazz\\.viewlet\\.printableworkitems\\.jazzUtilities\\.modules\\.WorkItemConfiguratorProvider\\.ui\\.${value}`;
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
		 * Get an List of Elements based on the ID
		 * 
		 * @param {String} value The ID of the Elements which should get returned
		 * 
		 * @returns {Element[]} List with elements with the corresponding ID
		 */
		getAllTemplateDOMElementsByID: function (value) {
			return this.getDOMElement().querySelectorAll(this.getTemplateElementFullIDByID(value));
		},

		/**
		 * Check if the current status of the Editor is the same as the given value
		 * 
		 * @param {Enumerator<Number>} verify The status which should get checked against 
		 * 
		 * @returns Status of the Editor is the same as the given value
		 */
		verifyCurrentEditorStatus: function (verify) {
			return this.currentEditorStatus === verify;
		},

		/**
		 * Is called after the Table was drawn.
		 * 
		 * @override PrintableWorkItemDraw._updateTitle
		 */
		_updateTitle: function () {
			this._printableWorkitemPanelDialog._dialog.updatePosition();

			this._updateTypes();

			this._bindEventsToTable();

			if (this.currentSelectedRegion === null && this._getCurrentConfiguration().values[0] !== undefined) {
				this._updateSelectedRegion(this._getCurrentConfiguration().values[0].regionID);
			}

			this._markBorderOfRegion(this.currentSelectedRegion);
		},

		/**
		 * Show message inside the Dialog and remove all the content of the dialog
		 * 
		 * @param {String} message Text which should get shown
		 */
		showErrorMessage: function (message) {
			this.getHolderElement().innerHTML = `<center><p><h1>${message}</h1></p></center>`;
		},

		/**
		 * Get the configuration which is currently getting used
		 * 
		 * @returns {JSON} Configuration which gets currently used
		 */
		_getCurrentConfiguration: function () {
			return this.currentConfiguration[this.currentConfigurationID];
		},

		/**
		 * Get a region based on the id which the region has
		 * 
		 * @param regionID The ID of the region which should get returned
		 * 
		 * @returns {Number} The Region with the corresponding id
		 */
		_getRegionConfiguration: function (regionID) {

			if (regionID === null) {
				return null;
			}

			for (let i = 0; i < this._getCurrentConfiguration().values.length; i++) {
				const element = this._getCurrentConfiguration().values[i];

				if (element.regionID == regionID) {
					return element;
				}
			}

			return null;

		},

		/**
		 * Calculate the id based on the coordinations
		 * 
		 * @param {Number} x The x coordinate 
		 * @param {Number} y The y coordinate
		 * 
		 * @returns {Number} The ID which is at a given position
		 */
		calculateIDByPosition: function (x, y) {
			return ((y * this._getCurrentConfiguration().config.width) + x);
		},

		/**
		 * Calculate the Position of an Table-Element based on the id
		 * 
		 * @param {Number} tableID ID of the Table-Element for calculation 
		 * 
		 * @returns {Array} The coordinations of the Table-Element
		 */
		calculatePositionByID: function (tableID) {

			if (tableID === null) {

				return { x: "-", y: "-" };

			} else {

				let width = this._getCurrentConfiguration().config.width;

				let calcValue = tableID / width;

				let y = Math.floor(calcValue);

				let x = Math.round((calcValue - y) * width);

				return { x: x, y: y };

			}
		},

		/**
		 * Generate the UI for the configurator
		 */
		_generateConfiguratorUI: function () {

			this.getDOMElement().appendChild(
				this.configuratorUITemplate(template)
			);

			this._bindEventsToUIElements();

			//this.redrawPanelContent();
			this.configLocationChangedRedraw();

		},

		/**
		 * Bind all the needed Events to the Table
		 */
		_bindEventsToTable: function () {

			let tableCreated = this.getHolderElement().querySelector(":scope > .workitemTable");

			let self = this;

			this.getHolderElement().querySelectorAll(":scope > .workitemTable > tr > td").forEach(element => {

				on(element, mouse.enter, (evt) => {
					//domStyle.set(element, "backgroundColor", "yellow");
					domClass.add(element, "backgroundYellow");
					self._updateCurrentPositionInTable(element.getAttribute("tableid"));
				});

				on(element, mouse.leave, (evt) => {
					//domStyle.set(element, "backgroundColor", "");
					domClass.remove(element, "backgroundYellow");
				});

				on(element, "click", (evt) => {

					if (self.verifyCurrentEditorStatus(self.currentEditorStatusEnum.region_create)) {
						if (self._firstClickedID === null) {

							self._firstClickedID = element.getAttribute("tableid");

							domClass.add(element, "firstSelectedID");
						} else {

							self._addNewRegion(
								self.calculatePositionByID(self._firstClickedID),
								self.calculatePositionByID(element.getAttribute('tableid'))
							);

						}
					} else if (self.verifyCurrentEditorStatus(self.currentEditorStatusEnum.region_select)) {

						if (element.hasAttribute("regionid")) {
							self._updateSelectedRegion(element.getAttribute('regionid'));

						}

					} else if (self.verifyCurrentEditorStatus(self.currentEditorStatusEnum.region_delete)) {
						if (element.hasAttribute("regionid")) {
							self._removeRegion(element.getAttribute("regionid"));
						}
					}


				});

			});

			on(tableCreated, mouse.leave, (evt) => {
				self._firstClickedID = null;

				let lastFirstClickedElement = self.getHolderElement().querySelector(":scope td.firstSelectedID");

				if (lastFirstClickedElement !== null) {
					domClass.remove(lastFirstClickedElement, "firstSelectedID");
				}

				self._updateCurrentPositionInTable(null);

			});
		},

		/**
		 * Bind all the Elements to the UI
		 */
		_bindEventsToUIElements: function () {

			let self = this;

			on(this.getTemplateDOMElementByID("button\\.cancel"), "click", (evt) => {
				self._printableWorkitemPanelDialog.closeDialog();
			});

			on(this.getTemplateDOMElementByID("button\\.save"), "click", (evt) => {

				if (!self.checkExternalConfiguration) {
					self._onOk(JSON.stringify(self.currentConfiguration), "useConfiguration");
				} else {
					self._onOk(self.useExternalConfiguration, "useExternalConfiguration");
				}

				self._onOk(self.checkExternalConfiguration.toString(), "checkExternalConfiguration");

				self._printableWorkitemPanelDialog.closeDialog();
			});

			on(this.getTemplateDOMElementByID("button\\.fullscreen"), "click", (evt) => {

				const dialog = self.getDOMElement().closest("[role='dialog']");

				if (self._getFullScreenStatus()) {

					self._closeFullScreen()

				} else {

					self._openFullScreen(dialog);

					const dialogBackground = dialog.querySelector(":scope > .background");
					dialogBackground.style.height = "100%";
					dialogBackground.style.maxHeight = "100%";
					dialogBackground.style.overflow = "auto";

					self.redrawPanelContent();

				}
			});

			// When the full-screen value has changed
			/**
			 * fullscreenchange 		= Official/Standard Event
			 * mozfullscreenchange		= Firefox
			 * webkitfullscreenchange	= Chrome, Safari and Opera
			 * msfullscreenchange		= IE and EDGE
			 */
			on(document, "fullscreenchange, mozfullscreenchange, webkitfullscreenchange, msfullscreenchange", (evt) => {

				// Dialog
				const d = self.getDOMElement().closest('[role="dialog"]');
				// SWAL
				const s = document.querySelector(".swal-overlay");

				if (d == null || s == null) { return; }

				if (self._getFullScreenStatus()) {
					d.appendChild(s);
				} else {
					document.body.appendChild(s);
				}

			});

			on(this.getTemplateDOMElementByID("button\\.download"), "click", (evt) => {

				if (self.currentConfiguration.length == 0) {
					swal("No Values", "There aren't any values which could be downloaded", "error");
					return;
				}

				swal({
					title: "Enter the Filename",
					content: {
						element: "input",
						type: "text",
						attributes: {
							placeholder: "Filename . . .",
						},
					},
					button: {
						text: 'Download',
						closeModal: false,
					}
				}).then((fileName) => {

					if (Boolean(fileName)) {

						fileName += ".json";

						if (navigator.msSaveBlob) {
							//IE and EDGE
							let options = {
								type: 'application/json;charset=utf-8',
								bom: decodeURIComponent('%ef%bb%bf'),
							}

							let blob = new Blob([options.bom + JSON.stringify(self.currentConfiguration)], {
								type: options.type,
							})

							navigator.msSaveBlob(blob, fileName);

						} else {

							let element = document.createElement("a");
							element.setAttribute('href', `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(self.currentConfiguration))}`);
							element.setAttribute('download', fileName);

							element.style.display = "none";
							document.body.appendChild(element);

							element.click();

							document.body.removeChild(element);

						}

						swal.close();

					} else {
						swal("Download was cancelled");
						return;
					}

				});


			});

			on(this.getTemplateDOMElementByID("create\\.type"), "click", (evt) => {

				swal("Enter new Type:", {
					content: {
						element: "input",
						attributes: {
							placeholder: "New Type . . .",
							type: "text",
						}
					}
				}).then((newTypeName) => {

					if (newTypeName !== null) {

						self._addNewType(newTypeName);

					}

				});

			});

			on(this.getTemplateDOMElementByID("delete\\.type"), "click", (evt) => {

				self._deleteType(this._getCurrentConfiguration().type);

			});

			on(this.getTemplateDOMElementByID("rename\\.type"), "click", (evt) => {

				swal("Enter new Name of Type:", {
					content: {
						element: "input",
						attributes: {
							placeholder: "New Type Name . . .",
							type: "text",
						}
					}
				}).then((newTypeName) => {

					if (newTypeName !== null) {
						self._renameType(newTypeName);
					}

				});

			});

			on(this.getTemplateDOMElementByID("data\\.config\\.location"), "change", (evt) => {
				self.checkExternalConfiguration = evt.target.value === "attachment";
				self.configLocationChangedRedraw();

			});

			on(this.getTemplateDOMElementByID("attachment\\.path\\.current"), "change", (evt) => {
				self.useExternalConfiguration = evt.target.value;
				self._setCurrentSelectedAttachment(evt.target.value);
			});

			on(this.getTemplateDOMElementByID("type\\.current"), "change", (evt) => {
				self._switchType(evt.target.value);
			});

			on(this.getTemplateDOMElementByID("toggle\\.keys"), "click", (evt) => {

				let tableElement = self.getTemplateDOMElementByID("keys\\.table").querySelector(":scope > table")

				tableElement.innerHTML = "";

				if (domClass.contains(tableElement, "hidden")) {

					let tableHeader = document.createElement("tr");
					let tableValue_1 = document.createElement("td");
					let tableValue_2 = document.createElement("td");

					tableValue_1.innerHTML = "<center><b>Key</b></center>";
					tableValue_2.innerHTML = "<center><b>Value</b></center>";

					tableHeader.appendChild(tableValue_1);
					tableHeader.appendChild(tableValue_2);

					tableElement.appendChild(tableHeader);

					self._printableWorkItemDraw.keyValueMap.forEach(element => {

						let tableRowHeader = document.createElement("tr");
						let tableRowValue_1 = document.createElement("td");
						let tableRowValue_2 = document.createElement("td");

						tableRowValue_1.innerHTML = self._printableWorkItemDraw._striptTags(element[0], self._printableWorkItemDraw.GLOBAL_HTML_ALLOWED_TAGS);
						tableRowValue_2.innerHTML = self._printableWorkItemDraw._striptTags(self._printableWorkItemDraw._checkRegexAndTranslate(`{{${element[0]}}}`), self._printableWorkItemDraw.GLOBAL_HTML_ALLOWED_TAGS);

						tableRowHeader.appendChild(tableRowValue_1);
						tableRowHeader.appendChild(tableRowValue_2);

						tableElement.appendChild(tableRowHeader);

					});

				}


				domClass.toggle(tableElement, "hidden");

				self._printableWorkitemPanelDialog._dialog.updatePosition();


			});

			on(this.getTemplateDOMElementByID("toggle\\.grid"), "click", (evt) => {

				self.previewMode = !self.previewMode;

				try {

					if (document.styleSheets) {
						for (let s = 0; s < document.styleSheets.length; s++) {
							const sheet = document.styleSheets[s];
							if (sheet) {
								let ssRules = sheet.cssRules || sheet.rules;
								if (ssRules) {
									let result = null;
									for (let c = 0; c < ssRules.length; c++) {
										if (ssRules[c].selectorText == ".configuratorUI.preview table td") {
											result = ssRules[c].style;
											break;
										}
									}
									if (result) {
										result.border = self.previewMode ? "none" : "1px solid red";
									}
								}
							}
						}
					}

					self.redrawPanelContent();

				} catch (ex) {

					swal("Error", "Your Browser doesn't support this feature", "info");

					self.previewMode = false;
				}

			});

			on(this.getTemplateDOMElementByID("redraw\\.type"), "click", (evt) => {
				self.redrawPanelContent();
			});

			on(this.getTemplateDOMElementByID("upload\\.config"), "click", (evt) => {

				swal("Which option do you want ?", {
					buttons: {
						cancel: "Cancel",
						file: true,
						text: true
					},
				}).then((value) => {
					switch (value) {

						case "text":
							self._uploadConfigurationFormText();
							break;

						case "file":
							self._uploadConfigurationFromFile();
							break;

						default:
							swal("Action was cancelled");
							break;

					}
				});

			});

			on(this.getTemplateDOMElementByID("data\\.width"), "change", (evt) => {

				let newValue = Number(evt.target.value);

				if (newValue === null || !Number.isSafeInteger(newValue) || newValue < 1) {
					evt.target.value = 1;
					newValue = 1;
				};

				this._getCurrentConfiguration().config.width = newValue;

				// Update the width of all the Regions that have dynamic width enabled
				this._getCurrentConfiguration().values.forEach(element => {
					if (element.dynamicHeight) {
						element.end.x = newValue - 1;
					}
				});

				this._updateRegionViewValues(false);
				this._updateDataValues();
				this.redrawPanelContent();

			});

			on(this.getTemplateDOMElementByID("data\\.height"), "change", (evt) => {

				let newValue = Number(evt.target.value);

				if (newValue === null || !Number.isSafeInteger(newValue) || newValue < 1) {
					evt.target.value = 1;
					newValue = 1;
				};

				this._getCurrentConfiguration().config.height = newValue;
				this._updateDataValues();
				this.redrawPanelContent();

			});

			on(this.getTemplateDOMElementByID("data\\.border"), "change", (evt) => {

				this._getCurrentConfiguration().config.border = evt.target.checked;
				this._updateDataValues();
				this.redrawPanelContent();

			});

			on(this.getTemplateDOMElementByID("data\\.table\\.position"), "change", (evt) => {
				this._getCurrentConfiguration().config.tablePosition = evt.target.value;
				this._updateDataValues();
				this.redrawPanelContent();
			});

			on(this.getTemplateDOMElementByID("move\\.region"), "click", (evt) => {

				let min_X = null;
				let min_Y = null;

				self._getCurrentConfiguration().values.forEach(element => {
					if (min_X == null || element.start.x < min_X) {
						min_X = element.start.x;
					}

					if (min_Y == null || element.start.y < min_Y) {
						min_Y = element.start.y;
					}
				});

				if (min_X != 0 || min_Y != 0) {

					for (let i = 0; i < self._getCurrentConfiguration().values.length; i++) {
						self._getCurrentConfiguration().values[i].start.x -= min_X;
						self._getCurrentConfiguration().values[i].end.x -= min_X;

						self._getCurrentConfiguration().values[i].start.y -= min_Y;
						self._getCurrentConfiguration().values[i].end.y -= min_Y;
					}

					this._updateRegionViewValues();
					this.redrawPanelContent();

				}

			});

			on(this.getTemplateDOMElementByID("duplicate\\.type"), "click", (evt) => {

				swal("Enter Name of Duplicate:", {
					content: {
						element: "input",
						attributes: {
							placeholder: "New Duplicate Name . . .",
							type: "text",
						}
					}
				}).then((newName) => {

					if (newName === null) return;

					for (let i = 0; i < self.currentConfiguration.length; i++) {
						const element = self.currentConfiguration[i];

						if (element.type === newName) {

							self._overwriteConfigurationRequest(element);

							return;
						}

					}

					self._addNewType(newName, JSON.parse(JSON.stringify(this._getCurrentConfiguration())));

				});

			});

			/** The Change Events . . . */
			on(this.getTemplateDOMElementByID("view\\.region\\.background\\.color"), "change", (evt) => {
				self._saveNewValuesToConfiguration();
			});
			on(this.getTemplateDOMElementByID("view\\.region\\.text\\.color"), "change", (evt) => {
				self._saveNewValuesToConfiguration();
			});
			on(this.getTemplateDOMElementByID("view\\.region\\.text\\.size"), "change", (evt) => {
				self._saveNewValuesToConfiguration();
			});
			on(this.getTemplateDOMElementByID("view\\.region\\.text\\.position"), "change", (evt) => {
				self._saveNewValuesToConfiguration();
			});
			on(this.getTemplateDOMElementByID("view\\.region\\.text\\.vertical\\.position"), "change", (evt) => {
				self._saveNewValuesToConfiguration();
			});
			on(this.getTemplateDOMElementByID("view\\.region\\.border"), "change", (evt) => {
				self._saveNewValuesToConfiguration();
			});
			on(this.getTemplateDOMElementByID("view\\.region\\.text"), "change", (evt) => {
				self._saveNewValuesToConfiguration();
			});
			on(this.getTemplateDOMElementByID("view\\.region\\.tooltip"), "change", (evt) => {
				self._saveNewValuesToConfiguration();
			});
			on(this.getTemplateDOMElementByID("view\\.region\\.size\\.width"), "change", (evt) => {
				let currentRegion = this._getRegionConfiguration(this.currentSelectedRegion);

				let maxValue = this._getCurrentConfiguration().config.width;
				let regionConfigValue = currentRegion.start.x;

				if (currentRegion.dynamicHeight || Number(evt.target.value) + regionConfigValue > maxValue) {
					evt.target.value = maxValue - regionConfigValue;
				} else {
					self._saveNewValuesToConfiguration();
				}
			});
			on(this.getTemplateDOMElementByID("view\\.region\\.size\\.height"), "change", (evt) => {
				let currentRegion = this._getRegionConfiguration(this.currentSelectedRegion);

				let maxValue = this._getCurrentConfiguration().config.height;
				let regionConfigValue = currentRegion.start.y;

				if (Number(evt.target.value) + regionConfigValue > maxValue) {
					evt.target.value = maxValue - regionConfigValue;
				} else {
					self._saveNewValuesToConfiguration();
				}
			});
			on(this.getTemplateDOMElementByID("view\\.region\\.position\\.x"), "change", (evt) => {
				let currentRegion = this._getRegionConfiguration(this.currentSelectedRegion);

				let maxValue = this._getCurrentConfiguration().config.width;
				let regionConfigValue = (currentRegion.end.x - currentRegion.start.x) + 1;

				if (currentRegion.dynamicHeight || Number(evt.target.value) + regionConfigValue > maxValue) {
					evt.target.value = maxValue - regionConfigValue;
				} else {
					self._saveNewValuesToConfiguration();
				}
			});
			on(this.getTemplateDOMElementByID("view\\.region\\.position\\.y"), "change", (evt) => {
				let currentRegion = this._getRegionConfiguration(this.currentSelectedRegion);

				let maxValue = this._getCurrentConfiguration().config.height;
				let regionConfigValue = (currentRegion.end.y - currentRegion.start.y) + 1;

				if (Number(evt.target.value) + regionConfigValue > maxValue) {
					evt.target.value = maxValue - regionConfigValue;
				} else {
					self._saveNewValuesToConfiguration();
				}
			});
			on(this.getTemplateDOMElementByID("view\\.region\\.dynamic\\.height"), "change", (evt) => {
				let currentRegion = this._getRegionConfiguration(this.currentSelectedRegion);

				if (!currentRegion.dynamicHeight) {
					let maxValue = this._getCurrentConfiguration().config.width;
					let regionConfigValue = (currentRegion.end.x - currentRegion.start.x) + 1;

					if (regionConfigValue !== maxValue) {
						// Undo the changes done to the checkbox
						evt.target.checked = false;
						return;
					}


				}

				self._saveNewValuesToConfiguration();

			});

			/** Editor Mode */
			this.getDOMElement().querySelectorAll(`input[name='${this.getTemplateElementFullIDByID("radio").substr(1)}']`).forEach(element => {
				on(element, "change", (evt) => {

					switch (Number(evt.target.value)) {
						case 0:
							this.currentEditorStatus = this.currentEditorStatusEnum.region_create;
							break;

						case 1:
							this.currentEditorStatus = this.currentEditorStatusEnum.region_select;
							break;

						case 2:
							this.currentEditorStatus = this.currentEditorStatusEnum.region_delete;
							break;

						default:
							this.currentEditorStatus = this.currentEditorStatusEnum.region_create;
							break;
					}

				});
			});

			this._updateDataValues();

		},

		/**
		 * Overwrite a given Configuration
		 * 
		 * @param {JSON} element Configuration which should get overwritten
		 */
		_overwriteConfigurationRequest: function (element) {

			swal({
				title: "Overwrite Type Configuration?",
				text: "This Type Configuration already exists. Do you want to overwrite it?",
				icon: "warning",
				buttons: ['No', 'Yes'],
				dangerMode: true,
			}).then((willDelete) => {

				if (willDelete) {

					let copyConfiguration = JSON.parse(JSON.stringify(this._getCurrentConfiguration()));

					element.config = copyConfiguration.config;
					element.values = copyConfiguration.values;

					this._switchType(element.type);

					swal("Overwritten", "Configuration has been overwritten", "success");

				} else {
					swal("Action was cancelled");
				}
			});

		},

		/**
		 * Update the content of the the Data Values from the UI
		 */
		_updateDataValues: function () {
			this.getTemplateDOMElementByID(
				"data\\.fields"
			).innerHTML = this._getCurrentConfiguration().config.height * this._getCurrentConfiguration().config.width;

			this.getTemplateDOMElementByID(
				"data\\.region\\.fields"
			).innerHTML =
				this.currentSelectedRegion === null ?
					"-" :
					this.getHolderElement().querySelectorAll(`:scope > .workitemTable > tr > td[regionid="${this.currentSelectedRegion}"]`).length;

			this.getTemplateDOMElementByID(
				"data\\.regions"
			).innerHTML = this._getCurrentConfiguration().values.length;
		},

		/**
		 * Update the List in the Dropdown with all the possible  Types
		 * 
		 * @param {String} forcedLastValue Name of the Type which was last selected.
		 * Is needed in order to snap back to that Type. Else the First type in the list will bbe selected.
		 * @default null
		 */
		_updateTypes: function (forcedLastValue = null) {

			let dropDownElement = this.getTemplateDOMElementByID("type\\.current");

			let lastFoundValue = forcedLastValue !== null ? forcedLastValue : dropDownElement.value;
			let resetValue = false;

			dropDownElement.innerHTML = "";

			this.currentConfiguration.forEach(element => {
				let newOption = document.createElement("option");
				newOption.value = element.type;
				newOption.innerHTML = element.type;
				dropDownElement.appendChild(newOption);

				if (!resetValue) {
					resetValue = element.type === lastFoundValue;
				}

			});

			if (resetValue) {
				dropDownElement.value = lastFoundValue;
			}

		},

		/**
		 * Change the Region which is currently displayed
		 * 
		 * @param {Number} regionID The ID of the Region which should get displayed
		 */
		_updateSelectedRegion: function (regionID) {
			this.currentSelectedRegion = regionID;

			this._updateDataValues();

			this._updateRegionViewValues();

			this.redrawPanelContent();
		},

		/**
		 * Show the position of an element of a Table-Element in the UI 
		 * 
		 * @param {Number} tableID ID of the the Table-Element which position should be shown
		 */
		_updateCurrentPositionInTable: function (tableID) {
			let position = this.calculatePositionByID(tableID);
			this.getTemplateDOMElementByID("data\\.position").innerHTML = `X: ${position.x}; Y: ${position.y};`;
		},

		/**
		 * Set the Values of the current selected Region to the UI
		 * 
		 * @param {Boolean} focusContent Should the Input-Box should get focused after everything was drawn
		 * @default true
		 */
		_updateRegionViewValues: function (focusContent = true) {

			const tableElement = this.getTemplateDOMElementByID("view\\.table");

			if (this.currentSelectedRegion !== null) {

				const regionConfig = this._getRegionConfiguration(this.currentSelectedRegion);

				if (regionConfig !== null) {

					this.getTemplateDOMElementByID("view\\.region\\.id").innerHTML = this.currentSelectedRegion;

					this.getTemplateDOMElementByID("view\\.region\\.background\\.color").value = regionConfig.backColor;
					this.getTemplateDOMElementByID("view\\.region\\.text\\.color").value = regionConfig.textColor;
					this.getTemplateDOMElementByID("view\\.region\\.text\\.size").value = regionConfig.fontSize;
					this.getTemplateDOMElementByID("view\\.region\\.text\\.position").value = regionConfig.textBinding;
					this.getTemplateDOMElementByID("view\\.region\\.text\\.vertical\\.position").value = regionConfig.textVertical || "top";
					this.getTemplateDOMElementByID("view\\.region\\.border").checked = regionConfig.borderless;
					this.getTemplateDOMElementByID("view\\.region\\.text").value = regionConfig.textContent;
					this.getTemplateDOMElementByID("view\\.region\\.tooltip").value = regionConfig.toolTipContent || "";

					this.getTemplateDOMElementByID("view\\.region\\.size\\.width").value = (regionConfig.end.x - regionConfig.start.x) + 1;
					this.getTemplateDOMElementByID("view\\.region\\.size\\.height").value = (regionConfig.end.y - regionConfig.start.y) + 1;

					this.getTemplateDOMElementByID("view\\.region\\.position\\.x").value = regionConfig.start.x;
					this.getTemplateDOMElementByID("view\\.region\\.position\\.y").value = regionConfig.start.y;

					this.getTemplateDOMElementByID("view\\.region\\.dynamic\\.height").checked = Boolean(regionConfig.dynamicHeight);

					domClass.remove(tableElement, "hidden");

					this.getTemplateDOMElementByID("view\\.region\\.size\\.width").disabled = Boolean(regionConfig.dynamicHeight);
					this.getTemplateDOMElementByID("view\\.region\\.dynamic\\.height").disabled = ((regionConfig.end.x - regionConfig.start.x) + 1) != this._getCurrentConfiguration().config.width;

					if (focusContent) {
						this.getTemplateDOMElementByID("view\\.region\\.text").focus();
					}

				}

			} else {
				domClass.add(tableElement, "hidden");
			}

		},

		/**
		 * Safe all the changes in the UI to the current selected Region
		 */
		_saveNewValuesToConfiguration: function () {

			if (this.currentSelectedRegion !== null) {

				const regionConfig = this._getRegionConfiguration(this.currentSelectedRegion);

				if (regionConfig !== null) {

					regionConfig.backColor = this.getTemplateDOMElementByID("view\\.region\\.background\\.color").value;
					regionConfig.textColor = this.getTemplateDOMElementByID("view\\.region\\.text\\.color").value;
					regionConfig.fontSize = this.getTemplateDOMElementByID("view\\.region\\.text\\.size").value;
					regionConfig.textBinding = this.getTemplateDOMElementByID("view\\.region\\.text\\.position").value;
					regionConfig.textVertical = this.getTemplateDOMElementByID("view\\.region\\.text\\.vertical\\.position").value;
					regionConfig.borderless = this.getTemplateDOMElementByID("view\\.region\\.border").checked;
					regionConfig.textContent = this.getTemplateDOMElementByID("view\\.region\\.text").value;
					regionConfig.toolTipContent = this.getTemplateDOMElementByID("view\\.region\\.tooltip").value;

					regionConfig.start.x = Number(this.getTemplateDOMElementByID("view\\.region\\.position\\.x").value);
					regionConfig.start.y = Number(this.getTemplateDOMElementByID("view\\.region\\.position\\.y").value);

					regionConfig.end.x = regionConfig.start.x + Number(this.getTemplateDOMElementByID("view\\.region\\.size\\.width").value) - 1;
					regionConfig.end.y = regionConfig.start.y + Number(this.getTemplateDOMElementByID("view\\.region\\.size\\.height").value) - 1;

					regionConfig.dynamicHeight = this.getTemplateDOMElementByID("view\\.region\\.dynamic\\.height").checked;

					this.getTemplateDOMElementByID("view\\.region\\.size\\.width").disabled = Boolean(regionConfig.dynamicHeight);
					this.getTemplateDOMElementByID("view\\.region\\.dynamic\\.height").disabled = ((regionConfig.end.x - regionConfig.start.x) + 1) != this._getCurrentConfiguration().config.width;

					this.redrawPanelContent();

				}

			}

		},

		/**
		 * Mark the border of the current selected region
		 * 
		 * @param {Number} regionToShow Current selected Region
		 */
		_markBorderOfRegion: function (regionToShow) {

			if (regionToShow === null) return;

			let regionData = this._getRegionConfiguration(regionToShow);

			let self = this;

			const configData = this._getCurrentConfiguration().config;

			const borderSelectValue = this.getTemplateDOMElementByID("default\\.border\\.select\\.color").value;

			for (let x = regionData.start.x; x <= regionData.end.x; x++) {

				for (let y = regionData.start.y; y <= regionData.end.y; y++) {

					let currentID = self.calculateIDByPosition(x, y);

					let element = self.getHolderElement().querySelector(`td[tableid="${currentID}"]`);

					let borderToPaste = `3px solid ${borderSelectValue}`;

					if (x === regionData.start.x) {
						domStyle.set(element, "border-left", borderToPaste);
						if (x > 0) {
							domStyle.set(self.getHolderElement().querySelector(`td[tableid="${currentID - 1}"]`), "border-right", "none");
						}
					}
					if (x === regionData.end.x) {
						domStyle.set(element, "border-right", borderToPaste);
						if (x + 1 < configData.width) {
							domStyle.set(self.getHolderElement().querySelector(`td[tableid="${currentID + 1}"]`), "border-left", "none");
						}
					}
					if (y === regionData.start.y) {
						domStyle.set(element, "border-top", borderToPaste);
						if (y > 0) {
							domStyle.set(self.getHolderElement().querySelector(`td[tableid="${currentID - configData.width}"]`), "border-bottom", "none");
						}
					}
					if (y === regionData.end.y) {
						domStyle.set(element, "border-bottom", borderToPaste);
						if (y + 1 < configData.height) {
							domStyle.set(self.getHolderElement().querySelector(`td[tableid="${currentID + configData.width}"]`), "border-top", "none");
						}
					}

				}

			}
		},

		/**
		 * Invert the colors of an given Hex Value
		 * 
		 * @param {String} hex The color which should get inverted 
		 * 
		 * @param {Boolean} bw Should only white and black be returned
		 * @default false
		 * 
		 * @returns {String} The inverted Hex Value
		 */
		_invertColor(hex, bw = false) {

			if (hex.indexOf('#') === 0) {
				hex = hex.slice(1);
			}
			// convert 3-digit hex to 6-digits
			if (hex.length === 3) {
				hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
			}

			if (hex.length !== 6) {
				throw new Error("Invalid HEX color");
			}

			let r = parseInt(hex.slice(0, 2), 16),
				g = parseInt(hex.slice(2, 4), 16),
				b = parseInt(hex.slice(4, 6), 16);

			if (bw) {
				return (r * 0.299 + g * 0.587 + b * 0.114) > 186
					? '#000000'
					: '#FFFFFF';
			}

			//invert color components
			r = (255 - r).toString(16);
			g = (255 - g).toString(16);
			b = (255 - b).toString(16);

			//pad each with zeros and return
			return "#" + this._padZero(r) + this._padZero(g) + this._padZero(b);
		},

		/**
		 * Add 0 to a string until the limit is reached
		 * 
		 * @param {String} str String which should get formated
		 * 
		 * @param {Number} len How long the String should be
		 * @default 2
		 * 
		 * @returns {String} String, with filled Zeros
		 */
		_padZero(str, len) {
			len = len || 2;
			let zeros = new Array(len).join('0');
			return (zeros + str).slice(-len);
		},

		/**
		 * Get if the fullscreen is active
		 * 
		 * @returns {boolean} Is the fullscreen currently active
		 */
		_getFullScreenStatus: function () {
			return (
				document.fullscreenElement
				||
				document.webkitFullscreenElement
				||
				document.mozFullScreenElement
			);
		},

		/**
		 * Open an HTML-Element in the fullscreen mode
		 * 
		 * @param {HTMLElement} elem Should get displayed in the fullscreen
		 */
		_openFullScreen: function (elem) {
			if (elem.requestFullscreen) {
				elem.requestFullscreen();
			} else if (elem.mozRequestFullScreen) { /* Firefox */
				elem.mozRequestFullScreen();
			} else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
				elem.webkitRequestFullscreen();
			} else if (elem.msRequestFullscreen) { /* IE/Edge */
				elem.msRequestFullscreen();
			}
		},

		/**
		 * Close the current opened fullscreen
		 */
		_closeFullScreen: function () {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (document.mozCancelFullScreen) { /* Firefox */
				document.mozCancelFullScreen();
			} else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
				document.webkitExitFullscreen();
			} else if (document.msExitFullscreen) { /* IE/Edge */
				document.msExitFullscreen();
			}
		},

		/**
		 * Set the attachment which should get displayed
		 * 
		 * @param {String} attachmentName The name of the attachment which should get used
		 */
		_setCurrentSelectedAttachment: function (attachmentName) {

			this.getTemplateDOMElementByID("attachment\\.path\\.current").value = attachmentName;
			this.useExternalConfiguration = attachmentName;

			swal({
				title: "Loading Configuration . . .",
				text: "Please wait",
				buttons: false,
				closeOnClickOutside: false,
				closeOnEsc: false,
			});

			new ProcessAttachments().getWebContentProcessAttachment(
				attachmentName,
				(successful, resultJSON, message) => {

					if (successful) {

						this.currentConfiguration = resultJSON;
						this.currentConfigurationID = 0;

						this._updateTypes();
						this._updateSelectedRegion(null);
						//this.redrawPanelContent();

						this.currentEditorStatus = this.currentEditorStatusEnum.region_select;

						swal.close();

					} else {
						swal("Request Error", message, "error");
					}

				});

		},

		/**
		 * Select all the Text inside the Alert
		 */
		_sweetAlertSelectTextAll: function () {
			setTimeout(() => {
				document.querySelector(".swal-content__input").select();
			}, 50);
		},

		/**
		 * Show Dialog in order to Upload Configuration as Text
		 */
		_uploadConfigurationFormText: function () {

			swal("Enter the configuration here: \n(It's recommended to not use more than 6'000 Characters)", {
				content: {
					element: "input",
					attributes: {
						placeholder: "Configuration",
						type: "text",
						value: '[{"type":"*","config":{"width":24,"height":15},"values":[]}]',
					}
				}
			}).then((value) => {
				if (Boolean(value)) {
					this._uploadAndParseConfiguration(value);
				} else {
					swal("Action was cancelled");
				}
			});

			this._sweetAlertSelectTextAll();

		},

		/**
		 * Show Dialog in order to Upload the Configuration as File
		 */
		_uploadConfigurationFromFile: function () {

			swal({
				title: "Select file",
				content: {
					element: "input",
					attributes: {
						placeholder: "Upload file",
						type: "file",
					},
				},
				button: {
					text: "Upload",
					closeModal: false,
				}
			}).then(filename => {

				let input = document.querySelector(".swal-content__input");

				if (input !== null && input.files.length > 0) {

					let file = input.files[0];

					if (file.type == "" || file.type == "application/json") {

						const reader = new FileReader();
						reader.onload = (e) => {
							this._uploadAndParseConfiguration(e.target.result);
						}
						reader.readAsText(file);

					} else {
						swal("Not a JSON", "The type of the given file isn't JSON", "error");
					}
				} else {
					if (filename === null) {
						swal("Action was cancelled");
					} else {
						swal("No file Selected", "No file was selected", "info");
					}
				}

			});

		},

		/**
		 * Upload, Check and Apply the uploaded Configuration
		 * 
		 * @param {JSON} newConfiguration The new Configuration
		 */
		_uploadAndParseConfiguration: function (newConfiguration) {

			if (newConfiguration === null) return;

			try {

				let parsedConfiguration = JSON.parse(newConfiguration);

				if (parsedConfiguration.length <= 0) throw new SyntaxError("The given value is empty");

				swal({
					title: "Verify the Configuration?",
					text: "Do you want the configuration to be checked by the System, which might take a few seconds, before it gets applied?",
					icon: "warning",
					buttons: ['Yes', 'No'],
					dangerMode: true,
				}).then((willDelete) => {

					try {

						for (let i = 0; i < parsedConfiguration.length; i++) {
							const element = parsedConfiguration[i];

							if (!willDelete) {

								if (element.type === undefined) throw new SyntaxError(`Entry Nr.${i}: Can't find field "type"`);
								if (element.config === undefined) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}): Can't find field "config"`);
								if (element.config.width === undefined) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}): Can't find field "config.width"`);
								if (element.config.height === undefined) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}): Can't find field "config.height"`);
								if (element.values === undefined) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}): Can't find field "values"`);
								if (!Array.isArray(element.values)) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}): The field "values" isn't an Array`);

							}

							for (let c = 0; c < element.values.length; c++) {
								const elementValues = element.values[c];

								if (!willDelete) {
									if (elementValues.regionID === undefined) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}), Region Nr.${c}: Can't find field "regionID"`);

									if (elementValues.start === undefined) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}), Region Nr.${c} (RegionID: ${elementValues.regionID}): Can't find field "start"`);
									if (elementValues.start.x === undefined) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}), Region Nr.${c} (RegionID: ${elementValues.regionID}): Can't find field "start.x"`);
									if (!Number.isSafeInteger(elementValues.start.x)) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}), Region Nr.${c} (RegionID: ${elementValues.regionID}): Field "start.x" isn't a number`);
									if (elementValues.start.y === undefined) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}), Region Nr.${c} (RegionID: ${elementValues.regionID}): Can't find field "start.y"`);
									if (!Number.isSafeInteger(elementValues.start.y)) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}), Region Nr.${c} (RegionID: ${elementValues.regionID}): Field "start.y" isn't a number`);

									if (elementValues.end === undefined) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}), Region Nr.${c} (RegionID: ${elementValues.regionID}): Can't find field "end"`);
									if (elementValues.end.x === undefined) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}), Region Nr.${c} (RegionID: ${elementValues.regionID}): Can't find field "end.x"`);
									if (!Number.isSafeInteger(elementValues.end.x)) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}), Region Nr.${c} (RegionID: ${elementValues.regionID}): Field "end.x" isn't a number`);
									if (elementValues.end.y === undefined) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}), Region Nr.${c} (RegionID: ${elementValues.regionID}): Can't find field "end.y"`);
									if (!Number.isSafeInteger(elementValues.end.y)) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}), Region Nr.${c} (RegionID: ${elementValues.regionID}): Field "end.y" isn't a number`);

									if (elementValues.dynamicHeight && (elementValues.end.x - elementValues.start.x) + 1 != element.config.width) throw new SyntaxError(`Entry Nr.${i} (Type: ${element.type}), Region Nr.${c} (RegionID: ${elementValues.regionID}): Field "dynamicHeight" is enabled but the region doesn't have the same width as the configuration`);
								}

								let rearrangedPositions = this._printableWorkItemDraw._rearrangePositions(elementValues.start, elementValues.end);
								elementValues.start = rearrangedPositions[0];
								elementValues.end = rearrangedPositions[1];
							}

						}

						this.currentConfiguration = parsedConfiguration;
						this.currentConfigurationID = 0;
						this._recalculateRegionIDs();

						this._updateSelectedRegion(null);

						this._updateTypes();

						this.redrawPanelContent();

						swal("Imported", "Configuration was imported", "success");

					} catch (ex) {
						console.error(ex);
						swal("Invalid Configuration", ex.message, "error");
					}

				});

			} catch (ex) {
				console.error(ex);
				swal("Invalid Configuration", ex.message, "error");
			}

		},



	});

});
