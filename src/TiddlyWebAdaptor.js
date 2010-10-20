/***
|''Name''|TiddlyWebAdaptor|
|''Description''|adaptor for interacting with TiddlyWeb|
|''Author''|FND|
|''Version''|2.0.0dev|
|''Status''|@@experimental@@|
|''Source''|http://github.com/tiddlyweb/tiddlywebwiki/raw/master/src/TiddlyWebAdaptor.js|
|''CodeRepository''|http://github.com/tiddlyweb/tiddlywebwiki|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
|''CoreVersion''|2.6.1|
|''Requires''|chrjs jquery-json|
|''Keywords''|serverSide TiddlyWeb|
!Notes
This plugin requires [[chrjs|http://github.com/tiddlyweb/chrjs]] and thus also [[jQuery JSON|http://code.google.com/p/jquery-json/]].
!Code
***/
//{{{
(function($) {

if(!window.tiddlyweb) {
	throw "Missing dependency: chrjs";
}
if(!jQuery.toJSON) {
	throw "Missing dependency: jquery-json";
}

var adaptor = config.adaptors.tiddlyweb = function() {};
adaptor.prototype = new AdaptorBase();

adaptor.serverType = "tiddlyweb";
adaptor.serverLabel = "TiddlyWeb";

// All request methods accept a context object, which by default requires
// members host and workspace, and return the XHR object.
// context.host is the reduced host name (cf. minHostName)
// context.workspace is a string of the form "<bags|recipes>/<name>"
//
// Callbacks are passed an augmented context object (providing additional
// members status, statusText and httpStatus, plus expanded host) as well as the
// optional userParams object passed into the request method.

// retrieve a list of tiddlers
// results are provided to callback via context.tiddlers
adaptor.prototype.getTiddlerList = function(context, userParams, callback) {
	context = this.setContext(context, userParams, callback);
	var container = resolveWorkspace(context.workspace);
	var cls = tiddlyweb._capitalize(container.type);
	container = new tiddlyweb[cls](container.name, context.host);
	// XXX: hiding callbacks in closures is bad!?
	var _callback = function(tids, status, xhr) {
		context.tiddlers = $.map(tids, function(tid, i) {
			return adaptor.toTiddler(tid, context.host);
		});
		finalize(context, true, xhr);
	};
	var errback = function(xhr, error, exc) {
		finalize(context, false, xhr);
	};
	return container.tiddlers().get(_callback, errback); // XXX: !!! lacks enhanced privileges for HTTP requests off file: URI
};

// retrieve a list of revisions for a given tiddler
// results are provided to callback via context.revisions
adaptor.prototype.getTiddlerRevisionList = function(title, limit, context, userParams, callback) {
	context = this.setContext(context, userParams, callback);
	var tid = new tiddlyweb.Tiddler(title);
	var container = resolveWorkspace(context.workspace);
	var cls = tiddlyweb._capitalize(container.type);
	tid[container.type] = new tiddlyweb[cls](container.name, context.host);
	// XXX: hiding callbacks in closures is bad!?
	var _callback = function(tids, status, xhr) { // XXX: DRY; cf. getTiddlerList
		context.revisions = $.map(tids, function(tid, i) { // XXX: should be context.tiddlers?
			return adaptor.toTiddler(tid, context.host);
		});
		finalize(context, true, xhr);
	};
	var errback = function(xhr, error, exc) {
		finalize(context, false, xhr);
	};
	return tid.revisions().get(_callback, errback); // XXX: !!! lacks enhanced privileges for HTTP requests off file: URI
};

// retrieve an individual tiddler
// results are provided to callback via context.tiddler
adaptor.prototype.getTiddler = function(title, context, userParams, callback) {
	context = this.setContext(context, userParams, callback);
	var tid = new tiddlyweb.Tiddler(title);
	var container = resolveWorkspace(context.workspace);
	var cls = tiddlyweb._capitalize(container.type);
	tid[container.type] = new tiddlyweb[cls](container.name, context.host);
	// XXX: hiding callbacks in closures is bad!?
	var _callback = function(tid, status, xhr) {
		context.tiddler = adaptor.toTiddler(tid, context.host);
		finalize(context, true, xhr);
	};
	var errback = function(xhr, error, exc) {
		finalize(context, false, xhr);
	};
	return tid.get(_callback, errback); // XXX: !!! lacks enhanced privileges for HTTP requests off file: URI
};

// retrieve current status (requires TiddlyWeb status plugin)
// context.workspace is not required
adaptor.prototype.getStatus = function(context, userParams, callback) { // XXX: unnecessary; nothing TiddlyWiki-specific
	context = this.setContext(context, userParams, callback);
	return ajaxReq({
		url: context.host + "/status",
		type: "GET",
		dataType: "json",
		// XXX: hiding callbacks in closures is bad!?
		success: function(data, status, xhr) {
			context.serverStatus = data;
			finalize(context, true, xhr);
		},
		error: function(xhr, error, exc) {
			finalize(context, false, xhr);
		}
	});
};

// create Tiddler instance from chrjs tiddler
adaptor.toTiddler = function(tid, host) {
	tid.fields["server.type"] = adaptor.serverType;
	tid.fields["server.host"] = AdaptorBase.minHostName(host);
	tid.fields["server.bag"] = tid.bag.name;
	if(tid.recipe) {
		tid.fields["server.recipe"] = tid.recipe.name;
	}
	tid.fields["server.workspace"] = "bags/" + tid.bag.name;
	if(tid.type && tid.type != "None") {
		tid.fields["server.page.content-type"] = tid.type;
		tid.fields["server.content-type"] = tid.type; // XXX: !!! deprecated; retained for backwards-compatibility
	}
	tid.fields["server.page.title"] = tid.title;
	tid.fields["server.title"] = tid.title; // XXX: !!! deprecated; retained for backwards-compatibility
	tid.fields["server.page.permissions"] = tid.permissions.join(", ");
	tid.fields["server.permissions"] = tid.fields["server.page.permissions"]; // XXX: !!! deprecated; retained for backwards-compatibility
	tid.fields["server.page.revision"] = tid.revision;
	var tiddler = new Tiddler(tid.title);
	tiddler.assign(tiddler.title, tid.text, tid.modifier, tid.modified,
		tid.tags, tid.created, tid.fields, tid.creator);
	return tiddler;
};

// trigger callback with canonical context
var finalize = function(context, status, xhr) { // XXX: rename?
	context.status = status;
	context.statusText = xhr.statusText; // XXX: not required!?
	context.httpStatus = xhr.status; // XXX: not required!?
	if(context.callback) {
		context.callback(context, context.userParams);
	}
};

};

// determine container (bag/recipe) based on workspace
var resolveWorkspace = function(workspace) {
	var arr = workspace.split("/");
	return {
		type: arr[0] == "bags" ? "bag" : "recipe",
		name: arr[1]
	};
};

})(jQuery);
//}}}
