
$(function() {
    
$("#div-progress").hide();
    
var select_rectype = $("#sa_rectype");
createRectypeSelect( select_rectype.get(0), null, 'Select record type' );

var allowed = Object.keys(top.HEURIST.detailTypes.lookups);
allowed.splice(allowed.indexOf("separator"),1);
allowed.splice(allowed.indexOf("relmarker"),1);

select_rectype.change(function (event){
    var rectype = (event)?Number(event.target.value):0;
    var select_fieldtype = $('select[id^="sa_dt_"]');
    select_fieldtype.each(function() {
        createRectypeDetailSelect(this, rectype, allowed, 
            [{key:'',title:'...'},{key:'id',title:'Record ID'},{key:'url',title:'Record URL'},{key:'notes',title:'Record Notes'}], false);
    });
});

getValues(0);

//initvalues
if(!top.HEURIST.util.isnull(form_vals.sa_rectype)){
    select_rectype.val(form_vals.sa_rectype).change();
    
    for (var key in form_vals){
        if(key.indexOf('sa_dt_')==0 && form_vals[key]!=''){
            $('#cb'+key).attr('checked', true);
            $('#'+key).parent().show();
            $('#'+key).val(form_vals[key]);
        }
    }
}

});

function update_counts(added, updated, total){
    $("#div-progress2").html("adde: "+added+" updated:"+updatred+"  total:"+total);
}

//
function doImport(){
    $("#input_step").val(3);
    document.forms[0].submit();
}

//
function hideFtSelect(ind){
    $sel = $('#sa_dt_'+ind);
    if($sel.parent().is(":visible")){
        $sel.val('');
        $sel.parent().hide();
    }else{
        $sel.parent().show();
    }
}

function showError(){
    
    $d1 = $('#main_1');
    $d2 = $('#main_2');
    
    if($d1.is(":visible")){
        $d1.hide();
        $d2.show();
    }else{
        $d2.hide();
        $d1.show();
    }
    
}

// load values for record
function getValues(dest){
    if(dest==0){
        currentId=1;
    }else if(dest==recCount){
        currentId=recCount;
    }else{
        currentId = currentId + dest;
        if(currentId<1) {
            currentId=1;   
        }else if (currentId>recCount){
            currentId = recCount;
        }
    }
    
                 $.ajax({
                         url: top.HEURIST.basePath+'import/delimited/importCSV.php',
                         type: "POST",
                         data: {recid: currentId, table:currentTable, db:currentDb},
                         dataType: "json",
                         cache: false,
                         error: function(jqXHR, textStatus, errorThrown ) {
                              alert('Error connecting server '+textStatus);
                         },
                         success: function( response, textStatus, jqXHR ){
                             if(response){
                                var i;
                                for(i=1; i<response.length;i++){
                                    if($("#impval"+(i-1)).length>0)
                                        $("#impval"+(i-1)).html(response[i]);    
                                }
                             }
                         }
                     });
    
}

//
function verifyData()
{
    var rectype = $("#sa_rectype").val();
    if(rectype>0){

        var select_fieldtype = $('select[id^="sa_dt_"][value!=""]');
        if(select_fieldtype.length>0){
            
            return true;
            
        }else{
            alert("Select at least one field type!");
        }

        
    }else{
        alert("Select record type!");
    }

    return false;
}

//
function createSelector(selObj, topOptions) {
        if(selObj==null){
            selObj = document.createElement("select");
        }else{
            $(selObj).empty();
        }
        
        if(top.HEURIST.util.isArray(topOptions)){
            var idx;
            if(topOptions){  //list of options that must be on top of list
                for (idx in topOptions)
                {
                    if(idx){
                        var key = topOptions[idx].key;
                        var title = topOptions[idx].title;
                        if(!top.HEURIST.util.isnull(title))
                        {
                             if(!top.HEURIST.util.isnull(topOptions[idx].optgroup)){
                                var grp = document.createElement("optgroup");
                                grp.label =  title;
                                selObj.appendChild(grp);
                             }else{
                                top.HEURIST.util.addoption(selObj, key, title);    
                             }
                             
                        }
                    }
                }
            }        
        }else if(!top.HEURIST.util.isempty(topOptions)){
           top.HEURIST.util.addoption(selObj, '', topOptions); 
        }
        
        
        return selObj;
}
    
