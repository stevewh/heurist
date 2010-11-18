/*
 * filename, brief description, date of creation, by whom
 * @copyright (C) 2005-2010 University of Sydney Digital Innovation Unit.
 * @link: http://HeuristScholar.org
 * @license http://www.gnu.org/licenses/gpl-3.0.txt
 * @package Heurist academic knowledge management system
 * @todo
 */

var map;
var iconsByReftype = [];
var onclickfn;
var allMarkers = [];

function loadMap(options) {
	if (! options) options = {};

	map = new GMap2(document.getElementById("map"));

	map.enableDoubleClickZoom();
	map.enableContinuousZoom();
	map.enableScrollWheelZoom();

	if (options["compact"]) {
		map.addControl(new GSmallZoomControl());
		map.addControl(new GMapTypeControl(true));
	} else {
		map.addControl(new GLargeMapControl());
		map.addControl(new GMapTypeControl());
	}

	if (options["onclick"])
		onclickfn = options["onclick"];

	var startView = calculateGoodMapView(options["startobjects"]);

	map.setCenter(startView.latlng, startView.zoom);
	map.addMapType(G_PHYSICAL_MAP);
	map.setMapType(G_PHYSICAL_MAP);



	/* add objects to the map */

	var baseIcon = new GIcon();
	baseIcon.image = "../../common/images/reftype-icons/questionmark.gif";
	baseIcon.shadow = "../../common/images/shadow.png";
	baseIcon.iconAnchor = new GPoint(16, 31);
	baseIcon.infoWindowAnchor = new GPoint(16,16);
	baseIcon.iconSize = new GSize(31, 31);
	baseIcon.shadowSize = new GSize(30, 18);

	for (var i in HEURIST.tmap.geoObjects) {
		var geo = HEURIST.tmap.geoObjects[i];
		var record = HEURIST.tmap.records[geo.bibID];

		var highlight = false;
		if (options["highlight"]) {
			for (var h in options["highlight"]) {
				if (geo.bibID ==  options["highlight"][h]) highlight = true;
			}
		}

		if (! iconsByReftype[record.reftype]) {
			iconsByReftype[record.reftype] = new GIcon(baseIcon);
			//iconsByReftype[record.reftype].image = "../../common/images/reftype-icons/" + record.reftype + ".png";
			//iconsByReftype[record.reftype].image = "../../common/images/pointerMapWhite.png";
			iconsByReftype[record.reftype].image = "../../common/images/31x31.gif";
		}

		var marker = null;
		var polygon = null;
		switch (geo.type) {
			case "point":
			marker = new GMarker(new GLatLng(geo.geo.y, geo.geo.x), getIcon(record));
			ELabelLoc = new GLatLng(geo.geo.y, geo.geo.x);
			break;

			case "circle":
			if (window.heurist_useLabelledMapIcons) {
				addPointMarker(new GLatLng(geo.geo.y, geo.geo.x), record);
			}

			var points = [];
			for (var i=0; i <= 40; ++i) {
				var x = geo.geo.x + geo.geo.radius * Math.cos(i * 2*Math.PI / 40);
				var y = geo.geo.y + geo.geo.radius * Math.sin(i * 2*Math.PI / 40);
				points.push(new GLatLng(y, x));
			}
			if (highlight) {
				polygon = new GPolygon(points, "#ff0000", 1, 0.5, "#ffaaaa", 0.3);
			} else {
				polygon = new GPolygon(points, "#0000ff", 1, 0.5, "#aaaaff", 0.3);
			}

			ELabelLoc = new GLatLng(geo.geo.y, geo.geo.x);
			break;

			case "rect":
			if (window.heurist_useLabelledMapIcons) {
				addPointMarker(new GLatLng((geo.geo.y0+geo.geo.y1)/2, (geo.geo.x0+geo.geo.x1)/2), record);
			}

			var points = [];
			points.push(new GLatLng(geo.geo.y0, geo.geo.x0));
			points.push(new GLatLng(geo.geo.y0, geo.geo.x1));
			points.push(new GLatLng(geo.geo.y1, geo.geo.x1));
			points.push(new GLatLng(geo.geo.y1, geo.geo.x0));
			points.push(new GLatLng(geo.geo.y0, geo.geo.x0));
			if (highlight) {
				polygon = new GPolygon(points, "#ff0000", 1, 0.5, "#ffaaaa", 0.3);
			} else {
				polygon = new GPolygon(points, "#0000ff", 1, 0.5, "#aaaaff", 0.3);
			}

			ELabelLoc = (new GLatLng(geo.geo.y0, (geo.geo.x0+geo.geo.x1)/2));
			break;

			case "polygon":
			if (window.heurist_useLabelledMapIcons) {
				addPointMarker(new GLatLng(geo.geo.points[1].y, geo.geo.points[1].x), record);
			}

			var points = [];
			for (var i=0; i < geo.geo.points.length; ++i)
				points.push(new GLatLng(geo.geo.points[i].y, geo.geo.points[i].x));
			points.push(new GLatLng(geo.geo.points[0].y, geo.geo.points[0].x));
			if (highlight) {
				polygon = new GPolygon(points, "#ff0000", 1, 0.5, "#ffaaaa", 0.3);
			} else {
				polygon = new GPolygon(points, "#0000ff", 1, 0.5, "#aaaaff", 0.3);
			}
			ELabelLoc = (new GLatLng(geo.geo.points[0].y, geo.geo.points[0].x));
			break;

			case "path":
			//var points = [];
			//for (var i=0; i < geo.geo.points.length; ++i)
			//	points.push(new GLatLng(geo.geo.points[i].y, geo.geo.points[i].x));
			if (highlight) {
				polygon = new GPolyline.fromEncoded({ color: "#ff0000", weight: 3, opacity: 0.8, points: geo.geo.points, zoomFactor: 3, levels: geo.geo.levels, numLevels: 21 });
			} else {
				polygon = new GPolyline.fromEncoded({ color: "#0000ff", weight: 3, opacity: 0.8, points: geo.geo.points, zoomFactor: 3, levels: geo.geo.levels, numLevels: 21 });
			}
			if (window.heurist_useLabelledMapIcons) {
				addPointMarker(polygon.getVertex(Math.floor(polygon.getVertexCount() / 2)), record);
			}
			break;
		}
		// Pointer Records loading section
		var mapLabelXSL;
		var xmlRecDepth1 = loadXMLDocFromFile("http://heuristscholar.org"+ top.HEURIST.basePath+
								"export/xml/hml.php?q=ids:"+record.bibID+"&depth=1&woot=1"+
								(top.HEURIST.instance.name? "&instance=" + top.HEURIST.instance.name:""));
			if (!xmlRecDepth1) return;
			if (!mapLabelXSL) {
				mapLabelXSL = loadXMLDocFromFile("mapLabel.xsl");
			}
			var xhtmlResultDoc;
			if (window.ActiveXObject){
				var xmlResultStr = xmlRecDepth1.transformNode(mapLabelXSL);
				xhtmlResultDoc=new ActiveXObject("Microsoft.XMLDOM");
				xhtmlResultDoc.async="false";
				xhtmlResultDoc.loadXML(xmlResultStr);
			// code for Mozilla, Firefox, Opera, etc.
			}else {
				var xsltProcessor=new XSLTProcessor();
				xsltProcessor.importStylesheet(mapLabelXSL);
				xhtmlResultDoc = xsltProcessor.transformToFragment(xmlRecDepth1,document);
			}
		//Creates custom label HTML
		var labelContent =
			"<div id="+record.bibID+" class='maplabel'><div class='MapPointer'></div></div>";

		//custom label sent to elabel
		var label = new ELabel(ELabelLoc,labelContent,"",GSize(200,20),100,true);

		if (marker) {
			marker.record = record;
			if (! record.overlays) record.overlays = [];
			record.overlays.push(marker);
			record.overlays.push(label);
			label.setIcon(marker.getIcon());
			allMarkers.push(label);
//			allMarkers.push(marker);
//			map.addOverlay(marker);
			map.addOverlay(label);
			GEvent.addListener(marker, "click", markerClick);
		}
		else if (polygon) {
			polygon.record = record;
			if (! record.overlays) record.overlays = [];
			record.overlays.push(polygon);
			record.overlays.push(label);
			map.addOverlay(polygon);
			map.addOverlay(label);
			GEvent.addListener(polygon, "click", polygonClick);
		}

		var relatedID = record.bibID;
		var related;
		related = document.getElementById(relatedID);
		related.appendChild(xhtmlResultDoc);
		label.setContents(related.parentNode.innerHTML);
		if (marker) map.removeOverlay(label); // hack need to replace this by creating all the html up front
	} // end of for Geo
	var cluster=new ClusterMarker(map, { markers:allMarkers } );
	cluster.fitMapToMarkers();

}

