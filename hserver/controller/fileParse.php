<?php
    /**
    *  CSV parser for content from client side
    *
    * @package     Heurist academic knowledge management system
    * @link        http://HeuristNetwork.org
    * @copyright   (C) 2005-2015 University of Sydney
    * @author      Artem Osmakov   <artem.osmakov@sydney.edu.au>
    * @license     http://www.gnu.org/licenses/gpl-3.0.txt GNU License 3.0
    * @version     4.0
    */

    /*
    * Licensed under the GNU License, Version 3.0 (the "License"); you may not use this file except in compliance
    * with the License. You may obtain a copy of the License at http://www.gnu.org/licenses/gpl-3.0.txt
    * Unless required by applicable law or agreed to in writing, software distributed under the License is
    * distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied
    * See the License for the specific language governing permissions and limitations under the License.
    */
require_once(dirname(__FILE__)."/../System.php");
require_once (dirname(__FILE__).'/../dbaccess/dbSysImportSessions.php');
require_once (dirname(__FILE__).'/../dbaccess/db_structure.php');
set_time_limit(0);
    
$response = null;

$system = new System();

if(!$system->init(@$_REQUEST['db'])){
    //get error and response
    $response = $system->getError();
}else{
    
   if(!$system->is_admin()){
        $response = $system->addError(HEURIST_REQUEST_DENIED);
   }else{
       
        $action = @$_REQUEST["action"];
        $res = false;        
        
        if($action=='step0'){   
            $res = parse_step0();  //save csv data in temp file
        }else if($action=='step1'){   
            $res = parse_step1();  //encode and invoke parse_prepare with limit
        }else if($action=='step2'){
            $res = parse_step2($_REQUEST["encoded_filename"], $_REQUEST["original_filename"], 0); 
        //}else if($action=='save'){
        // 3$res = parse_db_save();
        }else if($action=='step3'){ // matching - assign record ids
        
            $res = assignRecordIds($_REQUEST); 
            
//error_log(print_r($res,true));            
        
        }else if($action=='step4'){ // import
        
        
        }else if(@$_REQUEST['content']){    
            $res = parse_content(); 
        }else{
            $system->addError(HEURIST_INVALID_REQUEST, "Action parameter is missed or wrong");                
            $res = false;
        }
        
        
        if(is_bool($res) && !$res){
                $response = $system->getError();
        }else{
                $response = array("status"=>HEURIST_OK, "data"=> $res);
        }
   }
}

header('Content-type: application/json;charset=UTF-8');

//DEBUG error_log('RESP'.json_encode($response)); 
print json_encode($response);
exit();
//--------------------------------------

// parse_step0   save content into file
//  0a) csv content -> $upload_file_name     returns to client only filename 
//  0b) in UploadHandler uploaded file -> $upload_file_name

// parse_step1 - check encoding, save file in new encoding invoke parse_prepare with limit
// 1) encode file into UTF8  returns  $encoded_file_name (may be the same as $upload_file_name)
// 

// parse_step2 - read file, remove spaces, convert dates, validate identifies, find memo and multivalues, save file or return preview array
// get full path to file in UTF8


// parse_db_save - save file into table

function parse_step0(){
    global $system;
        $content = @$_REQUEST['data'];
        if(!$content){
            $system->addError(HEURIST_INVALID_REQUEST, "Parameter 'data' is missed");                
            return false;
        }
    
        $upload_file_name = tempnam(HEURIST_FILESTORE_DIR.'scratch/', 'csv');

        $res = file_put_contents($upload_file_name, trim($content));
        unset($content);
        if(!$res){
            $system->addError(HEURIST_UNKNOWN_ERROR, 'Cant save temporary file '.$upload_file_name);                
            return false;
        }
        
        $path_parts = pathinfo($upload_file_name);
        
        return array( "filename"=>$path_parts['basename'] );
}
//
// check encoding, save file in new encoding  and parse first 100 lines 
//
function parse_step1(){
    
    global $system;
    
    $upload_file_name = HEURIST_FILESTORE_DIR.'scratch/'.$_REQUEST["upload_file_name"];
    $original_filename =  $_REQUEST["upload_file_name"];
    
    $csv_encoding  = $_REQUEST["csv_encoding"];

    $handle = @fopen($upload_file_name, "r");
    if (!$handle) {
        $s = null;
        if (! file_exists($upload_file_name)) $s = ' does not exist';
        else if (! is_readable($upload_file_name)) $s = ' is not readable';
            else $s = ' could not be read';
            
        if($s){
            $system->addError(HEURIST_UNKNOWN_ERROR, 'Temporary file (uploaded csv data) '.$upload_file_name. $s);                
            return false;
        }
    }

    //fgetcsv и str_getcsv depends on server locale
    // it is possible to set it in  /etc/default/locale (Debian) or /etc/sysconfig/i18n (CentOS)  LANG="en_US.UTF-8"
    setlocale(LC_ALL, 'en_US.utf8');
    
    // read header
    $line = fgets($handle, 1000000);
    fclose($handle);
    if(!$line){
        return "Empty header line";
    }

    //detect encoding and convert entire file to UTF8
    if( $csv_encoding!='UTF-8' || !mb_check_encoding( $line, 'UTF-8' ) ){

        $line = mb_convert_encoding( $line, 'UTF-8', $csv_encoding);
        if(!$line){
            return 'Your file can\'t be converted to UTF-8. '
            .'Please open it in any advanced editor and save with UTF-8 text encoding';
        }

        $content = file_get_contents($upload_file_name);
        $content = mb_convert_encoding( $content, 'UTF-8' );
        if(!$content){
            return 'Your file can\'t be converted to UTF-8. '
            .'Please open it in any advanced editor and save with UTF-8 text encoding';
        }
        
        $encoded_file_name = tempnam(HEURIST_FILESTORE_DIR.'scratch/', $original_filename);
        $res = file_put_contents($encoded_file_name, $content);
        unset($content);
        if(!$res){
            return 'Cant save temporary file (with UTF-8 encoded csv data) '.$encoded_file_name;
        }
    }else{
        $encoded_file_name = $upload_file_name; 
    }
    unset($line);
  
    return parse_step2($encoded_file_name, $original_filename, 100);
}

