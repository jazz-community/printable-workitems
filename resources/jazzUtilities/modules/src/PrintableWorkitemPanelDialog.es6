dojo.provide("com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.build.PrintableWorkitemPanelDialog");

dojo.require("dojo.i18n");

dojo.require("jazz.ui.StyledBox");
dojo.require("jazz.ui.Dialog");
dojo.require("jazz.app.i18n");

dojo.require("com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.build.PrintableWorkitemPanel");

(function () {

	var TrimStyles = jazz.ui.StyledBox.TrimStyles;
	var Dialog = jazz.ui.Dialog;

	dojo.declare("com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.build.PrintableWorkitemPanelDialog", [dijit._Widget, dijit._Templated], {

		templatePath: dojo.moduleUrl("com.siemens.bt.jazz.viewlet.printableworkitems", "jazzUtilities/modules/PrintableWorkitemPanelDialog.html"),
		padding: "10px",
		_reportParams: null, //array of ReportParam widgets added to this panel

		constructor: function (props) {
			dojo.mixin(this, props);
			// Flag to determine whether or not to remove the 'loading...' text, should only be done once,
			// prior to the first parameter widget being appended.
			this._appendedParameter = false;
			this.dirtyListener = null;

			this._reportParams = [];
		},

		postCreate: function () {
			this._rootDiv.style.padding = this.padding;
			if (!this.textDir)
				this.textDir = jazz.app.i18n.getPreferredBaseTextDir();
		},

		destroy: function () {
			if (this._styledBox) {
				this._styledBox.destroy();
			}

			this.inherited(arguments);
		},

		setContentMaxHeight: function (maxHeight) {
			dojo.style(this._contentArea, "maxHeight", maxHeight + "px");
			dojo.style(this._contentArea, "overflow", "auto");
		},

		scrollToTopContent: function () {
			this._contentArea.scrollTop = 0;
		},

		setDirtyListener: function (object) {
			this.dirtyListener = object;
		},

		/**
		 * Notify this widget that it is now being displayed.  It is only necessary to call this method if the
		 * panel is being toggled on/off - if it is visible as soon as it is added to the DOM, it doesn't need to
		 * be called.
		 */
		show: function () {
			//we need to call startup again on all StyledBox objects when this widget becomes visible to ensure that
			//the titles are properly displayed on Firefox.  See work item 312327 for details

			//call start up on all child report params
			for (var i = 0; i < this._reportParams.length; i++) {
				this._reportParams[i].startup();
			}

		},

		showAsDialog: function (_primaryTitle, onCloseFunc, _width = "952px") {
			var self = this;
			// Create the dialog
			this._dialog = new Dialog({
				contentNode: this.domNode,
				heading: _primaryTitle,
				width: _width,
				isClosable: true,
				onClose: function () {
					if (onCloseFunc) {
						onCloseFunc();
					}
				}
			});
			if (this._focusOnOpenElem && typeof this._focusOnOpenElem.focus == 'function') {
				this._focusOnOpenElem.focus();
			}
		},

		focusOnOpen: function (elem) {
			this._focusOnOpenElem = elem;
		},

		insertParamHTML: function (paramHTML) {
			if (!this._appendedParameter) {
				//remove the "loading" text
				this._removeChildren(this._mainSectionLeft);
				this._appendedParameter = true;
			}

			//TODO what to do about the dirty listener here?

			this._mainSectionLeft.innerHTML = paramHTML;
		},

		appendParamGroup: function (reportParamGroup) {
			if (!this._appendedParameter) {
				this._removeChildren(this._mainSectionLeft);
				this._appendedParameter = true;
			}
			if (this.dirtyListener != null) {
				reportParamGroup.setDirtyListener(this.dirtyListener);
			}
			this._mainSectionLeft.appendChild(reportParamGroup.domNode);

			reportParamGroup.startup();
			this._reportParams.push(reportParamGroup);
		},

		appendParam: function (reportParam) {
			if (!this._appendedParameter) {
				this._removeChildren(this._mainSectionLeft);
				this._appendedParameter = true;
			}
			if (this.dirtyListener != null) {
				reportParam.setDirtyListener(this.dirtyListener);
			}
			this._styledBox = new jazz.ui.StyledBox({
				closable: false,
				heading: reportParam.getDisplayLabel(),
				secondaryTitle: (reportParam.isRequired() ? "<span class=\"requiredMarker\">*</span>" : ""),
				contentNode: reportParam.domNode,
				"class": "box-single",
				trim: TrimStyles.BLUE_ALPHA_SHADOW,
				headerDefaultToHoverState: false
			});
			this._mainSectionLeft.appendChild(this._styledBox.domNode);
			this._styledBox.startup();
			this._reportParams.push(this._styledBox);
		},

		setMainSectionRight: function (domNode) {
			this._hasRightSection = true;
			this._mainSectionRight.appendChild(domNode);
		},

		/*
		   * @param Boolean show
		   * 
		   * @return void
		   */
		showPreviewPane: function (show) {

			if (show) {
				// Parameters Pane
				dojo.removeClass(this._mainSectionLeft, "parametersPaneLayoutOff");
				dojo.addClass(this._mainSectionLeft, "parametersPaneLayoutOn");
				// Preview Pane
				dojo.removeClass(this._previewPaneLayout, "previewPaneLayoutOff");
				dojo.addClass(this._previewPaneLayout, "previewPaneLayoutOn");
			} else {
				// Parameters Pane
				dojo.removeClass(this._mainSectionLeft, "parametersPaneLayoutOn");
				dojo.addClass(this._mainSectionLeft, "parametersPaneLayoutOff");
				// Preview Pane
				dojo.removeClass(this._previewPaneLayout, "previewPaneLayoutOn");
				dojo.addClass(this._previewPaneLayout, "previewPaneLayoutOff");
			}
		},

		setBottomButtonsSection: function (domNode) {
			this._bottomSection.appendChild(domNode);
		},

		setTopInputFieldSection: function (domNode) {
			this._topSection.appendChild(domNode);
			this.applyTextDir(domNode);
			this.connect(domNode, "onkeyup", this._changeTopSection);
		},

		_changeTopSection: function (e) {
			if (this.textDir == "auto") {
				this.applyTextDir(e.target, e.target.value);
			}
		},

		closeDialog: function () {
			if (this._dialog) {
				this._dialog.close();
				delete this._dialog;
			}
		},

		_removeChildren: function (element) {
			while (element.firstChild) {
				element.removeChild(element.firstChild);
			}
		}

	});

})();
