/*
* Copyright (C) 2005-2014 University of Sydney
*
* Licensed under the GNU License, Version 3.0 (the "License"); you may not use this file except
* in compliance with the License. You may obtain a copy of the License at
*
* http://www.gnu.org/licenses/gpl-3.0.txt
*
* Unless required by applicable law or agreed to in writing, software distributed under the License
* is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
* or implied. See the License for the specific language governing permissions and limitations under
* the License.
*/

/**
* Heurist Database Summary Visualisation Helper 
* Needs jQuery, d3.js and fisheye.js to run
*
* @author      Jan Jaap de Groot    <jjedegroot@gmail.com>    
* @copyright   (C) 2005-2014 University of Sydney
* @link        http://Sydney.edu.au/Heurist
* @version     3.1.0
* @license     http://www.gnu.org/licenses/gpl-3.0.txt GNU License 3.0
* @package     Heurist academic knowledge management system
* @subpackage  !!!subpackagename for file such as Administration, Search, Edit, Application, Library
*/

/*******************************START OF FUNCTIONS TO PARSE DATA**********************************/
/** Attempts to grab the first value after searching for a tag*/
function getValue(element, query) {
    var results = element.getElementsByTagName(query);
    if(results && results.length > 0) {
        return results[0];
    }
    return null;
}

/** Returns the ID value of a record */
function getID(record) {
    return parseInt(getValue(record, "rec_ID").textContent);               
}

/** Returns the name value of a record */
function getName(record) {
    return getValue(record, "rec_Name").textContent;                
}

/** Returns the count value of a record */
function getCount(record) {
    return parseInt(getValue(record, "rec_Count").textContent);                
}

/** Returns the image value of a record */
function getImage(record) {
    return getValue(record, "rec_Image").textContent;               
}

/** Returns an object containing the id, name, count and image of a record */
function getInfo(record) {
    var id = getID(record);
    var name = getName(record);
    var count = getCount(record);
    var image = getImage(record);
    var type = record.namespaceURI;
    return {"id": id, "name": name, "count": count, "image": image, "type": type};
}

/** Returns the relation value of a record */
function getRelations(record) {       
    return getValue(record, "rec_Relations");           
}

/** Returns the unconstrained value of a record */
function isUnconstrained(record) {
    var value = getValue(record, "rel_Unconstrained");
    if(value && value === "true") {
        return true;
    }
    return false;
}    

/** Converts the raw XML data to D3 usable nodes and links
 *  Return example
 * 
 * Returns an Object:
 * Object {nodes: Object, links: Array[19]}
    * Contains a "nodes" attribute, this is an Object containing more Objects
    * Contains a "links" attribute, this is an array containg Objects
 * 
 * nodes: Object [Each attribute is an Object as well]
 * Death: Object
     * count: 232
     * fixed: true
     * id: 33
     * image: "http://heur-db-pro-1.ucc.usyd.edu.au/HEURIST_FILESTORE/BoRO_Backup_13Aug14/rectype-icons/33.png"
     * index: 6
     * name: "Death"
     * px: 110.60620663669448
     * py: 87.9311955887024
     * type: "usagerecord"
     * weight: 4
     * x: 110.60620663669448
     * y: 87.9311955887024
     * __proto__: Object
 * Digital media item: Object
 * Educational institution: Object
 * Eventlet: Object
 * Military award: Object
 * etc.
 * 
 * 
 * links: Array[19]
 * 0: Object
     * pointer: "BOR entry pdf"
     * source: Object
         * count: 2575
         * fixed: true
         * id: 10
         * image: "http://heur-db-pro-1.ucc.usyd.edu.au/HEURIST_FILESTORE/BoRO_Backup_13Aug14/rectype-icons/10.png"
         * index: 1
         * name: "Person"
         * px: 388.425870681868
         * py: 76.42969215610094
         * type: "rootrecord"
         * weight: 13
         * x: 388.425870681868
         * y: 76.42969215610094
         * __proto__: Object
     * target: Object
         * count: 4718
         * fixed: true
         * id: 5
         * image: "http://heur-db-pro-1.ucc.usyd.edu.au/HEURIST_FILESTORE/BoRO_Backup_13Aug14/rectype-icons/5.png"
         * index: 0
         * name: "Digital media item"
         * px: 89.0722588084383
         * py: 201.8612925141735
         * type: "rootrecord"
         * weight: 2
         * x: 89.0722588084383
         * y: 201.8612925141735
         * __proto__: Object
     * __proto__: Object
 * 1: Object
 * 2: Object
 * 3: Object
 * etc.
 * 
 */
