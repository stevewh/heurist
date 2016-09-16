<?php

/**
* Database structure / administration page
*
* @package     Heurist academic knowledge management system
* @link        http://HeuristNetwork.org
* @copyright   (C) 2005-2016 University of Sydney
* @author      Artem Osmakov   <artem.osmakov@sydney.edu.au>
* @license     http://www.gnu.org/licenses/gpl-3.0.txt GNU License 3.0
* @version     4.0
*/

define('LOGIN_REQUIRED',1);

/*
* Licensed under the GNU License, Version 3.0 (the "License"); you may not use this file except in compliance
* with the License. You may obtain a copy of the License at http://www.gnu.org/licenses/gpl-3.0.txt
* Unless required by applicable law or agreed to in writing, software distributed under the License is
* distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied
* See the License for the specific language governing permissions and limitations under the License.
*/
require_once(dirname(__FILE__)."/initPage.php");
?>
<script type="text/javascript" src="<?php echo PDIR;?>hclient/framecontent/databaseAddData.js"></script>

<script type="text/javascript">
    var editing;

    // Callback function on initialization
    function onPageInit(success){
        if(success){

            var databaseAddData = new hDatabaseAddData();

            var $container = $("<div>").appendTo($("body"));
        }
    }            
</script>
</head>
<body style="background-color:white">
    <div style="width:280px;top:0;bottom:0;left:0;position:absolute;padding:5px;">
        <!-- <ul id="menu_container" style="margin-top:10px;padding:2px"></ul>  -->
        <div class="accordion_pnl" style="margin-top:10px;padding:2px">

            <h3>KEYBOARD</h3>
            <div>
                <ul>

                    <li style="padding-left:5px;" class="list-menu-only">
                        <a href="records/add/addRecordPopup.php" id="menulink-add-record" name="auto-popup" class="h3link"
                            title="Add new record of specified record type">
                            Add record</a>
                    </li>

                </ul>
            </div>

        </div>
        
        <div class="accordion_pnl">

            <h3>IMPORT</h3>
            <div>
                <ul>

                    <!-- OLD 
                    <li class="admin-only" style="padding-left:5px;">
                    <a href="import/delimited/importCSV.php" name="auto-popup" class="verylarge h3link"
                    onClick="{return false;}" target="_blank"
                    title="Import data from delimited text file. Supports matching, record creation, record update." >
                    Delimited text (csv, tsv)</a>
                    </li>
                    -->

                    <li id="menu-import-csv" style="padding-left:5px;">
                        <a href="#"
                            title="Import data from delimited text file. Supports matching, record creation, record update.">
                            Delimited text (csv, tsv)</a>
                    </li>

                    <li style="padding-left:5px;">
                        <a href="import/biblio/syncZotero.php" name="auto-popup"  class="fixed h3link embed"
                            onClick="{return false;}"
                            title="Synchronise with a Zotero web library - new records are added to Heurist, existing records updated">
                            Zotero synchronisation</a>
                    </li>

                    <li class="admin-only" style="padding-left:5px;">
                        <a href="import/fieldhelper/synchroniseWithFieldHelper.php" name="auto-popup" class="fixed h3link embed"
                            onClick="{return false;}" target="_blank"
                            title="Index files on the server and create multimedia records for them (reads and creates FieldHelper manifests)">
                            Index multimedia</a>
                    </li>

                    <li style="padding-left:5px;"><a href="import/email/emailProcessingSetup.php" name="auto-popup" class="fixed h3link embed"
                        onClick="{return false;}"
                        title="Harvest email from a designated IMAP email server (set in database administrtion > Databsae > Advanced Properties)">
                        Harvest emails</a>
                    </li>

                    <li style="padding-left:5px;"><a href="import/hyperlinks/importHyperlinks.php" name="auto-popup" class="h3link embed"
                        onClick="{return false;}"
                        title="Import web links from a browser bookmarks file or html web page saved as a file - use bookmarklet for web pages online">
                        Import hyperlinks</a>
                    </li>

                    <li style="padding-left:5px;"><a href="import/importerFramework.php?format=GEO" name="auto-popup" class="fixed h3link embed"
                        onClick="{return false;}"
                        title="Import KML files (geographic data in WKT can be imported from CSV &amp; tab delimited files)">
                        Import KML</a>
                    </li>

                </ul>
            </div>

        </div>

        <div class="accordion_pnl">
            <h3>UTILITIES</h3>
            <div>
                <ul>

                    <li class="admin-only" style="padding-left:5px;"><a href="import/utilities/manageFilesUpload.php" name="auto-popup" 
                    class="large h3link embed"
                        onClick="{return false;}" target="_blank"
                        title="Upload multiple files and/or large files to scratch space or image directories, delete and rename uploaded files">
                        Multi-file upload</a>
                    </li>

                    <li style="padding-left:5px;"><a href="import/utilities/convertTagsToCSV.php" name="auto-popup" class="fixed h3link embed"
                        onClick="{return false;}" target="_blank"
                        title="Convert file with tag + value per line (space separated), to a CSV file with pipe-separated repeat values">
                        Tag-value to CSV</a>
                    </li>

                    <!--
                    <li>-</li>

                    <li>UNMAINTAINED</li>

                    <li style="padding-left:5px;"><a href="import/delimited/importRecordsFromDelimited.html" name="auto-popup" class="large h3link"
                    onClick="{return false;}" target="_blank"
                    title="Import data from delimited text for one record type at a time, addition only (no matching or merging)" >
                    CSV simple import</a>
                    </li>

                    <li class="admin-only" style="padding-left:5px;"><a href="import/delimited/updateDetailsFromDelimited.html" class="large h3link"
                    onClick="{return false;}" target="_blank"
                    title="Update or add fields in existing records from delimited text, specify fields using internal codes" name="auto-popup">
                    CSV field updater</a>
                    </li>
                    -->            
                </ul>
            </div>
        </div>
    </div>
    <div style="left:300px;right:0;top:0;bottom:20;position:absolute;overflow:auto">
        <iframe id="frame_container2">
        </iframe>
    </div>
</body>
</html>