//
// read file, remove spaces, convert dates, validate identifies, find memo and multivalues
// $encoded_filename - csv data in UTF8 - full path
// $original_filename - originally uploaded filename 
//
function parse_step2($encoded_filename, $original_filename, $limit){

    global $system;
    
    $err_colnums = array();
    $err_encoding = array();
    $err_keyfields = array();
    
    $memos = array();  //multiline fields
    $multivals = array();
    $values = array();
    $keyfields  = @$_REQUEST["keyfield"];
    $datefields = @$_REQUEST["datefield"];
    $memofields = @$_REQUEST["memofield"];
    
    if(!$keyfields) $keyfields = array();
    if(!$datefields) $datefields = array();
    if(!$memofields) $memofields = array();
    
    $check_datefield = count($datefields)>0;
    $check_keyfield = count($keyfields)>0;

    $csv_mvsep     = $_REQUEST["csv_mvsep"];
    $csv_delimiter = $_REQUEST["csv_delimiter"];
    $csv_linebreak = $_REQUEST["csv_linebreak"];
    $csv_enclosure = ($_REQUEST["csv_enclosure"]==1)?"'":'"';
    $csv_dateformat = $_REQUEST["csv_dateformat"];

    if($csv_delimiter=="tab") {
        $csv_delimiter = "\t";
    }

    if($csv_linebreak=="auto"){
        ini_set('auto_detect_line_endings', true);
        $lb = null;
    }else if($csv_linebreak="win"){
        $lb = "\r\n";
    }else if($csv_linebreak="nix"){
        $lb = "\n";
    }else if($csv_linebreak="mac"){
        $lb = "\r";
    }
    
    $handle_wr = null;
    $handle = @fopen($encoded_filename, "r");
    if (!$handle) {
        $s = null;
        if (! file_exists($encoded_filename)) $s = ' does not exist';
        else if (! is_readable($encoded_filename)) $s = ' is not readable';
            else $s = ' could not be read';
            
        if($s){
            $system->addError(HEURIST_UNKNOWN_ERROR, 'Temporary file '.$encoded_filename. $s);                
            return false;
        }
    }
    
    //fgetcsv и str_getcsv depends on server locale
    // it is possible to set it in  /etc/default/locale (Debian) or /etc/sysconfig/i18n (CentOS)  LANG="en_US.UTF-8"
    setlocale(LC_ALL, 'en_US.utf8');    

    $len = 0;
    $header = null;

    if($limit==0){
        //get filename for prepared filename with converted dates and removed spaces
        $prepared_filename = tempnam(HEURIST_FILESTORE_DIR.'scratch/', $encoded_filename);  //HEURIST_SCRATCHSPACE_DIR
        if (!is_writable($prepared_filename)) {
            return "Cannot save prepared csv data: $prepared_filename";
        }
        if (!$handle_wr = fopen($prepared_filename, 'w')) {
            return "Cannot open file to save prepared csv data: $prepared_filename";
        }
    }

    $line_no = 0;
    while (!feof($handle)) {

        if($csv_linebreak=="auto" || $lb==null){
            $line = fgets($handle, 1000000);      //read line and auto detect line break
        }else{
            $line = stream_get_line($handle, 1000000, $lb);
        }

        if(count($err_encoding)<100 && !mb_detect_encoding($line, 'UTF-8', true)){
            array_push($err_encoding, array("no"=>$line_no, "line"=>htmlspecialchars(substr($line,0,2000))));
            //if(count($err_encoding)>100) break;
        }

        $fields = str_getcsv ( $line, $csv_delimiter, $csv_enclosure );// $escape = "\\"

        if($len==0){
            $header = $fields;
            $len = count($fields);
            
            if($len>200){
                fclose($handle);
                if($handle_wr) fclose($handle_wr);
                return "Too many columns ".$len."  This probably indicates that you have selected the wrong separator type.";
            }            
        }else{
            $line_no++;

            if(trim($line)=="") continue;

            if($len!=count($fields)){        //number of columns differs from header
                // Add error to log if wrong field count
                array_push($err_colnums, array("cnt"=>count($fields), "no"=>$line_no, "line"=>htmlspecialchars(substr($line,0,2000))));
                if(count($err_colnums)>100) break; //too many mistakes
            }else{
                $k=0;
                $newfields = array();
                $line_values = array();
                foreach($fields as $field){

                    //Identify repeating value fields and flag - will not be used as key fields
                    if( !in_array($k, $multivals) && strpos($field, '|')!==false ){
//DEBUG error_log('Line '.$line_no.'  '.$field.'  '.strpos($field, '|').'  field '.$k.' is multivalue');
                        array_push($multivals, $k);
                    }
                    if( !in_array($k, $memos) && (in_array($k, $memofields) || strlen($field)>250 || strpos($field, '\\r')!==false) ){
                        array_push($memos, $k);
                    }

                    //Remove any spaces at start/end of fields (including potential memos) & any redundant spaces in field that is not multi-line
                    if(in_array($k, $memos)){
                        $field = trim($field);
                    }else{
                        $field = trim(preg_replace('/([\s])\1+/', ' ', $field)); 
                    }

                    //Convert dates to standardised format.
                    if($check_datefield && @$datefields['field_'.$k]!=null && $field!=""){
                        if(is_numeric($field) && abs($field)<99999){ //year????

                        }else{
                            if($csv_dateformat==1){
                                $field = str_replace("/","-",$field);
                            }
                            $field = strtotime($field);
                            $field = date('Y-m-d H:i:s', $field);
                        }
                    }
                    if($check_keyfield && @$keyfields['field_'.$k]!=null){
                        
                         if(!ctype_digit(strval($field))){ //is_integer
                            //not integer
                            if(is_array(@$err_keyfields[$k])){
                                $err_keyfields[$k][1]++;
                            }else{
                                $err_keyfields[$k] = array(0,1);
                            }
                        }else if(intval($field)<1 || intval($field)>2147483646){ //max int value in mysql
                                if(is_array(@$err_keyfields[$k])){  //out of range
                                    $err_keyfields[$k][0]++;
                                }else{
                                    $err_keyfields[$k] = array(1,0);
                                }
                        }
                        
                    }


                    //Doubling up as an escape for quote marks
                    $field = addslashes($field);
                    array_push($line_values, $field);
                    $field = '"'.$field.'"';
                    array_push($newfields, $field);
                    $k++;
                }

                if ($handle_wr){
                    $line = implode(',', $newfields)."\n";

                    if (fwrite($handle_wr, $line) === FALSE) {
                        return "Cannot write to file $prepared_filename";
                    }
                    
                }else {
                    array_push($values, $line_values);
                    if($line_no>$limit){
                        break; //for preview
                    }
                }
            }
        }

    }
    fclose($handle);
    if($handle_wr) fclose($handle_wr);

    //???? unlink($encoded_filename);

    if($limit>0){
        // returns encoded filename
        return array( 
                "encoded_filename"=>$encoded_filename,   //full path
                "original_filename"=>$original_filename, //filename only
                "step"=>1, "col_count"=>$len, 
                "err_colnums"=>$err_colnums, 
                "err_encoding"=>$err_encoding, 
                "fields"=>$header, "values"=>$values );    
    }else{
      
        if( count($err_colnums)>0 || count($err_encoding)>0 || count($err_keyfields)>0){
            //we have errors - delete prepared file
            unlink($prepared_filename);
            
            return array( "step"=>2, "col_count"=>$len, 
                "err_colnums"=>$err_colnums, 
                "err_encoding"=>$err_encoding, 
                "err_keyfields"=>$err_keyfields, 
                "memos"=>$memos, "multivals"=>$multivals, "fields"=>$header );    
        }else{
            //everything ok - proceed to save into db
            
            $preproc = array();
            $preproc['prepared_filename'] = $prepared_filename;
            $preproc['encoded_filename']  = $encoded_filename;
            $preproc['original_filename'] = $original_filename;  //filename only
            $preproc['fields'] = $header;
            $preproc['memos']  = $memos;
            $preproc['multivals'] = $multivals;
            $preproc['keyfields'] = $keyfields; //indexes => "field_3":"10",
            
            $preproc['csv_enclosure'] = $csv_enclosure;
            $preproc['csv_mvsep'] = $csv_mvsep;            
           
            $res = parse_db_save($preproc);
            if($res!==false){
                //delete prepare
                unlink($prepared_filename);
                //delete encoded
                if(file_exists($encoded_filename)) unlink($encoded_filename);
                //delete original
                $upload_file_name = HEURIST_FILESTORE_DIR.'scratch/'.$original_filename;
                if(file_exists($upload_file_name)) unlink($upload_file_name);
            }
            return $res;
        }
    }
    
}

