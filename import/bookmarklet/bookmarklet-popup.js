var Heurist = {

w: 370,
h: 240,
installDir: "",
urlBase: "http://",

init: function () {
	// toggle display if our div is already present in the DOM
	var e = document.getElementById('__heurist_bookmarklet_div');
	if (e) {
		if (e.style.display == 'none') {
			e.style.display = 'block';
			e.style.left = '30px';
			e.style.top = '30px';
			if (document.all) {
				e.style.left = (document.body.scrollLeft + 30) + 'px';
				e.style.top = (document.body.scrollTop + 30) + 'px';
				if (document.body.scrollLeft == 0  &&  document.body.scrollTop == 0) window.scrollTo(0, 0);
			}
		}
		else
			Heurist.close();
		return;
	}

	var loc = (top ? top.location : (window ? window.location : ""));
	if ( loc && loc.pathname != "undefined") {
		Heurist.installDir = loc.pathname.match(/\/[^\s\/]\//);	// find the first '/dirname/' pattern
		Heurist.installDir = Heurist.installDir ? '/' + Heurist.installDir.replace(/\//g,"") : "";
	}else{
		Heurist.installDir = ""
	}

	Heurist.urlBase += loc.hostname;
	// add our style sheet
	var link = document.createElement('link');
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.href = Heurist.urlBase + Heurist.installDir +'/common/css/bookmarklet-popup.css';
	document.getElementsByTagName('head')[0].appendChild(link);

	// get record types
	var scr = document.createElement('script');
	scr.type = 'text/javascript';
	scr.src = Heurist.urlBase + Heurist.installDir +'/import/bookmarklet/reftypes.php';
	document.getElementsByTagName('head')[0].appendChild(scr);

	// get bkmk id if already bookmarked
	scr = document.createElement('script');
	scr.type = 'text/javascript';
	scr.src = Heurist.urlBase + Heurist.installDir +'/import/bookmarklet/url-bookmarked.php?url=' + Heurist.urlcleaner(encodeURIComponent(location.href));
	document.getElementsByTagName('head')[0].appendChild(scr);
},

render: function() {
	// create the div
	var d = document.createElement('div');
	d.className = 'heurist';
	d.id = '__heurist_bookmarklet_div';
	d.style.left = '30px';
	d.style.top = '30px';
	if (document.all) {
		d.style.left = (document.body.scrollLeft + 30) + 'px';
		d.style.top = (document.body.scrollTop + 30) + 'px';
	}

	// create a drop shadow
	if (! document.all) {
		var ss = document.createElement('div');
		ss.id = 'DropShadowContainer';
		var s = document.createElement('div');
		s.id = 'DropShadow';
		ss.appendChild(s);
		d.appendChild(ss);
	}

	// create a container for all d's contents (it's complicated ... stupid drop shadow!)
	var c = document.createElement('div');
	c.id = 'Content';
	d.appendChild(c);

	// create a header bar
	var hdr = document.createElement('div');
	hdr.className = 'header';
	hdr.onmousedown = Heurist.dragStart;
	c.appendChild(hdr);

	// 'close' button
	var s = document.createElement('span');
	s.className = 'close';
	s.innerHTML = '<img src="'+ Heurist.urlBase + Heurist.installDir +'/common/images/white-cross.gif">';
	s.onclick = Heurist.close;
	hdr.appendChild(s);

	// heurist home page link
	var a = document.createElement('a');
	a.href = Heurist.urlBase + Heurist.installDir +'/';
	if (document.all) {
		i = document.createElement('img');
		i.src = Heurist.urlBase + Heurist.installDir +'/common/images/heurist-micro.gif';
		a.appendChild(i);
	}
	else
		a.innerHTML = '<img src="/'+ Heurist.urlBase + Heurist.installDir +'/common/images/heurist-micro.gif">';
	a.className='imglnk';
	hdr.appendChild(a);

	s = document.createElement('span');
	s.innerHTML = '&nbsp;Heurist bookmarklet';
	hdr.appendChild(s);


	// heurist bookmarklet
	var dd = document.createElement("div");
	dd.id = "topline";
	dd.innerHTML = (! HEURIST_url_bib_id ? "Add this page as:" : "");
	c.appendChild(dd);

	var t = c.appendChild(document.createElement("table"));
	t.style.margin = "0 20px 20px 20px";

	var tr = t.appendChild(document.createElement("tr"));
	var td = tr.appendChild(document.createElement("td"));

	if (HEURIST_url_bkmk_id) {
		var nobr = td.appendChild(document.createElement("nobr"));
		nobr.appendChild(document.createTextNode("Page already in Heurist"));
		nobr.style.color = "green";
		td = tr.appendChild(document.createElement("td"));

		tr = t.appendChild(document.createElement("tr"));
		td = tr.appendChild(document.createElement("td"));
		nobr = td.appendChild(document.createElement("nobr"));
		nobr.appendChild(document.createTextNode("Bookmarked by you"));
		nobr.style.color = "green";

		tr = t.appendChild(document.createElement("tr"));
		td = tr.appendChild(document.createElement("td"));
		td.colSpan = "2";
		td.style.textAlign = "right";

		a = td.appendChild(document.createElement("a"));
		a.target = "_blank";
		a.href= Heurist.urlBase + Heurist.installDir +'/data/records/editrec/heurist-edit.html?bkmk_id=' + HEURIST_url_bkmk_id;
		a.onclick = function() { Heurist.close() };
		a.innerHTML = "edit";

		tr = t.appendChild(document.createElement("tr"));
		td = tr.appendChild(document.createElement("td"));
		td.colSpan = "2";
		td.style.height = "10px";

	} else if (HEURIST_url_bib_id) {
		var nobr = td.appendChild(document.createElement("nobr"));
		nobr.appendChild(document.createTextNode("Page already in Heurist"));
		nobr.style.color = "green";
		td = tr.appendChild(document.createElement("td"));

		tr = t.appendChild(document.createElement("tr"));
		td = tr.appendChild(document.createElement("td"));
		nobr = td.appendChild(document.createElement("nobr"));
		nobr.appendChild(document.createTextNode("Not yet bookmarked by you"));
		nobr.style.color = "red";

		td = tr.appendChild(document.createElement("td"));
		var button = document.createElement("input");
			button.type = "button";
			button.value = "Add";
			button.onclick = function() {
				Heurist.bookmark();
			};
		td.appendChild(button);

		tr = t.appendChild(document.createElement("tr"));
		td = tr.appendChild(document.createElement("td"));
		td.colSpan = "2";
		td.style.height = "30px";

	} else {
		// specify reftype
		td.appendChild(Heurist.renderReftypeSelect());

		td = tr.appendChild(document.createElement("td"));
		var button = document.createElement("input");
		button.id = "add-as-type-button";
		button.type = "button";
		button.value = "Add";
		button.disabled = true;
		button.onclick = function() {
			var r = document.getElementById("reftype-select").value;
			if (r) Heurist.bookmark(r);
		};
		td.appendChild(button);

		tr = t.appendChild(document.createElement("tr"));
		td = tr.appendChild(document.createElement("td"));
		td.colSpan = "2";
		td.style.height = "20px";

		// add as internet bookmark
		tr = t.appendChild(document.createElement("tr"));
		td = tr.appendChild(document.createElement("td"));
		td.innerHTML = "Quick add (generic bookmark)";
		td = tr.appendChild(document.createElement("td"));
		button = document.createElement("input");
		button.type = "button";
		button.value = "Add";
		button.onclick = function() { Heurist.bookmark(); };
		td.appendChild(button);
	}

	tr = t.appendChild(document.createElement("tr"));
	td = tr.appendChild(document.createElement("td"));
	td.colSpan = "2";
	var hr = td.appendChild(document.createElement("div"));
	hr.id = "hr-div";

	// link importer
	tr = t.appendChild(document.createElement("tr"));
	td = tr.appendChild(document.createElement("td"));
	var nobr = td.appendChild(document.createElement("nobr"));
	nobr.innerHTML = "Import links from this page";
	nobr.style.marginLeft = "40px";
	nobr.style.marginRight = "15px";
	td = tr.appendChild(document.createElement("td"));
	var button = document.createElement("input");
	button.type = "button";
	button.value = "Get";
	button.onclick = function() {
		Heurist.close();
		var w = open(Heurist.urlBase + Heurist.installDir +'/import/fileimport.php?shortcut=' + encodeURIComponent(location.href));
		void(window.setTimeout("w.focus()",200));
		return false;
	}
	td.appendChild(button);

/*
	// view info
	a = document.createElement('a');
	a.href = "#";
	a.onclick = function() { return false; };
	a.innerHTML = 'View info/notes (nyi)';
	a.className = 'lnk';
	a.style.color = '#909090';
	c.appendChild(a);

	// notifications
	a = document.createElement('a');
	a.href = "#";
	a.onclick = function() { return false; };
	a.innerHTML = 'Notifications (nyi)';
	a.className = 'lnk';
	a.style.color = '#909090';
	c.appendChild(a);

	// password reminder
	a = document.createElement('a');
	a.href = "#";
	a.onclick = function() { return false; };
	a.innerHTML = 'Password reminder (nyi)';
	a.className = 'lnk';
	a.style.color = '#909090';
	c.appendChild(a);
*/

	// add our div to the document tree
	if (document.all)
		document.documentElement.childNodes[1].appendChild(d);
	else
		document.documentElement.appendChild(d);

	d.style.display = 'block';

	// IE doesn't understand position: fixed
    if (document.all) {
		d.style.position = 'absolute';
		// window.scrollTo(0,0);
		if (document.body.scrollLeft == 0  &&  document.body.scrollTop == 0) window.scrollTo(0, 0);
			// some sites have weird stuff going on that breaks scroll{Left,Top}
    }
	else {
		d.style.position = 'fixed';
	}
},

close: function () {
	Heurist.fade();
},

fade: function() {
	var e = document.getElementById('__heurist_bookmarklet_div');

	if (e.filters) {
		var o = parseInt(e.filters.alpha.opacity) - 10;
		e.filters.alpha.opacity = o;
	} else {
		var o = parseFloat(e.style.opacity) - 0.1;
		e.style.opacity = o;
	}
	if (o > 0)
		setTimeout(Heurist.fade,50);
	else {
		e.style.display = 'none';
		e.style.opacity = '1.0';
		if (e.filters) e.filters.alpha.opacity = 100;
	}
},

dragStart: function(e) {
	var d = document.getElementById('__heurist_bookmarklet_div');
/*
	if (d.style.position == 'fixed') {
		d.style.position = 'absolute';
		d.style.left = (parseInt(d.style.left) + document.body.scrollLeft) + 'px';
		d.style.top = (parseInt(d.style.top) + document.body.scrollTop) + 'px';
	}
*/
	if (d.filters) d.filters.alpha.opacity = 75;
	else d.style.opacity = 0.75;

	window.startDragCoords = Heurist.getCoords(e);
	window.startDragPos = { left: parseInt(d.style.left), top: parseInt(d.style.top) };
// document.firstChild.innerHTML += '<div>' + window.startDragPos.left + ',' + window.startDragPos.top + '</div>';
	document.onmousemove = Heurist.dragMid;
	document.onmouseup = Heurist.dragEnd;
	document.onmousedown = null;

	return false;
},

dragMid: function(e) {
	var d = document.getElementById('__heurist_bookmarklet_div');
	var coords = Heurist.getCoords(e);

	d.style.left = (window.startDragPos.left + (coords.x - window.startDragCoords.x)) + 'px';
	d.style.top = (window.startDragPos.top + (coords.y - window.startDragCoords.y)) + 'px';

	return false;
},

dragEnd: function(e) {
	var d = document.getElementById('__heurist_bookmarklet_div');
	Heurist.dragMid(e);
/*
	if (! document.all) {
		d.style.left = (parseInt(d.style.left) - document.body.scrollLeft) + 'px';
		d.style.top = (parseInt(d.style.top) - document.body.scrollTop) + 'px';
		d.style.position = 'fixed';
	}
*/
	if (d.filters) d.filters.alpha.opacity = '100';
	else d.style.opacity = '1.0';
	document.onmouseup = null;
	document.onmousemove = null;
	//document.onmousedown = Heurist.dragStart;
	return true;
},

getCoords: function(e) {
	if (! e) e = event;

	var pos = new Object();
	pos.x = 0;
	pos.y = 0;

	if (e.pageX  ||  e.pageY) {
		pos.x = e.pageX;
		pos.y = e.pageY;
	} else if (e.clientX  ||  e.clientY) {
		pos.x = e.clientX + document.body.scrollLeft;
		pos.y = e.clientY + document.body.scrollTop;
	}

	return pos;
},

urlcleaner: function(x) { return x.replace(/.C2.A0/gi,'\032'); },

findFavicon: function() {
	try {
		var links = document.getElementsByTagName("link");
		for (var i=0; i < links.length; ++i) {
			var rel = (links[i].rel + "").toLowerCase();
			if ((rel === "shortcut icon" || rel === "icon")  &&  links[i].href) {
				if (links[i].href.match(/^http:/)) {	// absolute href
					return links[i].href;
				}
				else if (links[i].href.match(/^\//)) {	// absolute path on server
					return document.location.href.replace(/(^.......[^\/]*\/?).*/, "$1" + links[i].href);
				}
				else {	// relative path ... ummm ... take a stab
					return document.location.href.replace(/[^\//]*$/, links[i].href);
				}
			}
		}
	} catch (e) { }
	return "";
},

bookmark: function(reftype) {
	Heurist.close();
	var version='20060713';
	var findSelection = function(w) {
		try {
			return w.document.selection ? w.document.selection.createRange().text : (w.getSelection()+'');
		} catch (e) {
			return '';
		}
	};
	var url = location.href;
	var titl = document.title;
	var sel = findSelection(window);
	if (! sel  &&  frames) {
		for (i=0; i < frames.length; ++i) {
			sel = findSelection(frames[i]);
			if (sel) break;
		}
	}
	var favicon = Heurist.findFavicon();
	var w = open(Heurist.urlBase + Heurist.installDir +'/records/addrec/add.php?t=' + Heurist.urlcleaner(encodeURIComponent(titl)) +
				 '&u=' + Heurist.urlcleaner(encodeURIComponent(url)) +
				 '&d=' + Heurist.urlcleaner(encodeURIComponent(sel)) +
				 (favicon? ('&f=' + encodeURIComponent(favicon)) : '') +
				 (reftype ? '&bib_reftype=' + reftype : '') +
				 '&version=' + version);
	void(window.setTimeout('w.focus()',200));
},


renderReftypeSelect: function(sel) {
	var sel = document.createElement('select');
	sel.id = 'reftype-select';
	sel.onchange = function() {
		document.getElementById("add-as-type-button").disabled = ! this.value;
	};
	sel.options[0] = new Option('Select type...', '');
	sel.options[0].selected = true;
	sel.options[0].disabled = true;
/*
	var opt = document.createElement("option");
	opt.value = 1;
	opt.innerHTML = HEURIST_reftypes.names[1];	// internet bookmark
	sel.appendChild(opt);
*/
	for (var g in HEURIST_reftypes.groups) {
		var grp = document.createElement("optgroup");
		grp.label = g + " record types";
		sel.appendChild(grp);
		for (var i = 0; i < HEURIST_reftypes.groups[g].length; ++i) {
			var opt = document.createElement("option");
			opt.value = i;
			opt.innerHTML = HEURIST_reftypes.names[HEURIST_reftypes.groups[g][i]];
			grp.appendChild(opt);
		}
	}

	var grp = document.createElement("optgroup");
	grp.label = "Bibliographic record types";
	sel.appendChild(grp);
	for (var i = 0; i < HEURIST_reftypes.primary.length; ++i) {
		var opt = document.createElement("option");
		opt.value = HEURIST_reftypes.primary[i];
		opt.innerHTML = HEURIST_reftypes.names[HEURIST_reftypes.primary[i]];
		grp.appendChild(opt);
	}

	grp = document.createElement("optgroup");
	grp.label = "Other record types";
	sel.appendChild(grp);
	for (var i = 0; i < HEURIST_reftypes.other.length; ++i) {
		var opt = document.createElement("option");
		opt.value = HEURIST_reftypes.other[i];
		opt.innerHTML = HEURIST_reftypes.names[HEURIST_reftypes.other[i]];
		grp.appendChild(opt);
	}

	return sel;
}

};



var HEURIST_reftypesOnload = function() {
	Heurist.reftypesLoaded = true;
	if (Heurist.reftypesLoaded  &&  Heurist.urlBookmarkedLoaded)
		Heurist.render();
};

var HEURIST_urlBookmarkedOnload = function() {
	Heurist.urlBookmarkedLoaded = true;
	if (Heurist.reftypesLoaded  &&  Heurist.urlBookmarkedLoaded)
		Heurist.render();
};

Heurist.init();