var maxCount = 1;
function convertData() {
    maxCount = 1;
    
    // Holds a list of unique nodes
    // Has attributes 'id', 'name', 'count', 'image' and 'type'
    var nodes = {};
    
    // Relationships between the nodes. 
    // Has attributes 'source' and 'target'
    var links = [];
    
    // A string array containing names of nodes to filter.
    var filter = getFilter();
    
    // Going through all Records with namespace 'rootrecord'
    var roots = xml.documentElement.getElementsByTagNameNS("rootrecord", "Record");
    for(var i = 0; i < roots.length; i++) {
        // Retrieve info about this record
        var root = roots[i];
        var rootInfo = getInfo(root);
        //console.log(rootInfo);
        
        // Check if we should filter this record
        var index = $.inArray(rootInfo.name, filter);
        if(index == -1/* && rootInfo.count > 0*/) {
            // Going through all linked relation Records with namespace 'relationrecord'
            var relations = root.getElementsByTagNameNS("relationrecord", "Record");
            if(relations && relations.length > 0) {
                for(var j = 0; j < relations.length; j++ ){
                    // Get record info 
                    var relation = relations[j];
                    var relationInfo = getInfo(relation);
                    //console.log(relationInfo);
         
                    // Unconstrained check
                    var constrained = isUnconstrained(relation);
                    //console.log(constrained);
                    
                    // Check types
                    var types = relation.getElementsByTagName("rel_Name");
                    //console.log(types);
                    if(types && types.length > 0) {
                        for(var k = 0; k < types.length; k++) {
                            var type = types[k].textContent;
                            //console.log(type);
                        }
                    }
                    
                    // Going through all linked usage Records with namespace 'usagerecord'
                    var usages = relation.getElementsByTagNameNS("usagerecord", "Record");
                    if(usages && usages.length > 0) {
                        for(var k = 0; k < usages.length; k++) {
                            // Get record info 
                            var usage = usages[k];
                            var usageInfo = getInfo(usage);
                            //console.log(usageInfo);
                            
                            // Check if we should filter this record
                            var index = $.inArray(usageInfo.name, filter); 
                            if(index == -1/* && usageInfo.count > 0*/) {
                                // Construct a link; add root record info
                                var link = {};
                                if(!(rootInfo.name in nodes)) {
                                    nodes[rootInfo.name] = rootInfo;
                                    link["source"] = rootInfo;
                                    
                                     // Count check
                                    if(rootInfo.count > maxCount) {
                                        maxCount = rootInfo.count;                                                                     
                                    }
                                }else{
                                    link["source"] = nodes[rootInfo.name];
                                }

                                // Link construction; add usage record info
                                if(!(usageInfo.name in nodes)) { // Check if a node with this name has been added already 
                                    nodes[usageInfo.name] = usageInfo; // It has not; add it to the list of nodes
                                    link["target"] = usageInfo;    // Set the target of the root link to this reoord
                                    
                                     // Count check
                                    if(usageInfo.count > maxCount) {
                                        maxCount = usageInfo.count;
                                    }
                                }else{ // Node with this name exists already, use that record 
                                    link["target"] = nodes[usageInfo.name]; 
                                }

                                // Add link to array
                                link["relation"] = relationInfo;
                                links.push(link);
                            }else{
                                // Display root node anyways
                                if(!(rootInfo.name in nodes)) {
                                    nodes[rootInfo.name] = rootInfo;
                                    
                                    // Count check
                                    if(rootInfo.count > maxCount) {
                                        maxCount = rootInfo.count;
                                    }
                                }
                            }
                        }
                    }
                }
             }
        } 
    }
    
    // Construct a data object and return it.
    var obj = {"nodes": nodes, "links": links};
    console.log("Data has been transformed to D3 format:");
    console.log(obj);
    return obj;
}

/** Constructs the overlay data for a root element in the XML
  * Return example
  * 
  * Returns an array of Objects
  * [Object, ....., Object]
  * 
  * 0: Object
      * style: "bold"
      * text: "Person (n=2575)"
      * type: "title"
      * __proto__: Object
  * 
  * 1: Object
      * style: "none"
      * text: "______________________"
      * type: "explanation"
      * __proto__: Object
  * 
  * etc.
  */
function getRecordOverlayInfo(record) {
    var array = [];

    var roots = xml.documentElement.getElementsByTagNameNS("rootrecord", "Record");
    for(var i = 0; i < roots.length; i++) {
        // Retrieve info about this record
        var root = roots[i];
        var rootInfo = getInfo(root);
        //console.log(rootInfo);
        
        if(rootInfo.id == record.id) { 
            var added = false;
            array.push({text: rootInfo.name + " (n=" + rootInfo.count +")", type: "title", style: "bold"});
            array.push({text: " ", type: "explanation", style: "none"});
            
            // Going through all linked relation Records with namespace 'relationrecord'
            var relations = root.getElementsByTagNameNS("relationrecord", "Record");
            if(relations && relations.length > 0) {
                for(var j = 0; j < relations.length; j++ ){
                    // Get record info 
                    var relation = relations[j];
                    var relationInfo = getInfo(relation);
                    //console.log(relationInfo);
     
                    // Unconstrained check
                    var constrained = isUnconstrained(relation);
                    //console.log(constrained);
                    
                    // Check types
                    var types = relation.getElementsByTagName("rel_Name");
                    //console.log(types);
                    if(types && types.length > 0) {
                        for(var k = 0; k < types.length; k++) {
                            var type = types[k].textContent;
                            //console.log(type);
                            if(type == "rpt") {
                                 // Going through all linked usage Records with namespace 'usagerecord'
                                var usages = relation.getElementsByTagNameNS("usagerecord", "Record");
                                if(usages && usages.length > 0) {
                                    for(var l = 0; l < usages.length; l++) {
                                        // Get record info 
                                        var usage = usages[l];
                                        var usageInfo = getInfo(usage);
                                        //console.log(usageInfo);
                                        
                                        if(!added) {
                                            array.push({text: relationInfo.name + " [R]", type: "field", style: "bold"}); 
                                            added = true;
                                        }
                                        array.push({text: "> " + usageInfo.name + " (n=" + usageInfo.count +")", type: "relation", style: "none"});
                                    } 
                                }
                            }else if(type == "sng") {
                                // Going through all linked usage Records with namespace 'usagerecord'
                                var usages = relation.getElementsByTagNameNS("usagerecord", "Record");
                                if(usages && usages.length > 0) {
                                    for(var l = 0; l < usages.length; l++) {
                                        // Get record info 
                                        var usage = usages[l];
                                        var usageInfo = getInfo(usage);
                                        //console.log(usageInfo);
                                        
                                        if(!added) {
                                            array.push({text: relationInfo.name + " [S]", type: "field", style: "bold"}); 
                                            added = true;
                                        }
                                        array.push({text: "> " + usageInfo.name + " (n=" + usageInfo.count +")", type: "relation", style: "none"});
                                    } 
                                }
                            }
                        }
                    }
                }
            }
            break;
        } 
    }
    
    // Add legend
    array.push({text: " ", type: "explanation", style: "none"});
    array.push({text: "bold = required", type: "explanation", style: "bold"});
    array.push({text: "[S] = single value", type: "explanation", style: "none"});
    array.push({text: "[R] = repeating value", type: "explanation", style: "none"});   
    
    console.log("Overlay data has been generated:");
    console.log(array);
    return array;
}

