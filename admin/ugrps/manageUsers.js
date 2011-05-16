// UserManager object
var userManager;

//aliases
var Dom = YAHOO.util.Dom;

/**
* UserManager - class for listing and searching of users
*
* @param _isFilterMode - either select from all users or filtering of existing set of users
* @param _isSelection - is selection column is visible
* @param _isWindowMode - true in window popup, false in div

* @author Artem Osmakov <osmakov@gmail.com>
* @version 2011.0510
*/
function UserManager(_isFilterMode, _isSelection, _isWindowMode) {

		var _className = "UserManager",
			_myDataTable,
			_myDataSource,
			_arr_selection = [],
			_callback_func, //callback function for non-window mode
			_grpID, //if group is defined as parameter - filter by this group
			_db,
			_isSingleSelection = false,
			_workgroups;
		//
		// filtering UI controls
		//
		var filterTimeout = null,
			filterByName,
			filterByRole,
			filterByGroup,
			filterByDisable,
			filterBySelection1,
			filterBySelection2,
			lblSelect1,
			lblSelect2;

		//for tooltip
		var currentTipId,
			needHideTip = true,
			hideTimer;

		var _roles = [{value:"admin", text:"admin"},{value:"member", text:"member"},
		//{value:"invited", text:"invited", enabled:false},{value:"request", text:"request", disabled:true },
		{value:"delete", text:"kick off"} ];

	/**
	* Result handler for search on server
	*/
	var _updateUserList = function (context) {

		var arr = [],
			user, ind;


		for (ind in context.userslist) {
		if (!isnull(ind) )
		{
			user = context.userslist[ind];
			user[0] = false; //_arr_selection.indexOf(ind)>=0;
			arr.push(user);
		}
		}

		_initTable(arr);
	}

	/**
	* Updates REMOTE filter conditions and loads data from server side
	*/
	var _updateFilter  = function () {
							// Reset timeout
							filterTimeout = null;

							var filter_name   = filterByName.value;
							var filter_group  = (_isSelection || isnull(_grpID)) ?filterByGroup.value:_grpID;
							var filter_nogroup = (_isSelection && !isnull(_grpID)) ?_grpID:"all";
							var filter_role   = filterByRole.value;
							var filter_disabled = ((filterByDisable && filterByDisable.checked)?1:0);

							var baseurl = top.HEURIST.baseURL + "admin/ugrps/loadUserGrps.php";
							var callback = _updateUserList;
							var params = "method=searchuser&db=" + _db +
												"&nogrpID=" + filter_nogroup +
												"&grpID=" + filter_group + "&grpRole=" + filter_role +
												"&name="+encodeURIComponent(filter_name) + "&disabled=" + filter_disabled;
							top.HEURIST.util.getJsonData(baseurl, callback, params);



							Dom.get("pnlFilterByRole").style.display = (filter_group==="all")?"none":"inline-block";

							var isNotAdmin = _isNotAdmin(filter_group);

							var nstyle = (isNotAdmin)?"none":"inline-block";

							Dom.get("btnSelectAdd1").style.display	 = nstyle;
							Dom.get("btnSelectAdd2").style.display	 = nstyle;
							if(_myDataTable) {
									var col = _myDataTable.getColumn("role2");
									col.hidden = _isSelection || !isNotAdmin;

									_myDataTable.getColumn("role").hidden = _isSelection || isNotAdmin;
									_myDataTable.getColumn("role").label = "Role";
							}
	};

	function _isNotAdmin(__grpID){

		if(__grpID === "all"){
			return true;
		}else{
			var curruser_id = String(top.HEURIST.get_user_id());
			var grpID;
			for (grpID in _workgroups)
			{
				if(grpID == __grpID){
					var admins = _workgroups[grpID].admins;
					for (ind in admins){
						if(!isnull(ind) && admins[ind].id === curruser_id)
						{
							return false;
						}
					}
					return true;
				}
			}
		}
		return true;
	}

	/**
	* Updates LOCAL filter conditions for datatable
	*/
	var _updateFilterLocal  = function () {

							var filter_select = ((filterBySelection2 && filterBySelection2.checked)?1:0);
							// Reset sort
							var state = _myDataTable.getState();

							state.sortedBy = {key:'name', dir:YAHOO.widget.DataTable.CLASS_ASC};
							// Get filtered data
							_myDataSource.sendRequest(filter_select,
							{
								success : _myDataTable.onDataReturnInitializeTable,
								failure : _myDataTable.onDataReturnInitializeTable,
								scope   : _myDataTable,
								argument : { pagination: { recordOffset: 0 } } // to jump to page 1
							});
	}


	/**
	* Initialization of form
	*
	* 1. Reads GET parameters
	* 2. create and fill table of groups
	* 3. fille selector for type of groups
	* 4. assign listeners for filter UI controls
	*/
	function _init(grpID, _callback)
	{
		_callback_func = _callback;
		_db = (top.HEURIST.parameters.db? top.HEURIST.parameters.db : (top.HEURIST.database.name?top.HEURIST.database.name:''));

				if (isnull(grpID) && location.search.length > 1) {
									//window.HEURIST.parameters = top.HEURIST.parseParams(location.search);
									top.HEURIST.parameters = top.HEURIST.parseParams(location.search);

									grpID = top.HEURIST.parameters.grpID;

									_isSelection = (top.HEURIST.parameters.selection === "1");

									_setMode("selection", _isSelection);
									_setMode("listing", !_isSelection);

									//list of selected
									var sIDs = top.HEURIST.parameters.ids;
									if (sIDs) {
										_arr_selection = sIDs.split(',');
									}

				}

				_grpID = grpID;
				//////////////////// create data table

				//init listeners for filter controls
				_initListeners();

				//load list of groups
				_initGroupSelector(); //then it call _initTable([]);
	}

	/**
	* Creates and (re)fill datatable
	*/
	function _initTable(arr)
	{

	//if datatable exists, only refill ==========================
				if(!isnull(_myDataTable)){

					// all stuff is already inited, change livedata in datasource only
					_myDataSource.liveData = arr;

					//refresh table
					_myDataSource.sendRequest("", {
								success : _myDataTable.onDataReturnInitializeTable,
								failure : _myDataTable.onDataReturnInitializeTable,
								scope   : _myDataTable,
								argument : { pagination: { recordOffset: 0 } } // to jump to page 1
					});

					return;
				}

	//create new datatable ==========================

								_myDataSource = new YAHOO.util.LocalDataSource(arr, {
									responseType : YAHOO.util.DataSource.TYPE_JSARRAY,
									responseSchema : {
										fields: ["selection", "id", "name", "fullname", "email", "enabled", "organisation", "role"]
									},
									doBeforeCallback : function (req, raw, res, cb) {
										// This is the filter function
										var data  = res.results || [],
										filtered = [],
										i,l;

										if (req) {
											//parse request
											var fvals = req.split("|");

											var isBySelect = (fvals[0]==="0");
											var sByRole  = (fvals.length>1)?fvals[1]:"all";
											var sByName  = (fvals.length>2)?fvals[2].toLowerCase():"";

											for (i = 0, l = data.length; i < l; ++i)
											{
												if ((sByRole==="all" || data[i].role===sByRole) &&
												(data[i].name.toLowerCase().indexOf(sByName)>=0))
												{
													data[i].selection = (_arr_selection.indexOf(data[i].id)>=0);
													if(isBySelect || data[i].selection){
														filtered.push(data[i]);
													}
												}
											}
											res.results = filtered;
										}

										return res;
									}
								});

								var myColumnDefs = [
			{ key: "selection", label: "Sel", hidden:(!_isSelection), sortable:true, width:20,
				formatter:YAHOO.widget.DataTable.formatCheckbox, className:'center' },
			{ key: null, label: "Dis", sortable:false,  hidden:(_isSelection), width:20,
				formatter: function(elLiner, oRecord, oColumn, oData) {
					elLiner.innerHTML = (oRecord.getData('enabled')==="y")?"":"X";
			}},
			{ key: null, label: "Edit", sortable:false,  hidden:(_isSelection), width:20,
				formatter: function(elLiner, oRecord, oColumn, oData) {
elLiner.innerHTML = '<a href="#edit_user"><img src="../../common/images/edit_icon.png" width="16" height="16" border="0" title="Edit group" /><\/a>';}
			},
			{ key: "name", label: "<u>Name</u>", sortable:true,
				formatter: function(elLiner, oRecord, oColumn, oData){
					if(isempty(oRecord.getData('email'))){
						elLiner.innerHTML = oRecord.getData('name');
					}else{
						elLiner.innerHTML = '<a href="mailto:'+oRecord.getData('email')+
						'" title="'+oRecord.getData('email')+'">'+
						oRecord.getData('name')+'</a>';
					}
					}},
			{ key: "fullname", label: "Full name", sortable:false,
				formatter: function(elLiner, oRecord, oColumn, oData) {
					var str = oRecord.getData("fullname");
					var tit = "";
					if(isempty(str)){
						str = "";
					}else if (str.length>40) {
						tit = str;
						str = str.substr(0,40)+"&#8230";
					}
					elLiner.innerHTML = '<label title="'+tit+'">'+str+'</label>';
			}},
			{ key: "organisation", label: "Institution/Organisation", hidden:(_isSelection), sortable:true, width:200,
				formatter: function(elLiner, oRecord, oColumn, oData) {
					var str = oRecord.getData("organisation");
					var tit = "";
					if(isempty(str)){
						str = "";
					}else if (str.length>35) {
						tit = str;
						str = str.substr(0,35)+"&#8230";
					}
					elLiner.innerHTML = '<label title="'+tit+'">'+str+'</label>';
			}},

			{ key: "role2", label: "Role", sortable:false, hidden: true, width:70,
				formatter: function(elLiner, oRecord, oColumn, oData) {
							elLiner.innerHTML = oRecord.getData('role');
				}},
			{ key: "role", label: "Role", sortable:false, hidden: true, width:70,
				formatter:YAHOO.widget.DataTable.formatDropdown, dropdownOptions:_roles},
			{ key: "id", label: "Delete", width:20, sortable:false, hidden:(_isSelection || top.HEURIST.is_admin()),
				formatter: function(elLiner, oRecord, oColumn, oData) {
elLiner.innerHTML = '<a href="#delete_user"><img src="../../common/images/delete_icon.png" width="16" height="16" border="0" title="Delete this User" /><\/a>';
				}
			}
								];


		var myConfigs = {
									//selectionMode: "singlecell",
									paginator : new YAHOO.widget.Paginator({
										rowsPerPage: 100, // REQUIRED
										totalRecords: arr.length, // OPTIONAL
										containers: ['dt_pagination_top','dt_pagination_bottom'],
										// use a custom layout for pagination controls
										template: "{PageLinks}",  //" Show {RowsPerPageDropdown} per page",
										// show all links
										pageLinks: YAHOO.widget.Paginator.VALUE_UNLIMITED
										// use these in the rows-per-page dropdown
										//, rowsPerPageOptions: [100]
									})
		};

		_myDataTable = new YAHOO.widget.DataTable('tabContainer', myColumnDefs, _myDataSource, myConfigs);

		//
		// subscribe on datatable events
		//
		if(_isSelection){
			_myDataTable.subscribe("checkboxClickEvent", function(oArgs) {
									//YAHOO.util.Event.stopEvent(oArgs.event);
									var elCheckbox = oArgs.target;
									_toggleSelection(elCheckbox);
			});
		}

		//click on action images
		_myDataTable.subscribe('linkClickEvent', function(oArgs){


				var dt = this;
				var elLink = oArgs.target;
				var oRecord = dt.getRecord(elLink);
				var recID = oRecord.getData("id");

				if(elLink.hash === "#edit_user") {
					YAHOO.util.Event.stopEvent(oArgs.event);
					_editUser(recID);

				}else if(elLink.hash === "#delete_user"){

					YAHOO.util.Event.stopEvent(oArgs.event);

						var value = prompt("Enter \"DELETE\" if you really want to delete user '"+oRecord.getData('fullname')+"'");
						if(true || value === "DELETE") {

							function _updateAfterDelete(context) {

								if(isnull(context) || !context){
									alert("Unknown error on server side");
								}else if(isnull(context.error)){
									dt.deleteRow(oRecord.getId(), -1);
									alert("User #"+recID+" was deleted");
								} /*else {
									// if error is property of context it will be shown by getJsonData
									//alert("Deletion failed. "+context.error);
								}*/
							}

							var baseurl = top.HEURIST.baseURL + "admin/ugrps/saveUsergrps.php";
							var callback = _updateAfterDelete;
							var params = "method=deleteUser&db=" + _db + "&recID=" + recID;
							top.HEURIST.util.getJsonData(baseurl, callback, params);

						}
				}

		});

			// Subscribe to events for row selection
			_myDataTable.subscribe("rowMouseoverEvent", _myDataTable.onEventHighlightRow);
			_myDataTable.subscribe("rowMouseoutEvent", _myDataTable.onEventUnhighlightRow);
			if(_isSelection)
			{
			_myDataTable.subscribe("cellClickEvent", function(oArgs){

								//YAHOO.util.Event.stopEvent(oArgs.event);
								//var elTarget = oArgs.target;
								//var elTargetRow = _myDataTable.getTrEl(elTarget);
								var elTargetCell = oArgs.target;
								if(elTargetCell) {
									var oRecord = _myDataTable.getRecord(elTargetCell);
									//get first cell
									var cell = _myDataTable.getTdEl({record:oRecord, column:_myDataTable.getColumn("selection")});
									if(elTargetCell!==cell){
										var elCheckbox = cell.firstChild.firstChild;
										elCheckbox.checked = !elCheckbox.checked;
										_toggleSelection(elCheckbox);
									}
								}

								});//_myDataTable.onEventSelectRow);
			}

			//role selector handler
			_myDataTable.subscribe('dropdownChangeEvent', function(oArgs){

				if (isnull(_grpID)) { return; }

				var elDropdown = oArgs.target;
				var record = this.getRecord(elDropdown);
				var column = this.getColumn(elDropdown);
				var newValue = elDropdown.options[elDropdown.selectedIndex].value;
				var oldValue = record.getData(column.key);

				if(newValue!=="invitred" && newValue!=="request" && newValue!=oldValue)
				{
					var data = record.getData();
					data.role = newValue;

					//keep the track of changes in special object
					//TODO _updateUser(record);
					var baseurl = top.HEURIST.baseURL + "admin/ugrps/saveUsergrps.php";
					var params = "method=changeRole&db="+_db+"&recID=" + _grpID +
								"&oldrole=" + oldValue+
								"&role=" + newValue+"&recIDs="+encodeURIComponent(data.id);
					top.HEURIST.util.getJsonData(baseurl,
							((newValue==="delete")?_updateRoles:_updateRole), params);

				}
			});

			_updateFilter(); //fill table after creation

	}//end of initialization =====================


	/**
	*
	*/
	function _updateRole(context) {
		if(isnull(context) || !context) {
			alert("Server side error");
		}else if(context.error){
				alert("An error occurred trying to change role: "+context.error);
		}else if(context.errors && context.errors.length>0){
				alert("An error occurred trying to change role");
		}else{
			return true;
		}
		return false;
	}

	/**
	*
	*/
	function _updateRoles(context) {
		if(_updateRole(context)){
			_updateFilter();
		}
	}


	//
	//
	function clearHideTimer(){
		if (hideTimer) {
			window.clearTimeout(hideTimer);
			hideTimer = 0;
		}
	}
	function _hideToolTip(){
		if(needHideTip){
			currentTipId = null;
			clearHideTimer();
			var my_tooltip = $("#toolTip2");
			my_tooltip.css( {
				left:"-9999px"
			});
		}
	}
	/**
	* Show popup div with information
	* NOT USED
	*/
	function _showInfoToolTip(recID, event) {

				//tooltip div mouse out
				function __hideToolTip2() {
					needHideTip = true;
				}
				//tooltip div mouse over
				function __clearHideTimer2() {
					needHideTip = false;
					clearHideTimer();
				}

				var textTip = null;
				var forceHideTip = true;
				if(!isnull(recID)){
					if(currentTipId !== recID) {
						currentTipId = recID;

					} else {
						forceHideTip = false;
					}
				}
				if(!isnull(textTip)) {
					clearHideTimer();
					needHideTip = true;
					var my_tooltip = $("#toolTip2");

					my_tooltip.mouseover(__clearHideTimer2);
					my_tooltip.mouseout(__hideToolTip2);

					var xy = getMousePos(event);
					my_tooltip.html(textTip);  //DEBUG xy[0]+",  "+xy[1]+"<br/>"+

					showPopupDivAt(my_tooltip, xy);
					hideTimer = window.setTimeout(_hideToolTip, 5000);
				}
				else if(forceHideTip) {
					_hideToolTip();
				}

	}

	/**
	* Listener of checkbox in datatable
	* Adds or removes record  ID from array _arr_selection
	* Updates info label
	* @param elCheckbox - reference to checkbox element that is clicked
	*/
	function _toggleSelection(elCheckbox)
	{
									var newValue = elCheckbox.checked;
									var oRecord = _myDataTable.getRecord(elCheckbox);

									var data = oRecord.getData();
									data.selection = newValue;
									/* it works
									var recordIndex = this.getRecordIndex(oRecord);
									_myDataTable.updateRow(recordIndex, data);
									*/
									if(newValue){ //add
										if(_isSingleSelection){
											_arr_selection = [data.id];
											window.close(data.id);
										}else{//relmarker or resource
											_arr_selection.push(data.id);
										}

									}else{ //remove
										var ind = _arr_selection.indexOf(data.id);
										if(ind>=0){
											_arr_selection.splice(ind,1);
										}
									}

									lblSelect1.innerHTML = "<b>"+_arr_selection.length+"</b> users"+((_arr_selection.length>1)?"s":"");
									if(!isnull(lblSelect2)) {
										lblSelect2.innerHTML = lblSelect1.innerHTML;
									}
	}


	/**
	*
	*/
	var _updateGroupList = function (context) {

		_workgroups = context.workgroups;
		//_workgroupIDs = context.workgroupIDs;

		_handlerGroupSelector();
		_initTable([]);
	};

	/**
	* Fills the selector (combobox) with names of groups
	* @see _init
	*/
	function _initGroupSelector(){

			filterByGroup = Dom.get('inputFilterByGroup');

			var baseurl = top.HEURIST.baseURL + "admin/ugrps/loadUserGrps.php";
			var callback = _updateGroupList;
			var params = "method=searchgroup&db=" + _db;
			top.HEURIST.util.getJsonData(baseurl, callback, params);
	}

	/**
	*
	*/
	function _handlerGroupSelector(e)
	{
		if(!( _isSelection || isnull(_grpID) )){

			if(isnull(_workgroups[_grpID])){
				_grpID = null;
			}else{
			//if group id is defined as parameter - hide filter by group div
				var divfil = Dom.get("pnlFilterByGroup");
				divfil.style.display = "none";
				Dom.get("pnlGroupTitle").style.display = "block";
				Dom.get("lblGroupTitle").innerHTML = "USERS - members of '"+_workgroups[_grpID].name+"'";
				return;
			}
		}

		Dom.get("pnlGroupTitle").style.display = "none";

		if( _isSelection && !isnull(_grpID) && _grpID!=="all"){
			Dom.get("lblGroupTitleSelection").innerHTML = "Select and add users for group '"+_workgroups[_grpID].name+"'";
		}

		var sfilter;

		if(!isnull(e)) {
			sfilter = e.target.value.toLowerCase();
			if(sfilter.length<3) sfilter = null;
		}

		var grpID, grpName, option;

		//clear selection list
		while (filterByGroup.length>1){
				filterByGroup.remove(1);
		}

							// add
							for (grpID in _workgroups)
							{
								if(isnull(grpID) || grpID==="length"){
									continue;
								}

								grpName = _workgroups[grpID].name;

								if((isnull(sfilter) || (grpName.toLowerCase().indexOf(sfilter)>=0)) )
								{

									if(_isSelection && _grpID === grpID){
										continue; //exclude itself
									}

									option = document.createElement("option");
									option.text = grpName;
									option.value = grpID;
									try
									{
										// for IE earlier than version 8
										filterByGroup.add(option, filterByGroup.options[null]);
									}
									catch (e)
									{
										filterByGroup.add(option,null);
									}
								}
							} //for

		filterByGroup.onchange = _updateFilter;

	}

	/**
	* Listener of btnClearSelection
	* Empties _arr_selection array
	*/
	function _clearSelection(){
							_arr_selection = [];
							lblSelect1.innerHTML = "";
							if(!isnull(lblSelect2)) {lblSelect2.innerHTML = "";}
							_updateFilterLocal();
	}

	/**
	* Assign event listener for filte UI controls
	* @see _init
	*/
	function _initListeners()
	{
				filterByName = Dom.get('inputFilterByName');
				if(!isnull(filterByName)){
							filterByName.onkeyup = function (e) {
								if(filterTimeout===null){
									clearTimeout(filterTimeout);
									filterTimeout = setTimeout(_updateFilter, 600);
								}
							};
				}

				filterByDisable = Dom.get('inputFilterByEnable1');
				if(filterByDisable) { filterByDisable.onchange = _updateFilter; }
				filterByDisable = Dom.get('inputFilterByEnable2');
				if(filterByDisable) { filterByDisable.onchange = _updateFilter; }

				filterBySelection1 = Dom.get('inputFilterBySelection1');
				if(filterBySelection1) { filterBySelection1.onchange = _updateFilterLocal; }
				filterBySelection2 = Dom.get('inputFilterBySelection2');
				if(filterBySelection2) { filterBySelection2.onchange = _updateFilterLocal; }

				lblSelect1 = Dom.get('lblSelect1');
				lblSelect2 = Dom.get('lblSelect2');
				var btnClear = Dom.get('btnClearSelection');
				if(btnClear) { btnClear.onclick = _clearSelection; }


				filterByRole = Dom.get('inputFilterByRole');
				if(!isnull(filterByRole)) { filterByRole.onchange = _updateFilter; }


				var inputFilterGroup = Dom.get('inputFilterGroup');
				if(!isnull(inputFilterGroup)) { inputFilterGroup.onkeyup = _handlerGroupSelector; }

	} //end init listener

	/**
	* call new popup - to edit User
	*/
	function _editUser(user) {
		var URL = "";

		var userID = (!isnull(user))?Number(user):0;

		if(userID>0) {
			URL = top.HEURIST.basePath + "admin/ugrps/editUser.html?db=" + _db + "&recID="+userID;
		}
		else {
			URL = top.HEURIST.basePath + "admin/ugrps/editUser.html?db=" + _db;
		}
		top.HEURIST.util.popupURL(top, URL, {
			"close-on-blur": false,
			"no-resize": false,
			height: 560,
			width: 640,
			callback: function(context) {
				if(!isnull(context)){

					//update id
					var recID = Math.abs(Number(context.result[0]));

					//refresh table
					_updateFilter();

				}
			}
		});
	}

	/**
	* Opens popup for selection of existing user to current group
	*/
	function _findAndAddUser() {

		var url = top.HEURIST.baseURL + "admin/ugrps/manageUsers.html?db=" +
										_db + "&selection=1&grpID="+(isnull(_grpID)?filterByGroup.value:_grpID);

		top.HEURIST.util.popupURL(top, url,
		{   "close-on-blur": false,
			"no-resize": false,
			height: 600,
			width: 820,
			callback: function(usersSelected) {
				if(!isnull(usersSelected)){
//alert(usersSelected);

					var baseurl = top.HEURIST.baseURL + "admin/ugrps/saveUsergrps.php";
					var params = "method=changeRole&db="+_db+"&recID=" + _grpID +
								"&role=member&recIDs="+encodeURIComponent(usersSelected);
					top.HEURIST.util.getJsonData(baseurl, _updateRoles, params);


				}
			}
		});

	}

	/**
	* show either selection or listing controls
	*/
	function _setMode(className, val)
	{
		$("."+className).toggleClass(val?"activated":"deactivated", true);
		$("."+className).toggleClass(val?"deactivated":"activated", false);
	}


	//
	//public members
	//
	var that = {

				/**
				* Reinitialization of form for new detailtype
				* @param usrID - detail type id to work with
				* @param _callback - callback function that obtain 3 parameters all terms, disabled terms and usrID
				*/
				reinit : function (usrID, _callback) {
						_init(usrID, _callback);
				},

				/**
				 *	Apply form - close this window and returns comma separated list of selected detail types
				 */
				returnSelection : function () {
						var res = _arr_selection.join(",");

						if(_isWindowMode){
							window.close(res, _grpID);
						}else if (!isnull(_callback_func) ) {
							_callback_func(res, _grpID);
						}
				},

				/**
				 * Cancel form - closes this window
				 */
				cancel : function () {
					if(_isWindowMode){
						window.close();
					}else if (!isnull(_callback_func) ) {
						_callback_func();
					}
				},

				/**
				* @param user - userID or email
				*/
				editUser: function(user){ _editUser( user ); },

				findAndAddUser: function(){ _findAndAddUser(); },

				//not used
				showInfo: function(recID, event){ _showInfoToolTip( recID, event ); },
				hideInfo: function() { hideTimer = window.setTimeout(_hideToolTip, 1000); },

				getClass: function () {
					return _className;
				},

				isA: function (strClass) {
					return (strClass === _className);
				}

	};

	_init();  // initialize before returning
	return that;

}