//
//  save file into table returns session
//
function parse_db_save($preproc){
    global $system;

    $filename = $preproc["prepared_filename"];
    
    $s = null;
    if (! file_exists($filename)) $s = ' does not exist';
    else if (! is_readable($filename)) $s = ' is not readable';
        
    if($s){
        $system->addError(HEURIST_UNKNOWN_ERROR, 'Source file '.$filename. $s);                
        return false;
    }
    
    
    $import_table = "import".date("YmdHis");

    //create temporary table import_datetime
    $query = "CREATE TABLE `".$import_table."` (`imp_ID` int(10) unsigned NOT NULL AUTO_INCREMENT, ";
    $columns = "";
    $counts = "";
    $mapping = array();
    $len = count($preproc['fields']);
    for ($i = 0; $i < $len; $i++) {
        $query = $query."`field_".$i."` ".(in_array($i, $preproc['memos'])?" mediumtext, ":" varchar(300), " ) ;
        $columns = $columns."field_".$i.",";
        $counts = $counts."count(distinct field_".$i."),";
        //array_push($mapping,0);
    }

    $query = $query." PRIMARY KEY (`imp_ID`)) ENGINE=InnoDB  DEFAULT CHARSET=utf8;";

    $columns = substr($columns,0,-1);
    $counts = $counts." count(*) ";

    $mysqli = $system->get_mysqli();

    if (!$mysqli->query($query)) {
        $system->addError(HEURIST_DB_ERROR, "Cannot create import table: " . $mysqli->error);                
        return false;
    }

    
    //always " if($csv_enclosure=="'") $csv_enclosure = "\\".$csv_enclosure;

    if(strpos($filename,"\\")>0){
        $filename = str_replace("\\","\\\\",$filename);
    }

    //load file into table  LOCAL
    $query = "LOAD DATA LOCAL INFILE '".$filename."' INTO TABLE ".$import_table
    ." CHARACTER SET UTF8"
    ." FIELDS TERMINATED BY ',' "  //.$csv_delimiter."' "
    ." OPTIONALLY ENCLOSED BY  '\"' " //.$csv_enclosure."' "
    ." LINES TERMINATED BY '\n'"  //.$csv_linebreak."' " 
    //." IGNORE 1 LINES
    ." (".$columns.")";


    if (!$mysqli->query($query)) {
        $system->addError(HEURIST_DB_ERROR, 'Unable to import data. MySQL command: "'.$query.'" returns error: '.$mysqli->error);                
        return false;
    }

    $warnings = array();
    if ($info = $mysqli->info) {
        if ($mysqli->warning_count) {
            array_push($warnings, $info);
            $e = $mysqli->get_warnings();
            do {
                array_push($warnings, $e->message); //$e->errno.": ".
            } while ($e->next());
        }
        /*if(strpos("$info", "Warnings: 0")===false){
        $mysqli->query("SHOW WARNINGS");
        }*/
    }

    //calculate uniqe values
    $query = "select ".$counts." from ".$import_table;
    $res = $mysqli->query($query);
    if (!$res) {
        $system->addError(HEURIST_DB_ERROR, 'Cannot count unique values: ' . $mysqli->error);                
        return false;
    }

    $uniqcnt = $res->fetch_row();
    $reccount = array_pop ( $uniqcnt );

    //add record to import_log
    $session = array("reccount"=>$reccount,
        "import_table"=>$import_table,
        "import_name"=>((substr($preproc['original_filename'],-4)=='.tmp'?'csv':$preproc['original_filename']).' '.date('Y-m-d H:i:s')),
        "columns"=>$preproc['fields'],   //names of columns in file header
        "memos"=>$preproc['memos'],
        "multivals"=>$preproc['multivals'],  //columns that have multivalue separator
        "csv_enclosure"=>$preproc['csv_enclosure'],
        "csv_mvsep"=>$preproc['csv_mvsep'],
        "uniqcnt"=>$uniqcnt,   //count of uniq values per column
        "mapping"=>$mapping,   //mapping of value fields to rectype.detailtype
        "indexes"=>$preproc['keyfields'] );  //names of columns in importtable that contains record_ID

    $session = saveSession($system, $session);
    if(count($warnings)>0){
        $session['load_warnings'] = $warnings;
    }
    return $session;
}

//
// @todo save session as entity method
//
function saveSession($system, $imp_session){
    $mysqli = $system->get_mysqli();

    $imp_id = mysql__insertupdate($mysqli, "sysImportSessions", "imp",
        array("imp_ID"=>@$imp_session["import_id"],
            "ugr_id"=>$system->get_user_id(),
            "imp_table"=>$imp_session["import_name"],
            "imp_session"=>json_encode($imp_session) ));

    if(intval($imp_id)<1){
        return "Cannot save session. SQL error:".$imp_id;
    }else{
        $imp_session["import_id"] = $imp_id;
        return $imp_session;
    }
}

//
// parse csv from content parameter (for terms import)
//
function parse_content(){
    
    $content = $_REQUEST['content'];
    //parse
    $csv_delimiter = @$_REQUEST['csv_delimiter'];
    $csv_enclosure = @$_REQUEST['csv_enclosure'];
    $csv_linebreak = @$_REQUEST['csv_linebreak'];

    if(!$csv_delimiter) $csv_delimiter = ',';
    else if($csv_delimiter=='tab') $csv_delimiter="\t";
    else if($csv_delimiter=='space') $csv_delimiter=" ";
    
    if(!$csv_linebreak) $csv_linebreak = "auto";

    $csv_enclosure = ($csv_enclosure==1)?"'":'"';

    $response = array();

    if(intval($csv_linebreak)>0){  //no breaks - group by
            $group_by = $csv_linebreak;
            $response = str_getcsv($content, $csv_delimiter, $csv_enclosure); 
        
            $temp = array();
            $i = 0;
            while($i<count($response)) {
                $temp[] = array_slice($response,$i,$csv_linebreak);
                $i = $i + $csv_linebreak;
            }
            $response = $temp;
        
    }else{
        
        if($csv_linebreak=="auto"){
            //ini_set('auto_detect_line_endings', true);
            $lb = "\n";
        }else if($csv_linebreak="win"){
            $lb = "\r\n";
        }else if($csv_linebreak="nix"){
            $lb = "\n";
        }else if($csv_linebreak="mac"){
            $lb = "\r";
        }

//error_log(print_r($content,true));
        
        $lines = str_getcsv($content, $lb); 
        
        foreach($lines as &$Row) {
             $row = str_getcsv($Row, $csv_delimiter , $csv_enclosure); //parse the items in rows    
             array_push($response, $row);
        }
    }

    return $response;
}

