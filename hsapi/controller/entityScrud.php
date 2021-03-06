<?php

    /**
    * SCRUD controller
    * search, create, read, update and delete
    * 
    * Application interface. See hRecordMgr in hapi.js
    * Add/replace/delete details in batch
    *
    * @package     Heurist academic knowledge management system
    * @link        http://HeuristNetwork.org
    * @copyright   (C) 2005-2019 University of Sydney
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

    require_once (dirname(__FILE__).'/../System.php');

    require_once (dirname(__FILE__).'/../entity/dbUsrTags.php');
    require_once (dirname(__FILE__).'/../entity/dbSysDatabases.php');
    require_once (dirname(__FILE__).'/../entity/dbSysIdentification.php');
    require_once (dirname(__FILE__).'/../entity/dbSysGroups.php');
    require_once (dirname(__FILE__).'/../entity/dbSysUsers.php');
    require_once (dirname(__FILE__).'/../entity/dbDefDetailTypeGroups.php');
    require_once (dirname(__FILE__).'/../entity/dbDefFileExtToMimetype.php');
    require_once (dirname(__FILE__).'/../entity/dbDefTerms.php');
    require_once (dirname(__FILE__).'/../entity/dbDefRecTypeGroups.php');
    require_once (dirname(__FILE__).'/../entity/dbDefDetailTypes.php');
    require_once (dirname(__FILE__).'/../entity/dbDefRecTypes.php');
    require_once (dirname(__FILE__).'/../entity/dbSysBugreport.php');
    require_once (dirname(__FILE__).'/../entity/dbSysDashboard.php');
    require_once (dirname(__FILE__).'/../entity/dbSysImportFiles.php');
    require_once (dirname(__FILE__).'/../entity/dbRecThreadedComments.php');
    require_once (dirname(__FILE__).'/../entity/dbRecUploadedFiles.php');
    require_once (dirname(__FILE__).'/../entity/dbRecords.php');
    require_once (dirname(__FILE__).'/../entity/dbUsrBookmarks.php');
    require_once (dirname(__FILE__).'/../entity/dbUsrReminders.php');
    require_once (dirname(__FILE__).'/../dbaccess/utils_db.php');

    $response = array();
    $res = false;

    $system = new System();
    $entity = null;
    
    if($system->init(@$_REQUEST['db'])){
    
        $entity_name = @$_REQUEST['entity'];
        $classname = 'Db'.ucfirst($entity_name);
        $entity = new $classname($system, $_REQUEST);
        //$r = new ReflectionClass($classname);
        //$entity = $r->newInstanceArgs($system, $_REQUEST);        
        //$entity->$method();

        if(!$entity){
            $this->system->addError(HEURIST_ERROR, "Wrong entity parameter: $entity_name");
        }

        if($entity && $entity->isvalid()){
            if(@$_REQUEST['a'] == 'search'){
                $res = $entity->search();
            }else  if(@$_REQUEST['a'] == 'title'){ //search for entity title by id
                $res = $entity->search_title();
            }else if(@$_REQUEST['a'] == 'save'){
                $res = $entity->save();
            }else if(@$_REQUEST['a'] == 'delete'){
                $res = $entity->delete();
            }else if(@$_REQUEST['a'] == 'config'){
                $res = $entity->config();
            }else if(@$_REQUEST['a'] == 'counts'){  //various counts(aggregations) request - implementation depends on entity
                $res = $entity->counts();
            }else if(@$_REQUEST['a'] == 'action' || @$_REQUEST['a'] == 'batch'){ 
                //batch action. see details of operaion for method of particular class
                $res = $entity->batch_action();
            }else {
                $system->addError(HEURIST_INVALID_REQUEST, "Type of request not defined or not allowed");
            }
        }
        
    }
    
    if( is_bool($res) && !$res ){
        $response = $system->getError();
    }else{
        $response = array("status"=>HEURIST_OK, "data"=> $res);
    }
    
    header('Content-type: application/json;charset=UTF-8'); //'text/javascript');
    print json_encode($response);
    exit();
?>