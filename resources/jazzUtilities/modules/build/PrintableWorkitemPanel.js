dojo.provide("com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.build.PrintableWorkitemPanel");

dojo.require("dijit._Widget");

dojo.require("dijit._Templated");

dojo.require("dojox.uuid.generateRandomUuid");

(function () {
  dojo.declare("com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.build.PrintableWorkitemPanel", [dijit._Widget, dijit._Templated], {
    templatePath: "",
    parameterDTO: null,
    childReportParam: null,
    urlPrefix: "",
    isInputEnabled: false,
    isDeferred: false,

    /*boolean.  False by default*/
    getValuesDeferred: null,

    /*function(args).  If isDeferred is true, then this function must be provided for the parameter to fetch its values
    The parameter can provide any additional arguments for the get request*/
    // action handlers
    valuesMouseOverHandler: null,
    valuesMouseOutHandler: null,

    /**
     * @param {Object} props - Expected:
     *	parameterDTO (Object)
     *	urlPrefix (String)
     */
    constructor: function constructor(props) {
      dojo.mixin(this, props);
      this._reportParameterDTOs = [];
      this._defaultValues = [];
      this._uuid = dojox.uuid.generateRandomUuid();
      this.dirtyListener = null;
    },

    /**
     * Initialize some common parameter headers such as the parameter name
     * and required marker (if necessary).
     */
    postCreate: function postCreate() {},
    setDirtyListener: function setDirtyListener(object) {
      this.dirtyListener = object;
    },
    onDirty: function onDirty() {
      if (this.dirtyListener != null) {
        this.dirtyListener.setDirty(true);
      }
    },

    /**
     * 
     */
    isRequired: function isRequired() {
      return this.parameterDTO.required;
    },

    /**
     * Initialize this parameter widget. If reportParameterDTO exists
     * this.appendDefaultValues(reportParameterDTO, isLast) is called in order
     * that the derived widget may set its initial default values.
     * 
     * @param {Object} reportParameterDTO - Optional
     */
    init: function init(reportParameterDTO) {
      if (!this.initialized) {
        this.initialized = true;

        if (reportParameterDTO) {
          this.appendDefaultValues(reportParameterDTO, true);
          this.setDefaultValues();
        }
      }
    },

    /**
     * Post initialization is called after the widgets default values have been
     * added.  This might occur some time after init if there is a large cascading
     * group to set up.
     */
    postInit: function postInit() {},

    /**
     *
     */
    getDisplayLabel: function getDisplayLabel() {
      if (this.parameterDTO.displayName && this.parameterDTO.displayName.length > 0) {
        return this.parameterDTO.displayName;
      } else {
        return this.parameterDTO.name;
      }
    },

    /**
     * Sets the child widget of the parameter, this is used for cascading
     * parameters.
     * 
     * @param {Object} reportParam
     */
    setChild: function setChild(reportParam) {
      this.childReportParam = reportParam;
    },

    /**
     * To be overridden. Call to inform the widget that the specified
     * values should be 'selected' (this could cause a cascade if the paramter
     * is in a cascading group).  This is typically called when there are 
     * parameters specified on the URL.
     * 
     * @param {String} values
     */
    setValues: function setValues(values) {},

    /**
     * To be overridden.  Should be called after initialization, the reportParameterDTOs
     * specified become the 'defaults'; for example, when there are no selections 
     * in a cascading group, the parameter shows all its values, where 'all its values'
     * are the defaults. 
     * 
     * @param {Object} reportParameterDTO
     */
    appendDefaultValues: function appendDefaultValues(reportParameterDTO, isLast) {},
    disableInput: function disableInput() {},

    /**
     * To be overridden. Selects the default value for the parameter if one is provided. This
     * should be called after init and after all appendDefaultValues.
     */
    setDefaultValues: function setDefaultValues() {},

    /**
     * To be overridden.
     */
    setSelectedValues: function setSelectedValues(values) {},

    /**
     * To be overridden. Reset the values to
     * their initial selection.
     */
    resetValues: function resetValues() {},

    /**
     * To be overridden. Gets the values selected.
     */
    getSelectedValues: function getSelectedValues() {
      return [];
    },

    /**
     * Helper function provided to derived widgets that need
     * to remove some elements from the DOM.
     * 
     * @param {Object} element - The element to remove
     */
    _removeChildren: function _removeChildren(element) {
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    }
  });
})();