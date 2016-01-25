
/**
* svs_edit.js : functions to edit and save saved searches (filters)
*
* @package     Heurist academic knowledge management system
* @link        http://HeuristNetwork.org
* @copyright   (C) 2005-2016 University of Sydney
* @author      Artem Osmakov   <artem.osmakov@sydney.edu.au>
* @author      Ian Johnson     <ian.johnson@sydney.edu.au>
* @license     http://www.gnu.org/licenses/gpl-3.0.txt GNU License 3.0
* @version     4
*/

/*
* Licensed under the GNU License, Version 3.0 (the "License"); you may not use this file except in compliance
* with the License. You may obtain a copy of the License at http://www.gnu.org/licenses/gpl-3.0.txt
* Unless required by applicable law or agreed to in writing, software distributed under the License is
* distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied
* See the License for the specific language governing permissions and limitations under the License.
*/

function hSvsEdit(args) {
    var _className = "SvsEdit",
    _version   = "0.4",
    edit_dialog = null,
    callback_method;

    const _NAME = 0, _QUERY = 1, _GRPID = 2;

    /**
    * Initialization
    */
    function _init(args) {
        //this.currentSearch = currentSearch;
    }

    /**
    * Assign values to UI input controls
    *
    * squery - need for new - otherwise it takes currentSearch
    * domain need for new
    *
    * return false if saved search and true if rules
    */
    function _fromDataToUI(svsID, squery, groupID){

        var $dlg = edit_dialog;
        if($dlg){
            $dlg.find('.messages').empty();

            var svs_id = $dlg.find('#svs_ID');
            var svs_name = $dlg.find('#svs_Name');
            var svs_query = $dlg.find('#svs_Query');
            var svs_ugrid = $dlg.find('#svs_UGrpID');
            var svs_rules = $dlg.find('#svs_Rules');
            var svs_notes = $dlg.find('#svs_Notes');
            //svs_query.parent().show();
            //svs_ugrid.parent().show();

            var selObj = svs_ugrid.get(0);
            top.HEURIST4.ui.createUserGroupsSelect(selObj, top.HAPI4.currentUser.usr_GroupsList,
                [{key:'bookmark', title:top.HR('My Bookmarks (private)')},
                    {key:'all', title:top.HR('My Filters (private)')},
                    {key:0, title:top.HR('Searches for guests')}],
                function(){
                    svs_ugrid.val(top.HEURIST4.util.isempty(groupID)?'all':groupID); //  top.HAPI4.currentUser.ugr_ID);
            });

            var isEdit = (parseInt(svsID)>0);
            var svs = null;
            if(isEdit){
                svs = top.HAPI4.currentUser.usr_SavedSearch[svsID];
            }

            if(isEdit && !top.HEURIST4.util.isnull(svs)){

                var request = top.HEURIST4.util.parseHeuristQuery(svs[_QUERY]);
                domain  = request.w;
                svs_ugrid.val(svs[_GRPID]==top.HAPI4.currentUser.ugr_ID ?domain:svs[_GRPID]);

                svs_ugrid.parent().hide();
                //svs_ugrid.attr('disabled', true);

                svs_id.val(svsID);
                svs_name.val(svs[_NAME]);
                svs_query.val( $.isArray(request.q)?JSON.stringify(request.q):request.q );
                svs_rules.val( request.rules );
                svs_notes.val( request.notes );


            }else{ //add new saved search
                isEdit = false;
                svsID = -1;

                svs_id.val('');
                svs_name.val('');
                svs_rules.val('');
                svs_notes.val('');
                svs_ugrid.parent().show();

                //var domain = 'all';

                if(top.HEURIST4.util.isArray(squery)) { //this is RULES!!!
                    svs_rules.val(JSON.stringify(squery));
                    svs_query.val('');

                } else if( squery && (squery.q || squery.rules) ) {

                    svs_query.val( top.HEURIST4.util.isempty(squery)?'': ($.isArray(squery.q)?JSON.stringify(squery.q):squery.q) );
                    svs_rules.val( top.HEURIST4.util.isArray(squery.rules)?JSON.stringify(squery.rules):squery.rules );

                } else if(!top.HEURIST4.util.isempty(squery)){
                    svs_query.val( squery );
                } else {
                    svs_query.val( '' );
                }

                // TODO: remove this code if no longer needed
                //svs_ugrid.val('all');
                //fill with list of Workgroups in case non bookmark search
                /*var selObj = svs_ugrid.get(0);
                if(domain=="bookmark"){
                    svs_ugrid.empty();
                    top.HEURIST4.ui.addoption(selObj, 'bookmark', top.HR('My Bookmarks'));
                }else{
                    svs_ugrid.val(domain);
                }*/
                //svs_ugrid.parent().show();
                svs_ugrid.attr('disabled', !top.HEURIST4.util.isempty(groupID));
            }

            var isRules = top.HEURIST4.util.isempty(svs_query.val()) && !top.HEURIST4.util.isempty(svs_rules.val());

            if(isRules){
                svs_query.parent().hide();
                return true;
            }else{
                svs_query.parent().show();
                return false;
            }

        }
    }

    /**
    * Show faceted search wizard
    *
    * @param params
    */
    function _showSearchFacetedWizard ( params ){

        if($.isFunction($('body').search_faceted_wiz)){ //already loaded
            showSearchFacetedWizard(params);  //this function from search_faceted_wiz.js
        }else{
            $.getScript(top.HAPI4.basePathV4+'hclient/widgets/search/search_faceted_wiz.js', function(){ showSearchFacetedWizard(params); } );
        }

    }

    //
    //
    //
    function _editRules(ele_rules, squery, groupID) {

       var that = this;

        var url = top.HAPI4.basePathV4+ "hclient/framecontent/ruleBuilderDialog.php?db=" + top.HAPI4.database;
        if(!top.HEURIST4.util.isnull(ele_rules)){
            url = url + '&rules=' + encodeURIComponent(ele_rules.val());
        }

        top.HEURIST4.msg.showDialog(url, { width:1200, height:600, title:'Ruleset Editor', callback:
            function(res){
                if(!top.HEURIST4.util.isempty(res)) {

                    if(res.mode == 'save') {
                        if(top.HEURIST4.util.isnull(ele_rules)){ //call from resultListMenu - create new rule

                             //replace rules
                             if(!top.HEURIST4.util.isObject(squery)){
                                squery = top.HEURIST4.util.parseHeuristQuery(squery);
                             }
                             squery.rules = res.rules;
                             //squery = top.HEURIST4.util.composeHeuristQuery(params.q, params.w, res.rules, params.notes);

                            //mode, groupID, svsID, squery, callback
                            _showDialog('saved', groupID, null, squery ); //open new dialog
                        }else{
                            ele_rules.val( JSON.stringify(res.rules) ); //assign new rules
                        }
                    }
                }
        }});


    }

    /**
    * put your comment there...
    *
    * @param svsID
    * @param squery
    * @param mode - faceted, rules or saved
    * @param callback
    */
    function _showDialog( mode, groupID, svsID, squery, callback ){

        if(parseInt(svsID)>0){
            var svs = top.HAPI4.currentUser.usr_SavedSearch[svsID];
            if(top.HEURIST4.util.isnull(svs)){
                top.HEURIST4.msg.showMsgDlg(top.HR('Cannot initialise edit for this saved search. '
                    +'It does not belong to your group'), null, "Error");
                return;
            }
        }


        if(callback){
            callback_method = callback;
        }

        if (mode == 'faceted'){

            var facet_params = {};
            if(svsID>0){
                var svs = top.HAPI4.currentUser.usr_SavedSearch[svsID];
                if(svs){
                    try {
                        facet_params = $.parseJSON(svs[_QUERY]);
                    }
                    catch (err) {
                        // TODo something about the exception here
                        top.HEURIST4.msg.showMsgDlg(top.HR('Cannot initialise edit for faceted search due to corrupted parameters. Please remove and re-create this search.'), null, "Error");
                        return;
                    }
                }
            }

            _showSearchFacetedWizard( {svsID:svsID, domain:groupID, params:facet_params, onsave: callback_method });
            //function(event, request){   that._updateAfterSave(request, 'faceted');

        }else if (mode == 'rules' && top.HEURIST4.util.isnull(svsID)){ //it happens for new rules only


            if(top.HEURIST4.util.isnull(squery)) squery = {};
             squery.q = ''; // from rule builder we always save pure query only
             _editRules(null, squery, groupID);

        }else if(null == edit_dialog){
            //create new dialog

            var $dlg = edit_dialog = $( "<div>" ).addClass('ui-heurist-bg-light').appendTo(  $('body') );

            //load edit dialogue
            $dlg.load(top.HAPI4.basePathV4+"hclient/widgets/search/svs_edit.html?t="+(new Date().time), function(){

                //find all labels and apply localization
                $dlg.find('label').each(function(){
                    $(this).html(top.HR($(this).html()));
                })

                $dlg.find("#svs_btnset").css({'width':'20px'}).position({my: "left top", at: "right+4 top", of: $dlg.find('#svs_Rules') });

                $dlg.find("#svs_Rules_edit")
                .button({icons: {primary: "ui-icon-pencil"}, text:false})
                .attr('title', top.HR('Edit Rule Set'))
                .css({'height':'16px', 'width':'16px'})
                .click(function( event ) {
                    //that.
                    _editRules( $dlg.find('#svs_Rules'), '', groupID );
                });

                $dlg.find("#svs_Rules_clear")
                .button({icons: {primary: "ui-icon-close"}, text:false})
                .attr('title', top.HR('Clear Rule Set'))
                .css({'height':'16px', 'width':'16px'})
                .click(function( event ) {
                    $dlg.find('#svs_Rules').val('');
                });

                var allFields = $dlg.find('input, textarea');

                //that.
                var isRules = _fromDataToUI(svsID, squery, groupID);

                function __doSave(){   //save search

                    var message = $dlg.find('.messages');
                    var svs_id = $dlg.find('#svs_ID');
                    var svs_name = $dlg.find('#svs_Name');
                    var svs_query = $dlg.find('#svs_Query');
                    var svs_ugrid = $dlg.find('#svs_UGrpID');
                    var svs_rules = $dlg.find('#svs_Rules');
                    var svs_notes = $dlg.find('#svs_Notes');

                    allFields.removeClass( "ui-state-error" );

                    var bValid = top.HEURIST4.msg.checkLength( svs_name, "Name", message, 3, 30 );

                    if(bValid){

                        var bOk = top.HEURIST4.msg.checkLength( svs_query, "Query", null, 1 );
                        if(!bOk) bOk = top.HEURIST4.msg.checkLength( svs_rules, "Rules", null, 1 );
                        if(!bOk){
                            message.text("Define query, rules or both.");
                            message.addClass( "ui-state-highlight" );
                            setTimeout(function() {
                                message.removeClass( "ui-state-highlight", 1500 );
                                }, 500 );
                            bValid = false;
                        }
                    }

                    if(bValid){

                        var svs_ugrid = svs_ugrid.val();

                        var domain = 'all';
                        if(svs_ugrid=="all" || svs_ugrid=="bookmark"){
                            domain = svs_ugrid;
                            svs_ugrid = top.HAPI4.currentUser.ugr_ID;
                            //if(domain!="all"){query_to_save.push('w='+domain);}
                        }

                        /*if(top.HEURIST4.util.isempty(svs_query.val()) && !top.HEURIST4.util.isempty(svs_rules.val())){   //PURE RULE SET
                            domain = 'rules';
                            svs_ugrid = top.HAPI4.currentUser.ugr_ID; //@todo!!!! it may by rule accessible by guest
                        }*/

                        var request = {  //svs_ID: svsID, //?svs_ID:null,
                            svs_Name: svs_name.val(),
                            svs_Query: top.HEURIST4.util.composeHeuristQuery(svs_query.val(), domain, svs_rules.val(), svs_notes.val()),
                            svs_UGrpID: svs_ugrid,
                            domain:domain};

                        var isEdit = ( parseInt(svs_id.val()) > 0 );
                        if(isEdit){
                            request.svs_ID = svs_id.val();
                        }

                        //
                        top.HAPI4.SystemMgr.ssearch_save(request,
                            function(response){
                                if(response.status == top.HAPI4.ResponseStatus.OK){

                                    var svsID = response.data;

                                    if(!top.HAPI4.currentUser.usr_SavedSearch){
                                        top.HAPI4.currentUser.usr_SavedSearch = {};
                                    }

                                    top.HAPI4.currentUser.usr_SavedSearch[svsID] = [request.svs_Name, request.svs_Query, request.svs_UGrpID];

                                    $dlg.dialog( "close" );

                                    request.new_svs_ID = svsID;

                                    callback_method.call(that, null, request);
                                    //@todo that._updateAfterSave(request, 'saved');


                                }else{
                                    message.addClass( "ui-state-highlight" );
                                    message.text(response.message);
                                }
                            }

                        );

                    }
                }

                allFields.on("keypress",function(event){
                    var code = (event.keyCode ? event.keyCode : event.which);
                    if (code == 13) {
                        __doSave();
                    }
                });


                $dlg.dialog({
                    autoOpen: false,
                    height: 475,
                    width: 450,
                    modal: true,
                    resizable: false,
                    title: top.HR(isRules?'Edit Rule Set':'Edit saved filter criteria'),
                    buttons: [
                        {text:top.HR('Save'), click: __doSave},
                        {text:top.HR('Cancel'), click: function() {
                            $( this ).dialog( "close" );
                        }}
                    ],
                    close: function() {
                        allFields.val( "input, textarea" ).removeClass( "ui-state-error" );
                    }
                });

                $dlg.dialog("open");
                $dlg.parent().addClass('ui-dialog-heurist');

            });
        }else{
            //show dialogue
            var isRules = _fromDataToUI(svsID, squery, groupID);
            edit_dialog.dialog("option",'title', top.HR(isRules?'Edit Rule Set':'Edit saved filter criteria'));
            edit_dialog.dialog("open");
        }

    } //end  _showDialog


    //public members
    var that = {

        getClass: function () {return _className;},
        isA: function (strClass) {return (strClass === _className);},
        getVersion: function () {return _version;},

        remove: function () {
            //remove edit dialog from body
            edit_dialog.remove();
            edit_dialog = null;
        },

        show: function( mode, groupID, svsID, squery, callback ) {
            _showDialog( mode, groupID, svsID, squery, callback );
        }

    }

    _init(args);
    return that;  //returns object
}
