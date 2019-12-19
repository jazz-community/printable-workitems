define(['dojo/_base/declare', 'require', './../DojoSweetAlert', 'com.ibm.team.apt.web.ui.internal.editor.config.PlanModeClient', 'com.ibm.team.apt.web.ui.internal.viewlet.PlanChooserWidget'], function (declare, require, DojoSweetAlert, PlanModeClient, PlanChooserWidget) {
  var DojoSweetAlert = com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.DojoSweetAlert;
  var PlanChooserWidget = com.ibm.team.apt.web.ui.internal.viewlet.PlanChooserWidget;
  return declare("com.siemens.bt.jazz.viewlet.printableworkitems.jazzUtilities.modules.build.WorkItemPlanDialog", [], {
    constructor: function constructor(props) {},
    getListFromPlan: function getListFromPlan() {
      return new Promise(function (resolve, reject) {
        if (typeof swal === 'undefined') {
          new DojoSweetAlert().applySwal();
        }

        var projectArea = com.ibm.team.repository.web.client.init.InitializationData.get("com.ibm.team.rtc.common.service.projectAreaWebInitializer");
        var currentProjectAreaID = projectArea == undefined ? null : projectArea.projectArea.id;

        if (currentProjectAreaID == undefined) {
          swal("No Project-Area", "Can't detect the current Project-Area", "error");
          reject('No Project-Area found');
          return;
        }

        new PlanChooserWidget().createChooser(function (result1, result2) {
          var team = com.ibm.team;
          var apt = team.apt;
          var web = apt.web;
          var internal2 = web.ui.internal;
          var PlanModeClient = internal2.editor.config.PlanModeClient;
          var api = apt.api;
          var common = api.common;
          var UIItemHandle = common.UIItemHandle;
          var Flags = common.internal.Flags;
          var client2 = web.client;
          var PlanningClient2 = client2.PlanningClient2;
          var shared = apt.shared;
          var Future = shared.client.internal.util.Future;
          var onPlanModes = new Future();
          onPlanModes.setErrCallback(function (error) {
            console.error("Error happened");
            console.error(error);
            reject(error);
          });
          onPlanModes.setCallback(function (planModeList) {
            var planModeTable = document.createElement("table");
            planModeTable.style.width = "100%";
            planModeTable.style.cursor = "pointer";
            planModeTable.style.textAlign = "left";
            planModeTable.style.tableLayout = "fixed";
            var foundList = [];

            for (var x in planModeList.fPlanModes) {
              if (planModeList.fPlanModes.hasOwnProperty(x)) {
                var element = planModeList.fPlanModes[x];
                foundList.push({
                  "label": element.fPlanMode.fSource.label,
                  "id": x
                });
                var planModeTableRow = document.createElement("tr");
                planModeTableRow.classList.add("planModeSelectOption");

                planModeTableRow.onclick = function (event) {
                  swal.close();
                  var planID = event.srcElement.getAttribute("planModeID");
                  /*********************************************************/

                  /*********************************************************/

                  /*********************************************************/

                  var future = new Future();
                  future.setErrCallback(function (error) {
                    console.warn(error);
                    reject(error);
                  });
                  future.setCallback(function (result) {
                    /******************************/

                    /******************************/
                    // Fetch the Data from the Table
                    var onPlanModes = new Future();
                    onPlanModes.setErrCallback(function (error) {
                      console.warn(error);
                      reject(error);
                    });
                    onPlanModes.setCallback(function (success) {
                      if (success.items.length == 0) {
                        swal("Nothing found", "No Items where found", "error");
                        reject("No Items where found");
                        return;
                      }

                      var data = "a=id&";
                      data += "a=com.ibm.team.apt.attribute.planitem.newRanking._pm7NmRYUEd6L1tNIGdz5qQ&";
                      data += "a=workItemType&";
                      data += "a=summary&";
                      var validationCounter = 0;
                      success.items.forEach(function (returnItem) {
                        //Check if the item, is a workitem, by checking the pattern
                        if (/(.*);(.*);(.*)$/gm.test(returnItem)) {
                          data += "s=" + encodeURIComponent(returnItem.split(/;(.+)/)[1]) + "&";
                          validationCounter++;
                        }
                      });

                      if (validationCounter == 0) {
                        swal("Nothing found", "No Items could be Identified as Workitems", "error");
                        reject("No Items could be Identified as Workitems");
                        return;
                      }

                      data += "includeApprovals=false&includeLinks=false&";
                      data += "projectAreaItemId=" + currentProjectAreaID;
                      data += "&projectAreaConfigurationStateId=" + planModeList.fPlanModes[planID].fPlanMode.fSource.stateId;
                      var xhr = new XMLHttpRequest();
                      xhr.addEventListener("readystatechange", function () {
                        if (this.readyState === 4) {
                          if (this.status === 200) {
                            var itemList = [];
                            JSON.parse(this.responseText)["soapenv:Body"].response.returnValue.values.forEach(function (workItemElement) {
                              var generatedItem = {};
                              workItemElement.attributes.forEach(function (element) {
                                switch (element.key) {
                                  case 'id':
                                    generatedItem.id = element.value.id;
                                    break;

                                  case 'summary':
                                    generatedItem.summary = element.value.content;
                                    break;

                                  case 'workItemType':
                                    generatedItem.type = element.value.label;
                                    break;

                                  case 'com.ibm.team.apt.attribute.planitem.newRanking._pm7NmRYUEd6L1tNIGdz5qQ':
                                    generatedItem.rank = element.value.content ? element.value.content.replace(/com.ibm.team.apt.attribute.planitem.newRanking /m, "") : null;
                                    break;

                                  default:
                                    break;
                                }
                              });
                              itemList.push(generatedItem);
                            }); // Sort the list and put null at the end of the list

                            itemList.sort(function (x, y) {
                              return x.rank === null ? 1 : y.rank === null ? -1 : x.rank.toString().localeCompare(y.rank);
                            });

                            for (var i = 0; i < itemList.length; i++) {
                              itemList[i].localRank = i + 1;
                            }

                            resolve(itemList);
                          } else {
                            swal("Web Error", "Error while requesting the translated list of the Workitems", "error");
                            reject("Error while requesting the translated list of the Workitems");
                            return;
                          }
                        }
                      });
                      var url = net.jazz.ajax._contextRoot;
                      xhr.open("POST", "".concat(url && url.length > 0 ? url : 'https://localhost:7443/jazz', "/service/com.ibm.team.workitem.common.internal.rest.IWorkItemRestService/getWorkItems"));
                      xhr.setRequestHeader("Pragma", "no-cache");
                      xhr.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0, private");
                      xhr.setRequestHeader("X-com-ibm-team-configuration-versions", "LATEST");
                      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
                      xhr.setRequestHeader("accept", "text/json");
                      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                      xhr.setRequestHeader("cache-control", "no-cache");
                      xhr.send(data);
                    });
                    PlanningClient2.getInstance().fetchPlanItems(fakePlanDataHolder.getItemId(), planModeList.fPlanModes[planID].fPlanMode.fSource.itemId, Flags.NONE, onPlanModes);
                    /******************************/

                    /******************************/
                  });
                  PlanningClient2.getInstance().getItemStore().withItem(UIItemHandle.fromHandle(result1), future, com.ibm.team.apt.api.client.util.Flag.Refresh);
                  /*********************************************************/

                  /*********************************************************/

                  /*********************************************************/
                };

                var planModeTableRowData = document.createElement("td");
                planModeTableRowData.setAttribute("planModeID", x);
                planModeTableRowData.setAttribute("title", element.fPlanMode.fSource.label);
                planModeTableRowData.innerText = element.fPlanMode.fSource.label;
                planModeTableRowData.style.border = "1px solid black";
                planModeTableRowData.classList.add("truncate");
                planModeTableRow.appendChild(planModeTableRowData);
                planModeTable.appendChild(planModeTableRow);
              }
            }

            if (foundList.length == 0) {
              swal("No Plan-View", "The selected Plan doesn't have any Views", "error");
              reject('No Plan-View found');
              return;
            }

            swal({
              title: "Step 2 / 2",
              text: "Please select the Plan View you want to use",
              content: planModeTable,
              buttons: {
                cancel: true
              }
            });
          }); //Create a Fake-Plan-Data-Holder with all the information

          var fakePlanDataHolder = {
            getItemType: function getItemType() {
              return result2;
            },
            getItemId: function getItemId() {
              return result1.split(/;(.+)/)[1];
            },
            getDefaultPlanModeId: function getDefaultPlanModeId() {
              // The default value which should get used
              return null;
            }
          };
          new PlanModeClient(currentProjectAreaID, PlanningClient2.getInstance()).fetchPlanModesForPlan(fakePlanDataHolder, onPlanModes);
        }, // The ID of the Project-Area
        {
          scopeItemId: currentProjectAreaID
        }, null);
      });
    }
  });
});