/** Constructs the overlay data for a relation element in the XML */
function getLineOverlayInfo(record) {
    var array = [];
    array.push({text: "LINE OVERLAY = NOT DONE YET!", type: "title", style: "none"});
    return array;   
}
/***********************************END OF FUNCTIONS TO PARSE DATA***********************************/



/*******************************START OF VISUALISATION HELPER FUNCTIONS*******************************/
/** Calculates log base 10 */
function log10(val) {
    return Math.log(val) / Math.LN10;
}

/** Executes the chosen formula with a chosen count & max size */
function executeFormula(count, maxSize) {
    // Avoid minus infinity and wrong calculations etc.
    if(count <= 0) {
        count = 1;
    }
    
    //console.log("Count: " + count + ", max count: " + maxCount + ", max Size: " + maxSize);
    var formula = getSetting(setting_formula);
    if(formula == "logarithmic") { // Log                                                           
        return Math.log(count) / Math.log(maxCount) * maxSize;
    }
    else if(formula == "unweighted") { // Unweighted
        if(count > 0) {
            return 2;
        }else{
            return 0;
        }                                            
    }else {  // Linear
        return (count/maxCount) * maxSize; 
    }       
}

/** Calculates the line width that should be used */
function getLineWidth(count) {
    var maxWidth = getSetting(setting_linewidth);                                                                     
    return 0.5 + (executeFormula(count, maxWidth) / 2);
}            

/** Calculates the marker width that should be used */
function getMarkerWidth(count) {
    return 4 + getLineWidth(count)*2;
}

/** Calculates the entity raadius that should be used */
var iconSize = 16; // The icon size
var circleSize = iconSize * 0.75; // Circle around icon size
function getEntityRadius(count) {
    var maxRadius = getSetting(setting_entityradius);
    return circleSize + executeFormula(count, maxRadius);
}
/********************************END OF VISUALISATION HELPER FUNCTIONS********************************/