function loadXMLDocFromFile(filename)
{
	var xmlDoc=null;
	var errorMsg = "Error loading " + filename + " using XMLHttpRequest";
	var d;
	try {
		d = new XMLHttpRequest();
	} catch (trymicrosoft) {
		try {
			d = new ActiveXObject("Msxml2.XMLHTTP");
		} catch (othermicrosoft) {
			try {
				d = new ActiveXObject("Microsoft.XMLHTTP");
			} catch (failed) {
				d = false;
			}
		}
	}
	if (d) {
		try{
			d.open("GET", filename, false);
			d.send("");
			xmlDoc=d.responseXML;
		}catch(e){
			alert(errorMsg + " Hint : " + e);
		}
	}else{
		alert("Your browser doesn't process XSL. Unable to view content.");
	}
	return xmlDoc;
}


function calculateGoodMapView(geoObjects) {
	var minX, minY, maxX, maxY;
	if (! geoObjects) geoObjects = HEURIST.tmap.geoObjects;
	for (var i=0; i < geoObjects.length; ++i) {
		var geo = geoObjects[i];
		var bbox = (geo.type == "point")? { n: geo.geo.y, s: geo.geo.y, w: geo.geo.x, e: geo.geo.x } : geo.geo.bounds;

		if (i > 0) {
			if (bbox.w < minX) minX = bbox.w;
			if (bbox.e > maxX) maxX = bbox.e;
			if (bbox.s < minY) minY = bbox.s;
			if (bbox.n > maxY) maxY = bbox.n;
		}
		else {
			minX = bbox.w;
			maxX = bbox.e;
			minY = bbox.s;
			maxY = bbox.n;
		}
	}

	var centre = new GLatLng(0.5 * (minY + maxY), 0.5 * (minX + maxX));
	if (maxX-minX < 0.000001  &&  maxY-minY < 0.000001) {       // single point, or very close points
		var sw = new GLatLng(minY - 0.1, minX - 0.1);
		var ne = new GLatLng(maxY + 0.1, maxX + 0.1);
	}
	else {
		var sw = new GLatLng(minY - 0.1*(maxY - minY), minX - 0.1*(maxX - minX));
		var ne = new GLatLng(maxY + 0.1*(maxY - minY), maxX + 0.1*(maxX - minX));
	}
	var zoom = map.getBoundsZoomLevel(new GLatLngBounds(sw, ne));

	return { latlng: centre, zoom: zoom };
}