//==================================================================== MATCHING
/**
* Perform matching - find record id in heurist db 
*
* @param mixed $mysqli
* @param mixed $imp_session
* @param mixed $params
*/
function findRecordIds($imp_session, $params){
    
    global $system;

    $imp_session['validation'] = array( 
        "count_update"=>0, 
        "count_insert"=>0,
        "count_update_rows"=>0,
        "count_insert_rows"=>0,
        "count_error"=>0,  //NOT USED total number of errors (may be several per row)
        "error"=>array(),
        "recs_insert"=>array(),     //full record
        "recs_update"=>array() );

    $import_table = $imp_session['import_table'];
    $multivalue_field_name = @$params['multifield']; //name of multivalue field           ART???????
    $multivalue_field_name_idx = 0;
    $cnt_update_rows = 0;
    $cnt_insert_rows = 0;

    //disambiguation resolution 
    $disamb_resolv = @$params['disamb_resolv'];   //record id => $keyvalue
    if(!$disamb_resolv){
        $disamb_ids = @$params['disamb_id'];   //record ids
        $disamb_keys = @$params['disamb_key'];  //key values
        $disamb_resolv = array();
        if($disamb_keys){
            foreach($disamb_keys as $idx => $keyvalue){
                $disamb_resolv[$disamb_ids[$idx]] = str_replace("\'", "'", $keyvalue);  //rec_id => keyvalue
            }
        }
    }

    //get rectype to import
    $recordType = @$params['sa_rectype'];

    //create search query  - based on mapping (search for  sa_keyfield_ - checkboxes in UI)

    //for update
    $select_query_update_from = array("Records");
    $select_query_update_where = array("rec_RecTypeID=".$recordType);
    $sel_fields = array();

    //$detDefs = getAllDetailTypeStructures(true);
    
    $detDefs = dbs_GetDetailTypes($system, 'all', 1 );
    
    $detDefs = $detDefs['typedefs'];
    $idx_dt_type = $detDefs['fieldNamesToIndex']['dty_Type'];
    
    $mapped_fields = array();
    $mapping = @$params['mapping'];

    if(is_array($mapping))
    foreach ($mapping as $index => $field_type) {
        
            $field_name = "field_".$index;

            $mapped_fields[$field_name] = $field_type;

            if($field_type=="url" || $field_type=="id"){  // || $field_type=="scratchpad"){
                array_push($select_query_update_where, "rec_".$field_type."=?");

            }else if(is_numeric($field_type)){

                $where = "d".$index.".dtl_DetailTypeID=".$field_type." and ";

                $dt_type = $detDefs[$field_type]['commonFields'][$idx_dt_type];

                if( $dt_type == "enum" ||  $dt_type == "relationtype") {

                    //if fieldname is numeric - compare it with dtl_Value directly
                    $where = $where."( d".$index.".dtl_Value=t".$index.".trm_ID and t".$index.".trm_Label=?)";
                    //." if(concat('',? * 1) = ?,d".$index.".dtl_Value=?,t".$index.".trm_Label=?) ";

                    array_push($select_query_update_from, "defTerms t".$index);
                }else{
                    $where = $where." (d".$index.".dtl_Value=?)";
                }
                array_push($select_query_update_where, "rec_ID=d".$index.".dtl_RecID and ".$where);
                array_push($select_query_update_from, "recDetails d".$index);
            }else{
                continue;
            }

            array_push($sel_fields, $field_name);
            if($multivalue_field_name==$field_name){
                $multivalue_field_name_idx = count($sel_fields);
            }
        
    }//for mapping

    //keep mapping   field_XXX => dty_ID
    $imp_session['validation']['mapped_fields'] = $mapped_fields;

    
    $mysqli = $system->get_mysqli();

    //query to search record ids in Heurist db
    $search_query = "SELECT rec_ID, rec_Title "
    ." FROM ".implode(",",$select_query_update_from)
    ." WHERE ".implode(" and ",$select_query_update_where);

    $search_stmt = $mysqli->prepare($search_query);

    $params_dt = str_repeat('s',count($sel_fields));
    //$search_stmt->bind_param('s', $field_value);
    $search_stmt->bind_result($rec_ID, $rec_Title);

    //already founded IDs
    $pairs = array(); //to avoid search    $keyvalue=>recID
    $records = array();
    $disambiguation = array();
    $tmp_idx_insert = array(); //to keep indexes
    $tmp_idx_update = array(); //to keep indexes

    //loop all records in import table and detect what is for insert and what for update
    $select_query = "SELECT imp_id, ".implode(",", $sel_fields)." FROM ".$import_table;
    $res = $mysqli->query($select_query);
    if($res){
        $ind = -1;
        while ($row = $res->fetch_row()){
            $imp_id = $row[0];
            $row[0] = $params_dt;

            $is_update = false;
            $is_insert = false;

            $multivalue = $row[$multivalue_field_name_idx];

//error_log($multivalue_field_name_idx.'  '.$multivalue);            

            $ids = array();
            //split multivalue field
            $values = getMultiValues($multivalue, $imp_session['csv_enclosure'], $imp_session['csv_mvsep']);

            foreach($values as $idx=>$value){
                $row[$multivalue_field_name_idx] = $value;
                //verify that not empty
                $fc = $row;
                array_shift($fc);
                $fc = trim(implode("", $fc));

                if($fc==null || $fc=="") continue;       //key is empty

                $fc = $row;
                //ART TEMP array_walk($fc, 'trim_lower_accent2');

                $keyvalue = implode($imp_session['csv_mvsep'], $fc);  //csv_mvsep - separator

//error_log($keyvalue.'  ='.implode(' ',$row));                 

                if(!@$pairs[$keyvalue]){ //id not found
                    //search for ID

                    //assign parameters for search query
                    call_user_func_array(array($search_stmt, 'bind_param'), refValues($row));
                    $search_stmt->execute();
                    $disamb = array();
                    while ($search_stmt->fetch()) {
                        //keep pair ID => key value
                        $disamb[$rec_ID] = $rec_Title; //get value from binding
                    }

                    if(count($disamb)==0){ //nothing found - insert
                        $new_id = $ind;
                        $ind--;
                        $rec = $row;
                        $rec[0] = $imp_id;
                        $tmp_idx_insert[$keyvalue] = count($imp_session['validation']['recs_insert']); //keep index in rec_insert
                        array_push($imp_session['validation']['recs_insert'], $rec); //group_concat(imp_id), ".implode(",",$sel_query)
                        $is_insert = true;

                    }else if(count($disamb)==1 ||  array_search($keyvalue, $disamb_resolv, true)!==false){ // @$disamb_resolv[addslashes($keyvalue)]){
                        //either found exact or disamiguation is resolved

                        $new_id = $rec_ID;
                        $rec = $row;
                        $rec[0] = $imp_id;
                        array_unshift($rec, $rec_ID);
                        $tmp_idx_update[$keyvalue] = count($imp_session['validation']['recs_update']); //keep index in rec_update
                        array_push($imp_session['validation']['recs_update'], $rec); //rec_ID, group_concat(imp_id), ".implode(",",$sel_query)
                        $is_update = true;
                    }else{
                        $new_id= 'Found:'.count($disamb); //Disambiguation!
                        $disambiguation[$keyvalue] = $disamb;
                    }
                    $pairs[$keyvalue] = $new_id;
                    array_push($ids, $new_id);
                }else{ //ID for this mapping is already found

                    if(array_key_exists($keyvalue, $tmp_idx_insert)){
                        $imp_session['validation']['recs_insert'][$tmp_idx_insert[$keyvalue]][0] .= (",".$imp_id);
                        $is_insert = true;
                    }else if(array_key_exists($keyvalue, $tmp_idx_update)) {
                        $imp_session['validation']['recs_update'][$tmp_idx_update[$keyvalue]][1] .= (",".$imp_id);
                        $is_update = true;
                    }
                    array_push($ids, $pairs[$keyvalue]);
                }
            }//foreach multivalues
            $records[$imp_id] = implode($imp_session['csv_mvsep'], $ids);   //IDS to be added to import table

            if($is_update) $cnt_update_rows++;
            if($is_insert) $cnt_insert_rows++;

        }//while import table
    }


    $search_stmt->close();

    // result of work - counts of records to be inserted, updated
    $imp_session['validation']['count_update'] = count($imp_session['validation']['recs_update']);
    $imp_session['validation']['count_insert'] = count($imp_session['validation']['recs_insert']);
    $imp_session['validation']['count_update_rows'] = $cnt_update_rows;
    $imp_session['validation']['count_insert_rows'] = $cnt_insert_rows;
    $imp_session['validation']['disambiguation'] = $disambiguation;
    $imp_session['validation']['pairs'] = $pairs;     //keyvalues => record id - count number of unique values

    //MAIN RESULT - ids to be assigned to each record in import table
    $imp_session['validation']['records'] = $records; //imp_id(line#) => list of records ids

    return $imp_session;
}

//
// load session configuration
//
function getImportSession($imp_ID){
    global $system;
    
    
    if($imp_ID && is_numeric($imp_ID)){

        $res = mysql__select_array($system->get_mysqli(),
            "select imp_session, imp_table from sysImportSessions where imp_id=".$imp_ID);

        $session = json_decode($res[0], true);
        $session["import_id"] = $imp_ID;
        $session["import_file"] = $res[1];
        if(!@$session["import_table"]){ //backward capability
            $session["import_table"] = $res[1];
        }

        return $session;
    }else{
        $system->addError(HEURIST_NOT_FOUND, 'Import session #'.$imp_ID.' not found');
        return false;
    }
    
/*    new way
    $entity = new DbSysImportSessions( $system, array('details'=>'list','imp_ID'=>$imp_ID) );
    $res = $entity->search();
    if( is_bool($res) && !$res ){
        return $res; //error - can not get import session
    }
    if(!@$res['records'][$imp_ID]){
        $system->addError(HEURIST_NOT_FOUND, 'Import session #'.$imp_ID.' not found');
        return false;
    }
    
    $session = json_decode(@$res['records'][$imp_ID][1], true);
    $session["import_id"] = $imp_ID;
    $session["import_file"] = @$res['records'][$imp_ID][0];
    if(!@$session["import_table"]){ //backward capability
            $session["import_table"] = @$res['records'][$imp_ID][0];
    }
    
    return $session;
*/    
}