/***********************************START OF VISUALISATION FUNCIONS***********************************/
/** Visualizes the data */ 
function visualizeData() {
    // SVG data    
    var width = $("svg").width();     // Determine the SVG width
    var height = $("svg").height();   // Determine the SVG height    
    $("svg").empty();                 // Remove all old elements
    var svg = d3.select("svg");       // Select the SVG with D3                 
    var data = convertData();         // Convert XML to usable D3 data
    
    // Color settings
    var linecolor = getSetting(setting_linecolor);
    var markercolor = getSetting(setting_markercolor);
    var countcolor = getSetting(setting_countcolor);
    var textcolor = getSetting(setting_textcolor);
    
    // Line settings
    var linetype = getSetting(setting_linetype);
    var linelength = getSetting(setting_linelength);

    // Gravity settings
    var gravity = getSetting(setting_gravity);
    var attraction = getSetting(setting_attraction);
    var fisheyeEnabled = getSetting(setting_fisheye);
 
    // Creating D3 force
    var force = d3.layout.force()
                         .nodes(d3.values(data.nodes))
                         .links(data.links)
                         .charge(attraction)        // Using the attraction setting
                         .linkDistance(linelength)  // Using the linelength setting 
                         .on("tick", function(d, i) {
                             // Determine what function to call on force.drag
                             if(linetype == "curved") { 
                                 return curvedTick();
                             }else{
                                 return straightTick();
                             }
                         })
                         .size([width, height])
                         .start();   
                   
    // Adding marker definitions
    svg.append("defs").selectAll("marker")
                      .data(force.links())
                      .enter()
                      .append("svg:marker")    
                      .attr("id", function(d) {
                            return "marker" + d.relation.id;
                      })
                      .attr("markerWidth", function(d) {    
                          return getMarkerWidth(d.relation.count);             
                      })
                      .attr("markerHeight", function(d) {
                          return getMarkerWidth(d.relation.count);
                      })
                      .attr("refX", -1)
                      .attr("refY", 0)
                      .attr("viewBox", "0 -5 10 10")
                      .attr("markerUnits", "userSpaceOnUse")
                      .attr("orient", "auto")
                      .attr("fill", markercolor) // Using the markercolor setting
                      .attr("opacity", "0.6")
                      .append("path")
                      .attr("d", "M0,-5L10,0L0,5");

    // Add the chosen lines [using the linetype setting]  
    var lines;
    if(linetype == "curved") {
        // Add curved lines
         lines = svg.append("svg:g").selectAll("path")
                                    .data(force.links())
                                    .enter()
                                    .append("svg:path");
    }else{
        // Add straight lines
        lines = svg.append("svg:g").selectAll("polyline.link")
                                   .data(force.links())
                                   .enter()
                                   .append("svg:polyline");
    }     
    // Adding shared attributes
    lines.attr("class", "link") 
         .attr("stroke", linecolor) 
         .attr("marker-mid", function(d) {
            return "url(#marker" + d.relation.id + ")";
         })
         .style("stroke-width", function(d) { 
            return 0.5 + getLineWidth(d.relation.count);
         })
         .style("stroke-dasharray", (function(d) {
             if(d.relation.count == 0) {
                 console.log("D target count == 0, target: " + d.target.name + ", source: " + d.source.name);
                 console.log(d);
                return "3, 3"; 
             } 
         })) 
         .on("click", function(d) {
             // Construct line overlay data, then use it to generate the overlay itself
             createOverlay(d3.event.offsetX, d3.event.offsetY, getLineOverlayInfo(d.relation));    
         })
         .on("mouseout", function(d) {
             removeOverlay();                                 
         });
         
    // Check what methods to call on drag
     var node_drag;
     if(gravity === "aggressive") {
         // Default method
         node_drag = force.drag;
     }else{
         // Custom methods
         node_drag = d3.behavior.drag()
                                .on("dragstart", dragstart)
                                .on("drag", dragmove)
                                .on("dragend", dragend);
     }
                               
    /** Called when a dragging event starts */
    function dragstart(d, i) {
        force.stop() // Stop force from auto positioning
        if(gravity === "touch") {
            svg.selectAll(".node").attr("fixed", function(d, i) {
                d.fixed = false;
                return false;
            });
        }
    }

    /** Caled when a dragging move event occurs */
    function dragmove(d, i) {
        // Update locations
        d.px += d3.event.dx;
        d.py += d3.event.dy;
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        
        // Update the location in localstorage
        var record = localStorage.getItem(d.id);
        var obj;
        if(record === null) {
            obj = {}; 
        }else{
            obj = JSON.parse(record);
        }  
        
        // Set attributes 'x' and 'y' and store object
        obj.px = d.px;
        obj.py = d.py;
        obj.x = d.x;
        obj.y = d.y;
        localStorage.setItem(d.id, JSON.stringify(obj));
    
        // Update nodes & lines                                                           
        if(linetype == "curved") { 
             curvedTick();
        }else{
             straightTick();
        }
    }
    
    /** Called when a dragging event ends */
    function dragend(d, i) {
         d.fixed = true; // Node may not be auto positioned
         
         // Update nodes & lines 
         if(linetype == "curved") { 
             curvedTick();
         }else{
             straightTick();
         } 
         
         // Check if force may resume
          if(gravity === "touch") {
                force.resume(); 
          } 
    }
         
    // Defining the nodes
    var node = svg.selectAll(".node")
                  .data(force.nodes())
                  .enter().append("g")
                  .attr("class", function(d, i) {
                      return "node " + d.type;
                  }) 
                  .attr("transform", "translate(100, 100)")
                  .attr("x", function(d) {
                      // Setting 'x' based on localstorage
                      var record = localStorage.getItem(d.id);
                      if(record) {
                          var obj = JSON.parse(record);
                          if("x" in obj) { // Check if attribute is valid
                              d.x = obj.x;
                              return obj.x;
                          }
                      }
                  })
                  .attr("y", function(d) {
                      // Setting 'y' based on localstorage
                      var record = localStorage.getItem(d.id);
                      if(record) {
                          var obj = JSON.parse(record);
                          if("y" in obj) { // Check if attribute is valid
                              d.y = obj.y;
                              return obj.y;  
                          }
                      }
                  })
                  .attr("px", function(d) {
                      // Setting 'px' based on localstorage
                      var record = localStorage.getItem(d.id);
                      if(record) {
                         var obj = JSON.parse(record);
                         if("px" in obj) { // Check if attribute is valid
                             d.px = obj.px;
                             return obj.px;
                         }
                      }
                  })
                  .attr("py", function(d) {
                      // Setting 'py' based on localstorage
                      var record = localStorage.getItem(d.id);
                      if(record) {
                          var obj = JSON.parse(record);
                          if("py" in obj) { // Check if attribute is valid
                              d.py = obj.py; 
                              return obj.py;
                          }
                      }
                  })
                  .attr("fixed", function(d) {
                      // Setting 'fixed' based on localstorage
                      var record = localStorage.getItem(d.id);
                      if(record) {
                          if(d.x > 0 && d.x < width && d.y > 0 && d.y < height && gravity !== "aggressive") {
                                d.fixed = true;
                                return true;
                          }else{
                                d.fixed = false;
                                return false; 
                          }
                      }           
                      return false;
                  })        
                  .on("click", function(d) {
                       // Check if it's not a click after dragging
                       if(!d3.event.defaultPrevented) {
                            createOverlay(d3.event.offsetX, d3.event.offsetY, getRecordOverlayInfo(d));
                       }
                  })
                  .on("mouseout", function(d) {
                     removeOverlay();                                 
                  })
                  .call(node_drag);
    
    // Adding the background circles to the nodes
    var bgcircle = node.append("circle")
                       .attr("r", function(d) {
                            //console.log("COUNT for " + d.name + ": " + d.count);
                            return getEntityRadius(d.count);
                       })
                       .attr("class", "background")
                       .attr("fill", countcolor)
                       .style("stroke", function(d) {
                           if(d.selected == true) {
                                return "#aa0";
                           }
                           return "#000";
                       });

    // Adding the foreground circles to the nodes
    var fgcircle = node.append("circle")
                       .attr("r", circleSize)
                       .attr("class", "around foreground");
   
    // Adding icons to the nodes 
    var icon = node.append("svg:image") 
                   .attr("xlink:href", function(d) {
                        return d.image;
                   })
                   .attr("x", iconSize/-2)
                   .attr("y", iconSize/-2)
                   .attr("height", iconSize)
                   .attr("width", iconSize);

    // Adding shadow text to the nodes 
    var shadowtext = node.append("text")
                         .attr("x", 0)
                         .attr("y", -iconSize)
                         .attr("class", "center shadow")
                         .text(function(d) { 
                            return d.name; 
                         });
        
    // Adding normal text to the nodes 
    var fronttext = node.append("text")
                        .attr("x", 0)
                        .attr("y", -iconSize)
                        .attr("class", "center namelabel")
                        .attr("fill", textcolor)
                        .text(function(d) { 
                           return d.name; 
                        });
    
    // Fish eye check
    if(fisheyeEnabled == "true") {
        // Create fish eye
        var fisheye = d3.fisheye.circular()
                                .radius(300)
                                .distortion(2);
                                
        // Listen to mouse movements                         
        svg.on("mousemove", function() {
            force.stop();
            fisheye.focus(d3.mouse(this));
            
            node.each(function(d) { 
                d.fisheye = fisheye(d); 
            })
            .attr("x", function(d) {
                return d.fisheye.x;
            })
            .attr("y", function(d) {
                return d.fisheye.y;
            })
            .attr("transform", function(d) {
                return "translate(" + d.fisheye.x + "," + d.fisheye.y + ")"; 
            });
            
            // Resize background circles
            bgcircle.each(function(d) {
                d.fisheye = fisheye(d);
            })
            .attr("r", function(d) {
                return getEntityRadius(d.count)*d.fisheye.z;
            });
            
            // Resize foreground circles
            fgcircle.each(function(d) {
                d.fisheye = fisheye(d);
            })
            .attr("r", function(d) {
                return circleSize*d.fisheye.z;
            });
            
            // Resize icons
            icon.each(function(d) {
                d.fisheye = fisheye(d);
            })
            .attr("x", function(d) {
                return (iconSize/-2) * d.fisheye.z;
            })
            .attr("y", function(d) {
                return (iconSize/-2) * d.fisheye.z;
            })
            .attr("height", function(d) {
                return iconSize * d.fisheye.z;
            })
            .attr("width", function(d) {
                return iconSize * d.fisheye.z;
            });
            
            // Shadow text
            shadowtext.each(function(d) {
                d.fisheye = fisheye(d);
            })
            .attr("y", function(d) {
                return -iconSize*d.fisheye.z;   
            })
            .style("font-size", function(d) {
                return 10*d.fisheye.z + "px";
            }, "important");
            
            // Front text
            fronttext.each(function(d) {
                d.fisheye = fisheye(d);
            })
            .attr("y", function(d) {
                return -iconSize*d.fisheye.z;   
            })
            .style("font-size", function(d) {
                return 10*d.fisheye.z + "px";
            }, "important");
            
            // Lines
            if(linetype == "curved") {
                // Curved
                force.stop();
                lines.each(function(d) {
                    d.fisheye = fisheye(d);
                })
                .attr("d", function(d) {
                    var dx = d.target.fisheye.x - d.source.fisheye.x,
                        dy = d.target.fisheye.y - d.source.fisheye.y,
                        dr = Math.sqrt(dx * dx + dy * dy)/1.5,
                        mx = d.source.fisheye.x + dx,
                        my = d.source.fisheye.y + dy;
                        
                    return [
                      "M",d.source.fisheye.x,d.source.fisheye.y,
                      "A",dr,dr,0,0,1,mx,my,
                      "A",dr,dr,0,0,1,d.target.fisheye.x,d.target.fisheye.y
                    ].join(" ");
                });
            }else{
                // Straight
                lines.attr("points", function(d) {
                   return d.source.fisheye.x + "," + d.source.fisheye.y + " " +
                          (d.source.fisheye.x +(d.target.fisheye.x-d.source.fisheye.x)/2) + "," + 
                          (d.source.fisheye.y +(d.target.fisheye.y-d.source.fisheye.y)/2) + " " +  
                          d.target.fisheye.x + "," + d.target.fisheye.y;
                });
            }
            
        }); 
    }                   
    
    /** Tick handler for curved lines */
    function curvedTick() {
        // Calculate the curved segments
        lines.attr("d", function(d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy)/1.5,
                mx = d.source.x + dx,
                my = d.source.y + dy;
                
            return [
              "M",d.source.x,d.source.y,
              "A",dr,dr,0,0,1,mx,my,
              "A",dr,dr,0,0,1,d.target.x,d.target.y
            ].join(" ");
        });

        // Update node locations
        node.attr("transform", function(d) { 
             return "translate(" + d.x + "," + d.y + ")"; 
        });
    }
    
    /** Tick handler for straight lines */                           
    function straightTick() {
        // Calculate the straight points
        lines.attr("points", function(d) {
           return d.source.x + "," + d.source.y + " " +
                  (d.source.x +(d.target.x-d.source.x)/2) + "," + 
                  (d.source.y +(d.target.y-d.source.y)/2) + " " +  
                  d.target.x + "," + d.target.y;
        });

         // Update node locations
        node.attr("transform", function(d) { 
             return "translate(" + d.x + "," + d.y + ")"; 
        });
    }
    
}
/***********************************END OF VISUALISATION FUNCIONS************************************/