function markerClick() {
	var record = this.record;

	if (onclickfn) {
		onclickfn(record, this, this.getPoint());
	} else {
		var html = "<b>" + record.title + "&nbsp;&nbsp;&nbsp;</b>";
		if (record.description) html += "<p style='height: 128px; overflow: auto;'>" + record.description + "</p>";
		html += "<p>edit:&nbsp;<a target=_new href='../../records/view/viewRecord.php?bib_id=" + record.bibID + "'>heurist resource #" + record.bibID + "</a></p>";
		if (record.URL) html += "<p>url:&nbsp;&nbsp;&nbsp;<a target=_new href='" + record.URL + "'>" + record.URL + "</a></p>";
		this.openInfoWindowHtml(html);
	}
}

function polygonClick(point) {
	var record = this.record;
	if (onclickfn) {
		onclickfn(record, this, point);
	} else {
		var html = "<b>" + record.title + "&nbsp;&nbsp;&nbsp;</b>";
		if (record.description) html += "<p style='height: 128px; overflow: auto;'>" + record.description + "</p>";
		html += "<p>edit:&nbsp;<a target=_new href='../../records/view/viewRecord.php?bib_id=" + record.bibID + "'>heurist resource #" + record.bibID + "</a></p>";
		if (record.URL) html += "<p>url:&nbsp;&nbsp;&nbsp;<a target=_new href='" + record.URL + "'>" + record.URL + "</a></p>";
		map.openInfoWindowHtml(point, html);
	}
}

