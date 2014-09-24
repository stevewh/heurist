<?php

    /**
    * getRectypeRelationsAsJSON.php: Lists the relations between records as XML. Non-vidual version of listRecTypeRelations.php
    *                                For use in visualisation of entities and relationships
    *
    * @package     Heurist academic knowledge management system
    * @link        http://HeuristNetwork.org
    * @copyright   (C) 2005-2014 University of Sydney
    * @author      Artem Osmakov   <artem.osmakov@sydney.edu.au>
    * @author      Ian Johnson     <ian.johnson@sydney.edu.au>
    * @author      Jan Jaap de Groot    <jjedegroot@gmail.com>
    * @license     http://www.gnu.org/licenses/gpl-3.0.txt GNU License 3.0
    * @version     3.2
    */

    /*
    * Licensed under the GNU License, Version 3.0 (the "License"); you may not use this file except in compliance
    * with the License. You may obtain a copy of the License at http://www.gnu.org/licenses/gpl-3.0.txt
    * Unless required by applicable law or agreed to in writing, software distributed under the License is
    * distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied
    * See the License for the specific language governing permissions and limitations under the License.
    */

    require_once (dirname(__FILE__) . '/../../common/connect/applyCredentials.php');
    require_once (dirname(__FILE__) . '/../../common/php/getRecordInfoLibrary.php');

    if (!is_logged_in()) {
        header("HTTP/1.1 401 Unauthorized");
        exit;
    }

    // We are going to represent JSON. Must be on top.
    header("Content-Type: application/json");

    // Code below is to grab data; copied from listRectypeRelations.php
    // and removed unneccessary parts to just generate XML for entities and relationships
    mysql_connection_select(DATABASE);
    $rtStructs = getAllRectypeStructures(true);
    $rtTerms = getTerms(true);
    $rtTerms = $rtTerms['termsByDomainLookup']['relation'];

    $image_base_url = HEURIST_SERVER_URL . "/HEURIST_FILESTORE/" . HEURIST_DBNAME . "/rectype-icons/";
    $idx_dt_type = $rtStructs['typedefs']['dtFieldNamesToIndex']['dty_Type'];
    $idx_dt_pointers = $rtStructs['typedefs']['dtFieldNamesToIndex']['rst_PtrFilteredIDs'];
    $idx_dt_name = $rtStructs['typedefs']['dtFieldNamesToIndex']['rst_DisplayName'];
    $idx_dt_req = $rtStructs['typedefs']['dtFieldNamesToIndex']['rst_RequirementType'];
    $idx_dt_max = $rtStructs['typedefs']['dtFieldNamesToIndex']['rst_MaxValues'];

    $resrt = array();

    foreach ($rtStructs['typedefs'] as $rt_id=>$rt) {

        if(!is_numeric($rt_id)) continue;   // ??? what does this do ???

        $details = array();
        $rt_cnt = 0;

        foreach ($rt['dtFields'] as $dt_id=>$dt) {
            $dt_type = $dt[$idx_dt_type];

            if ($dt_type=="resource") {  // pointer field
                $constraints = $dt[$idx_dt_pointers]; //list of rectypes - constraints for pointer
                $constraints = explode(",", $constraints);
                $rels = array();
                foreach($constraints as $pt_rt_id){
                    if(is_numeric($pt_rt_id)){
                        $rels[$pt_rt_id] = array('y',0);
                    }
                }
                $isconstrainded = count($rels);

                $query = "select r2.rec_RecTypeID, count(recDetails.dtl_ID) from Records r1, recDetails, "
                ."Records r2 where r1.rec_RecTypeID=$rt_id and dtl_RecID=r1.rec_ID and "
                ."dtl_DetailTypeID=$dt_id and dtl_Value=r2.rec_ID group by r2.rec_RecTypeID";
                $cnt = 0;
                if(count($details)==0){
                    $rt_cnt = get_rt_usage($rt_id);
                }

                if($rt_cnt>0){
                    $res = mysql_query($query);
                    if ($res) {
                        while (($row = mysql_fetch_array($res))) {
                            $rels[$row[0]] = array(@$rels[$row[0]]?'y':'n', $row[1]);
                            $cnt = $cnt+$row[1];
                        }
                    }
                }

                array_push($details, array('dt_id'=>$dt_id, 'dt_name'=>$dt[$idx_dt_name], 'req'=>$dt[$idx_dt_req],
                    'max'=>$dt[$idx_dt_max], 'type'=>$dt_type, 'isconstrained'=>$isconstrainded, 'count'=>$cnt, 'rels'=>$rels));

            } // pointer

            else if ($dt_type=="relmarker") {

                $constraints = $dt[$idx_dt_pointers];
                $constraints = explode(",", $constraints);
                $rels = array();
                foreach($constraints as $pt_rt_id){
                    if(is_numeric($pt_rt_id)){
                        $rels[$pt_rt_id] = array('y', 0, array());
                    }
                }
                $isconstrainded = count($rels);

                $query = "SELECT rec3.rec_RecTypeID, rd2.dtl_Value as reltype, count(rec1.rec_ID) FROM Records rec1
                , recDetails rd2
                , recDetails rd3
                , recDetails rd1, Records rec3
                where rec1.rec_RecTypeID=1
                and rec1.rec_ID = rd1.dtl_RecID and rd1.dtl_DetailTypeID=7
                and rd1.dtl_Value in (select rec2.rec_ID from Records rec2 where rec2.rec_RecTypeID=$rt_id)
                and rec1.rec_ID = rd2.dtl_RecID and rd2.dtl_DetailTypeID=6
                and rec1.rec_ID = rd3.dtl_RecID and rd3.dtl_DetailTypeID=5 and rec3.rec_ID=rd3.dtl_Value
                group by rec3.rec_RecTypeID, rd2.dtl_Value order by rec3.rec_RecTypeID";
                $cnt = 0;
                if(count($details)==0){
                    $rt_cnt = get_rt_usage($rt_id);
                }

                if($rt_cnt>0){
                    $res = mysql_query($query);
                    if ($res) {
                        while (($row = mysql_fetch_array($res))) {
                            $pt_rt_id = $row[0];
                            if($isconstrainded<1 && !@$rels[$pt_rt_id]){
                                $rels[$pt_rt_id] = array('n', 0, array());
                            }
                            if(@$rels[$pt_rt_id]){
                                $rels[$pt_rt_id][1] = $rels[$pt_rt_id][1] + $row[2];
                                $rels[$pt_rt_id][2][$row[1]] = $row[2];
                                $cnt = $cnt + $row[2];
                            }
                        }
                    }
                }

                array_push($details, array('dt_id'=>$dt_id, 'dt_name'=>$dt[$idx_dt_name], 'req'=>$dt[$idx_dt_req],
                    'max'=>$dt[$idx_dt_max], 'type'=>$dt_type, 'isconstrained'=>$isconstrainded, 'count'=>$cnt, 'rels'=>$rels));
            } // relmarker
        }

        if(count($details)>0){
            $resrt[$rt_id] = array('name'=>$rtStructs['names'][$rt_id], 'count'=>$rt_cnt, "details"=>$details);
        }
    }

    function get_rt_usage($rt_id){
        $res = mysql__select_array("Records","count(*)","rec_RecTypeID=".$rt_id);
        return $res[0];
    }
    
    // OBJECT
    $object = new stdClass();
    $object->HeuristBaseURL     = HEURIST_BASE_URL;
    $object->HeuristDBName      = HEURIST_DBNAME;
    $object->HeuristProgVersion = HEURIST_VERSION;
    $object->HeuristDBVersion   = HEURIST_DBVERSION;
    
    // ALL RECORD TYPES WITH COUNT ZERO  
    $nodes = array();                      
    $query = "SELECT * FROM defRecTypes WHERE rty_ID NOT IN (SELECT DISTINCT rec_recTypeID FROM Records) ORDER BY rty_Name ASC";
    $res = mysql_query($query);
    while ($row = mysql_fetch_row($res)) { // each loop is a complete table row
        $rt_id = $row[0];
        $record = new stdClass();
        $record->name  = $row[1];
        $record->id    = $rt_id;
        $record->count = 0;
        $record->image = $image_base_url.$rt_id;          
    }

    // ALL RECORD TYPES WITH CONNECTIONS
    $links = array();
    foreach ($resrt  as $rt_id=>$rt){
        // Root record
        $rootrecord = new stdClass();
        $rootrecord->name  = $rt['name'];
        $rootrecord->id    = $rt_id;
        $rootrecord->count = $rt['count'];
        $rootrecord->image = $image_base_url.$rt_id;
        
        // Check if this record is in the array already, and if it is, check the counts
        $rootindex = 0;
        $found = false;
        if(count($nodes) > 0) {
            for($i = 0; $i < count($nodes); $i++) {
               if($nodes[$i]->id == $rootrecord->id) {
                  if($rootrecord->count > $nodes[$i]->count) {
                      $nodes[$i]->count = $rootrecord->count;
                  }
                  $rootindex = $i;
                  $found = true;
                  break;
               }
            }
        }
        if(!$found) {
            $rootindex = array_push($nodes, $rootrecord) - 1;
        }
        
        // Check relations
        foreach ($rt['details'] as $details) {
            // Relation record
            $relationrecord = new stdClass();
            $relationrecord->name  = $details['dt_name'];
            $relationrecord->id    = $details['dt_id'];
            $relationrecord->count = $details['count'];
            $relationrecord->image = $image_base_url.$details['dt_id'];
            $relationrecord->unconstrained = $details['isconstrained'] < 1;

            // Relation types
            $relationtypes = array();
            // Details check
            if($details['type']=="resource") {
                array_push($relationtypes, "pointer");
            }else{
                array_push($relationtypes, $details['type']);
            }
            
            // Req check
            if(@$details[req]){
                array_push($relationtypes, substr($details[req],0,3));            
            }

            // Max check
            $mv = intval(@$details['max']);
            if($mv == 1) {
                array_push($relationtypes, "sng");
            }else if($mv > 1) {
                array_push($relationtypes, "lim");
            }else{
                array_push($relationtypes, "rpt");
            }
            $relationrecord->relationtypes = $relationtypes;
            
            // Check usages
            foreach ($details['rels']  as $pt_rt_id=>$data){
                if(@$rtStructs['names'][$pt_rt_id]){
                    // Record overview
                    $usagerecord = new stdClass();
                    $usagerecord->name  = $rtStructs['names'][$pt_rt_id];
                    $usagerecord->id    = $pt_rt_id;
                    $usagerecord->count = $data[1];
                    $usagerecord->image = $image_base_url.$pt_rt_id;
                    
                    $property = strval($usagerecord->id);
                    if(!property_exists($usagerecord, $property)) {
                        $nodes->$property = $usagerecord;
                    }

                    // Terms
                    if(@$data[2]){
                        $terms = array();
                        foreach ($data[2] as $term_id=>$cnt){
                            $term = new stdClass();
                            $term->name  = $rtTerms[$term_id][0];
                            $term->count = $cnt;
                            array_push($terms, $term);
                        }
                        $usagerecord->terms = $terms;
                    }
                    
                    // Check if this record is in the array already, and if it is, check the counts
                    $usageindex = 0;
                    $found = false;
                    if(count($nodes) > 0) {
                        for($i = 0; $i < count($nodes); $i++) {
                           if($nodes[$i]->id == $usagerecord->id) {
                              if($usagerecord->count > $nodes[$i]->count) {
                                  $nodes[$i]->count = $usagerecord->count;
                              }
                              $usageindex = $i;
                              $found = true;
                              break;
                           }
                        }
                    }
                    if(!$found) {
                        $usageindex = array_push($nodes, $usagerecord) - 1;
                    }
   
                    // Build link
                    $link = new stdClass();
                    $link->source   = $rootindex;
                    $link->relation = $relationrecord;
                    $link->target   = $usageindex;
                    $link->value    = 1;
                    array_push($links, $link);
                }
            }
        }
    }
    
    $object->nodes = $nodes;
    $object->links = $links;      
    
    print json_format($object, true);

?>