/**
* MAIN method for first step - finding exisiting /matching records in destination
* Assign record ids to field in import table
* (negative if not found)
*
* since we do match and assign in ONE STEP - first we call findRecordIds
*
* @param mixed $mysqli
* @param mixed $imp_session
* @param mixed $params
* @return mixed
*/
function assignRecordIds($params){
    
    global $system;
    
    //get rectype to import
    $rty_ID = @$params['sa_rectype'];
    if(intval($rty_ID)<1){
        $system->addError(HEURIST_INVALID_REQUEST, 'Record type not defined or wrong value');
        return false;
    }
    
    $imp_session = getImportSession($params['imp_ID']);

    if( is_bool($imp_session) && !$imp_session ){
        return false; //error - can not get import session
    }
    
//error_log(print_r($imp_session,true));
//error_log(print_r($params,true));
    
    $imp_session = findRecordIds($imp_session, $params);
        
    if(is_array($imp_session)){
        $records = $imp_session['validation']['records']; //imp_id(line#) => list of records ids
        $pairs = $imp_session['validation']['pairs'];     //keyvalues => record id - count number of unique values
        $disambiguation = $imp_session['validation']['disambiguation'];
    }else{
        return $imp_session;
    }

    if(count($disambiguation)>0){
        return $imp_session; //"It is not possible to proceed because of disambiguation";
    }

    $import_table = $imp_session['import_table'];

    $mysqli = $system->get_mysqli();
    
    $id_fieldname = @$params['idfield'];
    $id_field = null;
    $field_count = count($imp_session['columns']);

    if(!$id_fieldname || $id_fieldname=="null"){
        $rectype = dbs_GetRectypeByID($mysqli, $rty_ID);
        $id_fieldname = $rectype['rty_Name'].' ID'; //not defined - create new one
    }
    $index = array_search($id_fieldname, $imp_session['columns']); //find it among existing columns
    if($index!==false){ //this is existing field
        $id_field  = "field_".$index;
        $imp_session['uniqcnt'][$index] = count($pairs);
    }

    //add new field into import table
    if(!$id_field){

        $id_field = "field_".$field_count;
        $altquery = "alter table ".$import_table." add column ".$id_field." varchar(255) ";
        if (!$mysqli->query($altquery)) {
            $system->addError(HEURIST_DB_ERROR, 'Cannot alter import session table; cannot add new index field', $mysqli->error);
            return false;
        }
        /*
        $altquery = "update ".$import_table." set ".$id_field."=-1 where imp_id>0";
        if (!$mysqli->query($altquery)) {
            $system->addError(HEURIST_DB_ERROR, 'Cannot set new index field', $mysqli->error);
            return false;
        }*/
        
        array_push($imp_session['columns'], $id_fieldname );
        array_push($imp_session['uniqcnt'], count($pairs)>0?count($pairs):$imp_session['reccount'] );
        if(@$params['idfield']){
            array_push($imp_session['multivals'], $field_count ); //!!!!
        }
    }
    
    //define field as index in session
    @$imp_session['indexes'][$id_field] = $rty_ID;

    //to keep mapping for index field
    if(!@$imp_session['indexes_keyfields']){
        $imp_session['indexes_keyfields'] = array();
    }
    $imp_session['indexes_keyfields'][$id_field] = @$imp_session['validation']['mapped_fields'];


    if(count($records)>0){
        //update ID values in import table - repalce id to found
        foreach($records as $imp_id => $ids){

            if($ids){
                //update
                $updquery = "update ".$import_table." set ".$id_field."='".$ids
                ."' where imp_id = ".$imp_id;
                if(!$mysqli->query($updquery)){
                    $system->addError(HEURIST_DB_ERROR, 'Cannot update import table: set ID field', $mysqli->error.' QUERY:'.$updquery);
                    return false;
                }
            }
        }
    
    }else{
        $imp_session['validation']['count_insert'] = $imp_session['reccount'];
    }

    $ret_session = $imp_session;
    unset($imp_session['validation']);  //save session without validation info
    saveSession($system, $imp_session);
    return $ret_session;
}


/**
* Split multivalue field
*
* @param array $values
* @param mixed $csv_enclosure
*/
function getMultiValues($values, $csv_enclosure, $csv_mvsep){

    $nv = array();
    $values =  explode($csv_mvsep, $values);
    if(count($values)==1){
        array_push($nv, trim($values[0]));
    }else{

        $csv_enclosure = ($csv_enclosure==1)?"'":'"'; //need to remove quotes for multivalues fields

        foreach($values as $idx=>$value){
            if($value!=""){
                if(strpos($value,$csv_enclosure)===0 && strrpos($value,$csv_enclosure)===strlen($value)-1){
                    $value = substr($value,1,strlen($value)-2);
                }
                array_push($nv, $value);
            }
        }
    }
    return $nv;
}

function  trim_lower_accent($item){
    return mb_strtolower(stripAccents($item));
}


function  trim_lower_accent2(&$item, $key){
    $item = trim_lower_accent($item);
}

// import functions =====================================