var iconNumber = 0;
var legendIcons;
function getIcon(record) {
	if (! window.heurist_useLabelledMapIcons) {
		return iconsByReftype[record.reftype];
	}
	if (! legendIcons) {
		var protoLegendImgs = document.getElementsByTagName("img");
		var legendImgs = [];
		legendIcons = {};

		var mainLegendImg;
		for (var i=0; i < protoLegendImgs.length; ++i) {
			if (protoLegendImgs[i].className === "main-map-icon") {
				mainLegendImg = protoLegendImgs[i];
			}
			else if (protoLegendImgs[i].className === "map-icons") {
				legendImgs.push(protoLegendImgs[i]);
			}
		}

		var baseIcon = new GIcon();
			baseIcon.image = url;
			baseIcon.shadow = "../../common/iamges/maps-icons/circle-shadow.png";
			baseIcon.iconAnchor = new GPoint(10, 10);
			baseIcon.iconWindowAnchor = new GPoint(10, 10);
			baseIcon.iconSize = new GSize(20, 20);
			baseIcon.shadowSize = new GSize(29, 21);

		if (mainLegendImg) {
			var icon = new GIcon(baseIcon);
			icon.image = "../../common/iamges/maps-icons/circleStar.png";
			var bibID = (mainLegendImg.id + "").replace(/icon-/, "");
			legendIcons[bibID] = icon;
			icon.associatedLegendImage = mainLegendImg;

			mainLegendImg.style.backgroundImage = "url(" + icon.image + ")";
		}

		for (i=0; i < legendImgs.length; ++i) {
			var iconLetter;
			if (i < 26) {
				iconLetter = String.fromCharCode(0x41 + i);
			}
			else {
				iconLetter = "Dot";
			}
			var url = "../../common/iamges/maps-icons/circle" + iconLetter + ".png";

			var icon = new GIcon(baseIcon);
			icon.image = url;

			var bibID = (legendImgs[i].id + "").replace(/icon-/, "");

			legendIcons[ bibID ] = icon;
			legendImgs[i].style.backgroundImage = "url(" + url + ")";
		}
	}

	if (legendIcons[ record.bibID ]) {
		if (legendIcons[record.bibID].associatedLegendImage) {
			legendIcons[record.bibID].associatedLegendImage.style.display = "";
		}
		return legendIcons[ record.bibID ];
	}
	else {
		return iconsByReftype[record.reftype];
	}
}

function addPointMarker(latlng, record) {
	var marker = new GMarker(latlng, getIcon(record));
	if (! record.overlays) { record.overlays = []; }
	record.overlays.push(marker);
	map.addOverlay(marker);
}