/******************************START OF FUNCTIONS TO DISPLAY AN OVERLAY***********************************/
/** Create an overlay based on mouse hover x & y and an array of information to display */
var horizontalOffset = 5;
var verticalOffset = 12;
function createOverlay(x, y, info) {
    $("#overlay").remove();
    
    // Add overlay container
    var svg = d3.select("svg");                 
    var overlay = svg.append("g")
                     .attr("id", "overlay")      
                     .attr("transform", "translate(" +x+ "," +(y+20)+ ")");
    
    // Draw a semi transparant rectangle       
    var rect = overlay.append("rect")
                      .attr("class", "semi-transparant")              
                      .attr("x", 0)
                      .attr("y", 0);

    // Adding text
    var text = overlay.selectAll("text")
                      .data(info)
                      .enter()
                      .append("text")
                      .attr("x", horizontalOffset)        // Some left padding
                      .attr("y", function(d, i) {
                          return (i+0.5)*verticalOffset;      // Position calculation
                      })
                      .attr("dx", function(d, i) {
                          if(d.type == "relation") {
                              return horizontalOffset;    // Relation text pushed right
                          }
                          return 0;
                      })
                      .attr("dy", function(d, i) {
                          if(d.type == "relation") {      // Relation text pushed up
                              return 2;
                          }else if(d.type == "explanation") {
                              return 0;
                          }                     
                          return 5; 
                      })
                      .text(function(d) {                 // Using text attribute
                          return d.text;
                      })
                      .style("font-weight", function(d) { // Font weight based on style
                          return d.style;
                      })
                      .style("font-size", function(d) {   // Font size based on type
                          if(d.type == "title") {
                              return "11px";
                          }else if(d.type == "field") {
                              return "10px";
                          }else if(d.type == "explanation") {
                              return "8px";
                          }
                          return "9px";
                      }, "important");                               
  
    // Calculate optimal rectangle size
    var maxWidth = 1;
    var maxHeight = 1;                              
    for(var i = 0; i < text[0].length; i++) {
        var bbox = text[0][i].getBBox();

        // Width
        var width = bbox.width;
        if(width > maxWidth) {
            maxWidth = width;
        }
        
        // Height
        var y = bbox.y;
        if(y > maxHeight) {
            maxHeight = y;
        }
    }
    
    // Set optimal width & height
    rect.attr("width", maxWidth + 3*horizontalOffset)
        .attr("height", maxHeight + verticalOffset);
    
}