/**
* 1) Performs mapping validation (required fields, enum, pointers, numeric/date)
* 2) Counts matched (update) and new records
*
* @param mixed $mysqli
*/
/*
sa_rectype
ignore_insert = 1
recid_field   - field_X
mapping
*/
function validateImport($mysqli, $imp_session, $params){

    //add result of validation to session
    $imp_session['validation'] = array( "count_update"=>0,
        "count_insert"=>0,       //records to be inserted
        "count_update_rows"=>0,
        "count_insert_rows"=>0,  //row that are source of insertion
        "count_error"=>0, 
        "error"=>array() );

    //get rectype to import
    $recordType = @$params['sa_rectype'];
    $id_field = @$params['recid_field']; //record ID field is always defined explicitly
    $ignore_insert = (@$params['ignore_insert']==1); //ignore new records

    if(intval($recordType)<1){
        $system->addError(HEURIST_INVALID_REQUEST, 'Record type is not defined');
        return false;
    }
    if(array_search($id_field, $imp_session['columns'])===false){
        $system->addError(HEURIST_INVALID_REQUEST, 'Identification field is not defined');
        return false;
    }

    $import_table = $imp_session['import_table'];

    $cnt_update_rows = 0;
    $cnt_insert_rows = 0;

    $mapping_params = @$params['mapping'];

    $mapping = array();  // fieldtype ID => fieldname in import table
    $mapped_fields = array(); //reverse $field_name = >  $field_type
    $sel_query = array();
    
    if(is_array($mapping_params) && count($mapping_params)>0){
        foreach ($mapping_params as $index => $field_type) {
        
            $field_name = "field_".$index;

            $mapping[$field_type] = $field_name;
            $mapped_fields[$field_name] = $field_type;

            //all mapped fields - they will be used in validation query
            array_push($sel_query, $field_name);
        }
    }else{
        $system->addError(HEURIST_INVALID_REQUEST, 'Mapping is not defined');
        return false;
    }


    $imp_session['validation']['mapped_fields'] = $mapped_fields;


        $cnt_recs_insert_nonexist_id = 0;

        // validate selected record ID field
        // in case id field is not created on match step (it is from original set of columns)
        // we have to verify that its values are valid
        if(!@$imp_session['indexes'][$id_field]){

            //find recid with different rectype
            $query = "select imp_id, ".implode(",",$sel_query).", ".$id_field
            ." from ".$import_table
            ." left join Records on rec_ID=".$id_field
            ." where rec_RecTypeID<>".$recordType;
            // TPDO: I'm not sure whether message below has been correctly interpreted
            $wrong_records = getWrongRecords($mysqli, $query, $imp_session,
                "Your input data contain record IDs in the selected ID column for existing records which are not numeric IDs. ".
                "The import cannot proceed until this is corrected.","Incorrect record types", $id_field);
            if(is_array($wrong_records) && count($wrong_records)>0) {
                $wrong_records['validation']['mapped_fields'][$id_field] = 'id';
                $imp_session = $wrong_records;
            }else if($wrong_records) {
                return $wrong_records;
            }

            if(!$ignore_insert){      //WARNING - it ignores possible multivalue index field
                //find record ID that do not exist in HDB - to insert
                $query = "select count(imp_id) "
                ." from ".$import_table
                ." left join Records on rec_ID=".$id_field
                ." where ".$id_field.">0 and rec_ID is null";
                $row = mysql__select_array2($mysqli, $query);
                if($row && $row[0]>0){
                    $cnt_recs_insert_nonexist_id = $row[0];
                }
            }
        }

        // find records to update
        $select_query = "SELECT count(DISTINCT ".$id_field.") FROM ".$import_table
        ." left join Records on rec_ID=".$id_field." WHERE rec_ID is not null and ".$id_field.">0";
        $row = mysql__select_array2($mysqli, $select_query);
        if($row){

            if( $row[0]>0 ){

                $imp_session['validation']['count_update'] = $row[0];
                $imp_session['validation']['count_update_rows'] = $row[0];
                //find first 100 records to display
                $select_query = "SELECT ".$id_field.", imp_id, ".implode(",",$sel_query)
                ." FROM ".$import_table
                ." left join Records on rec_ID=".$id_field
                ." WHERE rec_ID is not null and ".$id_field.">0"
                ." ORDER BY ".$id_field." LIMIT 5000";
                $imp_session['validation']['recs_update'] = mysql__select_array3($mysqli, $select_query, false);

            }

        }else{
            return "SQL error: Cannot execute query to calculate number of records to be updated!";
        }

        if(!$ignore_insert){

            // find records to insert
            $select_query = "SELECT count(DISTINCT ".$id_field.") FROM ".$import_table." WHERE ".$id_field."<0"; //$id_field." is null OR ".
            $row = mysql__select_array2($mysqli, $select_query);
            if($row){
                if( $row[0]>0 ){
                    $imp_session['validation']['count_insert'] = $row[0];
                    $imp_session['validation']['count_insert_rows'] = $row[0];

                    //find first 100 records to display
                    $select_query = "SELECT imp_id, ".implode(",",$sel_query)." FROM ".$import_table." WHERE ".$id_field."<0 LIMIT 5000";
                    $imp_session['validation']['recs_insert'] = mysql__select_array3($mysqli, $select_query, false);
                }
            }else{
                return "SQL error: Cannot execute query to calculate number of records to be inserted";
            }
        }
        //additional query for non-existing IDs
        if($cnt_recs_insert_nonexist_id>0){

            $imp_session['validation']['count_insert_nonexist_id'] = $cnt_recs_insert_nonexist_id;
            $imp_session['validation']['count_insert'] = $imp_session['validation']['count_insert']+$cnt_recs_insert_nonexist_id;
            $imp_session['validation']['count_insert_rows'] = $imp_session['validation']['count_insert'];

            $select_query = "SELECT imp_id, ".implode(",",$sel_query)
            ." FROM ".$import_table
            ." LEFT JOIN Records on rec_ID=".$id_field
            ." WHERE ".$id_field.">0 and rec_ID is null LIMIT 5000";
            $res = mysql__select_array3($mysqli, $select_query, false);
            if($res && count($res)>0){
                if(@$imp_session['validation']['recs_insert']){
                    $imp_session['validation']['recs_insert'] = array_merge($imp_session['validation']['recs_insert'], $res);
                }else{
                    $imp_session['validation']['recs_insert'] = $res;
                }
            }
        }



    // fill array with field in import table to be validated
    $recStruc = getRectypeStructures(array($recordType));
    $idx_reqtype = $recStruc['dtFieldNamesToIndex']['rst_RequirementType'];
    $idx_fieldtype = $recStruc['dtFieldNamesToIndex']['dty_Type'];

    $dt_mapping = array(); //mapping to detail type ID

    $missed = array();
    $query_reqs = array(); //fieldnames from import table
    $query_reqs_where = array(); //where clause for validation

    $query_enum = array();
    $query_enum_join = array();
    $query_enum_where = array();

    $query_res = array();
    $query_res_join = array();
    $query_res_where = array();

    $query_num = array();
    $query_num_nam = array();
    $query_num_where = array();

    $query_date = array();
    $query_date_nam = array();
    $query_date_where = array();

    $numeric_regex = "'^([+-]?[0-9]+\.*)+'"; // "'^([+-]?[0-9]+\\.?[0-9]*e?[0-9]+)|(0x[0-9A-F]+)$'";


    //loop for all fields in record type structure
    foreach ($recStruc[$recordType]['dtFields'] as $ft_id => $ft_vals) {


        //find among mappings
        $field_name = @$mapping[$ft_id];
        if(!$field_name){
            $field_name = array_search($recordType.".".$ft_id, $imp_session["mapping"], true); //from previous session
        }

        if(!$field_name && $ft_vals[$idx_fieldtype] == "geo"){
            //specific mapping for geo fields
            //it may be mapped to itself or mapped to two fields - lat and long

            $field_name1 = @$mapping[$ft_id."_lat"];
            $field_name2 = @$mapping[$ft_id."_long"];
            if(!$field_name1 && !$field_name2){
                $field_name1 = array_search($recordType.".".$ft_id."_lat", $imp_session["mapping"], true);
                $field_name2 = array_search($recordType.".".$ft_id."_long", $imp_session["mapping"], true);
            }

            if($ft_vals[$idx_reqtype] == "required"){
                if(!$field_name1 || !$field_name2){
                    array_push($missed, $ft_vals[0]);
                }else{
                    array_push($query_reqs, $field_name1);
                    array_push($query_reqs, $field_name2);
                    array_push($query_reqs_where, $field_name1." is null or ".$field_name1."=''");
                    array_push($query_reqs_where, $field_name2." is null or ".$field_name2."=''");
                }
            }
            if($field_name1 && $field_name2){
                array_push($query_num, $field_name1);
                array_push($query_num_where, "(NOT($field_name1 is null or $field_name1='') and NOT($field_name1 REGEXP ".$numeric_regex."))");
                array_push($query_num, $field_name2);
                array_push($query_num_where, "(NOT($field_name2 is null or $field_name2='') and NOT($field_name2 REGEXP ".$numeric_regex."))");
            }


        }else
        if($ft_vals[$idx_reqtype] == "required"){
            if(!$field_name){
                array_push($missed, $ft_vals[0]);
            }else{
                if($ft_vals[$idx_fieldtype] == "resource"){ //|| $ft_vals[$idx_fieldtype] == "enum"){
                    $squery = "not (".$field_name.">0)";
                }else{
                    $squery = $field_name." is null or ".$field_name."=''";
                }

                array_push($query_reqs, $field_name);
                array_push($query_reqs_where, $squery);
            }
        }

        if($field_name){  //mapping exists

            $dt_mapping[$field_name] = $ft_id; //$ft_vals[$idx_fieldtype];

            if($ft_vals[$idx_fieldtype] == "enum" ||  $ft_vals[$idx_fieldtype] == "relationtype") {
                array_push($query_enum, $field_name);
                $trm1 = "trm".count($query_enum);
                array_push($query_enum_join,
                    " defTerms $trm1 on $trm1.trm_Label=$field_name ");
                array_push($query_enum_where, "(".$trm1.".trm_Label is null and not ($field_name is null or $field_name=''))");

            }else if($ft_vals[$idx_fieldtype] == "resource"){
                array_push($query_res, $field_name);
                $trm1 = "rec".count($query_res);
                array_push($query_res_join, " Records $trm1 on $trm1.rec_ID=$field_name ");
                array_push($query_res_where, "(".$trm1.".rec_ID is null and not ($field_name is null or $field_name=''))");

            }else if($ft_vals[$idx_fieldtype] == "float" ||  $ft_vals[$idx_fieldtype] == "integer") {

                array_push($query_num, $field_name);
                array_push($query_num_where, "(NOT($field_name is null or $field_name='') and NOT($field_name REGEXP ".$numeric_regex."))");



            }else if($ft_vals[$idx_fieldtype] == "date" ||  $ft_vals[$idx_fieldtype] == "year") {

                array_push($query_date, $field_name);
                if($ft_vals[$idx_fieldtype] == "year"){
                    array_push($query_date_where, "(concat('',$field_name * 1) != $field_name "
                        ."and not ($field_name is null or $field_name=''))");
                }else{
                    array_push($query_date_where, "(str_to_date($field_name, '%Y-%m-%d %H:%i:%s') is null "
                        ."and str_to_date($field_name, '%d/%m/%Y') is null "
                        ."and str_to_date($field_name, '%d-%m-%Y') is null "
                        ."and not ($field_name is null or $field_name=''))");
                }

            }

        }
    }

    //ignore_required

    //1. Verify that all required field are mapped  =====================================================
    if(count($missed)>0  &&
        ($imp_session['validation']['count_insert']>0   // there are records to be inserted
            //  || ($params['sa_upd']==2 && $params['sa_upd2']==1)   // Delete existing if no new data supplied for record
        )){
            return "Mapping: ".implode(",", $missed);
    }

    if($id_field){ //validate only for defined records IDs
        if($ignore_insert){
            $only_for_specified_id = " (".$id_field." > 0) AND ";
        }else{
            $only_for_specified_id = " (NOT(".$id_field." is null OR ".$id_field."='')) AND ";
        }
    }else{
        $only_for_specified_id = "";
    }

    //2. In DB: Verify that all required fields have values =============================================
    $k=0;
    foreach ($query_reqs as $field){
        $query = "select imp_id, ".implode(",",$sel_query)
        ." from $import_table "
        ." where ".$only_for_specified_id."(".$query_reqs_where[$k].")"; // implode(" or ",$query_reqs_where);
        $k++;
        
        $wrong_records = getWrongRecords($mysqli, $query, $imp_session,
            "This field is required - a value must be supplied for every record",
            "Missing Values", $field);
        if(is_array($wrong_records)) {

            $cnt = count(@$imp_session['validation']['error']);//was
            $imp_session = $wrong_records;

            //remove from array to be inserted - wrong records with missed required field
            if(count(@$imp_session['validation']['recs_insert'])>0 ){
                $cnt2 = count(@$imp_session['validation']['error']);//now
                if($cnt2>$cnt){
                    $wrong_recs_ids = $imp_session['validation']['error'][$cnt]['recs_error_ids'];
                    if(count($wrong_recs_ids)>0){
                        $badrecs = array();
                        foreach($imp_session['validation']['recs_insert'] as $idx=>$flds){
                            if(in_array($flds[0], $wrong_recs_ids)){
                                array_push($badrecs, $idx);
                            }
                        }
                        $imp_session['validation']['recs_insert'] = array_diff_key($imp_session['validation']['recs_insert'],
                                    array_flip($badrecs) );
                        $imp_session['validation']["count_insert"] = count($imp_session['validation']['recs_insert']);                                     }
                }
            }


        }else if($wrong_records) {
            return $wrong_records;
        }
    }
    //3. In DB: Verify that enumeration fields have correct values =====================================
    if(!@$imp_session['csv_enclosure']){
        $imp_session['csv_enclosure'] = $params['csv_enclosure'];
    }
    if(!@$imp_session['csv_mvsep']){
        $imp_session['csv_mvsep'] = $params['csv_mvsep'];
    }


    $hwv = " have incorrect values";
    $k=0;
    foreach ($query_enum as $field){

        if(true || in_array(intval(substr($field,6)), $imp_session['multivals'])){ //this is multivalue field - perform special validation

            $query = "select imp_id, ".implode(",",$sel_query)
            ." from $import_table where ".$only_for_specified_id." 1";

            $idx = array_search($field, $sel_query)+1;

            $wrong_records = validateEnumerations($mysqli, $query, $imp_session, $field, $dt_mapping[$field], $idx, $recStruc, $recordType,
                "Term list values read must match existing terms defined for the field", "Invalid Terms");

        }else{

            $query = "select imp_id, ".implode(",",$sel_query)
            ." from $import_table left join ".$query_enum_join[$k]   //implode(" left join ", $query_enum_join)
            ." where ".$only_for_specified_id."(".$query_enum_where[$k].")";  //implode(" or ",$query_enum_where);
            
            $wrong_records = getWrongRecords($mysqli, $query, $imp_session,
                "Term list values read must match existing terms defined for the field",
                "Invalid Terms", $field);
        }

        $k++;

        //if($wrong_records) return $wrong_records;
        if(is_array($wrong_records)) {
            $imp_session = $wrong_records;
        }else if($wrong_records) {
            return $wrong_records;
        }
    }
    //4. In DB: Verify resource fields ==================================================
    $k=0;
    foreach ($query_res as $field){

        if(true || in_array(intval(substr($field,6)), $imp_session['multivals'])){ //this is multivalue field - perform special validation

            $query = "select imp_id, ".implode(",",$sel_query)
            ." from $import_table where ".$only_for_specified_id." 1";

            $idx = array_search($field, $sel_query)+1;

            $wrong_records = validateResourcePointers($mysqli, $query, $imp_session, $field, $dt_mapping[$field], $idx, $recStruc, $recordType);

        }else{
            $query = "select imp_id, ".implode(",",$sel_query)
            ." from $import_table left join ".$query_res_join[$k]  //implode(" left join ", $query_res_join)
            ." where ".$only_for_specified_id."(".$query_res_where[$k].")"; //implode(" or ",$query_res_where);
            $wrong_records = getWrongRecords($mysqli, $query, $imp_session,
                "Record pointer field values must reference an existing record in the database",
                "Invalid Pointers", $field);
        }

        $k++;

        //"Fields mapped as resources(pointers)".$hwv,
        if(is_array($wrong_records)) {
            $imp_session = $wrong_records;
        }else if($wrong_records) {
            return $wrong_records;
        }
    }

    //5. Verify numeric fields
    $k=0;
    foreach ($query_num as $field){

        if(in_array(intval(substr($field,6)), $imp_session['multivals'])){ //this is multivalue field - perform special validation

            $query = "select imp_id, ".implode(",",$sel_query)
            ." from $import_table where ".$only_for_specified_id." 1";

            $idx = array_search($field, $sel_query)+1;

            $wrong_records = validateNumericField($mysqli, $query, $imp_session, $field, $idx);

        }else{
            $query = "select imp_id, ".implode(",",$sel_query)
            ." from $import_table "
            ." where ".$only_for_specified_id."(".$query_num_where[$k].")";

            $wrong_records = getWrongRecords($mysqli, $query, $imp_session,
                "Numeric fields must be pure numbers, they cannot include alphabetic characters or punctuation",
                "Invalid Numerics", $field);
        }

        $k++;

        // "Fields mapped as numeric".$hwv,
        if(is_array($wrong_records)) {
            $imp_session = $wrong_records;
        }else if($wrong_records) {
            return $wrong_records;
        }
    }

    //6. Verify datetime fields
    $k=0;
    foreach ($query_date as $field){

        if(true || in_array(intval(substr($field,6)), $imp_session['multivals'])){ //this is multivalue field - perform special validation

            $query = "select imp_id, ".implode(",",$sel_query)
            ." from $import_table where ".$only_for_specified_id." 1";

            $idx = array_search($field, $sel_query)+1;

            $wrong_records = validateDateField($mysqli, $query, $imp_session, $field, $idx);

        }else{
            $query = "select imp_id, ".implode(",",$sel_query)
            ." from $import_table "
            ." where ".$only_for_specified_id."(".$query_date_where[$k].")"; //implode(" or ",$query_date_where);
            $wrong_records = getWrongRecords($mysqli, $query, $imp_session,
                "Date values must be in dd-mm-yyyy, dd/mm/yyyy or yyyy-mm-dd formats",
                "Invalid Dates", $field);
        }

        $k++;
        //"Fields mapped as date".$hwv,
        if(is_array($wrong_records)) {
            $imp_session = $wrong_records;
        }else if($wrong_records) {
            return $wrong_records;
        }
    }

    //7. TODO Verify geo fields

    return $imp_session;
}


