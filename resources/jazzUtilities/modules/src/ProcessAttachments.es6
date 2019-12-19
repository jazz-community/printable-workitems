define([
	'dojo/_base/declare',
], function (declare) {

	return declare(null, {

		baseProcessAttachmentUrl: '{{rootURL}}/process-runtime/process-attachments?context={{rootURL}}/process/project-areas/{{projectAreaID}}',
		baseTranslateProcessAttachmentUrl: "/service/com.ibm.team.repository.common.internal.IRepositoryRemoteService",

		/**
		 * 
		 * Request for the list with all the attachment with are formated like: print-wi/*.json
		 * 
		 * @param {Function} _callback Gets called, after the request has finished or has encountered any error.
		 * 
		 * _callback(Boolean successful, List<String> attachmentList, String message)
		 * 
		 */
		getWebLoadAllProcessAttachments: function (_callback) {

			const attachmentPathReturnList = [];

			const url_string_context = net.jazz.ajax._contextRoot;
			const url_string_root = url_string_context && url_string_context.length > 0 ? url_string_context : "https://localhost:7443/jazz/";

			const url_string_projectArea = com.ibm.team.repository.web.client.init.InitializationData.get("com.ibm.team.rtc.common.service.projectAreaWebInitializer");

			if (url_string_projectArea == null) {
				_callback(false, [], "Can't find the current Project-Area");
				return;
			}

			jazz.client.xhrGet({
				url: this.baseProcessAttachmentUrl.replace(/\{\{rootURL\}\}/g, url_string_root).replace(/\{\{projectAreaID\}\}/g, url_string_projectArea.projectArea.id),
				error: () => {
					return null;
				}
			}).then(((rootResult) => {

				if (rootResult == null || rootResult == undefined) {
					_callback(false, [], "Can't find the list with the Linked Attachments");
				} else {

					const parsedValue = new DOMParser().parseFromString(rootResult, "text/xml");

					let attachmentList = parsedValue.children[0].children;

					const requestNameValue = document.implementation.createDocument("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope");
					requestNameValue.documentElement.setAttribute("xmlns:process", "com.ibm.team.process");
					requestNameValue.documentElement.setAttribute("xmlns:com.ibm.team.repository.common.services", "http:///com/ibm/team/core/services.ecore");
					requestNameValue.documentElement.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");

					const body = requestNameValue.createElement("soapenv:Body");
					const request = requestNameValue.createElement("request");
					const method = requestNameValue.createElement("method");
					method.textContent = "fetchOrRefreshItems";

					const node_interface = requestNameValue.createElement("interface");
					node_interface.textContent = "com.ibm.team.repository.common.internal.IRepositoryRemoteService";

					const complexArrayDataArg = requestNameValue.createElement("parameters");
					complexArrayDataArg.setAttribute("xsi:type", "com.ibm.team.repository.common.services:ComplexArrayDataArg");

					const type = requestNameValue.createElement("type");
					type.textContent = "COMPLEX";

					requestNameValue.documentElement.appendChild(body);
					body.appendChild(request);
					request.appendChild(method);
					request.appendChild(node_interface);
					request.appendChild(complexArrayDataArg);
					complexArrayDataArg.appendChild(type);

					for (let i = 0; i < attachmentList.length; i++) {
						const element = attachmentList[i];

						if (element.nodeName == "jp:attachment") {
							const newNodeValue = requestNameValue.createElement("values");
							newNodeValue.setAttribute("xsi:type", "process:ProcessAttachmentHandle");
							newNodeValue.setAttribute("itemId", element.getAttribute("jp:item-id"));

							const immutable = requestNameValue.createElement("immutable");
							immutable.textContent = "true";

							newNodeValue.appendChild(immutable);

							complexArrayDataArg.appendChild(newNodeValue);
						}
					}

					const NullDataArg = requestNameValue.createElement("parameters");
					NullDataArg.setAttribute("xsi:type", "com.ibm.team.repository.common.services:NullDataArg");

					const typeNull = requestNameValue.createElement("type");
					typeNull.textContent = "NULL";

					NullDataArg.appendChild(typeNull);

					request.appendChild(NullDataArg);

					var postRequest = new XMLHttpRequest();
					postRequest.addEventListener('load', (event) => {

						if (postRequest.status == 200) {
							postRequest.responseXML.documentElement.querySelectorAll("response > returnValue > value > retrievedItems").forEach(postResultElement => {

								if (postResultElement.getAttribute("xsi:type") === "process:ProcessAttachment") {
									const attachmentPath = postResultElement.querySelector(":scope > path").textContent;

									//Check if the Path fo the attachment matches the filter ( print-wi/*.json )
									if (attachmentPath.startsWith("print-wi/") && attachmentPath.endsWith(".json")) {
										const attachmentPathName = attachmentPath.substring("print-wi/".length, attachmentPath.length - ".json".length);

										if (!attachmentPathReturnList.includes(attachmentPathName)) {
											attachmentPathReturnList.push(attachmentPathName);
										}
									}
								}
							});

							_callback(true, attachmentPathReturnList, "successful");

						} else {
							console.error(`Error: ${postRequest.status} - ${postRequest.responseText}`);
							_callback(false, [], postRequest.responseText);
						}
					});

					postRequest.open("POST", url_string_root + this.baseTranslateProcessAttachmentUrl);

					postRequest.setRequestHeader("Pragma", "no-cache");
					postRequest.setRequestHeader("Accept", "*/*");
					postRequest.setRequestHeader("Cache-Control", "no-cache");
					postRequest.setRequestHeader("Content-Type", "text/xml");

					postRequest.send('<?xml version="1.0" encoding="UTF-8" ?>' + new XMLSerializer().serializeToString(requestNameValue));

				}

			}).bind(this));

		},

		/**
		 * Get the content of a attachment in the current PA in the JSON-Format
		 * 
		 * @param {String} attachmentName The name of the attachment which should get loaded
		 * @param {Function} _callback Gets called, after the request has finished or has encountered any error.
		 * 
		 * _callback(Boolean successful, JSON resultJSON, String message)
		 */
		getWebContentProcessAttachment: function (attachmentName, _callback) {

			var url_string_context = net.jazz.ajax._contextRoot;
			var url_string_root = url_string_context && url_string_context.length > 0 ? url_string_context : "https://localhost:7443/jazz/";

			var url_string_base = "service/com.ibm.team.workitem.common.internal.model.IImageContentService/processattachment";
			var url_string_projectArea = com.ibm.team.repository.web.client.init.InitializationData.get("com.ibm.team.rtc.common.service.projectAreaWebInitializer");
			var url_string_fileName = attachmentName + ".json";

			if (url_string_projectArea == null) {
				_callback(false, null, "Can't find the current Project-Area");
				return;
			}

			var resourceURL = url_string_root + "/" + url_string_base + "/" + url_string_projectArea.projectArea.id + "/print-wi/" + url_string_fileName;

			var req = new XMLHttpRequest();
			req.open("GET", resourceURL, true);
			req.responseType = "json"; //Force the response to be JSON
			req.onreadystatechange = function () {
				if (req.readyState === 4) {

					if (req.status === 200) {
						// Check if the response is valid JSON
						if (req.response != null) {
							_callback(true, req.response, "successful");
						} else {
							_callback(false, null, "The given Configuration isn't in the correct JSON Format");
						}

					} else {
						_callback(false, null, "Code: " + req.status + "; Message: " + req.statusText);
					}

				}
			}

			req.send();
		}

	});

});