/** Slight delay, fades away and then removes itself. */
function removeOverlay() {
    $("#overlay").delay(500).fadeOut(500, function() {
         $(this).remove();
    });
}
/********************************END OF FUNCTIONS TO DISPLAY AN OVERLAY***********************************/



/*******************************START OF FUNCTIONS TO HANDLE SETTINGS********************************/
/** SETTING NAMES */
var setting_linecolor     = "setting_linecolor";
var setting_markercolor   = "setting_markercolor";
var setting_countcolor    = "setting_countcolor";
var setting_textcolor     = "setting_textcolor";
var setting_linetype      = "setting_linetype";
var setting_linelength    = "setting_linelength";
var setting_linewidth     = "setting_linewidth";
var setting_entityradius  = "setting_entityradius";
var setting_formula       = "setting_formula";
var setting_gravity       = "setting_gravity";
var setting_attraction    = "setting_attraction";
var setting_fisheye       = "setting_fisheye";

/** Returns a setting from local storage */
function getSetting(setting) {
    return localStorage.getItem(setting);
}

/** Returns a String array containing names of records to filter */
function getFilter() {
    var names = [];   
    $(".show-record").each(function() {
        var checked = $(this).is(':checked'); 
        if(!checked) {
            var name = $(this).attr("name");
            names.push(name);
        }
    });
    return names;
}

/** Checks the local storage settings */
function checkLocalStorage() {
    // Set linecolor default if needed
    var linecolor = getSetting(setting_linecolor); 
    if(linecolor === null) {
        localStorage.setItem(setting_linecolor, "#22a");
    }
    
    // Set markercolor default if needed
    var markercolor = getSetting(setting_markercolor);
    if(markercolor === null) {
        localStorage.setItem(setting_markercolor, "#000");
    }
    
    // Set countcolor default if needed
    var countcolor = getSetting(setting_countcolor);
    if(countcolor === null) {
        localStorage.setItem(setting_countcolor, "#262");
    }
    
    // Set textcolor default if needed
    var textcolor = getSetting(setting_textcolor);
    if(textcolor === null) {
        localStorage.setItem(setting_textcolor, "#b22");
    }
    
    // Set linetype default if needed
    var linetype = getSetting(setting_linetype);
    if(linetype === null) {
        localStorage.setItem(setting_linetype, "straight");
    }
    
    // Set linelength default if needed
    var linelength = getSetting(setting_linelength);
    if(linelength === null) {
        localStorage.setItem(setting_linelength, 300);
    }

    // Set linewidth default if needed
    var linewidth = getSetting(setting_linewidth);
    if(linewidth === null) {
        localStorage.setItem(setting_linewidth, 15);
    }
    
    // Set entity radius default if needed
    var entityradius = getSetting(setting_entityradius);
    if(entityradius === null) {
        localStorage.setItem(setting_entityradius, 30);
    }
    
    // Set formula default if needed
    var formula = getSetting(setting_formula);
    if(formula === null) {
        localStorage.setItem(setting_formula, "linear");
    }
    
    // Set gravity default if needed
    var gravity = getSetting(setting_gravity);
    if(gravity === null) {
        localStorage.setItem(setting_gravity, "touch");
    }
    
    // Set attraction default if needed
    var attraction = getSetting(setting_attraction);
    if(attraction === null) {
        localStorage.setItem(setting_attraction, -700);
    }
    
    // Set fish eye default if needed
    var fisheye = getSetting(setting_fisheye);
    if(fisheye === null) {
        localStorage.setItem(setting_fisheye, false);
    }
}
/********************************END OF FUNCTIONS TO HANDLE SETTINGS**********************************/



