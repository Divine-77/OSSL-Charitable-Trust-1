
var hs = {

// Apply your own settings here, or override them in the html file.  
graphicsDir : 'highslide/graphics/',
restoreCursor : "zoomout.cur", // necessary for preload
fullExpandIcon : 'fullexpand.gif',
expandSteps : 10, // number of steps in zoom. Each step lasts for duration/step milliseconds.
expandDuration : 250, // milliseconds
restoreSteps : 10,
restoreDuration : 250,
allowMultipleInstances: true,
hideThumbOnExpand : true,
captionSlideSpeed : 1, // set to 0 to disable slide in effect
outlineWhileAnimating : false, // not recommended for image popups, animation gets jerky on slow systems.
outlineStartOffset : 3, // ends at 10
marginLeft : 10,
marginRight : 35, // leave room for scrollbars + outline
marginTop : 10,
marginBottom : 35, // leave room for scrollbars + outline
zIndexCounter : 1001, // adjust to other absolutely positioned elements
fullExpandTitle : 'Expand to actual size',
restoreTitle : 'Click to close image, click and drag to move. Use arrow keys for next and previous.',
focusTitle : 'Click to bring to front',
loadingText : 'Loading...',
loadingTitle : 'Click to cancel',
loadingOpacity : 0.75,
showCredits : false, // you can set this to false if you want
creditsText : 'Powered by <i>Webline</i>',
creditsHref : 'http://weblineinfosoft.com',
creditsTitle : 'Go to the Webline homepage',

// These settings can also be overridden inline for each image
anchor : 'auto', // where the image expands from
align : 'auto', // position in the client (overrides anchor)
targetX: null, // the id of a target element
targetY: null,
captionId : null,
captionTemplateId : null,
slideshowGroup : null, // defines groups for next/previous links and keystrokes
spaceForCaption : 30, // leaves space below images with captions
minWidth: 200,
minHeight: 200,
allowSizeReduction: true, // allow the image to reduce to fit client size. If false, this overrides minWidth and minHeight
outlineType : 'drop-shadow', // set null to disable outlines
wrapperClassName : null, // for enhanced css-control
enableKeyListener : true,

		
// END OF YOUR SETTINGS


// declare internal properties
preloadTheseImages : new Array(),
continuePreloading: true,
expandedImagesCounter : 0,
expanders : new Array(),
overrides : new Array(
	'anchor',
	'align',
	'targetX',
	'targetY',
	'outlineType',
	'outlineWhileAnimating',
	'spaceForCaption', 
	'wrapperClassName',
	'minWidth',
	'minHeight',
	'captionId',
	'captionTemplateId',
	'allowSizeReduction',
	'slideshowGroup',
	'enableKeyListener'
),
overlays : new Array(),
pendingOutlines : new Array(),
origNodes : new Array(),
ie : (document.all && !window.opera),
safari : navigator.userAgent.indexOf("Safari") != -1,
hasFocused : false,

$ : function (id) {
	return document.getElementById(id);
},

push : function (arr, val) {
	arr[arr.length] = val;
},

createElement : function (tag, attribs, styles, parent) {
	var el = document.createElement(tag);
	if (attribs) hs.setAttribs(el, attribs);
	if (styles) hs.setStyles(el, styles);
	if (parent) parent.appendChild(el);	
	return el;
},

setAttribs : function (el, attribs) {
	for (var x in attribs) {
		el[x] = attribs[x];
	}
},

setStyles : function (el, styles) {
	for (var x in styles) {
		try { el.style[x] = styles[x]; }
		catch (e) {}
	}
},

ieVersion : function () {
	arr = navigator.appVersion.split("MSIE");
	return parseFloat(arr[1]);
},

clientInfo : function ()	{
	var iebody = document.compatMode && document.compatMode != "BackCompat" 
		? document.documentElement : document.body;
	
	this.width = hs.ie ? iebody.clientWidth : self.innerWidth;
	this.height = hs.ie ? iebody.clientHeight : self.innerHeight;
	this.scrollLeft = hs.ie ? iebody.scrollLeft : pageXOffset;
	this.scrollTop = hs.ie ? iebody.scrollTop : pageYOffset;
} ,

position : function(el)	{ 
	var parent = el;
	var p = { x: parent.offsetLeft, y: parent.offsetTop };
	while (parent.offsetParent)	{
		parent = parent.offsetParent;
		p.x += parent.offsetLeft;
		p.y += parent.offsetTop;
		if (parent != document.body && parent != document.documentElement) {
			p.x -= parent.scrollLeft;
			p.y -= parent.scrollTop;
		}
	}
	return p;
}, 

expand : function(a, params, contentType) {
	try {
		new HsExpander(a, params, contentType);
		return false;
		
	} catch (e) {
		return true;
	}
	
},

focusTopmost : function() {
	var topZ = 0;
	var topmostKey = -1;
	for (i = 0; i < hs.expanders.length; i++) {
		if (hs.expanders[i]) {
			if (hs.expanders[i].wrapper.style.zIndex && hs.expanders[i].wrapper.style.zIndex > topZ) {
				topZ = hs.expanders[i].wrapper.style.zIndex;
				
				topmostKey = i;
			}
		}
	}
	if (topmostKey == -1) hs.focusKey = -1;
	else hs.expanders[topmostKey].focus();
}, 


closeId : function(elId) { // for text links
	for (i = 0; i < hs.expanders.length; i++) {
		if (hs.expanders[i] && (hs.expanders[i].thumb.id == elId || hs.expanders[i].a.id == elId)) {
			hs.expanders[i].doClose();
			return;
		}
	}
},

close : function(el) {
	var key = hs.getWrapperKey(el);
	if (hs.expanders[key]) hs.expanders[key].doClose();
	return false;
},


toggleImages : function(closeId, expandEl) {
	if (closeId) hs.closeId(closeId);
	if (hs.ie) expandEl.href = expandEl.href.replace('about:(blank)?', ''); // mysterious IE thing
	hs.toggleImagesExpandEl = expandEl;
	return false;
},

getAdjacentAnchor : function(key, op) {
	var aAr = document.getElementsByTagName('A');
	var hsAr = new Array;
	var activeI = -1;
	var j = 0;
	for (i = 0; i < aAr.length; i++) {
		if (hs.isHsAnchor(aAr[i]) && ((hs.expanders[key].slideshowGroup == hs.getParam(aAr[i], 'slideshowGroup')))) {
			hsAr[j] = aAr[i];
			if (hs.expanders[key] && aAr[i] == hs.expanders[key].a) {
				activeI = j;
			}
			j++;
		}
	}
	return hsAr[activeI + op];
},

getParam : function (a, param) {
	try {
		var s = a.onclick.toString();
		var oneLine = s.replace(/\s/g, ' ');
		var sParams = oneLine.replace(/.*?hs.(htmlE|e)xpand\s*?\(\s*?this\s*?,\s*?\{(.*?)\}.*?$/, '$2');
		if (hs.safari) { // stupid bug
			for (var i = 0; i < hs.overrides.length; i++) {
				sParams = sParams.replace(hs.overrides[i] +':', ','+ hs.overrides[i] +':').replace(/^\s*?,/, '');
			}
		}	
		if (oneLine == sParams) return null;
		eval('var arr = {'+ sParams +'};');
		for (var x in arr) {
			if (x == param) return arr[x];
		}
	} catch (e) {
		return null;
	}
},

getSrc : function (a) {
	var src = hs.getParam(a, 'src');
	if (src) return src;
	return a.rel.replace(/_slash_/g, '/') || a.href;
},

cloneNode : function (id) {
	if (!hs.$(id) && !hs.origNodes[id]) return null;
	var clone;
	if (hs.origNodes[id]) {
		clone = hs.origNodes[id].cloneNode(1);
		hs.setId(clone, /-hsOrig$/, 1);
	} else {
		clone = hs.$(id).cloneNode(1);
		hs.origNodes[id] = hs.$(id);
		hs.setId(hs.$(id), '-hsOrig');
	}
	return clone;
},

setId : function (d, suff, remove) {
	if (d.id) d.id = remove ? d.id.replace(suff, '') : d.id + suff;
	if (d.name) d.name = remove ? d.name.replace(suff, '') : d.name + suff;
	if (hs.geckoBug && hs.geckoBug(d)) return;
	var a = d.childNodes;		
	for (var i = 0; i < a.length; i++) {
		if (a[i]) hs.setId(a[i], suff, remove);
	}
},

purge : function(d) {
	var a = d.attributes, i, l, n;
    if (a) {
        l = a.length;
        for (i = 0; i < l; i += 1) {
            n = a[i].name;
            if (typeof d[n] === 'function') {
                d[n] = null;
            }
        }
    }
    if (hs.geckoBug && hs.geckoBug(d)) return;
	a = d.childNodes;
    if (a) {
        l = a.length;
        for (i = 0; i < l; i += 1) {
            hs.purge(d.childNodes[i]);
        }
    }
},

previousOrNext : function (el, op) {
	if (typeof el == 'object') var activeKey = hs.getWrapperKey(el);
	else if (typeof el == 'number') var activeKey = el;
	if (hs.expanders[activeKey]) {
		//hs.toggleImagesExpandEl = hs.getAdjacentAnchor(activeKey, op);
		try { hs.getAdjacentAnchor(activeKey, op).onclick(); } catch (e) {}
		hs.expanders[activeKey].doClose();
	}
	
	return false;
},

previous : function (el) {
	return hs.previousOrNext(el, -1);
},

next : function (el) {
	return hs.previousOrNext(el, 1);	
},

keyHandler : function(e) {
	if (!e) e = window.event;
	if (!e.target) e.target = e.srcElement; // ie
	if (e.target.form) return; // form element has focus
	
	var op = null;
	switch (e.keyCode) {
		case 34: // Page Down
		case 39: // Arrow right
		case 40: // Arrow left
			op = 1;
			break;
		case 33: // Page Up
		case 37: // Arrow left
		case 38: // Arrow down
			op = -1;
			break;
		case 27: // Escape
		case 13: // Enter
			if (hs.expanders[hs.focusKey]) hs.expanders[hs.focusKey].doClose();
			return false;
	}
	if (op != null) {
		hs.removeEventListener(document, 'keydown', hs.keyHandler);
		if (hs.expanders[hs.focusKey] && !hs.expanders[hs.focusKey].enableKeyListener) return true;
		return hs.previousOrNext(hs.focusKey, op);
	}
	else return true;
},

registerOverlay : function (overlay) {
	hs.push(hs.overlays, overlay);
},

getWrapperKey : function (el) {
	var key = -1;
	while (el.parentNode)	{
		el = el.parentNode;
		if (el.id && el.id.match(/^highslide-wrapper-[0-9]+$/)) {
			key = el.id.replace(/^highslide-wrapper-([0-9]+)$/, "$1");
			break;
		}
	}
	return key;
},

cleanUp : function () {
	if (hs.toggleImagesExpandEl) { 
		hs.toggleImagesExpandEl.onclick();
		hs.toggleImagesExpandEl = null;
	} else {
		for (i = 0; i < hs.expanders.length; i++) {
			if (hs.expanders[i] && hs.expanders[i].isExpanded) hs.focusTopmost();
		}		
	}
},

mouseClickHandler : function(e) 
{
	if (!e) e = window.event;
	if (e.button > 1) return true;
	if (!e.target) e.target = e.srcElement;
	
	
	var fobj = e.target;
	while (fobj.parentNode
		&& !(fobj.className && fobj.className.match(/highslide-(image|move|html)/)))
	{
		fobj = fobj.parentNode;
	}

	if (!fobj.parentNode) return;
	
	hs.dragKey = hs.getWrapperKey(fobj);
	if (fobj.className.match(/highslide-(image|move)/)) {
		var isDraggable = true;
		var wLeft = parseInt(hs.expanders[hs.dragKey].wrapper.style.left);
		var wTop = parseInt(hs.expanders[hs.dragKey].wrapper.style.top);			
	}

	if (e.type == 'mousedown') {
		if (isDraggable) // drag or focus
		{
			hs.dragObj = hs.expanders[hs.dragKey].content;

			if (fobj.className.match('highslide-image')) hs.dragObj.style.cursor = 'move';
			
			hs.wLeft = wLeft;
			hs.wTop = wTop;
			
			hs.dragX = e.clientX;
			hs.dragY = e.clientY;
			hs.addEventListener(document, 'mousemove', hs.mouseMoveHandler);
			if (e.preventDefault) e.preventDefault(); // FF
			
			if (hs.dragObj.className.match(/highslide-(image|html)-blur/)) {
				hs.expanders[hs.dragKey].focus();
				hs.hasFocused = true;
			}
			return false;
		}
		else if (fobj.className.match(/highslide-html/)) { // just focus
			hs.expanders[hs.dragKey].focus();
			hs.expanders[hs.dragKey].redoShowHide();
			hs.hasFocused = false; // why??
		}
		
	} else if (e.type == 'mouseup') {
		hs.removeEventListener(document, 'mousemove', hs.mouseMoveHandler);
		if (isDraggable && hs.expanders[hs.dragKey]) {
			if (fobj.className.match('highslide-image')) {
				fobj.style.cursor = hs.styleRestoreCursor;
			}
			var hasMoved = wLeft != hs.wLeft || wTop != hs.wTop;
			if (!hasMoved && !hs.hasFocused && !fobj.className.match(/highslide-move/)) {
				hs.expanders[hs.dragKey].doClose();
			} else if (hasMoved || (!hasMoved && hs.hasHtmlExpanders)) {
				hs.expanders[hs.dragKey].redoShowHide();
			}
			hs.hasFocused = false;
		
		} else if (fobj.className.match('highslide-image-blur')) {
			fobj.style.cursor = hs.styleRestoreCursor;		
		}
	}
},

mouseMoveHandler : function(e)
{
	if (!hs.expanders[hs.dragKey] || !hs.expanders[hs.dragKey].wrapper) return;
	if (!e) e = window.event;

	var exp = hs.expanders[hs.dragKey];
	var w = exp.wrapper;
	w.style.left = hs.wLeft + e.clientX - hs.dragX +'px';
	w.style.top  = hs.wTop + e.clientY - hs.dragY +'px';
	
	if (exp.objOutline) {
		var o = exp.objOutline;
		o.outer.style.left = (parseInt(w.style.left) - o.offset) +'px';
		o.outer.style.top = (parseInt(w.style.top) - o.offset) +'px';
	}
	
	return false;
},

addEventListener : function (el, event, func) {
	if (document.addEventListener) el.addEventListener(event, func, false);
	else if (document.attachEvent) el.attachEvent('on'+ event, func);
	else el['on'+ event] = func;
},

removeEventListener : function (el, event, func) {
	if (document.removeEventListener) el.removeEventListener(event, func, false);
	else if (document.detachEvent) el.detachEvent('on'+ event, func);
	else el[event] = null;
},

isHsAnchor : function (a) {
	return (a.onclick && a.onclick.toString().replace(/\s/g, ' ').match(/hs.(htmlE|e)xpand/));
},

preloadFullImage : function (i) {
	if (hs.continuePreloading && hs.preloadTheseImages[i] && hs.preloadTheseImages[i] != 'undefined') {
		var img = document.createElement('img');
		img.onload = function() { hs.preloadFullImage(i + 1); };
		img.src = hs.preloadTheseImages[i];
	}
},

preloadImages : function (number) {
	if (number && typeof number != 'object') hs.numberOfImagesToPreload = number;
	var re, j = 0;
	
	var aTags = document.getElementsByTagName('A');
	for (i = 0; i < aTags.length; i++) {
		a = aTags[i];
		re = hs.isHsAnchor(a);
		if (re && re[0] == 'hs.expand') {
			if (j < hs.numberOfImagesToPreload) {
				hs.preloadTheseImages[j] = hs.getSrc(a); 
				j++;
			}
		}
	}
	
	// preload outlines
	new HsOutline(hs.outlineType, function () { hs.preloadFullImage(0)} );
	
	// preload cursor
	var cur = document.createElement('img');
	cur.src = hs.graphicsDir + hs.restoreCursor;
},

genContainer : function () {
	if (!hs.container) {
		hs.container = hs.createElement('div', 
			null, 
			{ position: 'absolute', left: 0, top: 0, width: '100%', zIndex: hs.zIndexCounter }, 
			document.body
		);
	}	
}
}; // end hs object

//-----------------------------------------------------------------------------
HsOutline = function (outlineType, onLoad) {
	if (!outlineType) return;
	if (onLoad) this.onLoad = onLoad;
	this.outlineType = outlineType;
	this.outline = new Array();
	var v = hs.ieVersion();
	
	hs.genContainer();
	
	this.hasAlphaImageLoader = hs.ie && v >= 5.5 && v < 8;
	this.hasPngSupport = !hs.ie || (hs.ie && v >= 8);
	this.hasOutline = this.outlineType && (this.hasAlphaImageLoader || this.hasPngSupport);
	
	this.outer = hs.createElement(
		'table',
		{	
			cellSpacing: 0 // saf
		},
		{
			visibility: 'hidden',
			position: 'absolute',
			zIndex: hs.zIndexCounter++,
			borderCollapse: 'collapse'
		},
		hs.container
	);
	this.tbody = hs.createElement('tbody', null, null, this.outer);
	
	this.preloadOutlineElement(1); // recursive
};

HsOutline.prototype.preloadOutlineElement = function (i) {	
	if (this.outline[i] && this.outline[i].onload) { // Gecko multiple onloads bug
		this.outline[i].onload = null;
		return;
	}
	
	this.offset = this.hasOutline ? 10 : 0;
	if (i == 1 || i == 4 || i == 6) this.tr = hs.createElement('tr', null, null, this.tbody);
	if (i == 5) this.inner = hs.createElement('td', null, { padding: 0, margin: 0, border: 0, position: 'relative' }, this.tr);
	
	var files = Array (0,8,1,2,7,3,6,5,4);
	var src = hs.graphicsDir + "outlines/"+ this.outlineType +"/"+ files[i] +".png";
	
	if (this.hasAlphaImageLoader) {
		var bgKey = 'filter';
		var bgValue = "progid:DXImageTransform.Microsoft.AlphaImageLoader("
					+ "enabled=true, sizingMethod=scale src='"+ src + "') ";
	} else if (this.hasPngSupport || this.hasIe7Bug) {		
		var bgKey = 'background';
		var bgValue = 'url('+ src +')';
	}
	var styles = { lineHeight: 0, fontSize: 0, padding: 0, margin: 0, border: 0 };
	if (this.hasOutline) styles[bgKey] = bgValue;
		
	var td = hs.createElement('td', null, styles);
		
	var img = hs.createElement('img', null, { visibility: 'hidden', display: 'block', padding: 0, margin: 0, border: 0 }, td); // for onload trigger
	
	var dim = 2 * this.offset;
	hs.setStyles (td, { height: dim +'px', width: dim +'px'} );
		
	var pThis = this;
	if (i < 8) img.onload = function() { pThis.preloadOutlineElement(i + 1); };				
	else img.onload = function() { 
		hs.pendingOutlines[pThis.outlineType] = pThis;
		if (pThis.onLoad) pThis.onLoad(); 
	};
	
	this.tr.appendChild(td);
	if (this.hasOutline) img.src = src;
	else img.onload();
};

HsOutline.prototype.destroy = function() {
	hs.purge(this.outer);
	try { this.outer.parentNode.removeChild(this.outer); } catch (e) {}
};

//-----------------------------------------------------------------------------
// The expander object
HsExpander = function(a, params, contentType) {
	hs.continuePreloading = false;
		
	// override inline parameters
	for (i = 0; i < hs.overrides.length; i++) {
		var name = hs.overrides[i];
		if (params && typeof params[name] != 'undefined') this[name] = params[name];
		else this[name] = hs[name];
	}
	
	if (params && params.thumbnailId) {
		var el = hs.$(params.thumbnailId);
	
	} else { // first img within anchor
		for (i = 0; i < a.childNodes.length; i++) {
			if (a.childNodes[i].tagName && a.childNodes[i].tagName == 'IMG') {
				var el = a.childNodes[i];
				break;
			}			
		}
	}
	if (!el) el = a;
	
	
	// cancel other
	for (i = 0; i < hs.expanders.length; i++) {
		if (hs.expanders[i] && hs.expanders[i].thumb != el && !hs.expanders[i].onLoadStarted) {
			hs.expanders[i].cancelLoading();
		}
	}
	// check if already open
	for (i = 0; i < hs.expanders.length; i++) {
		if (hs.expanders[i] && hs.expanders[i].thumb == el) {
			hs.expanders[i].focus();
			return false;
		}		
	}

	if (!hs.allowMultipleInstances) {
		var prev = hs.expandedImagesCounter - 1;
		if (hs.expanders[prev]) hs.expanders[prev].doClose();
	}
	
	this.key = hs.expandedImagesCounter++;
	hs.expanders[this.key] = this;
	if (contentType == 'html') {
		this.isHtml = true;
		this.contentType = 'html';
	} else {
		this.isImage = true;
		this.contentType = 'image';
	}
	
	this.a = a;
	
	this.thumbsUserSetId = el.id || a.id;
	this.thumb = el;		
	
	this.overlays = new Array();

	var pos = hs.position(el); 
	
	// instanciate the wrapper
	this.wrapper = hs.createElement(
		'div',
		{
			id: 'highslide-wrapper-'+ this.key,
			className: this.wrapperClassName
		},
		{
			visibility: 'hidden',
			position: 'absolute',
			zIndex: hs.zIndexCounter++
		}
	);
	
	// store properties of thumbnail
	this.thumbWidth = el.width ? el.width : el.offsetWidth;		
	this.thumbHeight = el.height ? el.height : el.offsetHeight;
	this.thumbLeft = pos.x;
	this.thumbTop = pos.y;
	this.thumbClass = el.className;
	
	// thumb borders
	this.thumbOffsetBorderW = (this.thumb.offsetWidth - this.thumbWidth) / 2;
	this.thumbOffsetBorderH = (this.thumb.offsetHeight - this.thumbHeight) / 2;
	
	// get the wrapper
	hs.genContainer();
	if (hs.pendingOutlines[this.outlineType]) {
		this.connectOutline();
		this[this.contentType +'Create']();
	} else if (!this.outlineType) {
		this[this.contentType +'Create']();
	} else {
		this.displayLoading();
		var pThis = this;
		new HsOutline(this.outlineType, 
			function () { 
				pThis.connectOutline();
				pThis[pThis.contentType +'Create']();
			} 
		);
	}
	
};

HsExpander.prototype.connectOutline = function(x, y) {	
	var w = hs.pendingOutlines[this.outlineType];
	this.objOutline = w;
	hs.pendingOutlines[this.outlineType] = null;
};

HsExpander.prototype.displayLoading = function() {
	if (this.onLoadStarted || this.loading) return;
		
	this.originalCursor = this.a.style.cursor;
	this.a.style.cursor = 'wait';
	
	if (!hs.loading) {
		hs.loading = hs.createElement('a',
			{
				className: 'highslide-loading',
				title: hs.loadingTitle,
				innerHTML: hs.loadingText
			},
			{
				position: 'absolute'
			}, hs.container
		);
		if (hs.ie) hs.loading.style.filter = 'alpha(opacity='+ (100*hs.loadingOpacity) +')';
		else hs.loading.style.opacity = hs.loadingOpacity;
	}
	
	this.loading = hs.loading;
	this.loading.href = 'javascript:hs.expanders['+ this.key +'].cancelLoading()';
	this.loading.visibility = 'visible';		
	
	this.loading.style.left = (this.thumbLeft + this.thumbOffsetBorderW 
		+ (this.thumbWidth - this.loading.offsetWidth) / 2) +'px';
	this.loading.style.top = (this.thumbTop 
		+ (this.thumbHeight - this.loading.offsetHeight) / 2) +'px';
	setTimeout(
		"if (hs.expanders["+ this.key +"] && hs.expanders["+ this.key +"].loading) "
		+ "hs.expanders["+ this.key +"].loading.style.visibility = 'visible';", 
		100
	);
};

HsExpander.prototype.imageCreate = function() {
	var img = document.createElement('img');
	var key = this.key;

	var img = document.createElement('img');
    this.content = img;
    img.onload = function () { if (hs.expanders[key]) hs.expanders[key].onLoad();  };
    img.className = 'highslide-image '+ this.thumbClass;
    img.style.visibility = 'hidden'; // prevent flickering in IE
    img.style.display = 'block';
	img.style.position = 'absolute';
    img.style.zIndex = 3;
    img.title = hs.restoreTitle;
    img.onmouseover = function () { 
    	if (hs.expanders[key]) hs.expanders[key].onMouseOver(); 
    };
    img.onmouseout = function (e) { 
    	var rel = e ? e.relatedTarget : event.toElement;
		if (hs.expanders[key]) hs.expanders[key].onMouseOut(rel);
	};
    if (hs.safari) hs.container.appendChild(img);
	img.src = hs.getSrc(this.a);
	
	this.displayLoading();
};

HsExpander.prototype.onLoad = function() {	
	try { 
	
		if (!this.content) return;
		if (this.onLoadStarted) return; // old Gecko loop
		else this.onLoadStarted = true;
		
			   
		if (this.loading) {
			this.loading.style.visibility = 'hidden';
			this.loading = null;
			this.a.style.cursor = this.originalCursor || '';
		}
		if (this.isImage) {			
			this.newWidth = this.content.width;
			this.newHeight = this.content.height;
			this.fullExpandWidth = this.newWidth;
			this.fullExpandHeight = this.newHeight;
			
			this.content.width = this.thumbWidth;
			this.content.height = this.thumbHeight;
			
		} else if (this.htmlGetSize) this.htmlGetSize();
		
		// identify caption div		
		var modMarginBottom = hs.marginBottom;
		if (!this.captionId && this.thumbsUserSetId)  this.captionId = 'caption-for-'+ this.thumbsUserSetId;
		if (this.captionId) {
			this.caption = hs.cloneNode(this.captionId);
		}
		if (this.captionTemplateId) {
			var s = (this.caption) ? this.caption.innerHTML : '';
			this.caption = hs.cloneNode(this.captionTemplateId);
			if (this.caption) this.caption.innerHTML
				= this.caption.innerHTML.replace(/\s/g, ' ').replace('{caption}', s);
		}
		
		var modMarginBottom = hs.marginBottom;
		if (this.caption) modMarginBottom += this.spaceForCaption;
		
		this.wrapper.appendChild(this.content);
		this.content.style.position = 'relative'; // Saf
		if (this.caption) this.wrapper.appendChild(this.caption);
		this.wrapper.style.left = this.thumbLeft +'px';
		this.wrapper.style.top = this.thumbTop +'px';
		hs.container.appendChild(this.wrapper);
		
		// correct for borders
		this.offsetBorderW = (this.content.offsetWidth - this.thumbWidth) / 2;
		this.offsetBorderH = (this.content.offsetHeight - this.thumbHeight) / 2;
		var modMarginRight = hs.marginRight + 2 * this.offsetBorderW;
		modMarginBottom += 2 * this.offsetBorderH;
		
		var ratio = this.newWidth / this.newHeight;
		var minWidth = this.allowSizeReduction ? this.minWidth : this.newWidth;
		var minHeight = this.allowSizeReduction ? this.minHeight : this.newHeight;
		
		var justify = { x: 'auto', y: 'auto' };
		if (this.align == 'center') {
			justify.x = 'center';
			justify.y = 'center';
		} else {
			if (this.anchor.match(/^top/)) justify.y = null;
			if (this.anchor.match(/right$/)) justify.x = 'max';
			if (this.anchor.match(/^bottom/)) justify.y = 'max';
			if (this.anchor.match(/left$/)) justify.x = null;
		}
		
		client = new hs.clientInfo();		
		
		// justify
		this.x = { 
			min: parseInt(this.thumbLeft) - this.offsetBorderW + this.thumbOffsetBorderW,
			span: this.newWidth,
			minSpan: this.newWidth < minWidth ? this.newWidth : minWidth,
			justify: justify.x,
			target: this.targetX,
			marginMin: hs.marginLeft, 
			marginMax: modMarginRight,
			scroll: client.scrollLeft,
			clientSpan: client.width,
			thumbSpan: this.thumbWidth
		};
		var oldRight = this.x.min + parseInt(this.thumbWidth);
		this.x = this.justify(this.x);

		this.y = { 
			min: parseInt(this.thumbTop) - this.offsetBorderH + this.thumbOffsetBorderH,
			span: this.newHeight,
			minSpan: this.newHeight < minHeight ? this.newHeight : minHeight,
			justify: justify.y,
			target: this.targetY,
			marginMin: hs.marginTop, 
			marginMax: modMarginBottom, 
			scroll: client.scrollTop,
			clientSpan: client.height,
			thumbSpan: this.thumbHeight
		};
		var oldBottom = this.y.min + parseInt(this.thumbHeight);
		this.y = this.justify(this.y);
	
		if (this.isHtml) this.htmlSizeOperations();	
		if (this.isImage) this.correctRatio(ratio);

		var x = this.x;
		var y = this.y;	

		// Selectbox bug
		var imgPos = {x: x.min - 20, y: y.min - 20, w: x.span + 40, h: y.span + 40 + this.spaceForCaption};
		hs.hideSelects = (hs.ie && hs.ieVersion() < 7);
		if (hs.hideSelects) this.showHideElements('SELECT', 'hidden', imgPos);
		// Iframes bug
		hs.hideIframes = (window.opera || navigator.vendor == 'KDE' || (hs.ie && hs.ieVersion() < 5.5));
		if (hs.hideIframes) this.showHideElements('IFRAME', 'hidden', imgPos);
		
		// Make outline ready	
		if (this.objOutline && !this.outlineWhileAnimating) this.positionOutline(x.min, y.min, x.span, y.span);
		var o2 = this.objOutline ? this.objOutline.offset : 0;
		
		// Apply size change		
		this.changeSize(
			1,
			this.thumbLeft + this.thumbOffsetBorderW - this.offsetBorderW,
			this.thumbTop + this.thumbOffsetBorderH - this.offsetBorderH,
			this.thumbWidth,
			this.thumbHeight,
			x.min,
			y.min,
			x.span,
			y.span, 
			hs.expandDuration,
			hs.expandSteps,
			hs.outlineStartOffset,
			o2
		);

	} catch (e) {
		if (hs.expanders[this.key] && hs.expanders[this.key].a) 
			window.location.href = hs.getSrc(hs.expanders[this.key].a);
	}
};

HsExpander.prototype.justify = function (p) {
	var tgt, dim = p == this.x ? 'x' : 'y';

	if (p.target && p.target.match(/ /)) {
		tgt = p.target.split(' ');
		p.target = tgt[0];
	}
	if (hs.$(p.target)) {
		p.min = hs.position(hs.$(p.target))[dim];
		if (tgt && tgt[1] && tgt[1].match(/^[-]?[0-9]+px$/)) p.min += parseInt(tgt[1]);
		
	} else if (p.justify == 'auto' || p.justify == 'center') {
		var hasMovedMin = false;
		var allowReduce = true;
		
		// calculate p.min
		if (p.justify == 'center') p.min = Math.round(p.scroll + (p.clientSpan - p.span - p.marginMax) / 2);
		else p.min = Math.round(p.min - ((p.span - p.thumbSpan) / 2)); // auto
		
		if (p.min < p.scroll + p.marginMin && !hs.$(p.target)) {
			p.min = p.scroll + p.marginMin;
			hasMovedMin = true;		
		}
		
		if (p.span < p.minSpan) {
			p.span = p.minSpan;
			allowReduce = false;
		}
		// calculate right/newWidth
		if (p.min + p.span > p.scroll + p.clientSpan - p.marginMax) {
			if (hasMovedMin && allowReduce) p.span = p.clientSpan - p.marginMin - p.marginMax; // can't expand more
			else if (p.span < p.clientSpan - p.marginMin - p.marginMax) { // move newTop up
				p.min = p.scroll + p.clientSpan - p.span - p.marginMin - p.marginMax;
			} else { // image larger than client
				p.min = p.scroll + p.marginMin;
				if (allowReduce) p.span = p.clientSpan - p.marginMin - p.marginMax;
			}
			
		}
		
		if (p.span < p.minSpan) {
			p.span = p.minSpan;
			allowReduce = false;
		}
		
	} else if (p.justify == 'max') {
		p.min = Math.floor(p.min - p.span + p.thumbSpan);
	}
	
	if (p.min < p.marginMin) {
		tmpMin = p.min;
		p.min = p.marginMin; 
		if (allowReduce) p.span = p.span - (p.min - tmpMin);
	}
	return p;
};

HsExpander.prototype.correctRatio = function(ratio) {
	var x = this.x;
	var y = this.y;
	var changed = false;
	if (x.span / y.span > ratio) { // width greater
		var tmpWidth = x.span;
		x.span = y.span * ratio;
		if (x.span < x.minSpan) { // below minWidth
			x.span = x.minSpan;	
			y.span = x.span / ratio;
		}
		changed = true;
	
	} else if (x.span / y.span < ratio) { // height greater
		var tmpHeight = y.span;
		y.span = x.span / ratio;
		changed = true;
	}
	
	if (changed) {
		x.min = parseInt(this.thumbLeft) - this.offsetBorderW + this.thumbOffsetBorderW;
		x.minSpan = x.span;
		this.x = this.justify(x);
		
		y.min = parseInt(this.thumbTop) - this.offsetBorderH + this.thumbOffsetBorderH;
		y.minSpan = y.span;
		this.y = this.justify(y);
	}
};

HsExpander.prototype.changeSize = function(dir, x1, y1, w1, h1, x2, y2, w2, h2, dur, steps, oo1, oo2) {
	dW = (w2 - w1) / steps;
	dH = (h2 - h1) / steps;
	dX = (x2 - x1) / steps;
	dY = (y2 - y1) / steps;
	dOo = (oo2 - oo1) /steps;
	for (i = 1; i <= steps; i++) {
		w1 += dW;
		h1 += dH;
		x1 += dX;
		y1 += dY;
		oo1 += dOo;
		
		var obj = "hs.expanders["+ this.key +"]";
		var s = "if ("+ obj +") {";
		if (i == 1) {
			s += obj +".content.style.visibility = 'visible';"
				+ "if ("+ obj +".thumb.tagName == 'IMG' && hs.hideThumbOnExpand) "+ obj +".thumb.style.visibility = 'hidden';"
		}
		if (i == steps) {
			w1 = w2;
			h1 = h2;
			x1 = x2;
			y1 = y2;
			oo1 = oo2;
		}
		s += obj +"."+ this.contentType +"SetSize("+ Math.round(w1) +", "+ Math.round(h1) +", "
			+ Math.round(x1) +", "+ Math.round(y1) +", "+ Math.round(oo1);
		if (i == steps) s += ', '+ dir;
		s += ");}";
		setTimeout(s, Math.round(i * (dur / steps)));
	}
};

HsExpander.prototype.imageSetSize = function (w, h, x, y, offset, end) {
	try {
		this.content.width = w;
		this.content.height = h;
		
		if (this.objOutline && this.outlineWhileAnimating) {
			var o = this.objOutline.offset - offset;
			this.positionOutline(x + o, y + o, w - 2 * o, h - 2 * o, 1);
		}
		
		hs.setStyles ( this.wrapper,
			{
				'visibility': 'visible',
				'left': x +'px',
				'top': y +'px'
			}
		);
		var exp = 'hs.expanders['+ this.key +']';
		if (end == 1) setTimeout('if ('+ exp +')'+ exp +'.onExpanded()', 0); // jerk in IE
		else if (end == -1) setTimeout('if ('+ exp +')'+ exp +'.onEndClose()', 0);
	} catch (e) {
		window.location.href = hs.getSrc(this.a);
	}
};

HsExpander.prototype.positionOutline = function(x, y, w, h, vis) {
	if (!this.objOutline) return;
	var o = this.objOutline;
	if (vis) o.outer.style.visibility = 'visible';
	o.outer.style.left = (x - o.offset) +'px';
	o.outer.style.top = (y - o.offset) +'px';
	o.outer.style.width = (w + 2 * (this.offsetBorderW + o.offset)) +'px';
	w += 2 * (this.offsetBorderW - o.offset);
	h += + 2 * (this.offsetBorderH - o.offset);
	o.inner.style.width = w >= 0 ? w +'px' : 0;
	o.inner.style.height = h >= 0 ? h +'px' : 0;
};

HsExpander.prototype.onExpanded = function() {
	if (this.objOutline) this.objOutline.outer.style.visibility = 'visible';
	this.isExpanded = true;
	this.focus();
	if (this.isHtml && this.objectLoadTime == 'after') this.writeExtendedContent();
	this.createCustomOverlays();
	if (hs.showCredits) this.writeCredits();
	
	if (this.caption) this.writeCaption();
	
	if (this.fullExpandWidth > this.x.span) this.createFullExpand();
	if (!this.caption) this.onDisplayFinished();
};

HsExpander.prototype.onDisplayFinished = function() {
	var key = this.key;
	var outlineType = this.outlineType;
	new HsOutline(outlineType, function () { if (hs.expanders[key]) hs.expanders[key].preloadNext();	});
};

HsExpander.prototype.preloadNext = function() {
	var nextA = hs.getAdjacentAnchor(this.key, 1);
	if (nextA) {
		var img = document.createElement('img');
		img.src = hs.getSrc(nextA);
	}
};

HsExpander.prototype.cancelLoading = function() {
	this.a.style.cursor = this.originalCursor;	
	if (this.loading) hs.loading.style.visibility = 'hidden';		
	hs.expanders[this.key] = null;
};

HsExpander.prototype.writeCredits = function () {
	var credits = hs.createElement('a',
		{
			href: hs.creditsHref,
			className: 'highslide-credits',
			innerHTML: hs.creditsText,
			title: hs.creditsTitle
		}
	);
	this.createOverlay(credits, 'top left');
};

HsExpander.prototype.writeCaption = function() {
	try {
		this.wrapper.style.width = this.wrapper.offsetWidth +'px';	
		this.caption.style.visibility = 'hidden';
		this.caption.style.position = 'relative';
		if (hs.ie) this.caption.style.zoom = 1;  
		this.caption.className += ' highslide-display-block';
		
		var capHeight = this.caption.offsetHeight;
		var slideHeight = (capHeight < this.content.height) ? capHeight : this.content.height;
		this.caption.style.top = '-'+ slideHeight +'px';
		
		this.caption.style.zIndex = 2;
		
		var step = 1;
		if (slideHeight > 400) step = 4;
		else if (slideHeight > 200) step = 2;
		else if (slideHeight > 100) step = 1;
		if (hs.captionSlideSpeed) step = step * hs.captionSlideSpeed;
		else step = slideHeight;

		var t = 0;
		for (var top = -slideHeight; top <= 0; top += step, t += 10) {
			var end = (top >= 0) ? 1 : 0;
			var eval = "if (hs.expanders["+ this.key +"]) { "
				+ "hs.expanders["+ this.key +"].placeCaption("+ top +", "+ end +");"
				+ "}";			
			setTimeout (eval, t);
		}
	
	} catch (e) {}	
};

HsExpander.prototype.placeCaption = function(top, end) {
	if (!this.caption) return;
	this.caption.style.top = top +'px';
	this.caption.style.visibility = 'visible';
	if (this.objOutline) this.objOutline.inner.style.height 
		= (this.wrapper.offsetHeight + top - 2 * this.objOutline.offset) +'px';
	if (end) this.onDisplayFinished();
};

HsExpander.prototype.showHideElements = function (tagName, visibility, imgPos) {
	var els = document.getElementsByTagName(tagName);
	if (els) {			
		for (i = 0; i < els.length; i++) {
			if (els[i].nodeName == tagName) {  
				var hiddenBy = els[i].getAttribute('hidden-by');
				 
				if (visibility == 'visible' && hiddenBy) {
					hiddenBy = hiddenBy.replace('['+ this.key +']', '');
					els[i].setAttribute('hidden-by', hiddenBy);
					if (!hiddenBy) els[i].style.visibility = 'visible';				
					
				} else if (visibility == 'hidden') { // hide if behind
					var elPos = hs.position(els[i]);
					elPos.w = els[i].offsetWidth;
					elPos.h = els[i].offsetHeight;
				
					var clearsX = (elPos.x + elPos.w < imgPos.x || elPos.x > imgPos.x + imgPos.w);
					var clearsY = (elPos.y + elPos.h < imgPos.y || elPos.y > imgPos.y + imgPos.h);
					var wrapperKey = hs.getWrapperKey(els[i]);
					if (!clearsX && !clearsY && wrapperKey != this.key) { // element falls behind image
						if (!els[i].currentStyle || (els[i].currentStyle && els[i].currentStyle['visibility'] != 'hidden')) { // IE
							if (!hiddenBy) {
								els[i].setAttribute('hidden-by', '['+ this.key +']');
							} else if (!hiddenBy.match('['+ this.key +']')) {
								els[i].setAttribute('hidden-by', hiddenBy + '['+ this.key +']');
							}
							els[i].style.visibility = 'hidden';	  
						}
					} else if (hiddenBy == '['+ this.key +']' || hs.focusKey == wrapperKey) { // on move
						els[i].setAttribute('hidden-by', '');
						els[i].style.visibility = 'visible';
					} else if (hiddenBy && hiddenBy.match('['+ this.key +']')) {
						els[i].setAttribute('hidden-by', hiddenBy.replace('['+ this.key +']', ''));
					}
				}   
			}
		}
	}
};

HsExpander.prototype.focus = function() {
	// blur others
	for (i = 0; i < hs.expanders.length; i++) {
		if (hs.expanders[i] && i == hs.focusKey) {
			var blurExp = hs.expanders[i];
			blurExp.content.className += ' highslide-'+ blurExp.contentType +'-blur';
			if (blurExp.caption) {
				hs.setId(blurExp.caption, '-hsBlur'+i);
				blurExp.caption.className += ' highslide-caption-blur';
			}
			if (blurExp.isImage) {
				blurExp.content.style.cursor = hs.ie ? 'hand' : 'pointer';
				blurExp.content.title = hs.focusTitle;	
			} else { hs.setId(blurExp.innerContent, '-hsBlur'+i); }
		}
	}
	
	// focus this
	this.wrapper.style.zIndex = hs.zIndexCounter++;
	if (this.objOutline) this.objOutline.outer.style.zIndex = this.wrapper.style.zIndex;
	
	this.content.className = 'highslide-'+ this.contentType;
	if (this.caption) {
		hs.setId(this.caption, '-hsBlur' + this.key, 1);
		this.caption.className = this.caption.className.replace(' highslide-caption-blur', '');
	}
	
	if (this.isImage) {
		this.content.title = hs.restoreTitle;
		
		hs.styleRestoreCursor = window.opera ? 'pointer' : 'url('+ hs.graphicsDir + hs.restoreCursor +'), pointer';
		if (hs.ie && hs.ieVersion() < 6) hs.styleRestoreCursor = 'hand';
		this.content.style.cursor = hs.styleRestoreCursor;
	} else {
		hs.setId(this.innerContent, '-hsBlur' + this.key, 1);
	}
	
	hs.focusKey = this.key;	
	hs.addEventListener(document, 'keydown', hs.keyHandler);
};

HsExpander.prototype.doClose = function() {
	hs.removeEventListener(document, 'keydown', hs.keyHandler);
	try {
		if (!hs.expanders[this.key]) return;

		this.isClosing = true;
		
		var x = parseInt(this.wrapper.style.left);
		var y = parseInt(this.wrapper.style.top);
		var w = (this.isImage) ? this.content.width : parseInt(this.content.style.width);
		var h = (this.isImage) ? this.content.height : parseInt(this.content.style.height);
		
		if (this.objOutline && this.outlineWhileAnimating) this.positionOutline(x, y, w, h);
		else if (this.objOutline) this.objOutline.destroy();
		
		// remove children
		var n = this.wrapper.childNodes.length;
		for (i = n - 1; i >= 0 ; i--) {
			var child = this.wrapper.childNodes[i];
			if (child != this.content) {
				hs.purge(this.wrapper.childNodes[i]);
				this.wrapper.removeChild(this.wrapper.childNodes[i]);
			}
		}
		if (this.isHtml) this.htmlOnClose();
		
		this.wrapper.style.width = 'auto';
		this.content.style.cursor = 'default';
		var o2 = this.objOutline ? this.objOutline.offset : 0;
		
		this.changeSize(
			-1,
			x,
			y,
			w,
			h,
			this.thumbLeft - this.offsetBorderW + this.thumbOffsetBorderW,
			this.thumbTop - this.offsetBorderH + this.thumbOffsetBorderH,
			this.thumbWidth,
			this.thumbHeight, 
			hs.restoreDuration,
			hs.restoreSteps,
			o2,
			hs.outlineStartOffset
		);
		
	} catch (e) {
		hs.expanders[this.key].onEndClose();
	}
};

HsExpander.prototype.onEndClose = function () {
	this.thumb.style.visibility = 'visible';
	
	if (hs.hideSelects) this.showHideElements('SELECT', 'visible');
	if (hs.hideIframes) this.showHideElements('IFRAME', 'visible');
	
	if (this.objOutline && this.outlineWhileAnimating) this.objOutline.destroy();
	hs.purge(this.wrapper);
	this.wrapper.parentNode.removeChild(this.wrapper);
	hs.expanders[this.key] = null;

	hs.cleanUp();
};

HsExpander.prototype.createOverlay = function (el, position, hideOnMouseOut, opacity) {
	if (typeof el == 'string') el = hs.cloneNode(el);
	if (!el || typeof el == 'string' || !this.isImage) return;
	
	if (!position) var position = 'center center';
	var overlay = hs.createElement(
		'div',
		null,
		{
			'position' : 'absolute',
			'zIndex' : 3
		},
		this.wrapper
	);
	if (opacity && opacity < 1) {
		if (hs.ie) overlay.style.filter = 'alpha(opacity='+ (opacity * 100) +')';
		else overlay.style.opacity = opacity;
	}
	el.className += ' highslide-display-block';
	overlay.appendChild(el);	
	
	var left = this.offsetBorderW;
	var dLeft = this.content.width - overlay.offsetWidth;
	var top = this.offsetBorderH;
	var dTop = this.content.height - overlay.offsetHeight;
	
	if (position.match(/^bottom/)) top += dTop;
	if (position.match(/^center/)) top += dTop / 2;
	if (position.match(/right$/)) left += dLeft;
	if (position.match(/center$/)) left += dLeft / 2;
	overlay.style.left = left +'px';
	overlay.style.top = top +'px';
	
	if (hideOnMouseOut) overlay.setAttribute('hideOnMouseOut', true);
	
	hs.push(this.overlays, overlay);
};

HsExpander.prototype.createCustomOverlays = function() {
	for (i = 0; i < hs.overlays.length; i++) {
		var o = hs.overlays[i];
		if (o.thumbnailId == null || o.thumbnailId == this.thumbsUserSetId) {
			this.createOverlay(o.overlayId, o.position, o.hideOnMouseOut, o.opacity);
		}
	}
};

HsExpander.prototype.onMouseOver = function () {
	for (i = 0; i < this.overlays.length; i++) {
		this.overlays[i].style.visibility = 'visible';
	}
};

HsExpander.prototype.onMouseOut = function(rel) {
	var hideThese = new Array();
	var j = 0;
	for (i = 0; i < this.overlays.length; i++) {
		var node = rel;
		while (node && node.parentNode) {
			if (node == this.overlays[i]) return;
			node = node.parentNode;
		}
		
		if (this.overlays[i].getAttribute('hideOnMouseOut')) {
			hideThese[j] = this.overlays[i];
			j++;
		}
	}
	for (i = 0; i < hideThese.length; i++) {		
		hideThese[i].style.visibility = 'hidden';
	}
};

HsExpander.prototype.createFullExpand = function () {
	var a = hs.createElement(
		'a',
		{
			href: 'javascript:hs.expanders['+ this.key +'].doFullExpand();',
			title: hs.fullExpandTitle
		},
		{
			background: 'url('+ hs.graphicsDir + hs.fullExpandIcon+')',
			display: 'block',
			margin: '0 10px 10px 0',
			width: '45px',
			height: '44px'
		}
	);
	
	this.createOverlay(a, 'bottom right', true, 0.75);
	this.fullExpandIcon = a;
};

HsExpander.prototype.doFullExpand = function () {
	try {
		hs.purge(this.fullExpandIcon);
		this.fullExpandIcon.parentNode.removeChild(this.fullExpandIcon);
		this.focus();
		
		this.x.min = parseInt(this.wrapper.style.left) - (this.fullExpandWidth - this.content.width) / 2;
		if (this.x.min < hs.marginLeft) this.x.min = hs.marginLeft;		
		this.wrapper.style.left = this.x.min +'px';
		
		var borderOffset = this.wrapper.offsetWidth - this.content.width;		
		
		this.content.width = this.fullExpandWidth;
		this.content.height = this.fullExpandHeight;
		
		this.x.span = this.content.width;
		this.wrapper.style.width = (this.x.span + borderOffset) +'px';
		
		this.y.span = this.wrapper.offsetHeight - 2 * this.offsetBorderH;
		this.positionOutline(this.x.min, this.y.min, this.x.span, this.y.span);
		
		// reposition overlays
		for (x in this.overlays) {
			hs.purge(this.overlays[x]);
			this.overlays[x].parentNode.removeChild(this.overlays[x]);
		}		
		if (hs.showCredits) this.writeCredits();
		this.createCustomOverlays();
		
		this.redoShowHide();
	
	} catch (e) {
		window.location.href = hs.expanders[this.key].content.src;
	}
};

// on end move and resize
HsExpander.prototype.redoShowHide = function() {
	var imgPos = {
		x: parseInt(this.wrapper.style.left) - 20, 
		y: parseInt(this.wrapper.style.top) - 20, 
		w: this.content.offsetWidth + 40, 
		h: this.content.offsetHeight + 40 + this.spaceForCaption
	};
	if (hs.hideSelects) this.showHideElements('SELECT', 'hidden', imgPos);
	if (hs.hideIframes) this.showHideElements('IFRAME', 'hidden', imgPos);

};

// set handlers
hs.addEventListener(document, 'mousedown', hs.mouseClickHandler);
hs.addEventListener(document, 'mouseup', hs.mouseClickHandler);
hs.addEventListener(window, 'load', hs.preloadImages);