/**
* execute validation query and fill session array with validation results
*
* @param mixed $mysqli
* @param mixed $query
* @param mixed $message
* @param mixed $imp_session
* @param mixed $fields_checked
*/
function getWrongRecords($mysqli, $query, $imp_session, $message, $short_messsage, $fields_checked){

//error_log('valquery: '.$query);

    $res = $mysqli->query($query." LIMIT 5000");
    if($res){
        $wrong_records = array();
        $wrong_records_ids = array();
        while ($row = $res->fetch_row()){
            array_push($wrong_records, $row);
            array_push($wrong_records_ids, $row[0]);
        }
        $res->close();
        $cnt_error = count($wrong_records);
        if($cnt_error>0){
            $error = array();
            $error["count_error"] = $cnt_error;
            $error["recs_error"] = $wrong_records; //array_slice($wrong_records,0,1000); //imp_id, fields
            $error["recs_error_ids"] = $wrong_records_ids;
            $error["field_checked"] = $fields_checked;
            $error["err_message"] = $message;
            $error["short_message"] = $short_messsage;

            $imp_session['validation']['count_error'] = $imp_session['validation']['count_error']+$cnt_error;
            array_push($imp_session['validation']['error'], $error);

            return $imp_session;
        }

    }else{
        return "SQL error: Cannot perform validation query: ".$query;
    }
    return null;
}