/*********************** START OF FUNCTIONS TO EXECUTE WHEN THE DOCUMENT IS DONE LOADING ********************/
/** Body is done with loading */
var xml;
$(document).ready(function() {
    // Check localstorage settings
    checkLocalStorage();
    
    /** LINE COLOR SETTING */
    // Set line color setting in UI
    $("#linecolor").css("background-color", getSetting(setting_linecolor));

    // Listen to 'line color' selection changes
    $('#linecolor').colpick({
        layout: 'hex',
        onSubmit: function(hsb, hex, rgb, el) {
            var color = "#"+hex; 
            
            localStorage.setItem(setting_linecolor, color);
            $(".link").attr("stroke", color);
    
            $(el).css('background-color', color);
            $(el).colpickHide();
        }
    });
    
    /** MARKER COLOR SETTING */
    // Set marker color in UI
    $("#markercolor").css("background-color", getSetting(setting_markercolor));
    
    // Listen to 'marker color' selection changes
    $('#markercolor').colpick({
        layout: 'hex',
        onSubmit: function(hsb, hex, rgb, el) {
            var color = "#"+hex; 
            
            localStorage.setItem(setting_markercolor, color);
            $("marker").attr("fill", color);
            
            $(el).css('background-color', color);
            $(el).colpickHide();
        }
    });
    
    /** COUNT COLOR SETTING */
    // Set count color in UI
    $("#countcolor").css("background-color", getSetting(setting_countcolor));

    // Listen to 'count color' selection changes
    $('#countcolor').colpick({
        layout: 'hex',
        onSubmit: function(hsb, hex, rgb, el) {
            var color = "#"+hex; 
            
            localStorage.setItem(setting_countcolor, color);
            $(".background").attr("fill", color);
            
            $(el).css('background-color', color);
            $(el).colpickHide();
        }
    });
    
    /** TEXT COLOR SETTING */
    // Set text color in UI
    $("#textcolor").css("background-color", getSetting(setting_textcolor));

    // Listen to 'count color' selection changes
    $('#textcolor').colpick({
        layout: 'hex',
        onSubmit: function(hsb, hex, rgb, el) {
            var color = "#"+hex; 
            
            localStorage.setItem(setting_textcolor, color);
            $(".namelabel").attr("fill", color);
            
            $(el).css('background-color', color);
            $(el).colpickHide();
        }
    });
    
    /** LINE TYPE SETTING */
    // Set line type setting in UI
    $("#linetype option[value='" +getSetting(setting_linetype)+ "']").attr("selected", true);
    
    // Listens to linetype selection changes
    $("#linetype").change(function(e) {
        localStorage.setItem(setting_linetype, $("#linetype").val());
        visualizeData();
    });
    
    /** LINE LENGTH SETTING */
    // Set line length setting in UI
    $("#linelength").val(getSetting(setting_linelength));
    
    // Listen to line length changes
    $("#linelength").change(function() {
        localStorage.setItem(setting_linelength, $(this).val());
        visualizeData();
    });
    
    /** LINE WIDTH SETTING */
    // Set line width setting in UI
    $("#linewidth").val(getSetting(setting_linewidth));
    
    // Listen to line width changes
    $("#linewidth").change(function() {
        localStorage.setItem(setting_linewidth, $(this).val());
        visualizeData();
    });
    
    /**  MAX RADIUS SETTING */
    // Set entity radius setting in UI
    $("#entityradius").val(getSetting(setting_entityradius));
    
    // Listen to line width changes
    $("#entityradius").change(function() {
        localStorage.setItem(setting_entityradius, $(this).val());
        visualizeData();
    });
    
    /** LINE LENGTH SETTING */
    // Set formula setting in UI
    $("#formula option[value='" +getSetting(setting_formula)+ "']").attr("selected", true); 

    // Listen to formula changes
    $("#formula").change(function() {
        localStorage.setItem(setting_formula, $(this).val());
        visualizeData();
    });
    
    /** GRAVITY SETTING */
    // Set gravity setting in UI
    $("#gravity option[value='" +getSetting(setting_gravity)+ "']").attr("selected", true);

    // Listen to gravity changes
    $("#gravity").change(function() {
        localStorage.setItem(setting_gravity,  $(this).val());
        visualizeData();
    });
    
    /** ATTRACTION SETTING */
    // Set attraction setting in UI
    $("#attraction").val(getSetting(setting_attraction));
    
    // Listen to attraction changes
    $("#attraction").change(function() {
        localStorage.setItem(setting_attraction, $(this).val());
        visualizeData();
    });
    
    /** FISH EYE */
    // Set fish eye setting in UI
    if(getSetting(setting_fisheye) === "true") {
        $("#fisheye").prop("checked", true);
    }
    
    // Listen to fisheye changes
    $("#fisheye").change(function(e) {
        localStorage.setItem(setting_fisheye, $(this).is(':checked'));
        visualizeData();
    });
    
    /** RECORD FILTERING */
    // Set filtering settings in UI
    $(".show-record").each(function() {
        var name = $(this).attr("name");
        var record = localStorage.getItem(name);
        if(record) {
            // Update checked attribute
            var obj = JSON.parse(record);
            if("checked" in obj) {
                $(this).prop("checked", obj.checked);
            }
        }
    });
    
    // Listen to 'show-record' checkbox changes  
    $(".show-record").change(function(e) {
        // Update record field 'checked' value in localstorage
        var name = $(this).attr("name");
        var record = localStorage.getItem(name);
        var obj;
        if(record === null) {
            obj = {};  
        }else{                                   
            obj = JSON.parse(record);
        }
        
        // Set 'checked' attribute and store it
        obj.checked = $(this).is(':checked');
        localStorage.setItem(name, JSON.stringify(obj));
        
        // Update visualisation
        visualizeData();
    });

    // Listen to the 'show-all' checkbox 
    $("#show-all").change(function() {
        var checked = $(this).is(':checked');  
        $(".show-record").prop("checked", checked).trigger("change");
        visualizeData();
    });
    
    /** BUILDING THE VISUALISATION */
    var url = "../admin/describe/getRectypeRelationsAsXML.php" + window.location.search;
    console.log("Loading XML data from: " + url);
    d3.xml(url, "application/xml", function(error, xmlData) {
        // If there is an error, show it to the user
        if(error) {
            return alert("Unable to load data: \"" + error.statusText +"\"");
        }
        
        // Now visualize it.
        console.log("XML succesfully loaded from server:");
        console.log(xmlData);
        xml = xmlData;
        visualizeData();
    });
    
    /** 
    * XML example data
 
    <?xml version="1.0" encoding="UTF-8"?>
    <Relationships>

    <!--Heurist Definitions Exchange File, generated: 03 Sep 2014 @ 12:38-->
    <HeuristBaseURL>http://heur-db-pro-1.ucc.usyd.edu.au/HEURIST/h3-jj/</HeuristBaseURL>
    <HeuristDBName>BoRO_Backup_13Aug14</HeuristDBName>
    <HeuristProgVersion>3.2.0</HeuristProgVersion>
    <HeuristDBVersion>1.1.0</HeuristDBVersion>

    <RecordTypes>

    <Record xmlns='rootrecord'>
        <rec_Name>Record relationship</rec_Name>
        <rec_ID>1</rec_ID>
        <rec_Count>0</rec_Count>
        <rec_Image>http://heur-db-pro-1.ucc.usyd.edu.au/HEURIST_FILESTORE/BoRO_Backup_13Aug14/rectype-icons/1.png</rec_Image>
        <rec_Relations>
            <Record xmlns='relationrecord'>
                <rec_Name>Source record</rec_Name>
                <rec_ID>7</rec_ID>
                <rec_Count>0</rec_Count>
                <rec_Image>http://heur-db-pro-1.ucc.usyd.edu.au/HEURIST_FILESTORE/BoRO_Backup_13Aug14/rectype-icons/7.png</rec_Image>
                <rel_Unconstrained>true</rel_Unconstrained>
                <RelationTypes>
                <rel_Name>pointer</rel_Name>
                <rel_Name>req</rel_Name>
                <rel_Name>sng</rel_Name>
                </RelationTypes>
                <Usages>
                </Usages>
            </Record>
    
            <Record xmlns='relationrecord'>
                <rec_Name>Target record</rec_Name>
                <rec_ID>5</rec_ID>
                <rec_Count>0</rec_Count>
                <rec_Image>http://heur-db-pro-1.ucc.usyd.edu.au/HEURIST_FILESTORE/BoRO_Backup_13Aug14/rectype-icons/5.png</rec_Image>
                <rel_Unconstrained>true</rel_Unconstrained>
                <RelationTypes>
                <rel_Name>pointer</rel_Name>
                <rel_Name>req</rel_Name>
                <rel_Name>sng</rel_Name>
                </RelationTypes>
                <Usages>
                </Usages>
            </Record>
            
            <Record xmlns='relationrecord'>
                <rec_Name>Interpretation/commentary</rec_Name>
                <rec_ID>8</rec_ID>
                <rec_Count>0</rec_Count>
                <rec_Image>http://heur-db-pro-1.ucc.usyd.edu.au/HEURIST_FILESTORE/BoRO_Backup_13Aug14/rectype-icons/8.png</rec_Image>
                <rel_Unconstrained>false</rel_Unconstrained>
                <RelationTypes>
                    <rel_Name>pointer</rel_Name>
                    <rel_Name>opt</rel_Name>
                    <rel_Name>sng</rel_Name>
                </RelationTypes>
                <Usages>
                    <Record xmlns='usagerecord'>
                    <rec_Name>Interpretive annotation</rec_Name>
                    <rec_ID>8</rec_ID>
                    <rec_Count>0</rec_Count>
                    <rec_Image>http://heur-db-pro-1.ucc.usyd.edu.au/HEURIST_FILESTORE/BoRO_Backup_13Aug14/rectype-icons/8.png</rec_Image>
                    </Record>
                </Usages>
            </Record>
            </rec_Relations>
        </Record>
        
         etc.
         
    </Relationships>
    
    */

});
/********************** END OF FUNCTIONS TO EXECUTE WHEN THE DOCUMENT IS DONE LOADING ********************/