function createRectypeSelect(selObj, rectypeList, topOptions) {

        createSelector(selObj, topOptions);

        var rectypes = top.HEURIST.rectypes,
            index;

        if(!rectypes) return selObj;


        if(rectypeList){

            if(!top.HEURIST.util.isArray(rectypeList)){
                   rectypeList = rectypeList.split(',');
            }

            for (var idx in rectypeList)
            {
                if(idx){
                    var rectypeID = rectypeList[idx];
                    var name = rectypes.names[rectypeID];
                    if(!top.HEURIST.util.isnull(name))
                    {
                         top.HEURIST.util.addoption(selObj, rectypeID, name);
                    }
                }
            }
        }else{
            for (index in rectypes.groups){
                    if (index == "groupIDToIndex" ||
                      rectypes.groups[index].showTypes.length < 1) {
                      continue;
                    }
                    var grp = document.createElement("optgroup");
                    grp.label = rectypes.groups[index].name;
                    selObj.appendChild(grp);

                    for (var recTypeIDIndex in rectypes.groups[index].showTypes)
                    {
                          var rectypeID = rectypes.groups[index].showTypes[recTypeIDIndex];
                          var name = rectypes.names[rectypeID];

                          if(!top.HEURIST.util.isnull(name)){
                                var opt = top.HEURIST.util.addoption(selObj, rectypeID, name);
                          }
                    }
            }
        }

        return selObj;
}

function createRectypeDetailSelect(selObj, rectype, allowedlist, topOptions, showAll) {

        createSelector(selObj, topOptions);
        
        var dtyID, details;

        if(Number(rectype)>0){
            //structure not defined 
            if(!(top.HEURIST.rectypes && top.HEURIST.rectypes.typedefs)) return selObj;
            var rectypes = top.HEURIST.rectypes.typedefs[rectype];
            
            if(!rectypes) return selObj;
            details = rectypes.dtFields;
            
            var fi = top.HEURIST.rectypes.typedefs.dtFieldNamesToIndex['rst_DisplayName'],
                fit = top.HEURIST.rectypes.typedefs.dtFieldNamesToIndex['dty_Type'];
            
            var arrterm = [];
            
            for (dtyID in details){
               if(dtyID){

                   if(allowedlist==null || allowedlist.indexOf(details[dtyID][fit])>=0)
                   {
                          var name = details[dtyID][fi];

                          if(!top.HEURIST.util.isnull(name)){
                                arrterm.push([dtyID, name]);
                          }
                   }
               }
            }
            
            //sort by name
            arrterm.sort(function (a,b){ return a[1]<b[1]?-1:1; });
            //add to select
            var i=0, cnt= arrterm.length;
            for(;i<cnt;i++) {
                top.HEURIST.util.addoption(selObj, arrterm[i][0], arrterm[i][1]);  
            }
            
        }else if(showAll){ //show all detail types
        
            if(!top.HEURIST.detailTypes) return selObj;
            
            var detailtypes = top.HEURIST.detailTypes;
            var fit = detailtypes.typedefs.fieldNamesToIndex['dty_Type'];
            
            
            for (index in detailtypes.groups){
                    if (index == "groupIDToIndex" ||
                      detailtypes.groups[index].showTypes.length < 1) {   //ignore empty group
                      continue;
                    }
                    
                    var arrterm = [];

                    for (var dtIDIndex in detailtypes.groups[index].showTypes)
                    {
                          var detailID = detailtypes.groups[index].showTypes[dtIDIndex];
                          if(allowedlist==null || allowedlist.indexOf(detailtypes.typedefs[detailID].commonFields[fit])>=0)
                          {
                              var name = detailtypes.names[detailID];

                              if(!top.HEURIST.util.isnull(name)){
                                    arrterm.push([detailID, name]);
                              }
                          }
                    }
                    
                    if(arrterm.length>0){
                        var grp = document.createElement("optgroup");
                        grp.label = detailtypes.groups[index].name;
                        selObj.appendChild(grp);
                        //sort by name
                        arrterm.sort(function (a,b){ return a[1]<b[1]?-1:1; });
                        //add to select
                        var i=0, cnt= arrterm.length;
                        for(;i<cnt;i++) {
                            top.HEURIST.util.addoption(selObj, arrterm[i][0], arrterm[i][1]);  
                        }
                    }
                    
            }
            
        }


        return selObj;
}