/**
* put your comment there...
*
* @param mixed $mysqli
* @param mixed $query
* @param mixed $imp_session
* @param mixed $fields_checked - name of field to be verified
* @param mixed $dt_id - mapped detail type ID
* @param mixed $field_idx - index of validation field in query result (to get value)
* @param mixed $recStruc - record type structure
* @param mixed $message - error message
* @param mixed $short_messsage
*/
function validateEnumerations($mysqli, $query, $imp_session, $fields_checked, $dt_id, $field_idx, $recStruc, $recordType, $message, $short_messsage){


    $dt_def = $recStruc[$recordType]['dtFields'][$dt_id];

    $idx_fieldtype = $recStruc['dtFieldNamesToIndex']['dty_Type'];
    $idx_term_tree = $recStruc['dtFieldNamesToIndex']['rst_FilteredJsonTermIDTree'];
    $idx_term_nosel = $recStruc['dtFieldNamesToIndex']['dty_TermIDTreeNonSelectableIDs'];

    $dt_type = $dt_def[$idx_fieldtype];
    
    $res = $mysqli->query($query." LIMIT 5000");

    if($res){
        $wrong_records = array();
        while ($row = $res->fetch_row()){

            $is_error = false;
            $newvalue = array();
            $values = getMultiValues($row[$field_idx], $imp_session['csv_enclosure'], $imp_session['csv_mvsep']);
            foreach($values as $idx=>$r_value){
                $r_value2 = trim_lower_accent($r_value);
                if($r_value2!=""){

                    $is_termid = false;
                    if(ctype_digit($r_value2)){
                        $is_termid = isValidTerm( $dt_def[$idx_term_tree], $dt_def[$idx_term_nosel], $r_value2, $dt_id);
                    }

                    if($is_termid){
                        $term_id = $r_value;
                    }else{
                        $term_id = isValidTermLabel($dt_def[$idx_term_tree], $dt_def[$idx_term_nosel], $r_value2, $dt_id );
                    }

                    if (!$term_id)
                    {//not found
                        $is_error = true;
                        array_push($newvalue, "<font color='red'>".$r_value."AAAA</font>");
                    }else{
                        array_push($newvalue, $r_value);
                    }
                }
            }

            if($is_error){
                $row[$field_idx] = implode($imp_session['csv_mvsep'], $newvalue);
                array_push($wrong_records, $row);
            }
        }
        $res->close();
        $cnt_error = count($wrong_records);
        if($cnt_error>0){
            $error = array();
            $error["count_error"] = $cnt_error;
            $error["recs_error"] = array_slice($wrong_records,0,1000);
            $error["field_checked"] = $fields_checked;
            $error["err_message"] = $message;
            $error["short_messsage"] = $short_messsage;

            $imp_session['validation']['count_error'] = $imp_session['validation']['count_error']+$cnt_error;
            array_push($imp_session['validation']['error'], $error);

            return $imp_session;
        }

    }else{
        return "SQL error: Cannot perform validation query: ".$query;
    }
    return null;
}


/**
* put your comment there...
*
* @param mixed $mysqli
* @param mixed $query
* @param mixed $imp_session
* @param mixed $fields_checked - name of field to be verified
* @param mixed $dt_id - mapped detail type ID
* @param mixed $field_idx - index of validation field in query result (to get value)
* @param mixed $recStruc - record type structure
*/
function validateResourcePointers($mysqli, $query, $imp_session, $fields_checked, $dt_id, $field_idx, $recStruc, $recordType){


    $dt_def = $recStruc[$recordType]['dtFields'][$dt_id];
    $idx_pointer_types = $recStruc['dtFieldNamesToIndex']['rst_PtrFilteredIDs'];

    $res = $mysqli->query($query." LIMIT 5000");

    if($res){
        $wrong_records = array();
        while ($row = $res->fetch_row()){

            $is_error = false;
            $newvalue = array();
            $values = getMultiValues($row[$field_idx], $imp_session['csv_enclosure'], $imp_session['csv_mvsep']);
            foreach($values as $idx=>$r_value){
                $r_value2 = trim($r_value);
                if($r_value2!=""){

                    if (!isValidPointer($dt_def[$idx_pointer_types], $r_value2, $dt_id ))
                    {//not found
                        $is_error = true;
                        array_push($newvalue, "<font color='red'>".$r_value."</font>");
                    }else{
                        array_push($newvalue, $r_value);
                    }
                }
            }

            if($is_error){
                $row[$field_idx] = implode($imp_session['csv_mvsep'], $newvalue);
                array_push($wrong_records, $row);
            }
        }
        $res->close();
        $cnt_error = count($wrong_records);
        if($cnt_error>0){
            $error = array();
            $error["count_error"] = $cnt_error;
            $error["recs_error"] = array_slice($wrong_records,0,1000);
            $error["field_checked"] = $fields_checked;
            $error["err_message"] = "Record pointer fields must reference an existing record of valid type in the database";
            $error["short_messsage"] = "Invalid Pointers";

            $imp_session['validation']['count_error'] = $imp_session['validation']['count_error']+$cnt_error;
            array_push($imp_session['validation']['error'], $error);

            return $imp_session;
        }

    }else{
        return "SQL error: Cannot perform validation query: ".$query;
    }
    return null;
}


/**
* put your comment there...
*
* @param mixed $mysqli
* @param mixed $query
* @param mixed $imp_session
* @param mixed $fields_checked - name of field to be verified
* @param mixed $field_idx - index of validation field in query result (to get value)
*/
function validateNumericField($mysqli, $query, $imp_session, $fields_checked, $field_idx){

    $res = $mysqli->query($query." LIMIT 5000");

    if($res){
        $wrong_records = array();
        while ($row = $res->fetch_row()){

            $is_error = false;
            $newvalue = array();
            $values = getMultiValues($row[$field_idx], $imp_session['csv_enclosure'], $imp_session['csv_mvsep']);
            foreach($values as $idx=>$r_value){
                if($r_value!=null && trim($r_value)!=""){

                    if(!is_numeric($r_value)){
                        $is_error = true;
                        array_push($newvalue, "<font color='red'>".$r_value."</font>");
                    }else{
                        array_push($newvalue, $r_value);
                    }
                }
            }

            if($is_error){
                $row[$field_idx] = implode($imp_session['csv_mvsep'], $newvalue);
                array_push($wrong_records, $row);
            }
        }
        $res->close();
        $cnt_error = count($wrong_records);
        if($cnt_error>0){
            $error = array();
            $error["count_error"] = $cnt_error;
            $error["recs_error"] = array_slice($wrong_records,0,1000);
            $error["field_checked"] = $fields_checked;
            $error["err_message"] = "Numeric fields must be pure numbers, they cannot include alphabetic characters or punctuation";
            $error["short_messsage"] = "Invalid Numerics";
            $imp_session['validation']['count_error'] = $imp_session['validation']['count_error']+$cnt_error;
            array_push($imp_session['validation']['error'], $error);

            return $imp_session;
        }

    }else{
        return "SQL error: Cannot perform validation query: ".$query;
    }
    return null;
}


/**
* put your comment there...
*
* @param mixed $mysqli
* @param mixed $query
* @param mixed $imp_session
* @param mixed $fields_checked - name of field to be verified
* @param mixed $field_idx - index of validation field in query result (to get value)
*/
function validateDateField($mysqli, $query, $imp_session, $fields_checked, $field_idx){

    $res = $mysqli->query($query." LIMIT 5000");

    if($res){
        $wrong_records = array();
        while ($row = $res->fetch_row()){

            $is_error = false;
            $newvalue = array();
            $values = getMultiValues($row[$field_idx], $imp_session['csv_enclosure'], $imp_session['csv_mvsep']);
            foreach($values as $idx=>$r_value){
                if($r_value!=null && trim($r_value)!=""){


                    if( is_numeric($r_value) && intval($r_value) ){
                        array_push($newvalue, $r_value);
                    }else{

                        $date = date_parse($r_value);

                        if ($date["error_count"] == 0 && checkdate($date["month"], $date["day"], $date["year"]))
                        {
                            $value = strtotime($r_value);
                            $value = date('Y-m-d H:i:s', $value);
                            array_push($newvalue, $value);
                        }else{
                            $is_error = true;
                            array_push($newvalue, "<font color='red'>".$r_value."</font>");
                        }

                    }
                }
            }

            if($is_error){
                $row[$field_idx] = implode($imp_session['csv_mvsep'], $newvalue);
                array_push($wrong_records, $row);
            }
        }
        $res->close();
        $cnt_error = count($wrong_records);
        if($cnt_error>0){
            $error = array();
            $error["count_error"] = $cnt_error;
            $error["recs_error"] = array_slice($wrong_records,0,1000);
            $error["field_checked"] = $fields_checked;
            $error["err_message"] = "Date values must be in dd-mm-yyyy, mm/dd/yyyy or yyyy-mm-dd formats";
            $error["short_messsage"] = "Invalid Dates";
            $imp_session['validation']['count_error'] = $imp_session['validation']['count_error']+$cnt_error;
            array_push($imp_session['validation']['error'], $error);

            return $imp_session;
        }

    }else{
        return "SQL error: Cannot perform validation query: ".$query;
    }
    return null;
}


?>
