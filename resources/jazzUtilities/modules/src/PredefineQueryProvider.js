define([
	'dojo/_base/declare',
	"com.ibm.team.dashboard.web.ui.DashboardConstants",
	'com.ibm.team.workitem.viewlets.web.ui.internal.utils.WorkItemQueryChooser'],
	function (declare) {

		var DashboardConstants = com.ibm.team.dashboard.web.ui.DashboardConstants;
		var WorkItemQueryChooser = com.ibm.team.workitem.viewlets.web.ui.internal.utils.WorkItemQueryChooser;

		return declare("com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.src.PredefineQueryProvider", dojo.global.com.ibm.team.dashboard.web.ui.CustomPreferenceProvider, {

			/**
			 * @override super
			 */
			context: null,
			webURL: null,

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
				return (
					this.context.predefineQuery === undefined || this.context.predefineQuery === null || this.context.predefineQuery === "" ?
						'No Query Predefined' : "Query: ".concat(JSON.parse(this.context.predefineQuery).name));
			},

			/**
			 * 
			 * @param onOK 
			 * @param settings 
			 * @param viewlet 
			 * 
			 * @override super
			 */
			createChooser: function (onFinish, settings, viewlet) {

				new WorkItemQueryChooser({
					title: "Select the query you'd like predefine",
					scope: DashboardConstants.SCOPE_CONTRIBUTOR,
					onOk: function (queryDto) {

						var saveQueryDto = {
							itemId: queryDto.itemId,
							projectAreaItemId: queryDto.projectAreaItemId,
							name: queryDto.name
						};

						onFinish(JSON.stringify(saveQueryDto), "predefineQuery");
					},
					multiSelect: false,
					suppressCrossRepoQueries: true
				});

			}

		});

	});
