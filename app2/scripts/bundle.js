(function (factory) {
    typeof define === 'function' && define.amd ? define('index', factory) :
    factory();
}((function () { 'use strict';

    /*!
     * @copyright Copyright (c) 2017 IcoMoon.io
     * @license   Licensed under MIT license
     *            See https://github.com/Keyamoon/svgxuse
     * @version   1.2.6
     */
    /*jslint browser: true */
    /*global XDomainRequest, MutationObserver, window */
    (function () {
        if (typeof window !== "undefined" && window.addEventListener) {
            var cache = Object.create(null); // holds xhr objects to prevent multiple requests
            var checkUseElems;
            var tid; // timeout id
            var debouncedCheck = function () {
                clearTimeout(tid);
                tid = setTimeout(checkUseElems, 100);
            };
            var unobserveChanges = function () {
                return;
            };
            var observeChanges = function () {
                var observer;
                window.addEventListener("resize", debouncedCheck, false);
                window.addEventListener("orientationchange", debouncedCheck, false);
                if (window.MutationObserver) {
                    observer = new MutationObserver(debouncedCheck);
                    observer.observe(document.documentElement, {
                        childList: true,
                        subtree: true,
                        attributes: true
                    });
                    unobserveChanges = function () {
                        try {
                            observer.disconnect();
                            window.removeEventListener("resize", debouncedCheck, false);
                            window.removeEventListener("orientationchange", debouncedCheck, false);
                        } catch (ignore) {}
                    };
                } else {
                    document.documentElement.addEventListener("DOMSubtreeModified", debouncedCheck, false);
                    unobserveChanges = function () {
                        document.documentElement.removeEventListener("DOMSubtreeModified", debouncedCheck, false);
                        window.removeEventListener("resize", debouncedCheck, false);
                        window.removeEventListener("orientationchange", debouncedCheck, false);
                    };
                }
            };
            var createRequest = function (url) {
                // In IE 9, cross origin requests can only be sent using XDomainRequest.
                // XDomainRequest would fail if CORS headers are not set.
                // Therefore, XDomainRequest should only be used with cross origin requests.
                function getOrigin(loc) {
                    var a;
                    if (loc.protocol !== undefined) {
                        a = loc;
                    } else {
                        a = document.createElement("a");
                        a.href = loc;
                    }
                    return a.protocol.replace(/:/g, "") + a.host;
                }
                var Request;
                var origin;
                var origin2;
                if (window.XMLHttpRequest) {
                    Request = new XMLHttpRequest();
                    origin = getOrigin(location);
                    origin2 = getOrigin(url);
                    if (Request.withCredentials === undefined && origin2 !== "" && origin2 !== origin) {
                        Request = XDomainRequest || undefined;
                    } else {
                        Request = XMLHttpRequest;
                    }
                }
                return Request;
            };
            var xlinkNS = "http://www.w3.org/1999/xlink";
            checkUseElems = function () {
                var base;
                var bcr;
                var hash;
                var href;
                var i;
                var inProgressCount = 0;
                var isHidden;
                var Request;
                var url;
                var uses;
                var xhr;
                function observeIfDone() {
                    // If done with making changes, start watching for chagnes in DOM again
                    inProgressCount -= 1;
                    if (inProgressCount === 0) { // if all xhrs were resolved
                        unobserveChanges(); // make sure to remove old handlers
                        observeChanges(); // watch for changes to DOM
                    }
                }
                function attrUpdateFunc(spec) {
                    return function () {
                        if (cache[spec.base] !== true) {
                            spec.useEl.setAttributeNS(xlinkNS, "xlink:href", "#" + spec.hash);
                            if (spec.useEl.hasAttribute("href")) {
                                spec.useEl.setAttribute("href", "#" + spec.hash);
                            }
                        }
                    };
                }
                function onloadFunc(xhr) {
                    return function () {
                        var body = document.body;
                        var x = document.createElement("x");
                        var svg;
                        xhr.onload = null;
                        x.innerHTML = xhr.responseText;
                        svg = x.getElementsByTagName("svg")[0];
                        if (svg) {
                            svg.setAttribute("aria-hidden", "true");
                            svg.style.position = "absolute";
                            svg.style.width = 0;
                            svg.style.height = 0;
                            svg.style.overflow = "hidden";
                            body.insertBefore(svg, body.firstChild);
                        }
                        observeIfDone();
                    };
                }
                function onErrorTimeout(xhr) {
                    return function () {
                        xhr.onerror = null;
                        xhr.ontimeout = null;
                        observeIfDone();
                    };
                }
                unobserveChanges(); // stop watching for changes to DOM
                // find all use elements
                uses = document.getElementsByTagName("use");
                for (i = 0; i < uses.length; i += 1) {
                    try {
                        bcr = uses[i].getBoundingClientRect();
                    } catch (ignore) {
                        // failed to get bounding rectangle of the use element
                        bcr = false;
                    }
                    href = uses[i].getAttribute("href")
                            || uses[i].getAttributeNS(xlinkNS, "href")
                            || uses[i].getAttribute("xlink:href");
                    if (href && href.split) {
                        url = href.split("#");
                    } else {
                        url = ["", ""];
                    }
                    base = url[0];
                    hash = url[1];
                    isHidden = bcr && bcr.left === 0 && bcr.right === 0 && bcr.top === 0 && bcr.bottom === 0;
                    if (bcr && bcr.width === 0 && bcr.height === 0 && !isHidden) {
                        if (uses[i].hasAttribute("href")) {
                            uses[i].setAttributeNS(xlinkNS, "xlink:href", href);
                        }
                        if (base.length) {
                            // schedule updating xlink:href
                            xhr = cache[base];
                            if (xhr !== true) {
                                // true signifies that prepending the SVG was not required
                                setTimeout(attrUpdateFunc({
                                    useEl: uses[i],
                                    base: base,
                                    hash: hash
                                }), 0);
                            }
                            if (xhr === undefined) {
                                Request = createRequest(base);
                                if (Request !== undefined) {
                                    xhr = new Request();
                                    cache[base] = xhr;
                                    xhr.onload = onloadFunc(xhr);
                                    xhr.onerror = onErrorTimeout(xhr);
                                    xhr.ontimeout = onErrorTimeout(xhr);
                                    xhr.open("GET", base);
                                    xhr.send();
                                    inProgressCount += 1;
                                }
                            }
                        }
                    } else {
                        if (!isHidden) {
                            if (cache[base] === undefined) {
                                // remember this URL if the use element was not empty and no request was sent
                                cache[base] = true;
                            } else if (cache[base].onload) {
                                // if it turns out that prepending the SVG is not necessary,
                                // abort the in-progress xhr.
                                cache[base].abort();
                                delete cache[base].onload;
                                cache[base] = true;
                            }
                        } else if (base.length && cache[base]) {
                            setTimeout(attrUpdateFunc({
                                useEl: uses[i],
                                base: base,
                                hash: hash
                            }), 0);
                        }
                    }
                }
                uses = "";
                inProgressCount += 1;
                observeIfDone();
            };
            var winLoad;
            winLoad = function () {
                window.removeEventListener("load", winLoad, false); // to prevent memory leaks
                tid = setTimeout(checkUseElems, 0);
            };
            if (document.readyState !== "complete") {
                // The load event fires when all resources have finished loading, which allows detecting whether SVG use elements are empty.
                window.addEventListener("load", winLoad, false);
            } else {
                // No need to add a listener if the document is already loaded, initialize immediately.
                winLoad();
            }
        }
    }());

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var jquery = createCommonjsModule(function (module) {
    /*!
     * jQuery JavaScript Library v3.4.1
     * https://jquery.com/
     *
     * Includes Sizzle.js
     * https://sizzlejs.com/
     *
     * Copyright JS Foundation and other contributors
     * Released under the MIT license
     * https://jquery.org/license
     *
     * Date: 2019-05-01T21:04Z
     */
    ( function( global, factory ) {

    	{

    		// For CommonJS and CommonJS-like environments where a proper `window`
    		// is present, execute the factory and get jQuery.
    		// For environments that do not have a `window` with a `document`
    		// (such as Node.js), expose a factory as module.exports.
    		// This accentuates the need for the creation of a real `window`.
    		// e.g. var jQuery = require("jquery")(window);
    		// See ticket #14549 for more info.
    		module.exports = global.document ?
    			factory( global, true ) :
    			function( w ) {
    				if ( !w.document ) {
    					throw new Error( "jQuery requires a window with a document" );
    				}
    				return factory( w );
    			};
    	}

    // Pass this if window is not defined yet
    } )( typeof window !== "undefined" ? window : commonjsGlobal, function( window, noGlobal ) {

    var arr = [];

    var document = window.document;

    var getProto = Object.getPrototypeOf;

    var slice = arr.slice;

    var concat = arr.concat;

    var push = arr.push;

    var indexOf = arr.indexOf;

    var class2type = {};

    var toString = class2type.toString;

    var hasOwn = class2type.hasOwnProperty;

    var fnToString = hasOwn.toString;

    var ObjectFunctionString = fnToString.call( Object );

    var support = {};

    var isFunction = function isFunction( obj ) {

          // Support: Chrome <=57, Firefox <=52
          // In some browsers, typeof returns "function" for HTML <object> elements
          // (i.e., `typeof document.createElement( "object" ) === "function"`).
          // We don't want to classify *any* DOM node as a function.
          return typeof obj === "function" && typeof obj.nodeType !== "number";
      };


    var isWindow = function isWindow( obj ) {
    		return obj != null && obj === obj.window;
    	};




    	var preservedScriptAttributes = {
    		type: true,
    		src: true,
    		nonce: true,
    		noModule: true
    	};

    	function DOMEval( code, node, doc ) {
    		doc = doc || document;

    		var i, val,
    			script = doc.createElement( "script" );

    		script.text = code;
    		if ( node ) {
    			for ( i in preservedScriptAttributes ) {

    				// Support: Firefox 64+, Edge 18+
    				// Some browsers don't support the "nonce" property on scripts.
    				// On the other hand, just using `getAttribute` is not enough as
    				// the `nonce` attribute is reset to an empty string whenever it
    				// becomes browsing-context connected.
    				// See https://github.com/whatwg/html/issues/2369
    				// See https://html.spec.whatwg.org/#nonce-attributes
    				// The `node.getAttribute` check was added for the sake of
    				// `jQuery.globalEval` so that it can fake a nonce-containing node
    				// via an object.
    				val = node[ i ] || node.getAttribute && node.getAttribute( i );
    				if ( val ) {
    					script.setAttribute( i, val );
    				}
    			}
    		}
    		doc.head.appendChild( script ).parentNode.removeChild( script );
    	}


    function toType( obj ) {
    	if ( obj == null ) {
    		return obj + "";
    	}

    	// Support: Android <=2.3 only (functionish RegExp)
    	return typeof obj === "object" || typeof obj === "function" ?
    		class2type[ toString.call( obj ) ] || "object" :
    		typeof obj;
    }
    /* global Symbol */
    // Defining this global in .eslintrc.json would create a danger of using the global
    // unguarded in another place, it seems safer to define global only for this module



    var
    	version = "3.4.1",

    	// Define a local copy of jQuery
    	jQuery = function( selector, context ) {

    		// The jQuery object is actually just the init constructor 'enhanced'
    		// Need init if jQuery is called (just allow error to be thrown if not included)
    		return new jQuery.fn.init( selector, context );
    	},

    	// Support: Android <=4.0 only
    	// Make sure we trim BOM and NBSP
    	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;

    jQuery.fn = jQuery.prototype = {

    	// The current version of jQuery being used
    	jquery: version,

    	constructor: jQuery,

    	// The default length of a jQuery object is 0
    	length: 0,

    	toArray: function() {
    		return slice.call( this );
    	},

    	// Get the Nth element in the matched element set OR
    	// Get the whole matched element set as a clean array
    	get: function( num ) {

    		// Return all the elements in a clean array
    		if ( num == null ) {
    			return slice.call( this );
    		}

    		// Return just the one element from the set
    		return num < 0 ? this[ num + this.length ] : this[ num ];
    	},

    	// Take an array of elements and push it onto the stack
    	// (returning the new matched element set)
    	pushStack: function( elems ) {

    		// Build a new jQuery matched element set
    		var ret = jQuery.merge( this.constructor(), elems );

    		// Add the old object onto the stack (as a reference)
    		ret.prevObject = this;

    		// Return the newly-formed element set
    		return ret;
    	},

    	// Execute a callback for every element in the matched set.
    	each: function( callback ) {
    		return jQuery.each( this, callback );
    	},

    	map: function( callback ) {
    		return this.pushStack( jQuery.map( this, function( elem, i ) {
    			return callback.call( elem, i, elem );
    		} ) );
    	},

    	slice: function() {
    		return this.pushStack( slice.apply( this, arguments ) );
    	},

    	first: function() {
    		return this.eq( 0 );
    	},

    	last: function() {
    		return this.eq( -1 );
    	},

    	eq: function( i ) {
    		var len = this.length,
    			j = +i + ( i < 0 ? len : 0 );
    		return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
    	},

    	end: function() {
    		return this.prevObject || this.constructor();
    	},

    	// For internal use only.
    	// Behaves like an Array's method, not like a jQuery method.
    	push: push,
    	sort: arr.sort,
    	splice: arr.splice
    };

    jQuery.extend = jQuery.fn.extend = function() {
    	var options, name, src, copy, copyIsArray, clone,
    		target = arguments[ 0 ] || {},
    		i = 1,
    		length = arguments.length,
    		deep = false;

    	// Handle a deep copy situation
    	if ( typeof target === "boolean" ) {
    		deep = target;

    		// Skip the boolean and the target
    		target = arguments[ i ] || {};
    		i++;
    	}

    	// Handle case when target is a string or something (possible in deep copy)
    	if ( typeof target !== "object" && !isFunction( target ) ) {
    		target = {};
    	}

    	// Extend jQuery itself if only one argument is passed
    	if ( i === length ) {
    		target = this;
    		i--;
    	}

    	for ( ; i < length; i++ ) {

    		// Only deal with non-null/undefined values
    		if ( ( options = arguments[ i ] ) != null ) {

    			// Extend the base object
    			for ( name in options ) {
    				copy = options[ name ];

    				// Prevent Object.prototype pollution
    				// Prevent never-ending loop
    				if ( name === "__proto__" || target === copy ) {
    					continue;
    				}

    				// Recurse if we're merging plain objects or arrays
    				if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
    					( copyIsArray = Array.isArray( copy ) ) ) ) {
    					src = target[ name ];

    					// Ensure proper type for the source value
    					if ( copyIsArray && !Array.isArray( src ) ) {
    						clone = [];
    					} else if ( !copyIsArray && !jQuery.isPlainObject( src ) ) {
    						clone = {};
    					} else {
    						clone = src;
    					}
    					copyIsArray = false;

    					// Never move original objects, clone them
    					target[ name ] = jQuery.extend( deep, clone, copy );

    				// Don't bring in undefined values
    				} else if ( copy !== undefined ) {
    					target[ name ] = copy;
    				}
    			}
    		}
    	}

    	// Return the modified object
    	return target;
    };

    jQuery.extend( {

    	// Unique for each copy of jQuery on the page
    	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

    	// Assume jQuery is ready without the ready module
    	isReady: true,

    	error: function( msg ) {
    		throw new Error( msg );
    	},

    	noop: function() {},

    	isPlainObject: function( obj ) {
    		var proto, Ctor;

    		// Detect obvious negatives
    		// Use toString instead of jQuery.type to catch host objects
    		if ( !obj || toString.call( obj ) !== "[object Object]" ) {
    			return false;
    		}

    		proto = getProto( obj );

    		// Objects with no prototype (e.g., `Object.create( null )`) are plain
    		if ( !proto ) {
    			return true;
    		}

    		// Objects with prototype are plain iff they were constructed by a global Object function
    		Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;
    		return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
    	},

    	isEmptyObject: function( obj ) {
    		var name;

    		for ( name in obj ) {
    			return false;
    		}
    		return true;
    	},

    	// Evaluates a script in a global context
    	globalEval: function( code, options ) {
    		DOMEval( code, { nonce: options && options.nonce } );
    	},

    	each: function( obj, callback ) {
    		var length, i = 0;

    		if ( isArrayLike( obj ) ) {
    			length = obj.length;
    			for ( ; i < length; i++ ) {
    				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
    					break;
    				}
    			}
    		} else {
    			for ( i in obj ) {
    				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
    					break;
    				}
    			}
    		}

    		return obj;
    	},

    	// Support: Android <=4.0 only
    	trim: function( text ) {
    		return text == null ?
    			"" :
    			( text + "" ).replace( rtrim, "" );
    	},

    	// results is for internal usage only
    	makeArray: function( arr, results ) {
    		var ret = results || [];

    		if ( arr != null ) {
    			if ( isArrayLike( Object( arr ) ) ) {
    				jQuery.merge( ret,
    					typeof arr === "string" ?
    					[ arr ] : arr
    				);
    			} else {
    				push.call( ret, arr );
    			}
    		}

    		return ret;
    	},

    	inArray: function( elem, arr, i ) {
    		return arr == null ? -1 : indexOf.call( arr, elem, i );
    	},

    	// Support: Android <=4.0 only, PhantomJS 1 only
    	// push.apply(_, arraylike) throws on ancient WebKit
    	merge: function( first, second ) {
    		var len = +second.length,
    			j = 0,
    			i = first.length;

    		for ( ; j < len; j++ ) {
    			first[ i++ ] = second[ j ];
    		}

    		first.length = i;

    		return first;
    	},

    	grep: function( elems, callback, invert ) {
    		var callbackInverse,
    			matches = [],
    			i = 0,
    			length = elems.length,
    			callbackExpect = !invert;

    		// Go through the array, only saving the items
    		// that pass the validator function
    		for ( ; i < length; i++ ) {
    			callbackInverse = !callback( elems[ i ], i );
    			if ( callbackInverse !== callbackExpect ) {
    				matches.push( elems[ i ] );
    			}
    		}

    		return matches;
    	},

    	// arg is for internal usage only
    	map: function( elems, callback, arg ) {
    		var length, value,
    			i = 0,
    			ret = [];

    		// Go through the array, translating each of the items to their new values
    		if ( isArrayLike( elems ) ) {
    			length = elems.length;
    			for ( ; i < length; i++ ) {
    				value = callback( elems[ i ], i, arg );

    				if ( value != null ) {
    					ret.push( value );
    				}
    			}

    		// Go through every key on the object,
    		} else {
    			for ( i in elems ) {
    				value = callback( elems[ i ], i, arg );

    				if ( value != null ) {
    					ret.push( value );
    				}
    			}
    		}

    		// Flatten any nested arrays
    		return concat.apply( [], ret );
    	},

    	// A global GUID counter for objects
    	guid: 1,

    	// jQuery.support is not used in Core but other projects attach their
    	// properties to it so it needs to exist.
    	support: support
    } );

    if ( typeof Symbol === "function" ) {
    	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
    }

    // Populate the class2type map
    jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
    function( i, name ) {
    	class2type[ "[object " + name + "]" ] = name.toLowerCase();
    } );

    function isArrayLike( obj ) {

    	// Support: real iOS 8.2 only (not reproducible in simulator)
    	// `in` check used to prevent JIT error (gh-2145)
    	// hasOwn isn't used here due to false negatives
    	// regarding Nodelist length in IE
    	var length = !!obj && "length" in obj && obj.length,
    		type = toType( obj );

    	if ( isFunction( obj ) || isWindow( obj ) ) {
    		return false;
    	}

    	return type === "array" || length === 0 ||
    		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
    }
    var Sizzle =
    /*!
     * Sizzle CSS Selector Engine v2.3.4
     * https://sizzlejs.com/
     *
     * Copyright JS Foundation and other contributors
     * Released under the MIT license
     * https://js.foundation/
     *
     * Date: 2019-04-08
     */
    (function( window ) {

    var i,
    	support,
    	Expr,
    	getText,
    	isXML,
    	tokenize,
    	compile,
    	select,
    	outermostContext,
    	sortInput,
    	hasDuplicate,

    	// Local document vars
    	setDocument,
    	document,
    	docElem,
    	documentIsHTML,
    	rbuggyQSA,
    	rbuggyMatches,
    	matches,
    	contains,

    	// Instance-specific data
    	expando = "sizzle" + 1 * new Date(),
    	preferredDoc = window.document,
    	dirruns = 0,
    	done = 0,
    	classCache = createCache(),
    	tokenCache = createCache(),
    	compilerCache = createCache(),
    	nonnativeSelectorCache = createCache(),
    	sortOrder = function( a, b ) {
    		if ( a === b ) {
    			hasDuplicate = true;
    		}
    		return 0;
    	},

    	// Instance methods
    	hasOwn = ({}).hasOwnProperty,
    	arr = [],
    	pop = arr.pop,
    	push_native = arr.push,
    	push = arr.push,
    	slice = arr.slice,
    	// Use a stripped-down indexOf as it's faster than native
    	// https://jsperf.com/thor-indexof-vs-for/5
    	indexOf = function( list, elem ) {
    		var i = 0,
    			len = list.length;
    		for ( ; i < len; i++ ) {
    			if ( list[i] === elem ) {
    				return i;
    			}
    		}
    		return -1;
    	},

    	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

    	// Regular expressions

    	// http://www.w3.org/TR/css3-selectors/#whitespace
    	whitespace = "[\\x20\\t\\r\\n\\f]",

    	// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
    	identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",

    	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
    	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
    		// Operator (capture 2)
    		"*([*^$|!~]?=)" + whitespace +
    		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
    		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
    		"*\\]",

    	pseudos = ":(" + identifier + ")(?:\\((" +
    		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
    		// 1. quoted (capture 3; capture 4 or capture 5)
    		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
    		// 2. simple (capture 6)
    		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
    		// 3. anything else (capture 2)
    		".*" +
    		")\\)|)",

    	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
    	rwhitespace = new RegExp( whitespace + "+", "g" ),
    	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

    	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
    	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),
    	rdescend = new RegExp( whitespace + "|>" ),

    	rpseudo = new RegExp( pseudos ),
    	ridentifier = new RegExp( "^" + identifier + "$" ),

    	matchExpr = {
    		"ID": new RegExp( "^#(" + identifier + ")" ),
    		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
    		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
    		"ATTR": new RegExp( "^" + attributes ),
    		"PSEUDO": new RegExp( "^" + pseudos ),
    		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
    			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
    			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
    		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
    		// For use in libraries implementing .is()
    		// We use this for POS matching in `select`
    		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
    			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
    	},

    	rhtml = /HTML$/i,
    	rinputs = /^(?:input|select|textarea|button)$/i,
    	rheader = /^h\d$/i,

    	rnative = /^[^{]+\{\s*\[native \w/,

    	// Easily-parseable/retrievable ID or TAG or CLASS selectors
    	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

    	rsibling = /[+~]/,

    	// CSS escapes
    	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
    	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
    	funescape = function( _, escaped, escapedWhitespace ) {
    		var high = "0x" + escaped - 0x10000;
    		// NaN means non-codepoint
    		// Support: Firefox<24
    		// Workaround erroneous numeric interpretation of +"0x"
    		return high !== high || escapedWhitespace ?
    			escaped :
    			high < 0 ?
    				// BMP codepoint
    				String.fromCharCode( high + 0x10000 ) :
    				// Supplemental Plane codepoint (surrogate pair)
    				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
    	},

    	// CSS string/identifier serialization
    	// https://drafts.csswg.org/cssom/#common-serializing-idioms
    	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
    	fcssescape = function( ch, asCodePoint ) {
    		if ( asCodePoint ) {

    			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
    			if ( ch === "\0" ) {
    				return "\uFFFD";
    			}

    			// Control characters and (dependent upon position) numbers get escaped as code points
    			return ch.slice( 0, -1 ) + "\\" + ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
    		}

    		// Other potentially-special ASCII characters get backslash-escaped
    		return "\\" + ch;
    	},

    	// Used for iframes
    	// See setDocument()
    	// Removing the function wrapper causes a "Permission Denied"
    	// error in IE
    	unloadHandler = function() {
    		setDocument();
    	},

    	inDisabledFieldset = addCombinator(
    		function( elem ) {
    			return elem.disabled === true && elem.nodeName.toLowerCase() === "fieldset";
    		},
    		{ dir: "parentNode", next: "legend" }
    	);

    // Optimize for push.apply( _, NodeList )
    try {
    	push.apply(
    		(arr = slice.call( preferredDoc.childNodes )),
    		preferredDoc.childNodes
    	);
    	// Support: Android<4.0
    	// Detect silently failing push.apply
    	arr[ preferredDoc.childNodes.length ].nodeType;
    } catch ( e ) {
    	push = { apply: arr.length ?

    		// Leverage slice if possible
    		function( target, els ) {
    			push_native.apply( target, slice.call(els) );
    		} :

    		// Support: IE<9
    		// Otherwise append directly
    		function( target, els ) {
    			var j = target.length,
    				i = 0;
    			// Can't trust NodeList.length
    			while ( (target[j++] = els[i++]) ) {}
    			target.length = j - 1;
    		}
    	};
    }

    function Sizzle( selector, context, results, seed ) {
    	var m, i, elem, nid, match, groups, newSelector,
    		newContext = context && context.ownerDocument,

    		// nodeType defaults to 9, since context defaults to document
    		nodeType = context ? context.nodeType : 9;

    	results = results || [];

    	// Return early from calls with invalid selector or context
    	if ( typeof selector !== "string" || !selector ||
    		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

    		return results;
    	}

    	// Try to shortcut find operations (as opposed to filters) in HTML documents
    	if ( !seed ) {

    		if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
    			setDocument( context );
    		}
    		context = context || document;

    		if ( documentIsHTML ) {

    			// If the selector is sufficiently simple, try using a "get*By*" DOM method
    			// (excepting DocumentFragment context, where the methods don't exist)
    			if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {

    				// ID selector
    				if ( (m = match[1]) ) {

    					// Document context
    					if ( nodeType === 9 ) {
    						if ( (elem = context.getElementById( m )) ) {

    							// Support: IE, Opera, Webkit
    							// TODO: identify versions
    							// getElementById can match elements by name instead of ID
    							if ( elem.id === m ) {
    								results.push( elem );
    								return results;
    							}
    						} else {
    							return results;
    						}

    					// Element context
    					} else {

    						// Support: IE, Opera, Webkit
    						// TODO: identify versions
    						// getElementById can match elements by name instead of ID
    						if ( newContext && (elem = newContext.getElementById( m )) &&
    							contains( context, elem ) &&
    							elem.id === m ) {

    							results.push( elem );
    							return results;
    						}
    					}

    				// Type selector
    				} else if ( match[2] ) {
    					push.apply( results, context.getElementsByTagName( selector ) );
    					return results;

    				// Class selector
    				} else if ( (m = match[3]) && support.getElementsByClassName &&
    					context.getElementsByClassName ) {

    					push.apply( results, context.getElementsByClassName( m ) );
    					return results;
    				}
    			}

    			// Take advantage of querySelectorAll
    			if ( support.qsa &&
    				!nonnativeSelectorCache[ selector + " " ] &&
    				(!rbuggyQSA || !rbuggyQSA.test( selector )) &&

    				// Support: IE 8 only
    				// Exclude object elements
    				(nodeType !== 1 || context.nodeName.toLowerCase() !== "object") ) {

    				newSelector = selector;
    				newContext = context;

    				// qSA considers elements outside a scoping root when evaluating child or
    				// descendant combinators, which is not what we want.
    				// In such cases, we work around the behavior by prefixing every selector in the
    				// list with an ID selector referencing the scope context.
    				// Thanks to Andrew Dupont for this technique.
    				if ( nodeType === 1 && rdescend.test( selector ) ) {

    					// Capture the context ID, setting it first if necessary
    					if ( (nid = context.getAttribute( "id" )) ) {
    						nid = nid.replace( rcssescape, fcssescape );
    					} else {
    						context.setAttribute( "id", (nid = expando) );
    					}

    					// Prefix every selector in the list
    					groups = tokenize( selector );
    					i = groups.length;
    					while ( i-- ) {
    						groups[i] = "#" + nid + " " + toSelector( groups[i] );
    					}
    					newSelector = groups.join( "," );

    					// Expand context for sibling selectors
    					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
    						context;
    				}

    				try {
    					push.apply( results,
    						newContext.querySelectorAll( newSelector )
    					);
    					return results;
    				} catch ( qsaError ) {
    					nonnativeSelectorCache( selector, true );
    				} finally {
    					if ( nid === expando ) {
    						context.removeAttribute( "id" );
    					}
    				}
    			}
    		}
    	}

    	// All others
    	return select( selector.replace( rtrim, "$1" ), context, results, seed );
    }

    /**
     * Create key-value caches of limited size
     * @returns {function(string, object)} Returns the Object data after storing it on itself with
     *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
     *	deleting the oldest entry
     */
    function createCache() {
    	var keys = [];

    	function cache( key, value ) {
    		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
    		if ( keys.push( key + " " ) > Expr.cacheLength ) {
    			// Only keep the most recent entries
    			delete cache[ keys.shift() ];
    		}
    		return (cache[ key + " " ] = value);
    	}
    	return cache;
    }

    /**
     * Mark a function for special use by Sizzle
     * @param {Function} fn The function to mark
     */
    function markFunction( fn ) {
    	fn[ expando ] = true;
    	return fn;
    }

    /**
     * Support testing using an element
     * @param {Function} fn Passed the created element and returns a boolean result
     */
    function assert( fn ) {
    	var el = document.createElement("fieldset");

    	try {
    		return !!fn( el );
    	} catch (e) {
    		return false;
    	} finally {
    		// Remove from its parent by default
    		if ( el.parentNode ) {
    			el.parentNode.removeChild( el );
    		}
    		// release memory in IE
    		el = null;
    	}
    }

    /**
     * Adds the same handler for all of the specified attrs
     * @param {String} attrs Pipe-separated list of attributes
     * @param {Function} handler The method that will be applied
     */
    function addHandle( attrs, handler ) {
    	var arr = attrs.split("|"),
    		i = arr.length;

    	while ( i-- ) {
    		Expr.attrHandle[ arr[i] ] = handler;
    	}
    }

    /**
     * Checks document order of two siblings
     * @param {Element} a
     * @param {Element} b
     * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
     */
    function siblingCheck( a, b ) {
    	var cur = b && a,
    		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
    			a.sourceIndex - b.sourceIndex;

    	// Use IE sourceIndex if available on both nodes
    	if ( diff ) {
    		return diff;
    	}

    	// Check if b follows a
    	if ( cur ) {
    		while ( (cur = cur.nextSibling) ) {
    			if ( cur === b ) {
    				return -1;
    			}
    		}
    	}

    	return a ? 1 : -1;
    }

    /**
     * Returns a function to use in pseudos for input types
     * @param {String} type
     */
    function createInputPseudo( type ) {
    	return function( elem ) {
    		var name = elem.nodeName.toLowerCase();
    		return name === "input" && elem.type === type;
    	};
    }

    /**
     * Returns a function to use in pseudos for buttons
     * @param {String} type
     */
    function createButtonPseudo( type ) {
    	return function( elem ) {
    		var name = elem.nodeName.toLowerCase();
    		return (name === "input" || name === "button") && elem.type === type;
    	};
    }

    /**
     * Returns a function to use in pseudos for :enabled/:disabled
     * @param {Boolean} disabled true for :disabled; false for :enabled
     */
    function createDisabledPseudo( disabled ) {

    	// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
    	return function( elem ) {

    		// Only certain elements can match :enabled or :disabled
    		// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
    		// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
    		if ( "form" in elem ) {

    			// Check for inherited disabledness on relevant non-disabled elements:
    			// * listed form-associated elements in a disabled fieldset
    			//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
    			//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
    			// * option elements in a disabled optgroup
    			//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
    			// All such elements have a "form" property.
    			if ( elem.parentNode && elem.disabled === false ) {

    				// Option elements defer to a parent optgroup if present
    				if ( "label" in elem ) {
    					if ( "label" in elem.parentNode ) {
    						return elem.parentNode.disabled === disabled;
    					} else {
    						return elem.disabled === disabled;
    					}
    				}

    				// Support: IE 6 - 11
    				// Use the isDisabled shortcut property to check for disabled fieldset ancestors
    				return elem.isDisabled === disabled ||

    					// Where there is no isDisabled, check manually
    					/* jshint -W018 */
    					elem.isDisabled !== !disabled &&
    						inDisabledFieldset( elem ) === disabled;
    			}

    			return elem.disabled === disabled;

    		// Try to winnow out elements that can't be disabled before trusting the disabled property.
    		// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
    		// even exist on them, let alone have a boolean value.
    		} else if ( "label" in elem ) {
    			return elem.disabled === disabled;
    		}

    		// Remaining elements are neither :enabled nor :disabled
    		return false;
    	};
    }

    /**
     * Returns a function to use in pseudos for positionals
     * @param {Function} fn
     */
    function createPositionalPseudo( fn ) {
    	return markFunction(function( argument ) {
    		argument = +argument;
    		return markFunction(function( seed, matches ) {
    			var j,
    				matchIndexes = fn( [], seed.length, argument ),
    				i = matchIndexes.length;

    			// Match elements found at the specified indexes
    			while ( i-- ) {
    				if ( seed[ (j = matchIndexes[i]) ] ) {
    					seed[j] = !(matches[j] = seed[j]);
    				}
    			}
    		});
    	});
    }

    /**
     * Checks a node for validity as a Sizzle context
     * @param {Element|Object=} context
     * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
     */
    function testContext( context ) {
    	return context && typeof context.getElementsByTagName !== "undefined" && context;
    }

    // Expose support vars for convenience
    support = Sizzle.support = {};

    /**
     * Detects XML nodes
     * @param {Element|Object} elem An element or a document
     * @returns {Boolean} True iff elem is a non-HTML XML node
     */
    isXML = Sizzle.isXML = function( elem ) {
    	var namespace = elem.namespaceURI,
    		docElem = (elem.ownerDocument || elem).documentElement;

    	// Support: IE <=8
    	// Assume HTML when documentElement doesn't yet exist, such as inside loading iframes
    	// https://bugs.jquery.com/ticket/4833
    	return !rhtml.test( namespace || docElem && docElem.nodeName || "HTML" );
    };

    /**
     * Sets document-related variables once based on the current document
     * @param {Element|Object} [doc] An element or document object to use to set the document
     * @returns {Object} Returns the current document
     */
    setDocument = Sizzle.setDocument = function( node ) {
    	var hasCompare, subWindow,
    		doc = node ? node.ownerDocument || node : preferredDoc;

    	// Return early if doc is invalid or already selected
    	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
    		return document;
    	}

    	// Update global variables
    	document = doc;
    	docElem = document.documentElement;
    	documentIsHTML = !isXML( document );

    	// Support: IE 9-11, Edge
    	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
    	if ( preferredDoc !== document &&
    		(subWindow = document.defaultView) && subWindow.top !== subWindow ) {

    		// Support: IE 11, Edge
    		if ( subWindow.addEventListener ) {
    			subWindow.addEventListener( "unload", unloadHandler, false );

    		// Support: IE 9 - 10 only
    		} else if ( subWindow.attachEvent ) {
    			subWindow.attachEvent( "onunload", unloadHandler );
    		}
    	}

    	/* Attributes
    	---------------------------------------------------------------------- */

    	// Support: IE<8
    	// Verify that getAttribute really returns attributes and not properties
    	// (excepting IE8 booleans)
    	support.attributes = assert(function( el ) {
    		el.className = "i";
    		return !el.getAttribute("className");
    	});

    	/* getElement(s)By*
    	---------------------------------------------------------------------- */

    	// Check if getElementsByTagName("*") returns only elements
    	support.getElementsByTagName = assert(function( el ) {
    		el.appendChild( document.createComment("") );
    		return !el.getElementsByTagName("*").length;
    	});

    	// Support: IE<9
    	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

    	// Support: IE<10
    	// Check if getElementById returns elements by name
    	// The broken getElementById methods don't pick up programmatically-set names,
    	// so use a roundabout getElementsByName test
    	support.getById = assert(function( el ) {
    		docElem.appendChild( el ).id = expando;
    		return !document.getElementsByName || !document.getElementsByName( expando ).length;
    	});

    	// ID filter and find
    	if ( support.getById ) {
    		Expr.filter["ID"] = function( id ) {
    			var attrId = id.replace( runescape, funescape );
    			return function( elem ) {
    				return elem.getAttribute("id") === attrId;
    			};
    		};
    		Expr.find["ID"] = function( id, context ) {
    			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
    				var elem = context.getElementById( id );
    				return elem ? [ elem ] : [];
    			}
    		};
    	} else {
    		Expr.filter["ID"] =  function( id ) {
    			var attrId = id.replace( runescape, funescape );
    			return function( elem ) {
    				var node = typeof elem.getAttributeNode !== "undefined" &&
    					elem.getAttributeNode("id");
    				return node && node.value === attrId;
    			};
    		};

    		// Support: IE 6 - 7 only
    		// getElementById is not reliable as a find shortcut
    		Expr.find["ID"] = function( id, context ) {
    			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
    				var node, i, elems,
    					elem = context.getElementById( id );

    				if ( elem ) {

    					// Verify the id attribute
    					node = elem.getAttributeNode("id");
    					if ( node && node.value === id ) {
    						return [ elem ];
    					}

    					// Fall back on getElementsByName
    					elems = context.getElementsByName( id );
    					i = 0;
    					while ( (elem = elems[i++]) ) {
    						node = elem.getAttributeNode("id");
    						if ( node && node.value === id ) {
    							return [ elem ];
    						}
    					}
    				}

    				return [];
    			}
    		};
    	}

    	// Tag
    	Expr.find["TAG"] = support.getElementsByTagName ?
    		function( tag, context ) {
    			if ( typeof context.getElementsByTagName !== "undefined" ) {
    				return context.getElementsByTagName( tag );

    			// DocumentFragment nodes don't have gEBTN
    			} else if ( support.qsa ) {
    				return context.querySelectorAll( tag );
    			}
    		} :

    		function( tag, context ) {
    			var elem,
    				tmp = [],
    				i = 0,
    				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
    				results = context.getElementsByTagName( tag );

    			// Filter out possible comments
    			if ( tag === "*" ) {
    				while ( (elem = results[i++]) ) {
    					if ( elem.nodeType === 1 ) {
    						tmp.push( elem );
    					}
    				}

    				return tmp;
    			}
    			return results;
    		};

    	// Class
    	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
    		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
    			return context.getElementsByClassName( className );
    		}
    	};

    	/* QSA/matchesSelector
    	---------------------------------------------------------------------- */

    	// QSA and matchesSelector support

    	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
    	rbuggyMatches = [];

    	// qSa(:focus) reports false when true (Chrome 21)
    	// We allow this because of a bug in IE8/9 that throws an error
    	// whenever `document.activeElement` is accessed on an iframe
    	// So, we allow :focus to pass through QSA all the time to avoid the IE error
    	// See https://bugs.jquery.com/ticket/13378
    	rbuggyQSA = [];

    	if ( (support.qsa = rnative.test( document.querySelectorAll )) ) {
    		// Build QSA regex
    		// Regex strategy adopted from Diego Perini
    		assert(function( el ) {
    			// Select is set to empty string on purpose
    			// This is to test IE's treatment of not explicitly
    			// setting a boolean content attribute,
    			// since its presence should be enough
    			// https://bugs.jquery.com/ticket/12359
    			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
    				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
    				"<option selected=''></option></select>";

    			// Support: IE8, Opera 11-12.16
    			// Nothing should be selected when empty strings follow ^= or $= or *=
    			// The test attribute must be unknown in Opera but "safe" for WinRT
    			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
    			if ( el.querySelectorAll("[msallowcapture^='']").length ) {
    				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
    			}

    			// Support: IE8
    			// Boolean attributes and "value" are not treated correctly
    			if ( !el.querySelectorAll("[selected]").length ) {
    				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
    			}

    			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
    			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
    				rbuggyQSA.push("~=");
    			}

    			// Webkit/Opera - :checked should return selected option elements
    			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
    			// IE8 throws error here and will not see later tests
    			if ( !el.querySelectorAll(":checked").length ) {
    				rbuggyQSA.push(":checked");
    			}

    			// Support: Safari 8+, iOS 8+
    			// https://bugs.webkit.org/show_bug.cgi?id=136851
    			// In-page `selector#id sibling-combinator selector` fails
    			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
    				rbuggyQSA.push(".#.+[+~]");
    			}
    		});

    		assert(function( el ) {
    			el.innerHTML = "<a href='' disabled='disabled'></a>" +
    				"<select disabled='disabled'><option/></select>";

    			// Support: Windows 8 Native Apps
    			// The type and name attributes are restricted during .innerHTML assignment
    			var input = document.createElement("input");
    			input.setAttribute( "type", "hidden" );
    			el.appendChild( input ).setAttribute( "name", "D" );

    			// Support: IE8
    			// Enforce case-sensitivity of name attribute
    			if ( el.querySelectorAll("[name=d]").length ) {
    				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
    			}

    			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
    			// IE8 throws error here and will not see later tests
    			if ( el.querySelectorAll(":enabled").length !== 2 ) {
    				rbuggyQSA.push( ":enabled", ":disabled" );
    			}

    			// Support: IE9-11+
    			// IE's :disabled selector does not pick up the children of disabled fieldsets
    			docElem.appendChild( el ).disabled = true;
    			if ( el.querySelectorAll(":disabled").length !== 2 ) {
    				rbuggyQSA.push( ":enabled", ":disabled" );
    			}

    			// Opera 10-11 does not throw on post-comma invalid pseudos
    			el.querySelectorAll("*,:x");
    			rbuggyQSA.push(",.*:");
    		});
    	}

    	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
    		docElem.webkitMatchesSelector ||
    		docElem.mozMatchesSelector ||
    		docElem.oMatchesSelector ||
    		docElem.msMatchesSelector) )) ) {

    		assert(function( el ) {
    			// Check to see if it's possible to do matchesSelector
    			// on a disconnected node (IE 9)
    			support.disconnectedMatch = matches.call( el, "*" );

    			// This should fail with an exception
    			// Gecko does not error, returns false instead
    			matches.call( el, "[s!='']:x" );
    			rbuggyMatches.push( "!=", pseudos );
    		});
    	}

    	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
    	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

    	/* Contains
    	---------------------------------------------------------------------- */
    	hasCompare = rnative.test( docElem.compareDocumentPosition );

    	// Element contains another
    	// Purposefully self-exclusive
    	// As in, an element does not contain itself
    	contains = hasCompare || rnative.test( docElem.contains ) ?
    		function( a, b ) {
    			var adown = a.nodeType === 9 ? a.documentElement : a,
    				bup = b && b.parentNode;
    			return a === bup || !!( bup && bup.nodeType === 1 && (
    				adown.contains ?
    					adown.contains( bup ) :
    					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
    			));
    		} :
    		function( a, b ) {
    			if ( b ) {
    				while ( (b = b.parentNode) ) {
    					if ( b === a ) {
    						return true;
    					}
    				}
    			}
    			return false;
    		};

    	/* Sorting
    	---------------------------------------------------------------------- */

    	// Document order sorting
    	sortOrder = hasCompare ?
    	function( a, b ) {

    		// Flag for duplicate removal
    		if ( a === b ) {
    			hasDuplicate = true;
    			return 0;
    		}

    		// Sort on method existence if only one input has compareDocumentPosition
    		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
    		if ( compare ) {
    			return compare;
    		}

    		// Calculate position if both inputs belong to the same document
    		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
    			a.compareDocumentPosition( b ) :

    			// Otherwise we know they are disconnected
    			1;

    		// Disconnected nodes
    		if ( compare & 1 ||
    			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

    			// Choose the first element that is related to our preferred document
    			if ( a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
    				return -1;
    			}
    			if ( b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
    				return 1;
    			}

    			// Maintain original order
    			return sortInput ?
    				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
    				0;
    		}

    		return compare & 4 ? -1 : 1;
    	} :
    	function( a, b ) {
    		// Exit early if the nodes are identical
    		if ( a === b ) {
    			hasDuplicate = true;
    			return 0;
    		}

    		var cur,
    			i = 0,
    			aup = a.parentNode,
    			bup = b.parentNode,
    			ap = [ a ],
    			bp = [ b ];

    		// Parentless nodes are either documents or disconnected
    		if ( !aup || !bup ) {
    			return a === document ? -1 :
    				b === document ? 1 :
    				aup ? -1 :
    				bup ? 1 :
    				sortInput ?
    				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
    				0;

    		// If the nodes are siblings, we can do a quick check
    		} else if ( aup === bup ) {
    			return siblingCheck( a, b );
    		}

    		// Otherwise we need full lists of their ancestors for comparison
    		cur = a;
    		while ( (cur = cur.parentNode) ) {
    			ap.unshift( cur );
    		}
    		cur = b;
    		while ( (cur = cur.parentNode) ) {
    			bp.unshift( cur );
    		}

    		// Walk down the tree looking for a discrepancy
    		while ( ap[i] === bp[i] ) {
    			i++;
    		}

    		return i ?
    			// Do a sibling check if the nodes have a common ancestor
    			siblingCheck( ap[i], bp[i] ) :

    			// Otherwise nodes in our document sort first
    			ap[i] === preferredDoc ? -1 :
    			bp[i] === preferredDoc ? 1 :
    			0;
    	};

    	return document;
    };

    Sizzle.matches = function( expr, elements ) {
    	return Sizzle( expr, null, null, elements );
    };

    Sizzle.matchesSelector = function( elem, expr ) {
    	// Set document vars if needed
    	if ( ( elem.ownerDocument || elem ) !== document ) {
    		setDocument( elem );
    	}

    	if ( support.matchesSelector && documentIsHTML &&
    		!nonnativeSelectorCache[ expr + " " ] &&
    		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
    		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

    		try {
    			var ret = matches.call( elem, expr );

    			// IE 9's matchesSelector returns false on disconnected nodes
    			if ( ret || support.disconnectedMatch ||
    					// As well, disconnected nodes are said to be in a document
    					// fragment in IE 9
    					elem.document && elem.document.nodeType !== 11 ) {
    				return ret;
    			}
    		} catch (e) {
    			nonnativeSelectorCache( expr, true );
    		}
    	}

    	return Sizzle( expr, document, null, [ elem ] ).length > 0;
    };

    Sizzle.contains = function( context, elem ) {
    	// Set document vars if needed
    	if ( ( context.ownerDocument || context ) !== document ) {
    		setDocument( context );
    	}
    	return contains( context, elem );
    };

    Sizzle.attr = function( elem, name ) {
    	// Set document vars if needed
    	if ( ( elem.ownerDocument || elem ) !== document ) {
    		setDocument( elem );
    	}

    	var fn = Expr.attrHandle[ name.toLowerCase() ],
    		// Don't get fooled by Object.prototype properties (jQuery #13807)
    		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
    			fn( elem, name, !documentIsHTML ) :
    			undefined;

    	return val !== undefined ?
    		val :
    		support.attributes || !documentIsHTML ?
    			elem.getAttribute( name ) :
    			(val = elem.getAttributeNode(name)) && val.specified ?
    				val.value :
    				null;
    };

    Sizzle.escape = function( sel ) {
    	return (sel + "").replace( rcssescape, fcssescape );
    };

    Sizzle.error = function( msg ) {
    	throw new Error( "Syntax error, unrecognized expression: " + msg );
    };

    /**
     * Document sorting and removing duplicates
     * @param {ArrayLike} results
     */
    Sizzle.uniqueSort = function( results ) {
    	var elem,
    		duplicates = [],
    		j = 0,
    		i = 0;

    	// Unless we *know* we can detect duplicates, assume their presence
    	hasDuplicate = !support.detectDuplicates;
    	sortInput = !support.sortStable && results.slice( 0 );
    	results.sort( sortOrder );

    	if ( hasDuplicate ) {
    		while ( (elem = results[i++]) ) {
    			if ( elem === results[ i ] ) {
    				j = duplicates.push( i );
    			}
    		}
    		while ( j-- ) {
    			results.splice( duplicates[ j ], 1 );
    		}
    	}

    	// Clear input after sorting to release objects
    	// See https://github.com/jquery/sizzle/pull/225
    	sortInput = null;

    	return results;
    };

    /**
     * Utility function for retrieving the text value of an array of DOM nodes
     * @param {Array|Element} elem
     */
    getText = Sizzle.getText = function( elem ) {
    	var node,
    		ret = "",
    		i = 0,
    		nodeType = elem.nodeType;

    	if ( !nodeType ) {
    		// If no nodeType, this is expected to be an array
    		while ( (node = elem[i++]) ) {
    			// Do not traverse comment nodes
    			ret += getText( node );
    		}
    	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
    		// Use textContent for elements
    		// innerText usage removed for consistency of new lines (jQuery #11153)
    		if ( typeof elem.textContent === "string" ) {
    			return elem.textContent;
    		} else {
    			// Traverse its children
    			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
    				ret += getText( elem );
    			}
    		}
    	} else if ( nodeType === 3 || nodeType === 4 ) {
    		return elem.nodeValue;
    	}
    	// Do not include comment or processing instruction nodes

    	return ret;
    };

    Expr = Sizzle.selectors = {

    	// Can be adjusted by the user
    	cacheLength: 50,

    	createPseudo: markFunction,

    	match: matchExpr,

    	attrHandle: {},

    	find: {},

    	relative: {
    		">": { dir: "parentNode", first: true },
    		" ": { dir: "parentNode" },
    		"+": { dir: "previousSibling", first: true },
    		"~": { dir: "previousSibling" }
    	},

    	preFilter: {
    		"ATTR": function( match ) {
    			match[1] = match[1].replace( runescape, funescape );

    			// Move the given value to match[3] whether quoted or unquoted
    			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

    			if ( match[2] === "~=" ) {
    				match[3] = " " + match[3] + " ";
    			}

    			return match.slice( 0, 4 );
    		},

    		"CHILD": function( match ) {
    			/* matches from matchExpr["CHILD"]
    				1 type (only|nth|...)
    				2 what (child|of-type)
    				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
    				4 xn-component of xn+y argument ([+-]?\d*n|)
    				5 sign of xn-component
    				6 x of xn-component
    				7 sign of y-component
    				8 y of y-component
    			*/
    			match[1] = match[1].toLowerCase();

    			if ( match[1].slice( 0, 3 ) === "nth" ) {
    				// nth-* requires argument
    				if ( !match[3] ) {
    					Sizzle.error( match[0] );
    				}

    				// numeric x and y parameters for Expr.filter.CHILD
    				// remember that false/true cast respectively to 0/1
    				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
    				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

    			// other types prohibit arguments
    			} else if ( match[3] ) {
    				Sizzle.error( match[0] );
    			}

    			return match;
    		},

    		"PSEUDO": function( match ) {
    			var excess,
    				unquoted = !match[6] && match[2];

    			if ( matchExpr["CHILD"].test( match[0] ) ) {
    				return null;
    			}

    			// Accept quoted arguments as-is
    			if ( match[3] ) {
    				match[2] = match[4] || match[5] || "";

    			// Strip excess characters from unquoted arguments
    			} else if ( unquoted && rpseudo.test( unquoted ) &&
    				// Get excess from tokenize (recursively)
    				(excess = tokenize( unquoted, true )) &&
    				// advance to the next closing parenthesis
    				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

    				// excess is a negative index
    				match[0] = match[0].slice( 0, excess );
    				match[2] = unquoted.slice( 0, excess );
    			}

    			// Return only captures needed by the pseudo filter method (type and argument)
    			return match.slice( 0, 3 );
    		}
    	},

    	filter: {

    		"TAG": function( nodeNameSelector ) {
    			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
    			return nodeNameSelector === "*" ?
    				function() { return true; } :
    				function( elem ) {
    					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
    				};
    		},

    		"CLASS": function( className ) {
    			var pattern = classCache[ className + " " ];

    			return pattern ||
    				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
    				classCache( className, function( elem ) {
    					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
    				});
    		},

    		"ATTR": function( name, operator, check ) {
    			return function( elem ) {
    				var result = Sizzle.attr( elem, name );

    				if ( result == null ) {
    					return operator === "!=";
    				}
    				if ( !operator ) {
    					return true;
    				}

    				result += "";

    				return operator === "=" ? result === check :
    					operator === "!=" ? result !== check :
    					operator === "^=" ? check && result.indexOf( check ) === 0 :
    					operator === "*=" ? check && result.indexOf( check ) > -1 :
    					operator === "$=" ? check && result.slice( -check.length ) === check :
    					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
    					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
    					false;
    			};
    		},

    		"CHILD": function( type, what, argument, first, last ) {
    			var simple = type.slice( 0, 3 ) !== "nth",
    				forward = type.slice( -4 ) !== "last",
    				ofType = what === "of-type";

    			return first === 1 && last === 0 ?

    				// Shortcut for :nth-*(n)
    				function( elem ) {
    					return !!elem.parentNode;
    				} :

    				function( elem, context, xml ) {
    					var cache, uniqueCache, outerCache, node, nodeIndex, start,
    						dir = simple !== forward ? "nextSibling" : "previousSibling",
    						parent = elem.parentNode,
    						name = ofType && elem.nodeName.toLowerCase(),
    						useCache = !xml && !ofType,
    						diff = false;

    					if ( parent ) {

    						// :(first|last|only)-(child|of-type)
    						if ( simple ) {
    							while ( dir ) {
    								node = elem;
    								while ( (node = node[ dir ]) ) {
    									if ( ofType ?
    										node.nodeName.toLowerCase() === name :
    										node.nodeType === 1 ) {

    										return false;
    									}
    								}
    								// Reverse direction for :only-* (if we haven't yet done so)
    								start = dir = type === "only" && !start && "nextSibling";
    							}
    							return true;
    						}

    						start = [ forward ? parent.firstChild : parent.lastChild ];

    						// non-xml :nth-child(...) stores cache data on `parent`
    						if ( forward && useCache ) {

    							// Seek `elem` from a previously-cached index

    							// ...in a gzip-friendly way
    							node = parent;
    							outerCache = node[ expando ] || (node[ expando ] = {});

    							// Support: IE <9 only
    							// Defend against cloned attroperties (jQuery gh-1709)
    							uniqueCache = outerCache[ node.uniqueID ] ||
    								(outerCache[ node.uniqueID ] = {});

    							cache = uniqueCache[ type ] || [];
    							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
    							diff = nodeIndex && cache[ 2 ];
    							node = nodeIndex && parent.childNodes[ nodeIndex ];

    							while ( (node = ++nodeIndex && node && node[ dir ] ||

    								// Fallback to seeking `elem` from the start
    								(diff = nodeIndex = 0) || start.pop()) ) {

    								// When found, cache indexes on `parent` and break
    								if ( node.nodeType === 1 && ++diff && node === elem ) {
    									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
    									break;
    								}
    							}

    						} else {
    							// Use previously-cached element index if available
    							if ( useCache ) {
    								// ...in a gzip-friendly way
    								node = elem;
    								outerCache = node[ expando ] || (node[ expando ] = {});

    								// Support: IE <9 only
    								// Defend against cloned attroperties (jQuery gh-1709)
    								uniqueCache = outerCache[ node.uniqueID ] ||
    									(outerCache[ node.uniqueID ] = {});

    								cache = uniqueCache[ type ] || [];
    								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
    								diff = nodeIndex;
    							}

    							// xml :nth-child(...)
    							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
    							if ( diff === false ) {
    								// Use the same loop as above to seek `elem` from the start
    								while ( (node = ++nodeIndex && node && node[ dir ] ||
    									(diff = nodeIndex = 0) || start.pop()) ) {

    									if ( ( ofType ?
    										node.nodeName.toLowerCase() === name :
    										node.nodeType === 1 ) &&
    										++diff ) {

    										// Cache the index of each encountered element
    										if ( useCache ) {
    											outerCache = node[ expando ] || (node[ expando ] = {});

    											// Support: IE <9 only
    											// Defend against cloned attroperties (jQuery gh-1709)
    											uniqueCache = outerCache[ node.uniqueID ] ||
    												(outerCache[ node.uniqueID ] = {});

    											uniqueCache[ type ] = [ dirruns, diff ];
    										}

    										if ( node === elem ) {
    											break;
    										}
    									}
    								}
    							}
    						}

    						// Incorporate the offset, then check against cycle size
    						diff -= last;
    						return diff === first || ( diff % first === 0 && diff / first >= 0 );
    					}
    				};
    		},

    		"PSEUDO": function( pseudo, argument ) {
    			// pseudo-class names are case-insensitive
    			// http://www.w3.org/TR/selectors/#pseudo-classes
    			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
    			// Remember that setFilters inherits from pseudos
    			var args,
    				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
    					Sizzle.error( "unsupported pseudo: " + pseudo );

    			// The user may use createPseudo to indicate that
    			// arguments are needed to create the filter function
    			// just as Sizzle does
    			if ( fn[ expando ] ) {
    				return fn( argument );
    			}

    			// But maintain support for old signatures
    			if ( fn.length > 1 ) {
    				args = [ pseudo, pseudo, "", argument ];
    				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
    					markFunction(function( seed, matches ) {
    						var idx,
    							matched = fn( seed, argument ),
    							i = matched.length;
    						while ( i-- ) {
    							idx = indexOf( seed, matched[i] );
    							seed[ idx ] = !( matches[ idx ] = matched[i] );
    						}
    					}) :
    					function( elem ) {
    						return fn( elem, 0, args );
    					};
    			}

    			return fn;
    		}
    	},

    	pseudos: {
    		// Potentially complex pseudos
    		"not": markFunction(function( selector ) {
    			// Trim the selector passed to compile
    			// to avoid treating leading and trailing
    			// spaces as combinators
    			var input = [],
    				results = [],
    				matcher = compile( selector.replace( rtrim, "$1" ) );

    			return matcher[ expando ] ?
    				markFunction(function( seed, matches, context, xml ) {
    					var elem,
    						unmatched = matcher( seed, null, xml, [] ),
    						i = seed.length;

    					// Match elements unmatched by `matcher`
    					while ( i-- ) {
    						if ( (elem = unmatched[i]) ) {
    							seed[i] = !(matches[i] = elem);
    						}
    					}
    				}) :
    				function( elem, context, xml ) {
    					input[0] = elem;
    					matcher( input, null, xml, results );
    					// Don't keep the element (issue #299)
    					input[0] = null;
    					return !results.pop();
    				};
    		}),

    		"has": markFunction(function( selector ) {
    			return function( elem ) {
    				return Sizzle( selector, elem ).length > 0;
    			};
    		}),

    		"contains": markFunction(function( text ) {
    			text = text.replace( runescape, funescape );
    			return function( elem ) {
    				return ( elem.textContent || getText( elem ) ).indexOf( text ) > -1;
    			};
    		}),

    		// "Whether an element is represented by a :lang() selector
    		// is based solely on the element's language value
    		// being equal to the identifier C,
    		// or beginning with the identifier C immediately followed by "-".
    		// The matching of C against the element's language value is performed case-insensitively.
    		// The identifier C does not have to be a valid language name."
    		// http://www.w3.org/TR/selectors/#lang-pseudo
    		"lang": markFunction( function( lang ) {
    			// lang value must be a valid identifier
    			if ( !ridentifier.test(lang || "") ) {
    				Sizzle.error( "unsupported lang: " + lang );
    			}
    			lang = lang.replace( runescape, funescape ).toLowerCase();
    			return function( elem ) {
    				var elemLang;
    				do {
    					if ( (elemLang = documentIsHTML ?
    						elem.lang :
    						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

    						elemLang = elemLang.toLowerCase();
    						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
    					}
    				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
    				return false;
    			};
    		}),

    		// Miscellaneous
    		"target": function( elem ) {
    			var hash = window.location && window.location.hash;
    			return hash && hash.slice( 1 ) === elem.id;
    		},

    		"root": function( elem ) {
    			return elem === docElem;
    		},

    		"focus": function( elem ) {
    			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
    		},

    		// Boolean properties
    		"enabled": createDisabledPseudo( false ),
    		"disabled": createDisabledPseudo( true ),

    		"checked": function( elem ) {
    			// In CSS3, :checked should return both checked and selected elements
    			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
    			var nodeName = elem.nodeName.toLowerCase();
    			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
    		},

    		"selected": function( elem ) {
    			// Accessing this property makes selected-by-default
    			// options in Safari work properly
    			if ( elem.parentNode ) {
    				elem.parentNode.selectedIndex;
    			}

    			return elem.selected === true;
    		},

    		// Contents
    		"empty": function( elem ) {
    			// http://www.w3.org/TR/selectors/#empty-pseudo
    			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
    			//   but not by others (comment: 8; processing instruction: 7; etc.)
    			// nodeType < 6 works because attributes (2) do not appear as children
    			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
    				if ( elem.nodeType < 6 ) {
    					return false;
    				}
    			}
    			return true;
    		},

    		"parent": function( elem ) {
    			return !Expr.pseudos["empty"]( elem );
    		},

    		// Element/input types
    		"header": function( elem ) {
    			return rheader.test( elem.nodeName );
    		},

    		"input": function( elem ) {
    			return rinputs.test( elem.nodeName );
    		},

    		"button": function( elem ) {
    			var name = elem.nodeName.toLowerCase();
    			return name === "input" && elem.type === "button" || name === "button";
    		},

    		"text": function( elem ) {
    			var attr;
    			return elem.nodeName.toLowerCase() === "input" &&
    				elem.type === "text" &&

    				// Support: IE<8
    				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
    				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
    		},

    		// Position-in-collection
    		"first": createPositionalPseudo(function() {
    			return [ 0 ];
    		}),

    		"last": createPositionalPseudo(function( matchIndexes, length ) {
    			return [ length - 1 ];
    		}),

    		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
    			return [ argument < 0 ? argument + length : argument ];
    		}),

    		"even": createPositionalPseudo(function( matchIndexes, length ) {
    			var i = 0;
    			for ( ; i < length; i += 2 ) {
    				matchIndexes.push( i );
    			}
    			return matchIndexes;
    		}),

    		"odd": createPositionalPseudo(function( matchIndexes, length ) {
    			var i = 1;
    			for ( ; i < length; i += 2 ) {
    				matchIndexes.push( i );
    			}
    			return matchIndexes;
    		}),

    		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
    			var i = argument < 0 ?
    				argument + length :
    				argument > length ?
    					length :
    					argument;
    			for ( ; --i >= 0; ) {
    				matchIndexes.push( i );
    			}
    			return matchIndexes;
    		}),

    		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
    			var i = argument < 0 ? argument + length : argument;
    			for ( ; ++i < length; ) {
    				matchIndexes.push( i );
    			}
    			return matchIndexes;
    		})
    	}
    };

    Expr.pseudos["nth"] = Expr.pseudos["eq"];

    // Add button/input type pseudos
    for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
    	Expr.pseudos[ i ] = createInputPseudo( i );
    }
    for ( i in { submit: true, reset: true } ) {
    	Expr.pseudos[ i ] = createButtonPseudo( i );
    }

    // Easy API for creating new setFilters
    function setFilters() {}
    setFilters.prototype = Expr.filters = Expr.pseudos;
    Expr.setFilters = new setFilters();

    tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
    	var matched, match, tokens, type,
    		soFar, groups, preFilters,
    		cached = tokenCache[ selector + " " ];

    	if ( cached ) {
    		return parseOnly ? 0 : cached.slice( 0 );
    	}

    	soFar = selector;
    	groups = [];
    	preFilters = Expr.preFilter;

    	while ( soFar ) {

    		// Comma and first run
    		if ( !matched || (match = rcomma.exec( soFar )) ) {
    			if ( match ) {
    				// Don't consume trailing commas as valid
    				soFar = soFar.slice( match[0].length ) || soFar;
    			}
    			groups.push( (tokens = []) );
    		}

    		matched = false;

    		// Combinators
    		if ( (match = rcombinators.exec( soFar )) ) {
    			matched = match.shift();
    			tokens.push({
    				value: matched,
    				// Cast descendant combinators to space
    				type: match[0].replace( rtrim, " " )
    			});
    			soFar = soFar.slice( matched.length );
    		}

    		// Filters
    		for ( type in Expr.filter ) {
    			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
    				(match = preFilters[ type ]( match ))) ) {
    				matched = match.shift();
    				tokens.push({
    					value: matched,
    					type: type,
    					matches: match
    				});
    				soFar = soFar.slice( matched.length );
    			}
    		}

    		if ( !matched ) {
    			break;
    		}
    	}

    	// Return the length of the invalid excess
    	// if we're just parsing
    	// Otherwise, throw an error or return tokens
    	return parseOnly ?
    		soFar.length :
    		soFar ?
    			Sizzle.error( selector ) :
    			// Cache the tokens
    			tokenCache( selector, groups ).slice( 0 );
    };

    function toSelector( tokens ) {
    	var i = 0,
    		len = tokens.length,
    		selector = "";
    	for ( ; i < len; i++ ) {
    		selector += tokens[i].value;
    	}
    	return selector;
    }

    function addCombinator( matcher, combinator, base ) {
    	var dir = combinator.dir,
    		skip = combinator.next,
    		key = skip || dir,
    		checkNonElements = base && key === "parentNode",
    		doneName = done++;

    	return combinator.first ?
    		// Check against closest ancestor/preceding element
    		function( elem, context, xml ) {
    			while ( (elem = elem[ dir ]) ) {
    				if ( elem.nodeType === 1 || checkNonElements ) {
    					return matcher( elem, context, xml );
    				}
    			}
    			return false;
    		} :

    		// Check against all ancestor/preceding elements
    		function( elem, context, xml ) {
    			var oldCache, uniqueCache, outerCache,
    				newCache = [ dirruns, doneName ];

    			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
    			if ( xml ) {
    				while ( (elem = elem[ dir ]) ) {
    					if ( elem.nodeType === 1 || checkNonElements ) {
    						if ( matcher( elem, context, xml ) ) {
    							return true;
    						}
    					}
    				}
    			} else {
    				while ( (elem = elem[ dir ]) ) {
    					if ( elem.nodeType === 1 || checkNonElements ) {
    						outerCache = elem[ expando ] || (elem[ expando ] = {});

    						// Support: IE <9 only
    						// Defend against cloned attroperties (jQuery gh-1709)
    						uniqueCache = outerCache[ elem.uniqueID ] || (outerCache[ elem.uniqueID ] = {});

    						if ( skip && skip === elem.nodeName.toLowerCase() ) {
    							elem = elem[ dir ] || elem;
    						} else if ( (oldCache = uniqueCache[ key ]) &&
    							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

    							// Assign to newCache so results back-propagate to previous elements
    							return (newCache[ 2 ] = oldCache[ 2 ]);
    						} else {
    							// Reuse newcache so results back-propagate to previous elements
    							uniqueCache[ key ] = newCache;

    							// A match means we're done; a fail means we have to keep checking
    							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
    								return true;
    							}
    						}
    					}
    				}
    			}
    			return false;
    		};
    }

    function elementMatcher( matchers ) {
    	return matchers.length > 1 ?
    		function( elem, context, xml ) {
    			var i = matchers.length;
    			while ( i-- ) {
    				if ( !matchers[i]( elem, context, xml ) ) {
    					return false;
    				}
    			}
    			return true;
    		} :
    		matchers[0];
    }

    function multipleContexts( selector, contexts, results ) {
    	var i = 0,
    		len = contexts.length;
    	for ( ; i < len; i++ ) {
    		Sizzle( selector, contexts[i], results );
    	}
    	return results;
    }

    function condense( unmatched, map, filter, context, xml ) {
    	var elem,
    		newUnmatched = [],
    		i = 0,
    		len = unmatched.length,
    		mapped = map != null;

    	for ( ; i < len; i++ ) {
    		if ( (elem = unmatched[i]) ) {
    			if ( !filter || filter( elem, context, xml ) ) {
    				newUnmatched.push( elem );
    				if ( mapped ) {
    					map.push( i );
    				}
    			}
    		}
    	}

    	return newUnmatched;
    }

    function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
    	if ( postFilter && !postFilter[ expando ] ) {
    		postFilter = setMatcher( postFilter );
    	}
    	if ( postFinder && !postFinder[ expando ] ) {
    		postFinder = setMatcher( postFinder, postSelector );
    	}
    	return markFunction(function( seed, results, context, xml ) {
    		var temp, i, elem,
    			preMap = [],
    			postMap = [],
    			preexisting = results.length,

    			// Get initial elements from seed or context
    			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

    			// Prefilter to get matcher input, preserving a map for seed-results synchronization
    			matcherIn = preFilter && ( seed || !selector ) ?
    				condense( elems, preMap, preFilter, context, xml ) :
    				elems,

    			matcherOut = matcher ?
    				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
    				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

    					// ...intermediate processing is necessary
    					[] :

    					// ...otherwise use results directly
    					results :
    				matcherIn;

    		// Find primary matches
    		if ( matcher ) {
    			matcher( matcherIn, matcherOut, context, xml );
    		}

    		// Apply postFilter
    		if ( postFilter ) {
    			temp = condense( matcherOut, postMap );
    			postFilter( temp, [], context, xml );

    			// Un-match failing elements by moving them back to matcherIn
    			i = temp.length;
    			while ( i-- ) {
    				if ( (elem = temp[i]) ) {
    					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
    				}
    			}
    		}

    		if ( seed ) {
    			if ( postFinder || preFilter ) {
    				if ( postFinder ) {
    					// Get the final matcherOut by condensing this intermediate into postFinder contexts
    					temp = [];
    					i = matcherOut.length;
    					while ( i-- ) {
    						if ( (elem = matcherOut[i]) ) {
    							// Restore matcherIn since elem is not yet a final match
    							temp.push( (matcherIn[i] = elem) );
    						}
    					}
    					postFinder( null, (matcherOut = []), temp, xml );
    				}

    				// Move matched elements from seed to results to keep them synchronized
    				i = matcherOut.length;
    				while ( i-- ) {
    					if ( (elem = matcherOut[i]) &&
    						(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

    						seed[temp] = !(results[temp] = elem);
    					}
    				}
    			}

    		// Add elements to results, through postFinder if defined
    		} else {
    			matcherOut = condense(
    				matcherOut === results ?
    					matcherOut.splice( preexisting, matcherOut.length ) :
    					matcherOut
    			);
    			if ( postFinder ) {
    				postFinder( null, results, matcherOut, xml );
    			} else {
    				push.apply( results, matcherOut );
    			}
    		}
    	});
    }

    function matcherFromTokens( tokens ) {
    	var checkContext, matcher, j,
    		len = tokens.length,
    		leadingRelative = Expr.relative[ tokens[0].type ],
    		implicitRelative = leadingRelative || Expr.relative[" "],
    		i = leadingRelative ? 1 : 0,

    		// The foundational matcher ensures that elements are reachable from top-level context(s)
    		matchContext = addCombinator( function( elem ) {
    			return elem === checkContext;
    		}, implicitRelative, true ),
    		matchAnyContext = addCombinator( function( elem ) {
    			return indexOf( checkContext, elem ) > -1;
    		}, implicitRelative, true ),
    		matchers = [ function( elem, context, xml ) {
    			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
    				(checkContext = context).nodeType ?
    					matchContext( elem, context, xml ) :
    					matchAnyContext( elem, context, xml ) );
    			// Avoid hanging onto element (issue #299)
    			checkContext = null;
    			return ret;
    		} ];

    	for ( ; i < len; i++ ) {
    		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
    			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
    		} else {
    			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

    			// Return special upon seeing a positional matcher
    			if ( matcher[ expando ] ) {
    				// Find the next relative operator (if any) for proper handling
    				j = ++i;
    				for ( ; j < len; j++ ) {
    					if ( Expr.relative[ tokens[j].type ] ) {
    						break;
    					}
    				}
    				return setMatcher(
    					i > 1 && elementMatcher( matchers ),
    					i > 1 && toSelector(
    						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
    						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
    					).replace( rtrim, "$1" ),
    					matcher,
    					i < j && matcherFromTokens( tokens.slice( i, j ) ),
    					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
    					j < len && toSelector( tokens )
    				);
    			}
    			matchers.push( matcher );
    		}
    	}

    	return elementMatcher( matchers );
    }

    function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
    	var bySet = setMatchers.length > 0,
    		byElement = elementMatchers.length > 0,
    		superMatcher = function( seed, context, xml, results, outermost ) {
    			var elem, j, matcher,
    				matchedCount = 0,
    				i = "0",
    				unmatched = seed && [],
    				setMatched = [],
    				contextBackup = outermostContext,
    				// We must always have either seed elements or outermost context
    				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
    				// Use integer dirruns iff this is the outermost matcher
    				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
    				len = elems.length;

    			if ( outermost ) {
    				outermostContext = context === document || context || outermost;
    			}

    			// Add elements passing elementMatchers directly to results
    			// Support: IE<9, Safari
    			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
    			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
    				if ( byElement && elem ) {
    					j = 0;
    					if ( !context && elem.ownerDocument !== document ) {
    						setDocument( elem );
    						xml = !documentIsHTML;
    					}
    					while ( (matcher = elementMatchers[j++]) ) {
    						if ( matcher( elem, context || document, xml) ) {
    							results.push( elem );
    							break;
    						}
    					}
    					if ( outermost ) {
    						dirruns = dirrunsUnique;
    					}
    				}

    				// Track unmatched elements for set filters
    				if ( bySet ) {
    					// They will have gone through all possible matchers
    					if ( (elem = !matcher && elem) ) {
    						matchedCount--;
    					}

    					// Lengthen the array for every element, matched or not
    					if ( seed ) {
    						unmatched.push( elem );
    					}
    				}
    			}

    			// `i` is now the count of elements visited above, and adding it to `matchedCount`
    			// makes the latter nonnegative.
    			matchedCount += i;

    			// Apply set filters to unmatched elements
    			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
    			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
    			// no element matchers and no seed.
    			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
    			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
    			// numerically zero.
    			if ( bySet && i !== matchedCount ) {
    				j = 0;
    				while ( (matcher = setMatchers[j++]) ) {
    					matcher( unmatched, setMatched, context, xml );
    				}

    				if ( seed ) {
    					// Reintegrate element matches to eliminate the need for sorting
    					if ( matchedCount > 0 ) {
    						while ( i-- ) {
    							if ( !(unmatched[i] || setMatched[i]) ) {
    								setMatched[i] = pop.call( results );
    							}
    						}
    					}

    					// Discard index placeholder values to get only actual matches
    					setMatched = condense( setMatched );
    				}

    				// Add matches to results
    				push.apply( results, setMatched );

    				// Seedless set matches succeeding multiple successful matchers stipulate sorting
    				if ( outermost && !seed && setMatched.length > 0 &&
    					( matchedCount + setMatchers.length ) > 1 ) {

    					Sizzle.uniqueSort( results );
    				}
    			}

    			// Override manipulation of globals by nested matchers
    			if ( outermost ) {
    				dirruns = dirrunsUnique;
    				outermostContext = contextBackup;
    			}

    			return unmatched;
    		};

    	return bySet ?
    		markFunction( superMatcher ) :
    		superMatcher;
    }

    compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
    	var i,
    		setMatchers = [],
    		elementMatchers = [],
    		cached = compilerCache[ selector + " " ];

    	if ( !cached ) {
    		// Generate a function of recursive functions that can be used to check each element
    		if ( !match ) {
    			match = tokenize( selector );
    		}
    		i = match.length;
    		while ( i-- ) {
    			cached = matcherFromTokens( match[i] );
    			if ( cached[ expando ] ) {
    				setMatchers.push( cached );
    			} else {
    				elementMatchers.push( cached );
    			}
    		}

    		// Cache the compiled function
    		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

    		// Save selector and tokenization
    		cached.selector = selector;
    	}
    	return cached;
    };

    /**
     * A low-level selection function that works with Sizzle's compiled
     *  selector functions
     * @param {String|Function} selector A selector or a pre-compiled
     *  selector function built with Sizzle.compile
     * @param {Element} context
     * @param {Array} [results]
     * @param {Array} [seed] A set of elements to match against
     */
    select = Sizzle.select = function( selector, context, results, seed ) {
    	var i, tokens, token, type, find,
    		compiled = typeof selector === "function" && selector,
    		match = !seed && tokenize( (selector = compiled.selector || selector) );

    	results = results || [];

    	// Try to minimize operations if there is only one selector in the list and no seed
    	// (the latter of which guarantees us context)
    	if ( match.length === 1 ) {

    		// Reduce context if the leading compound selector is an ID
    		tokens = match[0] = match[0].slice( 0 );
    		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
    				context.nodeType === 9 && documentIsHTML && Expr.relative[ tokens[1].type ] ) {

    			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
    			if ( !context ) {
    				return results;

    			// Precompiled matchers will still verify ancestry, so step up a level
    			} else if ( compiled ) {
    				context = context.parentNode;
    			}

    			selector = selector.slice( tokens.shift().value.length );
    		}

    		// Fetch a seed set for right-to-left matching
    		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
    		while ( i-- ) {
    			token = tokens[i];

    			// Abort if we hit a combinator
    			if ( Expr.relative[ (type = token.type) ] ) {
    				break;
    			}
    			if ( (find = Expr.find[ type ]) ) {
    				// Search, expanding context for leading sibling combinators
    				if ( (seed = find(
    					token.matches[0].replace( runescape, funescape ),
    					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
    				)) ) {

    					// If seed is empty or no tokens remain, we can return early
    					tokens.splice( i, 1 );
    					selector = seed.length && toSelector( tokens );
    					if ( !selector ) {
    						push.apply( results, seed );
    						return results;
    					}

    					break;
    				}
    			}
    		}
    	}

    	// Compile and execute a filtering function if one is not provided
    	// Provide `match` to avoid retokenization if we modified the selector above
    	( compiled || compile( selector, match ) )(
    		seed,
    		context,
    		!documentIsHTML,
    		results,
    		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
    	);
    	return results;
    };

    // One-time assignments

    // Sort stability
    support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

    // Support: Chrome 14-35+
    // Always assume duplicates if they aren't passed to the comparison function
    support.detectDuplicates = !!hasDuplicate;

    // Initialize against the default document
    setDocument();

    // Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
    // Detached nodes confoundingly follow *each other*
    support.sortDetached = assert(function( el ) {
    	// Should return 1, but returns 4 (following)
    	return el.compareDocumentPosition( document.createElement("fieldset") ) & 1;
    });

    // Support: IE<8
    // Prevent attribute/property "interpolation"
    // https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
    if ( !assert(function( el ) {
    	el.innerHTML = "<a href='#'></a>";
    	return el.firstChild.getAttribute("href") === "#" ;
    }) ) {
    	addHandle( "type|href|height|width", function( elem, name, isXML ) {
    		if ( !isXML ) {
    			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
    		}
    	});
    }

    // Support: IE<9
    // Use defaultValue in place of getAttribute("value")
    if ( !support.attributes || !assert(function( el ) {
    	el.innerHTML = "<input/>";
    	el.firstChild.setAttribute( "value", "" );
    	return el.firstChild.getAttribute( "value" ) === "";
    }) ) {
    	addHandle( "value", function( elem, name, isXML ) {
    		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
    			return elem.defaultValue;
    		}
    	});
    }

    // Support: IE<9
    // Use getAttributeNode to fetch booleans when getAttribute lies
    if ( !assert(function( el ) {
    	return el.getAttribute("disabled") == null;
    }) ) {
    	addHandle( booleans, function( elem, name, isXML ) {
    		var val;
    		if ( !isXML ) {
    			return elem[ name ] === true ? name.toLowerCase() :
    					(val = elem.getAttributeNode( name )) && val.specified ?
    					val.value :
    				null;
    		}
    	});
    }

    return Sizzle;

    })( window );



    jQuery.find = Sizzle;
    jQuery.expr = Sizzle.selectors;

    // Deprecated
    jQuery.expr[ ":" ] = jQuery.expr.pseudos;
    jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
    jQuery.text = Sizzle.getText;
    jQuery.isXMLDoc = Sizzle.isXML;
    jQuery.contains = Sizzle.contains;
    jQuery.escapeSelector = Sizzle.escape;




    var dir = function( elem, dir, until ) {
    	var matched = [],
    		truncate = until !== undefined;

    	while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
    		if ( elem.nodeType === 1 ) {
    			if ( truncate && jQuery( elem ).is( until ) ) {
    				break;
    			}
    			matched.push( elem );
    		}
    	}
    	return matched;
    };


    var siblings = function( n, elem ) {
    	var matched = [];

    	for ( ; n; n = n.nextSibling ) {
    		if ( n.nodeType === 1 && n !== elem ) {
    			matched.push( n );
    		}
    	}

    	return matched;
    };


    var rneedsContext = jQuery.expr.match.needsContext;



    function nodeName( elem, name ) {

      return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();

    }var rsingleTag = ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );



    // Implement the identical functionality for filter and not
    function winnow( elements, qualifier, not ) {
    	if ( isFunction( qualifier ) ) {
    		return jQuery.grep( elements, function( elem, i ) {
    			return !!qualifier.call( elem, i, elem ) !== not;
    		} );
    	}

    	// Single element
    	if ( qualifier.nodeType ) {
    		return jQuery.grep( elements, function( elem ) {
    			return ( elem === qualifier ) !== not;
    		} );
    	}

    	// Arraylike of elements (jQuery, arguments, Array)
    	if ( typeof qualifier !== "string" ) {
    		return jQuery.grep( elements, function( elem ) {
    			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
    		} );
    	}

    	// Filtered directly for both simple and complex selectors
    	return jQuery.filter( qualifier, elements, not );
    }

    jQuery.filter = function( expr, elems, not ) {
    	var elem = elems[ 0 ];

    	if ( not ) {
    		expr = ":not(" + expr + ")";
    	}

    	if ( elems.length === 1 && elem.nodeType === 1 ) {
    		return jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [];
    	}

    	return jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
    		return elem.nodeType === 1;
    	} ) );
    };

    jQuery.fn.extend( {
    	find: function( selector ) {
    		var i, ret,
    			len = this.length,
    			self = this;

    		if ( typeof selector !== "string" ) {
    			return this.pushStack( jQuery( selector ).filter( function() {
    				for ( i = 0; i < len; i++ ) {
    					if ( jQuery.contains( self[ i ], this ) ) {
    						return true;
    					}
    				}
    			} ) );
    		}

    		ret = this.pushStack( [] );

    		for ( i = 0; i < len; i++ ) {
    			jQuery.find( selector, self[ i ], ret );
    		}

    		return len > 1 ? jQuery.uniqueSort( ret ) : ret;
    	},
    	filter: function( selector ) {
    		return this.pushStack( winnow( this, selector || [], false ) );
    	},
    	not: function( selector ) {
    		return this.pushStack( winnow( this, selector || [], true ) );
    	},
    	is: function( selector ) {
    		return !!winnow(
    			this,

    			// If this is a positional/relative selector, check membership in the returned set
    			// so $("p:first").is("p:last") won't return true for a doc with two "p".
    			typeof selector === "string" && rneedsContext.test( selector ) ?
    				jQuery( selector ) :
    				selector || [],
    			false
    		).length;
    	}
    } );


    // Initialize a jQuery object


    // A central reference to the root jQuery(document)
    var rootjQuery,

    	// A simple way to check for HTML strings
    	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
    	// Strict HTML recognition (#11290: must start with <)
    	// Shortcut simple #id case for speed
    	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

    	init = jQuery.fn.init = function( selector, context, root ) {
    		var match, elem;

    		// HANDLE: $(""), $(null), $(undefined), $(false)
    		if ( !selector ) {
    			return this;
    		}

    		// Method init() accepts an alternate rootjQuery
    		// so migrate can support jQuery.sub (gh-2101)
    		root = root || rootjQuery;

    		// Handle HTML strings
    		if ( typeof selector === "string" ) {
    			if ( selector[ 0 ] === "<" &&
    				selector[ selector.length - 1 ] === ">" &&
    				selector.length >= 3 ) {

    				// Assume that strings that start and end with <> are HTML and skip the regex check
    				match = [ null, selector, null ];

    			} else {
    				match = rquickExpr.exec( selector );
    			}

    			// Match html or make sure no context is specified for #id
    			if ( match && ( match[ 1 ] || !context ) ) {

    				// HANDLE: $(html) -> $(array)
    				if ( match[ 1 ] ) {
    					context = context instanceof jQuery ? context[ 0 ] : context;

    					// Option to run scripts is true for back-compat
    					// Intentionally let the error be thrown if parseHTML is not present
    					jQuery.merge( this, jQuery.parseHTML(
    						match[ 1 ],
    						context && context.nodeType ? context.ownerDocument || context : document,
    						true
    					) );

    					// HANDLE: $(html, props)
    					if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
    						for ( match in context ) {

    							// Properties of context are called as methods if possible
    							if ( isFunction( this[ match ] ) ) {
    								this[ match ]( context[ match ] );

    							// ...and otherwise set as attributes
    							} else {
    								this.attr( match, context[ match ] );
    							}
    						}
    					}

    					return this;

    				// HANDLE: $(#id)
    				} else {
    					elem = document.getElementById( match[ 2 ] );

    					if ( elem ) {

    						// Inject the element directly into the jQuery object
    						this[ 0 ] = elem;
    						this.length = 1;
    					}
    					return this;
    				}

    			// HANDLE: $(expr, $(...))
    			} else if ( !context || context.jquery ) {
    				return ( context || root ).find( selector );

    			// HANDLE: $(expr, context)
    			// (which is just equivalent to: $(context).find(expr)
    			} else {
    				return this.constructor( context ).find( selector );
    			}

    		// HANDLE: $(DOMElement)
    		} else if ( selector.nodeType ) {
    			this[ 0 ] = selector;
    			this.length = 1;
    			return this;

    		// HANDLE: $(function)
    		// Shortcut for document ready
    		} else if ( isFunction( selector ) ) {
    			return root.ready !== undefined ?
    				root.ready( selector ) :

    				// Execute immediately if ready is not present
    				selector( jQuery );
    		}

    		return jQuery.makeArray( selector, this );
    	};

    // Give the init function the jQuery prototype for later instantiation
    init.prototype = jQuery.fn;

    // Initialize central reference
    rootjQuery = jQuery( document );


    var rparentsprev = /^(?:parents|prev(?:Until|All))/,

    	// Methods guaranteed to produce a unique set when starting from a unique set
    	guaranteedUnique = {
    		children: true,
    		contents: true,
    		next: true,
    		prev: true
    	};

    jQuery.fn.extend( {
    	has: function( target ) {
    		var targets = jQuery( target, this ),
    			l = targets.length;

    		return this.filter( function() {
    			var i = 0;
    			for ( ; i < l; i++ ) {
    				if ( jQuery.contains( this, targets[ i ] ) ) {
    					return true;
    				}
    			}
    		} );
    	},

    	closest: function( selectors, context ) {
    		var cur,
    			i = 0,
    			l = this.length,
    			matched = [],
    			targets = typeof selectors !== "string" && jQuery( selectors );

    		// Positional selectors never match, since there's no _selection_ context
    		if ( !rneedsContext.test( selectors ) ) {
    			for ( ; i < l; i++ ) {
    				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

    					// Always skip document fragments
    					if ( cur.nodeType < 11 && ( targets ?
    						targets.index( cur ) > -1 :

    						// Don't pass non-elements to Sizzle
    						cur.nodeType === 1 &&
    							jQuery.find.matchesSelector( cur, selectors ) ) ) {

    						matched.push( cur );
    						break;
    					}
    				}
    			}
    		}

    		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
    	},

    	// Determine the position of an element within the set
    	index: function( elem ) {

    		// No argument, return index in parent
    		if ( !elem ) {
    			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
    		}

    		// Index in selector
    		if ( typeof elem === "string" ) {
    			return indexOf.call( jQuery( elem ), this[ 0 ] );
    		}

    		// Locate the position of the desired element
    		return indexOf.call( this,

    			// If it receives a jQuery object, the first element is used
    			elem.jquery ? elem[ 0 ] : elem
    		);
    	},

    	add: function( selector, context ) {
    		return this.pushStack(
    			jQuery.uniqueSort(
    				jQuery.merge( this.get(), jQuery( selector, context ) )
    			)
    		);
    	},

    	addBack: function( selector ) {
    		return this.add( selector == null ?
    			this.prevObject : this.prevObject.filter( selector )
    		);
    	}
    } );

    function sibling( cur, dir ) {
    	while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
    	return cur;
    }

    jQuery.each( {
    	parent: function( elem ) {
    		var parent = elem.parentNode;
    		return parent && parent.nodeType !== 11 ? parent : null;
    	},
    	parents: function( elem ) {
    		return dir( elem, "parentNode" );
    	},
    	parentsUntil: function( elem, i, until ) {
    		return dir( elem, "parentNode", until );
    	},
    	next: function( elem ) {
    		return sibling( elem, "nextSibling" );
    	},
    	prev: function( elem ) {
    		return sibling( elem, "previousSibling" );
    	},
    	nextAll: function( elem ) {
    		return dir( elem, "nextSibling" );
    	},
    	prevAll: function( elem ) {
    		return dir( elem, "previousSibling" );
    	},
    	nextUntil: function( elem, i, until ) {
    		return dir( elem, "nextSibling", until );
    	},
    	prevUntil: function( elem, i, until ) {
    		return dir( elem, "previousSibling", until );
    	},
    	siblings: function( elem ) {
    		return siblings( ( elem.parentNode || {} ).firstChild, elem );
    	},
    	children: function( elem ) {
    		return siblings( elem.firstChild );
    	},
    	contents: function( elem ) {
    		if ( typeof elem.contentDocument !== "undefined" ) {
    			return elem.contentDocument;
    		}

    		// Support: IE 9 - 11 only, iOS 7 only, Android Browser <=4.3 only
    		// Treat the template element as a regular one in browsers that
    		// don't support it.
    		if ( nodeName( elem, "template" ) ) {
    			elem = elem.content || elem;
    		}

    		return jQuery.merge( [], elem.childNodes );
    	}
    }, function( name, fn ) {
    	jQuery.fn[ name ] = function( until, selector ) {
    		var matched = jQuery.map( this, fn, until );

    		if ( name.slice( -5 ) !== "Until" ) {
    			selector = until;
    		}

    		if ( selector && typeof selector === "string" ) {
    			matched = jQuery.filter( selector, matched );
    		}

    		if ( this.length > 1 ) {

    			// Remove duplicates
    			if ( !guaranteedUnique[ name ] ) {
    				jQuery.uniqueSort( matched );
    			}

    			// Reverse order for parents* and prev-derivatives
    			if ( rparentsprev.test( name ) ) {
    				matched.reverse();
    			}
    		}

    		return this.pushStack( matched );
    	};
    } );
    var rnothtmlwhite = ( /[^\x20\t\r\n\f]+/g );



    // Convert String-formatted options into Object-formatted ones
    function createOptions( options ) {
    	var object = {};
    	jQuery.each( options.match( rnothtmlwhite ) || [], function( _, flag ) {
    		object[ flag ] = true;
    	} );
    	return object;
    }

    /*
     * Create a callback list using the following parameters:
     *
     *	options: an optional list of space-separated options that will change how
     *			the callback list behaves or a more traditional option object
     *
     * By default a callback list will act like an event callback list and can be
     * "fired" multiple times.
     *
     * Possible options:
     *
     *	once:			will ensure the callback list can only be fired once (like a Deferred)
     *
     *	memory:			will keep track of previous values and will call any callback added
     *					after the list has been fired right away with the latest "memorized"
     *					values (like a Deferred)
     *
     *	unique:			will ensure a callback can only be added once (no duplicate in the list)
     *
     *	stopOnFalse:	interrupt callings when a callback returns false
     *
     */
    jQuery.Callbacks = function( options ) {

    	// Convert options from String-formatted to Object-formatted if needed
    	// (we check in cache first)
    	options = typeof options === "string" ?
    		createOptions( options ) :
    		jQuery.extend( {}, options );

    	var // Flag to know if list is currently firing
    		firing,

    		// Last fire value for non-forgettable lists
    		memory,

    		// Flag to know if list was already fired
    		fired,

    		// Flag to prevent firing
    		locked,

    		// Actual callback list
    		list = [],

    		// Queue of execution data for repeatable lists
    		queue = [],

    		// Index of currently firing callback (modified by add/remove as needed)
    		firingIndex = -1,

    		// Fire callbacks
    		fire = function() {

    			// Enforce single-firing
    			locked = locked || options.once;

    			// Execute callbacks for all pending executions,
    			// respecting firingIndex overrides and runtime changes
    			fired = firing = true;
    			for ( ; queue.length; firingIndex = -1 ) {
    				memory = queue.shift();
    				while ( ++firingIndex < list.length ) {

    					// Run callback and check for early termination
    					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
    						options.stopOnFalse ) {

    						// Jump to end and forget the data so .add doesn't re-fire
    						firingIndex = list.length;
    						memory = false;
    					}
    				}
    			}

    			// Forget the data if we're done with it
    			if ( !options.memory ) {
    				memory = false;
    			}

    			firing = false;

    			// Clean up if we're done firing for good
    			if ( locked ) {

    				// Keep an empty list if we have data for future add calls
    				if ( memory ) {
    					list = [];

    				// Otherwise, this object is spent
    				} else {
    					list = "";
    				}
    			}
    		},

    		// Actual Callbacks object
    		self = {

    			// Add a callback or a collection of callbacks to the list
    			add: function() {
    				if ( list ) {

    					// If we have memory from a past run, we should fire after adding
    					if ( memory && !firing ) {
    						firingIndex = list.length - 1;
    						queue.push( memory );
    					}

    					( function add( args ) {
    						jQuery.each( args, function( _, arg ) {
    							if ( isFunction( arg ) ) {
    								if ( !options.unique || !self.has( arg ) ) {
    									list.push( arg );
    								}
    							} else if ( arg && arg.length && toType( arg ) !== "string" ) {

    								// Inspect recursively
    								add( arg );
    							}
    						} );
    					} )( arguments );

    					if ( memory && !firing ) {
    						fire();
    					}
    				}
    				return this;
    			},

    			// Remove a callback from the list
    			remove: function() {
    				jQuery.each( arguments, function( _, arg ) {
    					var index;
    					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
    						list.splice( index, 1 );

    						// Handle firing indexes
    						if ( index <= firingIndex ) {
    							firingIndex--;
    						}
    					}
    				} );
    				return this;
    			},

    			// Check if a given callback is in the list.
    			// If no argument is given, return whether or not list has callbacks attached.
    			has: function( fn ) {
    				return fn ?
    					jQuery.inArray( fn, list ) > -1 :
    					list.length > 0;
    			},

    			// Remove all callbacks from the list
    			empty: function() {
    				if ( list ) {
    					list = [];
    				}
    				return this;
    			},

    			// Disable .fire and .add
    			// Abort any current/pending executions
    			// Clear all callbacks and values
    			disable: function() {
    				locked = queue = [];
    				list = memory = "";
    				return this;
    			},
    			disabled: function() {
    				return !list;
    			},

    			// Disable .fire
    			// Also disable .add unless we have memory (since it would have no effect)
    			// Abort any pending executions
    			lock: function() {
    				locked = queue = [];
    				if ( !memory && !firing ) {
    					list = memory = "";
    				}
    				return this;
    			},
    			locked: function() {
    				return !!locked;
    			},

    			// Call all callbacks with the given context and arguments
    			fireWith: function( context, args ) {
    				if ( !locked ) {
    					args = args || [];
    					args = [ context, args.slice ? args.slice() : args ];
    					queue.push( args );
    					if ( !firing ) {
    						fire();
    					}
    				}
    				return this;
    			},

    			// Call all the callbacks with the given arguments
    			fire: function() {
    				self.fireWith( this, arguments );
    				return this;
    			},

    			// To know if the callbacks have already been called at least once
    			fired: function() {
    				return !!fired;
    			}
    		};

    	return self;
    };


    function Identity( v ) {
    	return v;
    }
    function Thrower( ex ) {
    	throw ex;
    }

    function adoptValue( value, resolve, reject, noValue ) {
    	var method;

    	try {

    		// Check for promise aspect first to privilege synchronous behavior
    		if ( value && isFunction( ( method = value.promise ) ) ) {
    			method.call( value ).done( resolve ).fail( reject );

    		// Other thenables
    		} else if ( value && isFunction( ( method = value.then ) ) ) {
    			method.call( value, resolve, reject );

    		// Other non-thenables
    		} else {

    			// Control `resolve` arguments by letting Array#slice cast boolean `noValue` to integer:
    			// * false: [ value ].slice( 0 ) => resolve( value )
    			// * true: [ value ].slice( 1 ) => resolve()
    			resolve.apply( undefined, [ value ].slice( noValue ) );
    		}

    	// For Promises/A+, convert exceptions into rejections
    	// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
    	// Deferred#then to conditionally suppress rejection.
    	} catch ( value ) {

    		// Support: Android 4.0 only
    		// Strict mode functions invoked without .call/.apply get global-object context
    		reject.apply( undefined, [ value ] );
    	}
    }

    jQuery.extend( {

    	Deferred: function( func ) {
    		var tuples = [

    				// action, add listener, callbacks,
    				// ... .then handlers, argument index, [final state]
    				[ "notify", "progress", jQuery.Callbacks( "memory" ),
    					jQuery.Callbacks( "memory" ), 2 ],
    				[ "resolve", "done", jQuery.Callbacks( "once memory" ),
    					jQuery.Callbacks( "once memory" ), 0, "resolved" ],
    				[ "reject", "fail", jQuery.Callbacks( "once memory" ),
    					jQuery.Callbacks( "once memory" ), 1, "rejected" ]
    			],
    			state = "pending",
    			promise = {
    				state: function() {
    					return state;
    				},
    				always: function() {
    					deferred.done( arguments ).fail( arguments );
    					return this;
    				},
    				"catch": function( fn ) {
    					return promise.then( null, fn );
    				},

    				// Keep pipe for back-compat
    				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
    					var fns = arguments;

    					return jQuery.Deferred( function( newDefer ) {
    						jQuery.each( tuples, function( i, tuple ) {

    							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
    							var fn = isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

    							// deferred.progress(function() { bind to newDefer or newDefer.notify })
    							// deferred.done(function() { bind to newDefer or newDefer.resolve })
    							// deferred.fail(function() { bind to newDefer or newDefer.reject })
    							deferred[ tuple[ 1 ] ]( function() {
    								var returned = fn && fn.apply( this, arguments );
    								if ( returned && isFunction( returned.promise ) ) {
    									returned.promise()
    										.progress( newDefer.notify )
    										.done( newDefer.resolve )
    										.fail( newDefer.reject );
    								} else {
    									newDefer[ tuple[ 0 ] + "With" ](
    										this,
    										fn ? [ returned ] : arguments
    									);
    								}
    							} );
    						} );
    						fns = null;
    					} ).promise();
    				},
    				then: function( onFulfilled, onRejected, onProgress ) {
    					var maxDepth = 0;
    					function resolve( depth, deferred, handler, special ) {
    						return function() {
    							var that = this,
    								args = arguments,
    								mightThrow = function() {
    									var returned, then;

    									// Support: Promises/A+ section 2.3.3.3.3
    									// https://promisesaplus.com/#point-59
    									// Ignore double-resolution attempts
    									if ( depth < maxDepth ) {
    										return;
    									}

    									returned = handler.apply( that, args );

    									// Support: Promises/A+ section 2.3.1
    									// https://promisesaplus.com/#point-48
    									if ( returned === deferred.promise() ) {
    										throw new TypeError( "Thenable self-resolution" );
    									}

    									// Support: Promises/A+ sections 2.3.3.1, 3.5
    									// https://promisesaplus.com/#point-54
    									// https://promisesaplus.com/#point-75
    									// Retrieve `then` only once
    									then = returned &&

    										// Support: Promises/A+ section 2.3.4
    										// https://promisesaplus.com/#point-64
    										// Only check objects and functions for thenability
    										( typeof returned === "object" ||
    											typeof returned === "function" ) &&
    										returned.then;

    									// Handle a returned thenable
    									if ( isFunction( then ) ) {

    										// Special processors (notify) just wait for resolution
    										if ( special ) {
    											then.call(
    												returned,
    												resolve( maxDepth, deferred, Identity, special ),
    												resolve( maxDepth, deferred, Thrower, special )
    											);

    										// Normal processors (resolve) also hook into progress
    										} else {

    											// ...and disregard older resolution values
    											maxDepth++;

    											then.call(
    												returned,
    												resolve( maxDepth, deferred, Identity, special ),
    												resolve( maxDepth, deferred, Thrower, special ),
    												resolve( maxDepth, deferred, Identity,
    													deferred.notifyWith )
    											);
    										}

    									// Handle all other returned values
    									} else {

    										// Only substitute handlers pass on context
    										// and multiple values (non-spec behavior)
    										if ( handler !== Identity ) {
    											that = undefined;
    											args = [ returned ];
    										}

    										// Process the value(s)
    										// Default process is resolve
    										( special || deferred.resolveWith )( that, args );
    									}
    								},

    								// Only normal processors (resolve) catch and reject exceptions
    								process = special ?
    									mightThrow :
    									function() {
    										try {
    											mightThrow();
    										} catch ( e ) {

    											if ( jQuery.Deferred.exceptionHook ) {
    												jQuery.Deferred.exceptionHook( e,
    													process.stackTrace );
    											}

    											// Support: Promises/A+ section 2.3.3.3.4.1
    											// https://promisesaplus.com/#point-61
    											// Ignore post-resolution exceptions
    											if ( depth + 1 >= maxDepth ) {

    												// Only substitute handlers pass on context
    												// and multiple values (non-spec behavior)
    												if ( handler !== Thrower ) {
    													that = undefined;
    													args = [ e ];
    												}

    												deferred.rejectWith( that, args );
    											}
    										}
    									};

    							// Support: Promises/A+ section 2.3.3.3.1
    							// https://promisesaplus.com/#point-57
    							// Re-resolve promises immediately to dodge false rejection from
    							// subsequent errors
    							if ( depth ) {
    								process();
    							} else {

    								// Call an optional hook to record the stack, in case of exception
    								// since it's otherwise lost when execution goes async
    								if ( jQuery.Deferred.getStackHook ) {
    									process.stackTrace = jQuery.Deferred.getStackHook();
    								}
    								window.setTimeout( process );
    							}
    						};
    					}

    					return jQuery.Deferred( function( newDefer ) {

    						// progress_handlers.add( ... )
    						tuples[ 0 ][ 3 ].add(
    							resolve(
    								0,
    								newDefer,
    								isFunction( onProgress ) ?
    									onProgress :
    									Identity,
    								newDefer.notifyWith
    							)
    						);

    						// fulfilled_handlers.add( ... )
    						tuples[ 1 ][ 3 ].add(
    							resolve(
    								0,
    								newDefer,
    								isFunction( onFulfilled ) ?
    									onFulfilled :
    									Identity
    							)
    						);

    						// rejected_handlers.add( ... )
    						tuples[ 2 ][ 3 ].add(
    							resolve(
    								0,
    								newDefer,
    								isFunction( onRejected ) ?
    									onRejected :
    									Thrower
    							)
    						);
    					} ).promise();
    				},

    				// Get a promise for this deferred
    				// If obj is provided, the promise aspect is added to the object
    				promise: function( obj ) {
    					return obj != null ? jQuery.extend( obj, promise ) : promise;
    				}
    			},
    			deferred = {};

    		// Add list-specific methods
    		jQuery.each( tuples, function( i, tuple ) {
    			var list = tuple[ 2 ],
    				stateString = tuple[ 5 ];

    			// promise.progress = list.add
    			// promise.done = list.add
    			// promise.fail = list.add
    			promise[ tuple[ 1 ] ] = list.add;

    			// Handle state
    			if ( stateString ) {
    				list.add(
    					function() {

    						// state = "resolved" (i.e., fulfilled)
    						// state = "rejected"
    						state = stateString;
    					},

    					// rejected_callbacks.disable
    					// fulfilled_callbacks.disable
    					tuples[ 3 - i ][ 2 ].disable,

    					// rejected_handlers.disable
    					// fulfilled_handlers.disable
    					tuples[ 3 - i ][ 3 ].disable,

    					// progress_callbacks.lock
    					tuples[ 0 ][ 2 ].lock,

    					// progress_handlers.lock
    					tuples[ 0 ][ 3 ].lock
    				);
    			}

    			// progress_handlers.fire
    			// fulfilled_handlers.fire
    			// rejected_handlers.fire
    			list.add( tuple[ 3 ].fire );

    			// deferred.notify = function() { deferred.notifyWith(...) }
    			// deferred.resolve = function() { deferred.resolveWith(...) }
    			// deferred.reject = function() { deferred.rejectWith(...) }
    			deferred[ tuple[ 0 ] ] = function() {
    				deferred[ tuple[ 0 ] + "With" ]( this === deferred ? undefined : this, arguments );
    				return this;
    			};

    			// deferred.notifyWith = list.fireWith
    			// deferred.resolveWith = list.fireWith
    			// deferred.rejectWith = list.fireWith
    			deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
    		} );

    		// Make the deferred a promise
    		promise.promise( deferred );

    		// Call given func if any
    		if ( func ) {
    			func.call( deferred, deferred );
    		}

    		// All done!
    		return deferred;
    	},

    	// Deferred helper
    	when: function( singleValue ) {
    		var

    			// count of uncompleted subordinates
    			remaining = arguments.length,

    			// count of unprocessed arguments
    			i = remaining,

    			// subordinate fulfillment data
    			resolveContexts = Array( i ),
    			resolveValues = slice.call( arguments ),

    			// the master Deferred
    			master = jQuery.Deferred(),

    			// subordinate callback factory
    			updateFunc = function( i ) {
    				return function( value ) {
    					resolveContexts[ i ] = this;
    					resolveValues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
    					if ( !( --remaining ) ) {
    						master.resolveWith( resolveContexts, resolveValues );
    					}
    				};
    			};

    		// Single- and empty arguments are adopted like Promise.resolve
    		if ( remaining <= 1 ) {
    			adoptValue( singleValue, master.done( updateFunc( i ) ).resolve, master.reject,
    				!remaining );

    			// Use .then() to unwrap secondary thenables (cf. gh-3000)
    			if ( master.state() === "pending" ||
    				isFunction( resolveValues[ i ] && resolveValues[ i ].then ) ) {

    				return master.then();
    			}
    		}

    		// Multiple arguments are aggregated like Promise.all array elements
    		while ( i-- ) {
    			adoptValue( resolveValues[ i ], updateFunc( i ), master.reject );
    		}

    		return master.promise();
    	}
    } );


    // These usually indicate a programmer mistake during development,
    // warn about them ASAP rather than swallowing them by default.
    var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

    jQuery.Deferred.exceptionHook = function( error, stack ) {

    	// Support: IE 8 - 9 only
    	// Console exists when dev tools are open, which can happen at any time
    	if ( window.console && window.console.warn && error && rerrorNames.test( error.name ) ) {
    		window.console.warn( "jQuery.Deferred exception: " + error.message, error.stack, stack );
    	}
    };




    jQuery.readyException = function( error ) {
    	window.setTimeout( function() {
    		throw error;
    	} );
    };




    // The deferred used on DOM ready
    var readyList = jQuery.Deferred();

    jQuery.fn.ready = function( fn ) {

    	readyList
    		.then( fn )

    		// Wrap jQuery.readyException in a function so that the lookup
    		// happens at the time of error handling instead of callback
    		// registration.
    		.catch( function( error ) {
    			jQuery.readyException( error );
    		} );

    	return this;
    };

    jQuery.extend( {

    	// Is the DOM ready to be used? Set to true once it occurs.
    	isReady: false,

    	// A counter to track how many items to wait for before
    	// the ready event fires. See #6781
    	readyWait: 1,

    	// Handle when the DOM is ready
    	ready: function( wait ) {

    		// Abort if there are pending holds or we're already ready
    		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
    			return;
    		}

    		// Remember that the DOM is ready
    		jQuery.isReady = true;

    		// If a normal DOM Ready event fired, decrement, and wait if need be
    		if ( wait !== true && --jQuery.readyWait > 0 ) {
    			return;
    		}

    		// If there are functions bound, to execute
    		readyList.resolveWith( document, [ jQuery ] );
    	}
    } );

    jQuery.ready.then = readyList.then;

    // The ready event handler and self cleanup method
    function completed() {
    	document.removeEventListener( "DOMContentLoaded", completed );
    	window.removeEventListener( "load", completed );
    	jQuery.ready();
    }

    // Catch cases where $(document).ready() is called
    // after the browser event has already occurred.
    // Support: IE <=9 - 10 only
    // Older IE sometimes signals "interactive" too soon
    if ( document.readyState === "complete" ||
    	( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

    	// Handle it asynchronously to allow scripts the opportunity to delay ready
    	window.setTimeout( jQuery.ready );

    } else {

    	// Use the handy event callback
    	document.addEventListener( "DOMContentLoaded", completed );

    	// A fallback to window.onload, that will always work
    	window.addEventListener( "load", completed );
    }




    // Multifunctional method to get and set values of a collection
    // The value/s can optionally be executed if it's a function
    var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
    	var i = 0,
    		len = elems.length,
    		bulk = key == null;

    	// Sets many values
    	if ( toType( key ) === "object" ) {
    		chainable = true;
    		for ( i in key ) {
    			access( elems, fn, i, key[ i ], true, emptyGet, raw );
    		}

    	// Sets one value
    	} else if ( value !== undefined ) {
    		chainable = true;

    		if ( !isFunction( value ) ) {
    			raw = true;
    		}

    		if ( bulk ) {

    			// Bulk operations run against the entire set
    			if ( raw ) {
    				fn.call( elems, value );
    				fn = null;

    			// ...except when executing function values
    			} else {
    				bulk = fn;
    				fn = function( elem, key, value ) {
    					return bulk.call( jQuery( elem ), value );
    				};
    			}
    		}

    		if ( fn ) {
    			for ( ; i < len; i++ ) {
    				fn(
    					elems[ i ], key, raw ?
    					value :
    					value.call( elems[ i ], i, fn( elems[ i ], key ) )
    				);
    			}
    		}
    	}

    	if ( chainable ) {
    		return elems;
    	}

    	// Gets
    	if ( bulk ) {
    		return fn.call( elems );
    	}

    	return len ? fn( elems[ 0 ], key ) : emptyGet;
    };


    // Matches dashed string for camelizing
    var rmsPrefix = /^-ms-/,
    	rdashAlpha = /-([a-z])/g;

    // Used by camelCase as callback to replace()
    function fcamelCase( all, letter ) {
    	return letter.toUpperCase();
    }

    // Convert dashed to camelCase; used by the css and data modules
    // Support: IE <=9 - 11, Edge 12 - 15
    // Microsoft forgot to hump their vendor prefix (#9572)
    function camelCase( string ) {
    	return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
    }
    var acceptData = function( owner ) {

    	// Accepts only:
    	//  - Node
    	//    - Node.ELEMENT_NODE
    	//    - Node.DOCUMENT_NODE
    	//  - Object
    	//    - Any
    	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
    };




    function Data() {
    	this.expando = jQuery.expando + Data.uid++;
    }

    Data.uid = 1;

    Data.prototype = {

    	cache: function( owner ) {

    		// Check if the owner object already has a cache
    		var value = owner[ this.expando ];

    		// If not, create one
    		if ( !value ) {
    			value = {};

    			// We can accept data for non-element nodes in modern browsers,
    			// but we should not, see #8335.
    			// Always return an empty object.
    			if ( acceptData( owner ) ) {

    				// If it is a node unlikely to be stringify-ed or looped over
    				// use plain assignment
    				if ( owner.nodeType ) {
    					owner[ this.expando ] = value;

    				// Otherwise secure it in a non-enumerable property
    				// configurable must be true to allow the property to be
    				// deleted when data is removed
    				} else {
    					Object.defineProperty( owner, this.expando, {
    						value: value,
    						configurable: true
    					} );
    				}
    			}
    		}

    		return value;
    	},
    	set: function( owner, data, value ) {
    		var prop,
    			cache = this.cache( owner );

    		// Handle: [ owner, key, value ] args
    		// Always use camelCase key (gh-2257)
    		if ( typeof data === "string" ) {
    			cache[ camelCase( data ) ] = value;

    		// Handle: [ owner, { properties } ] args
    		} else {

    			// Copy the properties one-by-one to the cache object
    			for ( prop in data ) {
    				cache[ camelCase( prop ) ] = data[ prop ];
    			}
    		}
    		return cache;
    	},
    	get: function( owner, key ) {
    		return key === undefined ?
    			this.cache( owner ) :

    			// Always use camelCase key (gh-2257)
    			owner[ this.expando ] && owner[ this.expando ][ camelCase( key ) ];
    	},
    	access: function( owner, key, value ) {

    		// In cases where either:
    		//
    		//   1. No key was specified
    		//   2. A string key was specified, but no value provided
    		//
    		// Take the "read" path and allow the get method to determine
    		// which value to return, respectively either:
    		//
    		//   1. The entire cache object
    		//   2. The data stored at the key
    		//
    		if ( key === undefined ||
    				( ( key && typeof key === "string" ) && value === undefined ) ) {

    			return this.get( owner, key );
    		}

    		// When the key is not a string, or both a key and value
    		// are specified, set or extend (existing objects) with either:
    		//
    		//   1. An object of properties
    		//   2. A key and value
    		//
    		this.set( owner, key, value );

    		// Since the "set" path can have two possible entry points
    		// return the expected data based on which path was taken[*]
    		return value !== undefined ? value : key;
    	},
    	remove: function( owner, key ) {
    		var i,
    			cache = owner[ this.expando ];

    		if ( cache === undefined ) {
    			return;
    		}

    		if ( key !== undefined ) {

    			// Support array or space separated string of keys
    			if ( Array.isArray( key ) ) {

    				// If key is an array of keys...
    				// We always set camelCase keys, so remove that.
    				key = key.map( camelCase );
    			} else {
    				key = camelCase( key );

    				// If a key with the spaces exists, use it.
    				// Otherwise, create an array by matching non-whitespace
    				key = key in cache ?
    					[ key ] :
    					( key.match( rnothtmlwhite ) || [] );
    			}

    			i = key.length;

    			while ( i-- ) {
    				delete cache[ key[ i ] ];
    			}
    		}

    		// Remove the expando if there's no more data
    		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

    			// Support: Chrome <=35 - 45
    			// Webkit & Blink performance suffers when deleting properties
    			// from DOM nodes, so set to undefined instead
    			// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
    			if ( owner.nodeType ) {
    				owner[ this.expando ] = undefined;
    			} else {
    				delete owner[ this.expando ];
    			}
    		}
    	},
    	hasData: function( owner ) {
    		var cache = owner[ this.expando ];
    		return cache !== undefined && !jQuery.isEmptyObject( cache );
    	}
    };
    var dataPriv = new Data();

    var dataUser = new Data();



    //	Implementation Summary
    //
    //	1. Enforce API surface and semantic compatibility with 1.9.x branch
    //	2. Improve the module's maintainability by reducing the storage
    //		paths to a single mechanism.
    //	3. Use the same single mechanism to support "private" and "user" data.
    //	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
    //	5. Avoid exposing implementation details on user objects (eg. expando properties)
    //	6. Provide a clear path for implementation upgrade to WeakMap in 2014

    var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
    	rmultiDash = /[A-Z]/g;

    function getData( data ) {
    	if ( data === "true" ) {
    		return true;
    	}

    	if ( data === "false" ) {
    		return false;
    	}

    	if ( data === "null" ) {
    		return null;
    	}

    	// Only convert to a number if it doesn't change the string
    	if ( data === +data + "" ) {
    		return +data;
    	}

    	if ( rbrace.test( data ) ) {
    		return JSON.parse( data );
    	}

    	return data;
    }

    function dataAttr( elem, key, data ) {
    	var name;

    	// If nothing was found internally, try to fetch any
    	// data from the HTML5 data-* attribute
    	if ( data === undefined && elem.nodeType === 1 ) {
    		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
    		data = elem.getAttribute( name );

    		if ( typeof data === "string" ) {
    			try {
    				data = getData( data );
    			} catch ( e ) {}

    			// Make sure we set the data so it isn't changed later
    			dataUser.set( elem, key, data );
    		} else {
    			data = undefined;
    		}
    	}
    	return data;
    }

    jQuery.extend( {
    	hasData: function( elem ) {
    		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
    	},

    	data: function( elem, name, data ) {
    		return dataUser.access( elem, name, data );
    	},

    	removeData: function( elem, name ) {
    		dataUser.remove( elem, name );
    	},

    	// TODO: Now that all calls to _data and _removeData have been replaced
    	// with direct calls to dataPriv methods, these can be deprecated.
    	_data: function( elem, name, data ) {
    		return dataPriv.access( elem, name, data );
    	},

    	_removeData: function( elem, name ) {
    		dataPriv.remove( elem, name );
    	}
    } );

    jQuery.fn.extend( {
    	data: function( key, value ) {
    		var i, name, data,
    			elem = this[ 0 ],
    			attrs = elem && elem.attributes;

    		// Gets all values
    		if ( key === undefined ) {
    			if ( this.length ) {
    				data = dataUser.get( elem );

    				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
    					i = attrs.length;
    					while ( i-- ) {

    						// Support: IE 11 only
    						// The attrs elements can be null (#14894)
    						if ( attrs[ i ] ) {
    							name = attrs[ i ].name;
    							if ( name.indexOf( "data-" ) === 0 ) {
    								name = camelCase( name.slice( 5 ) );
    								dataAttr( elem, name, data[ name ] );
    							}
    						}
    					}
    					dataPriv.set( elem, "hasDataAttrs", true );
    				}
    			}

    			return data;
    		}

    		// Sets multiple values
    		if ( typeof key === "object" ) {
    			return this.each( function() {
    				dataUser.set( this, key );
    			} );
    		}

    		return access( this, function( value ) {
    			var data;

    			// The calling jQuery object (element matches) is not empty
    			// (and therefore has an element appears at this[ 0 ]) and the
    			// `value` parameter was not undefined. An empty jQuery object
    			// will result in `undefined` for elem = this[ 0 ] which will
    			// throw an exception if an attempt to read a data cache is made.
    			if ( elem && value === undefined ) {

    				// Attempt to get data from the cache
    				// The key will always be camelCased in Data
    				data = dataUser.get( elem, key );
    				if ( data !== undefined ) {
    					return data;
    				}

    				// Attempt to "discover" the data in
    				// HTML5 custom data-* attrs
    				data = dataAttr( elem, key );
    				if ( data !== undefined ) {
    					return data;
    				}

    				// We tried really hard, but the data doesn't exist.
    				return;
    			}

    			// Set the data...
    			this.each( function() {

    				// We always store the camelCased key
    				dataUser.set( this, key, value );
    			} );
    		}, null, value, arguments.length > 1, null, true );
    	},

    	removeData: function( key ) {
    		return this.each( function() {
    			dataUser.remove( this, key );
    		} );
    	}
    } );


    jQuery.extend( {
    	queue: function( elem, type, data ) {
    		var queue;

    		if ( elem ) {
    			type = ( type || "fx" ) + "queue";
    			queue = dataPriv.get( elem, type );

    			// Speed up dequeue by getting out quickly if this is just a lookup
    			if ( data ) {
    				if ( !queue || Array.isArray( data ) ) {
    					queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
    				} else {
    					queue.push( data );
    				}
    			}
    			return queue || [];
    		}
    	},

    	dequeue: function( elem, type ) {
    		type = type || "fx";

    		var queue = jQuery.queue( elem, type ),
    			startLength = queue.length,
    			fn = queue.shift(),
    			hooks = jQuery._queueHooks( elem, type ),
    			next = function() {
    				jQuery.dequeue( elem, type );
    			};

    		// If the fx queue is dequeued, always remove the progress sentinel
    		if ( fn === "inprogress" ) {
    			fn = queue.shift();
    			startLength--;
    		}

    		if ( fn ) {

    			// Add a progress sentinel to prevent the fx queue from being
    			// automatically dequeued
    			if ( type === "fx" ) {
    				queue.unshift( "inprogress" );
    			}

    			// Clear up the last queue stop function
    			delete hooks.stop;
    			fn.call( elem, next, hooks );
    		}

    		if ( !startLength && hooks ) {
    			hooks.empty.fire();
    		}
    	},

    	// Not public - generate a queueHooks object, or return the current one
    	_queueHooks: function( elem, type ) {
    		var key = type + "queueHooks";
    		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
    			empty: jQuery.Callbacks( "once memory" ).add( function() {
    				dataPriv.remove( elem, [ type + "queue", key ] );
    			} )
    		} );
    	}
    } );

    jQuery.fn.extend( {
    	queue: function( type, data ) {
    		var setter = 2;

    		if ( typeof type !== "string" ) {
    			data = type;
    			type = "fx";
    			setter--;
    		}

    		if ( arguments.length < setter ) {
    			return jQuery.queue( this[ 0 ], type );
    		}

    		return data === undefined ?
    			this :
    			this.each( function() {
    				var queue = jQuery.queue( this, type, data );

    				// Ensure a hooks for this queue
    				jQuery._queueHooks( this, type );

    				if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
    					jQuery.dequeue( this, type );
    				}
    			} );
    	},
    	dequeue: function( type ) {
    		return this.each( function() {
    			jQuery.dequeue( this, type );
    		} );
    	},
    	clearQueue: function( type ) {
    		return this.queue( type || "fx", [] );
    	},

    	// Get a promise resolved when queues of a certain type
    	// are emptied (fx is the type by default)
    	promise: function( type, obj ) {
    		var tmp,
    			count = 1,
    			defer = jQuery.Deferred(),
    			elements = this,
    			i = this.length,
    			resolve = function() {
    				if ( !( --count ) ) {
    					defer.resolveWith( elements, [ elements ] );
    				}
    			};

    		if ( typeof type !== "string" ) {
    			obj = type;
    			type = undefined;
    		}
    		type = type || "fx";

    		while ( i-- ) {
    			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
    			if ( tmp && tmp.empty ) {
    				count++;
    				tmp.empty.add( resolve );
    			}
    		}
    		resolve();
    		return defer.promise( obj );
    	}
    } );
    var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

    var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


    var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

    var documentElement = document.documentElement;



    	var isAttached = function( elem ) {
    			return jQuery.contains( elem.ownerDocument, elem );
    		},
    		composed = { composed: true };

    	// Support: IE 9 - 11+, Edge 12 - 18+, iOS 10.0 - 10.2 only
    	// Check attachment across shadow DOM boundaries when possible (gh-3504)
    	// Support: iOS 10.0-10.2 only
    	// Early iOS 10 versions support `attachShadow` but not `getRootNode`,
    	// leading to errors. We need to check for `getRootNode`.
    	if ( documentElement.getRootNode ) {
    		isAttached = function( elem ) {
    			return jQuery.contains( elem.ownerDocument, elem ) ||
    				elem.getRootNode( composed ) === elem.ownerDocument;
    		};
    	}
    var isHiddenWithinTree = function( elem, el ) {

    		// isHiddenWithinTree might be called from jQuery#filter function;
    		// in that case, element will be second argument
    		elem = el || elem;

    		// Inline style trumps all
    		return elem.style.display === "none" ||
    			elem.style.display === "" &&

    			// Otherwise, check computed style
    			// Support: Firefox <=43 - 45
    			// Disconnected elements can have computed display: none, so first confirm that elem is
    			// in the document.
    			isAttached( elem ) &&

    			jQuery.css( elem, "display" ) === "none";
    	};

    var swap = function( elem, options, callback, args ) {
    	var ret, name,
    		old = {};

    	// Remember the old values, and insert the new ones
    	for ( name in options ) {
    		old[ name ] = elem.style[ name ];
    		elem.style[ name ] = options[ name ];
    	}

    	ret = callback.apply( elem, args || [] );

    	// Revert the old values
    	for ( name in options ) {
    		elem.style[ name ] = old[ name ];
    	}

    	return ret;
    };




    function adjustCSS( elem, prop, valueParts, tween ) {
    	var adjusted, scale,
    		maxIterations = 20,
    		currentValue = tween ?
    			function() {
    				return tween.cur();
    			} :
    			function() {
    				return jQuery.css( elem, prop, "" );
    			},
    		initial = currentValue(),
    		unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

    		// Starting value computation is required for potential unit mismatches
    		initialInUnit = elem.nodeType &&
    			( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
    			rcssNum.exec( jQuery.css( elem, prop ) );

    	if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

    		// Support: Firefox <=54
    		// Halve the iteration target value to prevent interference from CSS upper bounds (gh-2144)
    		initial = initial / 2;

    		// Trust units reported by jQuery.css
    		unit = unit || initialInUnit[ 3 ];

    		// Iteratively approximate from a nonzero starting point
    		initialInUnit = +initial || 1;

    		while ( maxIterations-- ) {

    			// Evaluate and update our best guess (doubling guesses that zero out).
    			// Finish if the scale equals or crosses 1 (making the old*new product non-positive).
    			jQuery.style( elem, prop, initialInUnit + unit );
    			if ( ( 1 - scale ) * ( 1 - ( scale = currentValue() / initial || 0.5 ) ) <= 0 ) {
    				maxIterations = 0;
    			}
    			initialInUnit = initialInUnit / scale;

    		}

    		initialInUnit = initialInUnit * 2;
    		jQuery.style( elem, prop, initialInUnit + unit );

    		// Make sure we update the tween properties later on
    		valueParts = valueParts || [];
    	}

    	if ( valueParts ) {
    		initialInUnit = +initialInUnit || +initial || 0;

    		// Apply relative offset (+=/-=) if specified
    		adjusted = valueParts[ 1 ] ?
    			initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
    			+valueParts[ 2 ];
    		if ( tween ) {
    			tween.unit = unit;
    			tween.start = initialInUnit;
    			tween.end = adjusted;
    		}
    	}
    	return adjusted;
    }


    var defaultDisplayMap = {};

    function getDefaultDisplay( elem ) {
    	var temp,
    		doc = elem.ownerDocument,
    		nodeName = elem.nodeName,
    		display = defaultDisplayMap[ nodeName ];

    	if ( display ) {
    		return display;
    	}

    	temp = doc.body.appendChild( doc.createElement( nodeName ) );
    	display = jQuery.css( temp, "display" );

    	temp.parentNode.removeChild( temp );

    	if ( display === "none" ) {
    		display = "block";
    	}
    	defaultDisplayMap[ nodeName ] = display;

    	return display;
    }

    function showHide( elements, show ) {
    	var display, elem,
    		values = [],
    		index = 0,
    		length = elements.length;

    	// Determine new display value for elements that need to change
    	for ( ; index < length; index++ ) {
    		elem = elements[ index ];
    		if ( !elem.style ) {
    			continue;
    		}

    		display = elem.style.display;
    		if ( show ) {

    			// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
    			// check is required in this first loop unless we have a nonempty display value (either
    			// inline or about-to-be-restored)
    			if ( display === "none" ) {
    				values[ index ] = dataPriv.get( elem, "display" ) || null;
    				if ( !values[ index ] ) {
    					elem.style.display = "";
    				}
    			}
    			if ( elem.style.display === "" && isHiddenWithinTree( elem ) ) {
    				values[ index ] = getDefaultDisplay( elem );
    			}
    		} else {
    			if ( display !== "none" ) {
    				values[ index ] = "none";

    				// Remember what we're overwriting
    				dataPriv.set( elem, "display", display );
    			}
    		}
    	}

    	// Set the display of the elements in a second loop to avoid constant reflow
    	for ( index = 0; index < length; index++ ) {
    		if ( values[ index ] != null ) {
    			elements[ index ].style.display = values[ index ];
    		}
    	}

    	return elements;
    }

    jQuery.fn.extend( {
    	show: function() {
    		return showHide( this, true );
    	},
    	hide: function() {
    		return showHide( this );
    	},
    	toggle: function( state ) {
    		if ( typeof state === "boolean" ) {
    			return state ? this.show() : this.hide();
    		}

    		return this.each( function() {
    			if ( isHiddenWithinTree( this ) ) {
    				jQuery( this ).show();
    			} else {
    				jQuery( this ).hide();
    			}
    		} );
    	}
    } );
    var rcheckableType = ( /^(?:checkbox|radio)$/i );

    var rtagName = ( /<([a-z][^\/\0>\x20\t\r\n\f]*)/i );

    var rscriptType = ( /^$|^module$|\/(?:java|ecma)script/i );



    // We have to close these tags to support XHTML (#13200)
    var wrapMap = {

    	// Support: IE <=9 only
    	option: [ 1, "<select multiple='multiple'>", "</select>" ],

    	// XHTML parsers do not magically insert elements in the
    	// same way that tag soup parsers do. So we cannot shorten
    	// this by omitting <tbody> or other required elements.
    	thead: [ 1, "<table>", "</table>" ],
    	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
    	tr: [ 2, "<table><tbody>", "</tbody></table>" ],
    	td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

    	_default: [ 0, "", "" ]
    };

    // Support: IE <=9 only
    wrapMap.optgroup = wrapMap.option;

    wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
    wrapMap.th = wrapMap.td;


    function getAll( context, tag ) {

    	// Support: IE <=9 - 11 only
    	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
    	var ret;

    	if ( typeof context.getElementsByTagName !== "undefined" ) {
    		ret = context.getElementsByTagName( tag || "*" );

    	} else if ( typeof context.querySelectorAll !== "undefined" ) {
    		ret = context.querySelectorAll( tag || "*" );

    	} else {
    		ret = [];
    	}

    	if ( tag === undefined || tag && nodeName( context, tag ) ) {
    		return jQuery.merge( [ context ], ret );
    	}

    	return ret;
    }


    // Mark scripts as having already been evaluated
    function setGlobalEval( elems, refElements ) {
    	var i = 0,
    		l = elems.length;

    	for ( ; i < l; i++ ) {
    		dataPriv.set(
    			elems[ i ],
    			"globalEval",
    			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
    		);
    	}
    }


    var rhtml = /<|&#?\w+;/;

    function buildFragment( elems, context, scripts, selection, ignored ) {
    	var elem, tmp, tag, wrap, attached, j,
    		fragment = context.createDocumentFragment(),
    		nodes = [],
    		i = 0,
    		l = elems.length;

    	for ( ; i < l; i++ ) {
    		elem = elems[ i ];

    		if ( elem || elem === 0 ) {

    			// Add nodes directly
    			if ( toType( elem ) === "object" ) {

    				// Support: Android <=4.0 only, PhantomJS 1 only
    				// push.apply(_, arraylike) throws on ancient WebKit
    				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

    			// Convert non-html into a text node
    			} else if ( !rhtml.test( elem ) ) {
    				nodes.push( context.createTextNode( elem ) );

    			// Convert html into DOM nodes
    			} else {
    				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

    				// Deserialize a standard representation
    				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
    				wrap = wrapMap[ tag ] || wrapMap._default;
    				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

    				// Descend through wrappers to the right content
    				j = wrap[ 0 ];
    				while ( j-- ) {
    					tmp = tmp.lastChild;
    				}

    				// Support: Android <=4.0 only, PhantomJS 1 only
    				// push.apply(_, arraylike) throws on ancient WebKit
    				jQuery.merge( nodes, tmp.childNodes );

    				// Remember the top-level container
    				tmp = fragment.firstChild;

    				// Ensure the created nodes are orphaned (#12392)
    				tmp.textContent = "";
    			}
    		}
    	}

    	// Remove wrapper from fragment
    	fragment.textContent = "";

    	i = 0;
    	while ( ( elem = nodes[ i++ ] ) ) {

    		// Skip elements already in the context collection (trac-4087)
    		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
    			if ( ignored ) {
    				ignored.push( elem );
    			}
    			continue;
    		}

    		attached = isAttached( elem );

    		// Append to fragment
    		tmp = getAll( fragment.appendChild( elem ), "script" );

    		// Preserve script evaluation history
    		if ( attached ) {
    			setGlobalEval( tmp );
    		}

    		// Capture executables
    		if ( scripts ) {
    			j = 0;
    			while ( ( elem = tmp[ j++ ] ) ) {
    				if ( rscriptType.test( elem.type || "" ) ) {
    					scripts.push( elem );
    				}
    			}
    		}
    	}

    	return fragment;
    }


    ( function() {
    	var fragment = document.createDocumentFragment(),
    		div = fragment.appendChild( document.createElement( "div" ) ),
    		input = document.createElement( "input" );

    	// Support: Android 4.0 - 4.3 only
    	// Check state lost if the name is set (#11217)
    	// Support: Windows Web Apps (WWA)
    	// `name` and `type` must use .setAttribute for WWA (#14901)
    	input.setAttribute( "type", "radio" );
    	input.setAttribute( "checked", "checked" );
    	input.setAttribute( "name", "t" );

    	div.appendChild( input );

    	// Support: Android <=4.1 only
    	// Older WebKit doesn't clone checked state correctly in fragments
    	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

    	// Support: IE <=11 only
    	// Make sure textarea (and checkbox) defaultValue is properly cloned
    	div.innerHTML = "<textarea>x</textarea>";
    	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
    } )();


    var
    	rkeyEvent = /^key/,
    	rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
    	rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

    function returnTrue() {
    	return true;
    }

    function returnFalse() {
    	return false;
    }

    // Support: IE <=9 - 11+
    // focus() and blur() are asynchronous, except when they are no-op.
    // So expect focus to be synchronous when the element is already active,
    // and blur to be synchronous when the element is not already active.
    // (focus and blur are always synchronous in other supported browsers,
    // this just defines when we can count on it).
    function expectSync( elem, type ) {
    	return ( elem === safeActiveElement() ) === ( type === "focus" );
    }

    // Support: IE <=9 only
    // Accessing document.activeElement can throw unexpectedly
    // https://bugs.jquery.com/ticket/13393
    function safeActiveElement() {
    	try {
    		return document.activeElement;
    	} catch ( err ) { }
    }

    function on( elem, types, selector, data, fn, one ) {
    	var origFn, type;

    	// Types can be a map of types/handlers
    	if ( typeof types === "object" ) {

    		// ( types-Object, selector, data )
    		if ( typeof selector !== "string" ) {

    			// ( types-Object, data )
    			data = data || selector;
    			selector = undefined;
    		}
    		for ( type in types ) {
    			on( elem, type, selector, data, types[ type ], one );
    		}
    		return elem;
    	}

    	if ( data == null && fn == null ) {

    		// ( types, fn )
    		fn = selector;
    		data = selector = undefined;
    	} else if ( fn == null ) {
    		if ( typeof selector === "string" ) {

    			// ( types, selector, fn )
    			fn = data;
    			data = undefined;
    		} else {

    			// ( types, data, fn )
    			fn = data;
    			data = selector;
    			selector = undefined;
    		}
    	}
    	if ( fn === false ) {
    		fn = returnFalse;
    	} else if ( !fn ) {
    		return elem;
    	}

    	if ( one === 1 ) {
    		origFn = fn;
    		fn = function( event ) {

    			// Can use an empty set, since event contains the info
    			jQuery().off( event );
    			return origFn.apply( this, arguments );
    		};

    		// Use same guid so caller can remove using origFn
    		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
    	}
    	return elem.each( function() {
    		jQuery.event.add( this, types, fn, data, selector );
    	} );
    }

    /*
     * Helper functions for managing events -- not part of the public interface.
     * Props to Dean Edwards' addEvent library for many of the ideas.
     */
    jQuery.event = {

    	global: {},

    	add: function( elem, types, handler, data, selector ) {

    		var handleObjIn, eventHandle, tmp,
    			events, t, handleObj,
    			special, handlers, type, namespaces, origType,
    			elemData = dataPriv.get( elem );

    		// Don't attach events to noData or text/comment nodes (but allow plain objects)
    		if ( !elemData ) {
    			return;
    		}

    		// Caller can pass in an object of custom data in lieu of the handler
    		if ( handler.handler ) {
    			handleObjIn = handler;
    			handler = handleObjIn.handler;
    			selector = handleObjIn.selector;
    		}

    		// Ensure that invalid selectors throw exceptions at attach time
    		// Evaluate against documentElement in case elem is a non-element node (e.g., document)
    		if ( selector ) {
    			jQuery.find.matchesSelector( documentElement, selector );
    		}

    		// Make sure that the handler has a unique ID, used to find/remove it later
    		if ( !handler.guid ) {
    			handler.guid = jQuery.guid++;
    		}

    		// Init the element's event structure and main handler, if this is the first
    		if ( !( events = elemData.events ) ) {
    			events = elemData.events = {};
    		}
    		if ( !( eventHandle = elemData.handle ) ) {
    			eventHandle = elemData.handle = function( e ) {

    				// Discard the second event of a jQuery.event.trigger() and
    				// when an event is called after a page has unloaded
    				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
    					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
    			};
    		}

    		// Handle multiple events separated by a space
    		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
    		t = types.length;
    		while ( t-- ) {
    			tmp = rtypenamespace.exec( types[ t ] ) || [];
    			type = origType = tmp[ 1 ];
    			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

    			// There *must* be a type, no attaching namespace-only handlers
    			if ( !type ) {
    				continue;
    			}

    			// If event changes its type, use the special event handlers for the changed type
    			special = jQuery.event.special[ type ] || {};

    			// If selector defined, determine special event api type, otherwise given type
    			type = ( selector ? special.delegateType : special.bindType ) || type;

    			// Update special based on newly reset type
    			special = jQuery.event.special[ type ] || {};

    			// handleObj is passed to all event handlers
    			handleObj = jQuery.extend( {
    				type: type,
    				origType: origType,
    				data: data,
    				handler: handler,
    				guid: handler.guid,
    				selector: selector,
    				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
    				namespace: namespaces.join( "." )
    			}, handleObjIn );

    			// Init the event handler queue if we're the first
    			if ( !( handlers = events[ type ] ) ) {
    				handlers = events[ type ] = [];
    				handlers.delegateCount = 0;

    				// Only use addEventListener if the special events handler returns false
    				if ( !special.setup ||
    					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

    					if ( elem.addEventListener ) {
    						elem.addEventListener( type, eventHandle );
    					}
    				}
    			}

    			if ( special.add ) {
    				special.add.call( elem, handleObj );

    				if ( !handleObj.handler.guid ) {
    					handleObj.handler.guid = handler.guid;
    				}
    			}

    			// Add to the element's handler list, delegates in front
    			if ( selector ) {
    				handlers.splice( handlers.delegateCount++, 0, handleObj );
    			} else {
    				handlers.push( handleObj );
    			}

    			// Keep track of which events have ever been used, for event optimization
    			jQuery.event.global[ type ] = true;
    		}

    	},

    	// Detach an event or set of events from an element
    	remove: function( elem, types, handler, selector, mappedTypes ) {

    		var j, origCount, tmp,
    			events, t, handleObj,
    			special, handlers, type, namespaces, origType,
    			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

    		if ( !elemData || !( events = elemData.events ) ) {
    			return;
    		}

    		// Once for each type.namespace in types; type may be omitted
    		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
    		t = types.length;
    		while ( t-- ) {
    			tmp = rtypenamespace.exec( types[ t ] ) || [];
    			type = origType = tmp[ 1 ];
    			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

    			// Unbind all events (on this namespace, if provided) for the element
    			if ( !type ) {
    				for ( type in events ) {
    					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
    				}
    				continue;
    			}

    			special = jQuery.event.special[ type ] || {};
    			type = ( selector ? special.delegateType : special.bindType ) || type;
    			handlers = events[ type ] || [];
    			tmp = tmp[ 2 ] &&
    				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

    			// Remove matching events
    			origCount = j = handlers.length;
    			while ( j-- ) {
    				handleObj = handlers[ j ];

    				if ( ( mappedTypes || origType === handleObj.origType ) &&
    					( !handler || handler.guid === handleObj.guid ) &&
    					( !tmp || tmp.test( handleObj.namespace ) ) &&
    					( !selector || selector === handleObj.selector ||
    						selector === "**" && handleObj.selector ) ) {
    					handlers.splice( j, 1 );

    					if ( handleObj.selector ) {
    						handlers.delegateCount--;
    					}
    					if ( special.remove ) {
    						special.remove.call( elem, handleObj );
    					}
    				}
    			}

    			// Remove generic event handler if we removed something and no more handlers exist
    			// (avoids potential for endless recursion during removal of special event handlers)
    			if ( origCount && !handlers.length ) {
    				if ( !special.teardown ||
    					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

    					jQuery.removeEvent( elem, type, elemData.handle );
    				}

    				delete events[ type ];
    			}
    		}

    		// Remove data and the expando if it's no longer used
    		if ( jQuery.isEmptyObject( events ) ) {
    			dataPriv.remove( elem, "handle events" );
    		}
    	},

    	dispatch: function( nativeEvent ) {

    		// Make a writable jQuery.Event from the native event object
    		var event = jQuery.event.fix( nativeEvent );

    		var i, j, ret, matched, handleObj, handlerQueue,
    			args = new Array( arguments.length ),
    			handlers = ( dataPriv.get( this, "events" ) || {} )[ event.type ] || [],
    			special = jQuery.event.special[ event.type ] || {};

    		// Use the fix-ed jQuery.Event rather than the (read-only) native event
    		args[ 0 ] = event;

    		for ( i = 1; i < arguments.length; i++ ) {
    			args[ i ] = arguments[ i ];
    		}

    		event.delegateTarget = this;

    		// Call the preDispatch hook for the mapped type, and let it bail if desired
    		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
    			return;
    		}

    		// Determine handlers
    		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

    		// Run delegates first; they may want to stop propagation beneath us
    		i = 0;
    		while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
    			event.currentTarget = matched.elem;

    			j = 0;
    			while ( ( handleObj = matched.handlers[ j++ ] ) &&
    				!event.isImmediatePropagationStopped() ) {

    				// If the event is namespaced, then each handler is only invoked if it is
    				// specially universal or its namespaces are a superset of the event's.
    				if ( !event.rnamespace || handleObj.namespace === false ||
    					event.rnamespace.test( handleObj.namespace ) ) {

    					event.handleObj = handleObj;
    					event.data = handleObj.data;

    					ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
    						handleObj.handler ).apply( matched.elem, args );

    					if ( ret !== undefined ) {
    						if ( ( event.result = ret ) === false ) {
    							event.preventDefault();
    							event.stopPropagation();
    						}
    					}
    				}
    			}
    		}

    		// Call the postDispatch hook for the mapped type
    		if ( special.postDispatch ) {
    			special.postDispatch.call( this, event );
    		}

    		return event.result;
    	},

    	handlers: function( event, handlers ) {
    		var i, handleObj, sel, matchedHandlers, matchedSelectors,
    			handlerQueue = [],
    			delegateCount = handlers.delegateCount,
    			cur = event.target;

    		// Find delegate handlers
    		if ( delegateCount &&

    			// Support: IE <=9
    			// Black-hole SVG <use> instance trees (trac-13180)
    			cur.nodeType &&

    			// Support: Firefox <=42
    			// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
    			// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
    			// Support: IE 11 only
    			// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
    			!( event.type === "click" && event.button >= 1 ) ) {

    			for ( ; cur !== this; cur = cur.parentNode || this ) {

    				// Don't check non-elements (#13208)
    				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
    				if ( cur.nodeType === 1 && !( event.type === "click" && cur.disabled === true ) ) {
    					matchedHandlers = [];
    					matchedSelectors = {};
    					for ( i = 0; i < delegateCount; i++ ) {
    						handleObj = handlers[ i ];

    						// Don't conflict with Object.prototype properties (#13203)
    						sel = handleObj.selector + " ";

    						if ( matchedSelectors[ sel ] === undefined ) {
    							matchedSelectors[ sel ] = handleObj.needsContext ?
    								jQuery( sel, this ).index( cur ) > -1 :
    								jQuery.find( sel, this, null, [ cur ] ).length;
    						}
    						if ( matchedSelectors[ sel ] ) {
    							matchedHandlers.push( handleObj );
    						}
    					}
    					if ( matchedHandlers.length ) {
    						handlerQueue.push( { elem: cur, handlers: matchedHandlers } );
    					}
    				}
    			}
    		}

    		// Add the remaining (directly-bound) handlers
    		cur = this;
    		if ( delegateCount < handlers.length ) {
    			handlerQueue.push( { elem: cur, handlers: handlers.slice( delegateCount ) } );
    		}

    		return handlerQueue;
    	},

    	addProp: function( name, hook ) {
    		Object.defineProperty( jQuery.Event.prototype, name, {
    			enumerable: true,
    			configurable: true,

    			get: isFunction( hook ) ?
    				function() {
    					if ( this.originalEvent ) {
    							return hook( this.originalEvent );
    					}
    				} :
    				function() {
    					if ( this.originalEvent ) {
    							return this.originalEvent[ name ];
    					}
    				},

    			set: function( value ) {
    				Object.defineProperty( this, name, {
    					enumerable: true,
    					configurable: true,
    					writable: true,
    					value: value
    				} );
    			}
    		} );
    	},

    	fix: function( originalEvent ) {
    		return originalEvent[ jQuery.expando ] ?
    			originalEvent :
    			new jQuery.Event( originalEvent );
    	},

    	special: {
    		load: {

    			// Prevent triggered image.load events from bubbling to window.load
    			noBubble: true
    		},
    		click: {

    			// Utilize native event to ensure correct state for checkable inputs
    			setup: function( data ) {

    				// For mutual compressibility with _default, replace `this` access with a local var.
    				// `|| data` is dead code meant only to preserve the variable through minification.
    				var el = this || data;

    				// Claim the first handler
    				if ( rcheckableType.test( el.type ) &&
    					el.click && nodeName( el, "input" ) ) {

    					// dataPriv.set( el, "click", ... )
    					leverageNative( el, "click", returnTrue );
    				}

    				// Return false to allow normal processing in the caller
    				return false;
    			},
    			trigger: function( data ) {

    				// For mutual compressibility with _default, replace `this` access with a local var.
    				// `|| data` is dead code meant only to preserve the variable through minification.
    				var el = this || data;

    				// Force setup before triggering a click
    				if ( rcheckableType.test( el.type ) &&
    					el.click && nodeName( el, "input" ) ) {

    					leverageNative( el, "click" );
    				}

    				// Return non-false to allow normal event-path propagation
    				return true;
    			},

    			// For cross-browser consistency, suppress native .click() on links
    			// Also prevent it if we're currently inside a leveraged native-event stack
    			_default: function( event ) {
    				var target = event.target;
    				return rcheckableType.test( target.type ) &&
    					target.click && nodeName( target, "input" ) &&
    					dataPriv.get( target, "click" ) ||
    					nodeName( target, "a" );
    			}
    		},

    		beforeunload: {
    			postDispatch: function( event ) {

    				// Support: Firefox 20+
    				// Firefox doesn't alert if the returnValue field is not set.
    				if ( event.result !== undefined && event.originalEvent ) {
    					event.originalEvent.returnValue = event.result;
    				}
    			}
    		}
    	}
    };

    // Ensure the presence of an event listener that handles manually-triggered
    // synthetic events by interrupting progress until reinvoked in response to
    // *native* events that it fires directly, ensuring that state changes have
    // already occurred before other listeners are invoked.
    function leverageNative( el, type, expectSync ) {

    	// Missing expectSync indicates a trigger call, which must force setup through jQuery.event.add
    	if ( !expectSync ) {
    		if ( dataPriv.get( el, type ) === undefined ) {
    			jQuery.event.add( el, type, returnTrue );
    		}
    		return;
    	}

    	// Register the controller as a special universal handler for all event namespaces
    	dataPriv.set( el, type, false );
    	jQuery.event.add( el, type, {
    		namespace: false,
    		handler: function( event ) {
    			var notAsync, result,
    				saved = dataPriv.get( this, type );

    			if ( ( event.isTrigger & 1 ) && this[ type ] ) {

    				// Interrupt processing of the outer synthetic .trigger()ed event
    				// Saved data should be false in such cases, but might be a leftover capture object
    				// from an async native handler (gh-4350)
    				if ( !saved.length ) {

    					// Store arguments for use when handling the inner native event
    					// There will always be at least one argument (an event object), so this array
    					// will not be confused with a leftover capture object.
    					saved = slice.call( arguments );
    					dataPriv.set( this, type, saved );

    					// Trigger the native event and capture its result
    					// Support: IE <=9 - 11+
    					// focus() and blur() are asynchronous
    					notAsync = expectSync( this, type );
    					this[ type ]();
    					result = dataPriv.get( this, type );
    					if ( saved !== result || notAsync ) {
    						dataPriv.set( this, type, false );
    					} else {
    						result = {};
    					}
    					if ( saved !== result ) {

    						// Cancel the outer synthetic event
    						event.stopImmediatePropagation();
    						event.preventDefault();
    						return result.value;
    					}

    				// If this is an inner synthetic event for an event with a bubbling surrogate
    				// (focus or blur), assume that the surrogate already propagated from triggering the
    				// native event and prevent that from happening again here.
    				// This technically gets the ordering wrong w.r.t. to `.trigger()` (in which the
    				// bubbling surrogate propagates *after* the non-bubbling base), but that seems
    				// less bad than duplication.
    				} else if ( ( jQuery.event.special[ type ] || {} ).delegateType ) {
    					event.stopPropagation();
    				}

    			// If this is a native event triggered above, everything is now in order
    			// Fire an inner synthetic event with the original arguments
    			} else if ( saved.length ) {

    				// ...and capture the result
    				dataPriv.set( this, type, {
    					value: jQuery.event.trigger(

    						// Support: IE <=9 - 11+
    						// Extend with the prototype to reset the above stopImmediatePropagation()
    						jQuery.extend( saved[ 0 ], jQuery.Event.prototype ),
    						saved.slice( 1 ),
    						this
    					)
    				} );

    				// Abort handling of the native event
    				event.stopImmediatePropagation();
    			}
    		}
    	} );
    }

    jQuery.removeEvent = function( elem, type, handle ) {

    	// This "if" is needed for plain objects
    	if ( elem.removeEventListener ) {
    		elem.removeEventListener( type, handle );
    	}
    };

    jQuery.Event = function( src, props ) {

    	// Allow instantiation without the 'new' keyword
    	if ( !( this instanceof jQuery.Event ) ) {
    		return new jQuery.Event( src, props );
    	}

    	// Event object
    	if ( src && src.type ) {
    		this.originalEvent = src;
    		this.type = src.type;

    		// Events bubbling up the document may have been marked as prevented
    		// by a handler lower down the tree; reflect the correct value.
    		this.isDefaultPrevented = src.defaultPrevented ||
    				src.defaultPrevented === undefined &&

    				// Support: Android <=2.3 only
    				src.returnValue === false ?
    			returnTrue :
    			returnFalse;

    		// Create target properties
    		// Support: Safari <=6 - 7 only
    		// Target should not be a text node (#504, #13143)
    		this.target = ( src.target && src.target.nodeType === 3 ) ?
    			src.target.parentNode :
    			src.target;

    		this.currentTarget = src.currentTarget;
    		this.relatedTarget = src.relatedTarget;

    	// Event type
    	} else {
    		this.type = src;
    	}

    	// Put explicitly provided properties onto the event object
    	if ( props ) {
    		jQuery.extend( this, props );
    	}

    	// Create a timestamp if incoming event doesn't have one
    	this.timeStamp = src && src.timeStamp || Date.now();

    	// Mark it as fixed
    	this[ jQuery.expando ] = true;
    };

    // jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
    // https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
    jQuery.Event.prototype = {
    	constructor: jQuery.Event,
    	isDefaultPrevented: returnFalse,
    	isPropagationStopped: returnFalse,
    	isImmediatePropagationStopped: returnFalse,
    	isSimulated: false,

    	preventDefault: function() {
    		var e = this.originalEvent;

    		this.isDefaultPrevented = returnTrue;

    		if ( e && !this.isSimulated ) {
    			e.preventDefault();
    		}
    	},
    	stopPropagation: function() {
    		var e = this.originalEvent;

    		this.isPropagationStopped = returnTrue;

    		if ( e && !this.isSimulated ) {
    			e.stopPropagation();
    		}
    	},
    	stopImmediatePropagation: function() {
    		var e = this.originalEvent;

    		this.isImmediatePropagationStopped = returnTrue;

    		if ( e && !this.isSimulated ) {
    			e.stopImmediatePropagation();
    		}

    		this.stopPropagation();
    	}
    };

    // Includes all common event props including KeyEvent and MouseEvent specific props
    jQuery.each( {
    	altKey: true,
    	bubbles: true,
    	cancelable: true,
    	changedTouches: true,
    	ctrlKey: true,
    	detail: true,
    	eventPhase: true,
    	metaKey: true,
    	pageX: true,
    	pageY: true,
    	shiftKey: true,
    	view: true,
    	"char": true,
    	code: true,
    	charCode: true,
    	key: true,
    	keyCode: true,
    	button: true,
    	buttons: true,
    	clientX: true,
    	clientY: true,
    	offsetX: true,
    	offsetY: true,
    	pointerId: true,
    	pointerType: true,
    	screenX: true,
    	screenY: true,
    	targetTouches: true,
    	toElement: true,
    	touches: true,

    	which: function( event ) {
    		var button = event.button;

    		// Add which for key events
    		if ( event.which == null && rkeyEvent.test( event.type ) ) {
    			return event.charCode != null ? event.charCode : event.keyCode;
    		}

    		// Add which for click: 1 === left; 2 === middle; 3 === right
    		if ( !event.which && button !== undefined && rmouseEvent.test( event.type ) ) {
    			if ( button & 1 ) {
    				return 1;
    			}

    			if ( button & 2 ) {
    				return 3;
    			}

    			if ( button & 4 ) {
    				return 2;
    			}

    			return 0;
    		}

    		return event.which;
    	}
    }, jQuery.event.addProp );

    jQuery.each( { focus: "focusin", blur: "focusout" }, function( type, delegateType ) {
    	jQuery.event.special[ type ] = {

    		// Utilize native event if possible so blur/focus sequence is correct
    		setup: function() {

    			// Claim the first handler
    			// dataPriv.set( this, "focus", ... )
    			// dataPriv.set( this, "blur", ... )
    			leverageNative( this, type, expectSync );

    			// Return false to allow normal processing in the caller
    			return false;
    		},
    		trigger: function() {

    			// Force setup before trigger
    			leverageNative( this, type );

    			// Return non-false to allow normal event-path propagation
    			return true;
    		},

    		delegateType: delegateType
    	};
    } );

    // Create mouseenter/leave events using mouseover/out and event-time checks
    // so that event delegation works in jQuery.
    // Do the same for pointerenter/pointerleave and pointerover/pointerout
    //
    // Support: Safari 7 only
    // Safari sends mouseenter too often; see:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=470258
    // for the description of the bug (it existed in older Chrome versions as well).
    jQuery.each( {
    	mouseenter: "mouseover",
    	mouseleave: "mouseout",
    	pointerenter: "pointerover",
    	pointerleave: "pointerout"
    }, function( orig, fix ) {
    	jQuery.event.special[ orig ] = {
    		delegateType: fix,
    		bindType: fix,

    		handle: function( event ) {
    			var ret,
    				target = this,
    				related = event.relatedTarget,
    				handleObj = event.handleObj;

    			// For mouseenter/leave call the handler if related is outside the target.
    			// NB: No relatedTarget if the mouse left/entered the browser window
    			if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
    				event.type = handleObj.origType;
    				ret = handleObj.handler.apply( this, arguments );
    				event.type = fix;
    			}
    			return ret;
    		}
    	};
    } );

    jQuery.fn.extend( {

    	on: function( types, selector, data, fn ) {
    		return on( this, types, selector, data, fn );
    	},
    	one: function( types, selector, data, fn ) {
    		return on( this, types, selector, data, fn, 1 );
    	},
    	off: function( types, selector, fn ) {
    		var handleObj, type;
    		if ( types && types.preventDefault && types.handleObj ) {

    			// ( event )  dispatched jQuery.Event
    			handleObj = types.handleObj;
    			jQuery( types.delegateTarget ).off(
    				handleObj.namespace ?
    					handleObj.origType + "." + handleObj.namespace :
    					handleObj.origType,
    				handleObj.selector,
    				handleObj.handler
    			);
    			return this;
    		}
    		if ( typeof types === "object" ) {

    			// ( types-object [, selector] )
    			for ( type in types ) {
    				this.off( type, selector, types[ type ] );
    			}
    			return this;
    		}
    		if ( selector === false || typeof selector === "function" ) {

    			// ( types [, fn] )
    			fn = selector;
    			selector = undefined;
    		}
    		if ( fn === false ) {
    			fn = returnFalse;
    		}
    		return this.each( function() {
    			jQuery.event.remove( this, types, fn, selector );
    		} );
    	}
    } );


    var

    	/* eslint-disable max-len */

    	// See https://github.com/eslint/eslint/issues/3229
    	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,

    	/* eslint-enable */

    	// Support: IE <=10 - 11, Edge 12 - 13 only
    	// In IE/Edge using regex groups here causes severe slowdowns.
    	// See https://connect.microsoft.com/IE/feedback/details/1736512/
    	rnoInnerhtml = /<script|<style|<link/i,

    	// checked="checked" or checked
    	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
    	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

    // Prefer a tbody over its parent table for containing new rows
    function manipulationTarget( elem, content ) {
    	if ( nodeName( elem, "table" ) &&
    		nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {

    		return jQuery( elem ).children( "tbody" )[ 0 ] || elem;
    	}

    	return elem;
    }

    // Replace/restore the type attribute of script elements for safe DOM manipulation
    function disableScript( elem ) {
    	elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
    	return elem;
    }
    function restoreScript( elem ) {
    	if ( ( elem.type || "" ).slice( 0, 5 ) === "true/" ) {
    		elem.type = elem.type.slice( 5 );
    	} else {
    		elem.removeAttribute( "type" );
    	}

    	return elem;
    }

    function cloneCopyEvent( src, dest ) {
    	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

    	if ( dest.nodeType !== 1 ) {
    		return;
    	}

    	// 1. Copy private data: events, handlers, etc.
    	if ( dataPriv.hasData( src ) ) {
    		pdataOld = dataPriv.access( src );
    		pdataCur = dataPriv.set( dest, pdataOld );
    		events = pdataOld.events;

    		if ( events ) {
    			delete pdataCur.handle;
    			pdataCur.events = {};

    			for ( type in events ) {
    				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
    					jQuery.event.add( dest, type, events[ type ][ i ] );
    				}
    			}
    		}
    	}

    	// 2. Copy user data
    	if ( dataUser.hasData( src ) ) {
    		udataOld = dataUser.access( src );
    		udataCur = jQuery.extend( {}, udataOld );

    		dataUser.set( dest, udataCur );
    	}
    }

    // Fix IE bugs, see support tests
    function fixInput( src, dest ) {
    	var nodeName = dest.nodeName.toLowerCase();

    	// Fails to persist the checked state of a cloned checkbox or radio button.
    	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
    		dest.checked = src.checked;

    	// Fails to return the selected option to the default selected state when cloning options
    	} else if ( nodeName === "input" || nodeName === "textarea" ) {
    		dest.defaultValue = src.defaultValue;
    	}
    }

    function domManip( collection, args, callback, ignored ) {

    	// Flatten any nested arrays
    	args = concat.apply( [], args );

    	var fragment, first, scripts, hasScripts, node, doc,
    		i = 0,
    		l = collection.length,
    		iNoClone = l - 1,
    		value = args[ 0 ],
    		valueIsFunction = isFunction( value );

    	// We can't cloneNode fragments that contain checked, in WebKit
    	if ( valueIsFunction ||
    			( l > 1 && typeof value === "string" &&
    				!support.checkClone && rchecked.test( value ) ) ) {
    		return collection.each( function( index ) {
    			var self = collection.eq( index );
    			if ( valueIsFunction ) {
    				args[ 0 ] = value.call( this, index, self.html() );
    			}
    			domManip( self, args, callback, ignored );
    		} );
    	}

    	if ( l ) {
    		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
    		first = fragment.firstChild;

    		if ( fragment.childNodes.length === 1 ) {
    			fragment = first;
    		}

    		// Require either new content or an interest in ignored elements to invoke the callback
    		if ( first || ignored ) {
    			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
    			hasScripts = scripts.length;

    			// Use the original fragment for the last item
    			// instead of the first because it can end up
    			// being emptied incorrectly in certain situations (#8070).
    			for ( ; i < l; i++ ) {
    				node = fragment;

    				if ( i !== iNoClone ) {
    					node = jQuery.clone( node, true, true );

    					// Keep references to cloned scripts for later restoration
    					if ( hasScripts ) {

    						// Support: Android <=4.0 only, PhantomJS 1 only
    						// push.apply(_, arraylike) throws on ancient WebKit
    						jQuery.merge( scripts, getAll( node, "script" ) );
    					}
    				}

    				callback.call( collection[ i ], node, i );
    			}

    			if ( hasScripts ) {
    				doc = scripts[ scripts.length - 1 ].ownerDocument;

    				// Reenable scripts
    				jQuery.map( scripts, restoreScript );

    				// Evaluate executable scripts on first document insertion
    				for ( i = 0; i < hasScripts; i++ ) {
    					node = scripts[ i ];
    					if ( rscriptType.test( node.type || "" ) &&
    						!dataPriv.access( node, "globalEval" ) &&
    						jQuery.contains( doc, node ) ) {

    						if ( node.src && ( node.type || "" ).toLowerCase()  !== "module" ) {

    							// Optional AJAX dependency, but won't run scripts if not present
    							if ( jQuery._evalUrl && !node.noModule ) {
    								jQuery._evalUrl( node.src, {
    									nonce: node.nonce || node.getAttribute( "nonce" )
    								} );
    							}
    						} else {
    							DOMEval( node.textContent.replace( rcleanScript, "" ), node, doc );
    						}
    					}
    				}
    			}
    		}
    	}

    	return collection;
    }

    function remove( elem, selector, keepData ) {
    	var node,
    		nodes = selector ? jQuery.filter( selector, elem ) : elem,
    		i = 0;

    	for ( ; ( node = nodes[ i ] ) != null; i++ ) {
    		if ( !keepData && node.nodeType === 1 ) {
    			jQuery.cleanData( getAll( node ) );
    		}

    		if ( node.parentNode ) {
    			if ( keepData && isAttached( node ) ) {
    				setGlobalEval( getAll( node, "script" ) );
    			}
    			node.parentNode.removeChild( node );
    		}
    	}

    	return elem;
    }

    jQuery.extend( {
    	htmlPrefilter: function( html ) {
    		return html.replace( rxhtmlTag, "<$1></$2>" );
    	},

    	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
    		var i, l, srcElements, destElements,
    			clone = elem.cloneNode( true ),
    			inPage = isAttached( elem );

    		// Fix IE cloning issues
    		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
    				!jQuery.isXMLDoc( elem ) ) {

    			// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
    			destElements = getAll( clone );
    			srcElements = getAll( elem );

    			for ( i = 0, l = srcElements.length; i < l; i++ ) {
    				fixInput( srcElements[ i ], destElements[ i ] );
    			}
    		}

    		// Copy the events from the original to the clone
    		if ( dataAndEvents ) {
    			if ( deepDataAndEvents ) {
    				srcElements = srcElements || getAll( elem );
    				destElements = destElements || getAll( clone );

    				for ( i = 0, l = srcElements.length; i < l; i++ ) {
    					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
    				}
    			} else {
    				cloneCopyEvent( elem, clone );
    			}
    		}

    		// Preserve script evaluation history
    		destElements = getAll( clone, "script" );
    		if ( destElements.length > 0 ) {
    			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
    		}

    		// Return the cloned set
    		return clone;
    	},

    	cleanData: function( elems ) {
    		var data, elem, type,
    			special = jQuery.event.special,
    			i = 0;

    		for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
    			if ( acceptData( elem ) ) {
    				if ( ( data = elem[ dataPriv.expando ] ) ) {
    					if ( data.events ) {
    						for ( type in data.events ) {
    							if ( special[ type ] ) {
    								jQuery.event.remove( elem, type );

    							// This is a shortcut to avoid jQuery.event.remove's overhead
    							} else {
    								jQuery.removeEvent( elem, type, data.handle );
    							}
    						}
    					}

    					// Support: Chrome <=35 - 45+
    					// Assign undefined instead of using delete, see Data#remove
    					elem[ dataPriv.expando ] = undefined;
    				}
    				if ( elem[ dataUser.expando ] ) {

    					// Support: Chrome <=35 - 45+
    					// Assign undefined instead of using delete, see Data#remove
    					elem[ dataUser.expando ] = undefined;
    				}
    			}
    		}
    	}
    } );

    jQuery.fn.extend( {
    	detach: function( selector ) {
    		return remove( this, selector, true );
    	},

    	remove: function( selector ) {
    		return remove( this, selector );
    	},

    	text: function( value ) {
    		return access( this, function( value ) {
    			return value === undefined ?
    				jQuery.text( this ) :
    				this.empty().each( function() {
    					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
    						this.textContent = value;
    					}
    				} );
    		}, null, value, arguments.length );
    	},

    	append: function() {
    		return domManip( this, arguments, function( elem ) {
    			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
    				var target = manipulationTarget( this, elem );
    				target.appendChild( elem );
    			}
    		} );
    	},

    	prepend: function() {
    		return domManip( this, arguments, function( elem ) {
    			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
    				var target = manipulationTarget( this, elem );
    				target.insertBefore( elem, target.firstChild );
    			}
    		} );
    	},

    	before: function() {
    		return domManip( this, arguments, function( elem ) {
    			if ( this.parentNode ) {
    				this.parentNode.insertBefore( elem, this );
    			}
    		} );
    	},

    	after: function() {
    		return domManip( this, arguments, function( elem ) {
    			if ( this.parentNode ) {
    				this.parentNode.insertBefore( elem, this.nextSibling );
    			}
    		} );
    	},

    	empty: function() {
    		var elem,
    			i = 0;

    		for ( ; ( elem = this[ i ] ) != null; i++ ) {
    			if ( elem.nodeType === 1 ) {

    				// Prevent memory leaks
    				jQuery.cleanData( getAll( elem, false ) );

    				// Remove any remaining nodes
    				elem.textContent = "";
    			}
    		}

    		return this;
    	},

    	clone: function( dataAndEvents, deepDataAndEvents ) {
    		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
    		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

    		return this.map( function() {
    			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
    		} );
    	},

    	html: function( value ) {
    		return access( this, function( value ) {
    			var elem = this[ 0 ] || {},
    				i = 0,
    				l = this.length;

    			if ( value === undefined && elem.nodeType === 1 ) {
    				return elem.innerHTML;
    			}

    			// See if we can take a shortcut and just use innerHTML
    			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
    				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

    				value = jQuery.htmlPrefilter( value );

    				try {
    					for ( ; i < l; i++ ) {
    						elem = this[ i ] || {};

    						// Remove element nodes and prevent memory leaks
    						if ( elem.nodeType === 1 ) {
    							jQuery.cleanData( getAll( elem, false ) );
    							elem.innerHTML = value;
    						}
    					}

    					elem = 0;

    				// If using innerHTML throws an exception, use the fallback method
    				} catch ( e ) {}
    			}

    			if ( elem ) {
    				this.empty().append( value );
    			}
    		}, null, value, arguments.length );
    	},

    	replaceWith: function() {
    		var ignored = [];

    		// Make the changes, replacing each non-ignored context element with the new content
    		return domManip( this, arguments, function( elem ) {
    			var parent = this.parentNode;

    			if ( jQuery.inArray( this, ignored ) < 0 ) {
    				jQuery.cleanData( getAll( this ) );
    				if ( parent ) {
    					parent.replaceChild( elem, this );
    				}
    			}

    		// Force callback invocation
    		}, ignored );
    	}
    } );

    jQuery.each( {
    	appendTo: "append",
    	prependTo: "prepend",
    	insertBefore: "before",
    	insertAfter: "after",
    	replaceAll: "replaceWith"
    }, function( name, original ) {
    	jQuery.fn[ name ] = function( selector ) {
    		var elems,
    			ret = [],
    			insert = jQuery( selector ),
    			last = insert.length - 1,
    			i = 0;

    		for ( ; i <= last; i++ ) {
    			elems = i === last ? this : this.clone( true );
    			jQuery( insert[ i ] )[ original ]( elems );

    			// Support: Android <=4.0 only, PhantomJS 1 only
    			// .get() because push.apply(_, arraylike) throws on ancient WebKit
    			push.apply( ret, elems.get() );
    		}

    		return this.pushStack( ret );
    	};
    } );
    var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

    var getStyles = function( elem ) {

    		// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
    		// IE throws on elements created in popups
    		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
    		var view = elem.ownerDocument.defaultView;

    		if ( !view || !view.opener ) {
    			view = window;
    		}

    		return view.getComputedStyle( elem );
    	};

    var rboxStyle = new RegExp( cssExpand.join( "|" ), "i" );



    ( function() {

    	// Executing both pixelPosition & boxSizingReliable tests require only one layout
    	// so they're executed at the same time to save the second computation.
    	function computeStyleTests() {

    		// This is a singleton, we need to execute it only once
    		if ( !div ) {
    			return;
    		}

    		container.style.cssText = "position:absolute;left:-11111px;width:60px;" +
    			"margin-top:1px;padding:0;border:0";
    		div.style.cssText =
    			"position:relative;display:block;box-sizing:border-box;overflow:scroll;" +
    			"margin:auto;border:1px;padding:1px;" +
    			"width:60%;top:1%";
    		documentElement.appendChild( container ).appendChild( div );

    		var divStyle = window.getComputedStyle( div );
    		pixelPositionVal = divStyle.top !== "1%";

    		// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
    		reliableMarginLeftVal = roundPixelMeasures( divStyle.marginLeft ) === 12;

    		// Support: Android 4.0 - 4.3 only, Safari <=9.1 - 10.1, iOS <=7.0 - 9.3
    		// Some styles come back with percentage values, even though they shouldn't
    		div.style.right = "60%";
    		pixelBoxStylesVal = roundPixelMeasures( divStyle.right ) === 36;

    		// Support: IE 9 - 11 only
    		// Detect misreporting of content dimensions for box-sizing:border-box elements
    		boxSizingReliableVal = roundPixelMeasures( divStyle.width ) === 36;

    		// Support: IE 9 only
    		// Detect overflow:scroll screwiness (gh-3699)
    		// Support: Chrome <=64
    		// Don't get tricked when zoom affects offsetWidth (gh-4029)
    		div.style.position = "absolute";
    		scrollboxSizeVal = roundPixelMeasures( div.offsetWidth / 3 ) === 12;

    		documentElement.removeChild( container );

    		// Nullify the div so it wouldn't be stored in the memory and
    		// it will also be a sign that checks already performed
    		div = null;
    	}

    	function roundPixelMeasures( measure ) {
    		return Math.round( parseFloat( measure ) );
    	}

    	var pixelPositionVal, boxSizingReliableVal, scrollboxSizeVal, pixelBoxStylesVal,
    		reliableMarginLeftVal,
    		container = document.createElement( "div" ),
    		div = document.createElement( "div" );

    	// Finish early in limited (non-browser) environments
    	if ( !div.style ) {
    		return;
    	}

    	// Support: IE <=9 - 11 only
    	// Style of cloned element affects source element cloned (#8908)
    	div.style.backgroundClip = "content-box";
    	div.cloneNode( true ).style.backgroundClip = "";
    	support.clearCloneStyle = div.style.backgroundClip === "content-box";

    	jQuery.extend( support, {
    		boxSizingReliable: function() {
    			computeStyleTests();
    			return boxSizingReliableVal;
    		},
    		pixelBoxStyles: function() {
    			computeStyleTests();
    			return pixelBoxStylesVal;
    		},
    		pixelPosition: function() {
    			computeStyleTests();
    			return pixelPositionVal;
    		},
    		reliableMarginLeft: function() {
    			computeStyleTests();
    			return reliableMarginLeftVal;
    		},
    		scrollboxSize: function() {
    			computeStyleTests();
    			return scrollboxSizeVal;
    		}
    	} );
    } )();


    function curCSS( elem, name, computed ) {
    	var width, minWidth, maxWidth, ret,

    		// Support: Firefox 51+
    		// Retrieving style before computed somehow
    		// fixes an issue with getting wrong values
    		// on detached elements
    		style = elem.style;

    	computed = computed || getStyles( elem );

    	// getPropertyValue is needed for:
    	//   .css('filter') (IE 9 only, #12537)
    	//   .css('--customProperty) (#3144)
    	if ( computed ) {
    		ret = computed.getPropertyValue( name ) || computed[ name ];

    		if ( ret === "" && !isAttached( elem ) ) {
    			ret = jQuery.style( elem, name );
    		}

    		// A tribute to the "awesome hack by Dean Edwards"
    		// Android Browser returns percentage for some values,
    		// but width seems to be reliably pixels.
    		// This is against the CSSOM draft spec:
    		// https://drafts.csswg.org/cssom/#resolved-values
    		if ( !support.pixelBoxStyles() && rnumnonpx.test( ret ) && rboxStyle.test( name ) ) {

    			// Remember the original values
    			width = style.width;
    			minWidth = style.minWidth;
    			maxWidth = style.maxWidth;

    			// Put in the new values to get a computed value out
    			style.minWidth = style.maxWidth = style.width = ret;
    			ret = computed.width;

    			// Revert the changed values
    			style.width = width;
    			style.minWidth = minWidth;
    			style.maxWidth = maxWidth;
    		}
    	}

    	return ret !== undefined ?

    		// Support: IE <=9 - 11 only
    		// IE returns zIndex value as an integer.
    		ret + "" :
    		ret;
    }


    function addGetHookIf( conditionFn, hookFn ) {

    	// Define the hook, we'll check on the first run if it's really needed.
    	return {
    		get: function() {
    			if ( conditionFn() ) {

    				// Hook not needed (or it's not possible to use it due
    				// to missing dependency), remove it.
    				delete this.get;
    				return;
    			}

    			// Hook needed; redefine it so that the support test is not executed again.
    			return ( this.get = hookFn ).apply( this, arguments );
    		}
    	};
    }


    var cssPrefixes = [ "Webkit", "Moz", "ms" ],
    	emptyStyle = document.createElement( "div" ).style,
    	vendorProps = {};

    // Return a vendor-prefixed property or undefined
    function vendorPropName( name ) {

    	// Check for vendor prefixed names
    	var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
    		i = cssPrefixes.length;

    	while ( i-- ) {
    		name = cssPrefixes[ i ] + capName;
    		if ( name in emptyStyle ) {
    			return name;
    		}
    	}
    }

    // Return a potentially-mapped jQuery.cssProps or vendor prefixed property
    function finalPropName( name ) {
    	var final = jQuery.cssProps[ name ] || vendorProps[ name ];

    	if ( final ) {
    		return final;
    	}
    	if ( name in emptyStyle ) {
    		return name;
    	}
    	return vendorProps[ name ] = vendorPropName( name ) || name;
    }


    var

    	// Swappable if display is none or starts with table
    	// except "table", "table-cell", or "table-caption"
    	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
    	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
    	rcustomProp = /^--/,
    	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
    	cssNormalTransform = {
    		letterSpacing: "0",
    		fontWeight: "400"
    	};

    function setPositiveNumber( elem, value, subtract ) {

    	// Any relative (+/-) values have already been
    	// normalized at this point
    	var matches = rcssNum.exec( value );
    	return matches ?

    		// Guard against undefined "subtract", e.g., when used as in cssHooks
    		Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
    		value;
    }

    function boxModelAdjustment( elem, dimension, box, isBorderBox, styles, computedVal ) {
    	var i = dimension === "width" ? 1 : 0,
    		extra = 0,
    		delta = 0;

    	// Adjustment may not be necessary
    	if ( box === ( isBorderBox ? "border" : "content" ) ) {
    		return 0;
    	}

    	for ( ; i < 4; i += 2 ) {

    		// Both box models exclude margin
    		if ( box === "margin" ) {
    			delta += jQuery.css( elem, box + cssExpand[ i ], true, styles );
    		}

    		// If we get here with a content-box, we're seeking "padding" or "border" or "margin"
    		if ( !isBorderBox ) {

    			// Add padding
    			delta += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

    			// For "border" or "margin", add border
    			if ( box !== "padding" ) {
    				delta += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );

    			// But still keep track of it otherwise
    			} else {
    				extra += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
    			}

    		// If we get here with a border-box (content + padding + border), we're seeking "content" or
    		// "padding" or "margin"
    		} else {

    			// For "content", subtract padding
    			if ( box === "content" ) {
    				delta -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
    			}

    			// For "content" or "padding", subtract border
    			if ( box !== "margin" ) {
    				delta -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
    			}
    		}
    	}

    	// Account for positive content-box scroll gutter when requested by providing computedVal
    	if ( !isBorderBox && computedVal >= 0 ) {

    		// offsetWidth/offsetHeight is a rounded sum of content, padding, scroll gutter, and border
    		// Assuming integer scroll gutter, subtract the rest and round down
    		delta += Math.max( 0, Math.ceil(
    			elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
    			computedVal -
    			delta -
    			extra -
    			0.5

    		// If offsetWidth/offsetHeight is unknown, then we can't determine content-box scroll gutter
    		// Use an explicit zero to avoid NaN (gh-3964)
    		) ) || 0;
    	}

    	return delta;
    }

    function getWidthOrHeight( elem, dimension, extra ) {

    	// Start with computed style
    	var styles = getStyles( elem ),

    		// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-4322).
    		// Fake content-box until we know it's needed to know the true value.
    		boxSizingNeeded = !support.boxSizingReliable() || extra,
    		isBorderBox = boxSizingNeeded &&
    			jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
    		valueIsBorderBox = isBorderBox,

    		val = curCSS( elem, dimension, styles ),
    		offsetProp = "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 );

    	// Support: Firefox <=54
    	// Return a confounding non-pixel value or feign ignorance, as appropriate.
    	if ( rnumnonpx.test( val ) ) {
    		if ( !extra ) {
    			return val;
    		}
    		val = "auto";
    	}


    	// Fall back to offsetWidth/offsetHeight when value is "auto"
    	// This happens for inline elements with no explicit setting (gh-3571)
    	// Support: Android <=4.1 - 4.3 only
    	// Also use offsetWidth/offsetHeight for misreported inline dimensions (gh-3602)
    	// Support: IE 9-11 only
    	// Also use offsetWidth/offsetHeight for when box sizing is unreliable
    	// We use getClientRects() to check for hidden/disconnected.
    	// In those cases, the computed value can be trusted to be border-box
    	if ( ( !support.boxSizingReliable() && isBorderBox ||
    		val === "auto" ||
    		!parseFloat( val ) && jQuery.css( elem, "display", false, styles ) === "inline" ) &&
    		elem.getClientRects().length ) {

    		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

    		// Where available, offsetWidth/offsetHeight approximate border box dimensions.
    		// Where not available (e.g., SVG), assume unreliable box-sizing and interpret the
    		// retrieved value as a content box dimension.
    		valueIsBorderBox = offsetProp in elem;
    		if ( valueIsBorderBox ) {
    			val = elem[ offsetProp ];
    		}
    	}

    	// Normalize "" and auto
    	val = parseFloat( val ) || 0;

    	// Adjust for the element's box model
    	return ( val +
    		boxModelAdjustment(
    			elem,
    			dimension,
    			extra || ( isBorderBox ? "border" : "content" ),
    			valueIsBorderBox,
    			styles,

    			// Provide the current computed size to request scroll gutter calculation (gh-3589)
    			val
    		)
    	) + "px";
    }

    jQuery.extend( {

    	// Add in style property hooks for overriding the default
    	// behavior of getting and setting a style property
    	cssHooks: {
    		opacity: {
    			get: function( elem, computed ) {
    				if ( computed ) {

    					// We should always get a number back from opacity
    					var ret = curCSS( elem, "opacity" );
    					return ret === "" ? "1" : ret;
    				}
    			}
    		}
    	},

    	// Don't automatically add "px" to these possibly-unitless properties
    	cssNumber: {
    		"animationIterationCount": true,
    		"columnCount": true,
    		"fillOpacity": true,
    		"flexGrow": true,
    		"flexShrink": true,
    		"fontWeight": true,
    		"gridArea": true,
    		"gridColumn": true,
    		"gridColumnEnd": true,
    		"gridColumnStart": true,
    		"gridRow": true,
    		"gridRowEnd": true,
    		"gridRowStart": true,
    		"lineHeight": true,
    		"opacity": true,
    		"order": true,
    		"orphans": true,
    		"widows": true,
    		"zIndex": true,
    		"zoom": true
    	},

    	// Add in properties whose names you wish to fix before
    	// setting or getting the value
    	cssProps: {},

    	// Get and set the style property on a DOM Node
    	style: function( elem, name, value, extra ) {

    		// Don't set styles on text and comment nodes
    		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
    			return;
    		}

    		// Make sure that we're working with the right name
    		var ret, type, hooks,
    			origName = camelCase( name ),
    			isCustomProp = rcustomProp.test( name ),
    			style = elem.style;

    		// Make sure that we're working with the right name. We don't
    		// want to query the value if it is a CSS custom property
    		// since they are user-defined.
    		if ( !isCustomProp ) {
    			name = finalPropName( origName );
    		}

    		// Gets hook for the prefixed version, then unprefixed version
    		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

    		// Check if we're setting a value
    		if ( value !== undefined ) {
    			type = typeof value;

    			// Convert "+=" or "-=" to relative numbers (#7345)
    			if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
    				value = adjustCSS( elem, name, ret );

    				// Fixes bug #9237
    				type = "number";
    			}

    			// Make sure that null and NaN values aren't set (#7116)
    			if ( value == null || value !== value ) {
    				return;
    			}

    			// If a number was passed in, add the unit (except for certain CSS properties)
    			// The isCustomProp check can be removed in jQuery 4.0 when we only auto-append
    			// "px" to a few hardcoded values.
    			if ( type === "number" && !isCustomProp ) {
    				value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
    			}

    			// background-* props affect original clone's values
    			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
    				style[ name ] = "inherit";
    			}

    			// If a hook was provided, use that value, otherwise just set the specified value
    			if ( !hooks || !( "set" in hooks ) ||
    				( value = hooks.set( elem, value, extra ) ) !== undefined ) {

    				if ( isCustomProp ) {
    					style.setProperty( name, value );
    				} else {
    					style[ name ] = value;
    				}
    			}

    		} else {

    			// If a hook was provided get the non-computed value from there
    			if ( hooks && "get" in hooks &&
    				( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

    				return ret;
    			}

    			// Otherwise just get the value from the style object
    			return style[ name ];
    		}
    	},

    	css: function( elem, name, extra, styles ) {
    		var val, num, hooks,
    			origName = camelCase( name ),
    			isCustomProp = rcustomProp.test( name );

    		// Make sure that we're working with the right name. We don't
    		// want to modify the value if it is a CSS custom property
    		// since they are user-defined.
    		if ( !isCustomProp ) {
    			name = finalPropName( origName );
    		}

    		// Try prefixed name followed by the unprefixed name
    		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

    		// If a hook was provided get the computed value from there
    		if ( hooks && "get" in hooks ) {
    			val = hooks.get( elem, true, extra );
    		}

    		// Otherwise, if a way to get the computed value exists, use that
    		if ( val === undefined ) {
    			val = curCSS( elem, name, styles );
    		}

    		// Convert "normal" to computed value
    		if ( val === "normal" && name in cssNormalTransform ) {
    			val = cssNormalTransform[ name ];
    		}

    		// Make numeric if forced or a qualifier was provided and val looks numeric
    		if ( extra === "" || extra ) {
    			num = parseFloat( val );
    			return extra === true || isFinite( num ) ? num || 0 : val;
    		}

    		return val;
    	}
    } );

    jQuery.each( [ "height", "width" ], function( i, dimension ) {
    	jQuery.cssHooks[ dimension ] = {
    		get: function( elem, computed, extra ) {
    			if ( computed ) {

    				// Certain elements can have dimension info if we invisibly show them
    				// but it must have a current display style that would benefit
    				return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&

    					// Support: Safari 8+
    					// Table columns in Safari have non-zero offsetWidth & zero
    					// getBoundingClientRect().width unless display is changed.
    					// Support: IE <=11 only
    					// Running getBoundingClientRect on a disconnected node
    					// in IE throws an error.
    					( !elem.getClientRects().length || !elem.getBoundingClientRect().width ) ?
    						swap( elem, cssShow, function() {
    							return getWidthOrHeight( elem, dimension, extra );
    						} ) :
    						getWidthOrHeight( elem, dimension, extra );
    			}
    		},

    		set: function( elem, value, extra ) {
    			var matches,
    				styles = getStyles( elem ),

    				// Only read styles.position if the test has a chance to fail
    				// to avoid forcing a reflow.
    				scrollboxSizeBuggy = !support.scrollboxSize() &&
    					styles.position === "absolute",

    				// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-3991)
    				boxSizingNeeded = scrollboxSizeBuggy || extra,
    				isBorderBox = boxSizingNeeded &&
    					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
    				subtract = extra ?
    					boxModelAdjustment(
    						elem,
    						dimension,
    						extra,
    						isBorderBox,
    						styles
    					) :
    					0;

    			// Account for unreliable border-box dimensions by comparing offset* to computed and
    			// faking a content-box to get border and padding (gh-3699)
    			if ( isBorderBox && scrollboxSizeBuggy ) {
    				subtract -= Math.ceil(
    					elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
    					parseFloat( styles[ dimension ] ) -
    					boxModelAdjustment( elem, dimension, "border", false, styles ) -
    					0.5
    				);
    			}

    			// Convert to pixels if value adjustment is needed
    			if ( subtract && ( matches = rcssNum.exec( value ) ) &&
    				( matches[ 3 ] || "px" ) !== "px" ) {

    				elem.style[ dimension ] = value;
    				value = jQuery.css( elem, dimension );
    			}

    			return setPositiveNumber( elem, value, subtract );
    		}
    	};
    } );

    jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
    	function( elem, computed ) {
    		if ( computed ) {
    			return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
    				elem.getBoundingClientRect().left -
    					swap( elem, { marginLeft: 0 }, function() {
    						return elem.getBoundingClientRect().left;
    					} )
    				) + "px";
    		}
    	}
    );

    // These hooks are used by animate to expand properties
    jQuery.each( {
    	margin: "",
    	padding: "",
    	border: "Width"
    }, function( prefix, suffix ) {
    	jQuery.cssHooks[ prefix + suffix ] = {
    		expand: function( value ) {
    			var i = 0,
    				expanded = {},

    				// Assumes a single number if not a string
    				parts = typeof value === "string" ? value.split( " " ) : [ value ];

    			for ( ; i < 4; i++ ) {
    				expanded[ prefix + cssExpand[ i ] + suffix ] =
    					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
    			}

    			return expanded;
    		}
    	};

    	if ( prefix !== "margin" ) {
    		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
    	}
    } );

    jQuery.fn.extend( {
    	css: function( name, value ) {
    		return access( this, function( elem, name, value ) {
    			var styles, len,
    				map = {},
    				i = 0;

    			if ( Array.isArray( name ) ) {
    				styles = getStyles( elem );
    				len = name.length;

    				for ( ; i < len; i++ ) {
    					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
    				}

    				return map;
    			}

    			return value !== undefined ?
    				jQuery.style( elem, name, value ) :
    				jQuery.css( elem, name );
    		}, name, value, arguments.length > 1 );
    	}
    } );


    function Tween( elem, options, prop, end, easing ) {
    	return new Tween.prototype.init( elem, options, prop, end, easing );
    }
    jQuery.Tween = Tween;

    Tween.prototype = {
    	constructor: Tween,
    	init: function( elem, options, prop, end, easing, unit ) {
    		this.elem = elem;
    		this.prop = prop;
    		this.easing = easing || jQuery.easing._default;
    		this.options = options;
    		this.start = this.now = this.cur();
    		this.end = end;
    		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
    	},
    	cur: function() {
    		var hooks = Tween.propHooks[ this.prop ];

    		return hooks && hooks.get ?
    			hooks.get( this ) :
    			Tween.propHooks._default.get( this );
    	},
    	run: function( percent ) {
    		var eased,
    			hooks = Tween.propHooks[ this.prop ];

    		if ( this.options.duration ) {
    			this.pos = eased = jQuery.easing[ this.easing ](
    				percent, this.options.duration * percent, 0, 1, this.options.duration
    			);
    		} else {
    			this.pos = eased = percent;
    		}
    		this.now = ( this.end - this.start ) * eased + this.start;

    		if ( this.options.step ) {
    			this.options.step.call( this.elem, this.now, this );
    		}

    		if ( hooks && hooks.set ) {
    			hooks.set( this );
    		} else {
    			Tween.propHooks._default.set( this );
    		}
    		return this;
    	}
    };

    Tween.prototype.init.prototype = Tween.prototype;

    Tween.propHooks = {
    	_default: {
    		get: function( tween ) {
    			var result;

    			// Use a property on the element directly when it is not a DOM element,
    			// or when there is no matching style property that exists.
    			if ( tween.elem.nodeType !== 1 ||
    				tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
    				return tween.elem[ tween.prop ];
    			}

    			// Passing an empty string as a 3rd parameter to .css will automatically
    			// attempt a parseFloat and fallback to a string if the parse fails.
    			// Simple values such as "10px" are parsed to Float;
    			// complex values such as "rotate(1rad)" are returned as-is.
    			result = jQuery.css( tween.elem, tween.prop, "" );

    			// Empty strings, null, undefined and "auto" are converted to 0.
    			return !result || result === "auto" ? 0 : result;
    		},
    		set: function( tween ) {

    			// Use step hook for back compat.
    			// Use cssHook if its there.
    			// Use .style if available and use plain properties where available.
    			if ( jQuery.fx.step[ tween.prop ] ) {
    				jQuery.fx.step[ tween.prop ]( tween );
    			} else if ( tween.elem.nodeType === 1 && (
    					jQuery.cssHooks[ tween.prop ] ||
    					tween.elem.style[ finalPropName( tween.prop ) ] != null ) ) {
    				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
    			} else {
    				tween.elem[ tween.prop ] = tween.now;
    			}
    		}
    	}
    };

    // Support: IE <=9 only
    // Panic based approach to setting things on disconnected nodes
    Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
    	set: function( tween ) {
    		if ( tween.elem.nodeType && tween.elem.parentNode ) {
    			tween.elem[ tween.prop ] = tween.now;
    		}
    	}
    };

    jQuery.easing = {
    	linear: function( p ) {
    		return p;
    	},
    	swing: function( p ) {
    		return 0.5 - Math.cos( p * Math.PI ) / 2;
    	},
    	_default: "swing"
    };

    jQuery.fx = Tween.prototype.init;

    // Back compat <1.8 extension point
    jQuery.fx.step = {};




    var
    	fxNow, inProgress,
    	rfxtypes = /^(?:toggle|show|hide)$/,
    	rrun = /queueHooks$/;

    function schedule() {
    	if ( inProgress ) {
    		if ( document.hidden === false && window.requestAnimationFrame ) {
    			window.requestAnimationFrame( schedule );
    		} else {
    			window.setTimeout( schedule, jQuery.fx.interval );
    		}

    		jQuery.fx.tick();
    	}
    }

    // Animations created synchronously will run synchronously
    function createFxNow() {
    	window.setTimeout( function() {
    		fxNow = undefined;
    	} );
    	return ( fxNow = Date.now() );
    }

    // Generate parameters to create a standard animation
    function genFx( type, includeWidth ) {
    	var which,
    		i = 0,
    		attrs = { height: type };

    	// If we include width, step value is 1 to do all cssExpand values,
    	// otherwise step value is 2 to skip over Left and Right
    	includeWidth = includeWidth ? 1 : 0;
    	for ( ; i < 4; i += 2 - includeWidth ) {
    		which = cssExpand[ i ];
    		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
    	}

    	if ( includeWidth ) {
    		attrs.opacity = attrs.width = type;
    	}

    	return attrs;
    }

    function createTween( value, prop, animation ) {
    	var tween,
    		collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
    		index = 0,
    		length = collection.length;
    	for ( ; index < length; index++ ) {
    		if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

    			// We're done with this property
    			return tween;
    		}
    	}
    }

    function defaultPrefilter( elem, props, opts ) {
    	var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display,
    		isBox = "width" in props || "height" in props,
    		anim = this,
    		orig = {},
    		style = elem.style,
    		hidden = elem.nodeType && isHiddenWithinTree( elem ),
    		dataShow = dataPriv.get( elem, "fxshow" );

    	// Queue-skipping animations hijack the fx hooks
    	if ( !opts.queue ) {
    		hooks = jQuery._queueHooks( elem, "fx" );
    		if ( hooks.unqueued == null ) {
    			hooks.unqueued = 0;
    			oldfire = hooks.empty.fire;
    			hooks.empty.fire = function() {
    				if ( !hooks.unqueued ) {
    					oldfire();
    				}
    			};
    		}
    		hooks.unqueued++;

    		anim.always( function() {

    			// Ensure the complete handler is called before this completes
    			anim.always( function() {
    				hooks.unqueued--;
    				if ( !jQuery.queue( elem, "fx" ).length ) {
    					hooks.empty.fire();
    				}
    			} );
    		} );
    	}

    	// Detect show/hide animations
    	for ( prop in props ) {
    		value = props[ prop ];
    		if ( rfxtypes.test( value ) ) {
    			delete props[ prop ];
    			toggle = toggle || value === "toggle";
    			if ( value === ( hidden ? "hide" : "show" ) ) {

    				// Pretend to be hidden if this is a "show" and
    				// there is still data from a stopped show/hide
    				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
    					hidden = true;

    				// Ignore all other no-op show/hide data
    				} else {
    					continue;
    				}
    			}
    			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
    		}
    	}

    	// Bail out if this is a no-op like .hide().hide()
    	propTween = !jQuery.isEmptyObject( props );
    	if ( !propTween && jQuery.isEmptyObject( orig ) ) {
    		return;
    	}

    	// Restrict "overflow" and "display" styles during box animations
    	if ( isBox && elem.nodeType === 1 ) {

    		// Support: IE <=9 - 11, Edge 12 - 15
    		// Record all 3 overflow attributes because IE does not infer the shorthand
    		// from identically-valued overflowX and overflowY and Edge just mirrors
    		// the overflowX value there.
    		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

    		// Identify a display type, preferring old show/hide data over the CSS cascade
    		restoreDisplay = dataShow && dataShow.display;
    		if ( restoreDisplay == null ) {
    			restoreDisplay = dataPriv.get( elem, "display" );
    		}
    		display = jQuery.css( elem, "display" );
    		if ( display === "none" ) {
    			if ( restoreDisplay ) {
    				display = restoreDisplay;
    			} else {

    				// Get nonempty value(s) by temporarily forcing visibility
    				showHide( [ elem ], true );
    				restoreDisplay = elem.style.display || restoreDisplay;
    				display = jQuery.css( elem, "display" );
    				showHide( [ elem ] );
    			}
    		}

    		// Animate inline elements as inline-block
    		if ( display === "inline" || display === "inline-block" && restoreDisplay != null ) {
    			if ( jQuery.css( elem, "float" ) === "none" ) {

    				// Restore the original display value at the end of pure show/hide animations
    				if ( !propTween ) {
    					anim.done( function() {
    						style.display = restoreDisplay;
    					} );
    					if ( restoreDisplay == null ) {
    						display = style.display;
    						restoreDisplay = display === "none" ? "" : display;
    					}
    				}
    				style.display = "inline-block";
    			}
    		}
    	}

    	if ( opts.overflow ) {
    		style.overflow = "hidden";
    		anim.always( function() {
    			style.overflow = opts.overflow[ 0 ];
    			style.overflowX = opts.overflow[ 1 ];
    			style.overflowY = opts.overflow[ 2 ];
    		} );
    	}

    	// Implement show/hide animations
    	propTween = false;
    	for ( prop in orig ) {

    		// General show/hide setup for this element animation
    		if ( !propTween ) {
    			if ( dataShow ) {
    				if ( "hidden" in dataShow ) {
    					hidden = dataShow.hidden;
    				}
    			} else {
    				dataShow = dataPriv.access( elem, "fxshow", { display: restoreDisplay } );
    			}

    			// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
    			if ( toggle ) {
    				dataShow.hidden = !hidden;
    			}

    			// Show elements before animating them
    			if ( hidden ) {
    				showHide( [ elem ], true );
    			}

    			/* eslint-disable no-loop-func */

    			anim.done( function() {

    			/* eslint-enable no-loop-func */

    				// The final step of a "hide" animation is actually hiding the element
    				if ( !hidden ) {
    					showHide( [ elem ] );
    				}
    				dataPriv.remove( elem, "fxshow" );
    				for ( prop in orig ) {
    					jQuery.style( elem, prop, orig[ prop ] );
    				}
    			} );
    		}

    		// Per-property setup
    		propTween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
    		if ( !( prop in dataShow ) ) {
    			dataShow[ prop ] = propTween.start;
    			if ( hidden ) {
    				propTween.end = propTween.start;
    				propTween.start = 0;
    			}
    		}
    	}
    }

    function propFilter( props, specialEasing ) {
    	var index, name, easing, value, hooks;

    	// camelCase, specialEasing and expand cssHook pass
    	for ( index in props ) {
    		name = camelCase( index );
    		easing = specialEasing[ name ];
    		value = props[ index ];
    		if ( Array.isArray( value ) ) {
    			easing = value[ 1 ];
    			value = props[ index ] = value[ 0 ];
    		}

    		if ( index !== name ) {
    			props[ name ] = value;
    			delete props[ index ];
    		}

    		hooks = jQuery.cssHooks[ name ];
    		if ( hooks && "expand" in hooks ) {
    			value = hooks.expand( value );
    			delete props[ name ];

    			// Not quite $.extend, this won't overwrite existing keys.
    			// Reusing 'index' because we have the correct "name"
    			for ( index in value ) {
    				if ( !( index in props ) ) {
    					props[ index ] = value[ index ];
    					specialEasing[ index ] = easing;
    				}
    			}
    		} else {
    			specialEasing[ name ] = easing;
    		}
    	}
    }

    function Animation( elem, properties, options ) {
    	var result,
    		stopped,
    		index = 0,
    		length = Animation.prefilters.length,
    		deferred = jQuery.Deferred().always( function() {

    			// Don't match elem in the :animated selector
    			delete tick.elem;
    		} ),
    		tick = function() {
    			if ( stopped ) {
    				return false;
    			}
    			var currentTime = fxNow || createFxNow(),
    				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

    				// Support: Android 2.3 only
    				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
    				temp = remaining / animation.duration || 0,
    				percent = 1 - temp,
    				index = 0,
    				length = animation.tweens.length;

    			for ( ; index < length; index++ ) {
    				animation.tweens[ index ].run( percent );
    			}

    			deferred.notifyWith( elem, [ animation, percent, remaining ] );

    			// If there's more to do, yield
    			if ( percent < 1 && length ) {
    				return remaining;
    			}

    			// If this was an empty animation, synthesize a final progress notification
    			if ( !length ) {
    				deferred.notifyWith( elem, [ animation, 1, 0 ] );
    			}

    			// Resolve the animation and report its conclusion
    			deferred.resolveWith( elem, [ animation ] );
    			return false;
    		},
    		animation = deferred.promise( {
    			elem: elem,
    			props: jQuery.extend( {}, properties ),
    			opts: jQuery.extend( true, {
    				specialEasing: {},
    				easing: jQuery.easing._default
    			}, options ),
    			originalProperties: properties,
    			originalOptions: options,
    			startTime: fxNow || createFxNow(),
    			duration: options.duration,
    			tweens: [],
    			createTween: function( prop, end ) {
    				var tween = jQuery.Tween( elem, animation.opts, prop, end,
    						animation.opts.specialEasing[ prop ] || animation.opts.easing );
    				animation.tweens.push( tween );
    				return tween;
    			},
    			stop: function( gotoEnd ) {
    				var index = 0,

    					// If we are going to the end, we want to run all the tweens
    					// otherwise we skip this part
    					length = gotoEnd ? animation.tweens.length : 0;
    				if ( stopped ) {
    					return this;
    				}
    				stopped = true;
    				for ( ; index < length; index++ ) {
    					animation.tweens[ index ].run( 1 );
    				}

    				// Resolve when we played the last frame; otherwise, reject
    				if ( gotoEnd ) {
    					deferred.notifyWith( elem, [ animation, 1, 0 ] );
    					deferred.resolveWith( elem, [ animation, gotoEnd ] );
    				} else {
    					deferred.rejectWith( elem, [ animation, gotoEnd ] );
    				}
    				return this;
    			}
    		} ),
    		props = animation.props;

    	propFilter( props, animation.opts.specialEasing );

    	for ( ; index < length; index++ ) {
    		result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
    		if ( result ) {
    			if ( isFunction( result.stop ) ) {
    				jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
    					result.stop.bind( result );
    			}
    			return result;
    		}
    	}

    	jQuery.map( props, createTween, animation );

    	if ( isFunction( animation.opts.start ) ) {
    		animation.opts.start.call( elem, animation );
    	}

    	// Attach callbacks from options
    	animation
    		.progress( animation.opts.progress )
    		.done( animation.opts.done, animation.opts.complete )
    		.fail( animation.opts.fail )
    		.always( animation.opts.always );

    	jQuery.fx.timer(
    		jQuery.extend( tick, {
    			elem: elem,
    			anim: animation,
    			queue: animation.opts.queue
    		} )
    	);

    	return animation;
    }

    jQuery.Animation = jQuery.extend( Animation, {

    	tweeners: {
    		"*": [ function( prop, value ) {
    			var tween = this.createTween( prop, value );
    			adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
    			return tween;
    		} ]
    	},

    	tweener: function( props, callback ) {
    		if ( isFunction( props ) ) {
    			callback = props;
    			props = [ "*" ];
    		} else {
    			props = props.match( rnothtmlwhite );
    		}

    		var prop,
    			index = 0,
    			length = props.length;

    		for ( ; index < length; index++ ) {
    			prop = props[ index ];
    			Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
    			Animation.tweeners[ prop ].unshift( callback );
    		}
    	},

    	prefilters: [ defaultPrefilter ],

    	prefilter: function( callback, prepend ) {
    		if ( prepend ) {
    			Animation.prefilters.unshift( callback );
    		} else {
    			Animation.prefilters.push( callback );
    		}
    	}
    } );

    jQuery.speed = function( speed, easing, fn ) {
    	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
    		complete: fn || !fn && easing ||
    			isFunction( speed ) && speed,
    		duration: speed,
    		easing: fn && easing || easing && !isFunction( easing ) && easing
    	};

    	// Go to the end state if fx are off
    	if ( jQuery.fx.off ) {
    		opt.duration = 0;

    	} else {
    		if ( typeof opt.duration !== "number" ) {
    			if ( opt.duration in jQuery.fx.speeds ) {
    				opt.duration = jQuery.fx.speeds[ opt.duration ];

    			} else {
    				opt.duration = jQuery.fx.speeds._default;
    			}
    		}
    	}

    	// Normalize opt.queue - true/undefined/null -> "fx"
    	if ( opt.queue == null || opt.queue === true ) {
    		opt.queue = "fx";
    	}

    	// Queueing
    	opt.old = opt.complete;

    	opt.complete = function() {
    		if ( isFunction( opt.old ) ) {
    			opt.old.call( this );
    		}

    		if ( opt.queue ) {
    			jQuery.dequeue( this, opt.queue );
    		}
    	};

    	return opt;
    };

    jQuery.fn.extend( {
    	fadeTo: function( speed, to, easing, callback ) {

    		// Show any hidden elements after setting opacity to 0
    		return this.filter( isHiddenWithinTree ).css( "opacity", 0 ).show()

    			// Animate to the value specified
    			.end().animate( { opacity: to }, speed, easing, callback );
    	},
    	animate: function( prop, speed, easing, callback ) {
    		var empty = jQuery.isEmptyObject( prop ),
    			optall = jQuery.speed( speed, easing, callback ),
    			doAnimation = function() {

    				// Operate on a copy of prop so per-property easing won't be lost
    				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

    				// Empty animations, or finishing resolves immediately
    				if ( empty || dataPriv.get( this, "finish" ) ) {
    					anim.stop( true );
    				}
    			};
    			doAnimation.finish = doAnimation;

    		return empty || optall.queue === false ?
    			this.each( doAnimation ) :
    			this.queue( optall.queue, doAnimation );
    	},
    	stop: function( type, clearQueue, gotoEnd ) {
    		var stopQueue = function( hooks ) {
    			var stop = hooks.stop;
    			delete hooks.stop;
    			stop( gotoEnd );
    		};

    		if ( typeof type !== "string" ) {
    			gotoEnd = clearQueue;
    			clearQueue = type;
    			type = undefined;
    		}
    		if ( clearQueue && type !== false ) {
    			this.queue( type || "fx", [] );
    		}

    		return this.each( function() {
    			var dequeue = true,
    				index = type != null && type + "queueHooks",
    				timers = jQuery.timers,
    				data = dataPriv.get( this );

    			if ( index ) {
    				if ( data[ index ] && data[ index ].stop ) {
    					stopQueue( data[ index ] );
    				}
    			} else {
    				for ( index in data ) {
    					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
    						stopQueue( data[ index ] );
    					}
    				}
    			}

    			for ( index = timers.length; index--; ) {
    				if ( timers[ index ].elem === this &&
    					( type == null || timers[ index ].queue === type ) ) {

    					timers[ index ].anim.stop( gotoEnd );
    					dequeue = false;
    					timers.splice( index, 1 );
    				}
    			}

    			// Start the next in the queue if the last step wasn't forced.
    			// Timers currently will call their complete callbacks, which
    			// will dequeue but only if they were gotoEnd.
    			if ( dequeue || !gotoEnd ) {
    				jQuery.dequeue( this, type );
    			}
    		} );
    	},
    	finish: function( type ) {
    		if ( type !== false ) {
    			type = type || "fx";
    		}
    		return this.each( function() {
    			var index,
    				data = dataPriv.get( this ),
    				queue = data[ type + "queue" ],
    				hooks = data[ type + "queueHooks" ],
    				timers = jQuery.timers,
    				length = queue ? queue.length : 0;

    			// Enable finishing flag on private data
    			data.finish = true;

    			// Empty the queue first
    			jQuery.queue( this, type, [] );

    			if ( hooks && hooks.stop ) {
    				hooks.stop.call( this, true );
    			}

    			// Look for any active animations, and finish them
    			for ( index = timers.length; index--; ) {
    				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
    					timers[ index ].anim.stop( true );
    					timers.splice( index, 1 );
    				}
    			}

    			// Look for any animations in the old queue and finish them
    			for ( index = 0; index < length; index++ ) {
    				if ( queue[ index ] && queue[ index ].finish ) {
    					queue[ index ].finish.call( this );
    				}
    			}

    			// Turn off finishing flag
    			delete data.finish;
    		} );
    	}
    } );

    jQuery.each( [ "toggle", "show", "hide" ], function( i, name ) {
    	var cssFn = jQuery.fn[ name ];
    	jQuery.fn[ name ] = function( speed, easing, callback ) {
    		return speed == null || typeof speed === "boolean" ?
    			cssFn.apply( this, arguments ) :
    			this.animate( genFx( name, true ), speed, easing, callback );
    	};
    } );

    // Generate shortcuts for custom animations
    jQuery.each( {
    	slideDown: genFx( "show" ),
    	slideUp: genFx( "hide" ),
    	slideToggle: genFx( "toggle" ),
    	fadeIn: { opacity: "show" },
    	fadeOut: { opacity: "hide" },
    	fadeToggle: { opacity: "toggle" }
    }, function( name, props ) {
    	jQuery.fn[ name ] = function( speed, easing, callback ) {
    		return this.animate( props, speed, easing, callback );
    	};
    } );

    jQuery.timers = [];
    jQuery.fx.tick = function() {
    	var timer,
    		i = 0,
    		timers = jQuery.timers;

    	fxNow = Date.now();

    	for ( ; i < timers.length; i++ ) {
    		timer = timers[ i ];

    		// Run the timer and safely remove it when done (allowing for external removal)
    		if ( !timer() && timers[ i ] === timer ) {
    			timers.splice( i--, 1 );
    		}
    	}

    	if ( !timers.length ) {
    		jQuery.fx.stop();
    	}
    	fxNow = undefined;
    };

    jQuery.fx.timer = function( timer ) {
    	jQuery.timers.push( timer );
    	jQuery.fx.start();
    };

    jQuery.fx.interval = 13;
    jQuery.fx.start = function() {
    	if ( inProgress ) {
    		return;
    	}

    	inProgress = true;
    	schedule();
    };

    jQuery.fx.stop = function() {
    	inProgress = null;
    };

    jQuery.fx.speeds = {
    	slow: 600,
    	fast: 200,

    	// Default speed
    	_default: 400
    };


    // Based off of the plugin by Clint Helfers, with permission.
    // https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
    jQuery.fn.delay = function( time, type ) {
    	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
    	type = type || "fx";

    	return this.queue( type, function( next, hooks ) {
    		var timeout = window.setTimeout( next, time );
    		hooks.stop = function() {
    			window.clearTimeout( timeout );
    		};
    	} );
    };


    ( function() {
    	var input = document.createElement( "input" ),
    		select = document.createElement( "select" ),
    		opt = select.appendChild( document.createElement( "option" ) );

    	input.type = "checkbox";

    	// Support: Android <=4.3 only
    	// Default value for a checkbox should be "on"
    	support.checkOn = input.value !== "";

    	// Support: IE <=11 only
    	// Must access selectedIndex to make default options select
    	support.optSelected = opt.selected;

    	// Support: IE <=11 only
    	// An input loses its value after becoming a radio
    	input = document.createElement( "input" );
    	input.value = "t";
    	input.type = "radio";
    	support.radioValue = input.value === "t";
    } )();


    var boolHook,
    	attrHandle = jQuery.expr.attrHandle;

    jQuery.fn.extend( {
    	attr: function( name, value ) {
    		return access( this, jQuery.attr, name, value, arguments.length > 1 );
    	},

    	removeAttr: function( name ) {
    		return this.each( function() {
    			jQuery.removeAttr( this, name );
    		} );
    	}
    } );

    jQuery.extend( {
    	attr: function( elem, name, value ) {
    		var ret, hooks,
    			nType = elem.nodeType;

    		// Don't get/set attributes on text, comment and attribute nodes
    		if ( nType === 3 || nType === 8 || nType === 2 ) {
    			return;
    		}

    		// Fallback to prop when attributes are not supported
    		if ( typeof elem.getAttribute === "undefined" ) {
    			return jQuery.prop( elem, name, value );
    		}

    		// Attribute hooks are determined by the lowercase version
    		// Grab necessary hook if one is defined
    		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
    			hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
    				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
    		}

    		if ( value !== undefined ) {
    			if ( value === null ) {
    				jQuery.removeAttr( elem, name );
    				return;
    			}

    			if ( hooks && "set" in hooks &&
    				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
    				return ret;
    			}

    			elem.setAttribute( name, value + "" );
    			return value;
    		}

    		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
    			return ret;
    		}

    		ret = jQuery.find.attr( elem, name );

    		// Non-existent attributes return null, we normalize to undefined
    		return ret == null ? undefined : ret;
    	},

    	attrHooks: {
    		type: {
    			set: function( elem, value ) {
    				if ( !support.radioValue && value === "radio" &&
    					nodeName( elem, "input" ) ) {
    					var val = elem.value;
    					elem.setAttribute( "type", value );
    					if ( val ) {
    						elem.value = val;
    					}
    					return value;
    				}
    			}
    		}
    	},

    	removeAttr: function( elem, value ) {
    		var name,
    			i = 0,

    			// Attribute names can contain non-HTML whitespace characters
    			// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
    			attrNames = value && value.match( rnothtmlwhite );

    		if ( attrNames && elem.nodeType === 1 ) {
    			while ( ( name = attrNames[ i++ ] ) ) {
    				elem.removeAttribute( name );
    			}
    		}
    	}
    } );

    // Hooks for boolean attributes
    boolHook = {
    	set: function( elem, value, name ) {
    		if ( value === false ) {

    			// Remove boolean attributes when set to false
    			jQuery.removeAttr( elem, name );
    		} else {
    			elem.setAttribute( name, name );
    		}
    		return name;
    	}
    };

    jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
    	var getter = attrHandle[ name ] || jQuery.find.attr;

    	attrHandle[ name ] = function( elem, name, isXML ) {
    		var ret, handle,
    			lowercaseName = name.toLowerCase();

    		if ( !isXML ) {

    			// Avoid an infinite loop by temporarily removing this function from the getter
    			handle = attrHandle[ lowercaseName ];
    			attrHandle[ lowercaseName ] = ret;
    			ret = getter( elem, name, isXML ) != null ?
    				lowercaseName :
    				null;
    			attrHandle[ lowercaseName ] = handle;
    		}
    		return ret;
    	};
    } );




    var rfocusable = /^(?:input|select|textarea|button)$/i,
    	rclickable = /^(?:a|area)$/i;

    jQuery.fn.extend( {
    	prop: function( name, value ) {
    		return access( this, jQuery.prop, name, value, arguments.length > 1 );
    	},

    	removeProp: function( name ) {
    		return this.each( function() {
    			delete this[ jQuery.propFix[ name ] || name ];
    		} );
    	}
    } );

    jQuery.extend( {
    	prop: function( elem, name, value ) {
    		var ret, hooks,
    			nType = elem.nodeType;

    		// Don't get/set properties on text, comment and attribute nodes
    		if ( nType === 3 || nType === 8 || nType === 2 ) {
    			return;
    		}

    		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

    			// Fix name and attach hooks
    			name = jQuery.propFix[ name ] || name;
    			hooks = jQuery.propHooks[ name ];
    		}

    		if ( value !== undefined ) {
    			if ( hooks && "set" in hooks &&
    				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
    				return ret;
    			}

    			return ( elem[ name ] = value );
    		}

    		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
    			return ret;
    		}

    		return elem[ name ];
    	},

    	propHooks: {
    		tabIndex: {
    			get: function( elem ) {

    				// Support: IE <=9 - 11 only
    				// elem.tabIndex doesn't always return the
    				// correct value when it hasn't been explicitly set
    				// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
    				// Use proper attribute retrieval(#12072)
    				var tabindex = jQuery.find.attr( elem, "tabindex" );

    				if ( tabindex ) {
    					return parseInt( tabindex, 10 );
    				}

    				if (
    					rfocusable.test( elem.nodeName ) ||
    					rclickable.test( elem.nodeName ) &&
    					elem.href
    				) {
    					return 0;
    				}

    				return -1;
    			}
    		}
    	},

    	propFix: {
    		"for": "htmlFor",
    		"class": "className"
    	}
    } );

    // Support: IE <=11 only
    // Accessing the selectedIndex property
    // forces the browser to respect setting selected
    // on the option
    // The getter ensures a default option is selected
    // when in an optgroup
    // eslint rule "no-unused-expressions" is disabled for this code
    // since it considers such accessions noop
    if ( !support.optSelected ) {
    	jQuery.propHooks.selected = {
    		get: function( elem ) {

    			/* eslint no-unused-expressions: "off" */

    			var parent = elem.parentNode;
    			if ( parent && parent.parentNode ) {
    				parent.parentNode.selectedIndex;
    			}
    			return null;
    		},
    		set: function( elem ) {

    			/* eslint no-unused-expressions: "off" */

    			var parent = elem.parentNode;
    			if ( parent ) {
    				parent.selectedIndex;

    				if ( parent.parentNode ) {
    					parent.parentNode.selectedIndex;
    				}
    			}
    		}
    	};
    }

    jQuery.each( [
    	"tabIndex",
    	"readOnly",
    	"maxLength",
    	"cellSpacing",
    	"cellPadding",
    	"rowSpan",
    	"colSpan",
    	"useMap",
    	"frameBorder",
    	"contentEditable"
    ], function() {
    	jQuery.propFix[ this.toLowerCase() ] = this;
    } );




    	// Strip and collapse whitespace according to HTML spec
    	// https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace
    	function stripAndCollapse( value ) {
    		var tokens = value.match( rnothtmlwhite ) || [];
    		return tokens.join( " " );
    	}


    function getClass( elem ) {
    	return elem.getAttribute && elem.getAttribute( "class" ) || "";
    }

    function classesToArray( value ) {
    	if ( Array.isArray( value ) ) {
    		return value;
    	}
    	if ( typeof value === "string" ) {
    		return value.match( rnothtmlwhite ) || [];
    	}
    	return [];
    }

    jQuery.fn.extend( {
    	addClass: function( value ) {
    		var classes, elem, cur, curValue, clazz, j, finalValue,
    			i = 0;

    		if ( isFunction( value ) ) {
    			return this.each( function( j ) {
    				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
    			} );
    		}

    		classes = classesToArray( value );

    		if ( classes.length ) {
    			while ( ( elem = this[ i++ ] ) ) {
    				curValue = getClass( elem );
    				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

    				if ( cur ) {
    					j = 0;
    					while ( ( clazz = classes[ j++ ] ) ) {
    						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
    							cur += clazz + " ";
    						}
    					}

    					// Only assign if different to avoid unneeded rendering.
    					finalValue = stripAndCollapse( cur );
    					if ( curValue !== finalValue ) {
    						elem.setAttribute( "class", finalValue );
    					}
    				}
    			}
    		}

    		return this;
    	},

    	removeClass: function( value ) {
    		var classes, elem, cur, curValue, clazz, j, finalValue,
    			i = 0;

    		if ( isFunction( value ) ) {
    			return this.each( function( j ) {
    				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
    			} );
    		}

    		if ( !arguments.length ) {
    			return this.attr( "class", "" );
    		}

    		classes = classesToArray( value );

    		if ( classes.length ) {
    			while ( ( elem = this[ i++ ] ) ) {
    				curValue = getClass( elem );

    				// This expression is here for better compressibility (see addClass)
    				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

    				if ( cur ) {
    					j = 0;
    					while ( ( clazz = classes[ j++ ] ) ) {

    						// Remove *all* instances
    						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
    							cur = cur.replace( " " + clazz + " ", " " );
    						}
    					}

    					// Only assign if different to avoid unneeded rendering.
    					finalValue = stripAndCollapse( cur );
    					if ( curValue !== finalValue ) {
    						elem.setAttribute( "class", finalValue );
    					}
    				}
    			}
    		}

    		return this;
    	},

    	toggleClass: function( value, stateVal ) {
    		var type = typeof value,
    			isValidValue = type === "string" || Array.isArray( value );

    		if ( typeof stateVal === "boolean" && isValidValue ) {
    			return stateVal ? this.addClass( value ) : this.removeClass( value );
    		}

    		if ( isFunction( value ) ) {
    			return this.each( function( i ) {
    				jQuery( this ).toggleClass(
    					value.call( this, i, getClass( this ), stateVal ),
    					stateVal
    				);
    			} );
    		}

    		return this.each( function() {
    			var className, i, self, classNames;

    			if ( isValidValue ) {

    				// Toggle individual class names
    				i = 0;
    				self = jQuery( this );
    				classNames = classesToArray( value );

    				while ( ( className = classNames[ i++ ] ) ) {

    					// Check each className given, space separated list
    					if ( self.hasClass( className ) ) {
    						self.removeClass( className );
    					} else {
    						self.addClass( className );
    					}
    				}

    			// Toggle whole class name
    			} else if ( value === undefined || type === "boolean" ) {
    				className = getClass( this );
    				if ( className ) {

    					// Store className if set
    					dataPriv.set( this, "__className__", className );
    				}

    				// If the element has a class name or if we're passed `false`,
    				// then remove the whole classname (if there was one, the above saved it).
    				// Otherwise bring back whatever was previously saved (if anything),
    				// falling back to the empty string if nothing was stored.
    				if ( this.setAttribute ) {
    					this.setAttribute( "class",
    						className || value === false ?
    						"" :
    						dataPriv.get( this, "__className__" ) || ""
    					);
    				}
    			}
    		} );
    	},

    	hasClass: function( selector ) {
    		var className, elem,
    			i = 0;

    		className = " " + selector + " ";
    		while ( ( elem = this[ i++ ] ) ) {
    			if ( elem.nodeType === 1 &&
    				( " " + stripAndCollapse( getClass( elem ) ) + " " ).indexOf( className ) > -1 ) {
    					return true;
    			}
    		}

    		return false;
    	}
    } );




    var rreturn = /\r/g;

    jQuery.fn.extend( {
    	val: function( value ) {
    		var hooks, ret, valueIsFunction,
    			elem = this[ 0 ];

    		if ( !arguments.length ) {
    			if ( elem ) {
    				hooks = jQuery.valHooks[ elem.type ] ||
    					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

    				if ( hooks &&
    					"get" in hooks &&
    					( ret = hooks.get( elem, "value" ) ) !== undefined
    				) {
    					return ret;
    				}

    				ret = elem.value;

    				// Handle most common string cases
    				if ( typeof ret === "string" ) {
    					return ret.replace( rreturn, "" );
    				}

    				// Handle cases where value is null/undef or number
    				return ret == null ? "" : ret;
    			}

    			return;
    		}

    		valueIsFunction = isFunction( value );

    		return this.each( function( i ) {
    			var val;

    			if ( this.nodeType !== 1 ) {
    				return;
    			}

    			if ( valueIsFunction ) {
    				val = value.call( this, i, jQuery( this ).val() );
    			} else {
    				val = value;
    			}

    			// Treat null/undefined as ""; convert numbers to string
    			if ( val == null ) {
    				val = "";

    			} else if ( typeof val === "number" ) {
    				val += "";

    			} else if ( Array.isArray( val ) ) {
    				val = jQuery.map( val, function( value ) {
    					return value == null ? "" : value + "";
    				} );
    			}

    			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

    			// If set returns undefined, fall back to normal setting
    			if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
    				this.value = val;
    			}
    		} );
    	}
    } );

    jQuery.extend( {
    	valHooks: {
    		option: {
    			get: function( elem ) {

    				var val = jQuery.find.attr( elem, "value" );
    				return val != null ?
    					val :

    					// Support: IE <=10 - 11 only
    					// option.text throws exceptions (#14686, #14858)
    					// Strip and collapse whitespace
    					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
    					stripAndCollapse( jQuery.text( elem ) );
    			}
    		},
    		select: {
    			get: function( elem ) {
    				var value, option, i,
    					options = elem.options,
    					index = elem.selectedIndex,
    					one = elem.type === "select-one",
    					values = one ? null : [],
    					max = one ? index + 1 : options.length;

    				if ( index < 0 ) {
    					i = max;

    				} else {
    					i = one ? index : 0;
    				}

    				// Loop through all the selected options
    				for ( ; i < max; i++ ) {
    					option = options[ i ];

    					// Support: IE <=9 only
    					// IE8-9 doesn't update selected after form reset (#2551)
    					if ( ( option.selected || i === index ) &&

    							// Don't return options that are disabled or in a disabled optgroup
    							!option.disabled &&
    							( !option.parentNode.disabled ||
    								!nodeName( option.parentNode, "optgroup" ) ) ) {

    						// Get the specific value for the option
    						value = jQuery( option ).val();

    						// We don't need an array for one selects
    						if ( one ) {
    							return value;
    						}

    						// Multi-Selects return an array
    						values.push( value );
    					}
    				}

    				return values;
    			},

    			set: function( elem, value ) {
    				var optionSet, option,
    					options = elem.options,
    					values = jQuery.makeArray( value ),
    					i = options.length;

    				while ( i-- ) {
    					option = options[ i ];

    					/* eslint-disable no-cond-assign */

    					if ( option.selected =
    						jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
    					) {
    						optionSet = true;
    					}

    					/* eslint-enable no-cond-assign */
    				}

    				// Force browsers to behave consistently when non-matching value is set
    				if ( !optionSet ) {
    					elem.selectedIndex = -1;
    				}
    				return values;
    			}
    		}
    	}
    } );

    // Radios and checkboxes getter/setter
    jQuery.each( [ "radio", "checkbox" ], function() {
    	jQuery.valHooks[ this ] = {
    		set: function( elem, value ) {
    			if ( Array.isArray( value ) ) {
    				return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
    			}
    		}
    	};
    	if ( !support.checkOn ) {
    		jQuery.valHooks[ this ].get = function( elem ) {
    			return elem.getAttribute( "value" ) === null ? "on" : elem.value;
    		};
    	}
    } );




    // Return jQuery for attributes-only inclusion


    support.focusin = "onfocusin" in window;


    var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
    	stopPropagationCallback = function( e ) {
    		e.stopPropagation();
    	};

    jQuery.extend( jQuery.event, {

    	trigger: function( event, data, elem, onlyHandlers ) {

    		var i, cur, tmp, bubbleType, ontype, handle, special, lastElement,
    			eventPath = [ elem || document ],
    			type = hasOwn.call( event, "type" ) ? event.type : event,
    			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

    		cur = lastElement = tmp = elem = elem || document;

    		// Don't do events on text and comment nodes
    		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
    			return;
    		}

    		// focus/blur morphs to focusin/out; ensure we're not firing them right now
    		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
    			return;
    		}

    		if ( type.indexOf( "." ) > -1 ) {

    			// Namespaced trigger; create a regexp to match event type in handle()
    			namespaces = type.split( "." );
    			type = namespaces.shift();
    			namespaces.sort();
    		}
    		ontype = type.indexOf( ":" ) < 0 && "on" + type;

    		// Caller can pass in a jQuery.Event object, Object, or just an event type string
    		event = event[ jQuery.expando ] ?
    			event :
    			new jQuery.Event( type, typeof event === "object" && event );

    		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
    		event.isTrigger = onlyHandlers ? 2 : 3;
    		event.namespace = namespaces.join( "." );
    		event.rnamespace = event.namespace ?
    			new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
    			null;

    		// Clean up the event in case it is being reused
    		event.result = undefined;
    		if ( !event.target ) {
    			event.target = elem;
    		}

    		// Clone any incoming data and prepend the event, creating the handler arg list
    		data = data == null ?
    			[ event ] :
    			jQuery.makeArray( data, [ event ] );

    		// Allow special events to draw outside the lines
    		special = jQuery.event.special[ type ] || {};
    		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
    			return;
    		}

    		// Determine event propagation path in advance, per W3C events spec (#9951)
    		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
    		if ( !onlyHandlers && !special.noBubble && !isWindow( elem ) ) {

    			bubbleType = special.delegateType || type;
    			if ( !rfocusMorph.test( bubbleType + type ) ) {
    				cur = cur.parentNode;
    			}
    			for ( ; cur; cur = cur.parentNode ) {
    				eventPath.push( cur );
    				tmp = cur;
    			}

    			// Only add window if we got to document (e.g., not plain obj or detached DOM)
    			if ( tmp === ( elem.ownerDocument || document ) ) {
    				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
    			}
    		}

    		// Fire handlers on the event path
    		i = 0;
    		while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {
    			lastElement = cur;
    			event.type = i > 1 ?
    				bubbleType :
    				special.bindType || type;

    			// jQuery handler
    			handle = ( dataPriv.get( cur, "events" ) || {} )[ event.type ] &&
    				dataPriv.get( cur, "handle" );
    			if ( handle ) {
    				handle.apply( cur, data );
    			}

    			// Native handler
    			handle = ontype && cur[ ontype ];
    			if ( handle && handle.apply && acceptData( cur ) ) {
    				event.result = handle.apply( cur, data );
    				if ( event.result === false ) {
    					event.preventDefault();
    				}
    			}
    		}
    		event.type = type;

    		// If nobody prevented the default action, do it now
    		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

    			if ( ( !special._default ||
    				special._default.apply( eventPath.pop(), data ) === false ) &&
    				acceptData( elem ) ) {

    				// Call a native DOM method on the target with the same name as the event.
    				// Don't do default actions on window, that's where global variables be (#6170)
    				if ( ontype && isFunction( elem[ type ] ) && !isWindow( elem ) ) {

    					// Don't re-trigger an onFOO event when we call its FOO() method
    					tmp = elem[ ontype ];

    					if ( tmp ) {
    						elem[ ontype ] = null;
    					}

    					// Prevent re-triggering of the same event, since we already bubbled it above
    					jQuery.event.triggered = type;

    					if ( event.isPropagationStopped() ) {
    						lastElement.addEventListener( type, stopPropagationCallback );
    					}

    					elem[ type ]();

    					if ( event.isPropagationStopped() ) {
    						lastElement.removeEventListener( type, stopPropagationCallback );
    					}

    					jQuery.event.triggered = undefined;

    					if ( tmp ) {
    						elem[ ontype ] = tmp;
    					}
    				}
    			}
    		}

    		return event.result;
    	},

    	// Piggyback on a donor event to simulate a different one
    	// Used only for `focus(in | out)` events
    	simulate: function( type, elem, event ) {
    		var e = jQuery.extend(
    			new jQuery.Event(),
    			event,
    			{
    				type: type,
    				isSimulated: true
    			}
    		);

    		jQuery.event.trigger( e, null, elem );
    	}

    } );

    jQuery.fn.extend( {

    	trigger: function( type, data ) {
    		return this.each( function() {
    			jQuery.event.trigger( type, data, this );
    		} );
    	},
    	triggerHandler: function( type, data ) {
    		var elem = this[ 0 ];
    		if ( elem ) {
    			return jQuery.event.trigger( type, data, elem, true );
    		}
    	}
    } );


    // Support: Firefox <=44
    // Firefox doesn't have focus(in | out) events
    // Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
    //
    // Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
    // focus(in | out) events fire after focus & blur events,
    // which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
    // Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
    if ( !support.focusin ) {
    	jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

    		// Attach a single capturing handler on the document while someone wants focusin/focusout
    		var handler = function( event ) {
    			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
    		};

    		jQuery.event.special[ fix ] = {
    			setup: function() {
    				var doc = this.ownerDocument || this,
    					attaches = dataPriv.access( doc, fix );

    				if ( !attaches ) {
    					doc.addEventListener( orig, handler, true );
    				}
    				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
    			},
    			teardown: function() {
    				var doc = this.ownerDocument || this,
    					attaches = dataPriv.access( doc, fix ) - 1;

    				if ( !attaches ) {
    					doc.removeEventListener( orig, handler, true );
    					dataPriv.remove( doc, fix );

    				} else {
    					dataPriv.access( doc, fix, attaches );
    				}
    			}
    		};
    	} );
    }
    var location = window.location;

    var nonce = Date.now();

    var rquery = ( /\?/ );



    // Cross-browser xml parsing
    jQuery.parseXML = function( data ) {
    	var xml;
    	if ( !data || typeof data !== "string" ) {
    		return null;
    	}

    	// Support: IE 9 - 11 only
    	// IE throws on parseFromString with invalid input.
    	try {
    		xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
    	} catch ( e ) {
    		xml = undefined;
    	}

    	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
    		jQuery.error( "Invalid XML: " + data );
    	}
    	return xml;
    };


    var
    	rbracket = /\[\]$/,
    	rCRLF = /\r?\n/g,
    	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
    	rsubmittable = /^(?:input|select|textarea|keygen)/i;

    function buildParams( prefix, obj, traditional, add ) {
    	var name;

    	if ( Array.isArray( obj ) ) {

    		// Serialize array item.
    		jQuery.each( obj, function( i, v ) {
    			if ( traditional || rbracket.test( prefix ) ) {

    				// Treat each array item as a scalar.
    				add( prefix, v );

    			} else {

    				// Item is non-scalar (array or object), encode its numeric index.
    				buildParams(
    					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
    					v,
    					traditional,
    					add
    				);
    			}
    		} );

    	} else if ( !traditional && toType( obj ) === "object" ) {

    		// Serialize object item.
    		for ( name in obj ) {
    			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
    		}

    	} else {

    		// Serialize scalar item.
    		add( prefix, obj );
    	}
    }

    // Serialize an array of form elements or a set of
    // key/values into a query string
    jQuery.param = function( a, traditional ) {
    	var prefix,
    		s = [],
    		add = function( key, valueOrFunction ) {

    			// If value is a function, invoke it and use its return value
    			var value = isFunction( valueOrFunction ) ?
    				valueOrFunction() :
    				valueOrFunction;

    			s[ s.length ] = encodeURIComponent( key ) + "=" +
    				encodeURIComponent( value == null ? "" : value );
    		};

    	if ( a == null ) {
    		return "";
    	}

    	// If an array was passed in, assume that it is an array of form elements.
    	if ( Array.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

    		// Serialize the form elements
    		jQuery.each( a, function() {
    			add( this.name, this.value );
    		} );

    	} else {

    		// If traditional, encode the "old" way (the way 1.3.2 or older
    		// did it), otherwise encode params recursively.
    		for ( prefix in a ) {
    			buildParams( prefix, a[ prefix ], traditional, add );
    		}
    	}

    	// Return the resulting serialization
    	return s.join( "&" );
    };

    jQuery.fn.extend( {
    	serialize: function() {
    		return jQuery.param( this.serializeArray() );
    	},
    	serializeArray: function() {
    		return this.map( function() {

    			// Can add propHook for "elements" to filter or add form elements
    			var elements = jQuery.prop( this, "elements" );
    			return elements ? jQuery.makeArray( elements ) : this;
    		} )
    		.filter( function() {
    			var type = this.type;

    			// Use .is( ":disabled" ) so that fieldset[disabled] works
    			return this.name && !jQuery( this ).is( ":disabled" ) &&
    				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
    				( this.checked || !rcheckableType.test( type ) );
    		} )
    		.map( function( i, elem ) {
    			var val = jQuery( this ).val();

    			if ( val == null ) {
    				return null;
    			}

    			if ( Array.isArray( val ) ) {
    				return jQuery.map( val, function( val ) {
    					return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
    				} );
    			}

    			return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
    		} ).get();
    	}
    } );


    var
    	r20 = /%20/g,
    	rhash = /#.*$/,
    	rantiCache = /([?&])_=[^&]*/,
    	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

    	// #7653, #8125, #8152: local protocol detection
    	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
    	rnoContent = /^(?:GET|HEAD)$/,
    	rprotocol = /^\/\//,

    	/* Prefilters
    	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
    	 * 2) These are called:
    	 *    - BEFORE asking for a transport
    	 *    - AFTER param serialization (s.data is a string if s.processData is true)
    	 * 3) key is the dataType
    	 * 4) the catchall symbol "*" can be used
    	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
    	 */
    	prefilters = {},

    	/* Transports bindings
    	 * 1) key is the dataType
    	 * 2) the catchall symbol "*" can be used
    	 * 3) selection will start with transport dataType and THEN go to "*" if needed
    	 */
    	transports = {},

    	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
    	allTypes = "*/".concat( "*" ),

    	// Anchor tag for parsing the document origin
    	originAnchor = document.createElement( "a" );
    	originAnchor.href = location.href;

    // Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
    function addToPrefiltersOrTransports( structure ) {

    	// dataTypeExpression is optional and defaults to "*"
    	return function( dataTypeExpression, func ) {

    		if ( typeof dataTypeExpression !== "string" ) {
    			func = dataTypeExpression;
    			dataTypeExpression = "*";
    		}

    		var dataType,
    			i = 0,
    			dataTypes = dataTypeExpression.toLowerCase().match( rnothtmlwhite ) || [];

    		if ( isFunction( func ) ) {

    			// For each dataType in the dataTypeExpression
    			while ( ( dataType = dataTypes[ i++ ] ) ) {

    				// Prepend if requested
    				if ( dataType[ 0 ] === "+" ) {
    					dataType = dataType.slice( 1 ) || "*";
    					( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

    				// Otherwise append
    				} else {
    					( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
    				}
    			}
    		}
    	};
    }

    // Base inspection function for prefilters and transports
    function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

    	var inspected = {},
    		seekingTransport = ( structure === transports );

    	function inspect( dataType ) {
    		var selected;
    		inspected[ dataType ] = true;
    		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
    			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
    			if ( typeof dataTypeOrTransport === "string" &&
    				!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

    				options.dataTypes.unshift( dataTypeOrTransport );
    				inspect( dataTypeOrTransport );
    				return false;
    			} else if ( seekingTransport ) {
    				return !( selected = dataTypeOrTransport );
    			}
    		} );
    		return selected;
    	}

    	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
    }

    // A special extend for ajax options
    // that takes "flat" options (not to be deep extended)
    // Fixes #9887
    function ajaxExtend( target, src ) {
    	var key, deep,
    		flatOptions = jQuery.ajaxSettings.flatOptions || {};

    	for ( key in src ) {
    		if ( src[ key ] !== undefined ) {
    			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
    		}
    	}
    	if ( deep ) {
    		jQuery.extend( true, target, deep );
    	}

    	return target;
    }

    /* Handles responses to an ajax request:
     * - finds the right dataType (mediates between content-type and expected dataType)
     * - returns the corresponding response
     */
    function ajaxHandleResponses( s, jqXHR, responses ) {

    	var ct, type, finalDataType, firstDataType,
    		contents = s.contents,
    		dataTypes = s.dataTypes;

    	// Remove auto dataType and get content-type in the process
    	while ( dataTypes[ 0 ] === "*" ) {
    		dataTypes.shift();
    		if ( ct === undefined ) {
    			ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
    		}
    	}

    	// Check if we're dealing with a known content-type
    	if ( ct ) {
    		for ( type in contents ) {
    			if ( contents[ type ] && contents[ type ].test( ct ) ) {
    				dataTypes.unshift( type );
    				break;
    			}
    		}
    	}

    	// Check to see if we have a response for the expected dataType
    	if ( dataTypes[ 0 ] in responses ) {
    		finalDataType = dataTypes[ 0 ];
    	} else {

    		// Try convertible dataTypes
    		for ( type in responses ) {
    			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
    				finalDataType = type;
    				break;
    			}
    			if ( !firstDataType ) {
    				firstDataType = type;
    			}
    		}

    		// Or just use first one
    		finalDataType = finalDataType || firstDataType;
    	}

    	// If we found a dataType
    	// We add the dataType to the list if needed
    	// and return the corresponding response
    	if ( finalDataType ) {
    		if ( finalDataType !== dataTypes[ 0 ] ) {
    			dataTypes.unshift( finalDataType );
    		}
    		return responses[ finalDataType ];
    	}
    }

    /* Chain conversions given the request and the original response
     * Also sets the responseXXX fields on the jqXHR instance
     */
    function ajaxConvert( s, response, jqXHR, isSuccess ) {
    	var conv2, current, conv, tmp, prev,
    		converters = {},

    		// Work with a copy of dataTypes in case we need to modify it for conversion
    		dataTypes = s.dataTypes.slice();

    	// Create converters map with lowercased keys
    	if ( dataTypes[ 1 ] ) {
    		for ( conv in s.converters ) {
    			converters[ conv.toLowerCase() ] = s.converters[ conv ];
    		}
    	}

    	current = dataTypes.shift();

    	// Convert to each sequential dataType
    	while ( current ) {

    		if ( s.responseFields[ current ] ) {
    			jqXHR[ s.responseFields[ current ] ] = response;
    		}

    		// Apply the dataFilter if provided
    		if ( !prev && isSuccess && s.dataFilter ) {
    			response = s.dataFilter( response, s.dataType );
    		}

    		prev = current;
    		current = dataTypes.shift();

    		if ( current ) {

    			// There's only work to do if current dataType is non-auto
    			if ( current === "*" ) {

    				current = prev;

    			// Convert response if prev dataType is non-auto and differs from current
    			} else if ( prev !== "*" && prev !== current ) {

    				// Seek a direct converter
    				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

    				// If none found, seek a pair
    				if ( !conv ) {
    					for ( conv2 in converters ) {

    						// If conv2 outputs current
    						tmp = conv2.split( " " );
    						if ( tmp[ 1 ] === current ) {

    							// If prev can be converted to accepted input
    							conv = converters[ prev + " " + tmp[ 0 ] ] ||
    								converters[ "* " + tmp[ 0 ] ];
    							if ( conv ) {

    								// Condense equivalence converters
    								if ( conv === true ) {
    									conv = converters[ conv2 ];

    								// Otherwise, insert the intermediate dataType
    								} else if ( converters[ conv2 ] !== true ) {
    									current = tmp[ 0 ];
    									dataTypes.unshift( tmp[ 1 ] );
    								}
    								break;
    							}
    						}
    					}
    				}

    				// Apply converter (if not an equivalence)
    				if ( conv !== true ) {

    					// Unless errors are allowed to bubble, catch and return them
    					if ( conv && s.throws ) {
    						response = conv( response );
    					} else {
    						try {
    							response = conv( response );
    						} catch ( e ) {
    							return {
    								state: "parsererror",
    								error: conv ? e : "No conversion from " + prev + " to " + current
    							};
    						}
    					}
    				}
    			}
    		}
    	}

    	return { state: "success", data: response };
    }

    jQuery.extend( {

    	// Counter for holding the number of active queries
    	active: 0,

    	// Last-Modified header cache for next request
    	lastModified: {},
    	etag: {},

    	ajaxSettings: {
    		url: location.href,
    		type: "GET",
    		isLocal: rlocalProtocol.test( location.protocol ),
    		global: true,
    		processData: true,
    		async: true,
    		contentType: "application/x-www-form-urlencoded; charset=UTF-8",

    		/*
    		timeout: 0,
    		data: null,
    		dataType: null,
    		username: null,
    		password: null,
    		cache: null,
    		throws: false,
    		traditional: false,
    		headers: {},
    		*/

    		accepts: {
    			"*": allTypes,
    			text: "text/plain",
    			html: "text/html",
    			xml: "application/xml, text/xml",
    			json: "application/json, text/javascript"
    		},

    		contents: {
    			xml: /\bxml\b/,
    			html: /\bhtml/,
    			json: /\bjson\b/
    		},

    		responseFields: {
    			xml: "responseXML",
    			text: "responseText",
    			json: "responseJSON"
    		},

    		// Data converters
    		// Keys separate source (or catchall "*") and destination types with a single space
    		converters: {

    			// Convert anything to text
    			"* text": String,

    			// Text to html (true = no transformation)
    			"text html": true,

    			// Evaluate text as a json expression
    			"text json": JSON.parse,

    			// Parse text as xml
    			"text xml": jQuery.parseXML
    		},

    		// For options that shouldn't be deep extended:
    		// you can add your own custom options here if
    		// and when you create one that shouldn't be
    		// deep extended (see ajaxExtend)
    		flatOptions: {
    			url: true,
    			context: true
    		}
    	},

    	// Creates a full fledged settings object into target
    	// with both ajaxSettings and settings fields.
    	// If target is omitted, writes into ajaxSettings.
    	ajaxSetup: function( target, settings ) {
    		return settings ?

    			// Building a settings object
    			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

    			// Extending ajaxSettings
    			ajaxExtend( jQuery.ajaxSettings, target );
    	},

    	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
    	ajaxTransport: addToPrefiltersOrTransports( transports ),

    	// Main method
    	ajax: function( url, options ) {

    		// If url is an object, simulate pre-1.5 signature
    		if ( typeof url === "object" ) {
    			options = url;
    			url = undefined;
    		}

    		// Force options to be an object
    		options = options || {};

    		var transport,

    			// URL without anti-cache param
    			cacheURL,

    			// Response headers
    			responseHeadersString,
    			responseHeaders,

    			// timeout handle
    			timeoutTimer,

    			// Url cleanup var
    			urlAnchor,

    			// Request state (becomes false upon send and true upon completion)
    			completed,

    			// To know if global events are to be dispatched
    			fireGlobals,

    			// Loop variable
    			i,

    			// uncached part of the url
    			uncached,

    			// Create the final options object
    			s = jQuery.ajaxSetup( {}, options ),

    			// Callbacks context
    			callbackContext = s.context || s,

    			// Context for global events is callbackContext if it is a DOM node or jQuery collection
    			globalEventContext = s.context &&
    				( callbackContext.nodeType || callbackContext.jquery ) ?
    					jQuery( callbackContext ) :
    					jQuery.event,

    			// Deferreds
    			deferred = jQuery.Deferred(),
    			completeDeferred = jQuery.Callbacks( "once memory" ),

    			// Status-dependent callbacks
    			statusCode = s.statusCode || {},

    			// Headers (they are sent all at once)
    			requestHeaders = {},
    			requestHeadersNames = {},

    			// Default abort message
    			strAbort = "canceled",

    			// Fake xhr
    			jqXHR = {
    				readyState: 0,

    				// Builds headers hashtable if needed
    				getResponseHeader: function( key ) {
    					var match;
    					if ( completed ) {
    						if ( !responseHeaders ) {
    							responseHeaders = {};
    							while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
    								responseHeaders[ match[ 1 ].toLowerCase() + " " ] =
    									( responseHeaders[ match[ 1 ].toLowerCase() + " " ] || [] )
    										.concat( match[ 2 ] );
    							}
    						}
    						match = responseHeaders[ key.toLowerCase() + " " ];
    					}
    					return match == null ? null : match.join( ", " );
    				},

    				// Raw string
    				getAllResponseHeaders: function() {
    					return completed ? responseHeadersString : null;
    				},

    				// Caches the header
    				setRequestHeader: function( name, value ) {
    					if ( completed == null ) {
    						name = requestHeadersNames[ name.toLowerCase() ] =
    							requestHeadersNames[ name.toLowerCase() ] || name;
    						requestHeaders[ name ] = value;
    					}
    					return this;
    				},

    				// Overrides response content-type header
    				overrideMimeType: function( type ) {
    					if ( completed == null ) {
    						s.mimeType = type;
    					}
    					return this;
    				},

    				// Status-dependent callbacks
    				statusCode: function( map ) {
    					var code;
    					if ( map ) {
    						if ( completed ) {

    							// Execute the appropriate callbacks
    							jqXHR.always( map[ jqXHR.status ] );
    						} else {

    							// Lazy-add the new callbacks in a way that preserves old ones
    							for ( code in map ) {
    								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
    							}
    						}
    					}
    					return this;
    				},

    				// Cancel the request
    				abort: function( statusText ) {
    					var finalText = statusText || strAbort;
    					if ( transport ) {
    						transport.abort( finalText );
    					}
    					done( 0, finalText );
    					return this;
    				}
    			};

    		// Attach deferreds
    		deferred.promise( jqXHR );

    		// Add protocol if not provided (prefilters might expect it)
    		// Handle falsy url in the settings object (#10093: consistency with old signature)
    		// We also use the url parameter if available
    		s.url = ( ( url || s.url || location.href ) + "" )
    			.replace( rprotocol, location.protocol + "//" );

    		// Alias method option to type as per ticket #12004
    		s.type = options.method || options.type || s.method || s.type;

    		// Extract dataTypes list
    		s.dataTypes = ( s.dataType || "*" ).toLowerCase().match( rnothtmlwhite ) || [ "" ];

    		// A cross-domain request is in order when the origin doesn't match the current origin.
    		if ( s.crossDomain == null ) {
    			urlAnchor = document.createElement( "a" );

    			// Support: IE <=8 - 11, Edge 12 - 15
    			// IE throws exception on accessing the href property if url is malformed,
    			// e.g. http://example.com:80x/
    			try {
    				urlAnchor.href = s.url;

    				// Support: IE <=8 - 11 only
    				// Anchor's host property isn't correctly set when s.url is relative
    				urlAnchor.href = urlAnchor.href;
    				s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
    					urlAnchor.protocol + "//" + urlAnchor.host;
    			} catch ( e ) {

    				// If there is an error parsing the URL, assume it is crossDomain,
    				// it can be rejected by the transport if it is invalid
    				s.crossDomain = true;
    			}
    		}

    		// Convert data if not already a string
    		if ( s.data && s.processData && typeof s.data !== "string" ) {
    			s.data = jQuery.param( s.data, s.traditional );
    		}

    		// Apply prefilters
    		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

    		// If request was aborted inside a prefilter, stop there
    		if ( completed ) {
    			return jqXHR;
    		}

    		// We can fire global events as of now if asked to
    		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
    		fireGlobals = jQuery.event && s.global;

    		// Watch for a new set of requests
    		if ( fireGlobals && jQuery.active++ === 0 ) {
    			jQuery.event.trigger( "ajaxStart" );
    		}

    		// Uppercase the type
    		s.type = s.type.toUpperCase();

    		// Determine if request has content
    		s.hasContent = !rnoContent.test( s.type );

    		// Save the URL in case we're toying with the If-Modified-Since
    		// and/or If-None-Match header later on
    		// Remove hash to simplify url manipulation
    		cacheURL = s.url.replace( rhash, "" );

    		// More options handling for requests with no content
    		if ( !s.hasContent ) {

    			// Remember the hash so we can put it back
    			uncached = s.url.slice( cacheURL.length );

    			// If data is available and should be processed, append data to url
    			if ( s.data && ( s.processData || typeof s.data === "string" ) ) {
    				cacheURL += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data;

    				// #9682: remove data so that it's not used in an eventual retry
    				delete s.data;
    			}

    			// Add or update anti-cache param if needed
    			if ( s.cache === false ) {
    				cacheURL = cacheURL.replace( rantiCache, "$1" );
    				uncached = ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ( nonce++ ) + uncached;
    			}

    			// Put hash and anti-cache on the URL that will be requested (gh-1732)
    			s.url = cacheURL + uncached;

    		// Change '%20' to '+' if this is encoded form body content (gh-2658)
    		} else if ( s.data && s.processData &&
    			( s.contentType || "" ).indexOf( "application/x-www-form-urlencoded" ) === 0 ) {
    			s.data = s.data.replace( r20, "+" );
    		}

    		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
    		if ( s.ifModified ) {
    			if ( jQuery.lastModified[ cacheURL ] ) {
    				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
    			}
    			if ( jQuery.etag[ cacheURL ] ) {
    				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
    			}
    		}

    		// Set the correct header, if data is being sent
    		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
    			jqXHR.setRequestHeader( "Content-Type", s.contentType );
    		}

    		// Set the Accepts header for the server, depending on the dataType
    		jqXHR.setRequestHeader(
    			"Accept",
    			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
    				s.accepts[ s.dataTypes[ 0 ] ] +
    					( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
    				s.accepts[ "*" ]
    		);

    		// Check for headers option
    		for ( i in s.headers ) {
    			jqXHR.setRequestHeader( i, s.headers[ i ] );
    		}

    		// Allow custom headers/mimetypes and early abort
    		if ( s.beforeSend &&
    			( s.beforeSend.call( callbackContext, jqXHR, s ) === false || completed ) ) {

    			// Abort if not done already and return
    			return jqXHR.abort();
    		}

    		// Aborting is no longer a cancellation
    		strAbort = "abort";

    		// Install callbacks on deferreds
    		completeDeferred.add( s.complete );
    		jqXHR.done( s.success );
    		jqXHR.fail( s.error );

    		// Get transport
    		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

    		// If no transport, we auto-abort
    		if ( !transport ) {
    			done( -1, "No Transport" );
    		} else {
    			jqXHR.readyState = 1;

    			// Send global event
    			if ( fireGlobals ) {
    				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
    			}

    			// If request was aborted inside ajaxSend, stop there
    			if ( completed ) {
    				return jqXHR;
    			}

    			// Timeout
    			if ( s.async && s.timeout > 0 ) {
    				timeoutTimer = window.setTimeout( function() {
    					jqXHR.abort( "timeout" );
    				}, s.timeout );
    			}

    			try {
    				completed = false;
    				transport.send( requestHeaders, done );
    			} catch ( e ) {

    				// Rethrow post-completion exceptions
    				if ( completed ) {
    					throw e;
    				}

    				// Propagate others as results
    				done( -1, e );
    			}
    		}

    		// Callback for when everything is done
    		function done( status, nativeStatusText, responses, headers ) {
    			var isSuccess, success, error, response, modified,
    				statusText = nativeStatusText;

    			// Ignore repeat invocations
    			if ( completed ) {
    				return;
    			}

    			completed = true;

    			// Clear timeout if it exists
    			if ( timeoutTimer ) {
    				window.clearTimeout( timeoutTimer );
    			}

    			// Dereference transport for early garbage collection
    			// (no matter how long the jqXHR object will be used)
    			transport = undefined;

    			// Cache response headers
    			responseHeadersString = headers || "";

    			// Set readyState
    			jqXHR.readyState = status > 0 ? 4 : 0;

    			// Determine if successful
    			isSuccess = status >= 200 && status < 300 || status === 304;

    			// Get response data
    			if ( responses ) {
    				response = ajaxHandleResponses( s, jqXHR, responses );
    			}

    			// Convert no matter what (that way responseXXX fields are always set)
    			response = ajaxConvert( s, response, jqXHR, isSuccess );

    			// If successful, handle type chaining
    			if ( isSuccess ) {

    				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
    				if ( s.ifModified ) {
    					modified = jqXHR.getResponseHeader( "Last-Modified" );
    					if ( modified ) {
    						jQuery.lastModified[ cacheURL ] = modified;
    					}
    					modified = jqXHR.getResponseHeader( "etag" );
    					if ( modified ) {
    						jQuery.etag[ cacheURL ] = modified;
    					}
    				}

    				// if no content
    				if ( status === 204 || s.type === "HEAD" ) {
    					statusText = "nocontent";

    				// if not modified
    				} else if ( status === 304 ) {
    					statusText = "notmodified";

    				// If we have data, let's convert it
    				} else {
    					statusText = response.state;
    					success = response.data;
    					error = response.error;
    					isSuccess = !error;
    				}
    			} else {

    				// Extract error from statusText and normalize for non-aborts
    				error = statusText;
    				if ( status || !statusText ) {
    					statusText = "error";
    					if ( status < 0 ) {
    						status = 0;
    					}
    				}
    			}

    			// Set data for the fake xhr object
    			jqXHR.status = status;
    			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

    			// Success/Error
    			if ( isSuccess ) {
    				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
    			} else {
    				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
    			}

    			// Status-dependent callbacks
    			jqXHR.statusCode( statusCode );
    			statusCode = undefined;

    			if ( fireGlobals ) {
    				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
    					[ jqXHR, s, isSuccess ? success : error ] );
    			}

    			// Complete
    			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

    			if ( fireGlobals ) {
    				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

    				// Handle the global AJAX counter
    				if ( !( --jQuery.active ) ) {
    					jQuery.event.trigger( "ajaxStop" );
    				}
    			}
    		}

    		return jqXHR;
    	},

    	getJSON: function( url, data, callback ) {
    		return jQuery.get( url, data, callback, "json" );
    	},

    	getScript: function( url, callback ) {
    		return jQuery.get( url, undefined, callback, "script" );
    	}
    } );

    jQuery.each( [ "get", "post" ], function( i, method ) {
    	jQuery[ method ] = function( url, data, callback, type ) {

    		// Shift arguments if data argument was omitted
    		if ( isFunction( data ) ) {
    			type = type || callback;
    			callback = data;
    			data = undefined;
    		}

    		// The url can be an options object (which then must have .url)
    		return jQuery.ajax( jQuery.extend( {
    			url: url,
    			type: method,
    			dataType: type,
    			data: data,
    			success: callback
    		}, jQuery.isPlainObject( url ) && url ) );
    	};
    } );


    jQuery._evalUrl = function( url, options ) {
    	return jQuery.ajax( {
    		url: url,

    		// Make this explicit, since user can override this through ajaxSetup (#11264)
    		type: "GET",
    		dataType: "script",
    		cache: true,
    		async: false,
    		global: false,

    		// Only evaluate the response if it is successful (gh-4126)
    		// dataFilter is not invoked for failure responses, so using it instead
    		// of the default converter is kludgy but it works.
    		converters: {
    			"text script": function() {}
    		},
    		dataFilter: function( response ) {
    			jQuery.globalEval( response, options );
    		}
    	} );
    };


    jQuery.fn.extend( {
    	wrapAll: function( html ) {
    		var wrap;

    		if ( this[ 0 ] ) {
    			if ( isFunction( html ) ) {
    				html = html.call( this[ 0 ] );
    			}

    			// The elements to wrap the target around
    			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

    			if ( this[ 0 ].parentNode ) {
    				wrap.insertBefore( this[ 0 ] );
    			}

    			wrap.map( function() {
    				var elem = this;

    				while ( elem.firstElementChild ) {
    					elem = elem.firstElementChild;
    				}

    				return elem;
    			} ).append( this );
    		}

    		return this;
    	},

    	wrapInner: function( html ) {
    		if ( isFunction( html ) ) {
    			return this.each( function( i ) {
    				jQuery( this ).wrapInner( html.call( this, i ) );
    			} );
    		}

    		return this.each( function() {
    			var self = jQuery( this ),
    				contents = self.contents();

    			if ( contents.length ) {
    				contents.wrapAll( html );

    			} else {
    				self.append( html );
    			}
    		} );
    	},

    	wrap: function( html ) {
    		var htmlIsFunction = isFunction( html );

    		return this.each( function( i ) {
    			jQuery( this ).wrapAll( htmlIsFunction ? html.call( this, i ) : html );
    		} );
    	},

    	unwrap: function( selector ) {
    		this.parent( selector ).not( "body" ).each( function() {
    			jQuery( this ).replaceWith( this.childNodes );
    		} );
    		return this;
    	}
    } );


    jQuery.expr.pseudos.hidden = function( elem ) {
    	return !jQuery.expr.pseudos.visible( elem );
    };
    jQuery.expr.pseudos.visible = function( elem ) {
    	return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
    };




    jQuery.ajaxSettings.xhr = function() {
    	try {
    		return new window.XMLHttpRequest();
    	} catch ( e ) {}
    };

    var xhrSuccessStatus = {

    		// File protocol always yields status code 0, assume 200
    		0: 200,

    		// Support: IE <=9 only
    		// #1450: sometimes IE returns 1223 when it should be 204
    		1223: 204
    	},
    	xhrSupported = jQuery.ajaxSettings.xhr();

    support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
    support.ajax = xhrSupported = !!xhrSupported;

    jQuery.ajaxTransport( function( options ) {
    	var callback, errorCallback;

    	// Cross domain only allowed if supported through XMLHttpRequest
    	if ( support.cors || xhrSupported && !options.crossDomain ) {
    		return {
    			send: function( headers, complete ) {
    				var i,
    					xhr = options.xhr();

    				xhr.open(
    					options.type,
    					options.url,
    					options.async,
    					options.username,
    					options.password
    				);

    				// Apply custom fields if provided
    				if ( options.xhrFields ) {
    					for ( i in options.xhrFields ) {
    						xhr[ i ] = options.xhrFields[ i ];
    					}
    				}

    				// Override mime type if needed
    				if ( options.mimeType && xhr.overrideMimeType ) {
    					xhr.overrideMimeType( options.mimeType );
    				}

    				// X-Requested-With header
    				// For cross-domain requests, seeing as conditions for a preflight are
    				// akin to a jigsaw puzzle, we simply never set it to be sure.
    				// (it can always be set on a per-request basis or even using ajaxSetup)
    				// For same-domain requests, won't change header if already provided.
    				if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
    					headers[ "X-Requested-With" ] = "XMLHttpRequest";
    				}

    				// Set headers
    				for ( i in headers ) {
    					xhr.setRequestHeader( i, headers[ i ] );
    				}

    				// Callback
    				callback = function( type ) {
    					return function() {
    						if ( callback ) {
    							callback = errorCallback = xhr.onload =
    								xhr.onerror = xhr.onabort = xhr.ontimeout =
    									xhr.onreadystatechange = null;

    							if ( type === "abort" ) {
    								xhr.abort();
    							} else if ( type === "error" ) {

    								// Support: IE <=9 only
    								// On a manual native abort, IE9 throws
    								// errors on any property access that is not readyState
    								if ( typeof xhr.status !== "number" ) {
    									complete( 0, "error" );
    								} else {
    									complete(

    										// File: protocol always yields status 0; see #8605, #14207
    										xhr.status,
    										xhr.statusText
    									);
    								}
    							} else {
    								complete(
    									xhrSuccessStatus[ xhr.status ] || xhr.status,
    									xhr.statusText,

    									// Support: IE <=9 only
    									// IE9 has no XHR2 but throws on binary (trac-11426)
    									// For XHR2 non-text, let the caller handle it (gh-2498)
    									( xhr.responseType || "text" ) !== "text"  ||
    									typeof xhr.responseText !== "string" ?
    										{ binary: xhr.response } :
    										{ text: xhr.responseText },
    									xhr.getAllResponseHeaders()
    								);
    							}
    						}
    					};
    				};

    				// Listen to events
    				xhr.onload = callback();
    				errorCallback = xhr.onerror = xhr.ontimeout = callback( "error" );

    				// Support: IE 9 only
    				// Use onreadystatechange to replace onabort
    				// to handle uncaught aborts
    				if ( xhr.onabort !== undefined ) {
    					xhr.onabort = errorCallback;
    				} else {
    					xhr.onreadystatechange = function() {

    						// Check readyState before timeout as it changes
    						if ( xhr.readyState === 4 ) {

    							// Allow onerror to be called first,
    							// but that will not handle a native abort
    							// Also, save errorCallback to a variable
    							// as xhr.onerror cannot be accessed
    							window.setTimeout( function() {
    								if ( callback ) {
    									errorCallback();
    								}
    							} );
    						}
    					};
    				}

    				// Create the abort callback
    				callback = callback( "abort" );

    				try {

    					// Do send the request (this may raise an exception)
    					xhr.send( options.hasContent && options.data || null );
    				} catch ( e ) {

    					// #14683: Only rethrow if this hasn't been notified as an error yet
    					if ( callback ) {
    						throw e;
    					}
    				}
    			},

    			abort: function() {
    				if ( callback ) {
    					callback();
    				}
    			}
    		};
    	}
    } );




    // Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
    jQuery.ajaxPrefilter( function( s ) {
    	if ( s.crossDomain ) {
    		s.contents.script = false;
    	}
    } );

    // Install script dataType
    jQuery.ajaxSetup( {
    	accepts: {
    		script: "text/javascript, application/javascript, " +
    			"application/ecmascript, application/x-ecmascript"
    	},
    	contents: {
    		script: /\b(?:java|ecma)script\b/
    	},
    	converters: {
    		"text script": function( text ) {
    			jQuery.globalEval( text );
    			return text;
    		}
    	}
    } );

    // Handle cache's special case and crossDomain
    jQuery.ajaxPrefilter( "script", function( s ) {
    	if ( s.cache === undefined ) {
    		s.cache = false;
    	}
    	if ( s.crossDomain ) {
    		s.type = "GET";
    	}
    } );

    // Bind script tag hack transport
    jQuery.ajaxTransport( "script", function( s ) {

    	// This transport only deals with cross domain or forced-by-attrs requests
    	if ( s.crossDomain || s.scriptAttrs ) {
    		var script, callback;
    		return {
    			send: function( _, complete ) {
    				script = jQuery( "<script>" )
    					.attr( s.scriptAttrs || {} )
    					.prop( { charset: s.scriptCharset, src: s.url } )
    					.on( "load error", callback = function( evt ) {
    						script.remove();
    						callback = null;
    						if ( evt ) {
    							complete( evt.type === "error" ? 404 : 200, evt.type );
    						}
    					} );

    				// Use native DOM manipulation to avoid our domManip AJAX trickery
    				document.head.appendChild( script[ 0 ] );
    			},
    			abort: function() {
    				if ( callback ) {
    					callback();
    				}
    			}
    		};
    	}
    } );




    var oldCallbacks = [],
    	rjsonp = /(=)\?(?=&|$)|\?\?/;

    // Default jsonp settings
    jQuery.ajaxSetup( {
    	jsonp: "callback",
    	jsonpCallback: function() {
    		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
    		this[ callback ] = true;
    		return callback;
    	}
    } );

    // Detect, normalize options and install callbacks for jsonp requests
    jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

    	var callbackName, overwritten, responseContainer,
    		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
    			"url" :
    			typeof s.data === "string" &&
    				( s.contentType || "" )
    					.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
    				rjsonp.test( s.data ) && "data"
    		);

    	// Handle iff the expected data type is "jsonp" or we have a parameter to set
    	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

    		// Get callback name, remembering preexisting value associated with it
    		callbackName = s.jsonpCallback = isFunction( s.jsonpCallback ) ?
    			s.jsonpCallback() :
    			s.jsonpCallback;

    		// Insert callback into url or form data
    		if ( jsonProp ) {
    			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
    		} else if ( s.jsonp !== false ) {
    			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
    		}

    		// Use data converter to retrieve json after script execution
    		s.converters[ "script json" ] = function() {
    			if ( !responseContainer ) {
    				jQuery.error( callbackName + " was not called" );
    			}
    			return responseContainer[ 0 ];
    		};

    		// Force json dataType
    		s.dataTypes[ 0 ] = "json";

    		// Install callback
    		overwritten = window[ callbackName ];
    		window[ callbackName ] = function() {
    			responseContainer = arguments;
    		};

    		// Clean-up function (fires after converters)
    		jqXHR.always( function() {

    			// If previous value didn't exist - remove it
    			if ( overwritten === undefined ) {
    				jQuery( window ).removeProp( callbackName );

    			// Otherwise restore preexisting value
    			} else {
    				window[ callbackName ] = overwritten;
    			}

    			// Save back as free
    			if ( s[ callbackName ] ) {

    				// Make sure that re-using the options doesn't screw things around
    				s.jsonpCallback = originalSettings.jsonpCallback;

    				// Save the callback name for future use
    				oldCallbacks.push( callbackName );
    			}

    			// Call if it was a function and we have a response
    			if ( responseContainer && isFunction( overwritten ) ) {
    				overwritten( responseContainer[ 0 ] );
    			}

    			responseContainer = overwritten = undefined;
    		} );

    		// Delegate to script
    		return "script";
    	}
    } );




    // Support: Safari 8 only
    // In Safari 8 documents created via document.implementation.createHTMLDocument
    // collapse sibling forms: the second one becomes a child of the first one.
    // Because of that, this security measure has to be disabled in Safari 8.
    // https://bugs.webkit.org/show_bug.cgi?id=137337
    support.createHTMLDocument = ( function() {
    	var body = document.implementation.createHTMLDocument( "" ).body;
    	body.innerHTML = "<form></form><form></form>";
    	return body.childNodes.length === 2;
    } )();


    // Argument "data" should be string of html
    // context (optional): If specified, the fragment will be created in this context,
    // defaults to document
    // keepScripts (optional): If true, will include scripts passed in the html string
    jQuery.parseHTML = function( data, context, keepScripts ) {
    	if ( typeof data !== "string" ) {
    		return [];
    	}
    	if ( typeof context === "boolean" ) {
    		keepScripts = context;
    		context = false;
    	}

    	var base, parsed, scripts;

    	if ( !context ) {

    		// Stop scripts or inline event handlers from being executed immediately
    		// by using document.implementation
    		if ( support.createHTMLDocument ) {
    			context = document.implementation.createHTMLDocument( "" );

    			// Set the base href for the created document
    			// so any parsed elements with URLs
    			// are based on the document's URL (gh-2965)
    			base = context.createElement( "base" );
    			base.href = document.location.href;
    			context.head.appendChild( base );
    		} else {
    			context = document;
    		}
    	}

    	parsed = rsingleTag.exec( data );
    	scripts = !keepScripts && [];

    	// Single tag
    	if ( parsed ) {
    		return [ context.createElement( parsed[ 1 ] ) ];
    	}

    	parsed = buildFragment( [ data ], context, scripts );

    	if ( scripts && scripts.length ) {
    		jQuery( scripts ).remove();
    	}

    	return jQuery.merge( [], parsed.childNodes );
    };


    /**
     * Load a url into a page
     */
    jQuery.fn.load = function( url, params, callback ) {
    	var selector, type, response,
    		self = this,
    		off = url.indexOf( " " );

    	if ( off > -1 ) {
    		selector = stripAndCollapse( url.slice( off ) );
    		url = url.slice( 0, off );
    	}

    	// If it's a function
    	if ( isFunction( params ) ) {

    		// We assume that it's the callback
    		callback = params;
    		params = undefined;

    	// Otherwise, build a param string
    	} else if ( params && typeof params === "object" ) {
    		type = "POST";
    	}

    	// If we have elements to modify, make the request
    	if ( self.length > 0 ) {
    		jQuery.ajax( {
    			url: url,

    			// If "type" variable is undefined, then "GET" method will be used.
    			// Make value of this field explicit since
    			// user can override it through ajaxSetup method
    			type: type || "GET",
    			dataType: "html",
    			data: params
    		} ).done( function( responseText ) {

    			// Save response for use in complete callback
    			response = arguments;

    			self.html( selector ?

    				// If a selector was specified, locate the right elements in a dummy div
    				// Exclude scripts to avoid IE 'Permission Denied' errors
    				jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

    				// Otherwise use the full result
    				responseText );

    		// If the request succeeds, this function gets "data", "status", "jqXHR"
    		// but they are ignored because response was set above.
    		// If it fails, this function gets "jqXHR", "status", "error"
    		} ).always( callback && function( jqXHR, status ) {
    			self.each( function() {
    				callback.apply( this, response || [ jqXHR.responseText, status, jqXHR ] );
    			} );
    		} );
    	}

    	return this;
    };




    // Attach a bunch of functions for handling common AJAX events
    jQuery.each( [
    	"ajaxStart",
    	"ajaxStop",
    	"ajaxComplete",
    	"ajaxError",
    	"ajaxSuccess",
    	"ajaxSend"
    ], function( i, type ) {
    	jQuery.fn[ type ] = function( fn ) {
    		return this.on( type, fn );
    	};
    } );




    jQuery.expr.pseudos.animated = function( elem ) {
    	return jQuery.grep( jQuery.timers, function( fn ) {
    		return elem === fn.elem;
    	} ).length;
    };




    jQuery.offset = {
    	setOffset: function( elem, options, i ) {
    		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
    			position = jQuery.css( elem, "position" ),
    			curElem = jQuery( elem ),
    			props = {};

    		// Set position first, in-case top/left are set even on static elem
    		if ( position === "static" ) {
    			elem.style.position = "relative";
    		}

    		curOffset = curElem.offset();
    		curCSSTop = jQuery.css( elem, "top" );
    		curCSSLeft = jQuery.css( elem, "left" );
    		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
    			( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

    		// Need to be able to calculate position if either
    		// top or left is auto and position is either absolute or fixed
    		if ( calculatePosition ) {
    			curPosition = curElem.position();
    			curTop = curPosition.top;
    			curLeft = curPosition.left;

    		} else {
    			curTop = parseFloat( curCSSTop ) || 0;
    			curLeft = parseFloat( curCSSLeft ) || 0;
    		}

    		if ( isFunction( options ) ) {

    			// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
    			options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
    		}

    		if ( options.top != null ) {
    			props.top = ( options.top - curOffset.top ) + curTop;
    		}
    		if ( options.left != null ) {
    			props.left = ( options.left - curOffset.left ) + curLeft;
    		}

    		if ( "using" in options ) {
    			options.using.call( elem, props );

    		} else {
    			curElem.css( props );
    		}
    	}
    };

    jQuery.fn.extend( {

    	// offset() relates an element's border box to the document origin
    	offset: function( options ) {

    		// Preserve chaining for setter
    		if ( arguments.length ) {
    			return options === undefined ?
    				this :
    				this.each( function( i ) {
    					jQuery.offset.setOffset( this, options, i );
    				} );
    		}

    		var rect, win,
    			elem = this[ 0 ];

    		if ( !elem ) {
    			return;
    		}

    		// Return zeros for disconnected and hidden (display: none) elements (gh-2310)
    		// Support: IE <=11 only
    		// Running getBoundingClientRect on a
    		// disconnected node in IE throws an error
    		if ( !elem.getClientRects().length ) {
    			return { top: 0, left: 0 };
    		}

    		// Get document-relative position by adding viewport scroll to viewport-relative gBCR
    		rect = elem.getBoundingClientRect();
    		win = elem.ownerDocument.defaultView;
    		return {
    			top: rect.top + win.pageYOffset,
    			left: rect.left + win.pageXOffset
    		};
    	},

    	// position() relates an element's margin box to its offset parent's padding box
    	// This corresponds to the behavior of CSS absolute positioning
    	position: function() {
    		if ( !this[ 0 ] ) {
    			return;
    		}

    		var offsetParent, offset, doc,
    			elem = this[ 0 ],
    			parentOffset = { top: 0, left: 0 };

    		// position:fixed elements are offset from the viewport, which itself always has zero offset
    		if ( jQuery.css( elem, "position" ) === "fixed" ) {

    			// Assume position:fixed implies availability of getBoundingClientRect
    			offset = elem.getBoundingClientRect();

    		} else {
    			offset = this.offset();

    			// Account for the *real* offset parent, which can be the document or its root element
    			// when a statically positioned element is identified
    			doc = elem.ownerDocument;
    			offsetParent = elem.offsetParent || doc.documentElement;
    			while ( offsetParent &&
    				( offsetParent === doc.body || offsetParent === doc.documentElement ) &&
    				jQuery.css( offsetParent, "position" ) === "static" ) {

    				offsetParent = offsetParent.parentNode;
    			}
    			if ( offsetParent && offsetParent !== elem && offsetParent.nodeType === 1 ) {

    				// Incorporate borders into its offset, since they are outside its content origin
    				parentOffset = jQuery( offsetParent ).offset();
    				parentOffset.top += jQuery.css( offsetParent, "borderTopWidth", true );
    				parentOffset.left += jQuery.css( offsetParent, "borderLeftWidth", true );
    			}
    		}

    		// Subtract parent offsets and element margins
    		return {
    			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
    			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
    		};
    	},

    	// This method will return documentElement in the following cases:
    	// 1) For the element inside the iframe without offsetParent, this method will return
    	//    documentElement of the parent window
    	// 2) For the hidden or detached element
    	// 3) For body or html element, i.e. in case of the html node - it will return itself
    	//
    	// but those exceptions were never presented as a real life use-cases
    	// and might be considered as more preferable results.
    	//
    	// This logic, however, is not guaranteed and can change at any point in the future
    	offsetParent: function() {
    		return this.map( function() {
    			var offsetParent = this.offsetParent;

    			while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
    				offsetParent = offsetParent.offsetParent;
    			}

    			return offsetParent || documentElement;
    		} );
    	}
    } );

    // Create scrollLeft and scrollTop methods
    jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
    	var top = "pageYOffset" === prop;

    	jQuery.fn[ method ] = function( val ) {
    		return access( this, function( elem, method, val ) {

    			// Coalesce documents and windows
    			var win;
    			if ( isWindow( elem ) ) {
    				win = elem;
    			} else if ( elem.nodeType === 9 ) {
    				win = elem.defaultView;
    			}

    			if ( val === undefined ) {
    				return win ? win[ prop ] : elem[ method ];
    			}

    			if ( win ) {
    				win.scrollTo(
    					!top ? val : win.pageXOffset,
    					top ? val : win.pageYOffset
    				);

    			} else {
    				elem[ method ] = val;
    			}
    		}, method, val, arguments.length );
    	};
    } );

    // Support: Safari <=7 - 9.1, Chrome <=37 - 49
    // Add the top/left cssHooks using jQuery.fn.position
    // Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
    // Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
    // getComputedStyle returns percent when specified for top/left/bottom/right;
    // rather than make the css module depend on the offset module, just check for it here
    jQuery.each( [ "top", "left" ], function( i, prop ) {
    	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
    		function( elem, computed ) {
    			if ( computed ) {
    				computed = curCSS( elem, prop );

    				// If curCSS returns percentage, fallback to offset
    				return rnumnonpx.test( computed ) ?
    					jQuery( elem ).position()[ prop ] + "px" :
    					computed;
    			}
    		}
    	);
    } );


    // Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
    jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
    	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name },
    		function( defaultExtra, funcName ) {

    		// Margin is only for outerHeight, outerWidth
    		jQuery.fn[ funcName ] = function( margin, value ) {
    			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
    				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

    			return access( this, function( elem, type, value ) {
    				var doc;

    				if ( isWindow( elem ) ) {

    					// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
    					return funcName.indexOf( "outer" ) === 0 ?
    						elem[ "inner" + name ] :
    						elem.document.documentElement[ "client" + name ];
    				}

    				// Get document width or height
    				if ( elem.nodeType === 9 ) {
    					doc = elem.documentElement;

    					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
    					// whichever is greatest
    					return Math.max(
    						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
    						elem.body[ "offset" + name ], doc[ "offset" + name ],
    						doc[ "client" + name ]
    					);
    				}

    				return value === undefined ?

    					// Get width or height on the element, requesting but not forcing parseFloat
    					jQuery.css( elem, type, extra ) :

    					// Set width or height on the element
    					jQuery.style( elem, type, value, extra );
    			}, type, chainable ? margin : undefined, chainable );
    		};
    	} );
    } );


    jQuery.each( ( "blur focus focusin focusout resize scroll click dblclick " +
    	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
    	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
    	function( i, name ) {

    	// Handle event binding
    	jQuery.fn[ name ] = function( data, fn ) {
    		return arguments.length > 0 ?
    			this.on( name, null, data, fn ) :
    			this.trigger( name );
    	};
    } );

    jQuery.fn.extend( {
    	hover: function( fnOver, fnOut ) {
    		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
    	}
    } );




    jQuery.fn.extend( {

    	bind: function( types, data, fn ) {
    		return this.on( types, null, data, fn );
    	},
    	unbind: function( types, fn ) {
    		return this.off( types, null, fn );
    	},

    	delegate: function( selector, types, data, fn ) {
    		return this.on( types, selector, data, fn );
    	},
    	undelegate: function( selector, types, fn ) {

    		// ( namespace ) or ( selector, types [, fn] )
    		return arguments.length === 1 ?
    			this.off( selector, "**" ) :
    			this.off( types, selector || "**", fn );
    	}
    } );

    // Bind a function to a context, optionally partially applying any
    // arguments.
    // jQuery.proxy is deprecated to promote standards (specifically Function#bind)
    // However, it is not slated for removal any time soon
    jQuery.proxy = function( fn, context ) {
    	var tmp, args, proxy;

    	if ( typeof context === "string" ) {
    		tmp = fn[ context ];
    		context = fn;
    		fn = tmp;
    	}

    	// Quick check to determine if target is callable, in the spec
    	// this throws a TypeError, but we will just return undefined.
    	if ( !isFunction( fn ) ) {
    		return undefined;
    	}

    	// Simulated bind
    	args = slice.call( arguments, 2 );
    	proxy = function() {
    		return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
    	};

    	// Set the guid of unique handler to the same of original handler, so it can be removed
    	proxy.guid = fn.guid = fn.guid || jQuery.guid++;

    	return proxy;
    };

    jQuery.holdReady = function( hold ) {
    	if ( hold ) {
    		jQuery.readyWait++;
    	} else {
    		jQuery.ready( true );
    	}
    };
    jQuery.isArray = Array.isArray;
    jQuery.parseJSON = JSON.parse;
    jQuery.nodeName = nodeName;
    jQuery.isFunction = isFunction;
    jQuery.isWindow = isWindow;
    jQuery.camelCase = camelCase;
    jQuery.type = toType;

    jQuery.now = Date.now;

    jQuery.isNumeric = function( obj ) {

    	// As of jQuery 3.0, isNumeric is limited to
    	// strings and numbers (primitives or objects)
    	// that can be coerced to finite numbers (gh-2662)
    	var type = jQuery.type( obj );
    	return ( type === "number" || type === "string" ) &&

    		// parseFloat NaNs numeric-cast false positives ("")
    		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
    		// subtraction forces infinities to NaN
    		!isNaN( obj - parseFloat( obj ) );
    };




    var

    	// Map over jQuery in case of overwrite
    	_jQuery = window.jQuery,

    	// Map over the $ in case of overwrite
    	_$ = window.$;

    jQuery.noConflict = function( deep ) {
    	if ( window.$ === jQuery ) {
    		window.$ = _$;
    	}

    	if ( deep && window.jQuery === jQuery ) {
    		window.jQuery = _jQuery;
    	}

    	return jQuery;
    };

    // Expose jQuery and $ identifiers, even in AMD
    // (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
    // and CommonJS for browser emulators (#13566)
    if ( !noGlobal ) {
    	window.jQuery = window.$ = jQuery;
    }




    return jQuery;
    } );
    });

    window.$ = jquery;
    window.jQuery = jquery;

    var openCloseMenu = (function () {
      var $button = $('.js-menu-button');
      var $navigation = $('.js-site-navigation');
      $button.on('click', function () {
        $button.toggleClass('is-open');
        $navigation.toggleClass('is-open');
      });
    });

    /**
     * Owl Carousel v2.3.4
     * Copyright 2013-2018 David Deutsch
     * Licensed under: SEE LICENSE IN https://github.com/OwlCarousel2/OwlCarousel2/blob/master/LICENSE
     */
    (function($, window, document, undefined$1) {

    	/**
    	 * Creates a carousel.
    	 * @class The Owl Carousel.
    	 * @public
    	 * @param {HTMLElement|jQuery} element - The element to create the carousel for.
    	 * @param {Object} [options] - The options
    	 */
    	function Owl(element, options) {

    		/**
    		 * Current settings for the carousel.
    		 * @public
    		 */
    		this.settings = null;

    		/**
    		 * Current options set by the caller including defaults.
    		 * @public
    		 */
    		this.options = $.extend({}, Owl.Defaults, options);

    		/**
    		 * Plugin element.
    		 * @public
    		 */
    		this.$element = $(element);

    		/**
    		 * Proxied event handlers.
    		 * @protected
    		 */
    		this._handlers = {};

    		/**
    		 * References to the running plugins of this carousel.
    		 * @protected
    		 */
    		this._plugins = {};

    		/**
    		 * Currently suppressed events to prevent them from being retriggered.
    		 * @protected
    		 */
    		this._supress = {};

    		/**
    		 * Absolute current position.
    		 * @protected
    		 */
    		this._current = null;

    		/**
    		 * Animation speed in milliseconds.
    		 * @protected
    		 */
    		this._speed = null;

    		/**
    		 * Coordinates of all items in pixel.
    		 * @todo The name of this member is missleading.
    		 * @protected
    		 */
    		this._coordinates = [];

    		/**
    		 * Current breakpoint.
    		 * @todo Real media queries would be nice.
    		 * @protected
    		 */
    		this._breakpoint = null;

    		/**
    		 * Current width of the plugin element.
    		 */
    		this._width = null;

    		/**
    		 * All real items.
    		 * @protected
    		 */
    		this._items = [];

    		/**
    		 * All cloned items.
    		 * @protected
    		 */
    		this._clones = [];

    		/**
    		 * Merge values of all items.
    		 * @todo Maybe this could be part of a plugin.
    		 * @protected
    		 */
    		this._mergers = [];

    		/**
    		 * Widths of all items.
    		 */
    		this._widths = [];

    		/**
    		 * Invalidated parts within the update process.
    		 * @protected
    		 */
    		this._invalidated = {};

    		/**
    		 * Ordered list of workers for the update process.
    		 * @protected
    		 */
    		this._pipe = [];

    		/**
    		 * Current state information for the drag operation.
    		 * @todo #261
    		 * @protected
    		 */
    		this._drag = {
    			time: null,
    			target: null,
    			pointer: null,
    			stage: {
    				start: null,
    				current: null
    			},
    			direction: null
    		};

    		/**
    		 * Current state information and their tags.
    		 * @type {Object}
    		 * @protected
    		 */
    		this._states = {
    			current: {},
    			tags: {
    				'initializing': [ 'busy' ],
    				'animating': [ 'busy' ],
    				'dragging': [ 'interacting' ]
    			}
    		};

    		$.each([ 'onResize', 'onThrottledResize' ], $.proxy(function(i, handler) {
    			this._handlers[handler] = $.proxy(this[handler], this);
    		}, this));

    		$.each(Owl.Plugins, $.proxy(function(key, plugin) {
    			this._plugins[key.charAt(0).toLowerCase() + key.slice(1)]
    				= new plugin(this);
    		}, this));

    		$.each(Owl.Workers, $.proxy(function(priority, worker) {
    			this._pipe.push({
    				'filter': worker.filter,
    				'run': $.proxy(worker.run, this)
    			});
    		}, this));

    		this.setup();
    		this.initialize();
    	}

    	/**
    	 * Default options for the carousel.
    	 * @public
    	 */
    	Owl.Defaults = {
    		items: 3,
    		loop: false,
    		center: false,
    		rewind: false,
    		checkVisibility: true,

    		mouseDrag: true,
    		touchDrag: true,
    		pullDrag: true,
    		freeDrag: false,

    		margin: 0,
    		stagePadding: 0,

    		merge: false,
    		mergeFit: true,
    		autoWidth: false,

    		startPosition: 0,
    		rtl: false,

    		smartSpeed: 250,
    		fluidSpeed: false,
    		dragEndSpeed: false,

    		responsive: {},
    		responsiveRefreshRate: 200,
    		responsiveBaseElement: window,

    		fallbackEasing: 'swing',
    		slideTransition: '',

    		info: false,

    		nestedItemSelector: false,
    		itemElement: 'div',
    		stageElement: 'div',

    		refreshClass: 'owl-refresh',
    		loadedClass: 'owl-loaded',
    		loadingClass: 'owl-loading',
    		rtlClass: 'owl-rtl',
    		responsiveClass: 'owl-responsive',
    		dragClass: 'owl-drag',
    		itemClass: 'owl-item',
    		stageClass: 'owl-stage',
    		stageOuterClass: 'owl-stage-outer',
    		grabClass: 'owl-grab'
    	};

    	/**
    	 * Enumeration for width.
    	 * @public
    	 * @readonly
    	 * @enum {String}
    	 */
    	Owl.Width = {
    		Default: 'default',
    		Inner: 'inner',
    		Outer: 'outer'
    	};

    	/**
    	 * Enumeration for types.
    	 * @public
    	 * @readonly
    	 * @enum {String}
    	 */
    	Owl.Type = {
    		Event: 'event',
    		State: 'state'
    	};

    	/**
    	 * Contains all registered plugins.
    	 * @public
    	 */
    	Owl.Plugins = {};

    	/**
    	 * List of workers involved in the update process.
    	 */
    	Owl.Workers = [ {
    		filter: [ 'width', 'settings' ],
    		run: function() {
    			this._width = this.$element.width();
    		}
    	}, {
    		filter: [ 'width', 'items', 'settings' ],
    		run: function(cache) {
    			cache.current = this._items && this._items[this.relative(this._current)];
    		}
    	}, {
    		filter: [ 'items', 'settings' ],
    		run: function() {
    			this.$stage.children('.cloned').remove();
    		}
    	}, {
    		filter: [ 'width', 'items', 'settings' ],
    		run: function(cache) {
    			var margin = this.settings.margin || '',
    				grid = !this.settings.autoWidth,
    				rtl = this.settings.rtl,
    				css = {
    					'width': 'auto',
    					'margin-left': rtl ? margin : '',
    					'margin-right': rtl ? '' : margin
    				};

    			!grid && this.$stage.children().css(css);

    			cache.css = css;
    		}
    	}, {
    		filter: [ 'width', 'items', 'settings' ],
    		run: function(cache) {
    			var width = (this.width() / this.settings.items).toFixed(3) - this.settings.margin,
    				merge = null,
    				iterator = this._items.length,
    				grid = !this.settings.autoWidth,
    				widths = [];

    			cache.items = {
    				merge: false,
    				width: width
    			};

    			while (iterator--) {
    				merge = this._mergers[iterator];
    				merge = this.settings.mergeFit && Math.min(merge, this.settings.items) || merge;

    				cache.items.merge = merge > 1 || cache.items.merge;

    				widths[iterator] = !grid ? this._items[iterator].width() : width * merge;
    			}

    			this._widths = widths;
    		}
    	}, {
    		filter: [ 'items', 'settings' ],
    		run: function() {
    			var clones = [],
    				items = this._items,
    				settings = this.settings,
    				// TODO: Should be computed from number of min width items in stage
    				view = Math.max(settings.items * 2, 4),
    				size = Math.ceil(items.length / 2) * 2,
    				repeat = settings.loop && items.length ? settings.rewind ? view : Math.max(view, size) : 0,
    				append = '',
    				prepend = '';

    			repeat /= 2;

    			while (repeat > 0) {
    				// Switch to only using appended clones
    				clones.push(this.normalize(clones.length / 2, true));
    				append = append + items[clones[clones.length - 1]][0].outerHTML;
    				clones.push(this.normalize(items.length - 1 - (clones.length - 1) / 2, true));
    				prepend = items[clones[clones.length - 1]][0].outerHTML + prepend;
    				repeat -= 1;
    			}

    			this._clones = clones;

    			$(append).addClass('cloned').appendTo(this.$stage);
    			$(prepend).addClass('cloned').prependTo(this.$stage);
    		}
    	}, {
    		filter: [ 'width', 'items', 'settings' ],
    		run: function() {
    			var rtl = this.settings.rtl ? 1 : -1,
    				size = this._clones.length + this._items.length,
    				iterator = -1,
    				previous = 0,
    				current = 0,
    				coordinates = [];

    			while (++iterator < size) {
    				previous = coordinates[iterator - 1] || 0;
    				current = this._widths[this.relative(iterator)] + this.settings.margin;
    				coordinates.push(previous + current * rtl);
    			}

    			this._coordinates = coordinates;
    		}
    	}, {
    		filter: [ 'width', 'items', 'settings' ],
    		run: function() {
    			var padding = this.settings.stagePadding,
    				coordinates = this._coordinates,
    				css = {
    					'width': Math.ceil(Math.abs(coordinates[coordinates.length - 1])) + padding * 2,
    					'padding-left': padding || '',
    					'padding-right': padding || ''
    				};

    			this.$stage.css(css);
    		}
    	}, {
    		filter: [ 'width', 'items', 'settings' ],
    		run: function(cache) {
    			var iterator = this._coordinates.length,
    				grid = !this.settings.autoWidth,
    				items = this.$stage.children();

    			if (grid && cache.items.merge) {
    				while (iterator--) {
    					cache.css.width = this._widths[this.relative(iterator)];
    					items.eq(iterator).css(cache.css);
    				}
    			} else if (grid) {
    				cache.css.width = cache.items.width;
    				items.css(cache.css);
    			}
    		}
    	}, {
    		filter: [ 'items' ],
    		run: function() {
    			this._coordinates.length < 1 && this.$stage.removeAttr('style');
    		}
    	}, {
    		filter: [ 'width', 'items', 'settings' ],
    		run: function(cache) {
    			cache.current = cache.current ? this.$stage.children().index(cache.current) : 0;
    			cache.current = Math.max(this.minimum(), Math.min(this.maximum(), cache.current));
    			this.reset(cache.current);
    		}
    	}, {
    		filter: [ 'position' ],
    		run: function() {
    			this.animate(this.coordinates(this._current));
    		}
    	}, {
    		filter: [ 'width', 'position', 'items', 'settings' ],
    		run: function() {
    			var rtl = this.settings.rtl ? 1 : -1,
    				padding = this.settings.stagePadding * 2,
    				begin = this.coordinates(this.current()) + padding,
    				end = begin + this.width() * rtl,
    				inner, outer, matches = [], i, n;

    			for (i = 0, n = this._coordinates.length; i < n; i++) {
    				inner = this._coordinates[i - 1] || 0;
    				outer = Math.abs(this._coordinates[i]) + padding * rtl;

    				if ((this.op(inner, '<=', begin) && (this.op(inner, '>', end)))
    					|| (this.op(outer, '<', begin) && this.op(outer, '>', end))) {
    					matches.push(i);
    				}
    			}

    			this.$stage.children('.active').removeClass('active');
    			this.$stage.children(':eq(' + matches.join('), :eq(') + ')').addClass('active');

    			this.$stage.children('.center').removeClass('center');
    			if (this.settings.center) {
    				this.$stage.children().eq(this.current()).addClass('center');
    			}
    		}
    	} ];

    	/**
    	 * Create the stage DOM element
    	 */
    	Owl.prototype.initializeStage = function() {
    		this.$stage = this.$element.find('.' + this.settings.stageClass);

    		// if the stage is already in the DOM, grab it and skip stage initialization
    		if (this.$stage.length) {
    			return;
    		}

    		this.$element.addClass(this.options.loadingClass);

    		// create stage
    		this.$stage = $('<' + this.settings.stageElement + '>', {
    			"class": this.settings.stageClass
    		}).wrap( $( '<div/>', {
    			"class": this.settings.stageOuterClass
    		}));

    		// append stage
    		this.$element.append(this.$stage.parent());
    	};

    	/**
    	 * Create item DOM elements
    	 */
    	Owl.prototype.initializeItems = function() {
    		var $items = this.$element.find('.owl-item');

    		// if the items are already in the DOM, grab them and skip item initialization
    		if ($items.length) {
    			this._items = $items.get().map(function(item) {
    				return $(item);
    			});

    			this._mergers = this._items.map(function() {
    				return 1;
    			});

    			this.refresh();

    			return;
    		}

    		// append content
    		this.replace(this.$element.children().not(this.$stage.parent()));

    		// check visibility
    		if (this.isVisible()) {
    			// update view
    			this.refresh();
    		} else {
    			// invalidate width
    			this.invalidate('width');
    		}

    		this.$element
    			.removeClass(this.options.loadingClass)
    			.addClass(this.options.loadedClass);
    	};

    	/**
    	 * Initializes the carousel.
    	 * @protected
    	 */
    	Owl.prototype.initialize = function() {
    		this.enter('initializing');
    		this.trigger('initialize');

    		this.$element.toggleClass(this.settings.rtlClass, this.settings.rtl);

    		if (this.settings.autoWidth && !this.is('pre-loading')) {
    			var imgs, nestedSelector, width;
    			imgs = this.$element.find('img');
    			nestedSelector = this.settings.nestedItemSelector ? '.' + this.settings.nestedItemSelector : undefined$1;
    			width = this.$element.children(nestedSelector).width();

    			if (imgs.length && width <= 0) {
    				this.preloadAutoWidthImages(imgs);
    			}
    		}

    		this.initializeStage();
    		this.initializeItems();

    		// register event handlers
    		this.registerEventHandlers();

    		this.leave('initializing');
    		this.trigger('initialized');
    	};

    	/**
    	 * @returns {Boolean} visibility of $element
    	 *                    if you know the carousel will always be visible you can set `checkVisibility` to `false` to
    	 *                    prevent the expensive browser layout forced reflow the $element.is(':visible') does
    	 */
    	Owl.prototype.isVisible = function() {
    		return this.settings.checkVisibility
    			? this.$element.is(':visible')
    			: true;
    	};

    	/**
    	 * Setups the current settings.
    	 * @todo Remove responsive classes. Why should adaptive designs be brought into IE8?
    	 * @todo Support for media queries by using `matchMedia` would be nice.
    	 * @public
    	 */
    	Owl.prototype.setup = function() {
    		var viewport = this.viewport(),
    			overwrites = this.options.responsive,
    			match = -1,
    			settings = null;

    		if (!overwrites) {
    			settings = $.extend({}, this.options);
    		} else {
    			$.each(overwrites, function(breakpoint) {
    				if (breakpoint <= viewport && breakpoint > match) {
    					match = Number(breakpoint);
    				}
    			});

    			settings = $.extend({}, this.options, overwrites[match]);
    			if (typeof settings.stagePadding === 'function') {
    				settings.stagePadding = settings.stagePadding();
    			}
    			delete settings.responsive;

    			// responsive class
    			if (settings.responsiveClass) {
    				this.$element.attr('class',
    					this.$element.attr('class').replace(new RegExp('(' + this.options.responsiveClass + '-)\\S+\\s', 'g'), '$1' + match)
    				);
    			}
    		}

    		this.trigger('change', { property: { name: 'settings', value: settings } });
    		this._breakpoint = match;
    		this.settings = settings;
    		this.invalidate('settings');
    		this.trigger('changed', { property: { name: 'settings', value: this.settings } });
    	};

    	/**
    	 * Updates option logic if necessery.
    	 * @protected
    	 */
    	Owl.prototype.optionsLogic = function() {
    		if (this.settings.autoWidth) {
    			this.settings.stagePadding = false;
    			this.settings.merge = false;
    		}
    	};

    	/**
    	 * Prepares an item before add.
    	 * @todo Rename event parameter `content` to `item`.
    	 * @protected
    	 * @returns {jQuery|HTMLElement} - The item container.
    	 */
    	Owl.prototype.prepare = function(item) {
    		var event = this.trigger('prepare', { content: item });

    		if (!event.data) {
    			event.data = $('<' + this.settings.itemElement + '/>')
    				.addClass(this.options.itemClass).append(item);
    		}

    		this.trigger('prepared', { content: event.data });

    		return event.data;
    	};

    	/**
    	 * Updates the view.
    	 * @public
    	 */
    	Owl.prototype.update = function() {
    		var i = 0,
    			n = this._pipe.length,
    			filter = $.proxy(function(p) { return this[p] }, this._invalidated),
    			cache = {};

    		while (i < n) {
    			if (this._invalidated.all || $.grep(this._pipe[i].filter, filter).length > 0) {
    				this._pipe[i].run(cache);
    			}
    			i++;
    		}

    		this._invalidated = {};

    		!this.is('valid') && this.enter('valid');
    	};

    	/**
    	 * Gets the width of the view.
    	 * @public
    	 * @param {Owl.Width} [dimension=Owl.Width.Default] - The dimension to return.
    	 * @returns {Number} - The width of the view in pixel.
    	 */
    	Owl.prototype.width = function(dimension) {
    		dimension = dimension || Owl.Width.Default;
    		switch (dimension) {
    			case Owl.Width.Inner:
    			case Owl.Width.Outer:
    				return this._width;
    			default:
    				return this._width - this.settings.stagePadding * 2 + this.settings.margin;
    		}
    	};

    	/**
    	 * Refreshes the carousel primarily for adaptive purposes.
    	 * @public
    	 */
    	Owl.prototype.refresh = function() {
    		this.enter('refreshing');
    		this.trigger('refresh');

    		this.setup();

    		this.optionsLogic();

    		this.$element.addClass(this.options.refreshClass);

    		this.update();

    		this.$element.removeClass(this.options.refreshClass);

    		this.leave('refreshing');
    		this.trigger('refreshed');
    	};

    	/**
    	 * Checks window `resize` event.
    	 * @protected
    	 */
    	Owl.prototype.onThrottledResize = function() {
    		window.clearTimeout(this.resizeTimer);
    		this.resizeTimer = window.setTimeout(this._handlers.onResize, this.settings.responsiveRefreshRate);
    	};

    	/**
    	 * Checks window `resize` event.
    	 * @protected
    	 */
    	Owl.prototype.onResize = function() {
    		if (!this._items.length) {
    			return false;
    		}

    		if (this._width === this.$element.width()) {
    			return false;
    		}

    		if (!this.isVisible()) {
    			return false;
    		}

    		this.enter('resizing');

    		if (this.trigger('resize').isDefaultPrevented()) {
    			this.leave('resizing');
    			return false;
    		}

    		this.invalidate('width');

    		this.refresh();

    		this.leave('resizing');
    		this.trigger('resized');
    	};

    	/**
    	 * Registers event handlers.
    	 * @todo Check `msPointerEnabled`
    	 * @todo #261
    	 * @protected
    	 */
    	Owl.prototype.registerEventHandlers = function() {
    		if ($.support.transition) {
    			this.$stage.on($.support.transition.end + '.owl.core', $.proxy(this.onTransitionEnd, this));
    		}

    		if (this.settings.responsive !== false) {
    			this.on(window, 'resize', this._handlers.onThrottledResize);
    		}

    		if (this.settings.mouseDrag) {
    			this.$element.addClass(this.options.dragClass);
    			this.$stage.on('mousedown.owl.core', $.proxy(this.onDragStart, this));
    			this.$stage.on('dragstart.owl.core selectstart.owl.core', function() { return false });
    		}

    		if (this.settings.touchDrag){
    			this.$stage.on('touchstart.owl.core', $.proxy(this.onDragStart, this));
    			this.$stage.on('touchcancel.owl.core', $.proxy(this.onDragEnd, this));
    		}
    	};

    	/**
    	 * Handles `touchstart` and `mousedown` events.
    	 * @todo Horizontal swipe threshold as option
    	 * @todo #261
    	 * @protected
    	 * @param {Event} event - The event arguments.
    	 */
    	Owl.prototype.onDragStart = function(event) {
    		var stage = null;

    		if (event.which === 3) {
    			return;
    		}

    		if ($.support.transform) {
    			stage = this.$stage.css('transform').replace(/.*\(|\)| /g, '').split(',');
    			stage = {
    				x: stage[stage.length === 16 ? 12 : 4],
    				y: stage[stage.length === 16 ? 13 : 5]
    			};
    		} else {
    			stage = this.$stage.position();
    			stage = {
    				x: this.settings.rtl ?
    					stage.left + this.$stage.width() - this.width() + this.settings.margin :
    					stage.left,
    				y: stage.top
    			};
    		}

    		if (this.is('animating')) {
    			$.support.transform ? this.animate(stage.x) : this.$stage.stop();
    			this.invalidate('position');
    		}

    		this.$element.toggleClass(this.options.grabClass, event.type === 'mousedown');

    		this.speed(0);

    		this._drag.time = new Date().getTime();
    		this._drag.target = $(event.target);
    		this._drag.stage.start = stage;
    		this._drag.stage.current = stage;
    		this._drag.pointer = this.pointer(event);

    		$(document).on('mouseup.owl.core touchend.owl.core', $.proxy(this.onDragEnd, this));

    		$(document).one('mousemove.owl.core touchmove.owl.core', $.proxy(function(event) {
    			var delta = this.difference(this._drag.pointer, this.pointer(event));

    			$(document).on('mousemove.owl.core touchmove.owl.core', $.proxy(this.onDragMove, this));

    			if (Math.abs(delta.x) < Math.abs(delta.y) && this.is('valid')) {
    				return;
    			}

    			event.preventDefault();

    			this.enter('dragging');
    			this.trigger('drag');
    		}, this));
    	};

    	/**
    	 * Handles the `touchmove` and `mousemove` events.
    	 * @todo #261
    	 * @protected
    	 * @param {Event} event - The event arguments.
    	 */
    	Owl.prototype.onDragMove = function(event) {
    		var minimum = null,
    			maximum = null,
    			pull = null,
    			delta = this.difference(this._drag.pointer, this.pointer(event)),
    			stage = this.difference(this._drag.stage.start, delta);

    		if (!this.is('dragging')) {
    			return;
    		}

    		event.preventDefault();

    		if (this.settings.loop) {
    			minimum = this.coordinates(this.minimum());
    			maximum = this.coordinates(this.maximum() + 1) - minimum;
    			stage.x = (((stage.x - minimum) % maximum + maximum) % maximum) + minimum;
    		} else {
    			minimum = this.settings.rtl ? this.coordinates(this.maximum()) : this.coordinates(this.minimum());
    			maximum = this.settings.rtl ? this.coordinates(this.minimum()) : this.coordinates(this.maximum());
    			pull = this.settings.pullDrag ? -1 * delta.x / 5 : 0;
    			stage.x = Math.max(Math.min(stage.x, minimum + pull), maximum + pull);
    		}

    		this._drag.stage.current = stage;

    		this.animate(stage.x);
    	};

    	/**
    	 * Handles the `touchend` and `mouseup` events.
    	 * @todo #261
    	 * @todo Threshold for click event
    	 * @protected
    	 * @param {Event} event - The event arguments.
    	 */
    	Owl.prototype.onDragEnd = function(event) {
    		var delta = this.difference(this._drag.pointer, this.pointer(event)),
    			stage = this._drag.stage.current,
    			direction = delta.x > 0 ^ this.settings.rtl ? 'left' : 'right';

    		$(document).off('.owl.core');

    		this.$element.removeClass(this.options.grabClass);

    		if (delta.x !== 0 && this.is('dragging') || !this.is('valid')) {
    			this.speed(this.settings.dragEndSpeed || this.settings.smartSpeed);
    			this.current(this.closest(stage.x, delta.x !== 0 ? direction : this._drag.direction));
    			this.invalidate('position');
    			this.update();

    			this._drag.direction = direction;

    			if (Math.abs(delta.x) > 3 || new Date().getTime() - this._drag.time > 300) {
    				this._drag.target.one('click.owl.core', function() { return false; });
    			}
    		}

    		if (!this.is('dragging')) {
    			return;
    		}

    		this.leave('dragging');
    		this.trigger('dragged');
    	};

    	/**
    	 * Gets absolute position of the closest item for a coordinate.
    	 * @todo Setting `freeDrag` makes `closest` not reusable. See #165.
    	 * @protected
    	 * @param {Number} coordinate - The coordinate in pixel.
    	 * @param {String} direction - The direction to check for the closest item. Ether `left` or `right`.
    	 * @return {Number} - The absolute position of the closest item.
    	 */
    	Owl.prototype.closest = function(coordinate, direction) {
    		var position = -1,
    			pull = 30,
    			width = this.width(),
    			coordinates = this.coordinates();

    		if (!this.settings.freeDrag) {
    			// check closest item
    			$.each(coordinates, $.proxy(function(index, value) {
    				// on a left pull, check on current index
    				if (direction === 'left' && coordinate > value - pull && coordinate < value + pull) {
    					position = index;
    				// on a right pull, check on previous index
    				// to do so, subtract width from value and set position = index + 1
    				} else if (direction === 'right' && coordinate > value - width - pull && coordinate < value - width + pull) {
    					position = index + 1;
    				} else if (this.op(coordinate, '<', value)
    					&& this.op(coordinate, '>', coordinates[index + 1] !== undefined$1 ? coordinates[index + 1] : value - width)) {
    					position = direction === 'left' ? index + 1 : index;
    				}
    				return position === -1;
    			}, this));
    		}

    		if (!this.settings.loop) {
    			// non loop boundries
    			if (this.op(coordinate, '>', coordinates[this.minimum()])) {
    				position = coordinate = this.minimum();
    			} else if (this.op(coordinate, '<', coordinates[this.maximum()])) {
    				position = coordinate = this.maximum();
    			}
    		}

    		return position;
    	};

    	/**
    	 * Animates the stage.
    	 * @todo #270
    	 * @public
    	 * @param {Number} coordinate - The coordinate in pixels.
    	 */
    	Owl.prototype.animate = function(coordinate) {
    		var animate = this.speed() > 0;

    		this.is('animating') && this.onTransitionEnd();

    		if (animate) {
    			this.enter('animating');
    			this.trigger('translate');
    		}

    		if ($.support.transform3d && $.support.transition) {
    			this.$stage.css({
    				transform: 'translate3d(' + coordinate + 'px,0px,0px)',
    				transition: (this.speed() / 1000) + 's' + (
    					this.settings.slideTransition ? ' ' + this.settings.slideTransition : ''
    				)
    			});
    		} else if (animate) {
    			this.$stage.animate({
    				left: coordinate + 'px'
    			}, this.speed(), this.settings.fallbackEasing, $.proxy(this.onTransitionEnd, this));
    		} else {
    			this.$stage.css({
    				left: coordinate + 'px'
    			});
    		}
    	};

    	/**
    	 * Checks whether the carousel is in a specific state or not.
    	 * @param {String} state - The state to check.
    	 * @returns {Boolean} - The flag which indicates if the carousel is busy.
    	 */
    	Owl.prototype.is = function(state) {
    		return this._states.current[state] && this._states.current[state] > 0;
    	};

    	/**
    	 * Sets the absolute position of the current item.
    	 * @public
    	 * @param {Number} [position] - The new absolute position or nothing to leave it unchanged.
    	 * @returns {Number} - The absolute position of the current item.
    	 */
    	Owl.prototype.current = function(position) {
    		if (position === undefined$1) {
    			return this._current;
    		}

    		if (this._items.length === 0) {
    			return undefined$1;
    		}

    		position = this.normalize(position);

    		if (this._current !== position) {
    			var event = this.trigger('change', { property: { name: 'position', value: position } });

    			if (event.data !== undefined$1) {
    				position = this.normalize(event.data);
    			}

    			this._current = position;

    			this.invalidate('position');

    			this.trigger('changed', { property: { name: 'position', value: this._current } });
    		}

    		return this._current;
    	};

    	/**
    	 * Invalidates the given part of the update routine.
    	 * @param {String} [part] - The part to invalidate.
    	 * @returns {Array.<String>} - The invalidated parts.
    	 */
    	Owl.prototype.invalidate = function(part) {
    		if ($.type(part) === 'string') {
    			this._invalidated[part] = true;
    			this.is('valid') && this.leave('valid');
    		}
    		return $.map(this._invalidated, function(v, i) { return i });
    	};

    	/**
    	 * Resets the absolute position of the current item.
    	 * @public
    	 * @param {Number} position - The absolute position of the new item.
    	 */
    	Owl.prototype.reset = function(position) {
    		position = this.normalize(position);

    		if (position === undefined$1) {
    			return;
    		}

    		this._speed = 0;
    		this._current = position;

    		this.suppress([ 'translate', 'translated' ]);

    		this.animate(this.coordinates(position));

    		this.release([ 'translate', 'translated' ]);
    	};

    	/**
    	 * Normalizes an absolute or a relative position of an item.
    	 * @public
    	 * @param {Number} position - The absolute or relative position to normalize.
    	 * @param {Boolean} [relative=false] - Whether the given position is relative or not.
    	 * @returns {Number} - The normalized position.
    	 */
    	Owl.prototype.normalize = function(position, relative) {
    		var n = this._items.length,
    			m = relative ? 0 : this._clones.length;

    		if (!this.isNumeric(position) || n < 1) {
    			position = undefined$1;
    		} else if (position < 0 || position >= n + m) {
    			position = ((position - m / 2) % n + n) % n + m / 2;
    		}

    		return position;
    	};

    	/**
    	 * Converts an absolute position of an item into a relative one.
    	 * @public
    	 * @param {Number} position - The absolute position to convert.
    	 * @returns {Number} - The converted position.
    	 */
    	Owl.prototype.relative = function(position) {
    		position -= this._clones.length / 2;
    		return this.normalize(position, true);
    	};

    	/**
    	 * Gets the maximum position for the current item.
    	 * @public
    	 * @param {Boolean} [relative=false] - Whether to return an absolute position or a relative position.
    	 * @returns {Number}
    	 */
    	Owl.prototype.maximum = function(relative) {
    		var settings = this.settings,
    			maximum = this._coordinates.length,
    			iterator,
    			reciprocalItemsWidth,
    			elementWidth;

    		if (settings.loop) {
    			maximum = this._clones.length / 2 + this._items.length - 1;
    		} else if (settings.autoWidth || settings.merge) {
    			iterator = this._items.length;
    			if (iterator) {
    				reciprocalItemsWidth = this._items[--iterator].width();
    				elementWidth = this.$element.width();
    				while (iterator--) {
    					reciprocalItemsWidth += this._items[iterator].width() + this.settings.margin;
    					if (reciprocalItemsWidth > elementWidth) {
    						break;
    					}
    				}
    			}
    			maximum = iterator + 1;
    		} else if (settings.center) {
    			maximum = this._items.length - 1;
    		} else {
    			maximum = this._items.length - settings.items;
    		}

    		if (relative) {
    			maximum -= this._clones.length / 2;
    		}

    		return Math.max(maximum, 0);
    	};

    	/**
    	 * Gets the minimum position for the current item.
    	 * @public
    	 * @param {Boolean} [relative=false] - Whether to return an absolute position or a relative position.
    	 * @returns {Number}
    	 */
    	Owl.prototype.minimum = function(relative) {
    		return relative ? 0 : this._clones.length / 2;
    	};

    	/**
    	 * Gets an item at the specified relative position.
    	 * @public
    	 * @param {Number} [position] - The relative position of the item.
    	 * @return {jQuery|Array.<jQuery>} - The item at the given position or all items if no position was given.
    	 */
    	Owl.prototype.items = function(position) {
    		if (position === undefined$1) {
    			return this._items.slice();
    		}

    		position = this.normalize(position, true);
    		return this._items[position];
    	};

    	/**
    	 * Gets an item at the specified relative position.
    	 * @public
    	 * @param {Number} [position] - The relative position of the item.
    	 * @return {jQuery|Array.<jQuery>} - The item at the given position or all items if no position was given.
    	 */
    	Owl.prototype.mergers = function(position) {
    		if (position === undefined$1) {
    			return this._mergers.slice();
    		}

    		position = this.normalize(position, true);
    		return this._mergers[position];
    	};

    	/**
    	 * Gets the absolute positions of clones for an item.
    	 * @public
    	 * @param {Number} [position] - The relative position of the item.
    	 * @returns {Array.<Number>} - The absolute positions of clones for the item or all if no position was given.
    	 */
    	Owl.prototype.clones = function(position) {
    		var odd = this._clones.length / 2,
    			even = odd + this._items.length,
    			map = function(index) { return index % 2 === 0 ? even + index / 2 : odd - (index + 1) / 2 };

    		if (position === undefined$1) {
    			return $.map(this._clones, function(v, i) { return map(i) });
    		}

    		return $.map(this._clones, function(v, i) { return v === position ? map(i) : null });
    	};

    	/**
    	 * Sets the current animation speed.
    	 * @public
    	 * @param {Number} [speed] - The animation speed in milliseconds or nothing to leave it unchanged.
    	 * @returns {Number} - The current animation speed in milliseconds.
    	 */
    	Owl.prototype.speed = function(speed) {
    		if (speed !== undefined$1) {
    			this._speed = speed;
    		}

    		return this._speed;
    	};

    	/**
    	 * Gets the coordinate of an item.
    	 * @todo The name of this method is missleanding.
    	 * @public
    	 * @param {Number} position - The absolute position of the item within `minimum()` and `maximum()`.
    	 * @returns {Number|Array.<Number>} - The coordinate of the item in pixel or all coordinates.
    	 */
    	Owl.prototype.coordinates = function(position) {
    		var multiplier = 1,
    			newPosition = position - 1,
    			coordinate;

    		if (position === undefined$1) {
    			return $.map(this._coordinates, $.proxy(function(coordinate, index) {
    				return this.coordinates(index);
    			}, this));
    		}

    		if (this.settings.center) {
    			if (this.settings.rtl) {
    				multiplier = -1;
    				newPosition = position + 1;
    			}

    			coordinate = this._coordinates[position];
    			coordinate += (this.width() - coordinate + (this._coordinates[newPosition] || 0)) / 2 * multiplier;
    		} else {
    			coordinate = this._coordinates[newPosition] || 0;
    		}

    		coordinate = Math.ceil(coordinate);

    		return coordinate;
    	};

    	/**
    	 * Calculates the speed for a translation.
    	 * @protected
    	 * @param {Number} from - The absolute position of the start item.
    	 * @param {Number} to - The absolute position of the target item.
    	 * @param {Number} [factor=undefined] - The time factor in milliseconds.
    	 * @returns {Number} - The time in milliseconds for the translation.
    	 */
    	Owl.prototype.duration = function(from, to, factor) {
    		if (factor === 0) {
    			return 0;
    		}

    		return Math.min(Math.max(Math.abs(to - from), 1), 6) * Math.abs((factor || this.settings.smartSpeed));
    	};

    	/**
    	 * Slides to the specified item.
    	 * @public
    	 * @param {Number} position - The position of the item.
    	 * @param {Number} [speed] - The time in milliseconds for the transition.
    	 */
    	Owl.prototype.to = function(position, speed) {
    		var current = this.current(),
    			revert = null,
    			distance = position - this.relative(current),
    			direction = (distance > 0) - (distance < 0),
    			items = this._items.length,
    			minimum = this.minimum(),
    			maximum = this.maximum();

    		if (this.settings.loop) {
    			if (!this.settings.rewind && Math.abs(distance) > items / 2) {
    				distance += direction * -1 * items;
    			}

    			position = current + distance;
    			revert = ((position - minimum) % items + items) % items + minimum;

    			if (revert !== position && revert - distance <= maximum && revert - distance > 0) {
    				current = revert - distance;
    				position = revert;
    				this.reset(current);
    			}
    		} else if (this.settings.rewind) {
    			maximum += 1;
    			position = (position % maximum + maximum) % maximum;
    		} else {
    			position = Math.max(minimum, Math.min(maximum, position));
    		}

    		this.speed(this.duration(current, position, speed));
    		this.current(position);

    		if (this.isVisible()) {
    			this.update();
    		}
    	};

    	/**
    	 * Slides to the next item.
    	 * @public
    	 * @param {Number} [speed] - The time in milliseconds for the transition.
    	 */
    	Owl.prototype.next = function(speed) {
    		speed = speed || false;
    		this.to(this.relative(this.current()) + 1, speed);
    	};

    	/**
    	 * Slides to the previous item.
    	 * @public
    	 * @param {Number} [speed] - The time in milliseconds for the transition.
    	 */
    	Owl.prototype.prev = function(speed) {
    		speed = speed || false;
    		this.to(this.relative(this.current()) - 1, speed);
    	};

    	/**
    	 * Handles the end of an animation.
    	 * @protected
    	 * @param {Event} event - The event arguments.
    	 */
    	Owl.prototype.onTransitionEnd = function(event) {

    		// if css2 animation then event object is undefined
    		if (event !== undefined$1) {
    			event.stopPropagation();

    			// Catch only owl-stage transitionEnd event
    			if ((event.target || event.srcElement || event.originalTarget) !== this.$stage.get(0)) {
    				return false;
    			}
    		}

    		this.leave('animating');
    		this.trigger('translated');
    	};

    	/**
    	 * Gets viewport width.
    	 * @protected
    	 * @return {Number} - The width in pixel.
    	 */
    	Owl.prototype.viewport = function() {
    		var width;
    		if (this.options.responsiveBaseElement !== window) {
    			width = $(this.options.responsiveBaseElement).width();
    		} else if (window.innerWidth) {
    			width = window.innerWidth;
    		} else if (document.documentElement && document.documentElement.clientWidth) {
    			width = document.documentElement.clientWidth;
    		} else {
    			console.warn('Can not detect viewport width.');
    		}
    		return width;
    	};

    	/**
    	 * Replaces the current content.
    	 * @public
    	 * @param {HTMLElement|jQuery|String} content - The new content.
    	 */
    	Owl.prototype.replace = function(content) {
    		this.$stage.empty();
    		this._items = [];

    		if (content) {
    			content = (content instanceof jQuery) ? content : $(content);
    		}

    		if (this.settings.nestedItemSelector) {
    			content = content.find('.' + this.settings.nestedItemSelector);
    		}

    		content.filter(function() {
    			return this.nodeType === 1;
    		}).each($.proxy(function(index, item) {
    			item = this.prepare(item);
    			this.$stage.append(item);
    			this._items.push(item);
    			this._mergers.push(item.find('[data-merge]').addBack('[data-merge]').attr('data-merge') * 1 || 1);
    		}, this));

    		this.reset(this.isNumeric(this.settings.startPosition) ? this.settings.startPosition : 0);

    		this.invalidate('items');
    	};

    	/**
    	 * Adds an item.
    	 * @todo Use `item` instead of `content` for the event arguments.
    	 * @public
    	 * @param {HTMLElement|jQuery|String} content - The item content to add.
    	 * @param {Number} [position] - The relative position at which to insert the item otherwise the item will be added to the end.
    	 */
    	Owl.prototype.add = function(content, position) {
    		var current = this.relative(this._current);

    		position = position === undefined$1 ? this._items.length : this.normalize(position, true);
    		content = content instanceof jQuery ? content : $(content);

    		this.trigger('add', { content: content, position: position });

    		content = this.prepare(content);

    		if (this._items.length === 0 || position === this._items.length) {
    			this._items.length === 0 && this.$stage.append(content);
    			this._items.length !== 0 && this._items[position - 1].after(content);
    			this._items.push(content);
    			this._mergers.push(content.find('[data-merge]').addBack('[data-merge]').attr('data-merge') * 1 || 1);
    		} else {
    			this._items[position].before(content);
    			this._items.splice(position, 0, content);
    			this._mergers.splice(position, 0, content.find('[data-merge]').addBack('[data-merge]').attr('data-merge') * 1 || 1);
    		}

    		this._items[current] && this.reset(this._items[current].index());

    		this.invalidate('items');

    		this.trigger('added', { content: content, position: position });
    	};

    	/**
    	 * Removes an item by its position.
    	 * @todo Use `item` instead of `content` for the event arguments.
    	 * @public
    	 * @param {Number} position - The relative position of the item to remove.
    	 */
    	Owl.prototype.remove = function(position) {
    		position = this.normalize(position, true);

    		if (position === undefined$1) {
    			return;
    		}

    		this.trigger('remove', { content: this._items[position], position: position });

    		this._items[position].remove();
    		this._items.splice(position, 1);
    		this._mergers.splice(position, 1);

    		this.invalidate('items');

    		this.trigger('removed', { content: null, position: position });
    	};

    	/**
    	 * Preloads images with auto width.
    	 * @todo Replace by a more generic approach
    	 * @protected
    	 */
    	Owl.prototype.preloadAutoWidthImages = function(images) {
    		images.each($.proxy(function(i, element) {
    			this.enter('pre-loading');
    			element = $(element);
    			$(new Image()).one('load', $.proxy(function(e) {
    				element.attr('src', e.target.src);
    				element.css('opacity', 1);
    				this.leave('pre-loading');
    				!this.is('pre-loading') && !this.is('initializing') && this.refresh();
    			}, this)).attr('src', element.attr('src') || element.attr('data-src') || element.attr('data-src-retina'));
    		}, this));
    	};

    	/**
    	 * Destroys the carousel.
    	 * @public
    	 */
    	Owl.prototype.destroy = function() {

    		this.$element.off('.owl.core');
    		this.$stage.off('.owl.core');
    		$(document).off('.owl.core');

    		if (this.settings.responsive !== false) {
    			window.clearTimeout(this.resizeTimer);
    			this.off(window, 'resize', this._handlers.onThrottledResize);
    		}

    		for (var i in this._plugins) {
    			this._plugins[i].destroy();
    		}

    		this.$stage.children('.cloned').remove();

    		this.$stage.unwrap();
    		this.$stage.children().contents().unwrap();
    		this.$stage.children().unwrap();
    		this.$stage.remove();
    		this.$element
    			.removeClass(this.options.refreshClass)
    			.removeClass(this.options.loadingClass)
    			.removeClass(this.options.loadedClass)
    			.removeClass(this.options.rtlClass)
    			.removeClass(this.options.dragClass)
    			.removeClass(this.options.grabClass)
    			.attr('class', this.$element.attr('class').replace(new RegExp(this.options.responsiveClass + '-\\S+\\s', 'g'), ''))
    			.removeData('owl.carousel');
    	};

    	/**
    	 * Operators to calculate right-to-left and left-to-right.
    	 * @protected
    	 * @param {Number} [a] - The left side operand.
    	 * @param {String} [o] - The operator.
    	 * @param {Number} [b] - The right side operand.
    	 */
    	Owl.prototype.op = function(a, o, b) {
    		var rtl = this.settings.rtl;
    		switch (o) {
    			case '<':
    				return rtl ? a > b : a < b;
    			case '>':
    				return rtl ? a < b : a > b;
    			case '>=':
    				return rtl ? a <= b : a >= b;
    			case '<=':
    				return rtl ? a >= b : a <= b;
    		}
    	};

    	/**
    	 * Attaches to an internal event.
    	 * @protected
    	 * @param {HTMLElement} element - The event source.
    	 * @param {String} event - The event name.
    	 * @param {Function} listener - The event handler to attach.
    	 * @param {Boolean} capture - Wether the event should be handled at the capturing phase or not.
    	 */
    	Owl.prototype.on = function(element, event, listener, capture) {
    		if (element.addEventListener) {
    			element.addEventListener(event, listener, capture);
    		} else if (element.attachEvent) {
    			element.attachEvent('on' + event, listener);
    		}
    	};

    	/**
    	 * Detaches from an internal event.
    	 * @protected
    	 * @param {HTMLElement} element - The event source.
    	 * @param {String} event - The event name.
    	 * @param {Function} listener - The attached event handler to detach.
    	 * @param {Boolean} capture - Wether the attached event handler was registered as a capturing listener or not.
    	 */
    	Owl.prototype.off = function(element, event, listener, capture) {
    		if (element.removeEventListener) {
    			element.removeEventListener(event, listener, capture);
    		} else if (element.detachEvent) {
    			element.detachEvent('on' + event, listener);
    		}
    	};

    	/**
    	 * Triggers a public event.
    	 * @todo Remove `status`, `relatedTarget` should be used instead.
    	 * @protected
    	 * @param {String} name - The event name.
    	 * @param {*} [data=null] - The event data.
    	 * @param {String} [namespace=carousel] - The event namespace.
    	 * @param {String} [state] - The state which is associated with the event.
    	 * @param {Boolean} [enter=false] - Indicates if the call enters the specified state or not.
    	 * @returns {Event} - The event arguments.
    	 */
    	Owl.prototype.trigger = function(name, data, namespace, state, enter) {
    		var status = {
    			item: { count: this._items.length, index: this.current() }
    		}, handler = $.camelCase(
    			$.grep([ 'on', name, namespace ], function(v) { return v })
    				.join('-').toLowerCase()
    		), event = $.Event(
    			[ name, 'owl', namespace || 'carousel' ].join('.').toLowerCase(),
    			$.extend({ relatedTarget: this }, status, data)
    		);

    		if (!this._supress[name]) {
    			$.each(this._plugins, function(name, plugin) {
    				if (plugin.onTrigger) {
    					plugin.onTrigger(event);
    				}
    			});

    			this.register({ type: Owl.Type.Event, name: name });
    			this.$element.trigger(event);

    			if (this.settings && typeof this.settings[handler] === 'function') {
    				this.settings[handler].call(this, event);
    			}
    		}

    		return event;
    	};

    	/**
    	 * Enters a state.
    	 * @param name - The state name.
    	 */
    	Owl.prototype.enter = function(name) {
    		$.each([ name ].concat(this._states.tags[name] || []), $.proxy(function(i, name) {
    			if (this._states.current[name] === undefined$1) {
    				this._states.current[name] = 0;
    			}

    			this._states.current[name]++;
    		}, this));
    	};

    	/**
    	 * Leaves a state.
    	 * @param name - The state name.
    	 */
    	Owl.prototype.leave = function(name) {
    		$.each([ name ].concat(this._states.tags[name] || []), $.proxy(function(i, name) {
    			this._states.current[name]--;
    		}, this));
    	};

    	/**
    	 * Registers an event or state.
    	 * @public
    	 * @param {Object} object - The event or state to register.
    	 */
    	Owl.prototype.register = function(object) {
    		if (object.type === Owl.Type.Event) {
    			if (!$.event.special[object.name]) {
    				$.event.special[object.name] = {};
    			}

    			if (!$.event.special[object.name].owl) {
    				var _default = $.event.special[object.name]._default;
    				$.event.special[object.name]._default = function(e) {
    					if (_default && _default.apply && (!e.namespace || e.namespace.indexOf('owl') === -1)) {
    						return _default.apply(this, arguments);
    					}
    					return e.namespace && e.namespace.indexOf('owl') > -1;
    				};
    				$.event.special[object.name].owl = true;
    			}
    		} else if (object.type === Owl.Type.State) {
    			if (!this._states.tags[object.name]) {
    				this._states.tags[object.name] = object.tags;
    			} else {
    				this._states.tags[object.name] = this._states.tags[object.name].concat(object.tags);
    			}

    			this._states.tags[object.name] = $.grep(this._states.tags[object.name], $.proxy(function(tag, i) {
    				return $.inArray(tag, this._states.tags[object.name]) === i;
    			}, this));
    		}
    	};

    	/**
    	 * Suppresses events.
    	 * @protected
    	 * @param {Array.<String>} events - The events to suppress.
    	 */
    	Owl.prototype.suppress = function(events) {
    		$.each(events, $.proxy(function(index, event) {
    			this._supress[event] = true;
    		}, this));
    	};

    	/**
    	 * Releases suppressed events.
    	 * @protected
    	 * @param {Array.<String>} events - The events to release.
    	 */
    	Owl.prototype.release = function(events) {
    		$.each(events, $.proxy(function(index, event) {
    			delete this._supress[event];
    		}, this));
    	};

    	/**
    	 * Gets unified pointer coordinates from event.
    	 * @todo #261
    	 * @protected
    	 * @param {Event} - The `mousedown` or `touchstart` event.
    	 * @returns {Object} - Contains `x` and `y` coordinates of current pointer position.
    	 */
    	Owl.prototype.pointer = function(event) {
    		var result = { x: null, y: null };

    		event = event.originalEvent || event || window.event;

    		event = event.touches && event.touches.length ?
    			event.touches[0] : event.changedTouches && event.changedTouches.length ?
    				event.changedTouches[0] : event;

    		if (event.pageX) {
    			result.x = event.pageX;
    			result.y = event.pageY;
    		} else {
    			result.x = event.clientX;
    			result.y = event.clientY;
    		}

    		return result;
    	};

    	/**
    	 * Determines if the input is a Number or something that can be coerced to a Number
    	 * @protected
    	 * @param {Number|String|Object|Array|Boolean|RegExp|Function|Symbol} - The input to be tested
    	 * @returns {Boolean} - An indication if the input is a Number or can be coerced to a Number
    	 */
    	Owl.prototype.isNumeric = function(number) {
    		return !isNaN(parseFloat(number));
    	};

    	/**
    	 * Gets the difference of two vectors.
    	 * @todo #261
    	 * @protected
    	 * @param {Object} - The first vector.
    	 * @param {Object} - The second vector.
    	 * @returns {Object} - The difference.
    	 */
    	Owl.prototype.difference = function(first, second) {
    		return {
    			x: first.x - second.x,
    			y: first.y - second.y
    		};
    	};

    	/**
    	 * The jQuery Plugin for the Owl Carousel
    	 * @todo Navigation plugin `next` and `prev`
    	 * @public
    	 */
    	$.fn.owlCarousel = function(option) {
    		var args = Array.prototype.slice.call(arguments, 1);

    		return this.each(function() {
    			var $this = $(this),
    				data = $this.data('owl.carousel');

    			if (!data) {
    				data = new Owl(this, typeof option == 'object' && option);
    				$this.data('owl.carousel', data);

    				$.each([
    					'next', 'prev', 'to', 'destroy', 'refresh', 'replace', 'add', 'remove'
    				], function(i, event) {
    					data.register({ type: Owl.Type.Event, name: event });
    					data.$element.on(event + '.owl.carousel.core', $.proxy(function(e) {
    						if (e.namespace && e.relatedTarget !== this) {
    							this.suppress([ event ]);
    							data[event].apply(this, [].slice.call(arguments, 1));
    							this.release([ event ]);
    						}
    					}, data));
    				});
    			}

    			if (typeof option == 'string' && option.charAt(0) !== '_') {
    				data[option].apply(data, args);
    			}
    		});
    	};

    	/**
    	 * The constructor for the jQuery Plugin
    	 * @public
    	 */
    	$.fn.owlCarousel.Constructor = Owl;

    })(window.Zepto || window.jQuery, window, document);
    (function($, window, document, undefined$1) {

    	/**
    	 * Creates the auto refresh plugin.
    	 * @class The Auto Refresh Plugin
    	 * @param {Owl} carousel - The Owl Carousel
    	 */
    	var AutoRefresh = function(carousel) {
    		/**
    		 * Reference to the core.
    		 * @protected
    		 * @type {Owl}
    		 */
    		this._core = carousel;

    		/**
    		 * Refresh interval.
    		 * @protected
    		 * @type {number}
    		 */
    		this._interval = null;

    		/**
    		 * Whether the element is currently visible or not.
    		 * @protected
    		 * @type {Boolean}
    		 */
    		this._visible = null;

    		/**
    		 * All event handlers.
    		 * @protected
    		 * @type {Object}
    		 */
    		this._handlers = {
    			'initialized.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && this._core.settings.autoRefresh) {
    					this.watch();
    				}
    			}, this)
    		};

    		// set default options
    		this._core.options = $.extend({}, AutoRefresh.Defaults, this._core.options);

    		// register event handlers
    		this._core.$element.on(this._handlers);
    	};

    	/**
    	 * Default options.
    	 * @public
    	 */
    	AutoRefresh.Defaults = {
    		autoRefresh: true,
    		autoRefreshInterval: 500
    	};

    	/**
    	 * Watches the element.
    	 */
    	AutoRefresh.prototype.watch = function() {
    		if (this._interval) {
    			return;
    		}

    		this._visible = this._core.isVisible();
    		this._interval = window.setInterval($.proxy(this.refresh, this), this._core.settings.autoRefreshInterval);
    	};

    	/**
    	 * Refreshes the element.
    	 */
    	AutoRefresh.prototype.refresh = function() {
    		if (this._core.isVisible() === this._visible) {
    			return;
    		}

    		this._visible = !this._visible;

    		this._core.$element.toggleClass('owl-hidden', !this._visible);

    		this._visible && (this._core.invalidate('width') && this._core.refresh());
    	};

    	/**
    	 * Destroys the plugin.
    	 */
    	AutoRefresh.prototype.destroy = function() {
    		var handler, property;

    		window.clearInterval(this._interval);

    		for (handler in this._handlers) {
    			this._core.$element.off(handler, this._handlers[handler]);
    		}
    		for (property in Object.getOwnPropertyNames(this)) {
    			typeof this[property] != 'function' && (this[property] = null);
    		}
    	};

    	$.fn.owlCarousel.Constructor.Plugins.AutoRefresh = AutoRefresh;

    })(window.Zepto || window.jQuery, window);
    (function($, window, document, undefined$1) {

    	/**
    	 * Creates the lazy plugin.
    	 * @class The Lazy Plugin
    	 * @param {Owl} carousel - The Owl Carousel
    	 */
    	var Lazy = function(carousel) {

    		/**
    		 * Reference to the core.
    		 * @protected
    		 * @type {Owl}
    		 */
    		this._core = carousel;

    		/**
    		 * Already loaded items.
    		 * @protected
    		 * @type {Array.<jQuery>}
    		 */
    		this._loaded = [];

    		/**
    		 * Event handlers.
    		 * @protected
    		 * @type {Object}
    		 */
    		this._handlers = {
    			'initialized.owl.carousel change.owl.carousel resized.owl.carousel': $.proxy(function(e) {
    				if (!e.namespace) {
    					return;
    				}

    				if (!this._core.settings || !this._core.settings.lazyLoad) {
    					return;
    				}

    				if ((e.property && e.property.name == 'position') || e.type == 'initialized') {
    					var settings = this._core.settings,
    						n = (settings.center && Math.ceil(settings.items / 2) || settings.items),
    						i = ((settings.center && n * -1) || 0),
    						position = (e.property && e.property.value !== undefined$1 ? e.property.value : this._core.current()) + i,
    						clones = this._core.clones().length,
    						load = $.proxy(function(i, v) { this.load(v); }, this);
    					//TODO: Need documentation for this new option
    					if (settings.lazyLoadEager > 0) {
    						n += settings.lazyLoadEager;
    						// If the carousel is looping also preload images that are to the "left"
    						if (settings.loop) {
                  position -= settings.lazyLoadEager;
                  n++;
                }
    					}

    					while (i++ < n) {
    						this.load(clones / 2 + this._core.relative(position));
    						clones && $.each(this._core.clones(this._core.relative(position)), load);
    						position++;
    					}
    				}
    			}, this)
    		};

    		// set the default options
    		this._core.options = $.extend({}, Lazy.Defaults, this._core.options);

    		// register event handler
    		this._core.$element.on(this._handlers);
    	};

    	/**
    	 * Default options.
    	 * @public
    	 */
    	Lazy.Defaults = {
    		lazyLoad: false,
    		lazyLoadEager: 0
    	};

    	/**
    	 * Loads all resources of an item at the specified position.
    	 * @param {Number} position - The absolute position of the item.
    	 * @protected
    	 */
    	Lazy.prototype.load = function(position) {
    		var $item = this._core.$stage.children().eq(position),
    			$elements = $item && $item.find('.owl-lazy');

    		if (!$elements || $.inArray($item.get(0), this._loaded) > -1) {
    			return;
    		}

    		$elements.each($.proxy(function(index, element) {
    			var $element = $(element), image,
                    url = (window.devicePixelRatio > 1 && $element.attr('data-src-retina')) || $element.attr('data-src') || $element.attr('data-srcset');

    			this._core.trigger('load', { element: $element, url: url }, 'lazy');

    			if ($element.is('img')) {
    				$element.one('load.owl.lazy', $.proxy(function() {
    					$element.css('opacity', 1);
    					this._core.trigger('loaded', { element: $element, url: url }, 'lazy');
    				}, this)).attr('src', url);
                } else if ($element.is('source')) {
                    $element.one('load.owl.lazy', $.proxy(function() {
                        this._core.trigger('loaded', { element: $element, url: url }, 'lazy');
                    }, this)).attr('srcset', url);
    			} else {
    				image = new Image();
    				image.onload = $.proxy(function() {
    					$element.css({
    						'background-image': 'url("' + url + '")',
    						'opacity': '1'
    					});
    					this._core.trigger('loaded', { element: $element, url: url }, 'lazy');
    				}, this);
    				image.src = url;
    			}
    		}, this));

    		this._loaded.push($item.get(0));
    	};

    	/**
    	 * Destroys the plugin.
    	 * @public
    	 */
    	Lazy.prototype.destroy = function() {
    		var handler, property;

    		for (handler in this.handlers) {
    			this._core.$element.off(handler, this.handlers[handler]);
    		}
    		for (property in Object.getOwnPropertyNames(this)) {
    			typeof this[property] != 'function' && (this[property] = null);
    		}
    	};

    	$.fn.owlCarousel.Constructor.Plugins.Lazy = Lazy;

    })(window.Zepto || window.jQuery, window);
    (function($, window, document, undefined$1) {

    	/**
    	 * Creates the auto height plugin.
    	 * @class The Auto Height Plugin
    	 * @param {Owl} carousel - The Owl Carousel
    	 */
    	var AutoHeight = function(carousel) {
    		/**
    		 * Reference to the core.
    		 * @protected
    		 * @type {Owl}
    		 */
    		this._core = carousel;

    		this._previousHeight = null;

    		/**
    		 * All event handlers.
    		 * @protected
    		 * @type {Object}
    		 */
    		this._handlers = {
    			'initialized.owl.carousel refreshed.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && this._core.settings.autoHeight) {
    					this.update();
    				}
    			}, this),
    			'changed.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && this._core.settings.autoHeight && e.property.name === 'position'){
    					this.update();
    				}
    			}, this),
    			'loaded.owl.lazy': $.proxy(function(e) {
    				if (e.namespace && this._core.settings.autoHeight
    					&& e.element.closest('.' + this._core.settings.itemClass).index() === this._core.current()) {
    					this.update();
    				}
    			}, this)
    		};

    		// set default options
    		this._core.options = $.extend({}, AutoHeight.Defaults, this._core.options);

    		// register event handlers
    		this._core.$element.on(this._handlers);
    		this._intervalId = null;
    		var refThis = this;

    		// These changes have been taken from a PR by gavrochelegnou proposed in #1575
    		// and have been made compatible with the latest jQuery version
    		$(window).on('load', function() {
    			if (refThis._core.settings.autoHeight) {
    				refThis.update();
    			}
    		});

    		// Autoresize the height of the carousel when window is resized
    		// When carousel has images, the height is dependent on the width
    		// and should also change on resize
    		$(window).resize(function() {
    			if (refThis._core.settings.autoHeight) {
    				if (refThis._intervalId != null) {
    					clearTimeout(refThis._intervalId);
    				}

    				refThis._intervalId = setTimeout(function() {
    					refThis.update();
    				}, 250);
    			}
    		});

    	};

    	/**
    	 * Default options.
    	 * @public
    	 */
    	AutoHeight.Defaults = {
    		autoHeight: false,
    		autoHeightClass: 'owl-height'
    	};

    	/**
    	 * Updates the view.
    	 */
    	AutoHeight.prototype.update = function() {
    		var start = this._core._current,
    			end = start + this._core.settings.items,
    			lazyLoadEnabled = this._core.settings.lazyLoad,
    			visible = this._core.$stage.children().toArray().slice(start, end),
    			heights = [],
    			maxheight = 0;

    		$.each(visible, function(index, item) {
    			heights.push($(item).height());
    		});

    		maxheight = Math.max.apply(null, heights);

    		if (maxheight <= 1 && lazyLoadEnabled && this._previousHeight) {
    			maxheight = this._previousHeight;
    		}

    		this._previousHeight = maxheight;

    		this._core.$stage.parent()
    			.height(maxheight)
    			.addClass(this._core.settings.autoHeightClass);
    	};

    	AutoHeight.prototype.destroy = function() {
    		var handler, property;

    		for (handler in this._handlers) {
    			this._core.$element.off(handler, this._handlers[handler]);
    		}
    		for (property in Object.getOwnPropertyNames(this)) {
    			typeof this[property] !== 'function' && (this[property] = null);
    		}
    	};

    	$.fn.owlCarousel.Constructor.Plugins.AutoHeight = AutoHeight;

    })(window.Zepto || window.jQuery, window);
    (function($, window, document, undefined$1) {

    	/**
    	 * Creates the video plugin.
    	 * @class The Video Plugin
    	 * @param {Owl} carousel - The Owl Carousel
    	 */
    	var Video = function(carousel) {
    		/**
    		 * Reference to the core.
    		 * @protected
    		 * @type {Owl}
    		 */
    		this._core = carousel;

    		/**
    		 * Cache all video URLs.
    		 * @protected
    		 * @type {Object}
    		 */
    		this._videos = {};

    		/**
    		 * Current playing item.
    		 * @protected
    		 * @type {jQuery}
    		 */
    		this._playing = null;

    		/**
    		 * All event handlers.
    		 * @todo The cloned content removale is too late
    		 * @protected
    		 * @type {Object}
    		 */
    		this._handlers = {
    			'initialized.owl.carousel': $.proxy(function(e) {
    				if (e.namespace) {
    					this._core.register({ type: 'state', name: 'playing', tags: [ 'interacting' ] });
    				}
    			}, this),
    			'resize.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && this._core.settings.video && this.isInFullScreen()) {
    					e.preventDefault();
    				}
    			}, this),
    			'refreshed.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && this._core.is('resizing')) {
    					this._core.$stage.find('.cloned .owl-video-frame').remove();
    				}
    			}, this),
    			'changed.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && e.property.name === 'position' && this._playing) {
    					this.stop();
    				}
    			}, this),
    			'prepared.owl.carousel': $.proxy(function(e) {
    				if (!e.namespace) {
    					return;
    				}

    				var $element = $(e.content).find('.owl-video');

    				if ($element.length) {
    					$element.css('display', 'none');
    					this.fetch($element, $(e.content));
    				}
    			}, this)
    		};

    		// set default options
    		this._core.options = $.extend({}, Video.Defaults, this._core.options);

    		// register event handlers
    		this._core.$element.on(this._handlers);

    		this._core.$element.on('click.owl.video', '.owl-video-play-icon', $.proxy(function(e) {
    			this.play(e);
    		}, this));
    	};

    	/**
    	 * Default options.
    	 * @public
    	 */
    	Video.Defaults = {
    		video: false,
    		videoHeight: false,
    		videoWidth: false
    	};

    	/**
    	 * Gets the video ID and the type (YouTube/Vimeo/vzaar only).
    	 * @protected
    	 * @param {jQuery} target - The target containing the video data.
    	 * @param {jQuery} item - The item containing the video.
    	 */
    	Video.prototype.fetch = function(target, item) {
    			var type = (function() {
    					if (target.attr('data-vimeo-id')) {
    						return 'vimeo';
    					} else if (target.attr('data-vzaar-id')) {
    						return 'vzaar'
    					} else {
    						return 'youtube';
    					}
    				})(),
    				id = target.attr('data-vimeo-id') || target.attr('data-youtube-id') || target.attr('data-vzaar-id'),
    				width = target.attr('data-width') || this._core.settings.videoWidth,
    				height = target.attr('data-height') || this._core.settings.videoHeight,
    				url = target.attr('href');

    		if (url) {

    			/*
    					Parses the id's out of the following urls (and probably more):
    					https://www.youtube.com/watch?v=:id
    					https://youtu.be/:id
    					https://vimeo.com/:id
    					https://vimeo.com/channels/:channel/:id
    					https://vimeo.com/groups/:group/videos/:id
    					https://app.vzaar.com/videos/:id

    					Visual example: https://regexper.com/#(http%3A%7Chttps%3A%7C)%5C%2F%5C%2F(player.%7Cwww.%7Capp.)%3F(vimeo%5C.com%7Cyoutu(be%5C.com%7C%5C.be%7Cbe%5C.googleapis%5C.com)%7Cvzaar%5C.com)%5C%2F(video%5C%2F%7Cvideos%5C%2F%7Cembed%5C%2F%7Cchannels%5C%2F.%2B%5C%2F%7Cgroups%5C%2F.%2B%5C%2F%7Cwatch%5C%3Fv%3D%7Cv%5C%2F)%3F(%5BA-Za-z0-9._%25-%5D*)(%5C%26%5CS%2B)%3F
    			*/

    			id = url.match(/(http:|https:|)\/\/(player.|www.|app.)?(vimeo\.com|youtu(be\.com|\.be|be\.googleapis\.com|be\-nocookie\.com)|vzaar\.com)\/(video\/|videos\/|embed\/|channels\/.+\/|groups\/.+\/|watch\?v=|v\/)?([A-Za-z0-9._%-]*)(\&\S+)?/);

    			if (id[3].indexOf('youtu') > -1) {
    				type = 'youtube';
    			} else if (id[3].indexOf('vimeo') > -1) {
    				type = 'vimeo';
    			} else if (id[3].indexOf('vzaar') > -1) {
    				type = 'vzaar';
    			} else {
    				throw new Error('Video URL not supported.');
    			}
    			id = id[6];
    		} else {
    			throw new Error('Missing video URL.');
    		}

    		this._videos[url] = {
    			type: type,
    			id: id,
    			width: width,
    			height: height
    		};

    		item.attr('data-video', url);

    		this.thumbnail(target, this._videos[url]);
    	};

    	/**
    	 * Creates video thumbnail.
    	 * @protected
    	 * @param {jQuery} target - The target containing the video data.
    	 * @param {Object} info - The video info object.
    	 * @see `fetch`
    	 */
    	Video.prototype.thumbnail = function(target, video) {
    		var tnLink,
    			icon,
    			path,
    			dimensions = video.width && video.height ? 'width:' + video.width + 'px;height:' + video.height + 'px;' : '',
    			customTn = target.find('img'),
    			srcType = 'src',
    			lazyClass = '',
    			settings = this._core.settings,
    			create = function(path) {
    				icon = '<div class="owl-video-play-icon"></div>';

    				if (settings.lazyLoad) {
    					tnLink = $('<div/>',{
    						"class": 'owl-video-tn ' + lazyClass,
    						"srcType": path
    					});
    				} else {
    					tnLink = $( '<div/>', {
    						"class": "owl-video-tn",
    						"style": 'opacity:1;background-image:url(' + path + ')'
    					});
    				}
    				target.after(tnLink);
    				target.after(icon);
    			};

    		// wrap video content into owl-video-wrapper div
    		target.wrap( $( '<div/>', {
    			"class": "owl-video-wrapper",
    			"style": dimensions
    		}));

    		if (this._core.settings.lazyLoad) {
    			srcType = 'data-src';
    			lazyClass = 'owl-lazy';
    		}

    		// custom thumbnail
    		if (customTn.length) {
    			create(customTn.attr(srcType));
    			customTn.remove();
    			return false;
    		}

    		if (video.type === 'youtube') {
    			path = "//img.youtube.com/vi/" + video.id + "/hqdefault.jpg";
    			create(path);
    		} else if (video.type === 'vimeo') {
    			$.ajax({
    				type: 'GET',
    				url: '//vimeo.com/api/v2/video/' + video.id + '.json',
    				jsonp: 'callback',
    				dataType: 'jsonp',
    				success: function(data) {
    					path = data[0].thumbnail_large;
    					create(path);
    				}
    			});
    		} else if (video.type === 'vzaar') {
    			$.ajax({
    				type: 'GET',
    				url: '//vzaar.com/api/videos/' + video.id + '.json',
    				jsonp: 'callback',
    				dataType: 'jsonp',
    				success: function(data) {
    					path = data.framegrab_url;
    					create(path);
    				}
    			});
    		}
    	};

    	/**
    	 * Stops the current video.
    	 * @public
    	 */
    	Video.prototype.stop = function() {
    		this._core.trigger('stop', null, 'video');
    		this._playing.find('.owl-video-frame').remove();
    		this._playing.removeClass('owl-video-playing');
    		this._playing = null;
    		this._core.leave('playing');
    		this._core.trigger('stopped', null, 'video');
    	};

    	/**
    	 * Starts the current video.
    	 * @public
    	 * @param {Event} event - The event arguments.
    	 */
    	Video.prototype.play = function(event) {
    		var target = $(event.target),
    			item = target.closest('.' + this._core.settings.itemClass),
    			video = this._videos[item.attr('data-video')],
    			width = video.width || '100%',
    			height = video.height || this._core.$stage.height(),
    			html,
    			iframe;

    		if (this._playing) {
    			return;
    		}

    		this._core.enter('playing');
    		this._core.trigger('play', null, 'video');

    		item = this._core.items(this._core.relative(item.index()));

    		this._core.reset(item.index());

    		html = $( '<iframe frameborder="0" allowfullscreen mozallowfullscreen webkitAllowFullScreen ></iframe>' );
    		html.attr( 'height', height );
    		html.attr( 'width', width );
    		if (video.type === 'youtube') {
    			html.attr( 'src', '//www.youtube.com/embed/' + video.id + '?autoplay=1&rel=0&v=' + video.id );
    		} else if (video.type === 'vimeo') {
    			html.attr( 'src', '//player.vimeo.com/video/' + video.id + '?autoplay=1' );
    		} else if (video.type === 'vzaar') {
    			html.attr( 'src', '//view.vzaar.com/' + video.id + '/player?autoplay=true' );
    		}

    		iframe = $(html).wrap( '<div class="owl-video-frame" />' ).insertAfter(item.find('.owl-video'));

    		this._playing = item.addClass('owl-video-playing');
    	};

    	/**
    	 * Checks whether an video is currently in full screen mode or not.
    	 * @todo Bad style because looks like a readonly method but changes members.
    	 * @protected
    	 * @returns {Boolean}
    	 */
    	Video.prototype.isInFullScreen = function() {
    		var element = document.fullscreenElement || document.mozFullScreenElement ||
    				document.webkitFullscreenElement;

    		return element && $(element).parent().hasClass('owl-video-frame');
    	};

    	/**
    	 * Destroys the plugin.
    	 */
    	Video.prototype.destroy = function() {
    		var handler, property;

    		this._core.$element.off('click.owl.video');

    		for (handler in this._handlers) {
    			this._core.$element.off(handler, this._handlers[handler]);
    		}
    		for (property in Object.getOwnPropertyNames(this)) {
    			typeof this[property] != 'function' && (this[property] = null);
    		}
    	};

    	$.fn.owlCarousel.Constructor.Plugins.Video = Video;

    })(window.Zepto || window.jQuery, window, document);
    (function($, window, document, undefined$1) {

    	/**
    	 * Creates the animate plugin.
    	 * @class The Navigation Plugin
    	 * @param {Owl} scope - The Owl Carousel
    	 */
    	var Animate = function(scope) {
    		this.core = scope;
    		this.core.options = $.extend({}, Animate.Defaults, this.core.options);
    		this.swapping = true;
    		this.previous = undefined$1;
    		this.next = undefined$1;

    		this.handlers = {
    			'change.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && e.property.name == 'position') {
    					this.previous = this.core.current();
    					this.next = e.property.value;
    				}
    			}, this),
    			'drag.owl.carousel dragged.owl.carousel translated.owl.carousel': $.proxy(function(e) {
    				if (e.namespace) {
    					this.swapping = e.type == 'translated';
    				}
    			}, this),
    			'translate.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && this.swapping && (this.core.options.animateOut || this.core.options.animateIn)) {
    					this.swap();
    				}
    			}, this)
    		};

    		this.core.$element.on(this.handlers);
    	};

    	/**
    	 * Default options.
    	 * @public
    	 */
    	Animate.Defaults = {
    		animateOut: false,
    		animateIn: false
    	};

    	/**
    	 * Toggles the animation classes whenever an translations starts.
    	 * @protected
    	 * @returns {Boolean|undefined}
    	 */
    	Animate.prototype.swap = function() {

    		if (this.core.settings.items !== 1) {
    			return;
    		}

    		if (!$.support.animation || !$.support.transition) {
    			return;
    		}

    		this.core.speed(0);

    		var left,
    			clear = $.proxy(this.clear, this),
    			previous = this.core.$stage.children().eq(this.previous),
    			next = this.core.$stage.children().eq(this.next),
    			incoming = this.core.settings.animateIn,
    			outgoing = this.core.settings.animateOut;

    		if (this.core.current() === this.previous) {
    			return;
    		}

    		if (outgoing) {
    			left = this.core.coordinates(this.previous) - this.core.coordinates(this.next);
    			previous.one($.support.animation.end, clear)
    				.css( { 'left': left + 'px' } )
    				.addClass('animated owl-animated-out')
    				.addClass(outgoing);
    		}

    		if (incoming) {
    			next.one($.support.animation.end, clear)
    				.addClass('animated owl-animated-in')
    				.addClass(incoming);
    		}
    	};

    	Animate.prototype.clear = function(e) {
    		$(e.target).css( { 'left': '' } )
    			.removeClass('animated owl-animated-out owl-animated-in')
    			.removeClass(this.core.settings.animateIn)
    			.removeClass(this.core.settings.animateOut);
    		this.core.onTransitionEnd();
    	};

    	/**
    	 * Destroys the plugin.
    	 * @public
    	 */
    	Animate.prototype.destroy = function() {
    		var handler, property;

    		for (handler in this.handlers) {
    			this.core.$element.off(handler, this.handlers[handler]);
    		}
    		for (property in Object.getOwnPropertyNames(this)) {
    			typeof this[property] != 'function' && (this[property] = null);
    		}
    	};

    	$.fn.owlCarousel.Constructor.Plugins.Animate = Animate;

    })(window.Zepto || window.jQuery);
    (function($, window, document, undefined$1) {

    	/**
    	 * Creates the autoplay plugin.
    	 * @class The Autoplay Plugin
    	 * @param {Owl} scope - The Owl Carousel
    	 */
    	var Autoplay = function(carousel) {
    		/**
    		 * Reference to the core.
    		 * @protected
    		 * @type {Owl}
    		 */
    		this._core = carousel;

    		/**
    		 * The autoplay timeout id.
    		 * @type {Number}
    		 */
    		this._call = null;

    		/**
    		 * Depending on the state of the plugin, this variable contains either
    		 * the start time of the timer or the current timer value if it's
    		 * paused. Since we start in a paused state we initialize the timer
    		 * value.
    		 * @type {Number}
    		 */
    		this._time = 0;

    		/**
    		 * Stores the timeout currently used.
    		 * @type {Number}
    		 */
    		this._timeout = 0;

    		/**
    		 * Indicates whenever the autoplay is paused.
    		 * @type {Boolean}
    		 */
    		this._paused = true;

    		/**
    		 * All event handlers.
    		 * @protected
    		 * @type {Object}
    		 */
    		this._handlers = {
    			'changed.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && e.property.name === 'settings') {
    					if (this._core.settings.autoplay) {
    						this.play();
    					} else {
    						this.stop();
    					}
    				} else if (e.namespace && e.property.name === 'position' && this._paused) {
    					// Reset the timer. This code is triggered when the position
    					// of the carousel was changed through user interaction.
    					this._time = 0;
    				}
    			}, this),
    			'initialized.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && this._core.settings.autoplay) {
    					this.play();
    				}
    			}, this),
    			'play.owl.autoplay': $.proxy(function(e, t, s) {
    				if (e.namespace) {
    					this.play(t, s);
    				}
    			}, this),
    			'stop.owl.autoplay': $.proxy(function(e) {
    				if (e.namespace) {
    					this.stop();
    				}
    			}, this),
    			'mouseover.owl.autoplay': $.proxy(function() {
    				if (this._core.settings.autoplayHoverPause && this._core.is('rotating')) {
    					this.pause();
    				}
    			}, this),
    			'mouseleave.owl.autoplay': $.proxy(function() {
    				if (this._core.settings.autoplayHoverPause && this._core.is('rotating')) {
    					this.play();
    				}
    			}, this),
    			'touchstart.owl.core': $.proxy(function() {
    				if (this._core.settings.autoplayHoverPause && this._core.is('rotating')) {
    					this.pause();
    				}
    			}, this),
    			'touchend.owl.core': $.proxy(function() {
    				if (this._core.settings.autoplayHoverPause) {
    					this.play();
    				}
    			}, this)
    		};

    		// register event handlers
    		this._core.$element.on(this._handlers);

    		// set default options
    		this._core.options = $.extend({}, Autoplay.Defaults, this._core.options);
    	};

    	/**
    	 * Default options.
    	 * @public
    	 */
    	Autoplay.Defaults = {
    		autoplay: false,
    		autoplayTimeout: 5000,
    		autoplayHoverPause: false,
    		autoplaySpeed: false
    	};

    	/**
    	 * Transition to the next slide and set a timeout for the next transition.
    	 * @private
    	 * @param {Number} [speed] - The animation speed for the animations.
    	 */
    	Autoplay.prototype._next = function(speed) {
    		this._call = window.setTimeout(
    			$.proxy(this._next, this, speed),
    			this._timeout * (Math.round(this.read() / this._timeout) + 1) - this.read()
    		);

    		if (this._core.is('interacting') || document.hidden) {
    			return;
    		}
    		this._core.next(speed || this._core.settings.autoplaySpeed);
    	};

    	/**
    	 * Reads the current timer value when the timer is playing.
    	 * @public
    	 */
    	Autoplay.prototype.read = function() {
    		return new Date().getTime() - this._time;
    	};

    	/**
    	 * Starts the autoplay.
    	 * @public
    	 * @param {Number} [timeout] - The interval before the next animation starts.
    	 * @param {Number} [speed] - The animation speed for the animations.
    	 */
    	Autoplay.prototype.play = function(timeout, speed) {
    		var elapsed;

    		if (!this._core.is('rotating')) {
    			this._core.enter('rotating');
    		}

    		timeout = timeout || this._core.settings.autoplayTimeout;

    		// Calculate the elapsed time since the last transition. If the carousel
    		// wasn't playing this calculation will yield zero.
    		elapsed = Math.min(this._time % (this._timeout || timeout), timeout);

    		if (this._paused) {
    			// Start the clock.
    			this._time = this.read();
    			this._paused = false;
    		} else {
    			// Clear the active timeout to allow replacement.
    			window.clearTimeout(this._call);
    		}

    		// Adjust the origin of the timer to match the new timeout value.
    		this._time += this.read() % timeout - elapsed;

    		this._timeout = timeout;
    		this._call = window.setTimeout($.proxy(this._next, this, speed), timeout - elapsed);
    	};

    	/**
    	 * Stops the autoplay.
    	 * @public
    	 */
    	Autoplay.prototype.stop = function() {
    		if (this._core.is('rotating')) {
    			// Reset the clock.
    			this._time = 0;
    			this._paused = true;

    			window.clearTimeout(this._call);
    			this._core.leave('rotating');
    		}
    	};

    	/**
    	 * Pauses the autoplay.
    	 * @public
    	 */
    	Autoplay.prototype.pause = function() {
    		if (this._core.is('rotating') && !this._paused) {
    			// Pause the clock.
    			this._time = this.read();
    			this._paused = true;

    			window.clearTimeout(this._call);
    		}
    	};

    	/**
    	 * Destroys the plugin.
    	 */
    	Autoplay.prototype.destroy = function() {
    		var handler, property;

    		this.stop();

    		for (handler in this._handlers) {
    			this._core.$element.off(handler, this._handlers[handler]);
    		}
    		for (property in Object.getOwnPropertyNames(this)) {
    			typeof this[property] != 'function' && (this[property] = null);
    		}
    	};

    	$.fn.owlCarousel.Constructor.Plugins.autoplay = Autoplay;

    })(window.Zepto || window.jQuery, window, document);
    (function($, window, document, undefined$1) {

    	/**
    	 * Creates the navigation plugin.
    	 * @class The Navigation Plugin
    	 * @param {Owl} carousel - The Owl Carousel.
    	 */
    	var Navigation = function(carousel) {
    		/**
    		 * Reference to the core.
    		 * @protected
    		 * @type {Owl}
    		 */
    		this._core = carousel;

    		/**
    		 * Indicates whether the plugin is initialized or not.
    		 * @protected
    		 * @type {Boolean}
    		 */
    		this._initialized = false;

    		/**
    		 * The current paging indexes.
    		 * @protected
    		 * @type {Array}
    		 */
    		this._pages = [];

    		/**
    		 * All DOM elements of the user interface.
    		 * @protected
    		 * @type {Object}
    		 */
    		this._controls = {};

    		/**
    		 * Markup for an indicator.
    		 * @protected
    		 * @type {Array.<String>}
    		 */
    		this._templates = [];

    		/**
    		 * The carousel element.
    		 * @type {jQuery}
    		 */
    		this.$element = this._core.$element;

    		/**
    		 * Overridden methods of the carousel.
    		 * @protected
    		 * @type {Object}
    		 */
    		this._overrides = {
    			next: this._core.next,
    			prev: this._core.prev,
    			to: this._core.to
    		};

    		/**
    		 * All event handlers.
    		 * @protected
    		 * @type {Object}
    		 */
    		this._handlers = {
    			'prepared.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && this._core.settings.dotsData) {
    					this._templates.push('<div class="' + this._core.settings.dotClass + '">' +
    						$(e.content).find('[data-dot]').addBack('[data-dot]').attr('data-dot') + '</div>');
    				}
    			}, this),
    			'added.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && this._core.settings.dotsData) {
    					this._templates.splice(e.position, 0, this._templates.pop());
    				}
    			}, this),
    			'remove.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && this._core.settings.dotsData) {
    					this._templates.splice(e.position, 1);
    				}
    			}, this),
    			'changed.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && e.property.name == 'position') {
    					this.draw();
    				}
    			}, this),
    			'initialized.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && !this._initialized) {
    					this._core.trigger('initialize', null, 'navigation');
    					this.initialize();
    					this.update();
    					this.draw();
    					this._initialized = true;
    					this._core.trigger('initialized', null, 'navigation');
    				}
    			}, this),
    			'refreshed.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && this._initialized) {
    					this._core.trigger('refresh', null, 'navigation');
    					this.update();
    					this.draw();
    					this._core.trigger('refreshed', null, 'navigation');
    				}
    			}, this)
    		};

    		// set default options
    		this._core.options = $.extend({}, Navigation.Defaults, this._core.options);

    		// register event handlers
    		this.$element.on(this._handlers);
    	};

    	/**
    	 * Default options.
    	 * @public
    	 * @todo Rename `slideBy` to `navBy`
    	 */
    	Navigation.Defaults = {
    		nav: false,
    		navText: [
    			'<span aria-label="' + 'Previous' + '">&#x2039;</span>',
    			'<span aria-label="' + 'Next' + '">&#x203a;</span>'
    		],
    		navSpeed: false,
    		navElement: 'button type="button" role="presentation"',
    		navContainer: false,
    		navContainerClass: 'owl-nav',
    		navClass: [
    			'owl-prev',
    			'owl-next'
    		],
    		slideBy: 1,
    		dotClass: 'owl-dot',
    		dotsClass: 'owl-dots',
    		dots: true,
    		dotsEach: false,
    		dotsData: false,
    		dotsSpeed: false,
    		dotsContainer: false
    	};

    	/**
    	 * Initializes the layout of the plugin and extends the carousel.
    	 * @protected
    	 */
    	Navigation.prototype.initialize = function() {
    		var override,
    			settings = this._core.settings;

    		// create DOM structure for relative navigation
    		this._controls.$relative = (settings.navContainer ? $(settings.navContainer)
    			: $('<div>').addClass(settings.navContainerClass).appendTo(this.$element)).addClass('disabled');

    		this._controls.$previous = $('<' + settings.navElement + '>')
    			.addClass(settings.navClass[0])
    			.html(settings.navText[0])
    			.prependTo(this._controls.$relative)
    			.on('click', $.proxy(function(e) {
    				this.prev(settings.navSpeed);
    			}, this));
    		this._controls.$next = $('<' + settings.navElement + '>')
    			.addClass(settings.navClass[1])
    			.html(settings.navText[1])
    			.appendTo(this._controls.$relative)
    			.on('click', $.proxy(function(e) {
    				this.next(settings.navSpeed);
    			}, this));

    		// create DOM structure for absolute navigation
    		if (!settings.dotsData) {
    			this._templates = [ $('<button role="button">')
    				.addClass(settings.dotClass)
    				.append($('<span>'))
    				.prop('outerHTML') ];
    		}

    		this._controls.$absolute = (settings.dotsContainer ? $(settings.dotsContainer)
    			: $('<div>').addClass(settings.dotsClass).appendTo(this.$element)).addClass('disabled');

    		this._controls.$absolute.on('click', 'button', $.proxy(function(e) {
    			var index = $(e.target).parent().is(this._controls.$absolute)
    				? $(e.target).index() : $(e.target).parent().index();

    			e.preventDefault();

    			this.to(index, settings.dotsSpeed);
    		}, this));

    		/*$el.on('focusin', function() {
    			$(document).off(".carousel");

    			$(document).on('keydown.carousel', function(e) {
    				if(e.keyCode == 37) {
    					$el.trigger('prev.owl')
    				}
    				if(e.keyCode == 39) {
    					$el.trigger('next.owl')
    				}
    			});
    		});*/

    		// override public methods of the carousel
    		for (override in this._overrides) {
    			this._core[override] = $.proxy(this[override], this);
    		}
    	};

    	/**
    	 * Destroys the plugin.
    	 * @protected
    	 */
    	Navigation.prototype.destroy = function() {
    		var handler, control, property, override, settings;
    		settings = this._core.settings;

    		for (handler in this._handlers) {
    			this.$element.off(handler, this._handlers[handler]);
    		}
    		for (control in this._controls) {
    			if (control === '$relative' && settings.navContainer) {
    				this._controls[control].html('');
    			} else {
    				this._controls[control].remove();
    			}
    		}
    		for (override in this.overides) {
    			this._core[override] = this._overrides[override];
    		}
    		for (property in Object.getOwnPropertyNames(this)) {
    			typeof this[property] != 'function' && (this[property] = null);
    		}
    	};

    	/**
    	 * Updates the internal state.
    	 * @protected
    	 */
    	Navigation.prototype.update = function() {
    		var i, j, k,
    			lower = this._core.clones().length / 2,
    			upper = lower + this._core.items().length,
    			maximum = this._core.maximum(true),
    			settings = this._core.settings,
    			size = settings.center || settings.autoWidth || settings.dotsData
    				? 1 : settings.dotsEach || settings.items;

    		if (settings.slideBy !== 'page') {
    			settings.slideBy = Math.min(settings.slideBy, settings.items);
    		}

    		if (settings.dots || settings.slideBy == 'page') {
    			this._pages = [];

    			for (i = lower, j = 0, k = 0; i < upper; i++) {
    				if (j >= size || j === 0) {
    					this._pages.push({
    						start: Math.min(maximum, i - lower),
    						end: i - lower + size - 1
    					});
    					if (Math.min(maximum, i - lower) === maximum) {
    						break;
    					}
    					j = 0, ++k;
    				}
    				j += this._core.mergers(this._core.relative(i));
    			}
    		}
    	};

    	/**
    	 * Draws the user interface.
    	 * @todo The option `dotsData` wont work.
    	 * @protected
    	 */
    	Navigation.prototype.draw = function() {
    		var difference,
    			settings = this._core.settings,
    			disabled = this._core.items().length <= settings.items,
    			index = this._core.relative(this._core.current()),
    			loop = settings.loop || settings.rewind;

    		this._controls.$relative.toggleClass('disabled', !settings.nav || disabled);

    		if (settings.nav) {
    			this._controls.$previous.toggleClass('disabled', !loop && index <= this._core.minimum(true));
    			this._controls.$next.toggleClass('disabled', !loop && index >= this._core.maximum(true));
    		}

    		this._controls.$absolute.toggleClass('disabled', !settings.dots || disabled);

    		if (settings.dots) {
    			difference = this._pages.length - this._controls.$absolute.children().length;

    			if (settings.dotsData && difference !== 0) {
    				this._controls.$absolute.html(this._templates.join(''));
    			} else if (difference > 0) {
    				this._controls.$absolute.append(new Array(difference + 1).join(this._templates[0]));
    			} else if (difference < 0) {
    				this._controls.$absolute.children().slice(difference).remove();
    			}

    			this._controls.$absolute.find('.active').removeClass('active');
    			this._controls.$absolute.children().eq($.inArray(this.current(), this._pages)).addClass('active');
    		}
    	};

    	/**
    	 * Extends event data.
    	 * @protected
    	 * @param {Event} event - The event object which gets thrown.
    	 */
    	Navigation.prototype.onTrigger = function(event) {
    		var settings = this._core.settings;

    		event.page = {
    			index: $.inArray(this.current(), this._pages),
    			count: this._pages.length,
    			size: settings && (settings.center || settings.autoWidth || settings.dotsData
    				? 1 : settings.dotsEach || settings.items)
    		};
    	};

    	/**
    	 * Gets the current page position of the carousel.
    	 * @protected
    	 * @returns {Number}
    	 */
    	Navigation.prototype.current = function() {
    		var current = this._core.relative(this._core.current());
    		return $.grep(this._pages, $.proxy(function(page, index) {
    			return page.start <= current && page.end >= current;
    		}, this)).pop();
    	};

    	/**
    	 * Gets the current succesor/predecessor position.
    	 * @protected
    	 * @returns {Number}
    	 */
    	Navigation.prototype.getPosition = function(successor) {
    		var position, length,
    			settings = this._core.settings;

    		if (settings.slideBy == 'page') {
    			position = $.inArray(this.current(), this._pages);
    			length = this._pages.length;
    			successor ? ++position : --position;
    			position = this._pages[((position % length) + length) % length].start;
    		} else {
    			position = this._core.relative(this._core.current());
    			length = this._core.items().length;
    			successor ? position += settings.slideBy : position -= settings.slideBy;
    		}

    		return position;
    	};

    	/**
    	 * Slides to the next item or page.
    	 * @public
    	 * @param {Number} [speed=false] - The time in milliseconds for the transition.
    	 */
    	Navigation.prototype.next = function(speed) {
    		$.proxy(this._overrides.to, this._core)(this.getPosition(true), speed);
    	};

    	/**
    	 * Slides to the previous item or page.
    	 * @public
    	 * @param {Number} [speed=false] - The time in milliseconds for the transition.
    	 */
    	Navigation.prototype.prev = function(speed) {
    		$.proxy(this._overrides.to, this._core)(this.getPosition(false), speed);
    	};

    	/**
    	 * Slides to the specified item or page.
    	 * @public
    	 * @param {Number} position - The position of the item or page.
    	 * @param {Number} [speed] - The time in milliseconds for the transition.
    	 * @param {Boolean} [standard=false] - Whether to use the standard behaviour or not.
    	 */
    	Navigation.prototype.to = function(position, speed, standard) {
    		var length;

    		if (!standard && this._pages.length) {
    			length = this._pages.length;
    			$.proxy(this._overrides.to, this._core)(this._pages[((position % length) + length) % length].start, speed);
    		} else {
    			$.proxy(this._overrides.to, this._core)(position, speed);
    		}
    	};

    	$.fn.owlCarousel.Constructor.Plugins.Navigation = Navigation;

    })(window.Zepto || window.jQuery);
    (function($, window, document, undefined$1) {

    	/**
    	 * Creates the hash plugin.
    	 * @class The Hash Plugin
    	 * @param {Owl} carousel - The Owl Carousel
    	 */
    	var Hash = function(carousel) {
    		/**
    		 * Reference to the core.
    		 * @protected
    		 * @type {Owl}
    		 */
    		this._core = carousel;

    		/**
    		 * Hash index for the items.
    		 * @protected
    		 * @type {Object}
    		 */
    		this._hashes = {};

    		/**
    		 * The carousel element.
    		 * @type {jQuery}
    		 */
    		this.$element = this._core.$element;

    		/**
    		 * All event handlers.
    		 * @protected
    		 * @type {Object}
    		 */
    		this._handlers = {
    			'initialized.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && this._core.settings.startPosition === 'URLHash') {
    					$(window).trigger('hashchange.owl.navigation');
    				}
    			}, this),
    			'prepared.owl.carousel': $.proxy(function(e) {
    				if (e.namespace) {
    					var hash = $(e.content).find('[data-hash]').addBack('[data-hash]').attr('data-hash');

    					if (!hash) {
    						return;
    					}

    					this._hashes[hash] = e.content;
    				}
    			}, this),
    			'changed.owl.carousel': $.proxy(function(e) {
    				if (e.namespace && e.property.name === 'position') {
    					var current = this._core.items(this._core.relative(this._core.current())),
    						hash = $.map(this._hashes, function(item, hash) {
    							return item === current ? hash : null;
    						}).join();

    					if (!hash || window.location.hash.slice(1) === hash) {
    						return;
    					}

    					window.location.hash = hash;
    				}
    			}, this)
    		};

    		// set default options
    		this._core.options = $.extend({}, Hash.Defaults, this._core.options);

    		// register the event handlers
    		this.$element.on(this._handlers);

    		// register event listener for hash navigation
    		$(window).on('hashchange.owl.navigation', $.proxy(function(e) {
    			var hash = window.location.hash.substring(1),
    				items = this._core.$stage.children(),
    				position = this._hashes[hash] && items.index(this._hashes[hash]);

    			if (position === undefined$1 || position === this._core.current()) {
    				return;
    			}

    			this._core.to(this._core.relative(position), false, true);
    		}, this));
    	};

    	/**
    	 * Default options.
    	 * @public
    	 */
    	Hash.Defaults = {
    		URLhashListener: false
    	};

    	/**
    	 * Destroys the plugin.
    	 * @public
    	 */
    	Hash.prototype.destroy = function() {
    		var handler, property;

    		$(window).off('hashchange.owl.navigation');

    		for (handler in this._handlers) {
    			this._core.$element.off(handler, this._handlers[handler]);
    		}
    		for (property in Object.getOwnPropertyNames(this)) {
    			typeof this[property] != 'function' && (this[property] = null);
    		}
    	};

    	$.fn.owlCarousel.Constructor.Plugins.Hash = Hash;

    })(window.Zepto || window.jQuery, window);
    (function($, window, document, undefined$1) {

    	var style = $('<support>').get(0).style,
    		prefixes = 'Webkit Moz O ms'.split(' '),
    		events = {
    			transition: {
    				end: {
    					WebkitTransition: 'webkitTransitionEnd',
    					MozTransition: 'transitionend',
    					OTransition: 'oTransitionEnd',
    					transition: 'transitionend'
    				}
    			},
    			animation: {
    				end: {
    					WebkitAnimation: 'webkitAnimationEnd',
    					MozAnimation: 'animationend',
    					OAnimation: 'oAnimationEnd',
    					animation: 'animationend'
    				}
    			}
    		},
    		tests = {
    			csstransforms: function() {
    				return !!test('transform');
    			},
    			csstransforms3d: function() {
    				return !!test('perspective');
    			},
    			csstransitions: function() {
    				return !!test('transition');
    			},
    			cssanimations: function() {
    				return !!test('animation');
    			}
    		};

    	function test(property, prefixed) {
    		var result = false,
    			upper = property.charAt(0).toUpperCase() + property.slice(1);

    		$.each((property + ' ' + prefixes.join(upper + ' ') + upper).split(' '), function(i, property) {
    			if (style[property] !== undefined$1) {
    				result = prefixed ? property : true;
    				return false;
    			}
    		});

    		return result;
    	}

    	function prefixed(property) {
    		return test(property, true);
    	}

    	if (tests.csstransitions()) {
    		/* jshint -W053 */
    		$.support.transition = new String(prefixed('transition'));
    		$.support.transition.end = events.transition.end[ $.support.transition ];
    	}

    	if (tests.cssanimations()) {
    		/* jshint -W053 */
    		$.support.animation = new String(prefixed('animation'));
    		$.support.animation.end = events.animation.end[ $.support.animation ];
    	}

    	if (tests.csstransforms()) {
    		/* jshint -W053 */
    		$.support.transform = new String(prefixed('transform'));
    		$.support.transform3d = tests.csstransforms3d();
    	}

    })(window.Zepto || window.jQuery);

    var sectionSlider = (function () {
      var $sliders = $('.js-section-slider');

      if ($sliders.length) {
        $sliders.each(function () {
          var $slider = $(this);
          var $list = $slider.find('.js-slides');
          var $buttons = $slider.find('.js-button');
          var $currentSlide = $slider.find('.js-current-slide');
          var $totalSlides = $slider.find('.js-total-slides');
          /* Custom callback for slides counter */

          function counter(event) {
            if (!event.namespace) {
              return;
            }

            var slides = event.relatedTarget;
            $currentSlide.text(slides.relative(slides.current()) + 1);
            $totalSlides.text(slides.items().length);
          }
          /* Initialization */


          var options = {
            items: 1,
            nav: false,
            dots: false,
            onInitialized: counter,
            onChanged: counter
          };
          $list.owlCarousel(options);
          /* Custom navigation */

          $buttons.each(function () {
            var $button = $(this);

            if ($button.hasClass('prev')) {
              $button.on('click', function () {
                $list.trigger('prev.owl.carousel');
              });
            }

            if ($button.hasClass('next')) {
              $button.on('click', function () {
                $list.trigger('next.owl.carousel');
              });
            }
          });
        });
      }
    });

    var parallax = createCommonjsModule(function (module, exports) {
    (function(f){{module.exports=f();}})(function(){return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof commonjsRequire=="function"&&commonjsRequire;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r);}return n[o].exports}var i=typeof commonjsRequire=="function"&&commonjsRequire;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
    /* eslint-disable no-unused-vars */
    var getOwnPropertySymbols = Object.getOwnPropertySymbols;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var propIsEnumerable = Object.prototype.propertyIsEnumerable;

    function toObject(val) {
    	if (val === null || val === undefined) {
    		throw new TypeError('Object.assign cannot be called with null or undefined');
    	}

    	return Object(val);
    }

    function shouldUseNative() {
    	try {
    		if (!Object.assign) {
    			return false;
    		}

    		// Detect buggy property enumeration order in older V8 versions.

    		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
    		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
    		test1[5] = 'de';
    		if (Object.getOwnPropertyNames(test1)[0] === '5') {
    			return false;
    		}

    		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
    		var test2 = {};
    		for (var i = 0; i < 10; i++) {
    			test2['_' + String.fromCharCode(i)] = i;
    		}
    		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
    			return test2[n];
    		});
    		if (order2.join('') !== '0123456789') {
    			return false;
    		}

    		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
    		var test3 = {};
    		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
    			test3[letter] = letter;
    		});
    		if (Object.keys(Object.assign({}, test3)).join('') !==
    				'abcdefghijklmnopqrst') {
    			return false;
    		}

    		return true;
    	} catch (err) {
    		// We don't expect any of the above to throw, but better to be safe.
    		return false;
    	}
    }

    module.exports = shouldUseNative() ? Object.assign : function (target, source) {
    	var from;
    	var to = toObject(target);
    	var symbols;

    	for (var s = 1; s < arguments.length; s++) {
    		from = Object(arguments[s]);

    		for (var key in from) {
    			if (hasOwnProperty.call(from, key)) {
    				to[key] = from[key];
    			}
    		}

    		if (getOwnPropertySymbols) {
    			symbols = getOwnPropertySymbols(from);
    			for (var i = 0; i < symbols.length; i++) {
    				if (propIsEnumerable.call(from, symbols[i])) {
    					to[symbols[i]] = from[symbols[i]];
    				}
    			}
    		}
    	}

    	return to;
    };

    },{}],2:[function(require,module,exports){
    (function (process){
    // Generated by CoffeeScript 1.12.2
    (function() {
      var getNanoSeconds, hrtime, loadTime, moduleLoadTime, nodeLoadTime, upTime;

      if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
        module.exports = function() {
          return performance.now();
        };
      } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
        module.exports = function() {
          return (getNanoSeconds() - nodeLoadTime) / 1e6;
        };
        hrtime = process.hrtime;
        getNanoSeconds = function() {
          var hr;
          hr = hrtime();
          return hr[0] * 1e9 + hr[1];
        };
        moduleLoadTime = getNanoSeconds();
        upTime = process.uptime() * 1e9;
        nodeLoadTime = moduleLoadTime - upTime;
      } else if (Date.now) {
        module.exports = function() {
          return Date.now() - loadTime;
        };
        loadTime = Date.now();
      } else {
        module.exports = function() {
          return new Date().getTime() - loadTime;
        };
        loadTime = new Date().getTime();
      }

    }).call(this);



    }).call(this,require('_process'));

    },{"_process":3}],3:[function(require,module,exports){
    // shim for using process in browser
    var process = module.exports = {};

    // cached from whatever global is present so that test runners that stub it
    // don't break things.  But we need to wrap it in a try catch in case it is
    // wrapped in strict mode code which doesn't define any globals.  It's inside a
    // function because try/catches deoptimize in certain engines.

    var cachedSetTimeout;
    var cachedClearTimeout;

    function defaultSetTimout() {
        throw new Error('setTimeout has not been defined');
    }
    function defaultClearTimeout () {
        throw new Error('clearTimeout has not been defined');
    }
    (function () {
        try {
            if (typeof setTimeout === 'function') {
                cachedSetTimeout = setTimeout;
            } else {
                cachedSetTimeout = defaultSetTimout;
            }
        } catch (e) {
            cachedSetTimeout = defaultSetTimout;
        }
        try {
            if (typeof clearTimeout === 'function') {
                cachedClearTimeout = clearTimeout;
            } else {
                cachedClearTimeout = defaultClearTimeout;
            }
        } catch (e) {
            cachedClearTimeout = defaultClearTimeout;
        }
    } ());
    function runTimeout(fun) {
        if (cachedSetTimeout === setTimeout) {
            //normal enviroments in sane situations
            return setTimeout(fun, 0);
        }
        // if setTimeout wasn't available but was latter defined
        if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
            cachedSetTimeout = setTimeout;
            return setTimeout(fun, 0);
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedSetTimeout(fun, 0);
        } catch(e){
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                return cachedSetTimeout.call(null, fun, 0);
            } catch(e){
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                return cachedSetTimeout.call(this, fun, 0);
            }
        }


    }
    function runClearTimeout(marker) {
        if (cachedClearTimeout === clearTimeout) {
            //normal enviroments in sane situations
            return clearTimeout(marker);
        }
        // if clearTimeout wasn't available but was latter defined
        if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
            cachedClearTimeout = clearTimeout;
            return clearTimeout(marker);
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedClearTimeout(marker);
        } catch (e){
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                return cachedClearTimeout.call(null, marker);
            } catch (e){
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                return cachedClearTimeout.call(this, marker);
            }
        }



    }
    var queue = [];
    var draining = false;
    var currentQueue;
    var queueIndex = -1;

    function cleanUpNextTick() {
        if (!draining || !currentQueue) {
            return;
        }
        draining = false;
        if (currentQueue.length) {
            queue = currentQueue.concat(queue);
        } else {
            queueIndex = -1;
        }
        if (queue.length) {
            drainQueue();
        }
    }

    function drainQueue() {
        if (draining) {
            return;
        }
        var timeout = runTimeout(cleanUpNextTick);
        draining = true;

        var len = queue.length;
        while(len) {
            currentQueue = queue;
            queue = [];
            while (++queueIndex < len) {
                if (currentQueue) {
                    currentQueue[queueIndex].run();
                }
            }
            queueIndex = -1;
            len = queue.length;
        }
        currentQueue = null;
        draining = false;
        runClearTimeout(timeout);
    }

    process.nextTick = function (fun) {
        var args = new Array(arguments.length - 1);
        if (arguments.length > 1) {
            for (var i = 1; i < arguments.length; i++) {
                args[i - 1] = arguments[i];
            }
        }
        queue.push(new Item(fun, args));
        if (queue.length === 1 && !draining) {
            runTimeout(drainQueue);
        }
    };

    // v8 likes predictible objects
    function Item(fun, array) {
        this.fun = fun;
        this.array = array;
    }
    Item.prototype.run = function () {
        this.fun.apply(null, this.array);
    };
    process.title = 'browser';
    process.browser = true;
    process.env = {};
    process.argv = [];
    process.version = ''; // empty string to avoid regexp issues
    process.versions = {};

    function noop() {}

    process.on = noop;
    process.addListener = noop;
    process.once = noop;
    process.off = noop;
    process.removeListener = noop;
    process.removeAllListeners = noop;
    process.emit = noop;
    process.prependListener = noop;
    process.prependOnceListener = noop;

    process.listeners = function (name) { return [] };

    process.binding = function (name) {
        throw new Error('process.binding is not supported');
    };

    process.cwd = function () { return '/' };
    process.chdir = function (dir) {
        throw new Error('process.chdir is not supported');
    };
    process.umask = function() { return 0; };

    },{}],4:[function(require,module,exports){
    (function (global){
    var now = require('performance-now')
      , root = typeof window === 'undefined' ? global : window
      , vendors = ['moz', 'webkit']
      , suffix = 'AnimationFrame'
      , raf = root['request' + suffix]
      , caf = root['cancel' + suffix] || root['cancelRequest' + suffix];

    for(var i = 0; !raf && i < vendors.length; i++) {
      raf = root[vendors[i] + 'Request' + suffix];
      caf = root[vendors[i] + 'Cancel' + suffix]
          || root[vendors[i] + 'CancelRequest' + suffix];
    }

    // Some versions of FF have rAF but not cAF
    if(!raf || !caf) {
      var last = 0
        , id = 0
        , queue = []
        , frameDuration = 1000 / 60;

      raf = function(callback) {
        if(queue.length === 0) {
          var _now = now()
            , next = Math.max(0, frameDuration - (_now - last));
          last = next + _now;
          setTimeout(function() {
            var cp = queue.slice(0);
            // Clear queue here to prevent
            // callbacks from appending listeners
            // to the current frame's queue
            queue.length = 0;
            for(var i = 0; i < cp.length; i++) {
              if(!cp[i].cancelled) {
                try{
                  cp[i].callback(last);
                } catch(e) {
                  setTimeout(function() { throw e }, 0);
                }
              }
            }
          }, Math.round(next));
        }
        queue.push({
          handle: ++id,
          callback: callback,
          cancelled: false
        });
        return id
      };

      caf = function(handle) {
        for(var i = 0; i < queue.length; i++) {
          if(queue[i].handle === handle) {
            queue[i].cancelled = true;
          }
        }
      };
    }

    module.exports = function(fn) {
      // Wrap in a new function to prevent
      // `cancel` potentially being assigned
      // to the native rAF function
      return raf.call(root, fn)
    };
    module.exports.cancel = function() {
      caf.apply(root, arguments);
    };
    module.exports.polyfill = function() {
      root.requestAnimationFrame = raf;
      root.cancelAnimationFrame = caf;
    };

    }).call(this,typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});

    },{"performance-now":2}],5:[function(require,module,exports){

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    /**
    * Parallax.js
    * @author Matthew Wagerfield - @wagerfield, René Roth - mail@reneroth.org
    * @description Creates a parallax effect between an array of layers,
    *              driving the motion from the gyroscope output of a smartdevice.
    *              If no gyroscope is available, the cursor position is used.
    */

    var rqAnFr = require('raf');
    var objectAssign = require('object-assign');

    var helpers = {
      propertyCache: {},
      vendors: [null, ['-webkit-', 'webkit'], ['-moz-', 'Moz'], ['-o-', 'O'], ['-ms-', 'ms']],

      clamp: function clamp(value, min, max) {
        return min < max ? value < min ? min : value > max ? max : value : value < max ? max : value > min ? min : value;
      },
      data: function data(element, name) {
        return helpers.deserialize(element.getAttribute('data-' + name));
      },
      deserialize: function deserialize(value) {
        if (value === 'true') {
          return true;
        } else if (value === 'false') {
          return false;
        } else if (value === 'null') {
          return null;
        } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
          return parseFloat(value);
        } else {
          return value;
        }
      },
      camelCase: function camelCase(value) {
        return value.replace(/-+(.)?/g, function (match, character) {
          return character ? character.toUpperCase() : '';
        });
      },
      accelerate: function accelerate(element) {
        helpers.css(element, 'transform', 'translate3d(0,0,0) rotate(0.0001deg)');
        helpers.css(element, 'transform-style', 'preserve-3d');
        helpers.css(element, 'backface-visibility', 'hidden');
      },
      transformSupport: function transformSupport(value) {
        var element = document.createElement('div'),
            propertySupport = false,
            propertyValue = null,
            featureSupport = false,
            cssProperty = null,
            jsProperty = null;
        for (var i = 0, l = helpers.vendors.length; i < l; i++) {
          if (helpers.vendors[i] !== null) {
            cssProperty = helpers.vendors[i][0] + 'transform';
            jsProperty = helpers.vendors[i][1] + 'Transform';
          } else {
            cssProperty = 'transform';
            jsProperty = 'transform';
          }
          if (element.style[jsProperty] !== undefined) {
            propertySupport = true;
            break;
          }
        }
        switch (value) {
          case '2D':
            featureSupport = propertySupport;
            break;
          case '3D':
            if (propertySupport) {
              var body = document.body || document.createElement('body'),
                  documentElement = document.documentElement,
                  documentOverflow = documentElement.style.overflow,
                  isCreatedBody = false;

              if (!document.body) {
                isCreatedBody = true;
                documentElement.style.overflow = 'hidden';
                documentElement.appendChild(body);
                body.style.overflow = 'hidden';
                body.style.background = '';
              }

              body.appendChild(element);
              element.style[jsProperty] = 'translate3d(1px,1px,1px)';
              propertyValue = window.getComputedStyle(element).getPropertyValue(cssProperty);
              featureSupport = propertyValue !== undefined && propertyValue.length > 0 && propertyValue !== 'none';
              documentElement.style.overflow = documentOverflow;
              body.removeChild(element);

              if (isCreatedBody) {
                body.removeAttribute('style');
                body.parentNode.removeChild(body);
              }
            }
            break;
        }
        return featureSupport;
      },
      css: function css(element, property, value) {
        var jsProperty = helpers.propertyCache[property];
        if (!jsProperty) {
          for (var i = 0, l = helpers.vendors.length; i < l; i++) {
            if (helpers.vendors[i] !== null) {
              jsProperty = helpers.camelCase(helpers.vendors[i][1] + '-' + property);
            } else {
              jsProperty = property;
            }
            if (element.style[jsProperty] !== undefined) {
              helpers.propertyCache[property] = jsProperty;
              break;
            }
          }
        }
        element.style[jsProperty] = value;
      }
    };

    var MAGIC_NUMBER = 30,
        DEFAULTS = {
      relativeInput: false,
      clipRelativeInput: false,
      inputElement: null,
      hoverOnly: false,
      calibrationThreshold: 100,
      calibrationDelay: 500,
      supportDelay: 500,
      calibrateX: false,
      calibrateY: true,
      invertX: true,
      invertY: true,
      limitX: false,
      limitY: false,
      scalarX: 10.0,
      scalarY: 10.0,
      frictionX: 0.1,
      frictionY: 0.1,
      originX: 0.5,
      originY: 0.5,
      pointerEvents: false,
      precision: 1,
      onReady: null,
      selector: null
    };

    var Parallax = function () {
      function Parallax(element, options) {
        _classCallCheck(this, Parallax);

        this.element = element;

        var data = {
          calibrateX: helpers.data(this.element, 'calibrate-x'),
          calibrateY: helpers.data(this.element, 'calibrate-y'),
          invertX: helpers.data(this.element, 'invert-x'),
          invertY: helpers.data(this.element, 'invert-y'),
          limitX: helpers.data(this.element, 'limit-x'),
          limitY: helpers.data(this.element, 'limit-y'),
          scalarX: helpers.data(this.element, 'scalar-x'),
          scalarY: helpers.data(this.element, 'scalar-y'),
          frictionX: helpers.data(this.element, 'friction-x'),
          frictionY: helpers.data(this.element, 'friction-y'),
          originX: helpers.data(this.element, 'origin-x'),
          originY: helpers.data(this.element, 'origin-y'),
          pointerEvents: helpers.data(this.element, 'pointer-events'),
          precision: helpers.data(this.element, 'precision'),
          relativeInput: helpers.data(this.element, 'relative-input'),
          clipRelativeInput: helpers.data(this.element, 'clip-relative-input'),
          hoverOnly: helpers.data(this.element, 'hover-only'),
          inputElement: document.querySelector(helpers.data(this.element, 'input-element')),
          selector: helpers.data(this.element, 'selector')
        };

        for (var key in data) {
          if (data[key] === null) {
            delete data[key];
          }
        }

        objectAssign(this, DEFAULTS, data, options);

        if (!this.inputElement) {
          this.inputElement = this.element;
        }

        this.calibrationTimer = null;
        this.calibrationFlag = true;
        this.enabled = false;
        this.depthsX = [];
        this.depthsY = [];
        this.raf = null;

        this.bounds = null;
        this.elementPositionX = 0;
        this.elementPositionY = 0;
        this.elementWidth = 0;
        this.elementHeight = 0;

        this.elementCenterX = 0;
        this.elementCenterY = 0;

        this.elementRangeX = 0;
        this.elementRangeY = 0;

        this.calibrationX = 0;
        this.calibrationY = 0;

        this.inputX = 0;
        this.inputY = 0;

        this.motionX = 0;
        this.motionY = 0;

        this.velocityX = 0;
        this.velocityY = 0;

        this.onMouseMove = this.onMouseMove.bind(this);
        this.onDeviceOrientation = this.onDeviceOrientation.bind(this);
        this.onDeviceMotion = this.onDeviceMotion.bind(this);
        this.onOrientationTimer = this.onOrientationTimer.bind(this);
        this.onMotionTimer = this.onMotionTimer.bind(this);
        this.onCalibrationTimer = this.onCalibrationTimer.bind(this);
        this.onAnimationFrame = this.onAnimationFrame.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);

        this.windowWidth = null;
        this.windowHeight = null;
        this.windowCenterX = null;
        this.windowCenterY = null;
        this.windowRadiusX = null;
        this.windowRadiusY = null;
        this.portrait = false;
        this.desktop = !navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|BB10|mobi|tablet|opera mini|nexus 7)/i);
        this.motionSupport = !!window.DeviceMotionEvent && !this.desktop;
        this.orientationSupport = !!window.DeviceOrientationEvent && !this.desktop;
        this.orientationStatus = 0;
        this.motionStatus = 0;

        this.initialise();
      }

      _createClass(Parallax, [{
        key: 'initialise',
        value: function initialise() {
          if (this.transform2DSupport === undefined) {
            this.transform2DSupport = helpers.transformSupport('2D');
            this.transform3DSupport = helpers.transformSupport('3D');
          }

          // Configure Context Styles
          if (this.transform3DSupport) {
            helpers.accelerate(this.element);
          }

          var style = window.getComputedStyle(this.element);
          if (style.getPropertyValue('position') === 'static') {
            this.element.style.position = 'relative';
          }

          // Pointer events
          if (!this.pointerEvents) {
            this.element.style.pointerEvents = 'none';
          }

          // Setup
          this.updateLayers();
          this.updateDimensions();
          this.enable();
          this.queueCalibration(this.calibrationDelay);
        }
      }, {
        key: 'doReadyCallback',
        value: function doReadyCallback() {
          if (this.onReady) {
            this.onReady();
          }
        }
      }, {
        key: 'updateLayers',
        value: function updateLayers() {
          if (this.selector) {
            this.layers = this.element.querySelectorAll(this.selector);
          } else {
            this.layers = this.element.children;
          }

          if (!this.layers.length) {
            console.warn('ParallaxJS: Your scene does not have any layers.');
          }

          this.depthsX = [];
          this.depthsY = [];

          for (var index = 0; index < this.layers.length; index++) {
            var layer = this.layers[index];

            if (this.transform3DSupport) {
              helpers.accelerate(layer);
            }

            layer.style.position = index ? 'absolute' : 'relative';
            layer.style.display = 'block';
            layer.style.left = 0;
            layer.style.top = 0;

            var depth = helpers.data(layer, 'depth') || 0;
            this.depthsX.push(helpers.data(layer, 'depth-x') || depth);
            this.depthsY.push(helpers.data(layer, 'depth-y') || depth);
          }
        }
      }, {
        key: 'updateDimensions',
        value: function updateDimensions() {
          this.windowWidth = window.innerWidth;
          this.windowHeight = window.innerHeight;
          this.windowCenterX = this.windowWidth * this.originX;
          this.windowCenterY = this.windowHeight * this.originY;
          this.windowRadiusX = Math.max(this.windowCenterX, this.windowWidth - this.windowCenterX);
          this.windowRadiusY = Math.max(this.windowCenterY, this.windowHeight - this.windowCenterY);
        }
      }, {
        key: 'updateBounds',
        value: function updateBounds() {
          this.bounds = this.inputElement.getBoundingClientRect();
          this.elementPositionX = this.bounds.left;
          this.elementPositionY = this.bounds.top;
          this.elementWidth = this.bounds.width;
          this.elementHeight = this.bounds.height;
          this.elementCenterX = this.elementWidth * this.originX;
          this.elementCenterY = this.elementHeight * this.originY;
          this.elementRangeX = Math.max(this.elementCenterX, this.elementWidth - this.elementCenterX);
          this.elementRangeY = Math.max(this.elementCenterY, this.elementHeight - this.elementCenterY);
        }
      }, {
        key: 'queueCalibration',
        value: function queueCalibration(delay) {
          clearTimeout(this.calibrationTimer);
          this.calibrationTimer = setTimeout(this.onCalibrationTimer, delay);
        }
      }, {
        key: 'enable',
        value: function enable() {
          if (this.enabled) {
            return;
          }
          this.enabled = true;

          if (this.orientationSupport) {
            this.portrait = false;
            window.addEventListener('deviceorientation', this.onDeviceOrientation);
            this.detectionTimer = setTimeout(this.onOrientationTimer, this.supportDelay);
          } else if (this.motionSupport) {
            this.portrait = false;
            window.addEventListener('devicemotion', this.onDeviceMotion);
            this.detectionTimer = setTimeout(this.onMotionTimer, this.supportDelay);
          } else {
            this.calibrationX = 0;
            this.calibrationY = 0;
            this.portrait = false;
            window.addEventListener('mousemove', this.onMouseMove);
            this.doReadyCallback();
          }

          window.addEventListener('resize', this.onWindowResize);
          this.raf = rqAnFr(this.onAnimationFrame);
        }
      }, {
        key: 'disable',
        value: function disable() {
          if (!this.enabled) {
            return;
          }
          this.enabled = false;

          if (this.orientationSupport) {
            window.removeEventListener('deviceorientation', this.onDeviceOrientation);
          } else if (this.motionSupport) {
            window.removeEventListener('devicemotion', this.onDeviceMotion);
          } else {
            window.removeEventListener('mousemove', this.onMouseMove);
          }

          window.removeEventListener('resize', this.onWindowResize);
          rqAnFr.cancel(this.raf);
        }
      }, {
        key: 'calibrate',
        value: function calibrate(x, y) {
          this.calibrateX = x === undefined ? this.calibrateX : x;
          this.calibrateY = y === undefined ? this.calibrateY : y;
        }
      }, {
        key: 'invert',
        value: function invert(x, y) {
          this.invertX = x === undefined ? this.invertX : x;
          this.invertY = y === undefined ? this.invertY : y;
        }
      }, {
        key: 'friction',
        value: function friction(x, y) {
          this.frictionX = x === undefined ? this.frictionX : x;
          this.frictionY = y === undefined ? this.frictionY : y;
        }
      }, {
        key: 'scalar',
        value: function scalar(x, y) {
          this.scalarX = x === undefined ? this.scalarX : x;
          this.scalarY = y === undefined ? this.scalarY : y;
        }
      }, {
        key: 'limit',
        value: function limit(x, y) {
          this.limitX = x === undefined ? this.limitX : x;
          this.limitY = y === undefined ? this.limitY : y;
        }
      }, {
        key: 'origin',
        value: function origin(x, y) {
          this.originX = x === undefined ? this.originX : x;
          this.originY = y === undefined ? this.originY : y;
        }
      }, {
        key: 'setInputElement',
        value: function setInputElement(element) {
          this.inputElement = element;
          this.updateDimensions();
        }
      }, {
        key: 'setPosition',
        value: function setPosition(element, x, y) {
          x = x.toFixed(this.precision) + 'px';
          y = y.toFixed(this.precision) + 'px';
          if (this.transform3DSupport) {
            helpers.css(element, 'transform', 'translate3d(' + x + ',' + y + ',0)');
          } else if (this.transform2DSupport) {
            helpers.css(element, 'transform', 'translate(' + x + ',' + y + ')');
          } else {
            element.style.left = x;
            element.style.top = y;
          }
        }
      }, {
        key: 'onOrientationTimer',
        value: function onOrientationTimer() {
          if (this.orientationSupport && this.orientationStatus === 0) {
            this.disable();
            this.orientationSupport = false;
            this.enable();
          } else {
            this.doReadyCallback();
          }
        }
      }, {
        key: 'onMotionTimer',
        value: function onMotionTimer() {
          if (this.motionSupport && this.motionStatus === 0) {
            this.disable();
            this.motionSupport = false;
            this.enable();
          } else {
            this.doReadyCallback();
          }
        }
      }, {
        key: 'onCalibrationTimer',
        value: function onCalibrationTimer() {
          this.calibrationFlag = true;
        }
      }, {
        key: 'onWindowResize',
        value: function onWindowResize() {
          this.updateDimensions();
        }
      }, {
        key: 'onAnimationFrame',
        value: function onAnimationFrame() {
          this.updateBounds();
          var calibratedInputX = this.inputX - this.calibrationX,
              calibratedInputY = this.inputY - this.calibrationY;
          if (Math.abs(calibratedInputX) > this.calibrationThreshold || Math.abs(calibratedInputY) > this.calibrationThreshold) {
            this.queueCalibration(0);
          }
          if (this.portrait) {
            this.motionX = this.calibrateX ? calibratedInputY : this.inputY;
            this.motionY = this.calibrateY ? calibratedInputX : this.inputX;
          } else {
            this.motionX = this.calibrateX ? calibratedInputX : this.inputX;
            this.motionY = this.calibrateY ? calibratedInputY : this.inputY;
          }
          this.motionX *= this.elementWidth * (this.scalarX / 100);
          this.motionY *= this.elementHeight * (this.scalarY / 100);
          if (!isNaN(parseFloat(this.limitX))) {
            this.motionX = helpers.clamp(this.motionX, -this.limitX, this.limitX);
          }
          if (!isNaN(parseFloat(this.limitY))) {
            this.motionY = helpers.clamp(this.motionY, -this.limitY, this.limitY);
          }
          this.velocityX += (this.motionX - this.velocityX) * this.frictionX;
          this.velocityY += (this.motionY - this.velocityY) * this.frictionY;
          for (var index = 0; index < this.layers.length; index++) {
            var layer = this.layers[index],
                depthX = this.depthsX[index],
                depthY = this.depthsY[index],
                xOffset = this.velocityX * (depthX * (this.invertX ? -1 : 1)),
                yOffset = this.velocityY * (depthY * (this.invertY ? -1 : 1));
            this.setPosition(layer, xOffset, yOffset);
          }
          this.raf = rqAnFr(this.onAnimationFrame);
        }
      }, {
        key: 'rotate',
        value: function rotate(beta, gamma) {
          // Extract Rotation
          var x = (beta || 0) / MAGIC_NUMBER,
              //  -90 :: 90
          y = (gamma || 0) / MAGIC_NUMBER; // -180 :: 180

          // Detect Orientation Change
          var portrait = this.windowHeight > this.windowWidth;
          if (this.portrait !== portrait) {
            this.portrait = portrait;
            this.calibrationFlag = true;
          }

          if (this.calibrationFlag) {
            this.calibrationFlag = false;
            this.calibrationX = x;
            this.calibrationY = y;
          }

          this.inputX = x;
          this.inputY = y;
        }
      }, {
        key: 'onDeviceOrientation',
        value: function onDeviceOrientation(event) {
          var beta = event.beta;
          var gamma = event.gamma;
          if (beta !== null && gamma !== null) {
            this.orientationStatus = 1;
            this.rotate(beta, gamma);
          }
        }
      }, {
        key: 'onDeviceMotion',
        value: function onDeviceMotion(event) {
          var beta = event.rotationRate.beta;
          var gamma = event.rotationRate.gamma;
          if (beta !== null && gamma !== null) {
            this.motionStatus = 1;
            this.rotate(beta, gamma);
          }
        }
      }, {
        key: 'onMouseMove',
        value: function onMouseMove(event) {
          var clientX = event.clientX,
              clientY = event.clientY;

          // reset input to center if hoverOnly is set and we're not hovering the element
          if (this.hoverOnly && (clientX < this.elementPositionX || clientX > this.elementPositionX + this.elementWidth || clientY < this.elementPositionY || clientY > this.elementPositionY + this.elementHeight)) {
            this.inputX = 0;
            this.inputY = 0;
            return;
          }

          if (this.relativeInput) {
            // Clip mouse coordinates inside element bounds.
            if (this.clipRelativeInput) {
              clientX = Math.max(clientX, this.elementPositionX);
              clientX = Math.min(clientX, this.elementPositionX + this.elementWidth);
              clientY = Math.max(clientY, this.elementPositionY);
              clientY = Math.min(clientY, this.elementPositionY + this.elementHeight);
            }
            // Calculate input relative to the element.
            if (this.elementRangeX && this.elementRangeY) {
              this.inputX = (clientX - this.elementPositionX - this.elementCenterX) / this.elementRangeX;
              this.inputY = (clientY - this.elementPositionY - this.elementCenterY) / this.elementRangeY;
            }
          } else {
            // Calculate input relative to the window.
            if (this.windowRadiusX && this.windowRadiusY) {
              this.inputX = (clientX - this.windowCenterX) / this.windowRadiusX;
              this.inputY = (clientY - this.windowCenterY) / this.windowRadiusY;
            }
          }
        }
      }, {
        key: 'destroy',
        value: function destroy() {
          this.disable();

          clearTimeout(this.calibrationTimer);
          clearTimeout(this.detectionTimer);

          this.element.removeAttribute('style');
          for (var index = 0; index < this.layers.length; index++) {
            this.layers[index].removeAttribute('style');
          }

          delete this.element;
          delete this.layers;
        }
      }, {
        key: 'version',
        value: function version() {
          return '3.1.0';
        }
      }]);

      return Parallax;
    }();

    module.exports = Parallax;

    },{"object-assign":1,"raf":4}]},{},[5])(5)
    });

    });

    var scenes = (function () {
      var scenes = document.querySelectorAll('.js-scene');

      if (scenes.length) {
        scenes.forEach(function (scene) {
          new parallax(scene);
        });
      }
    });

    var parseURI = (function () {
      var uri = decodeURI(window.location.href);
      var index = uri.indexOf('#');
      return index !== -1 ? uri.slice(index) : null;
    });

    var categoriesSlider = (function () {
      var $sliders = $('.js-categories-slider');

      if ($sliders.length) {
        $sliders.each(function () {
          var $slider = $(this);
          var withUrlFunctionality = $slider.hasClass('js-categories-slider-url');
          var hash = parseURI();
          var $list = $slider.find('.js-slides');
          var $buttons = $slider.find('.js-button');
          var $previousItem = null;

          function getStartPosition() {
            if (withUrlFunctionality && hash) {
              var $referenceEl = $("a[href=\"".concat(hash, "\"]"));
              $referenceEl.addClass('current');
              $previousItem = $referenceEl;
              return $('a.js-item').index($referenceEl);
            } else {
              return 0;
            }
          }

          var options = {
            startPosition: getStartPosition(),
            items: 1,
            // mouseDrag: false,
            responsive: {
              0: {
                margin: 30
              },
              992: {
                margin: 170
              }
            },
            nav: false,
            dotsContainer: 'categories-slider__navigation',
            onInitialized: sliderInit,
            onTranslated: null
          };
          $list.owlCarousel(options);

          function sliderInit() {
            if (!withUrlFunctionality) checkCurrentLink();
          }

          function checkCurrentLink($el) {
            /* Default state */
            if ($previousItem === null) {
              $previousItem = $slider.find('.js-item').first();
              $previousItem.addClass('current');
              return;
            }
            /* Delete state */


            if ($previousItem) {
              $previousItem.removeClass('current');
              $previousItem = null;
            }
            /* Rewrite state */


            $previousItem = $el;
            $previousItem.addClass('current');
          }
          /* Navigation via words in top panel */


          $('.js-item').on('click', function (event) {
            event.preventDefault();
            /* Patch URI */

            if (withUrlFunctionality) window.location.hash = $(this).attr('href');
            $list.trigger('to.owl.carousel', [$(this).index(), 300]);
            checkCurrentLink($(this));
          });
          /* Custom navigation */

          $buttons.each(function () {
            var $button = $(this);

            if ($button.hasClass('prev')) {
              $button.on('click', function () {
                $list.trigger('prev.owl.carousel');
              });
            }

            if ($button.hasClass('next')) {
              $button.on('click', function () {
                $list.trigger('next.owl.carousel');
              });
            }
          });
          /* Synchronized navigations */

          $list.on('changed.owl.carousel', function (event) {
            var currentItem = event.item.index;
            checkCurrentLink($('.js-item').eq(currentItem));
          });
        });
      }
    });

    var showMore = (function () {
      var $slides = $('.js-categories-slide');

      var checkOverflow = function checkOverflow(element) {
        var check = element[0].scrollHeight > element.innerHeight() ? true : false;
        return check;
      };

      var initStates = function initStates(element, elementToHide) {
        if (checkOverflow(element)) {
          element.addClass('is-overflow');
          elementToHide.hide(300);
        }
      };

      if ($slides.length) {
        var documentWidth = $(document).width();
        if (documentWidth > 576) return;
        $slides.each(function () {
          var $slide = $(this);
          var $p = $slide.find('.js-description');
          var $list = $slide.find('.js-differences');
          var $button = $slide.find('.js-show-more');
          initStates($p, $list);
          $button.on('click', function () {
            if ($p.hasClass('is-overflow')) {
              $p.removeClass('is-overflow');
              $p.addClass('not-crowded');
              $list.show();
              $button.hide();
            }
          });
        });
      }
    });

    var jquery_unveil2 = createCommonjsModule(function (module, exports) {
    /**
     * Unveil2.js
     * A very lightweight jQuery plugin to lazy load images
     * Based on https://github.com/luis-almeida/unveil
     *
     * Licensed under the MIT license.
     * Copyright 2015 Joram van den Boezem
     * https://github.com/nabble/unveil2
     */
    (function(factory) {
        {
            module.exports = factory(jquery);
        }

    }(function ($) {

        /**
         * # GLOBAL VARIABLES
         * ---
         */

        /**
         * Store the string 'unveil' in a variable to save some bytes
         */
        var unveilString = 'unveil',

        /**
         * jQuery event namespace
         */
            unveilNamespace = '.' + unveilString,

        /**
         * Store the string 'src' in a variable to save some bytes
         */
            srcString = 'src',

        /**
         * Store the string 'placeholder' in a variable to save some bytes
         */
            placeholderString = 'placeholder';

        /**
         * # PLUGIN
         * ---
         */

        /**
         * @param {object} options An object of options, see API section in README
         * @returns {$}
         */
        $.fn.unveil = function (options) {

            options = options || {};

            // Initialize variables
            var $window = $(window),
                height = $window.height(),
                defaults = {
                    // Public API
                    placeholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                    offset: 0,
                    breakpoints: [],
                    throttle: 250,
                    debug: false,
                    attribute: srcString,
                    container: $window,

                    // Undocumented
                    retina: window.devicePixelRatio > 1,

                    // Deprecated
                    loading: null,
                    loaded: null
                },
                settings = $.extend(true, {}, defaults, options);

            if (settings.debug) console.log('Called unveil on', this.length, 'elements with the following options:', settings);

            /**
             * Sort sizes array, arrange highest minWidth to front of array
             */
            settings.breakpoints.sort(function (a, b) {
                return b.minWidth - a.minWidth;
            });

            var containerContext = settings.container.data(unveilString);
            if (!containerContext) {
                containerContext = {
                    images: $(),
                    initialized: false
                };
                settings.container.data(unveilString, containerContext);
            }

            /**
             * # UNVEIL IMAGES
             * ---
             */

            /**
             * This is the actual plugin logic, which determines the source attribute to use based on window width and presence of a retina screen, changes the source of the image, handles class name changes and triggers a callback if set. Once the image has been loaded, start the unveil lookup because the page layout could have changed.
             */
            this.one(unveilString + unveilNamespace, function () {
                var i, $this = $(this), windowWidth = $window.width(),
                    attrib = settings.attribute, targetSrc, defaultSrc, retinaSrc;

                // Determine attribute to extract source from
                for (i = 0; i < settings.breakpoints.length; i++) {
                    var dataAttrib = settings.breakpoints[i].attribute.replace(/^data-/, '');
                    if (windowWidth >= settings.breakpoints[i].minWidth && $this.data(dataAttrib)) {
                        attrib = dataAttrib;
                        break;
                    }
                }

                // Extract source
                defaultSrc = retinaSrc = $this.data(attrib);

                // Do we have a retina source?
                if (defaultSrc && defaultSrc.indexOf("|") !== -1) {
                    retinaSrc = defaultSrc.split("|")[1];
                    defaultSrc = defaultSrc.split("|")[0];
                }

                // Change attribute on image
                if (defaultSrc) {
                    targetSrc = (settings.retina && retinaSrc) ? retinaSrc : defaultSrc;

                    if (settings.debug) console.log('Unveiling image', {
                        attribute: attrib,
                        retina: settings.retina,
                        defaultSrc: defaultSrc,
                        retinaSrc: retinaSrc,
                        targetSrc: targetSrc
                    });

                    // Change classes
                    $this.addClass(unveilString + '-loading');

                    // Fire up the callback if it's a function...
                    if (typeof settings.loading === 'function') {
                        settings.loading.call(this);
                    }
                    // ...and trigger custom event
                    $this.trigger('loading' + unveilNamespace);

                    // When new source has loaded, do stuff
                    $this.one('load' + unveilNamespace, function () {

                        // Change classes
                        classLoaded($this);

                        // Fire up the callback if it's a function...
                        if (typeof settings.loaded === 'function') {
                            settings.loaded.call(this);
                        }
                        // ...and trigger custom event
                        $this.trigger('loaded' + unveilNamespace);

                        // Loading the image may have modified page layout,
                        // so unveil again
                        lookup();
                    });

                    // Set new source
                    if (this.nodeName === 'IMG') {
                        $this.prop(srcString, targetSrc);
                    } else {
                        $('<img/>').attr(srcString, targetSrc).one('load' + unveilNamespace, function() {
                            $(this).remove();
                            $this.css('backgroundImage', 'url(' + targetSrc + ')').trigger('load' + unveilNamespace);
                        });
                    }

                    // If the image has instantly loaded, change classes now
                    if (this.complete) {
                        classLoaded($this);
                    }
                }
            });

            this.one('destroy' + unveilNamespace, function () {
                $(this).off(unveilNamespace).removeData(unveilString);
                if (containerContext.images) {
                    containerContext.images = containerContext.images.not(this);
                    if (!containerContext.images.length) {
                        destroyContainer();
                    }
                }
            });

            /**
             * # HELPER FUNCTIONS
             * ---
             */

            /**
             * Sets the classes when an image is done loading
             *
             * @param {object} $elm
             */
            function classLoaded($elm) {
                $elm.removeClass(unveilString + '-' + placeholderString + ' ' + unveilString + '-loading');
                $elm.addClass(unveilString + '-loaded');
            }

            /**
             * Filter function which returns true when a given image is in the viewport.
             *
             * @returns {boolean}
             */
            function inview() {
                // jshint validthis: true
                var $this = $(this);

                if ($this.is(':hidden')) {
                    return;
                }

                var viewport = {top: 0 - settings.offset, bottom: $window.height() + settings.offset},
                    isCustomContainer = settings.container[0] !== $window[0],
                    elementRect = this.getBoundingClientRect();
                if (isCustomContainer) {
                    var containerRect = settings.container[0].getBoundingClientRect();
                    if (contains(viewport, containerRect)) {
                        var top = containerRect.top - settings.offset;
                        var bottom = containerRect.bottom + settings.offset;
                        var containerRectWithOffset = {
                            top: top > viewport.top ? top : viewport.top,
                            bottom: bottom < viewport.bottom ? bottom : viewport.bottom
                        };
                        return contains(containerRectWithOffset, elementRect);
                    }
                    return false;
                } else {
                    return contains(viewport, elementRect);
                }
            }

            /**
             * Whether `viewport` contains `rect` vertically
             */
            function contains(viewport, rect) {
                return rect.bottom >= viewport.top && rect.top <= viewport.bottom;
            }

            /**
             * Sets the window height and calls the lookup function
             */
            function resize() {
                height = $window.height();
                lookup();
            }

            /**
             * Throttle function with function call in tail. Based on http://sampsonblog.com/749/simple-throttle-function
             *
             * @param {function} callback
             * @returns {function}
             */
            function throttle(callback) {
                var wait = false;                  // Initially, we're not waiting
                return function () {               // We return a throttled function
                    if (!wait) {                   // If we're not waiting
                        wait = true;               // Prevent future invocations
                        setTimeout(function () {   // After a period of time
                            callback();            // Execute users function
                            wait = false;          // And allow future invocations
                        }, settings.throttle);
                    }
                };
            }

            /**
             * # LOOKUP FUNCTION
             * ---
             */

            /**
             * Function which filters images which are in view and triggers the unveil event on those images.
             */
            function lookup() {
                if (settings.debug) console.log('Unveiling');

                if (containerContext.images) {
                    var batch = containerContext.images.filter(inview);

                    batch.trigger(unveilString + unveilNamespace);
                    containerContext.images = containerContext.images.not(batch);

                    if (batch.length) {
                        if (settings.debug) console.log('New images in view', batch.length, ', leaves', containerContext.length, 'in collection');
                    }
                }
            }

            function destroyContainer() {
                settings.container.off(unveilNamespace).removeData(unveilString);
                containerContext.images.off(unveilNamespace).removeData(unveilString);
                containerContext.initialized = false;
                containerContext.images = null;
            }

            /**
             * # BOOTSTRAPPING
             * ---
             */

            /**
             * Read and reset the src attribute, to prevent loading of original images
             */
            this.each(function () {
                var $this = $(this),
                    elmPlaceholder = $this.data(srcString + '-' + placeholderString) || settings.placeholder;

                // If this element has been called before,
                // don't set placeholder now to prevent FOUI (Flash Of Ustyled Image)
                if (!$this.data(unveilString)) {

                    // Add element to global array
                    containerContext.images = $(containerContext.images).add(this);

                    // Set the unveil flag
                    $this.data(unveilString, true);

                    // Set data-src if not set
                    if (!$this.data(settings.attribute)) {
                        $this.data(settings.attribute, $this.prop(settings.attribute));
                    }

                    // Set placeholder
                    $this
                        .one('load' + unveilNamespace, function () {
                            var $this = $(this);

                            if ($this.hasClass(unveilString + '-loaded')) {
                                return;
                            }

                            $this.addClass(unveilString + '-' + placeholderString);
                            lookup();
                        })
                        .prop(srcString, '')
                        .prop(srcString, elmPlaceholder);
                }
            });

            if (settings.debug) console.log('Images now in collection', containerContext.images.length);

            /**
             * Bind global listeners
             */
            {if (!containerContext.initialized) {
                settings.container
                    .on('resize' + unveilNamespace, throttle(resize))
                    .on('scroll' + unveilNamespace, throttle(lookup))
                    .on('lookup' + unveilNamespace, lookup)
                    .on('destroy' + unveilNamespace, destroyContainer);
                containerContext.initialized = true;
            }}

            /**
             * Wait a little bit for the placeholder to be set, so the src attribute is not empty (which will mark the image as hidden)
             */
            {setTimeout(lookup, 0);}

            /**
             * That's all folks!
             */
            return this;

        };

    }));
    });

    var lazyLoadImages = (function () {
      var $images = $('img[data-src]');

      if ($images.length) {
        $images.each(function () {
          var $image = $(this);
          $image.unveil(200, function () {
            $(this).load(function () {
              this.style.opacity = 1;
            });
          });
        });
      }
    });

    // ==================================================
    // fancyBox v3.5.7
    //
    // Licensed GPLv3 for open source use
    // or fancyBox Commercial License for commercial use
    //
    // http://fancyapps.com/fancybox/
    // Copyright 2019 fancyApps
    //
    // ==================================================
    (function (window, document, $, undefined$1) {

      window.console = window.console || {
        info: function (stuff) {}
      };

      // If there's no jQuery, fancyBox can't work
      // =========================================

      if (!$) {
        return;
      }

      // Check if fancyBox is already initialized
      // ========================================

      if ($.fn.fancybox) {
        console.info("fancyBox already initialized");

        return;
      }

      // Private default settings
      // ========================

      var defaults = {
        // Close existing modals
        // Set this to false if you do not need to stack multiple instances
        closeExisting: false,

        // Enable infinite gallery navigation
        loop: false,

        // Horizontal space between slides
        gutter: 50,

        // Enable keyboard navigation
        keyboard: true,

        // Should allow caption to overlap the content
        preventCaptionOverlap: true,

        // Should display navigation arrows at the screen edges
        arrows: true,

        // Should display counter at the top left corner
        infobar: true,

        // Should display close button (using `btnTpl.smallBtn` template) over the content
        // Can be true, false, "auto"
        // If "auto" - will be automatically enabled for "html", "inline" or "ajax" items
        smallBtn: "auto",

        // Should display toolbar (buttons at the top)
        // Can be true, false, "auto"
        // If "auto" - will be automatically hidden if "smallBtn" is enabled
        toolbar: "auto",

        // What buttons should appear in the top right corner.
        // Buttons will be created using templates from `btnTpl` option
        // and they will be placed into toolbar (class="fancybox-toolbar"` element)
        buttons: [
          "zoom",
          //"share",
          "slideShow",
          //"fullScreen",
          //"download",
          "thumbs",
          "close"
        ],

        // Detect "idle" time in seconds
        idleTime: 3,

        // Disable right-click and use simple image protection for images
        protect: false,

        // Shortcut to make content "modal" - disable keyboard navigtion, hide buttons, etc
        modal: false,

        image: {
          // Wait for images to load before displaying
          //   true  - wait for image to load and then display;
          //   false - display thumbnail and load the full-sized image over top,
          //           requires predefined image dimensions (`data-width` and `data-height` attributes)
          preload: false
        },

        ajax: {
          // Object containing settings for ajax request
          settings: {
            // This helps to indicate that request comes from the modal
            // Feel free to change naming
            data: {
              fancybox: true
            }
          }
        },

        iframe: {
          // Iframe template
          tpl: '<iframe id="fancybox-frame{rnd}" name="fancybox-frame{rnd}" class="fancybox-iframe" allowfullscreen="allowfullscreen" allow="autoplay; fullscreen" src=""></iframe>',

          // Preload iframe before displaying it
          // This allows to calculate iframe content width and height
          // (note: Due to "Same Origin Policy", you can't get cross domain data).
          preload: true,

          // Custom CSS styling for iframe wrapping element
          // You can use this to set custom iframe dimensions
          css: {},

          // Iframe tag attributes
          attr: {
            scrolling: "auto"
          }
        },

        // For HTML5 video only
        video: {
          tpl: '<video class="fancybox-video" controls controlsList="nodownload" poster="{{poster}}">' +
            '<source src="{{src}}" type="{{format}}" />' +
            'Sorry, your browser doesn\'t support embedded videos, <a href="{{src}}">download</a> and watch with your favorite video player!' +
            "</video>",
          format: "", // custom video format
          autoStart: true
        },

        // Default content type if cannot be detected automatically
        defaultType: "image",

        // Open/close animation type
        // Possible values:
        //   false            - disable
        //   "zoom"           - zoom images from/to thumbnail
        //   "fade"
        //   "zoom-in-out"
        //
        animationEffect: "zoom",

        // Duration in ms for open/close animation
        animationDuration: 366,

        // Should image change opacity while zooming
        // If opacity is "auto", then opacity will be changed if image and thumbnail have different aspect ratios
        zoomOpacity: "auto",

        // Transition effect between slides
        //
        // Possible values:
        //   false            - disable
        //   "fade'
        //   "slide'
        //   "circular'
        //   "tube'
        //   "zoom-in-out'
        //   "rotate'
        //
        transitionEffect: "fade",

        // Duration in ms for transition animation
        transitionDuration: 366,

        // Custom CSS class for slide element
        slideClass: "",

        // Custom CSS class for layout
        baseClass: "",

        // Base template for layout
        baseTpl: '<div class="fancybox-container" role="dialog" tabindex="-1">' +
          '<div class="fancybox-bg"></div>' +
          '<div class="fancybox-inner">' +
          '<div class="fancybox-infobar"><span data-fancybox-index></span>&nbsp;/&nbsp;<span data-fancybox-count></span></div>' +
          '<div class="fancybox-toolbar">{{buttons}}</div>' +
          '<div class="fancybox-navigation">{{arrows}}</div>' +
          '<div class="fancybox-stage"></div>' +
          '<div class="fancybox-caption"><div class="fancybox-caption__body"></div></div>' +
          "</div>" +
          "</div>",

        // Loading indicator template
        spinnerTpl: '<div class="fancybox-loading"></div>',

        // Error message template
        errorTpl: '<div class="fancybox-error"><p>{{ERROR}}</p></div>',

        btnTpl: {
          download: '<a download data-fancybox-download class="fancybox-button fancybox-button--download" title="{{DOWNLOAD}}" href="javascript:;">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.62 17.09V19H5.38v-1.91zm-2.97-6.96L17 11.45l-5 4.87-5-4.87 1.36-1.32 2.68 2.64V5h1.92v7.77z"/></svg>' +
            "</a>",

          zoom: '<button data-fancybox-zoom class="fancybox-button fancybox-button--zoom" title="{{ZOOM}}">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.7 17.3l-3-3a5.9 5.9 0 0 0-.6-7.6 5.9 5.9 0 0 0-8.4 0 5.9 5.9 0 0 0 0 8.4 5.9 5.9 0 0 0 7.7.7l3 3a1 1 0 0 0 1.3 0c.4-.5.4-1 0-1.5zM8.1 13.8a4 4 0 0 1 0-5.7 4 4 0 0 1 5.7 0 4 4 0 0 1 0 5.7 4 4 0 0 1-5.7 0z"/></svg>' +
            "</button>",

          close: '<button data-fancybox-close class="fancybox-button fancybox-button--close" title="{{CLOSE}}">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 10.6L6.6 5.2 5.2 6.6l5.4 5.4-5.4 5.4 1.4 1.4 5.4-5.4 5.4 5.4 1.4-1.4-5.4-5.4 5.4-5.4-1.4-1.4-5.4 5.4z"/></svg>' +
            "</button>",

          // Arrows
          arrowLeft: '<button data-fancybox-prev class="fancybox-button fancybox-button--arrow_left" title="{{PREV}}">' +
            '<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.28 15.7l-1.34 1.37L5 12l4.94-5.07 1.34 1.38-2.68 2.72H19v1.94H8.6z"/></svg></div>' +
            "</button>",

          arrowRight: '<button data-fancybox-next class="fancybox-button fancybox-button--arrow_right" title="{{NEXT}}">' +
            '<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.4 12.97l-2.68 2.72 1.34 1.38L19 12l-4.94-5.07-1.34 1.38 2.68 2.72H5v1.94z"/></svg></div>' +
            "</button>",

          // This small close button will be appended to your html/inline/ajax content by default,
          // if "smallBtn" option is not set to false
          smallBtn: '<button type="button" data-fancybox-close class="fancybox-button fancybox-close-small" title="{{CLOSE}}">' +
            '<svg xmlns="http://www.w3.org/2000/svg" version="1" viewBox="0 0 24 24"><path d="M13 12l5-5-1-1-5 5-5-5-1 1 5 5-5 5 1 1 5-5 5 5 1-1z"/></svg>' +
            "</button>"
        },

        // Container is injected into this element
        parentEl: "body",

        // Hide browser vertical scrollbars; use at your own risk
        hideScrollbar: true,

        // Focus handling
        // ==============

        // Try to focus on the first focusable element after opening
        autoFocus: true,

        // Put focus back to active element after closing
        backFocus: true,

        // Do not let user to focus on element outside modal content
        trapFocus: true,

        // Module specific options
        // =======================

        fullScreen: {
          autoStart: false
        },

        // Set `touch: false` to disable panning/swiping
        touch: {
          vertical: true, // Allow to drag content vertically
          momentum: true // Continue movement after releasing mouse/touch when panning
        },

        // Hash value when initializing manually,
        // set `false` to disable hash change
        hash: null,

        // Customize or add new media types
        // Example:
        /*
          media : {
            youtube : {
              params : {
                autoplay : 0
              }
            }
          }
        */
        media: {},

        slideShow: {
          autoStart: false,
          speed: 3000
        },

        thumbs: {
          autoStart: false, // Display thumbnails on opening
          hideOnClose: true, // Hide thumbnail grid when closing animation starts
          parentEl: ".fancybox-container", // Container is injected into this element
          axis: "y" // Vertical (y) or horizontal (x) scrolling
        },

        // Use mousewheel to navigate gallery
        // If 'auto' - enabled for images only
        wheel: "auto",

        // Callbacks
        //==========

        // See Documentation/API/Events for more information
        // Example:
        /*
          afterShow: function( instance, current ) {
            console.info( 'Clicked element:' );
            console.info( current.opts.$orig );
          }
        */

        onInit: $.noop, // When instance has been initialized

        beforeLoad: $.noop, // Before the content of a slide is being loaded
        afterLoad: $.noop, // When the content of a slide is done loading

        beforeShow: $.noop, // Before open animation starts
        afterShow: $.noop, // When content is done loading and animating

        beforeClose: $.noop, // Before the instance attempts to close. Return false to cancel the close.
        afterClose: $.noop, // After instance has been closed

        onActivate: $.noop, // When instance is brought to front
        onDeactivate: $.noop, // When other instance has been activated

        // Interaction
        // ===========

        // Use options below to customize taken action when user clicks or double clicks on the fancyBox area,
        // each option can be string or method that returns value.
        //
        // Possible values:
        //   "close"           - close instance
        //   "next"            - move to next gallery item
        //   "nextOrClose"     - move to next gallery item or close if gallery has only one item
        //   "toggleControls"  - show/hide controls
        //   "zoom"            - zoom image (if loaded)
        //   false             - do nothing

        // Clicked on the content
        clickContent: function (current, event) {
          return current.type === "image" ? "zoom" : false;
        },

        // Clicked on the slide
        clickSlide: "close",

        // Clicked on the background (backdrop) element;
        // if you have not changed the layout, then most likely you need to use `clickSlide` option
        clickOutside: "close",

        // Same as previous two, but for double click
        dblclickContent: false,
        dblclickSlide: false,
        dblclickOutside: false,

        // Custom options when mobile device is detected
        // =============================================

        mobile: {
          preventCaptionOverlap: false,
          idleTime: false,
          clickContent: function (current, event) {
            return current.type === "image" ? "toggleControls" : false;
          },
          clickSlide: function (current, event) {
            return current.type === "image" ? "toggleControls" : "close";
          },
          dblclickContent: function (current, event) {
            return current.type === "image" ? "zoom" : false;
          },
          dblclickSlide: function (current, event) {
            return current.type === "image" ? "zoom" : false;
          }
        },

        // Internationalization
        // ====================

        lang: "en",
        i18n: {
          en: {
            CLOSE: "Close",
            NEXT: "Next",
            PREV: "Previous",
            ERROR: "The requested content cannot be loaded. <br/> Please try again later.",
            PLAY_START: "Start slideshow",
            PLAY_STOP: "Pause slideshow",
            FULL_SCREEN: "Full screen",
            THUMBS: "Thumbnails",
            DOWNLOAD: "Download",
            SHARE: "Share",
            ZOOM: "Zoom"
          },
          de: {
            CLOSE: "Schlie&szlig;en",
            NEXT: "Weiter",
            PREV: "Zur&uuml;ck",
            ERROR: "Die angeforderten Daten konnten nicht geladen werden. <br/> Bitte versuchen Sie es sp&auml;ter nochmal.",
            PLAY_START: "Diaschau starten",
            PLAY_STOP: "Diaschau beenden",
            FULL_SCREEN: "Vollbild",
            THUMBS: "Vorschaubilder",
            DOWNLOAD: "Herunterladen",
            SHARE: "Teilen",
            ZOOM: "Vergr&ouml;&szlig;ern"
          }
        }
      };

      // Few useful variables and methods
      // ================================

      var $W = $(window);
      var $D = $(document);

      var called = 0;

      // Check if an object is a jQuery object and not a native JavaScript object
      // ========================================================================
      var isQuery = function (obj) {
        return obj && obj.hasOwnProperty && obj instanceof $;
      };

      // Handle multiple browsers for "requestAnimationFrame" and "cancelAnimationFrame"
      // ===============================================================================
      var requestAFrame = (function () {
        return (
          window.requestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame ||
          window.oRequestAnimationFrame ||
          // if all else fails, use setTimeout
          function (callback) {
            return window.setTimeout(callback, 1000 / 60);
          }
        );
      })();

      var cancelAFrame = (function () {
        return (
          window.cancelAnimationFrame ||
          window.webkitCancelAnimationFrame ||
          window.mozCancelAnimationFrame ||
          window.oCancelAnimationFrame ||
          function (id) {
            window.clearTimeout(id);
          }
        );
      })();

      // Detect the supported transition-end event property name
      // =======================================================
      var transitionEnd = (function () {
        var el = document.createElement("fakeelement"),
          t;

        var transitions = {
          transition: "transitionend",
          OTransition: "oTransitionEnd",
          MozTransition: "transitionend",
          WebkitTransition: "webkitTransitionEnd"
        };

        for (t in transitions) {
          if (el.style[t] !== undefined$1) {
            return transitions[t];
          }
        }

        return "transitionend";
      })();

      // Force redraw on an element.
      // This helps in cases where the browser doesn't redraw an updated element properly
      // ================================================================================
      var forceRedraw = function ($el) {
        return $el && $el.length && $el[0].offsetHeight;
      };

      // Exclude array (`buttons`) options from deep merging
      // ===================================================
      var mergeOpts = function (opts1, opts2) {
        var rez = $.extend(true, {}, opts1, opts2);

        $.each(opts2, function (key, value) {
          if ($.isArray(value)) {
            rez[key] = value;
          }
        });

        return rez;
      };

      // How much of an element is visible in viewport
      // =============================================

      var inViewport = function (elem) {
        var elemCenter, rez;

        if (!elem || elem.ownerDocument !== document) {
          return false;
        }

        $(".fancybox-container").css("pointer-events", "none");

        elemCenter = {
          x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
          y: elem.getBoundingClientRect().top + elem.offsetHeight / 2
        };

        rez = document.elementFromPoint(elemCenter.x, elemCenter.y) === elem;

        $(".fancybox-container").css("pointer-events", "");

        return rez;
      };

      // Class definition
      // ================

      var FancyBox = function (content, opts, index) {
        var self = this;

        self.opts = mergeOpts({
          index: index
        }, $.fancybox.defaults);

        if ($.isPlainObject(opts)) {
          self.opts = mergeOpts(self.opts, opts);
        }

        if ($.fancybox.isMobile) {
          self.opts = mergeOpts(self.opts, self.opts.mobile);
        }

        self.id = self.opts.id || ++called;

        self.currIndex = parseInt(self.opts.index, 10) || 0;
        self.prevIndex = null;

        self.prevPos = null;
        self.currPos = 0;

        self.firstRun = true;

        // All group items
        self.group = [];

        // Existing slides (for current, next and previous gallery items)
        self.slides = {};

        // Create group elements
        self.addContent(content);

        if (!self.group.length) {
          return;
        }

        self.init();
      };

      $.extend(FancyBox.prototype, {
        // Create DOM structure
        // ====================

        init: function () {
          var self = this,
            firstItem = self.group[self.currIndex],
            firstItemOpts = firstItem.opts,
            $container,
            buttonStr;

          if (firstItemOpts.closeExisting) {
            $.fancybox.close(true);
          }

          // Hide scrollbars
          // ===============

          $("body").addClass("fancybox-active");

          if (
            !$.fancybox.getInstance() &&
            firstItemOpts.hideScrollbar !== false &&
            !$.fancybox.isMobile &&
            document.body.scrollHeight > window.innerHeight
          ) {
            $("head").append(
              '<style id="fancybox-style-noscroll" type="text/css">.compensate-for-scrollbar{margin-right:' +
              (window.innerWidth - document.documentElement.clientWidth) +
              "px;}</style>"
            );

            $("body").addClass("compensate-for-scrollbar");
          }

          // Build html markup and set references
          // ====================================

          // Build html code for buttons and insert into main template
          buttonStr = "";

          $.each(firstItemOpts.buttons, function (index, value) {
            buttonStr += firstItemOpts.btnTpl[value] || "";
          });

          // Create markup from base template, it will be initially hidden to
          // avoid unnecessary work like painting while initializing is not complete
          $container = $(
              self.translate(
                self,
                firstItemOpts.baseTpl
                .replace("{{buttons}}", buttonStr)
                .replace("{{arrows}}", firstItemOpts.btnTpl.arrowLeft + firstItemOpts.btnTpl.arrowRight)
              )
            )
            .attr("id", "fancybox-container-" + self.id)
            .addClass(firstItemOpts.baseClass)
            .data("FancyBox", self)
            .appendTo(firstItemOpts.parentEl);

          // Create object holding references to jQuery wrapped nodes
          self.$refs = {
            container: $container
          };

          ["bg", "inner", "infobar", "toolbar", "stage", "caption", "navigation"].forEach(function (item) {
            self.$refs[item] = $container.find(".fancybox-" + item);
          });

          self.trigger("onInit");

          // Enable events, deactive previous instances
          self.activate();

          // Build slides, load and reveal content
          self.jumpTo(self.currIndex);
        },

        // Simple i18n support - replaces object keys found in template
        // with corresponding values
        // ============================================================

        translate: function (obj, str) {
          var arr = obj.opts.i18n[obj.opts.lang] || obj.opts.i18n.en;

          return str.replace(/\{\{(\w+)\}\}/g, function (match, n) {
            return arr[n] === undefined$1 ? match : arr[n];
          });
        },

        // Populate current group with fresh content
        // Check if each object has valid type and content
        // ===============================================

        addContent: function (content) {
          var self = this,
            items = $.makeArray(content),
            thumbs;

          $.each(items, function (i, item) {
            var obj = {},
              opts = {},
              $item,
              type,
              found,
              src,
              srcParts;

            // Step 1 - Make sure we have an object
            // ====================================

            if ($.isPlainObject(item)) {
              // We probably have manual usage here, something like
              // $.fancybox.open( [ { src : "image.jpg", type : "image" } ] )

              obj = item;
              opts = item.opts || item;
            } else if ($.type(item) === "object" && $(item).length) {
              // Here we probably have jQuery collection returned by some selector
              $item = $(item);

              // Support attributes like `data-options='{"touch" : false}'` and `data-touch='false'`
              opts = $item.data() || {};
              opts = $.extend(true, {}, opts, opts.options);

              // Here we store clicked element
              opts.$orig = $item;

              obj.src = self.opts.src || opts.src || $item.attr("href");

              // Assume that simple syntax is used, for example:
              //   `$.fancybox.open( $("#test"), {} );`
              if (!obj.type && !obj.src) {
                obj.type = "inline";
                obj.src = item;
              }
            } else {
              // Assume we have a simple html code, for example:
              //   $.fancybox.open( '<div><h1>Hi!</h1></div>' );
              obj = {
                type: "html",
                src: item + ""
              };
            }

            // Each gallery object has full collection of options
            obj.opts = $.extend(true, {}, self.opts, opts);

            // Do not merge buttons array
            if ($.isArray(opts.buttons)) {
              obj.opts.buttons = opts.buttons;
            }

            if ($.fancybox.isMobile && obj.opts.mobile) {
              obj.opts = mergeOpts(obj.opts, obj.opts.mobile);
            }

            // Step 2 - Make sure we have content type, if not - try to guess
            // ==============================================================

            type = obj.type || obj.opts.type;
            src = obj.src || "";

            if (!type && src) {
              if ((found = src.match(/\.(mp4|mov|ogv|webm)((\?|#).*)?$/i))) {
                type = "video";

                if (!obj.opts.video.format) {
                  obj.opts.video.format = "video/" + (found[1] === "ogv" ? "ogg" : found[1]);
                }
              } else if (src.match(/(^data:image\/[a-z0-9+\/=]*,)|(\.(jp(e|g|eg)|gif|png|bmp|webp|svg|ico)((\?|#).*)?$)/i)) {
                type = "image";
              } else if (src.match(/\.(pdf)((\?|#).*)?$/i)) {
                type = "iframe";
                obj = $.extend(true, obj, {
                  contentType: "pdf",
                  opts: {
                    iframe: {
                      preload: false
                    }
                  }
                });
              } else if (src.charAt(0) === "#") {
                type = "inline";
              }
            }

            if (type) {
              obj.type = type;
            } else {
              self.trigger("objectNeedsType", obj);
            }

            if (!obj.contentType) {
              obj.contentType = $.inArray(obj.type, ["html", "inline", "ajax"]) > -1 ? "html" : obj.type;
            }

            // Step 3 - Some adjustments
            // =========================

            obj.index = self.group.length;

            if (obj.opts.smallBtn == "auto") {
              obj.opts.smallBtn = $.inArray(obj.type, ["html", "inline", "ajax"]) > -1;
            }

            if (obj.opts.toolbar === "auto") {
              obj.opts.toolbar = !obj.opts.smallBtn;
            }

            // Find thumbnail image, check if exists and if is in the viewport
            obj.$thumb = obj.opts.$thumb || null;

            if (obj.opts.$trigger && obj.index === self.opts.index) {
              obj.$thumb = obj.opts.$trigger.find("img:first");

              if (obj.$thumb.length) {
                obj.opts.$orig = obj.opts.$trigger;
              }
            }

            if (!(obj.$thumb && obj.$thumb.length) && obj.opts.$orig) {
              obj.$thumb = obj.opts.$orig.find("img:first");
            }

            if (obj.$thumb && !obj.$thumb.length) {
              obj.$thumb = null;
            }

            obj.thumb = obj.opts.thumb || (obj.$thumb ? obj.$thumb[0].src : null);

            // "caption" is a "special" option, it can be used to customize caption per gallery item
            if ($.type(obj.opts.caption) === "function") {
              obj.opts.caption = obj.opts.caption.apply(item, [self, obj]);
            }

            if ($.type(self.opts.caption) === "function") {
              obj.opts.caption = self.opts.caption.apply(item, [self, obj]);
            }

            // Make sure we have caption as a string or jQuery object
            if (!(obj.opts.caption instanceof $)) {
              obj.opts.caption = obj.opts.caption === undefined$1 ? "" : obj.opts.caption + "";
            }

            // Check if url contains "filter" used to filter the content
            // Example: "ajax.html #something"
            if (obj.type === "ajax") {
              srcParts = src.split(/\s+/, 2);

              if (srcParts.length > 1) {
                obj.src = srcParts.shift();

                obj.opts.filter = srcParts.shift();
              }
            }

            // Hide all buttons and disable interactivity for modal items
            if (obj.opts.modal) {
              obj.opts = $.extend(true, obj.opts, {
                trapFocus: true,
                // Remove buttons
                infobar: 0,
                toolbar: 0,

                smallBtn: 0,

                // Disable keyboard navigation
                keyboard: 0,

                // Disable some modules
                slideShow: 0,
                fullScreen: 0,
                thumbs: 0,
                touch: 0,

                // Disable click event handlers
                clickContent: false,
                clickSlide: false,
                clickOutside: false,
                dblclickContent: false,
                dblclickSlide: false,
                dblclickOutside: false
              });
            }

            // Step 4 - Add processed object to group
            // ======================================

            self.group.push(obj);
          });

          // Update controls if gallery is already opened
          if (Object.keys(self.slides).length) {
            self.updateControls();

            // Update thumbnails, if needed
            thumbs = self.Thumbs;

            if (thumbs && thumbs.isActive) {
              thumbs.create();

              thumbs.focus();
            }
          }
        },

        // Attach an event handler functions for:
        //   - navigation buttons
        //   - browser scrolling, resizing;
        //   - focusing
        //   - keyboard
        //   - detecting inactivity
        // ======================================

        addEvents: function () {
          var self = this;

          self.removeEvents();

          // Make navigation elements clickable
          // ==================================

          self.$refs.container
            .on("click.fb-close", "[data-fancybox-close]", function (e) {
              e.stopPropagation();
              e.preventDefault();

              self.close(e);
            })
            .on("touchstart.fb-prev click.fb-prev", "[data-fancybox-prev]", function (e) {
              e.stopPropagation();
              e.preventDefault();

              self.previous();
            })
            .on("touchstart.fb-next click.fb-next", "[data-fancybox-next]", function (e) {
              e.stopPropagation();
              e.preventDefault();

              self.next();
            })
            .on("click.fb", "[data-fancybox-zoom]", function (e) {
              // Click handler for zoom button
              self[self.isScaledDown() ? "scaleToActual" : "scaleToFit"]();
            });

          // Handle page scrolling and browser resizing
          // ==========================================

          $W.on("orientationchange.fb resize.fb", function (e) {
            if (e && e.originalEvent && e.originalEvent.type === "resize") {
              if (self.requestId) {
                cancelAFrame(self.requestId);
              }

              self.requestId = requestAFrame(function () {
                self.update(e);
              });
            } else {
              if (self.current && self.current.type === "iframe") {
                self.$refs.stage.hide();
              }

              setTimeout(
                function () {
                  self.$refs.stage.show();

                  self.update(e);
                },
                $.fancybox.isMobile ? 600 : 250
              );
            }
          });

          $D.on("keydown.fb", function (e) {
            var instance = $.fancybox ? $.fancybox.getInstance() : null,
              current = instance.current,
              keycode = e.keyCode || e.which;

            // Trap keyboard focus inside of the modal
            // =======================================

            if (keycode == 9) {
              if (current.opts.trapFocus) {
                self.focus(e);
              }

              return;
            }

            // Enable keyboard navigation
            // ==========================

            if (!current.opts.keyboard || e.ctrlKey || e.altKey || e.shiftKey || $(e.target).is("input,textarea,video,audio,select")) {
              return;
            }

            // Backspace and Esc keys
            if (keycode === 8 || keycode === 27) {
              e.preventDefault();

              self.close(e);

              return;
            }

            // Left arrow and Up arrow
            if (keycode === 37 || keycode === 38) {
              e.preventDefault();

              self.previous();

              return;
            }

            // Righ arrow and Down arrow
            if (keycode === 39 || keycode === 40) {
              e.preventDefault();

              self.next();

              return;
            }

            self.trigger("afterKeydown", e, keycode);
          });

          // Hide controls after some inactivity period
          if (self.group[self.currIndex].opts.idleTime) {
            self.idleSecondsCounter = 0;

            $D.on(
              "mousemove.fb-idle mouseleave.fb-idle mousedown.fb-idle touchstart.fb-idle touchmove.fb-idle scroll.fb-idle keydown.fb-idle",
              function (e) {
                self.idleSecondsCounter = 0;

                if (self.isIdle) {
                  self.showControls();
                }

                self.isIdle = false;
              }
            );

            self.idleInterval = window.setInterval(function () {
              self.idleSecondsCounter++;

              if (self.idleSecondsCounter >= self.group[self.currIndex].opts.idleTime && !self.isDragging) {
                self.isIdle = true;
                self.idleSecondsCounter = 0;

                self.hideControls();
              }
            }, 1000);
          }
        },

        // Remove events added by the core
        // ===============================

        removeEvents: function () {
          var self = this;

          $W.off("orientationchange.fb resize.fb");
          $D.off("keydown.fb .fb-idle");

          this.$refs.container.off(".fb-close .fb-prev .fb-next");

          if (self.idleInterval) {
            window.clearInterval(self.idleInterval);

            self.idleInterval = null;
          }
        },

        // Change to previous gallery item
        // ===============================

        previous: function (duration) {
          return this.jumpTo(this.currPos - 1, duration);
        },

        // Change to next gallery item
        // ===========================

        next: function (duration) {
          return this.jumpTo(this.currPos + 1, duration);
        },

        // Switch to selected gallery item
        // ===============================

        jumpTo: function (pos, duration) {
          var self = this,
            groupLen = self.group.length,
            firstRun,
            isMoved,
            loop,
            current,
            previous,
            slidePos,
            stagePos,
            prop,
            diff;

          if (self.isDragging || self.isClosing || (self.isAnimating && self.firstRun)) {
            return;
          }

          // Should loop?
          pos = parseInt(pos, 10);
          loop = self.current ? self.current.opts.loop : self.opts.loop;

          if (!loop && (pos < 0 || pos >= groupLen)) {
            return false;
          }

          // Check if opening for the first time; this helps to speed things up
          firstRun = self.firstRun = !Object.keys(self.slides).length;

          // Create slides
          previous = self.current;

          self.prevIndex = self.currIndex;
          self.prevPos = self.currPos;

          current = self.createSlide(pos);

          if (groupLen > 1) {
            if (loop || current.index < groupLen - 1) {
              self.createSlide(pos + 1);
            }

            if (loop || current.index > 0) {
              self.createSlide(pos - 1);
            }
          }

          self.current = current;
          self.currIndex = current.index;
          self.currPos = current.pos;

          self.trigger("beforeShow", firstRun);

          self.updateControls();

          // Validate duration length
          current.forcedDuration = undefined$1;

          if ($.isNumeric(duration)) {
            current.forcedDuration = duration;
          } else {
            duration = current.opts[firstRun ? "animationDuration" : "transitionDuration"];
          }

          duration = parseInt(duration, 10);

          // Check if user has swiped the slides or if still animating
          isMoved = self.isMoved(current);

          // Make sure current slide is visible
          current.$slide.addClass("fancybox-slide--current");

          // Fresh start - reveal container, current slide and start loading content
          if (firstRun) {
            if (current.opts.animationEffect && duration) {
              self.$refs.container.css("transition-duration", duration + "ms");
            }

            self.$refs.container.addClass("fancybox-is-open").trigger("focus");

            // Attempt to load content into slide
            // This will later call `afterLoad` -> `revealContent`
            self.loadSlide(current);

            self.preload("image");

            return;
          }

          // Get actual slide/stage positions (before cleaning up)
          slidePos = $.fancybox.getTranslate(previous.$slide);
          stagePos = $.fancybox.getTranslate(self.$refs.stage);

          // Clean up all slides
          $.each(self.slides, function (index, slide) {
            $.fancybox.stop(slide.$slide, true);
          });

          if (previous.pos !== current.pos) {
            previous.isComplete = false;
          }

          previous.$slide.removeClass("fancybox-slide--complete fancybox-slide--current");

          // If slides are out of place, then animate them to correct position
          if (isMoved) {
            // Calculate horizontal swipe distance
            diff = slidePos.left - (previous.pos * slidePos.width + previous.pos * previous.opts.gutter);

            $.each(self.slides, function (index, slide) {
              slide.$slide.removeClass("fancybox-animated").removeClass(function (index, className) {
                return (className.match(/(^|\s)fancybox-fx-\S+/g) || []).join(" ");
              });

              // Make sure that each slide is in equal distance
              // This is mostly needed for freshly added slides, because they are not yet positioned
              var leftPos = slide.pos * slidePos.width + slide.pos * slide.opts.gutter;

              $.fancybox.setTranslate(slide.$slide, {
                top: 0,
                left: leftPos - stagePos.left + diff
              });

              if (slide.pos !== current.pos) {
                slide.$slide.addClass("fancybox-slide--" + (slide.pos > current.pos ? "next" : "previous"));
              }

              // Redraw to make sure that transition will start
              forceRedraw(slide.$slide);

              // Animate the slide
              $.fancybox.animate(
                slide.$slide, {
                  top: 0,
                  left: (slide.pos - current.pos) * slidePos.width + (slide.pos - current.pos) * slide.opts.gutter
                },
                duration,
                function () {
                  slide.$slide
                    .css({
                      transform: "",
                      opacity: ""
                    })
                    .removeClass("fancybox-slide--next fancybox-slide--previous");

                  if (slide.pos === self.currPos) {
                    self.complete();
                  }
                }
              );
            });
          } else if (duration && current.opts.transitionEffect) {
            // Set transition effect for previously active slide
            prop = "fancybox-animated fancybox-fx-" + current.opts.transitionEffect;

            previous.$slide.addClass("fancybox-slide--" + (previous.pos > current.pos ? "next" : "previous"));

            $.fancybox.animate(
              previous.$slide,
              prop,
              duration,
              function () {
                previous.$slide.removeClass(prop).removeClass("fancybox-slide--next fancybox-slide--previous");
              },
              false
            );
          }

          if (current.isLoaded) {
            self.revealContent(current);
          } else {
            self.loadSlide(current);
          }

          self.preload("image");
        },

        // Create new "slide" element
        // These are gallery items  that are actually added to DOM
        // =======================================================

        createSlide: function (pos) {
          var self = this,
            $slide,
            index;

          index = pos % self.group.length;
          index = index < 0 ? self.group.length + index : index;

          if (!self.slides[pos] && self.group[index]) {
            $slide = $('<div class="fancybox-slide"></div>').appendTo(self.$refs.stage);

            self.slides[pos] = $.extend(true, {}, self.group[index], {
              pos: pos,
              $slide: $slide,
              isLoaded: false
            });

            self.updateSlide(self.slides[pos]);
          }

          return self.slides[pos];
        },

        // Scale image to the actual size of the image;
        // x and y values should be relative to the slide
        // ==============================================

        scaleToActual: function (x, y, duration) {
          var self = this,
            current = self.current,
            $content = current.$content,
            canvasWidth = $.fancybox.getTranslate(current.$slide).width,
            canvasHeight = $.fancybox.getTranslate(current.$slide).height,
            newImgWidth = current.width,
            newImgHeight = current.height,
            imgPos,
            posX,
            posY,
            scaleX,
            scaleY;

          if (self.isAnimating || self.isMoved() || !$content || !(current.type == "image" && current.isLoaded && !current.hasError)) {
            return;
          }

          self.isAnimating = true;

          $.fancybox.stop($content);

          x = x === undefined$1 ? canvasWidth * 0.5 : x;
          y = y === undefined$1 ? canvasHeight * 0.5 : y;

          imgPos = $.fancybox.getTranslate($content);

          imgPos.top -= $.fancybox.getTranslate(current.$slide).top;
          imgPos.left -= $.fancybox.getTranslate(current.$slide).left;

          scaleX = newImgWidth / imgPos.width;
          scaleY = newImgHeight / imgPos.height;

          // Get center position for original image
          posX = canvasWidth * 0.5 - newImgWidth * 0.5;
          posY = canvasHeight * 0.5 - newImgHeight * 0.5;

          // Make sure image does not move away from edges
          if (newImgWidth > canvasWidth) {
            posX = imgPos.left * scaleX - (x * scaleX - x);

            if (posX > 0) {
              posX = 0;
            }

            if (posX < canvasWidth - newImgWidth) {
              posX = canvasWidth - newImgWidth;
            }
          }

          if (newImgHeight > canvasHeight) {
            posY = imgPos.top * scaleY - (y * scaleY - y);

            if (posY > 0) {
              posY = 0;
            }

            if (posY < canvasHeight - newImgHeight) {
              posY = canvasHeight - newImgHeight;
            }
          }

          self.updateCursor(newImgWidth, newImgHeight);

          $.fancybox.animate(
            $content, {
              top: posY,
              left: posX,
              scaleX: scaleX,
              scaleY: scaleY
            },
            duration || 366,
            function () {
              self.isAnimating = false;
            }
          );

          // Stop slideshow
          if (self.SlideShow && self.SlideShow.isActive) {
            self.SlideShow.stop();
          }
        },

        // Scale image to fit inside parent element
        // ========================================

        scaleToFit: function (duration) {
          var self = this,
            current = self.current,
            $content = current.$content,
            end;

          if (self.isAnimating || self.isMoved() || !$content || !(current.type == "image" && current.isLoaded && !current.hasError)) {
            return;
          }

          self.isAnimating = true;

          $.fancybox.stop($content);

          end = self.getFitPos(current);

          self.updateCursor(end.width, end.height);

          $.fancybox.animate(
            $content, {
              top: end.top,
              left: end.left,
              scaleX: end.width / $content.width(),
              scaleY: end.height / $content.height()
            },
            duration || 366,
            function () {
              self.isAnimating = false;
            }
          );
        },

        // Calculate image size to fit inside viewport
        // ===========================================

        getFitPos: function (slide) {
          var self = this,
            $content = slide.$content,
            $slide = slide.$slide,
            width = slide.width || slide.opts.width,
            height = slide.height || slide.opts.height,
            maxWidth,
            maxHeight,
            minRatio,
            aspectRatio,
            rez = {};

          if (!slide.isLoaded || !$content || !$content.length) {
            return false;
          }

          maxWidth = $.fancybox.getTranslate(self.$refs.stage).width;
          maxHeight = $.fancybox.getTranslate(self.$refs.stage).height;

          maxWidth -=
            parseFloat($slide.css("paddingLeft")) +
            parseFloat($slide.css("paddingRight")) +
            parseFloat($content.css("marginLeft")) +
            parseFloat($content.css("marginRight"));

          maxHeight -=
            parseFloat($slide.css("paddingTop")) +
            parseFloat($slide.css("paddingBottom")) +
            parseFloat($content.css("marginTop")) +
            parseFloat($content.css("marginBottom"));

          if (!width || !height) {
            width = maxWidth;
            height = maxHeight;
          }

          minRatio = Math.min(1, maxWidth / width, maxHeight / height);

          width = minRatio * width;
          height = minRatio * height;

          // Adjust width/height to precisely fit into container
          if (width > maxWidth - 0.5) {
            width = maxWidth;
          }

          if (height > maxHeight - 0.5) {
            height = maxHeight;
          }

          if (slide.type === "image") {
            rez.top = Math.floor((maxHeight - height) * 0.5) + parseFloat($slide.css("paddingTop"));
            rez.left = Math.floor((maxWidth - width) * 0.5) + parseFloat($slide.css("paddingLeft"));
          } else if (slide.contentType === "video") {
            // Force aspect ratio for the video
            // "I say the whole world must learn of our peaceful ways… by force!"
            aspectRatio = slide.opts.width && slide.opts.height ? width / height : slide.opts.ratio || 16 / 9;

            if (height > width / aspectRatio) {
              height = width / aspectRatio;
            } else if (width > height * aspectRatio) {
              width = height * aspectRatio;
            }
          }

          rez.width = width;
          rez.height = height;

          return rez;
        },

        // Update content size and position for all slides
        // ==============================================

        update: function (e) {
          var self = this;

          $.each(self.slides, function (key, slide) {
            self.updateSlide(slide, e);
          });
        },

        // Update slide content position and size
        // ======================================

        updateSlide: function (slide, e) {
          var self = this,
            $content = slide && slide.$content,
            width = slide.width || slide.opts.width,
            height = slide.height || slide.opts.height,
            $slide = slide.$slide;

          // First, prevent caption overlap, if needed
          self.adjustCaption(slide);

          // Then resize content to fit inside the slide
          if ($content && (width || height || slide.contentType === "video") && !slide.hasError) {
            $.fancybox.stop($content);

            $.fancybox.setTranslate($content, self.getFitPos(slide));

            if (slide.pos === self.currPos) {
              self.isAnimating = false;

              self.updateCursor();
            }
          }

          // Then some adjustments
          self.adjustLayout(slide);

          if ($slide.length) {
            $slide.trigger("refresh");

            if (slide.pos === self.currPos) {
              self.$refs.toolbar
                .add(self.$refs.navigation.find(".fancybox-button--arrow_right"))
                .toggleClass("compensate-for-scrollbar", $slide.get(0).scrollHeight > $slide.get(0).clientHeight);
            }
          }

          self.trigger("onUpdate", slide, e);
        },

        // Horizontally center slide
        // =========================

        centerSlide: function (duration) {
          var self = this,
            current = self.current,
            $slide = current.$slide;

          if (self.isClosing || !current) {
            return;
          }

          $slide.siblings().css({
            transform: "",
            opacity: ""
          });

          $slide
            .parent()
            .children()
            .removeClass("fancybox-slide--previous fancybox-slide--next");

          $.fancybox.animate(
            $slide, {
              top: 0,
              left: 0,
              opacity: 1
            },
            duration === undefined$1 ? 0 : duration,
            function () {
              // Clean up
              $slide.css({
                transform: "",
                opacity: ""
              });

              if (!current.isComplete) {
                self.complete();
              }
            },
            false
          );
        },

        // Check if current slide is moved (swiped)
        // ========================================

        isMoved: function (slide) {
          var current = slide || this.current,
            slidePos,
            stagePos;

          if (!current) {
            return false;
          }

          stagePos = $.fancybox.getTranslate(this.$refs.stage);
          slidePos = $.fancybox.getTranslate(current.$slide);

          return (
            !current.$slide.hasClass("fancybox-animated") &&
            (Math.abs(slidePos.top - stagePos.top) > 0.5 || Math.abs(slidePos.left - stagePos.left) > 0.5)
          );
        },

        // Update cursor style depending if content can be zoomed
        // ======================================================

        updateCursor: function (nextWidth, nextHeight) {
          var self = this,
            current = self.current,
            $container = self.$refs.container,
            canPan,
            isZoomable;

          if (!current || self.isClosing || !self.Guestures) {
            return;
          }

          $container.removeClass("fancybox-is-zoomable fancybox-can-zoomIn fancybox-can-zoomOut fancybox-can-swipe fancybox-can-pan");

          canPan = self.canPan(nextWidth, nextHeight);

          isZoomable = canPan ? true : self.isZoomable();

          $container.toggleClass("fancybox-is-zoomable", isZoomable);

          $("[data-fancybox-zoom]").prop("disabled", !isZoomable);

          if (canPan) {
            $container.addClass("fancybox-can-pan");
          } else if (
            isZoomable &&
            (current.opts.clickContent === "zoom" || ($.isFunction(current.opts.clickContent) && current.opts.clickContent(current) == "zoom"))
          ) {
            $container.addClass("fancybox-can-zoomIn");
          } else if (current.opts.touch && (current.opts.touch.vertical || self.group.length > 1) && current.contentType !== "video") {
            $container.addClass("fancybox-can-swipe");
          }
        },

        // Check if current slide is zoomable
        // ==================================

        isZoomable: function () {
          var self = this,
            current = self.current,
            fitPos;

          // Assume that slide is zoomable if:
          //   - image is still loading
          //   - actual size of the image is smaller than available area
          if (current && !self.isClosing && current.type === "image" && !current.hasError) {
            if (!current.isLoaded) {
              return true;
            }

            fitPos = self.getFitPos(current);

            if (fitPos && (current.width > fitPos.width || current.height > fitPos.height)) {
              return true;
            }
          }

          return false;
        },

        // Check if current image dimensions are smaller than actual
        // =========================================================

        isScaledDown: function (nextWidth, nextHeight) {
          var self = this,
            rez = false,
            current = self.current,
            $content = current.$content;

          if (nextWidth !== undefined$1 && nextHeight !== undefined$1) {
            rez = nextWidth < current.width && nextHeight < current.height;
          } else if ($content) {
            rez = $.fancybox.getTranslate($content);
            rez = rez.width < current.width && rez.height < current.height;
          }

          return rez;
        },

        // Check if image dimensions exceed parent element
        // ===============================================

        canPan: function (nextWidth, nextHeight) {
          var self = this,
            current = self.current,
            pos = null,
            rez = false;

          if (current.type === "image" && (current.isComplete || (nextWidth && nextHeight)) && !current.hasError) {
            rez = self.getFitPos(current);

            if (nextWidth !== undefined$1 && nextHeight !== undefined$1) {
              pos = {
                width: nextWidth,
                height: nextHeight
              };
            } else if (current.isComplete) {
              pos = $.fancybox.getTranslate(current.$content);
            }

            if (pos && rez) {
              rez = Math.abs(pos.width - rez.width) > 1.5 || Math.abs(pos.height - rez.height) > 1.5;
            }
          }

          return rez;
        },

        // Load content into the slide
        // ===========================

        loadSlide: function (slide) {
          var self = this,
            type,
            $slide,
            ajaxLoad;

          if (slide.isLoading || slide.isLoaded) {
            return;
          }

          slide.isLoading = true;

          if (self.trigger("beforeLoad", slide) === false) {
            slide.isLoading = false;

            return false;
          }

          type = slide.type;
          $slide = slide.$slide;

          $slide
            .off("refresh")
            .trigger("onReset")
            .addClass(slide.opts.slideClass);

          // Create content depending on the type
          switch (type) {
            case "image":
              self.setImage(slide);

              break;

            case "iframe":
              self.setIframe(slide);

              break;

            case "html":
              self.setContent(slide, slide.src || slide.content);

              break;

            case "video":
              self.setContent(
                slide,
                slide.opts.video.tpl
                .replace(/\{\{src\}\}/gi, slide.src)
                .replace("{{format}}", slide.opts.videoFormat || slide.opts.video.format || "")
                .replace("{{poster}}", slide.thumb || "")
              );

              break;

            case "inline":
              if ($(slide.src).length) {
                self.setContent(slide, $(slide.src));
              } else {
                self.setError(slide);
              }

              break;

            case "ajax":
              self.showLoading(slide);

              ajaxLoad = $.ajax(
                $.extend({}, slide.opts.ajax.settings, {
                  url: slide.src,
                  success: function (data, textStatus) {
                    if (textStatus === "success") {
                      self.setContent(slide, data);
                    }
                  },
                  error: function (jqXHR, textStatus) {
                    if (jqXHR && textStatus !== "abort") {
                      self.setError(slide);
                    }
                  }
                })
              );

              $slide.one("onReset", function () {
                ajaxLoad.abort();
              });

              break;

            default:
              self.setError(slide);

              break;
          }

          return true;
        },

        // Use thumbnail image, if possible
        // ================================

        setImage: function (slide) {
          var self = this,
            ghost;

          // Check if need to show loading icon
          setTimeout(function () {
            var $img = slide.$image;

            if (!self.isClosing && slide.isLoading && (!$img || !$img.length || !$img[0].complete) && !slide.hasError) {
              self.showLoading(slide);
            }
          }, 50);

          //Check if image has srcset
          self.checkSrcset(slide);

          // This will be wrapper containing both ghost and actual image
          slide.$content = $('<div class="fancybox-content"></div>')
            .addClass("fancybox-is-hidden")
            .appendTo(slide.$slide.addClass("fancybox-slide--image"));

          // If we have a thumbnail, we can display it while actual image is loading
          // Users will not stare at black screen and actual image will appear gradually
          if (slide.opts.preload !== false && slide.opts.width && slide.opts.height && slide.thumb) {
            slide.width = slide.opts.width;
            slide.height = slide.opts.height;

            ghost = document.createElement("img");

            ghost.onerror = function () {
              $(this).remove();

              slide.$ghost = null;
            };

            ghost.onload = function () {
              self.afterLoad(slide);
            };

            slide.$ghost = $(ghost)
              .addClass("fancybox-image")
              .appendTo(slide.$content)
              .attr("src", slide.thumb);
          }

          // Start loading actual image
          self.setBigImage(slide);
        },

        // Check if image has srcset and get the source
        // ============================================
        checkSrcset: function (slide) {
          var srcset = slide.opts.srcset || slide.opts.image.srcset,
            found,
            temp,
            pxRatio,
            windowWidth;

          // If we have "srcset", then we need to find first matching "src" value.
          // This is necessary, because when you set an src attribute, the browser will preload the image
          // before any javascript or even CSS is applied.
          if (srcset) {
            pxRatio = window.devicePixelRatio || 1;
            windowWidth = window.innerWidth * pxRatio;

            temp = srcset.split(",").map(function (el) {
              var ret = {};

              el.trim()
                .split(/\s+/)
                .forEach(function (el, i) {
                  var value = parseInt(el.substring(0, el.length - 1), 10);

                  if (i === 0) {
                    return (ret.url = el);
                  }

                  if (value) {
                    ret.value = value;
                    ret.postfix = el[el.length - 1];
                  }
                });

              return ret;
            });

            // Sort by value
            temp.sort(function (a, b) {
              return a.value - b.value;
            });

            // Ok, now we have an array of all srcset values
            for (var j = 0; j < temp.length; j++) {
              var el = temp[j];

              if ((el.postfix === "w" && el.value >= windowWidth) || (el.postfix === "x" && el.value >= pxRatio)) {
                found = el;
                break;
              }
            }

            // If not found, take the last one
            if (!found && temp.length) {
              found = temp[temp.length - 1];
            }

            if (found) {
              slide.src = found.url;

              // If we have default width/height values, we can calculate height for matching source
              if (slide.width && slide.height && found.postfix == "w") {
                slide.height = (slide.width / slide.height) * found.value;
                slide.width = found.value;
              }

              slide.opts.srcset = srcset;
            }
          }
        },

        // Create full-size image
        // ======================

        setBigImage: function (slide) {
          var self = this,
            img = document.createElement("img"),
            $img = $(img);

          slide.$image = $img
            .one("error", function () {
              self.setError(slide);
            })
            .one("load", function () {
              var sizes;

              if (!slide.$ghost) {
                self.resolveImageSlideSize(slide, this.naturalWidth, this.naturalHeight);

                self.afterLoad(slide);
              }

              if (self.isClosing) {
                return;
              }

              if (slide.opts.srcset) {
                sizes = slide.opts.sizes;

                if (!sizes || sizes === "auto") {
                  sizes =
                    (slide.width / slide.height > 1 && $W.width() / $W.height() > 1 ? "100" : Math.round((slide.width / slide.height) * 100)) +
                    "vw";
                }

                $img.attr("sizes", sizes).attr("srcset", slide.opts.srcset);
              }

              // Hide temporary image after some delay
              if (slide.$ghost) {
                setTimeout(function () {
                  if (slide.$ghost && !self.isClosing) {
                    slide.$ghost.hide();
                  }
                }, Math.min(300, Math.max(1000, slide.height / 1600)));
              }

              self.hideLoading(slide);
            })
            .addClass("fancybox-image")
            .attr("src", slide.src)
            .appendTo(slide.$content);

          if ((img.complete || img.readyState == "complete") && $img.naturalWidth && $img.naturalHeight) {
            $img.trigger("load");
          } else if (img.error) {
            $img.trigger("error");
          }
        },

        // Computes the slide size from image size and maxWidth/maxHeight
        // ==============================================================

        resolveImageSlideSize: function (slide, imgWidth, imgHeight) {
          var maxWidth = parseInt(slide.opts.width, 10),
            maxHeight = parseInt(slide.opts.height, 10);

          // Sets the default values from the image
          slide.width = imgWidth;
          slide.height = imgHeight;

          if (maxWidth > 0) {
            slide.width = maxWidth;
            slide.height = Math.floor((maxWidth * imgHeight) / imgWidth);
          }

          if (maxHeight > 0) {
            slide.width = Math.floor((maxHeight * imgWidth) / imgHeight);
            slide.height = maxHeight;
          }
        },

        // Create iframe wrapper, iframe and bindings
        // ==========================================

        setIframe: function (slide) {
          var self = this,
            opts = slide.opts.iframe,
            $slide = slide.$slide,
            $iframe;

          slide.$content = $('<div class="fancybox-content' + (opts.preload ? " fancybox-is-hidden" : "") + '"></div>')
            .css(opts.css)
            .appendTo($slide);

          $slide.addClass("fancybox-slide--" + slide.contentType);

          slide.$iframe = $iframe = $(opts.tpl.replace(/\{rnd\}/g, new Date().getTime()))
            .attr(opts.attr)
            .appendTo(slide.$content);

          if (opts.preload) {
            self.showLoading(slide);

            // Unfortunately, it is not always possible to determine if iframe is successfully loaded
            // (due to browser security policy)

            $iframe.on("load.fb error.fb", function (e) {
              this.isReady = 1;

              slide.$slide.trigger("refresh");

              self.afterLoad(slide);
            });

            // Recalculate iframe content size
            // ===============================

            $slide.on("refresh.fb", function () {
              var $content = slide.$content,
                frameWidth = opts.css.width,
                frameHeight = opts.css.height,
                $contents,
                $body;

              if ($iframe[0].isReady !== 1) {
                return;
              }

              try {
                $contents = $iframe.contents();
                $body = $contents.find("body");
              } catch (ignore) {}

              // Calculate content dimensions, if it is accessible
              if ($body && $body.length && $body.children().length) {
                // Avoid scrolling to top (if multiple instances)
                $slide.css("overflow", "visible");

                $content.css({
                  width: "100%",
                  "max-width": "100%",
                  height: "9999px"
                });

                if (frameWidth === undefined$1) {
                  frameWidth = Math.ceil(Math.max($body[0].clientWidth, $body.outerWidth(true)));
                }

                $content.css("width", frameWidth ? frameWidth : "").css("max-width", "");

                if (frameHeight === undefined$1) {
                  frameHeight = Math.ceil(Math.max($body[0].clientHeight, $body.outerHeight(true)));
                }

                $content.css("height", frameHeight ? frameHeight : "");

                $slide.css("overflow", "auto");
              }

              $content.removeClass("fancybox-is-hidden");
            });
          } else {
            self.afterLoad(slide);
          }

          $iframe.attr("src", slide.src);

          // Remove iframe if closing or changing gallery item
          $slide.one("onReset", function () {
            // This helps IE not to throw errors when closing
            try {
              $(this)
                .find("iframe")
                .hide()
                .unbind()
                .attr("src", "//about:blank");
            } catch (ignore) {}

            $(this)
              .off("refresh.fb")
              .empty();

            slide.isLoaded = false;
            slide.isRevealed = false;
          });
        },

        // Wrap and append content to the slide
        // ======================================

        setContent: function (slide, content) {
          var self = this;

          if (self.isClosing) {
            return;
          }

          self.hideLoading(slide);

          if (slide.$content) {
            $.fancybox.stop(slide.$content);
          }

          slide.$slide.empty();

          // If content is a jQuery object, then it will be moved to the slide.
          // The placeholder is created so we will know where to put it back.
          if (isQuery(content) && content.parent().length) {
            // Make sure content is not already moved to fancyBox
            if (content.hasClass("fancybox-content") || content.parent().hasClass("fancybox-content")) {
              content.parents(".fancybox-slide").trigger("onReset");
            }

            // Create temporary element marking original place of the content
            slide.$placeholder = $("<div>")
              .hide()
              .insertAfter(content);

            // Make sure content is visible
            content.css("display", "inline-block");
          } else if (!slide.hasError) {
            // If content is just a plain text, try to convert it to html
            if ($.type(content) === "string") {
              content = $("<div>")
                .append($.trim(content))
                .contents();
            }

            // If "filter" option is provided, then filter content
            if (slide.opts.filter) {
              content = $("<div>")
                .html(content)
                .find(slide.opts.filter);
            }
          }

          slide.$slide.one("onReset", function () {
            // Pause all html5 video/audio
            $(this)
              .find("video,audio")
              .trigger("pause");

            // Put content back
            if (slide.$placeholder) {
              slide.$placeholder.after(content.removeClass("fancybox-content").hide()).remove();

              slide.$placeholder = null;
            }

            // Remove custom close button
            if (slide.$smallBtn) {
              slide.$smallBtn.remove();

              slide.$smallBtn = null;
            }

            // Remove content and mark slide as not loaded
            if (!slide.hasError) {
              $(this).empty();

              slide.isLoaded = false;
              slide.isRevealed = false;
            }
          });

          $(content).appendTo(slide.$slide);

          if ($(content).is("video,audio")) {
            $(content).addClass("fancybox-video");

            $(content).wrap("<div></div>");

            slide.contentType = "video";

            slide.opts.width = slide.opts.width || $(content).attr("width");
            slide.opts.height = slide.opts.height || $(content).attr("height");
          }

          slide.$content = slide.$slide
            .children()
            .filter("div,form,main,video,audio,article,.fancybox-content")
            .first();

          slide.$content.siblings().hide();

          // Re-check if there is a valid content
          // (in some cases, ajax response can contain various elements or plain text)
          if (!slide.$content.length) {
            slide.$content = slide.$slide
              .wrapInner("<div></div>")
              .children()
              .first();
          }

          slide.$content.addClass("fancybox-content");

          slide.$slide.addClass("fancybox-slide--" + slide.contentType);

          self.afterLoad(slide);
        },

        // Display error message
        // =====================

        setError: function (slide) {
          slide.hasError = true;

          slide.$slide
            .trigger("onReset")
            .removeClass("fancybox-slide--" + slide.contentType)
            .addClass("fancybox-slide--error");

          slide.contentType = "html";

          this.setContent(slide, this.translate(slide, slide.opts.errorTpl));

          if (slide.pos === this.currPos) {
            this.isAnimating = false;
          }
        },

        // Show loading icon inside the slide
        // ==================================

        showLoading: function (slide) {
          var self = this;

          slide = slide || self.current;

          if (slide && !slide.$spinner) {
            slide.$spinner = $(self.translate(self, self.opts.spinnerTpl))
              .appendTo(slide.$slide)
              .hide()
              .fadeIn("fast");
          }
        },

        // Remove loading icon from the slide
        // ==================================

        hideLoading: function (slide) {
          var self = this;

          slide = slide || self.current;

          if (slide && slide.$spinner) {
            slide.$spinner.stop().remove();

            delete slide.$spinner;
          }
        },

        // Adjustments after slide content has been loaded
        // ===============================================

        afterLoad: function (slide) {
          var self = this;

          if (self.isClosing) {
            return;
          }

          slide.isLoading = false;
          slide.isLoaded = true;

          self.trigger("afterLoad", slide);

          self.hideLoading(slide);

          // Add small close button
          if (slide.opts.smallBtn && (!slide.$smallBtn || !slide.$smallBtn.length)) {
            slide.$smallBtn = $(self.translate(slide, slide.opts.btnTpl.smallBtn)).appendTo(slide.$content);
          }

          // Disable right click
          if (slide.opts.protect && slide.$content && !slide.hasError) {
            slide.$content.on("contextmenu.fb", function (e) {
              if (e.button == 2) {
                e.preventDefault();
              }

              return true;
            });

            // Add fake element on top of the image
            // This makes a bit harder for user to select image
            if (slide.type === "image") {
              $('<div class="fancybox-spaceball"></div>').appendTo(slide.$content);
            }
          }

          self.adjustCaption(slide);

          self.adjustLayout(slide);

          if (slide.pos === self.currPos) {
            self.updateCursor();
          }

          self.revealContent(slide);
        },

        // Prevent caption overlap,
        // fix css inconsistency across browsers
        // =====================================

        adjustCaption: function (slide) {
          var self = this,
            current = slide || self.current,
            caption = current.opts.caption,
            preventOverlap = current.opts.preventCaptionOverlap,
            $caption = self.$refs.caption,
            $clone,
            captionH = false;

          $caption.toggleClass("fancybox-caption--separate", preventOverlap);

          if (preventOverlap && caption && caption.length) {
            if (current.pos !== self.currPos) {
              $clone = $caption.clone().appendTo($caption.parent());

              $clone
                .children()
                .eq(0)
                .empty()
                .html(caption);

              captionH = $clone.outerHeight(true);

              $clone.empty().remove();
            } else if (self.$caption) {
              captionH = self.$caption.outerHeight(true);
            }

            current.$slide.css("padding-bottom", captionH || "");
          }
        },

        // Simple hack to fix inconsistency across browsers, described here (affects Edge, too):
        // https://bugzilla.mozilla.org/show_bug.cgi?id=748518
        // ====================================================================================

        adjustLayout: function (slide) {
          var self = this,
            current = slide || self.current,
            scrollHeight,
            marginBottom,
            inlinePadding,
            actualPadding;

          if (current.isLoaded && current.opts.disableLayoutFix !== true) {
            current.$content.css("margin-bottom", "");

            // If we would always set margin-bottom for the content,
            // then it would potentially break vertical align
            if (current.$content.outerHeight() > current.$slide.height() + 0.5) {
              inlinePadding = current.$slide[0].style["padding-bottom"];
              actualPadding = current.$slide.css("padding-bottom");

              if (parseFloat(actualPadding) > 0) {
                scrollHeight = current.$slide[0].scrollHeight;

                current.$slide.css("padding-bottom", 0);

                if (Math.abs(scrollHeight - current.$slide[0].scrollHeight) < 1) {
                  marginBottom = actualPadding;
                }

                current.$slide.css("padding-bottom", inlinePadding);
              }
            }

            current.$content.css("margin-bottom", marginBottom);
          }
        },

        // Make content visible
        // This method is called right after content has been loaded or
        // user navigates gallery and transition should start
        // ============================================================

        revealContent: function (slide) {
          var self = this,
            $slide = slide.$slide,
            end = false,
            start = false,
            isMoved = self.isMoved(slide),
            isRevealed = slide.isRevealed,
            effect,
            effectClassName,
            duration,
            opacity;

          slide.isRevealed = true;

          effect = slide.opts[self.firstRun ? "animationEffect" : "transitionEffect"];
          duration = slide.opts[self.firstRun ? "animationDuration" : "transitionDuration"];

          duration = parseInt(slide.forcedDuration === undefined$1 ? duration : slide.forcedDuration, 10);

          if (isMoved || slide.pos !== self.currPos || !duration) {
            effect = false;
          }

          // Check if can zoom
          if (effect === "zoom") {
            if (slide.pos === self.currPos && duration && slide.type === "image" && !slide.hasError && (start = self.getThumbPos(slide))) {
              end = self.getFitPos(slide);
            } else {
              effect = "fade";
            }
          }

          // Zoom animation
          // ==============
          if (effect === "zoom") {
            self.isAnimating = true;

            end.scaleX = end.width / start.width;
            end.scaleY = end.height / start.height;

            // Check if we need to animate opacity
            opacity = slide.opts.zoomOpacity;

            if (opacity == "auto") {
              opacity = Math.abs(slide.width / slide.height - start.width / start.height) > 0.1;
            }

            if (opacity) {
              start.opacity = 0.1;
              end.opacity = 1;
            }

            // Draw image at start position
            $.fancybox.setTranslate(slide.$content.removeClass("fancybox-is-hidden"), start);

            forceRedraw(slide.$content);

            // Start animation
            $.fancybox.animate(slide.$content, end, duration, function () {
              self.isAnimating = false;

              self.complete();
            });

            return;
          }

          self.updateSlide(slide);

          // Simply show content if no effect
          // ================================
          if (!effect) {
            slide.$content.removeClass("fancybox-is-hidden");

            if (!isRevealed && isMoved && slide.type === "image" && !slide.hasError) {
              slide.$content.hide().fadeIn("fast");
            }

            if (slide.pos === self.currPos) {
              self.complete();
            }

            return;
          }

          // Prepare for CSS transiton
          // =========================
          $.fancybox.stop($slide);

          //effectClassName = "fancybox-animated fancybox-slide--" + (slide.pos >= self.prevPos ? "next" : "previous") + " fancybox-fx-" + effect;
          effectClassName = "fancybox-slide--" + (slide.pos >= self.prevPos ? "next" : "previous") + " fancybox-animated fancybox-fx-" + effect;

          $slide.addClass(effectClassName).removeClass("fancybox-slide--current"); //.addClass(effectClassName);

          slide.$content.removeClass("fancybox-is-hidden");

          // Force reflow
          forceRedraw($slide);

          if (slide.type !== "image") {
            slide.$content.hide().show(0);
          }

          $.fancybox.animate(
            $slide,
            "fancybox-slide--current",
            duration,
            function () {
              $slide.removeClass(effectClassName).css({
                transform: "",
                opacity: ""
              });

              if (slide.pos === self.currPos) {
                self.complete();
              }
            },
            true
          );
        },

        // Check if we can and have to zoom from thumbnail
        //================================================

        getThumbPos: function (slide) {
          var rez = false,
            $thumb = slide.$thumb,
            thumbPos,
            btw,
            brw,
            bbw,
            blw;

          if (!$thumb || !inViewport($thumb[0])) {
            return false;
          }

          thumbPos = $.fancybox.getTranslate($thumb);

          btw = parseFloat($thumb.css("border-top-width") || 0);
          brw = parseFloat($thumb.css("border-right-width") || 0);
          bbw = parseFloat($thumb.css("border-bottom-width") || 0);
          blw = parseFloat($thumb.css("border-left-width") || 0);

          rez = {
            top: thumbPos.top + btw,
            left: thumbPos.left + blw,
            width: thumbPos.width - brw - blw,
            height: thumbPos.height - btw - bbw,
            scaleX: 1,
            scaleY: 1
          };

          return thumbPos.width > 0 && thumbPos.height > 0 ? rez : false;
        },

        // Final adjustments after current gallery item is moved to position
        // and it`s content is loaded
        // ==================================================================

        complete: function () {
          var self = this,
            current = self.current,
            slides = {},
            $el;

          if (self.isMoved() || !current.isLoaded) {
            return;
          }

          if (!current.isComplete) {
            current.isComplete = true;

            current.$slide.siblings().trigger("onReset");

            self.preload("inline");

            // Trigger any CSS transiton inside the slide
            forceRedraw(current.$slide);

            current.$slide.addClass("fancybox-slide--complete");

            // Remove unnecessary slides
            $.each(self.slides, function (key, slide) {
              if (slide.pos >= self.currPos - 1 && slide.pos <= self.currPos + 1) {
                slides[slide.pos] = slide;
              } else if (slide) {
                $.fancybox.stop(slide.$slide);

                slide.$slide.off().remove();
              }
            });

            self.slides = slides;
          }

          self.isAnimating = false;

          self.updateCursor();

          self.trigger("afterShow");

          // Autoplay first html5 video/audio
          if (!!current.opts.video.autoStart) {
            current.$slide
              .find("video,audio")
              .filter(":visible:first")
              .trigger("play")
              .one("ended", function () {
                if (Document.exitFullscreen) {
                  Document.exitFullscreen();
                } else if (this.webkitExitFullscreen) {
                  this.webkitExitFullscreen();
                }

                self.next();
              });
          }

          // Try to focus on the first focusable element
          if (current.opts.autoFocus && current.contentType === "html") {
            // Look for the first input with autofocus attribute
            $el = current.$content.find("input[autofocus]:enabled:visible:first");

            if ($el.length) {
              $el.trigger("focus");
            } else {
              self.focus(null, true);
            }
          }

          // Avoid jumping
          current.$slide.scrollTop(0).scrollLeft(0);
        },

        // Preload next and previous slides
        // ================================

        preload: function (type) {
          var self = this,
            prev,
            next;

          if (self.group.length < 2) {
            return;
          }

          next = self.slides[self.currPos + 1];
          prev = self.slides[self.currPos - 1];

          if (prev && prev.type === type) {
            self.loadSlide(prev);
          }

          if (next && next.type === type) {
            self.loadSlide(next);
          }
        },

        // Try to find and focus on the first focusable element
        // ====================================================

        focus: function (e, firstRun) {
          var self = this,
            focusableStr = [
              "a[href]",
              "area[href]",
              'input:not([disabled]):not([type="hidden"]):not([aria-hidden])',
              "select:not([disabled]):not([aria-hidden])",
              "textarea:not([disabled]):not([aria-hidden])",
              "button:not([disabled]):not([aria-hidden])",
              "iframe",
              "object",
              "embed",
              "video",
              "audio",
              "[contenteditable]",
              '[tabindex]:not([tabindex^="-"])'
            ].join(","),
            focusableItems,
            focusedItemIndex;

          if (self.isClosing) {
            return;
          }

          if (e || !self.current || !self.current.isComplete) {
            // Focus on any element inside fancybox
            focusableItems = self.$refs.container.find("*:visible");
          } else {
            // Focus inside current slide
            focusableItems = self.current.$slide.find("*:visible" + (firstRun ? ":not(.fancybox-close-small)" : ""));
          }

          focusableItems = focusableItems.filter(focusableStr).filter(function () {
            return $(this).css("visibility") !== "hidden" && !$(this).hasClass("disabled");
          });

          if (focusableItems.length) {
            focusedItemIndex = focusableItems.index(document.activeElement);

            if (e && e.shiftKey) {
              // Back tab
              if (focusedItemIndex < 0 || focusedItemIndex == 0) {
                e.preventDefault();

                focusableItems.eq(focusableItems.length - 1).trigger("focus");
              }
            } else {
              // Outside or Forward tab
              if (focusedItemIndex < 0 || focusedItemIndex == focusableItems.length - 1) {
                if (e) {
                  e.preventDefault();
                }

                focusableItems.eq(0).trigger("focus");
              }
            }
          } else {
            self.$refs.container.trigger("focus");
          }
        },

        // Activates current instance - brings container to the front and enables keyboard,
        // notifies other instances about deactivating
        // =================================================================================

        activate: function () {
          var self = this;

          // Deactivate all instances
          $(".fancybox-container").each(function () {
            var instance = $(this).data("FancyBox");

            // Skip self and closing instances
            if (instance && instance.id !== self.id && !instance.isClosing) {
              instance.trigger("onDeactivate");

              instance.removeEvents();

              instance.isVisible = false;
            }
          });

          self.isVisible = true;

          if (self.current || self.isIdle) {
            self.update();

            self.updateControls();
          }

          self.trigger("onActivate");

          self.addEvents();
        },

        // Start closing procedure
        // This will start "zoom-out" animation if needed and clean everything up afterwards
        // =================================================================================

        close: function (e, d) {
          var self = this,
            current = self.current,
            effect,
            duration,
            $content,
            domRect,
            opacity,
            start,
            end;

          var done = function () {
            self.cleanUp(e);
          };

          if (self.isClosing) {
            return false;
          }

          self.isClosing = true;

          // If beforeClose callback prevents closing, make sure content is centered
          if (self.trigger("beforeClose", e) === false) {
            self.isClosing = false;

            requestAFrame(function () {
              self.update();
            });

            return false;
          }

          // Remove all events
          // If there are multiple instances, they will be set again by "activate" method
          self.removeEvents();

          $content = current.$content;
          effect = current.opts.animationEffect;
          duration = $.isNumeric(d) ? d : effect ? current.opts.animationDuration : 0;

          current.$slide.removeClass("fancybox-slide--complete fancybox-slide--next fancybox-slide--previous fancybox-animated");

          if (e !== true) {
            $.fancybox.stop(current.$slide);
          } else {
            effect = false;
          }

          // Remove other slides
          current.$slide
            .siblings()
            .trigger("onReset")
            .remove();

          // Trigger animations
          if (duration) {
            self.$refs.container
              .removeClass("fancybox-is-open")
              .addClass("fancybox-is-closing")
              .css("transition-duration", duration + "ms");
          }

          // Clean up
          self.hideLoading(current);

          self.hideControls(true);

          self.updateCursor();

          // Check if possible to zoom-out
          if (
            effect === "zoom" &&
            !($content && duration && current.type === "image" && !self.isMoved() && !current.hasError && (end = self.getThumbPos(current)))
          ) {
            effect = "fade";
          }

          if (effect === "zoom") {
            $.fancybox.stop($content);

            domRect = $.fancybox.getTranslate($content);

            start = {
              top: domRect.top,
              left: domRect.left,
              scaleX: domRect.width / end.width,
              scaleY: domRect.height / end.height,
              width: end.width,
              height: end.height
            };

            // Check if we need to animate opacity
            opacity = current.opts.zoomOpacity;

            if (opacity == "auto") {
              opacity = Math.abs(current.width / current.height - end.width / end.height) > 0.1;
            }

            if (opacity) {
              end.opacity = 0;
            }

            $.fancybox.setTranslate($content, start);

            forceRedraw($content);

            $.fancybox.animate($content, end, duration, done);

            return true;
          }

          if (effect && duration) {
            $.fancybox.animate(
              current.$slide.addClass("fancybox-slide--previous").removeClass("fancybox-slide--current"),
              "fancybox-animated fancybox-fx-" + effect,
              duration,
              done
            );
          } else {
            // If skip animation
            if (e === true) {
              setTimeout(done, duration);
            } else {
              done();
            }
          }

          return true;
        },

        // Final adjustments after removing the instance
        // =============================================

        cleanUp: function (e) {
          var self = this,
            instance,
            $focus = self.current.opts.$orig,
            x,
            y;

          self.current.$slide.trigger("onReset");

          self.$refs.container.empty().remove();

          self.trigger("afterClose", e);

          // Place back focus
          if (!!self.current.opts.backFocus) {
            if (!$focus || !$focus.length || !$focus.is(":visible")) {
              $focus = self.$trigger;
            }

            if ($focus && $focus.length) {
              x = window.scrollX;
              y = window.scrollY;

              $focus.trigger("focus");

              $("html, body")
                .scrollTop(y)
                .scrollLeft(x);
            }
          }

          self.current = null;

          // Check if there are other instances
          instance = $.fancybox.getInstance();

          if (instance) {
            instance.activate();
          } else {
            $("body").removeClass("fancybox-active compensate-for-scrollbar");

            $("#fancybox-style-noscroll").remove();
          }
        },

        // Call callback and trigger an event
        // ==================================

        trigger: function (name, slide) {
          var args = Array.prototype.slice.call(arguments, 1),
            self = this,
            obj = slide && slide.opts ? slide : self.current,
            rez;

          if (obj) {
            args.unshift(obj);
          } else {
            obj = self;
          }

          args.unshift(self);

          if ($.isFunction(obj.opts[name])) {
            rez = obj.opts[name].apply(obj, args);
          }

          if (rez === false) {
            return rez;
          }

          if (name === "afterClose" || !self.$refs) {
            $D.trigger(name + ".fb", args);
          } else {
            self.$refs.container.trigger(name + ".fb", args);
          }
        },

        // Update infobar values, navigation button states and reveal caption
        // ==================================================================

        updateControls: function () {
          var self = this,
            current = self.current,
            index = current.index,
            $container = self.$refs.container,
            $caption = self.$refs.caption,
            caption = current.opts.caption;

          // Recalculate content dimensions
          current.$slide.trigger("refresh");

          // Set caption
          if (caption && caption.length) {
            self.$caption = $caption;

            $caption
              .children()
              .eq(0)
              .html(caption);
          } else {
            self.$caption = null;
          }

          if (!self.hasHiddenControls && !self.isIdle) {
            self.showControls();
          }

          // Update info and navigation elements
          $container.find("[data-fancybox-count]").html(self.group.length);
          $container.find("[data-fancybox-index]").html(index + 1);

          $container.find("[data-fancybox-prev]").prop("disabled", !current.opts.loop && index <= 0);
          $container.find("[data-fancybox-next]").prop("disabled", !current.opts.loop && index >= self.group.length - 1);

          if (current.type === "image") {
            // Re-enable buttons; update download button source
            $container
              .find("[data-fancybox-zoom]")
              .show()
              .end()
              .find("[data-fancybox-download]")
              .attr("href", current.opts.image.src || current.src)
              .show();
          } else if (current.opts.toolbar) {
            $container.find("[data-fancybox-download],[data-fancybox-zoom]").hide();
          }

          // Make sure focus is not on disabled button/element
          if ($(document.activeElement).is(":hidden,[disabled]")) {
            self.$refs.container.trigger("focus");
          }
        },

        // Hide toolbar and caption
        // ========================

        hideControls: function (andCaption) {
          var self = this,
            arr = ["infobar", "toolbar", "nav"];

          if (andCaption || !self.current.opts.preventCaptionOverlap) {
            arr.push("caption");
          }

          this.$refs.container.removeClass(
            arr
            .map(function (i) {
              return "fancybox-show-" + i;
            })
            .join(" ")
          );

          this.hasHiddenControls = true;
        },

        showControls: function () {
          var self = this,
            opts = self.current ? self.current.opts : self.opts,
            $container = self.$refs.container;

          self.hasHiddenControls = false;
          self.idleSecondsCounter = 0;

          $container
            .toggleClass("fancybox-show-toolbar", !!(opts.toolbar && opts.buttons))
            .toggleClass("fancybox-show-infobar", !!(opts.infobar && self.group.length > 1))
            .toggleClass("fancybox-show-caption", !!self.$caption)
            .toggleClass("fancybox-show-nav", !!(opts.arrows && self.group.length > 1))
            .toggleClass("fancybox-is-modal", !!opts.modal);
        },

        // Toggle toolbar and caption
        // ==========================

        toggleControls: function () {
          if (this.hasHiddenControls) {
            this.showControls();
          } else {
            this.hideControls();
          }
        }
      });

      $.fancybox = {
        version: "3.5.7",
        defaults: defaults,

        // Get current instance and execute a command.
        //
        // Examples of usage:
        //
        //   $instance = $.fancybox.getInstance();
        //   $.fancybox.getInstance().jumpTo( 1 );
        //   $.fancybox.getInstance( 'jumpTo', 1 );
        //   $.fancybox.getInstance( function() {
        //       console.info( this.currIndex );
        //   });
        // ======================================================

        getInstance: function (command) {
          var instance = $('.fancybox-container:not(".fancybox-is-closing"):last').data("FancyBox"),
            args = Array.prototype.slice.call(arguments, 1);

          if (instance instanceof FancyBox) {
            if ($.type(command) === "string") {
              instance[command].apply(instance, args);
            } else if ($.type(command) === "function") {
              command.apply(instance, args);
            }

            return instance;
          }

          return false;
        },

        // Create new instance
        // ===================

        open: function (items, opts, index) {
          return new FancyBox(items, opts, index);
        },

        // Close current or all instances
        // ==============================

        close: function (all) {
          var instance = this.getInstance();

          if (instance) {
            instance.close();

            // Try to find and close next instance
            if (all === true) {
              this.close(all);
            }
          }
        },

        // Close all instances and unbind all events
        // =========================================

        destroy: function () {
          this.close(true);

          $D.add("body").off("click.fb-start", "**");
        },

        // Try to detect mobile devices
        // ============================

        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),

        // Detect if 'translate3d' support is available
        // ============================================

        use3d: (function () {
          var div = document.createElement("div");

          return (
            window.getComputedStyle &&
            window.getComputedStyle(div) &&
            window.getComputedStyle(div).getPropertyValue("transform") &&
            !(document.documentMode && document.documentMode < 11)
          );
        })(),

        // Helper function to get current visual state of an element
        // returns array[ top, left, horizontal-scale, vertical-scale, opacity ]
        // =====================================================================

        getTranslate: function ($el) {
          var domRect;

          if (!$el || !$el.length) {
            return false;
          }

          domRect = $el[0].getBoundingClientRect();

          return {
            top: domRect.top || 0,
            left: domRect.left || 0,
            width: domRect.width,
            height: domRect.height,
            opacity: parseFloat($el.css("opacity"))
          };
        },

        // Shortcut for setting "translate3d" properties for element
        // Can set be used to set opacity, too
        // ========================================================

        setTranslate: function ($el, props) {
          var str = "",
            css = {};

          if (!$el || !props) {
            return;
          }

          if (props.left !== undefined$1 || props.top !== undefined$1) {
            str =
              (props.left === undefined$1 ? $el.position().left : props.left) +
              "px, " +
              (props.top === undefined$1 ? $el.position().top : props.top) +
              "px";

            if (this.use3d) {
              str = "translate3d(" + str + ", 0px)";
            } else {
              str = "translate(" + str + ")";
            }
          }

          if (props.scaleX !== undefined$1 && props.scaleY !== undefined$1) {
            str += " scale(" + props.scaleX + ", " + props.scaleY + ")";
          } else if (props.scaleX !== undefined$1) {
            str += " scaleX(" + props.scaleX + ")";
          }

          if (str.length) {
            css.transform = str;
          }

          if (props.opacity !== undefined$1) {
            css.opacity = props.opacity;
          }

          if (props.width !== undefined$1) {
            css.width = props.width;
          }

          if (props.height !== undefined$1) {
            css.height = props.height;
          }

          return $el.css(css);
        },

        // Simple CSS transition handler
        // =============================

        animate: function ($el, to, duration, callback, leaveAnimationName) {
          var self = this,
            from;

          if ($.isFunction(duration)) {
            callback = duration;
            duration = null;
          }

          self.stop($el);

          from = self.getTranslate($el);

          $el.on(transitionEnd, function (e) {
            // Skip events from child elements and z-index change
            if (e && e.originalEvent && (!$el.is(e.originalEvent.target) || e.originalEvent.propertyName == "z-index")) {
              return;
            }

            self.stop($el);

            if ($.isNumeric(duration)) {
              $el.css("transition-duration", "");
            }

            if ($.isPlainObject(to)) {
              if (to.scaleX !== undefined$1 && to.scaleY !== undefined$1) {
                self.setTranslate($el, {
                  top: to.top,
                  left: to.left,
                  width: from.width * to.scaleX,
                  height: from.height * to.scaleY,
                  scaleX: 1,
                  scaleY: 1
                });
              }
            } else if (leaveAnimationName !== true) {
              $el.removeClass(to);
            }

            if ($.isFunction(callback)) {
              callback(e);
            }
          });

          if ($.isNumeric(duration)) {
            $el.css("transition-duration", duration + "ms");
          }

          // Start animation by changing CSS properties or class name
          if ($.isPlainObject(to)) {
            if (to.scaleX !== undefined$1 && to.scaleY !== undefined$1) {
              delete to.width;
              delete to.height;

              if ($el.parent().hasClass("fancybox-slide--image")) {
                $el.parent().addClass("fancybox-is-scaling");
              }
            }

            $.fancybox.setTranslate($el, to);
          } else {
            $el.addClass(to);
          }

          // Make sure that `transitionend` callback gets fired
          $el.data(
            "timer",
            setTimeout(function () {
              $el.trigger(transitionEnd);
            }, duration + 33)
          );
        },

        stop: function ($el, callCallback) {
          if ($el && $el.length) {
            clearTimeout($el.data("timer"));

            if (callCallback) {
              $el.trigger(transitionEnd);
            }

            $el.off(transitionEnd).css("transition-duration", "");

            $el.parent().removeClass("fancybox-is-scaling");
          }
        }
      };

      // Default click handler for "fancyboxed" links
      // ============================================

      function _run(e, opts) {
        var items = [],
          index = 0,
          $target,
          value,
          instance;

        // Avoid opening multiple times
        if (e && e.isDefaultPrevented()) {
          return;
        }

        e.preventDefault();

        opts = opts || {};

        if (e && e.data) {
          opts = mergeOpts(e.data.options, opts);
        }

        $target = opts.$target || $(e.currentTarget).trigger("blur");
        instance = $.fancybox.getInstance();

        if (instance && instance.$trigger && instance.$trigger.is($target)) {
          return;
        }

        if (opts.selector) {
          items = $(opts.selector);
        } else {
          // Get all related items and find index for clicked one
          value = $target.attr("data-fancybox") || "";

          if (value) {
            items = e.data ? e.data.items : [];
            items = items.length ? items.filter('[data-fancybox="' + value + '"]') : $('[data-fancybox="' + value + '"]');
          } else {
            items = [$target];
          }
        }

        index = $(items).index($target);

        // Sometimes current item can not be found
        if (index < 0) {
          index = 0;
        }

        instance = $.fancybox.open(items, opts, index);

        // Save last active element
        instance.$trigger = $target;
      }

      // Create a jQuery plugin
      // ======================

      $.fn.fancybox = function (options) {
        var selector;

        options = options || {};
        selector = options.selector || false;

        if (selector) {
          // Use body element instead of document so it executes first
          $("body")
            .off("click.fb-start", selector)
            .on("click.fb-start", selector, {
              options: options
            }, _run);
        } else {
          this.off("click.fb-start").on(
            "click.fb-start", {
              items: this,
              options: options
            },
            _run
          );
        }

        return this;
      };

      // Self initializing plugin for all elements having `data-fancybox` attribute
      // ==========================================================================

      $D.on("click.fb-start", "[data-fancybox]", _run);

      // Enable "trigger elements"
      // =========================

      $D.on("click.fb-start", "[data-fancybox-trigger]", function (e) {
        $('[data-fancybox="' + $(this).attr("data-fancybox-trigger") + '"]')
          .eq($(this).attr("data-fancybox-index") || 0)
          .trigger("click.fb-start", {
            $trigger: $(this)
          });
      });

      // Track focus event for better accessibility styling
      // ==================================================
      (function () {
        var buttonStr = ".fancybox-button",
          focusStr = "fancybox-focus",
          $pressed = null;

        $D.on("mousedown mouseup focus blur", buttonStr, function (e) {
          switch (e.type) {
            case "mousedown":
              $pressed = $(this);
              break;
            case "mouseup":
              $pressed = null;
              break;
            case "focusin":
              $(buttonStr).removeClass(focusStr);

              if (!$(this).is($pressed) && !$(this).is("[disabled]")) {
                $(this).addClass(focusStr);
              }
              break;
            case "focusout":
              $(buttonStr).removeClass(focusStr);
              break;
          }
        });
      })();
    })(window, document, jQuery);
    // ==========================================================================
    //
    // Media
    // Adds additional media type support
    //
    // ==========================================================================
    (function ($) {

      // Object containing properties for each media type
      var defaults = {
        youtube: {
          matcher: /(youtube\.com|youtu\.be|youtube\-nocookie\.com)\/(watch\?(.*&)?v=|v\/|u\/|embed\/?)?(videoseries\?list=(.*)|[\w-]{11}|\?listType=(.*)&list=(.*))(.*)/i,
          params: {
            autoplay: 1,
            autohide: 1,
            fs: 1,
            rel: 0,
            hd: 1,
            wmode: "transparent",
            enablejsapi: 1,
            html5: 1
          },
          paramPlace: 8,
          type: "iframe",
          url: "https://www.youtube-nocookie.com/embed/$4",
          thumb: "https://img.youtube.com/vi/$4/hqdefault.jpg"
        },

        vimeo: {
          matcher: /^.+vimeo.com\/(.*\/)?([\d]+)(.*)?/,
          params: {
            autoplay: 1,
            hd: 1,
            show_title: 1,
            show_byline: 1,
            show_portrait: 0,
            fullscreen: 1
          },
          paramPlace: 3,
          type: "iframe",
          url: "//player.vimeo.com/video/$2"
        },

        instagram: {
          matcher: /(instagr\.am|instagram\.com)\/p\/([a-zA-Z0-9_\-]+)\/?/i,
          type: "image",
          url: "//$1/p/$2/media/?size=l"
        },

        // Examples:
        // http://maps.google.com/?ll=48.857995,2.294297&spn=0.007666,0.021136&t=m&z=16
        // https://www.google.com/maps/@37.7852006,-122.4146355,14.65z
        // https://www.google.com/maps/@52.2111123,2.9237542,6.61z?hl=en
        // https://www.google.com/maps/place/Googleplex/@37.4220041,-122.0833494,17z/data=!4m5!3m4!1s0x0:0x6c296c66619367e0!8m2!3d37.4219998!4d-122.0840572
        gmap_place: {
          matcher: /(maps\.)?google\.([a-z]{2,3}(\.[a-z]{2})?)\/(((maps\/(place\/(.*)\/)?\@(.*),(\d+.?\d+?)z))|(\?ll=))(.*)?/i,
          type: "iframe",
          url: function (rez) {
            return (
              "//maps.google." +
              rez[2] +
              "/?ll=" +
              (rez[9] ? rez[9] + "&z=" + Math.floor(rez[10]) + (rez[12] ? rez[12].replace(/^\//, "&") : "") : rez[12] + "").replace(/\?/, "&") +
              "&output=" +
              (rez[12] && rez[12].indexOf("layer=c") > 0 ? "svembed" : "embed")
            );
          }
        },

        // Examples:
        // https://www.google.com/maps/search/Empire+State+Building/
        // https://www.google.com/maps/search/?api=1&query=centurylink+field
        // https://www.google.com/maps/search/?api=1&query=47.5951518,-122.3316393
        gmap_search: {
          matcher: /(maps\.)?google\.([a-z]{2,3}(\.[a-z]{2})?)\/(maps\/search\/)(.*)/i,
          type: "iframe",
          url: function (rez) {
            return "//maps.google." + rez[2] + "/maps?q=" + rez[5].replace("query=", "q=").replace("api=1", "") + "&output=embed";
          }
        }
      };

      // Formats matching url to final form
      var format = function (url, rez, params) {
        if (!url) {
          return;
        }

        params = params || "";

        if ($.type(params) === "object") {
          params = $.param(params, true);
        }

        $.each(rez, function (key, value) {
          url = url.replace("$" + key, value || "");
        });

        if (params.length) {
          url += (url.indexOf("?") > 0 ? "&" : "?") + params;
        }

        return url;
      };

      $(document).on("objectNeedsType.fb", function (e, instance, item) {
        var url = item.src || "",
          type = false,
          media,
          thumb,
          rez,
          params,
          urlParams,
          paramObj,
          provider;

        media = $.extend(true, {}, defaults, item.opts.media);

        // Look for any matching media type
        $.each(media, function (providerName, providerOpts) {
          rez = url.match(providerOpts.matcher);

          if (!rez) {
            return;
          }

          type = providerOpts.type;
          provider = providerName;
          paramObj = {};

          if (providerOpts.paramPlace && rez[providerOpts.paramPlace]) {
            urlParams = rez[providerOpts.paramPlace];

            if (urlParams[0] == "?") {
              urlParams = urlParams.substring(1);
            }

            urlParams = urlParams.split("&");

            for (var m = 0; m < urlParams.length; ++m) {
              var p = urlParams[m].split("=", 2);

              if (p.length == 2) {
                paramObj[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
              }
            }
          }

          params = $.extend(true, {}, providerOpts.params, item.opts[providerName], paramObj);

          url =
            $.type(providerOpts.url) === "function" ? providerOpts.url.call(this, rez, params, item) : format(providerOpts.url, rez, params);

          thumb =
            $.type(providerOpts.thumb) === "function" ? providerOpts.thumb.call(this, rez, params, item) : format(providerOpts.thumb, rez);

          if (providerName === "youtube") {
            url = url.replace(/&t=((\d+)m)?(\d+)s/, function (match, p1, m, s) {
              return "&start=" + ((m ? parseInt(m, 10) * 60 : 0) + parseInt(s, 10));
            });
          } else if (providerName === "vimeo") {
            url = url.replace("&%23", "#");
          }

          return false;
        });

        // If it is found, then change content type and update the url

        if (type) {
          if (!item.opts.thumb && !(item.opts.$thumb && item.opts.$thumb.length)) {
            item.opts.thumb = thumb;
          }

          if (type === "iframe") {
            item.opts = $.extend(true, item.opts, {
              iframe: {
                preload: false,
                attr: {
                  scrolling: "no"
                }
              }
            });
          }

          $.extend(item, {
            type: type,
            src: url,
            origSrc: item.src,
            contentSource: provider,
            contentType: type === "image" ? "image" : provider == "gmap_place" || provider == "gmap_search" ? "map" : "video"
          });
        } else if (url) {
          item.type = item.opts.defaultType;
        }
      });

      // Load YouTube/Video API on request to detect when video finished playing
      var VideoAPILoader = {
        youtube: {
          src: "https://www.youtube.com/iframe_api",
          class: "YT",
          loading: false,
          loaded: false
        },

        vimeo: {
          src: "https://player.vimeo.com/api/player.js",
          class: "Vimeo",
          loading: false,
          loaded: false
        },

        load: function (vendor) {
          var _this = this,
            script;

          if (this[vendor].loaded) {
            setTimeout(function () {
              _this.done(vendor);
            });
            return;
          }

          if (this[vendor].loading) {
            return;
          }

          this[vendor].loading = true;

          script = document.createElement("script");
          script.type = "text/javascript";
          script.src = this[vendor].src;

          if (vendor === "youtube") {
            window.onYouTubeIframeAPIReady = function () {
              _this[vendor].loaded = true;
              _this.done(vendor);
            };
          } else {
            script.onload = function () {
              _this[vendor].loaded = true;
              _this.done(vendor);
            };
          }

          document.body.appendChild(script);
        },
        done: function (vendor) {
          var instance, $el, player;

          if (vendor === "youtube") {
            delete window.onYouTubeIframeAPIReady;
          }

          instance = $.fancybox.getInstance();

          if (instance) {
            $el = instance.current.$content.find("iframe");

            if (vendor === "youtube" && YT !== undefined && YT) {
              player = new YT.Player($el.attr("id"), {
                events: {
                  onStateChange: function (e) {
                    if (e.data == 0) {
                      instance.next();
                    }
                  }
                }
              });
            } else if (vendor === "vimeo" && Vimeo !== undefined && Vimeo) {
              player = new Vimeo.Player($el);

              player.on("ended", function () {
                instance.next();
              });
            }
          }
        }
      };

      $(document).on({
        "afterShow.fb": function (e, instance, current) {
          if (instance.group.length > 1 && (current.contentSource === "youtube" || current.contentSource === "vimeo")) {
            VideoAPILoader.load(current.contentSource);
          }
        }
      });
    })(jQuery);
    // ==========================================================================
    //
    // Guestures
    // Adds touch guestures, handles click and tap events
    //
    // ==========================================================================
    (function (window, document, $) {

      var requestAFrame = (function () {
        return (
          window.requestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame ||
          window.oRequestAnimationFrame ||
          // if all else fails, use setTimeout
          function (callback) {
            return window.setTimeout(callback, 1000 / 60);
          }
        );
      })();

      var cancelAFrame = (function () {
        return (
          window.cancelAnimationFrame ||
          window.webkitCancelAnimationFrame ||
          window.mozCancelAnimationFrame ||
          window.oCancelAnimationFrame ||
          function (id) {
            window.clearTimeout(id);
          }
        );
      })();

      var getPointerXY = function (e) {
        var result = [];

        e = e.originalEvent || e || window.e;
        e = e.touches && e.touches.length ? e.touches : e.changedTouches && e.changedTouches.length ? e.changedTouches : [e];

        for (var key in e) {
          if (e[key].pageX) {
            result.push({
              x: e[key].pageX,
              y: e[key].pageY
            });
          } else if (e[key].clientX) {
            result.push({
              x: e[key].clientX,
              y: e[key].clientY
            });
          }
        }

        return result;
      };

      var distance = function (point2, point1, what) {
        if (!point1 || !point2) {
          return 0;
        }

        if (what === "x") {
          return point2.x - point1.x;
        } else if (what === "y") {
          return point2.y - point1.y;
        }

        return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
      };

      var isClickable = function ($el) {
        if (
          $el.is('a,area,button,[role="button"],input,label,select,summary,textarea,video,audio,iframe') ||
          $.isFunction($el.get(0).onclick) ||
          $el.data("selectable")
        ) {
          return true;
        }

        // Check for attributes like data-fancybox-next or data-fancybox-close
        for (var i = 0, atts = $el[0].attributes, n = atts.length; i < n; i++) {
          if (atts[i].nodeName.substr(0, 14) === "data-fancybox-") {
            return true;
          }
        }

        return false;
      };

      var hasScrollbars = function (el) {
        var overflowY = window.getComputedStyle(el)["overflow-y"],
          overflowX = window.getComputedStyle(el)["overflow-x"],
          vertical = (overflowY === "scroll" || overflowY === "auto") && el.scrollHeight > el.clientHeight,
          horizontal = (overflowX === "scroll" || overflowX === "auto") && el.scrollWidth > el.clientWidth;

        return vertical || horizontal;
      };

      var isScrollable = function ($el) {
        var rez = false;

        while (true) {
          rez = hasScrollbars($el.get(0));

          if (rez) {
            break;
          }

          $el = $el.parent();

          if (!$el.length || $el.hasClass("fancybox-stage") || $el.is("body")) {
            break;
          }
        }

        return rez;
      };

      var Guestures = function (instance) {
        var self = this;

        self.instance = instance;

        self.$bg = instance.$refs.bg;
        self.$stage = instance.$refs.stage;
        self.$container = instance.$refs.container;

        self.destroy();

        self.$container.on("touchstart.fb.touch mousedown.fb.touch", $.proxy(self, "ontouchstart"));
      };

      Guestures.prototype.destroy = function () {
        var self = this;

        self.$container.off(".fb.touch");

        $(document).off(".fb.touch");

        if (self.requestId) {
          cancelAFrame(self.requestId);
          self.requestId = null;
        }

        if (self.tapped) {
          clearTimeout(self.tapped);
          self.tapped = null;
        }
      };

      Guestures.prototype.ontouchstart = function (e) {
        var self = this,
          $target = $(e.target),
          instance = self.instance,
          current = instance.current,
          $slide = current.$slide,
          $content = current.$content,
          isTouchDevice = e.type == "touchstart";

        // Do not respond to both (touch and mouse) events
        if (isTouchDevice) {
          self.$container.off("mousedown.fb.touch");
        }

        // Ignore right click
        if (e.originalEvent && e.originalEvent.button == 2) {
          return;
        }

        // Ignore taping on links, buttons, input elements
        if (!$slide.length || !$target.length || isClickable($target) || isClickable($target.parent())) {
          return;
        }
        // Ignore clicks on the scrollbar
        if (!$target.is("img") && e.originalEvent.clientX > $target[0].clientWidth + $target.offset().left) {
          return;
        }

        // Ignore clicks while zooming or closing
        if (!current || instance.isAnimating || current.$slide.hasClass("fancybox-animated")) {
          e.stopPropagation();
          e.preventDefault();

          return;
        }

        self.realPoints = self.startPoints = getPointerXY(e);

        if (!self.startPoints.length) {
          return;
        }

        // Allow other scripts to catch touch event if "touch" is set to false
        if (current.touch) {
          e.stopPropagation();
        }

        self.startEvent = e;

        self.canTap = true;
        self.$target = $target;
        self.$content = $content;
        self.opts = current.opts.touch;

        self.isPanning = false;
        self.isSwiping = false;
        self.isZooming = false;
        self.isScrolling = false;
        self.canPan = instance.canPan();

        self.startTime = new Date().getTime();
        self.distanceX = self.distanceY = self.distance = 0;

        self.canvasWidth = Math.round($slide[0].clientWidth);
        self.canvasHeight = Math.round($slide[0].clientHeight);

        self.contentLastPos = null;
        self.contentStartPos = $.fancybox.getTranslate(self.$content) || {
          top: 0,
          left: 0
        };
        self.sliderStartPos = $.fancybox.getTranslate($slide);

        // Since position will be absolute, but we need to make it relative to the stage
        self.stagePos = $.fancybox.getTranslate(instance.$refs.stage);

        self.sliderStartPos.top -= self.stagePos.top;
        self.sliderStartPos.left -= self.stagePos.left;

        self.contentStartPos.top -= self.stagePos.top;
        self.contentStartPos.left -= self.stagePos.left;

        $(document)
          .off(".fb.touch")
          .on(isTouchDevice ? "touchend.fb.touch touchcancel.fb.touch" : "mouseup.fb.touch mouseleave.fb.touch", $.proxy(self, "ontouchend"))
          .on(isTouchDevice ? "touchmove.fb.touch" : "mousemove.fb.touch", $.proxy(self, "ontouchmove"));

        if ($.fancybox.isMobile) {
          document.addEventListener("scroll", self.onscroll, true);
        }

        // Skip if clicked outside the sliding area
        if (!(self.opts || self.canPan) || !($target.is(self.$stage) || self.$stage.find($target).length)) {
          if ($target.is(".fancybox-image")) {
            e.preventDefault();
          }

          if (!($.fancybox.isMobile && $target.parents(".fancybox-caption").length)) {
            return;
          }
        }

        self.isScrollable = isScrollable($target) || isScrollable($target.parent());

        // Check if element is scrollable and try to prevent default behavior (scrolling)
        if (!($.fancybox.isMobile && self.isScrollable)) {
          e.preventDefault();
        }

        // One finger or mouse click - swipe or pan an image
        if (self.startPoints.length === 1 || current.hasError) {
          if (self.canPan) {
            $.fancybox.stop(self.$content);

            self.isPanning = true;
          } else {
            self.isSwiping = true;
          }

          self.$container.addClass("fancybox-is-grabbing");
        }

        // Two fingers - zoom image
        if (self.startPoints.length === 2 && current.type === "image" && (current.isLoaded || current.$ghost)) {
          self.canTap = false;
          self.isSwiping = false;
          self.isPanning = false;

          self.isZooming = true;

          $.fancybox.stop(self.$content);

          self.centerPointStartX = (self.startPoints[0].x + self.startPoints[1].x) * 0.5 - $(window).scrollLeft();
          self.centerPointStartY = (self.startPoints[0].y + self.startPoints[1].y) * 0.5 - $(window).scrollTop();

          self.percentageOfImageAtPinchPointX = (self.centerPointStartX - self.contentStartPos.left) / self.contentStartPos.width;
          self.percentageOfImageAtPinchPointY = (self.centerPointStartY - self.contentStartPos.top) / self.contentStartPos.height;

          self.startDistanceBetweenFingers = distance(self.startPoints[0], self.startPoints[1]);
        }
      };

      Guestures.prototype.onscroll = function (e) {
        var self = this;

        self.isScrolling = true;

        document.removeEventListener("scroll", self.onscroll, true);
      };

      Guestures.prototype.ontouchmove = function (e) {
        var self = this;

        // Make sure user has not released over iframe or disabled element
        if (e.originalEvent.buttons !== undefined && e.originalEvent.buttons === 0) {
          self.ontouchend(e);
          return;
        }

        if (self.isScrolling) {
          self.canTap = false;
          return;
        }

        self.newPoints = getPointerXY(e);

        if (!(self.opts || self.canPan) || !self.newPoints.length || !self.newPoints.length) {
          return;
        }

        if (!(self.isSwiping && self.isSwiping === true)) {
          e.preventDefault();
        }

        self.distanceX = distance(self.newPoints[0], self.startPoints[0], "x");
        self.distanceY = distance(self.newPoints[0], self.startPoints[0], "y");

        self.distance = distance(self.newPoints[0], self.startPoints[0]);

        // Skip false ontouchmove events (Chrome)
        if (self.distance > 0) {
          if (self.isSwiping) {
            self.onSwipe(e);
          } else if (self.isPanning) {
            self.onPan();
          } else if (self.isZooming) {
            self.onZoom();
          }
        }
      };

      Guestures.prototype.onSwipe = function (e) {
        var self = this,
          instance = self.instance,
          swiping = self.isSwiping,
          left = self.sliderStartPos.left || 0,
          angle;

        // If direction is not yet determined
        if (swiping === true) {
          // We need at least 10px distance to correctly calculate an angle
          if (Math.abs(self.distance) > 10) {
            self.canTap = false;

            if (instance.group.length < 2 && self.opts.vertical) {
              self.isSwiping = "y";
            } else if (instance.isDragging || self.opts.vertical === false || (self.opts.vertical === "auto" && $(window).width() > 800)) {
              self.isSwiping = "x";
            } else {
              angle = Math.abs((Math.atan2(self.distanceY, self.distanceX) * 180) / Math.PI);

              self.isSwiping = angle > 45 && angle < 135 ? "y" : "x";
            }

            if (self.isSwiping === "y" && $.fancybox.isMobile && self.isScrollable) {
              self.isScrolling = true;

              return;
            }

            instance.isDragging = self.isSwiping;

            // Reset points to avoid jumping, because we dropped first swipes to calculate the angle
            self.startPoints = self.newPoints;

            $.each(instance.slides, function (index, slide) {
              var slidePos, stagePos;

              $.fancybox.stop(slide.$slide);

              slidePos = $.fancybox.getTranslate(slide.$slide);
              stagePos = $.fancybox.getTranslate(instance.$refs.stage);

              slide.$slide
                .css({
                  transform: "",
                  opacity: "",
                  "transition-duration": ""
                })
                .removeClass("fancybox-animated")
                .removeClass(function (index, className) {
                  return (className.match(/(^|\s)fancybox-fx-\S+/g) || []).join(" ");
                });

              if (slide.pos === instance.current.pos) {
                self.sliderStartPos.top = slidePos.top - stagePos.top;
                self.sliderStartPos.left = slidePos.left - stagePos.left;
              }

              $.fancybox.setTranslate(slide.$slide, {
                top: slidePos.top - stagePos.top,
                left: slidePos.left - stagePos.left
              });
            });

            // Stop slideshow
            if (instance.SlideShow && instance.SlideShow.isActive) {
              instance.SlideShow.stop();
            }
          }

          return;
        }

        // Sticky edges
        if (swiping == "x") {
          if (
            self.distanceX > 0 &&
            (self.instance.group.length < 2 || (self.instance.current.index === 0 && !self.instance.current.opts.loop))
          ) {
            left = left + Math.pow(self.distanceX, 0.8);
          } else if (
            self.distanceX < 0 &&
            (self.instance.group.length < 2 ||
              (self.instance.current.index === self.instance.group.length - 1 && !self.instance.current.opts.loop))
          ) {
            left = left - Math.pow(-self.distanceX, 0.8);
          } else {
            left = left + self.distanceX;
          }
        }

        self.sliderLastPos = {
          top: swiping == "x" ? 0 : self.sliderStartPos.top + self.distanceY,
          left: left
        };

        if (self.requestId) {
          cancelAFrame(self.requestId);

          self.requestId = null;
        }

        self.requestId = requestAFrame(function () {
          if (self.sliderLastPos) {
            $.each(self.instance.slides, function (index, slide) {
              var pos = slide.pos - self.instance.currPos;

              $.fancybox.setTranslate(slide.$slide, {
                top: self.sliderLastPos.top,
                left: self.sliderLastPos.left + pos * self.canvasWidth + pos * slide.opts.gutter
              });
            });

            self.$container.addClass("fancybox-is-sliding");
          }
        });
      };

      Guestures.prototype.onPan = function () {
        var self = this;

        // Prevent accidental movement (sometimes, when tapping casually, finger can move a bit)
        if (distance(self.newPoints[0], self.realPoints[0]) < ($.fancybox.isMobile ? 10 : 5)) {
          self.startPoints = self.newPoints;
          return;
        }

        self.canTap = false;

        self.contentLastPos = self.limitMovement();

        if (self.requestId) {
          cancelAFrame(self.requestId);
        }

        self.requestId = requestAFrame(function () {
          $.fancybox.setTranslate(self.$content, self.contentLastPos);
        });
      };

      // Make panning sticky to the edges
      Guestures.prototype.limitMovement = function () {
        var self = this;

        var canvasWidth = self.canvasWidth;
        var canvasHeight = self.canvasHeight;

        var distanceX = self.distanceX;
        var distanceY = self.distanceY;

        var contentStartPos = self.contentStartPos;

        var currentOffsetX = contentStartPos.left;
        var currentOffsetY = contentStartPos.top;

        var currentWidth = contentStartPos.width;
        var currentHeight = contentStartPos.height;

        var minTranslateX, minTranslateY, maxTranslateX, maxTranslateY, newOffsetX, newOffsetY;

        if (currentWidth > canvasWidth) {
          newOffsetX = currentOffsetX + distanceX;
        } else {
          newOffsetX = currentOffsetX;
        }

        newOffsetY = currentOffsetY + distanceY;

        // Slow down proportionally to traveled distance
        minTranslateX = Math.max(0, canvasWidth * 0.5 - currentWidth * 0.5);
        minTranslateY = Math.max(0, canvasHeight * 0.5 - currentHeight * 0.5);

        maxTranslateX = Math.min(canvasWidth - currentWidth, canvasWidth * 0.5 - currentWidth * 0.5);
        maxTranslateY = Math.min(canvasHeight - currentHeight, canvasHeight * 0.5 - currentHeight * 0.5);

        //   ->
        if (distanceX > 0 && newOffsetX > minTranslateX) {
          newOffsetX = minTranslateX - 1 + Math.pow(-minTranslateX + currentOffsetX + distanceX, 0.8) || 0;
        }

        //    <-
        if (distanceX < 0 && newOffsetX < maxTranslateX) {
          newOffsetX = maxTranslateX + 1 - Math.pow(maxTranslateX - currentOffsetX - distanceX, 0.8) || 0;
        }

        //   \/
        if (distanceY > 0 && newOffsetY > minTranslateY) {
          newOffsetY = minTranslateY - 1 + Math.pow(-minTranslateY + currentOffsetY + distanceY, 0.8) || 0;
        }

        //   /\
        if (distanceY < 0 && newOffsetY < maxTranslateY) {
          newOffsetY = maxTranslateY + 1 - Math.pow(maxTranslateY - currentOffsetY - distanceY, 0.8) || 0;
        }

        return {
          top: newOffsetY,
          left: newOffsetX
        };
      };

      Guestures.prototype.limitPosition = function (newOffsetX, newOffsetY, newWidth, newHeight) {
        var self = this;

        var canvasWidth = self.canvasWidth;
        var canvasHeight = self.canvasHeight;

        if (newWidth > canvasWidth) {
          newOffsetX = newOffsetX > 0 ? 0 : newOffsetX;
          newOffsetX = newOffsetX < canvasWidth - newWidth ? canvasWidth - newWidth : newOffsetX;
        } else {
          // Center horizontally
          newOffsetX = Math.max(0, canvasWidth / 2 - newWidth / 2);
        }

        if (newHeight > canvasHeight) {
          newOffsetY = newOffsetY > 0 ? 0 : newOffsetY;
          newOffsetY = newOffsetY < canvasHeight - newHeight ? canvasHeight - newHeight : newOffsetY;
        } else {
          // Center vertically
          newOffsetY = Math.max(0, canvasHeight / 2 - newHeight / 2);
        }

        return {
          top: newOffsetY,
          left: newOffsetX
        };
      };

      Guestures.prototype.onZoom = function () {
        var self = this;

        // Calculate current distance between points to get pinch ratio and new width and height
        var contentStartPos = self.contentStartPos;

        var currentWidth = contentStartPos.width;
        var currentHeight = contentStartPos.height;

        var currentOffsetX = contentStartPos.left;
        var currentOffsetY = contentStartPos.top;

        var endDistanceBetweenFingers = distance(self.newPoints[0], self.newPoints[1]);

        var pinchRatio = endDistanceBetweenFingers / self.startDistanceBetweenFingers;

        var newWidth = Math.floor(currentWidth * pinchRatio);
        var newHeight = Math.floor(currentHeight * pinchRatio);

        // This is the translation due to pinch-zooming
        var translateFromZoomingX = (currentWidth - newWidth) * self.percentageOfImageAtPinchPointX;
        var translateFromZoomingY = (currentHeight - newHeight) * self.percentageOfImageAtPinchPointY;

        // Point between the two touches
        var centerPointEndX = (self.newPoints[0].x + self.newPoints[1].x) / 2 - $(window).scrollLeft();
        var centerPointEndY = (self.newPoints[0].y + self.newPoints[1].y) / 2 - $(window).scrollTop();

        // And this is the translation due to translation of the centerpoint
        // between the two fingers
        var translateFromTranslatingX = centerPointEndX - self.centerPointStartX;
        var translateFromTranslatingY = centerPointEndY - self.centerPointStartY;

        // The new offset is the old/current one plus the total translation
        var newOffsetX = currentOffsetX + (translateFromZoomingX + translateFromTranslatingX);
        var newOffsetY = currentOffsetY + (translateFromZoomingY + translateFromTranslatingY);

        var newPos = {
          top: newOffsetY,
          left: newOffsetX,
          scaleX: pinchRatio,
          scaleY: pinchRatio
        };

        self.canTap = false;

        self.newWidth = newWidth;
        self.newHeight = newHeight;

        self.contentLastPos = newPos;

        if (self.requestId) {
          cancelAFrame(self.requestId);
        }

        self.requestId = requestAFrame(function () {
          $.fancybox.setTranslate(self.$content, self.contentLastPos);
        });
      };

      Guestures.prototype.ontouchend = function (e) {
        var self = this;

        var swiping = self.isSwiping;
        var panning = self.isPanning;
        var zooming = self.isZooming;
        var scrolling = self.isScrolling;

        self.endPoints = getPointerXY(e);
        self.dMs = Math.max(new Date().getTime() - self.startTime, 1);

        self.$container.removeClass("fancybox-is-grabbing");

        $(document).off(".fb.touch");

        document.removeEventListener("scroll", self.onscroll, true);

        if (self.requestId) {
          cancelAFrame(self.requestId);

          self.requestId = null;
        }

        self.isSwiping = false;
        self.isPanning = false;
        self.isZooming = false;
        self.isScrolling = false;

        self.instance.isDragging = false;

        if (self.canTap) {
          return self.onTap(e);
        }

        self.speed = 100;

        // Speed in px/ms
        self.velocityX = (self.distanceX / self.dMs) * 0.5;
        self.velocityY = (self.distanceY / self.dMs) * 0.5;

        if (panning) {
          self.endPanning();
        } else if (zooming) {
          self.endZooming();
        } else {
          self.endSwiping(swiping, scrolling);
        }

        return;
      };

      Guestures.prototype.endSwiping = function (swiping, scrolling) {
        var self = this,
          ret = false,
          len = self.instance.group.length,
          distanceX = Math.abs(self.distanceX),
          canAdvance = swiping == "x" && len > 1 && ((self.dMs > 130 && distanceX > 10) || distanceX > 50),
          speedX = 300;

        self.sliderLastPos = null;

        // Close if swiped vertically / navigate if horizontally
        if (swiping == "y" && !scrolling && Math.abs(self.distanceY) > 50) {
          // Continue vertical movement
          $.fancybox.animate(
            self.instance.current.$slide, {
              top: self.sliderStartPos.top + self.distanceY + self.velocityY * 150,
              opacity: 0
            },
            200
          );
          ret = self.instance.close(true, 250);
        } else if (canAdvance && self.distanceX > 0) {
          ret = self.instance.previous(speedX);
        } else if (canAdvance && self.distanceX < 0) {
          ret = self.instance.next(speedX);
        }

        if (ret === false && (swiping == "x" || swiping == "y")) {
          self.instance.centerSlide(200);
        }

        self.$container.removeClass("fancybox-is-sliding");
      };

      // Limit panning from edges
      // ========================
      Guestures.prototype.endPanning = function () {
        var self = this,
          newOffsetX,
          newOffsetY,
          newPos;

        if (!self.contentLastPos) {
          return;
        }

        if (self.opts.momentum === false || self.dMs > 350) {
          newOffsetX = self.contentLastPos.left;
          newOffsetY = self.contentLastPos.top;
        } else {
          // Continue movement
          newOffsetX = self.contentLastPos.left + self.velocityX * 500;
          newOffsetY = self.contentLastPos.top + self.velocityY * 500;
        }

        newPos = self.limitPosition(newOffsetX, newOffsetY, self.contentStartPos.width, self.contentStartPos.height);

        newPos.width = self.contentStartPos.width;
        newPos.height = self.contentStartPos.height;

        $.fancybox.animate(self.$content, newPos, 366);
      };

      Guestures.prototype.endZooming = function () {
        var self = this;

        var current = self.instance.current;

        var newOffsetX, newOffsetY, newPos, reset;

        var newWidth = self.newWidth;
        var newHeight = self.newHeight;

        if (!self.contentLastPos) {
          return;
        }

        newOffsetX = self.contentLastPos.left;
        newOffsetY = self.contentLastPos.top;

        reset = {
          top: newOffsetY,
          left: newOffsetX,
          width: newWidth,
          height: newHeight,
          scaleX: 1,
          scaleY: 1
        };

        // Reset scalex/scaleY values; this helps for perfomance and does not break animation
        $.fancybox.setTranslate(self.$content, reset);

        if (newWidth < self.canvasWidth && newHeight < self.canvasHeight) {
          self.instance.scaleToFit(150);
        } else if (newWidth > current.width || newHeight > current.height) {
          self.instance.scaleToActual(self.centerPointStartX, self.centerPointStartY, 150);
        } else {
          newPos = self.limitPosition(newOffsetX, newOffsetY, newWidth, newHeight);

          $.fancybox.animate(self.$content, newPos, 150);
        }
      };

      Guestures.prototype.onTap = function (e) {
        var self = this;
        var $target = $(e.target);

        var instance = self.instance;
        var current = instance.current;

        var endPoints = (e && getPointerXY(e)) || self.startPoints;

        var tapX = endPoints[0] ? endPoints[0].x - $(window).scrollLeft() - self.stagePos.left : 0;
        var tapY = endPoints[0] ? endPoints[0].y - $(window).scrollTop() - self.stagePos.top : 0;

        var where;

        var process = function (prefix) {
          var action = current.opts[prefix];

          if ($.isFunction(action)) {
            action = action.apply(instance, [current, e]);
          }

          if (!action) {
            return;
          }

          switch (action) {
            case "close":
              instance.close(self.startEvent);

              break;

            case "toggleControls":
              instance.toggleControls();

              break;

            case "next":
              instance.next();

              break;

            case "nextOrClose":
              if (instance.group.length > 1) {
                instance.next();
              } else {
                instance.close(self.startEvent);
              }

              break;

            case "zoom":
              if (current.type == "image" && (current.isLoaded || current.$ghost)) {
                if (instance.canPan()) {
                  instance.scaleToFit();
                } else if (instance.isScaledDown()) {
                  instance.scaleToActual(tapX, tapY);
                } else if (instance.group.length < 2) {
                  instance.close(self.startEvent);
                }
              }

              break;
          }
        };

        // Ignore right click
        if (e.originalEvent && e.originalEvent.button == 2) {
          return;
        }

        // Skip if clicked on the scrollbar
        if (!$target.is("img") && tapX > $target[0].clientWidth + $target.offset().left) {
          return;
        }

        // Check where is clicked
        if ($target.is(".fancybox-bg,.fancybox-inner,.fancybox-outer,.fancybox-container")) {
          where = "Outside";
        } else if ($target.is(".fancybox-slide")) {
          where = "Slide";
        } else if (
          instance.current.$content &&
          instance.current.$content
          .find($target)
          .addBack()
          .filter($target).length
        ) {
          where = "Content";
        } else {
          return;
        }

        // Check if this is a double tap
        if (self.tapped) {
          // Stop previously created single tap
          clearTimeout(self.tapped);
          self.tapped = null;

          // Skip if distance between taps is too big
          if (Math.abs(tapX - self.tapX) > 50 || Math.abs(tapY - self.tapY) > 50) {
            return this;
          }

          // OK, now we assume that this is a double-tap
          process("dblclick" + where);
        } else {
          // Single tap will be processed if user has not clicked second time within 300ms
          // or there is no need to wait for double-tap
          self.tapX = tapX;
          self.tapY = tapY;

          if (current.opts["dblclick" + where] && current.opts["dblclick" + where] !== current.opts["click" + where]) {
            self.tapped = setTimeout(function () {
              self.tapped = null;

              if (!instance.isAnimating) {
                process("click" + where);
              }
            }, 500);
          } else {
            process("click" + where);
          }
        }

        return this;
      };

      $(document)
        .on("onActivate.fb", function (e, instance) {
          if (instance && !instance.Guestures) {
            instance.Guestures = new Guestures(instance);
          }
        })
        .on("beforeClose.fb", function (e, instance) {
          if (instance && instance.Guestures) {
            instance.Guestures.destroy();
          }
        });
    })(window, document, jQuery);
    // ==========================================================================
    //
    // SlideShow
    // Enables slideshow functionality
    //
    // Example of usage:
    // $.fancybox.getInstance().SlideShow.start()
    //
    // ==========================================================================
    (function (document, $) {

      $.extend(true, $.fancybox.defaults, {
        btnTpl: {
          slideShow: '<button data-fancybox-play class="fancybox-button fancybox-button--play" title="{{PLAY_START}}">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6.5 5.4v13.2l11-6.6z"/></svg>' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8.33 5.75h2.2v12.5h-2.2V5.75zm5.15 0h2.2v12.5h-2.2V5.75z"/></svg>' +
            "</button>"
        },
        slideShow: {
          autoStart: false,
          speed: 3000,
          progress: true
        }
      });

      var SlideShow = function (instance) {
        this.instance = instance;
        this.init();
      };

      $.extend(SlideShow.prototype, {
        timer: null,
        isActive: false,
        $button: null,

        init: function () {
          var self = this,
            instance = self.instance,
            opts = instance.group[instance.currIndex].opts.slideShow;

          self.$button = instance.$refs.toolbar.find("[data-fancybox-play]").on("click", function () {
            self.toggle();
          });

          if (instance.group.length < 2 || !opts) {
            self.$button.hide();
          } else if (opts.progress) {
            self.$progress = $('<div class="fancybox-progress"></div>').appendTo(instance.$refs.inner);
          }
        },

        set: function (force) {
          var self = this,
            instance = self.instance,
            current = instance.current;

          // Check if reached last element
          if (current && (force === true || current.opts.loop || instance.currIndex < instance.group.length - 1)) {
            if (self.isActive && current.contentType !== "video") {
              if (self.$progress) {
                $.fancybox.animate(self.$progress.show(), {
                  scaleX: 1
                }, current.opts.slideShow.speed);
              }

              self.timer = setTimeout(function () {
                if (!instance.current.opts.loop && instance.current.index == instance.group.length - 1) {
                  instance.jumpTo(0);
                } else {
                  instance.next();
                }
              }, current.opts.slideShow.speed);
            }
          } else {
            self.stop();
            instance.idleSecondsCounter = 0;
            instance.showControls();
          }
        },

        clear: function () {
          var self = this;

          clearTimeout(self.timer);

          self.timer = null;

          if (self.$progress) {
            self.$progress.removeAttr("style").hide();
          }
        },

        start: function () {
          var self = this,
            current = self.instance.current;

          if (current) {
            self.$button
              .attr("title", (current.opts.i18n[current.opts.lang] || current.opts.i18n.en).PLAY_STOP)
              .removeClass("fancybox-button--play")
              .addClass("fancybox-button--pause");

            self.isActive = true;

            if (current.isComplete) {
              self.set(true);
            }

            self.instance.trigger("onSlideShowChange", true);
          }
        },

        stop: function () {
          var self = this,
            current = self.instance.current;

          self.clear();

          self.$button
            .attr("title", (current.opts.i18n[current.opts.lang] || current.opts.i18n.en).PLAY_START)
            .removeClass("fancybox-button--pause")
            .addClass("fancybox-button--play");

          self.isActive = false;

          self.instance.trigger("onSlideShowChange", false);

          if (self.$progress) {
            self.$progress.removeAttr("style").hide();
          }
        },

        toggle: function () {
          var self = this;

          if (self.isActive) {
            self.stop();
          } else {
            self.start();
          }
        }
      });

      $(document).on({
        "onInit.fb": function (e, instance) {
          if (instance && !instance.SlideShow) {
            instance.SlideShow = new SlideShow(instance);
          }
        },

        "beforeShow.fb": function (e, instance, current, firstRun) {
          var SlideShow = instance && instance.SlideShow;

          if (firstRun) {
            if (SlideShow && current.opts.slideShow.autoStart) {
              SlideShow.start();
            }
          } else if (SlideShow && SlideShow.isActive) {
            SlideShow.clear();
          }
        },

        "afterShow.fb": function (e, instance, current) {
          var SlideShow = instance && instance.SlideShow;

          if (SlideShow && SlideShow.isActive) {
            SlideShow.set();
          }
        },

        "afterKeydown.fb": function (e, instance, current, keypress, keycode) {
          var SlideShow = instance && instance.SlideShow;

          // "P" or Spacebar
          if (SlideShow && current.opts.slideShow && (keycode === 80 || keycode === 32) && !$(document.activeElement).is("button,a,input")) {
            keypress.preventDefault();

            SlideShow.toggle();
          }
        },

        "beforeClose.fb onDeactivate.fb": function (e, instance) {
          var SlideShow = instance && instance.SlideShow;

          if (SlideShow) {
            SlideShow.stop();
          }
        }
      });

      // Page Visibility API to pause slideshow when window is not active
      $(document).on("visibilitychange", function () {
        var instance = $.fancybox.getInstance(),
          SlideShow = instance && instance.SlideShow;

        if (SlideShow && SlideShow.isActive) {
          if (document.hidden) {
            SlideShow.clear();
          } else {
            SlideShow.set();
          }
        }
      });
    })(document, jQuery);
    // ==========================================================================
    //
    // FullScreen
    // Adds fullscreen functionality
    //
    // ==========================================================================
    (function (document, $) {

      // Collection of methods supported by user browser
      var fn = (function () {
        var fnMap = [
          ["requestFullscreen", "exitFullscreen", "fullscreenElement", "fullscreenEnabled", "fullscreenchange", "fullscreenerror"],
          // new WebKit
          [
            "webkitRequestFullscreen",
            "webkitExitFullscreen",
            "webkitFullscreenElement",
            "webkitFullscreenEnabled",
            "webkitfullscreenchange",
            "webkitfullscreenerror"
          ],
          // old WebKit (Safari 5.1)
          [
            "webkitRequestFullScreen",
            "webkitCancelFullScreen",
            "webkitCurrentFullScreenElement",
            "webkitCancelFullScreen",
            "webkitfullscreenchange",
            "webkitfullscreenerror"
          ],
          [
            "mozRequestFullScreen",
            "mozCancelFullScreen",
            "mozFullScreenElement",
            "mozFullScreenEnabled",
            "mozfullscreenchange",
            "mozfullscreenerror"
          ],
          ["msRequestFullscreen", "msExitFullscreen", "msFullscreenElement", "msFullscreenEnabled", "MSFullscreenChange", "MSFullscreenError"]
        ];

        var ret = {};

        for (var i = 0; i < fnMap.length; i++) {
          var val = fnMap[i];

          if (val && val[1] in document) {
            for (var j = 0; j < val.length; j++) {
              ret[fnMap[0][j]] = val[j];
            }

            return ret;
          }
        }

        return false;
      })();

      if (fn) {
        var FullScreen = {
          request: function (elem) {
            elem = elem || document.documentElement;

            elem[fn.requestFullscreen](elem.ALLOW_KEYBOARD_INPUT);
          },
          exit: function () {
            document[fn.exitFullscreen]();
          },
          toggle: function (elem) {
            elem = elem || document.documentElement;

            if (this.isFullscreen()) {
              this.exit();
            } else {
              this.request(elem);
            }
          },
          isFullscreen: function () {
            return Boolean(document[fn.fullscreenElement]);
          },
          enabled: function () {
            return Boolean(document[fn.fullscreenEnabled]);
          }
        };

        $.extend(true, $.fancybox.defaults, {
          btnTpl: {
            fullScreen: '<button data-fancybox-fullscreen class="fancybox-button fancybox-button--fsenter" title="{{FULL_SCREEN}}">' +
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>' +
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z"/></svg>' +
              "</button>"
          },
          fullScreen: {
            autoStart: false
          }
        });

        $(document).on(fn.fullscreenchange, function () {
          var isFullscreen = FullScreen.isFullscreen(),
            instance = $.fancybox.getInstance();

          if (instance) {
            // If image is zooming, then force to stop and reposition properly
            if (instance.current && instance.current.type === "image" && instance.isAnimating) {
              instance.isAnimating = false;

              instance.update(true, true, 0);

              if (!instance.isComplete) {
                instance.complete();
              }
            }

            instance.trigger("onFullscreenChange", isFullscreen);

            instance.$refs.container.toggleClass("fancybox-is-fullscreen", isFullscreen);

            instance.$refs.toolbar
              .find("[data-fancybox-fullscreen]")
              .toggleClass("fancybox-button--fsenter", !isFullscreen)
              .toggleClass("fancybox-button--fsexit", isFullscreen);
          }
        });
      }

      $(document).on({
        "onInit.fb": function (e, instance) {
          var $container;

          if (!fn) {
            instance.$refs.toolbar.find("[data-fancybox-fullscreen]").remove();

            return;
          }

          if (instance && instance.group[instance.currIndex].opts.fullScreen) {
            $container = instance.$refs.container;

            $container.on("click.fb-fullscreen", "[data-fancybox-fullscreen]", function (e) {
              e.stopPropagation();
              e.preventDefault();

              FullScreen.toggle();
            });

            if (instance.opts.fullScreen && instance.opts.fullScreen.autoStart === true) {
              FullScreen.request();
            }

            // Expose API
            instance.FullScreen = FullScreen;
          } else if (instance) {
            instance.$refs.toolbar.find("[data-fancybox-fullscreen]").hide();
          }
        },

        "afterKeydown.fb": function (e, instance, current, keypress, keycode) {
          // "F"
          if (instance && instance.FullScreen && keycode === 70) {
            keypress.preventDefault();

            instance.FullScreen.toggle();
          }
        },

        "beforeClose.fb": function (e, instance) {
          if (instance && instance.FullScreen && instance.$refs.container.hasClass("fancybox-is-fullscreen")) {
            FullScreen.exit();
          }
        }
      });
    })(document, jQuery);
    // ==========================================================================
    //
    // Thumbs
    // Displays thumbnails in a grid
    //
    // ==========================================================================
    (function (document, $) {

      var CLASS = "fancybox-thumbs",
        CLASS_ACTIVE = CLASS + "-active";

      // Make sure there are default values
      $.fancybox.defaults = $.extend(
        true, {
          btnTpl: {
            thumbs: '<button data-fancybox-thumbs class="fancybox-button fancybox-button--thumbs" title="{{THUMBS}}">' +
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14.59 14.59h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76H5.65v-3.76zm8.94-4.47h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76H5.65v-3.76zm8.94-4.47h3.76v3.76h-3.76V5.65zm-4.47 0h3.76v3.76h-3.76V5.65zm-4.47 0h3.76v3.76H5.65V5.65z"/></svg>' +
              "</button>"
          },
          thumbs: {
            autoStart: false, // Display thumbnails on opening
            hideOnClose: true, // Hide thumbnail grid when closing animation starts
            parentEl: ".fancybox-container", // Container is injected into this element
            axis: "y" // Vertical (y) or horizontal (x) scrolling
          }
        },
        $.fancybox.defaults
      );

      var FancyThumbs = function (instance) {
        this.init(instance);
      };

      $.extend(FancyThumbs.prototype, {
        $button: null,
        $grid: null,
        $list: null,
        isVisible: false,
        isActive: false,

        init: function (instance) {
          var self = this,
            group = instance.group,
            enabled = 0;

          self.instance = instance;
          self.opts = group[instance.currIndex].opts.thumbs;

          instance.Thumbs = self;

          self.$button = instance.$refs.toolbar.find("[data-fancybox-thumbs]");

          // Enable thumbs if at least two group items have thumbnails
          for (var i = 0, len = group.length; i < len; i++) {
            if (group[i].thumb) {
              enabled++;
            }

            if (enabled > 1) {
              break;
            }
          }

          if (enabled > 1 && !!self.opts) {
            self.$button.removeAttr("style").on("click", function () {
              self.toggle();
            });

            self.isActive = true;
          } else {
            self.$button.hide();
          }
        },

        create: function () {
          var self = this,
            instance = self.instance,
            parentEl = self.opts.parentEl,
            list = [],
            src;

          if (!self.$grid) {
            // Create main element
            self.$grid = $('<div class="' + CLASS + " " + CLASS + "-" + self.opts.axis + '"></div>').appendTo(
              instance.$refs.container
              .find(parentEl)
              .addBack()
              .filter(parentEl)
            );

            // Add "click" event that performs gallery navigation
            self.$grid.on("click", "a", function () {
              instance.jumpTo($(this).attr("data-index"));
            });
          }

          // Build the list
          if (!self.$list) {
            self.$list = $('<div class="' + CLASS + '__list">').appendTo(self.$grid);
          }

          $.each(instance.group, function (i, item) {
            src = item.thumb;

            if (!src && item.type === "image") {
              src = item.src;
            }

            list.push(
              '<a href="javascript:;" tabindex="0" data-index="' +
              i +
              '"' +
              (src && src.length ? ' style="background-image:url(' + src + ')"' : 'class="fancybox-thumbs-missing"') +
              "></a>"
            );
          });

          self.$list[0].innerHTML = list.join("");

          if (self.opts.axis === "x") {
            // Set fixed width for list element to enable horizontal scrolling
            self.$list.width(
              parseInt(self.$grid.css("padding-right"), 10) +
              instance.group.length *
              self.$list
              .children()
              .eq(0)
              .outerWidth(true)
            );
          }
        },

        focus: function (duration) {
          var self = this,
            $list = self.$list,
            $grid = self.$grid,
            thumb,
            thumbPos;

          if (!self.instance.current) {
            return;
          }

          thumb = $list
            .children()
            .removeClass(CLASS_ACTIVE)
            .filter('[data-index="' + self.instance.current.index + '"]')
            .addClass(CLASS_ACTIVE);

          thumbPos = thumb.position();

          // Check if need to scroll to make current thumb visible
          if (self.opts.axis === "y" && (thumbPos.top < 0 || thumbPos.top > $list.height() - thumb.outerHeight())) {
            $list.stop().animate({
                scrollTop: $list.scrollTop() + thumbPos.top
              },
              duration
            );
          } else if (
            self.opts.axis === "x" &&
            (thumbPos.left < $grid.scrollLeft() || thumbPos.left > $grid.scrollLeft() + ($grid.width() - thumb.outerWidth()))
          ) {
            $list
              .parent()
              .stop()
              .animate({
                  scrollLeft: thumbPos.left
                },
                duration
              );
          }
        },

        update: function () {
          var that = this;
          that.instance.$refs.container.toggleClass("fancybox-show-thumbs", this.isVisible);

          if (that.isVisible) {
            if (!that.$grid) {
              that.create();
            }

            that.instance.trigger("onThumbsShow");

            that.focus(0);
          } else if (that.$grid) {
            that.instance.trigger("onThumbsHide");
          }

          // Update content position
          that.instance.update();
        },

        hide: function () {
          this.isVisible = false;
          this.update();
        },

        show: function () {
          this.isVisible = true;
          this.update();
        },

        toggle: function () {
          this.isVisible = !this.isVisible;
          this.update();
        }
      });

      $(document).on({
        "onInit.fb": function (e, instance) {
          var Thumbs;

          if (instance && !instance.Thumbs) {
            Thumbs = new FancyThumbs(instance);

            if (Thumbs.isActive && Thumbs.opts.autoStart === true) {
              Thumbs.show();
            }
          }
        },

        "beforeShow.fb": function (e, instance, item, firstRun) {
          var Thumbs = instance && instance.Thumbs;

          if (Thumbs && Thumbs.isVisible) {
            Thumbs.focus(firstRun ? 0 : 250);
          }
        },

        "afterKeydown.fb": function (e, instance, current, keypress, keycode) {
          var Thumbs = instance && instance.Thumbs;

          // "G"
          if (Thumbs && Thumbs.isActive && keycode === 71) {
            keypress.preventDefault();

            Thumbs.toggle();
          }
        },

        "beforeClose.fb": function (e, instance) {
          var Thumbs = instance && instance.Thumbs;

          if (Thumbs && Thumbs.isVisible && Thumbs.opts.hideOnClose !== false) {
            Thumbs.$grid.hide();
          }
        }
      });
    })(document, jQuery);
    //// ==========================================================================
    //
    // Share
    // Displays simple form for sharing current url
    //
    // ==========================================================================
    (function (document, $) {

      $.extend(true, $.fancybox.defaults, {
        btnTpl: {
          share: '<button data-fancybox-share class="fancybox-button fancybox-button--share" title="{{SHARE}}">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2.55 19c1.4-8.4 9.1-9.8 11.9-9.8V5l7 7-7 6.3v-3.5c-2.8 0-10.5 2.1-11.9 4.2z"/></svg>' +
            "</button>"
        },
        share: {
          url: function (instance, item) {
            return (
              (!instance.currentHash && !(item.type === "inline" || item.type === "html") ? item.origSrc || item.src : false) || window.location
            );
          },
          tpl: '<div class="fancybox-share">' +
            "<h1>{{SHARE}}</h1>" +
            "<p>" +
            '<a class="fancybox-share__button fancybox-share__button--fb" href="https://www.facebook.com/sharer/sharer.php?u={{url}}">' +
            '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m287 456v-299c0-21 6-35 35-35h38v-63c-7-1-29-3-55-3-54 0-91 33-91 94v306m143-254h-205v72h196" /></svg>' +
            "<span>Facebook</span>" +
            "</a>" +
            '<a class="fancybox-share__button fancybox-share__button--tw" href="https://twitter.com/intent/tweet?url={{url}}&text={{descr}}">' +
            '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m456 133c-14 7-31 11-47 13 17-10 30-27 37-46-15 10-34 16-52 20-61-62-157-7-141 75-68-3-129-35-169-85-22 37-11 86 26 109-13 0-26-4-37-9 0 39 28 72 65 80-12 3-25 4-37 2 10 33 41 57 77 57-42 30-77 38-122 34 170 111 378-32 359-208 16-11 30-25 41-42z" /></svg>' +
            "<span>Twitter</span>" +
            "</a>" +
            '<a class="fancybox-share__button fancybox-share__button--pt" href="https://www.pinterest.com/pin/create/button/?url={{url}}&description={{descr}}&media={{media}}">' +
            '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m265 56c-109 0-164 78-164 144 0 39 15 74 47 87 5 2 10 0 12-5l4-19c2-6 1-8-3-13-9-11-15-25-15-45 0-58 43-110 113-110 62 0 96 38 96 88 0 67-30 122-73 122-24 0-42-19-36-44 6-29 20-60 20-81 0-19-10-35-31-35-25 0-44 26-44 60 0 21 7 36 7 36l-30 125c-8 37-1 83 0 87 0 3 4 4 5 2 2-3 32-39 42-75l16-64c8 16 31 29 56 29 74 0 124-67 124-157 0-69-58-132-146-132z" fill="#fff"/></svg>' +
            "<span>Pinterest</span>" +
            "</a>" +
            "</p>" +
            '<p><input class="fancybox-share__input" type="text" value="{{url_raw}}" onclick="select()" /></p>' +
            "</div>"
        }
      });

      function escapeHtml(string) {
        var entityMap = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
          "/": "&#x2F;",
          "`": "&#x60;",
          "=": "&#x3D;"
        };

        return String(string).replace(/[&<>"'`=\/]/g, function (s) {
          return entityMap[s];
        });
      }

      $(document).on("click", "[data-fancybox-share]", function () {
        var instance = $.fancybox.getInstance(),
          current = instance.current || null,
          url,
          tpl;

        if (!current) {
          return;
        }

        if ($.type(current.opts.share.url) === "function") {
          url = current.opts.share.url.apply(current, [instance, current]);
        }

        tpl = current.opts.share.tpl
          .replace(/\{\{media\}\}/g, current.type === "image" ? encodeURIComponent(current.src) : "")
          .replace(/\{\{url\}\}/g, encodeURIComponent(url))
          .replace(/\{\{url_raw\}\}/g, escapeHtml(url))
          .replace(/\{\{descr\}\}/g, instance.$caption ? encodeURIComponent(instance.$caption.text()) : "");

        $.fancybox.open({
          src: instance.translate(instance, tpl),
          type: "html",
          opts: {
            touch: false,
            animationEffect: false,
            afterLoad: function (shareInstance, shareCurrent) {
              // Close self if parent instance is closing
              instance.$refs.container.one("beforeClose.fb", function () {
                shareInstance.close(null, 0);
              });

              // Opening links in a popup window
              shareCurrent.$content.find(".fancybox-share__button").click(function () {
                window.open(this.href, "Share", "width=550, height=450");
                return false;
              });
            },
            mobile: {
              autoFocus: false
            }
          }
        });
      });
    })(document, jQuery);
    // ==========================================================================
    //
    // Hash
    // Enables linking to each modal
    //
    // ==========================================================================
    (function (window, document, $) {

      // Simple $.escapeSelector polyfill (for jQuery prior v3)
      if (!$.escapeSelector) {
        $.escapeSelector = function (sel) {
          var rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\x80-\uFFFF\w-]/g;
          var fcssescape = function (ch, asCodePoint) {
            if (asCodePoint) {
              // U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
              if (ch === "\0") {
                return "\uFFFD";
              }

              // Control characters and (dependent upon position) numbers get escaped as code points
              return ch.slice(0, -1) + "\\" + ch.charCodeAt(ch.length - 1).toString(16) + " ";
            }

            // Other potentially-special ASCII characters get backslash-escaped
            return "\\" + ch;
          };

          return (sel + "").replace(rcssescape, fcssescape);
        };
      }

      // Get info about gallery name and current index from url
      function parseUrl() {
        var hash = window.location.hash.substr(1),
          rez = hash.split("-"),
          index = rez.length > 1 && /^\+?\d+$/.test(rez[rez.length - 1]) ? parseInt(rez.pop(-1), 10) || 1 : 1,
          gallery = rez.join("-");

        return {
          hash: hash,
          /* Index is starting from 1 */
          index: index < 1 ? 1 : index,
          gallery: gallery
        };
      }

      // Trigger click evnt on links to open new fancyBox instance
      function triggerFromUrl(url) {
        if (url.gallery !== "") {
          // If we can find element matching 'data-fancybox' atribute,
          // then triggering click event should start fancyBox
          $("[data-fancybox='" + $.escapeSelector(url.gallery) + "']")
            .eq(url.index - 1)
            .focus()
            .trigger("click.fb-start");
        }
      }

      // Get gallery name from current instance
      function getGalleryID(instance) {
        var opts, ret;

        if (!instance) {
          return false;
        }

        opts = instance.current ? instance.current.opts : instance.opts;
        ret = opts.hash || (opts.$orig ? opts.$orig.data("fancybox") || opts.$orig.data("fancybox-trigger") : "");

        return ret === "" ? false : ret;
      }

      // Start when DOM becomes ready
      $(function () {
        // Check if user has disabled this module
        if ($.fancybox.defaults.hash === false) {
          return;
        }

        // Update hash when opening/closing fancyBox
        $(document).on({
          "onInit.fb": function (e, instance) {
            var url, gallery;

            if (instance.group[instance.currIndex].opts.hash === false) {
              return;
            }

            url = parseUrl();
            gallery = getGalleryID(instance);

            // Make sure gallery start index matches index from hash
            if (gallery && url.gallery && gallery == url.gallery) {
              instance.currIndex = url.index - 1;
            }
          },

          "beforeShow.fb": function (e, instance, current, firstRun) {
            var gallery;

            if (!current || current.opts.hash === false) {
              return;
            }

            // Check if need to update window hash
            gallery = getGalleryID(instance);

            if (!gallery) {
              return;
            }

            // Variable containing last hash value set by fancyBox
            // It will be used to determine if fancyBox needs to close after hash change is detected
            instance.currentHash = gallery + (instance.group.length > 1 ? "-" + (current.index + 1) : "");

            // If current hash is the same (this instance most likely is opened by hashchange), then do nothing
            if (window.location.hash === "#" + instance.currentHash) {
              return;
            }

            if (firstRun && !instance.origHash) {
              instance.origHash = window.location.hash;
            }

            if (instance.hashTimer) {
              clearTimeout(instance.hashTimer);
            }

            // Update hash
            instance.hashTimer = setTimeout(function () {
              if ("replaceState" in window.history) {
                window.history[firstRun ? "pushState" : "replaceState"]({},
                  document.title,
                  window.location.pathname + window.location.search + "#" + instance.currentHash
                );

                if (firstRun) {
                  instance.hasCreatedHistory = true;
                }
              } else {
                window.location.hash = instance.currentHash;
              }

              instance.hashTimer = null;
            }, 300);
          },

          "beforeClose.fb": function (e, instance, current) {
            if (!current || current.opts.hash === false) {
              return;
            }

            clearTimeout(instance.hashTimer);

            // Goto previous history entry
            if (instance.currentHash && instance.hasCreatedHistory) {
              window.history.back();
            } else if (instance.currentHash) {
              if ("replaceState" in window.history) {
                window.history.replaceState({}, document.title, window.location.pathname + window.location.search + (instance.origHash || ""));
              } else {
                window.location.hash = instance.origHash;
              }
            }

            instance.currentHash = null;
          }
        });

        // Check if need to start/close after url has changed
        $(window).on("hashchange.fb", function () {
          var url = parseUrl(),
            fb = null;

          // Find last fancyBox instance that has "hash"
          $.each(
            $(".fancybox-container")
            .get()
            .reverse(),
            function (index, value) {
              var tmp = $(value).data("FancyBox");

              if (tmp && tmp.currentHash) {
                fb = tmp;
                return false;
              }
            }
          );

          if (fb) {
            // Now, compare hash values
            if (fb.currentHash !== url.gallery + "-" + url.index && !(url.index === 1 && fb.currentHash == url.gallery)) {
              fb.currentHash = null;

              fb.close();
            }
          } else if (url.gallery !== "") {
            triggerFromUrl(url);
          }
        });

        // Check current hash and trigger click event on matching element to start fancyBox, if needed
        setTimeout(function () {
          if (!$.fancybox.getInstance()) {
            triggerFromUrl(parseUrl());
          }
        }, 50);
      });
    })(window, document, jQuery);
    // ==========================================================================
    //
    // Wheel
    // Basic mouse weheel support for gallery navigation
    //
    // ==========================================================================
    (function (document, $) {

      var prevTime = new Date().getTime();

      $(document).on({
        "onInit.fb": function (e, instance, current) {
          instance.$refs.stage.on("mousewheel DOMMouseScroll wheel MozMousePixelScroll", function (e) {
            var current = instance.current,
              currTime = new Date().getTime();

            if (instance.group.length < 2 || current.opts.wheel === false || (current.opts.wheel === "auto" && current.type !== "image")) {
              return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (current.$slide.hasClass("fancybox-animated")) {
              return;
            }

            e = e.originalEvent || e;

            if (currTime - prevTime < 250) {
              return;
            }

            prevTime = currTime;

            instance[(-e.deltaY || -e.deltaX || e.wheelDelta || -e.detail) < 0 ? "next" : "previous"]();
          });
        }
      });
    })(document, jQuery);

    var modal = (function () {
      var $buttons = $('[data-fancybox]');

      if ($buttons.length) {
        $buttons.each(function () {
          var $button = $(this);
          var options = {
            touch: false,
            btnTpl: {
              smallBtn: ''
            }
          };
          $button.fancybox(options);
        });
      }
    });

    /*!
     * Custom Select jQuery Plugin
     */

    const CustomSelect = (($) => {

      const defaults = {
        block: 'custom-select',
        hideCallback: false,
        includeValue: false,
        keyboard: true,
        modifier: false,
        placeholder: false,
        search: false,
        showCallback: false,
        transition: 0
      };

      class CustomSelect {

        /**
         * Custom Select
         *
         * @param {Element} select Original `<select>` DOM element to customize.
         * @param {(Object|string)=} options Settings object or method name.
         * @param {string=} options.block Custom select BEM block name.
         * @param {Function=} options.hideCallback Fires after dropdown closes.
         * @param {boolean=} options.includeValue Adds chosen value option to
         *     dropdown. If enabled also cancels dropdown options rerender.
         * @param {boolean=} options.keyboard Enables keyboard control.
         * @param {string=} options.modifier Custom select block BEM modifier.
         * @param {string=} options.placeholder Placeholder hint, can be an HTML
         *     string (appears only if there is no explicitly selected options).
         * @param {boolean=} options.search Adds input to filter options.
         * @param {Function=} options.showCallback Fires after dropdown opens.
         * @param {(number|string)=} options.transition jQuery slideUp/Down param.
         */
        constructor(select, options) {
          this._$select = $(select);
          this._options = {
            ...defaults,
            ...typeof options === 'object' ? options : {}
          };

          // Modifiers
          this._activeModifier = `${this._options.block}--active`;
          this._dropupModifier = `${this._options.block}--dropup`;
          this._optionSelectedModifier = `${this._options.block}__option--selected`;

          // Event handlers that can be removed
          this._keydown = this._keydown.bind(this);
          this._dropup = this._dropup.bind(this);
          this._outside = this._outside.bind(this);

          this._init();
        }

        /**
         * Resets custom select options.
         *
         * @public
         */
        reset() {
          this._$dropdown.hide().empty();
          this._$value.off('click');

          this._fill();
        }

        /**
         * Renders initial state of custom select & sets
         * options click event listeners.
         *
         * @private
         */
        _init() {
          this._$element = $(
            `<div class="${this._options.block}">
           <button class="${this._options.block}__option ${this._options.block}__option--value" type="button"></button>
           <div class="${this._options.block}__dropdown" style="display: none;"></div>
         </div>`
          );

          this._$select
            .hide()
            .after(this._$element);

          if (this._options.modifier) {
            this._$element.addClass(this._options.modifier);
          }

          this._$value = this._$element.find(`.${this._options.block}__option--value`);
          this._$dropdown = this._$element.find(`.${this._options.block}__dropdown`);

          this._fill();
        }

        /**
         * Renders custom select options by original
         * select element options.
         *
         * @private
         */
        _fill() {
          this._$values = this._$select.find('option');
          this._values = [];

          let placeholder = this._options.placeholder;

          $.each(this._$values, (i, option) => {
            const el = $(option).text().trim();
            this._values.push(el);
          });

          if (placeholder) {
            // Check explicitly selected option
            if (this._$select.find('[selected]').length) {
              placeholder = false;
            } else {
              this._$value.html(placeholder);
              // Set select value to null
              this._$select.prop('selectedIndex', -1);
            }
          }

          $.each(this._values, (i, el) => {
            const cssClass = this._$values.eq(i).attr('class');
            const $option = $(
              `<button class="${this._options.block}__option" type="button">${el}</button>`
            );
            const $selected = this._$select.find(':selected');

            if (this._$values.eq(i).attr('disabled')) {
              $option.prop('disabled', true);
            }

            if ((!$selected.length && i === 0) || el === $selected.text().trim()) {
              if (!placeholder) {
                this._$value
                  .text(el)
                  .removeClass(this._$value.data('class')).removeData('class')
                  .addClass(cssClass).data('class', cssClass);
              }

              if (this._options.includeValue || placeholder) {
                $option.addClass(cssClass);
                $option.toggleClass(this._optionSelectedModifier, this._$values.eq(i).is('[selected]'));
                this._$dropdown.append($option);
              }
            } else {
              $option.addClass(cssClass);
              this._$dropdown.append($option);
            }
          });

          this._$options = this._$dropdown.find(`.${this._options.block}__option`);

          if (this._options.search) {
            this._search();
          }

          this._$value.one('click', event => {
            this._show(event);
          });

          this._$value.prop('disabled', !this._$options.length);

          this._$options.on('click', event => {
            this._select(event);
          });
        }

        /**
         * Shows custom select dropdown & sets outside
         * click listener to hide.
         *
         * @param {Object} event Value click jQuery event.
         * @private
         */
        _show(event) {
          event.preventDefault();

          this._dropup();
          $(window).on('resize scroll', this._dropup);

          this._$element.addClass(this._activeModifier);

          this._$dropdown.slideDown(this._options.transition, () => {
            if (this._options.search) {
              this._$input.focus();

              if (this._options.includeValue) {
                this._scroll();
              }
            }

            // Open callback
            if (typeof this._options.showCallback === 'function') {
              this._options.showCallback.call(this._$element[0]);
            }
          });

          setTimeout(() => {
            $(document).on('touchstart click', this._outside);
          }, 0);

          this._$value.one('click', event => {
            event.preventDefault();

            this._hide();
          });

          if (this._options.keyboard) {
            this._options.index = -1;
            $(window).on('keydown', this._keydown);
          }
        }

        /**
         * Hides custom select dropdown & resets events
         * listeners to initial.
         *
         * @private
         */
        _hide() {
          if (this._options.search) {
            this._$input.val('').blur();
            this._$options.show();
            this._$wrap.scrollTop(0);
          }

          this._$dropdown.slideUp(this._options.transition, () => {
            this._$element
              .removeClass(this._activeModifier)
              .removeClass(this._dropupModifier);

            // Close callback
            if (typeof this._options.hideCallback === 'function') {
              this._options.hideCallback.call(this._$element[0]);
            }

            this._$value
              .off('click')
              .one('click', event => {
                this._show(event);
              });
            $(document).off('touchstart click', this._outside);
            $(window).off('resize scroll', this._dropup);
          });

          if (this._options.keyboard) {
            this._$options.blur();
            $(window).off('keydown', this._keydown);
          }
        }

        /**
         * Centers chosen option in scrollable element
         * of dropdown.
         *
         * @private
         */
        _scroll() {
          $.each(this._$options, (i, option) => {
            const $option = $(option);

            if ($option.text() === this._$value.text()) {
              const top = $option.position().top;
              const height = this._$wrap.outerHeight();
              const center = height / 2 - $option.outerHeight() / 2;

              if (top > center) {
                this._$wrap.scrollTop(top - center);
              }

              return false;
            }
          });
        }

        /**
         * Changes value of custom select & `<select>`
         * by chosen option.
         *
         * @param {Object} event Option click jQuery event.
         * @private
         */
        _select(event) {
          event.preventDefault();

          const choice = $(event.currentTarget).text().trim();
          const values = [...this._values];

          this._$value
            .text(choice)
            .removeClass(this._$value.data('class'));
          this._$values.prop('selected', false);

          $.each(values, (i, el) => {
            if (!this._options.includeValue && el === choice) {
              values.splice(i, 1);
            }

            $.each(this._$values, (i, option) => {
              const $option = $(option);
              if ($option.text().trim() === choice) {
                const cssClass = $option.attr('class');

                $option.prop('selected', true);
                this._$value.addClass(cssClass).data('class', cssClass);
              }
            });
          });

          this._hide();

          if (!this._options.includeValue) {
            // Update dropdown options content
            if (this._$options.length > values.length) {
              const last = this._$options.eq(values.length);

              last.remove();
              this._$options = this._$options.not(last);

              if (!this._$options.length) {
                this._$value.prop('disabled', true);
              }
            }

            $.each(this._$options, (i, option) => {
              const $option = $(option);
              $option.text(values[i]);

              // Reset option class
              $option.attr('class', `${this._options.block}__option`);

              $.each(this._$values, function () {
                const $this = $(this);
                if ($this.text().trim() === values[i]) {
                  $option.addClass($this.attr('class'));
                  $option.prop('disabled', $this.prop('disabled'));
                }
              });
            });
          } else {
            // Select chosen option
            this._$options.removeClass(this._optionSelectedModifier);

            $.each(this._$options, (i, option) => {
              const $option = $(option);

              if ($option.text().trim() === choice) {
                $option.addClass(this._optionSelectedModifier);

                return false;
              }
            });
          }

          if (typeof event.originalEvent !== 'undefined') {
            this._$select.trigger('change');
          }
        }

        /**
         * Wraps options by wrap element, adds search
         * input to dropdown.
         *
         * @private
         */
        _search() {
          this._$input = $(`<input class="${this._options.block}__input" autocomplete="off">`);
          this._$dropdown.prepend(this._$input);

          // Add scrollable wrap
          this._$options.wrapAll(`<div class="${this._options.block}__option-wrap"></div>`);
          this._$wrap = this._$element.find(`.${this._options.block}__option-wrap`);

          this._$input.on('focus', () => {
            this._options.index = -1;
          });

          this._$input.on('keyup', () => {
            const query = this._$input.val().trim();

            if (query.length) {
              this._$wrap.scrollTop(0);

              setTimeout(() => {
                if (query === this._$input.val().trim()) {
                  $.each(this._$options, (i, option) => {
                    const $option = $(option);
                    const text = $option.text().trim().toLowerCase();
                    const match = text.indexOf(query.toLowerCase()) !== -1;

                    $option.toggle(match);
                  });
                }
              }, 300);
            } else {
              this._$options.show();
            }
          });
        }

        /**
         * Toggles custom select dropup modifier based
         * on space for dropdown below.
         *
         * @private
         */
        _dropup() {
          const bottom = this._$element[0].getBoundingClientRect().bottom;
          const up = $(window).height() - bottom < this._$dropdown.height();

          this._$element.toggleClass(this._dropupModifier, up);
        }

        /**
         * Hides dropdown if target of event (e.g. click
         * on `$window`) is not custom select.
         *
         * @param {Object} event Outside "click" jQuery event.
         * @private
         */
        _outside(event) {
          const $target = $(event.target);
          if (!$target.parents().is(this._$element) && !$target.is(this._$element)) {
            this._hide();
          }
        }

        /**
         * Controls navigation from keyboard by custom
         * select options.
         *
         * @param {Object} event Keydown jQuery event.
         * @private
         */
        _keydown(event) {
          const $visible = this._$options.filter(':visible').not('[disabled]');

          switch (event.which) {
            // Down
            case 40:
              event.preventDefault();

              const next = $visible.eq(this._options.index + 1).length;
              if (next) {
                this._options.index += 1;
              } else {
                this._options.index = 0;
              }

              $visible.eq(this._options.index).focus();
              break;

            // Up
            case 38:
              event.preventDefault();

              const prev = $visible.eq(this._options.index - 1).length;
              if (prev && this._options.index - 1 >= 0) {
                this._options.index -= 1;
              } else {
                this._options.index = $visible.length - 1;
              }

              $visible.eq(this._options.index).focus();
              break;

            // Enter
            case 13:

            // Space
            case 32:
              if (!this._$input || !this._$input.is(':focus')) {
                event.preventDefault();

                const $option = this._$options.add(this._$value).filter(':focus');
                $option.trigger('click');

                if (!$option.is(this._$value)) {
                  this._$select.trigger('change');
                }
                this._$value.focus();
              }
              break;

            // Esc
            case 27:
              event.preventDefault();

              this._hide();
              this._$value.focus();
              break;
          }
        }

        /**
         * Creates jQuery plugin function.
         *
         * @param {(Object|string)=} config Options or method.
         * @returns {Function} jQuery plugin.
         */
        static _jQueryPlugin(config) {
          return this.each(function () {
            const $this = $(this);
            let data = $this.data('custom-select');

            if (!data) {
              if (typeof config !== 'string') {
                data = new CustomSelect(this, config);
                $this.data('custom-select', data);
              }
            } else {
              if (config === 'reset') {
                data.reset();
              }
            }
          });
        }
      }

      $.fn['customSelect'] = CustomSelect._jQueryPlugin;
      $.fn['customSelect'].noConflict = () => $.fn['customSelect'];

      return CustomSelect;

    })(jquery);

    var customSelect = (function () {
      var $selects = $('select');

      if ($selects.length) {
        $selects.each(function () {
          var $select = $(this);
          $select.customSelect({});
        });
      }
    });

    /**
     * SSR Window 1.0.1
     * Better handling for window object in SSR environment
     * https://github.com/nolimits4web/ssr-window
     *
     * Copyright 2018, Vladimir Kharlampidi
     *
     * Licensed under MIT
     *
     * Released on: July 18, 2018
     */
    var doc = (typeof document === 'undefined') ? {
      body: {},
      addEventListener: function addEventListener() {},
      removeEventListener: function removeEventListener() {},
      activeElement: {
        blur: function blur() {},
        nodeName: '',
      },
      querySelector: function querySelector() {
        return null;
      },
      querySelectorAll: function querySelectorAll() {
        return [];
      },
      getElementById: function getElementById() {
        return null;
      },
      createEvent: function createEvent() {
        return {
          initEvent: function initEvent() {},
        };
      },
      createElement: function createElement() {
        return {
          children: [],
          childNodes: [],
          style: {},
          setAttribute: function setAttribute() {},
          getElementsByTagName: function getElementsByTagName() {
            return [];
          },
        };
      },
      location: { hash: '' },
    } : document; // eslint-disable-line

    var win = (typeof window === 'undefined') ? {
      document: doc,
      navigator: {
        userAgent: '',
      },
      location: {},
      history: {},
      CustomEvent: function CustomEvent() {
        return this;
      },
      addEventListener: function addEventListener() {},
      removeEventListener: function removeEventListener() {},
      getComputedStyle: function getComputedStyle() {
        return {
          getPropertyValue: function getPropertyValue() {
            return '';
          },
        };
      },
      Image: function Image() {},
      Date: function Date() {},
      screen: {},
      setTimeout: function setTimeout() {},
      clearTimeout: function clearTimeout() {},
    } : window; // eslint-disable-line

    /**
     * Dom7 2.1.3
     * Minimalistic JavaScript library for DOM manipulation, with a jQuery-compatible API
     * http://framework7.io/docs/dom.html
     *
     * Copyright 2019, Vladimir Kharlampidi
     * The iDangero.us
     * http://www.idangero.us/
     *
     * Licensed under MIT
     *
     * Released on: February 11, 2019
     */

    class Dom7 {
      constructor(arr) {
        const self = this;
        // Create array-like object
        for (let i = 0; i < arr.length; i += 1) {
          self[i] = arr[i];
        }
        self.length = arr.length;
        // Return collection with methods
        return this;
      }
    }

    function $$1(selector, context) {
      const arr = [];
      let i = 0;
      if (selector && !context) {
        if (selector instanceof Dom7) {
          return selector;
        }
      }
      if (selector) {
          // String
        if (typeof selector === 'string') {
          let els;
          let tempParent;
          const html = selector.trim();
          if (html.indexOf('<') >= 0 && html.indexOf('>') >= 0) {
            let toCreate = 'div';
            if (html.indexOf('<li') === 0) toCreate = 'ul';
            if (html.indexOf('<tr') === 0) toCreate = 'tbody';
            if (html.indexOf('<td') === 0 || html.indexOf('<th') === 0) toCreate = 'tr';
            if (html.indexOf('<tbody') === 0) toCreate = 'table';
            if (html.indexOf('<option') === 0) toCreate = 'select';
            tempParent = doc.createElement(toCreate);
            tempParent.innerHTML = html;
            for (i = 0; i < tempParent.childNodes.length; i += 1) {
              arr.push(tempParent.childNodes[i]);
            }
          } else {
            if (!context && selector[0] === '#' && !selector.match(/[ .<>:~]/)) {
              // Pure ID selector
              els = [doc.getElementById(selector.trim().split('#')[1])];
            } else {
              // Other selectors
              els = (context || doc).querySelectorAll(selector.trim());
            }
            for (i = 0; i < els.length; i += 1) {
              if (els[i]) arr.push(els[i]);
            }
          }
        } else if (selector.nodeType || selector === win || selector === doc) {
          // Node/element
          arr.push(selector);
        } else if (selector.length > 0 && selector[0].nodeType) {
          // Array of elements or instance of Dom
          for (i = 0; i < selector.length; i += 1) {
            arr.push(selector[i]);
          }
        }
      }
      return new Dom7(arr);
    }

    $$1.fn = Dom7.prototype;
    $$1.Class = Dom7;
    $$1.Dom7 = Dom7;

    function unique(arr) {
      const uniqueArray = [];
      for (let i = 0; i < arr.length; i += 1) {
        if (uniqueArray.indexOf(arr[i]) === -1) uniqueArray.push(arr[i]);
      }
      return uniqueArray;
    }

    // Classes and attributes
    function addClass(className) {
      if (typeof className === 'undefined') {
        return this;
      }
      const classes = className.split(' ');
      for (let i = 0; i < classes.length; i += 1) {
        for (let j = 0; j < this.length; j += 1) {
          if (typeof this[j] !== 'undefined' && typeof this[j].classList !== 'undefined') this[j].classList.add(classes[i]);
        }
      }
      return this;
    }
    function removeClass(className) {
      const classes = className.split(' ');
      for (let i = 0; i < classes.length; i += 1) {
        for (let j = 0; j < this.length; j += 1) {
          if (typeof this[j] !== 'undefined' && typeof this[j].classList !== 'undefined') this[j].classList.remove(classes[i]);
        }
      }
      return this;
    }
    function hasClass(className) {
      if (!this[0]) return false;
      return this[0].classList.contains(className);
    }
    function toggleClass(className) {
      const classes = className.split(' ');
      for (let i = 0; i < classes.length; i += 1) {
        for (let j = 0; j < this.length; j += 1) {
          if (typeof this[j] !== 'undefined' && typeof this[j].classList !== 'undefined') this[j].classList.toggle(classes[i]);
        }
      }
      return this;
    }
    function attr(attrs, value) {
      if (arguments.length === 1 && typeof attrs === 'string') {
        // Get attr
        if (this[0]) return this[0].getAttribute(attrs);
        return undefined;
      }

      // Set attrs
      for (let i = 0; i < this.length; i += 1) {
        if (arguments.length === 2) {
          // String
          this[i].setAttribute(attrs, value);
        } else {
          // Object
          // eslint-disable-next-line
          for (const attrName in attrs) {
            this[i][attrName] = attrs[attrName];
            this[i].setAttribute(attrName, attrs[attrName]);
          }
        }
      }
      return this;
    }
    // eslint-disable-next-line
    function removeAttr(attr) {
      for (let i = 0; i < this.length; i += 1) {
        this[i].removeAttribute(attr);
      }
      return this;
    }
    function data(key, value) {
      let el;
      if (typeof value === 'undefined') {
        el = this[0];
        // Get value
        if (el) {
          if (el.dom7ElementDataStorage && (key in el.dom7ElementDataStorage)) {
            return el.dom7ElementDataStorage[key];
          }

          const dataKey = el.getAttribute(`data-${key}`);
          if (dataKey) {
            return dataKey;
          }
          return undefined;
        }
        return undefined;
      }

      // Set value
      for (let i = 0; i < this.length; i += 1) {
        el = this[i];
        if (!el.dom7ElementDataStorage) el.dom7ElementDataStorage = {};
        el.dom7ElementDataStorage[key] = value;
      }
      return this;
    }
    // Transforms
    // eslint-disable-next-line
    function transform(transform) {
      for (let i = 0; i < this.length; i += 1) {
        const elStyle = this[i].style;
        elStyle.webkitTransform = transform;
        elStyle.transform = transform;
      }
      return this;
    }
    function transition(duration) {
      if (typeof duration !== 'string') {
        duration = `${duration}ms`; // eslint-disable-line
      }
      for (let i = 0; i < this.length; i += 1) {
        const elStyle = this[i].style;
        elStyle.webkitTransitionDuration = duration;
        elStyle.transitionDuration = duration;
      }
      return this;
    }
    // Events
    function on(...args) {
      let [eventType, targetSelector, listener, capture] = args;
      if (typeof args[1] === 'function') {
        [eventType, listener, capture] = args;
        targetSelector = undefined;
      }
      if (!capture) capture = false;

      function handleLiveEvent(e) {
        const target = e.target;
        if (!target) return;
        const eventData = e.target.dom7EventData || [];
        if (eventData.indexOf(e) < 0) {
          eventData.unshift(e);
        }
        if ($$1(target).is(targetSelector)) listener.apply(target, eventData);
        else {
          const parents = $$1(target).parents(); // eslint-disable-line
          for (let k = 0; k < parents.length; k += 1) {
            if ($$1(parents[k]).is(targetSelector)) listener.apply(parents[k], eventData);
          }
        }
      }
      function handleEvent(e) {
        const eventData = e && e.target ? e.target.dom7EventData || [] : [];
        if (eventData.indexOf(e) < 0) {
          eventData.unshift(e);
        }
        listener.apply(this, eventData);
      }
      const events = eventType.split(' ');
      let j;
      for (let i = 0; i < this.length; i += 1) {
        const el = this[i];
        if (!targetSelector) {
          for (j = 0; j < events.length; j += 1) {
            const event = events[j];
            if (!el.dom7Listeners) el.dom7Listeners = {};
            if (!el.dom7Listeners[event]) el.dom7Listeners[event] = [];
            el.dom7Listeners[event].push({
              listener,
              proxyListener: handleEvent,
            });
            el.addEventListener(event, handleEvent, capture);
          }
        } else {
          // Live events
          for (j = 0; j < events.length; j += 1) {
            const event = events[j];
            if (!el.dom7LiveListeners) el.dom7LiveListeners = {};
            if (!el.dom7LiveListeners[event]) el.dom7LiveListeners[event] = [];
            el.dom7LiveListeners[event].push({
              listener,
              proxyListener: handleLiveEvent,
            });
            el.addEventListener(event, handleLiveEvent, capture);
          }
        }
      }
      return this;
    }
    function off(...args) {
      let [eventType, targetSelector, listener, capture] = args;
      if (typeof args[1] === 'function') {
        [eventType, listener, capture] = args;
        targetSelector = undefined;
      }
      if (!capture) capture = false;

      const events = eventType.split(' ');
      for (let i = 0; i < events.length; i += 1) {
        const event = events[i];
        for (let j = 0; j < this.length; j += 1) {
          const el = this[j];
          let handlers;
          if (!targetSelector && el.dom7Listeners) {
            handlers = el.dom7Listeners[event];
          } else if (targetSelector && el.dom7LiveListeners) {
            handlers = el.dom7LiveListeners[event];
          }
          if (handlers && handlers.length) {
            for (let k = handlers.length - 1; k >= 0; k -= 1) {
              const handler = handlers[k];
              if (listener && handler.listener === listener) {
                el.removeEventListener(event, handler.proxyListener, capture);
                handlers.splice(k, 1);
              } else if (listener && handler.listener && handler.listener.dom7proxy && handler.listener.dom7proxy === listener) {
                el.removeEventListener(event, handler.proxyListener, capture);
                handlers.splice(k, 1);
              } else if (!listener) {
                el.removeEventListener(event, handler.proxyListener, capture);
                handlers.splice(k, 1);
              }
            }
          }
        }
      }
      return this;
    }
    function trigger(...args) {
      const events = args[0].split(' ');
      const eventData = args[1];
      for (let i = 0; i < events.length; i += 1) {
        const event = events[i];
        for (let j = 0; j < this.length; j += 1) {
          const el = this[j];
          let evt;
          try {
            evt = new win.CustomEvent(event, {
              detail: eventData,
              bubbles: true,
              cancelable: true,
            });
          } catch (e) {
            evt = doc.createEvent('Event');
            evt.initEvent(event, true, true);
            evt.detail = eventData;
          }
          // eslint-disable-next-line
          el.dom7EventData = args.filter((data, dataIndex) => dataIndex > 0);
          el.dispatchEvent(evt);
          el.dom7EventData = [];
          delete el.dom7EventData;
        }
      }
      return this;
    }
    function transitionEnd(callback) {
      const events = ['webkitTransitionEnd', 'transitionend'];
      const dom = this;
      let i;
      function fireCallBack(e) {
        /* jshint validthis:true */
        if (e.target !== this) return;
        callback.call(this, e);
        for (i = 0; i < events.length; i += 1) {
          dom.off(events[i], fireCallBack);
        }
      }
      if (callback) {
        for (i = 0; i < events.length; i += 1) {
          dom.on(events[i], fireCallBack);
        }
      }
      return this;
    }
    function outerWidth(includeMargins) {
      if (this.length > 0) {
        if (includeMargins) {
          // eslint-disable-next-line
          const styles = this.styles();
          return this[0].offsetWidth + parseFloat(styles.getPropertyValue('margin-right')) + parseFloat(styles.getPropertyValue('margin-left'));
        }
        return this[0].offsetWidth;
      }
      return null;
    }
    function outerHeight(includeMargins) {
      if (this.length > 0) {
        if (includeMargins) {
          // eslint-disable-next-line
          const styles = this.styles();
          return this[0].offsetHeight + parseFloat(styles.getPropertyValue('margin-top')) + parseFloat(styles.getPropertyValue('margin-bottom'));
        }
        return this[0].offsetHeight;
      }
      return null;
    }
    function offset() {
      if (this.length > 0) {
        const el = this[0];
        const box = el.getBoundingClientRect();
        const body = doc.body;
        const clientTop = el.clientTop || body.clientTop || 0;
        const clientLeft = el.clientLeft || body.clientLeft || 0;
        const scrollTop = el === win ? win.scrollY : el.scrollTop;
        const scrollLeft = el === win ? win.scrollX : el.scrollLeft;
        return {
          top: (box.top + scrollTop) - clientTop,
          left: (box.left + scrollLeft) - clientLeft,
        };
      }

      return null;
    }
    function styles() {
      if (this[0]) return win.getComputedStyle(this[0], null);
      return {};
    }
    function css(props, value) {
      let i;
      if (arguments.length === 1) {
        if (typeof props === 'string') {
          if (this[0]) return win.getComputedStyle(this[0], null).getPropertyValue(props);
        } else {
          for (i = 0; i < this.length; i += 1) {
            // eslint-disable-next-line
            for (let prop in props) {
              this[i].style[prop] = props[prop];
            }
          }
          return this;
        }
      }
      if (arguments.length === 2 && typeof props === 'string') {
        for (i = 0; i < this.length; i += 1) {
          this[i].style[props] = value;
        }
        return this;
      }
      return this;
    }
    // Iterate over the collection passing elements to `callback`
    function each(callback) {
      // Don't bother continuing without a callback
      if (!callback) return this;
      // Iterate over the current collection
      for (let i = 0; i < this.length; i += 1) {
        // If the callback returns false
        if (callback.call(this[i], i, this[i]) === false) {
          // End the loop early
          return this;
        }
      }
      // Return `this` to allow chained DOM operations
      return this;
    }
    function filter(callback) {
      const matchedItems = [];
      const dom = this;
      for (let i = 0; i < dom.length; i += 1) {
        if (callback.call(dom[i], i, dom[i])) matchedItems.push(dom[i]);
      }
      return new Dom7(matchedItems);
    }
    // eslint-disable-next-line
    function html(html) {
      if (typeof html === 'undefined') {
        return this[0] ? this[0].innerHTML : undefined;
      }

      for (let i = 0; i < this.length; i += 1) {
        this[i].innerHTML = html;
      }
      return this;
    }
    // eslint-disable-next-line
    function text(text) {
      if (typeof text === 'undefined') {
        if (this[0]) {
          return this[0].textContent.trim();
        }
        return null;
      }

      for (let i = 0; i < this.length; i += 1) {
        this[i].textContent = text;
      }
      return this;
    }
    function is(selector) {
      const el = this[0];
      let compareWith;
      let i;
      if (!el || typeof selector === 'undefined') return false;
      if (typeof selector === 'string') {
        if (el.matches) return el.matches(selector);
        else if (el.webkitMatchesSelector) return el.webkitMatchesSelector(selector);
        else if (el.msMatchesSelector) return el.msMatchesSelector(selector);

        compareWith = $$1(selector);
        for (i = 0; i < compareWith.length; i += 1) {
          if (compareWith[i] === el) return true;
        }
        return false;
      } else if (selector === doc) return el === doc;
      else if (selector === win) return el === win;

      if (selector.nodeType || selector instanceof Dom7) {
        compareWith = selector.nodeType ? [selector] : selector;
        for (i = 0; i < compareWith.length; i += 1) {
          if (compareWith[i] === el) return true;
        }
        return false;
      }
      return false;
    }
    function index() {
      let child = this[0];
      let i;
      if (child) {
        i = 0;
        // eslint-disable-next-line
        while ((child = child.previousSibling) !== null) {
          if (child.nodeType === 1) i += 1;
        }
        return i;
      }
      return undefined;
    }
    // eslint-disable-next-line
    function eq(index) {
      if (typeof index === 'undefined') return this;
      const length = this.length;
      let returnIndex;
      if (index > length - 1) {
        return new Dom7([]);
      }
      if (index < 0) {
        returnIndex = length + index;
        if (returnIndex < 0) return new Dom7([]);
        return new Dom7([this[returnIndex]]);
      }
      return new Dom7([this[index]]);
    }
    function append(...args) {
      let newChild;

      for (let k = 0; k < args.length; k += 1) {
        newChild = args[k];
        for (let i = 0; i < this.length; i += 1) {
          if (typeof newChild === 'string') {
            const tempDiv = doc.createElement('div');
            tempDiv.innerHTML = newChild;
            while (tempDiv.firstChild) {
              this[i].appendChild(tempDiv.firstChild);
            }
          } else if (newChild instanceof Dom7) {
            for (let j = 0; j < newChild.length; j += 1) {
              this[i].appendChild(newChild[j]);
            }
          } else {
            this[i].appendChild(newChild);
          }
        }
      }

      return this;
    }
    function prepend(newChild) {
      let i;
      let j;
      for (i = 0; i < this.length; i += 1) {
        if (typeof newChild === 'string') {
          const tempDiv = doc.createElement('div');
          tempDiv.innerHTML = newChild;
          for (j = tempDiv.childNodes.length - 1; j >= 0; j -= 1) {
            this[i].insertBefore(tempDiv.childNodes[j], this[i].childNodes[0]);
          }
        } else if (newChild instanceof Dom7) {
          for (j = 0; j < newChild.length; j += 1) {
            this[i].insertBefore(newChild[j], this[i].childNodes[0]);
          }
        } else {
          this[i].insertBefore(newChild, this[i].childNodes[0]);
        }
      }
      return this;
    }
    function next(selector) {
      if (this.length > 0) {
        if (selector) {
          if (this[0].nextElementSibling && $$1(this[0].nextElementSibling).is(selector)) {
            return new Dom7([this[0].nextElementSibling]);
          }
          return new Dom7([]);
        }

        if (this[0].nextElementSibling) return new Dom7([this[0].nextElementSibling]);
        return new Dom7([]);
      }
      return new Dom7([]);
    }
    function nextAll(selector) {
      const nextEls = [];
      let el = this[0];
      if (!el) return new Dom7([]);
      while (el.nextElementSibling) {
        const next = el.nextElementSibling; // eslint-disable-line
        if (selector) {
          if ($$1(next).is(selector)) nextEls.push(next);
        } else nextEls.push(next);
        el = next;
      }
      return new Dom7(nextEls);
    }
    function prev(selector) {
      if (this.length > 0) {
        const el = this[0];
        if (selector) {
          if (el.previousElementSibling && $$1(el.previousElementSibling).is(selector)) {
            return new Dom7([el.previousElementSibling]);
          }
          return new Dom7([]);
        }

        if (el.previousElementSibling) return new Dom7([el.previousElementSibling]);
        return new Dom7([]);
      }
      return new Dom7([]);
    }
    function prevAll(selector) {
      const prevEls = [];
      let el = this[0];
      if (!el) return new Dom7([]);
      while (el.previousElementSibling) {
        const prev = el.previousElementSibling; // eslint-disable-line
        if (selector) {
          if ($$1(prev).is(selector)) prevEls.push(prev);
        } else prevEls.push(prev);
        el = prev;
      }
      return new Dom7(prevEls);
    }
    function parent(selector) {
      const parents = []; // eslint-disable-line
      for (let i = 0; i < this.length; i += 1) {
        if (this[i].parentNode !== null) {
          if (selector) {
            if ($$1(this[i].parentNode).is(selector)) parents.push(this[i].parentNode);
          } else {
            parents.push(this[i].parentNode);
          }
        }
      }
      return $$1(unique(parents));
    }
    function parents(selector) {
      const parents = []; // eslint-disable-line
      for (let i = 0; i < this.length; i += 1) {
        let parent = this[i].parentNode; // eslint-disable-line
        while (parent) {
          if (selector) {
            if ($$1(parent).is(selector)) parents.push(parent);
          } else {
            parents.push(parent);
          }
          parent = parent.parentNode;
        }
      }
      return $$1(unique(parents));
    }
    function closest(selector) {
      let closest = this; // eslint-disable-line
      if (typeof selector === 'undefined') {
        return new Dom7([]);
      }
      if (!closest.is(selector)) {
        closest = closest.parents(selector).eq(0);
      }
      return closest;
    }
    function find(selector) {
      const foundElements = [];
      for (let i = 0; i < this.length; i += 1) {
        const found = this[i].querySelectorAll(selector);
        for (let j = 0; j < found.length; j += 1) {
          foundElements.push(found[j]);
        }
      }
      return new Dom7(foundElements);
    }
    function children(selector) {
      const children = []; // eslint-disable-line
      for (let i = 0; i < this.length; i += 1) {
        const childNodes = this[i].childNodes;

        for (let j = 0; j < childNodes.length; j += 1) {
          if (!selector) {
            if (childNodes[j].nodeType === 1) children.push(childNodes[j]);
          } else if (childNodes[j].nodeType === 1 && $$1(childNodes[j]).is(selector)) {
            children.push(childNodes[j]);
          }
        }
      }
      return new Dom7(unique(children));
    }
    function remove() {
      for (let i = 0; i < this.length; i += 1) {
        if (this[i].parentNode) this[i].parentNode.removeChild(this[i]);
      }
      return this;
    }
    function add(...args) {
      const dom = this;
      let i;
      let j;
      for (i = 0; i < args.length; i += 1) {
        const toAdd = $$1(args[i]);
        for (j = 0; j < toAdd.length; j += 1) {
          dom[dom.length] = toAdd[j];
          dom.length += 1;
        }
      }
      return dom;
    }

    /**
     * Swiper 5.2.1
     * Most modern mobile touch slider and framework with hardware accelerated transitions
     * http://swiperjs.com
     *
     * Copyright 2014-2019 Vladimir Kharlampidi
     *
     * Released under the MIT License
     *
     * Released on: November 16, 2019
     */

    const Methods = {
      addClass,
      removeClass,
      hasClass,
      toggleClass,
      attr,
      removeAttr,
      data,
      transform,
      transition: transition,
      on,
      off,
      trigger,
      transitionEnd: transitionEnd,
      outerWidth,
      outerHeight,
      offset,
      css,
      each,
      html,
      text,
      is,
      index,
      eq,
      append,
      prepend,
      next,
      nextAll,
      prev,
      prevAll,
      parent,
      parents,
      closest,
      find,
      children,
      filter,
      remove,
      add,
      styles,
    };

    Object.keys(Methods).forEach((methodName) => {
      $$1.fn[methodName] = $$1.fn[methodName] || Methods[methodName];
    });

    const Utils = {
      deleteProps(obj) {
        const object = obj;
        Object.keys(object).forEach((key) => {
          try {
            object[key] = null;
          } catch (e) {
            // no getter for object
          }
          try {
            delete object[key];
          } catch (e) {
            // something got wrong
          }
        });
      },
      nextTick(callback, delay = 0) {
        return setTimeout(callback, delay);
      },
      now() {
        return Date.now();
      },
      getTranslate(el, axis = 'x') {
        let matrix;
        let curTransform;
        let transformMatrix;

        const curStyle = win.getComputedStyle(el, null);

        if (win.WebKitCSSMatrix) {
          curTransform = curStyle.transform || curStyle.webkitTransform;
          if (curTransform.split(',').length > 6) {
            curTransform = curTransform.split(', ').map((a) => a.replace(',', '.')).join(', ');
          }
          // Some old versions of Webkit choke when 'none' is passed; pass
          // empty string instead in this case
          transformMatrix = new win.WebKitCSSMatrix(curTransform === 'none' ? '' : curTransform);
        } else {
          transformMatrix = curStyle.MozTransform || curStyle.OTransform || curStyle.MsTransform || curStyle.msTransform || curStyle.transform || curStyle.getPropertyValue('transform').replace('translate(', 'matrix(1, 0, 0, 1,');
          matrix = transformMatrix.toString().split(',');
        }

        if (axis === 'x') {
          // Latest Chrome and webkits Fix
          if (win.WebKitCSSMatrix) curTransform = transformMatrix.m41;
          // Crazy IE10 Matrix
          else if (matrix.length === 16) curTransform = parseFloat(matrix[12]);
          // Normal Browsers
          else curTransform = parseFloat(matrix[4]);
        }
        if (axis === 'y') {
          // Latest Chrome and webkits Fix
          if (win.WebKitCSSMatrix) curTransform = transformMatrix.m42;
          // Crazy IE10 Matrix
          else if (matrix.length === 16) curTransform = parseFloat(matrix[13]);
          // Normal Browsers
          else curTransform = parseFloat(matrix[5]);
        }
        return curTransform || 0;
      },
      parseUrlQuery(url) {
        const query = {};
        let urlToParse = url || win.location.href;
        let i;
        let params;
        let param;
        let length;
        if (typeof urlToParse === 'string' && urlToParse.length) {
          urlToParse = urlToParse.indexOf('?') > -1 ? urlToParse.replace(/\S*\?/, '') : '';
          params = urlToParse.split('&').filter((paramsPart) => paramsPart !== '');
          length = params.length;

          for (i = 0; i < length; i += 1) {
            param = params[i].replace(/#\S+/g, '').split('=');
            query[decodeURIComponent(param[0])] = typeof param[1] === 'undefined' ? undefined : decodeURIComponent(param[1]) || '';
          }
        }
        return query;
      },
      isObject(o) {
        return typeof o === 'object' && o !== null && o.constructor && o.constructor === Object;
      },
      extend(...args) {
        const to = Object(args[0]);
        for (let i = 1; i < args.length; i += 1) {
          const nextSource = args[i];
          if (nextSource !== undefined && nextSource !== null) {
            const keysArray = Object.keys(Object(nextSource));
            for (let nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex += 1) {
              const nextKey = keysArray[nextIndex];
              const desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
              if (desc !== undefined && desc.enumerable) {
                if (Utils.isObject(to[nextKey]) && Utils.isObject(nextSource[nextKey])) {
                  Utils.extend(to[nextKey], nextSource[nextKey]);
                } else if (!Utils.isObject(to[nextKey]) && Utils.isObject(nextSource[nextKey])) {
                  to[nextKey] = {};
                  Utils.extend(to[nextKey], nextSource[nextKey]);
                } else {
                  to[nextKey] = nextSource[nextKey];
                }
              }
            }
          }
        }
        return to;
      },
    };

    const Support = (function Support() {
      return {
        touch: (win.Modernizr && win.Modernizr.touch === true) || (function checkTouch() {
          return !!((win.navigator.maxTouchPoints > 0) || ('ontouchstart' in win) || (win.DocumentTouch && doc instanceof win.DocumentTouch));
        }()),

        pointerEvents: !!win.PointerEvent && ('maxTouchPoints' in win.navigator) && win.navigator.maxTouchPoints > 0,

        observer: (function checkObserver() {
          return ('MutationObserver' in win || 'WebkitMutationObserver' in win);
        }()),

        passiveListener: (function checkPassiveListener() {
          let supportsPassive = false;
          try {
            const opts = Object.defineProperty({}, 'passive', {
              // eslint-disable-next-line
              get() {
                supportsPassive = true;
              },
            });
            win.addEventListener('testPassiveListener', null, opts);
          } catch (e) {
            // No support
          }
          return supportsPassive;
        }()),

        gestures: (function checkGestures() {
          return 'ongesturestart' in win;
        }()),
      };
    }());

    class SwiperClass {
      constructor(params = {}) {
        const self = this;
        self.params = params;

        // Events
        self.eventsListeners = {};

        if (self.params && self.params.on) {
          Object.keys(self.params.on).forEach((eventName) => {
            self.on(eventName, self.params.on[eventName]);
          });
        }
      }

      on(events, handler, priority) {
        const self = this;
        if (typeof handler !== 'function') return self;
        const method = priority ? 'unshift' : 'push';
        events.split(' ').forEach((event) => {
          if (!self.eventsListeners[event]) self.eventsListeners[event] = [];
          self.eventsListeners[event][method](handler);
        });
        return self;
      }

      once(events, handler, priority) {
        const self = this;
        if (typeof handler !== 'function') return self;
        function onceHandler(...args) {
          self.off(events, onceHandler);
          if (onceHandler.f7proxy) {
            delete onceHandler.f7proxy;
          }
          handler.apply(self, args);
        }
        onceHandler.f7proxy = handler;
        return self.on(events, onceHandler, priority);
      }

      off(events, handler) {
        const self = this;
        if (!self.eventsListeners) return self;
        events.split(' ').forEach((event) => {
          if (typeof handler === 'undefined') {
            self.eventsListeners[event] = [];
          } else if (self.eventsListeners[event] && self.eventsListeners[event].length) {
            self.eventsListeners[event].forEach((eventHandler, index) => {
              if (eventHandler === handler || (eventHandler.f7proxy && eventHandler.f7proxy === handler)) {
                self.eventsListeners[event].splice(index, 1);
              }
            });
          }
        });
        return self;
      }

      emit(...args) {
        const self = this;
        if (!self.eventsListeners) return self;
        let events;
        let data;
        let context;
        if (typeof args[0] === 'string' || Array.isArray(args[0])) {
          events = args[0];
          data = args.slice(1, args.length);
          context = self;
        } else {
          events = args[0].events;
          data = args[0].data;
          context = args[0].context || self;
        }
        const eventsArray = Array.isArray(events) ? events : events.split(' ');
        eventsArray.forEach((event) => {
          if (self.eventsListeners && self.eventsListeners[event]) {
            const handlers = [];
            self.eventsListeners[event].forEach((eventHandler) => {
              handlers.push(eventHandler);
            });
            handlers.forEach((eventHandler) => {
              eventHandler.apply(context, data);
            });
          }
        });
        return self;
      }

      useModulesParams(instanceParams) {
        const instance = this;
        if (!instance.modules) return;
        Object.keys(instance.modules).forEach((moduleName) => {
          const module = instance.modules[moduleName];
          // Extend params
          if (module.params) {
            Utils.extend(instanceParams, module.params);
          }
        });
      }

      useModules(modulesParams = {}) {
        const instance = this;
        if (!instance.modules) return;
        Object.keys(instance.modules).forEach((moduleName) => {
          const module = instance.modules[moduleName];
          const moduleParams = modulesParams[moduleName] || {};
          // Extend instance methods and props
          if (module.instance) {
            Object.keys(module.instance).forEach((modulePropName) => {
              const moduleProp = module.instance[modulePropName];
              if (typeof moduleProp === 'function') {
                instance[modulePropName] = moduleProp.bind(instance);
              } else {
                instance[modulePropName] = moduleProp;
              }
            });
          }
          // Add event listeners
          if (module.on && instance.on) {
            Object.keys(module.on).forEach((moduleEventName) => {
              instance.on(moduleEventName, module.on[moduleEventName]);
            });
          }

          // Module create callback
          if (module.create) {
            module.create.bind(instance)(moduleParams);
          }
        });
      }

      static set components(components) {
        const Class = this;
        if (!Class.use) return;
        Class.use(components);
      }

      static installModule(module, ...params) {
        const Class = this;
        if (!Class.prototype.modules) Class.prototype.modules = {};
        const name = module.name || (`${Object.keys(Class.prototype.modules).length}_${Utils.now()}`);
        Class.prototype.modules[name] = module;
        // Prototype
        if (module.proto) {
          Object.keys(module.proto).forEach((key) => {
            Class.prototype[key] = module.proto[key];
          });
        }
        // Class
        if (module.static) {
          Object.keys(module.static).forEach((key) => {
            Class[key] = module.static[key];
          });
        }
        // Callback
        if (module.install) {
          module.install.apply(Class, params);
        }
        return Class;
      }

      static use(module, ...params) {
        const Class = this;
        if (Array.isArray(module)) {
          module.forEach((m) => Class.installModule(m));
          return Class;
        }
        return Class.installModule(module, ...params);
      }
    }

    function updateSize () {
      const swiper = this;
      let width;
      let height;
      const $el = swiper.$el;
      if (typeof swiper.params.width !== 'undefined') {
        width = swiper.params.width;
      } else {
        width = $el[0].clientWidth;
      }
      if (typeof swiper.params.height !== 'undefined') {
        height = swiper.params.height;
      } else {
        height = $el[0].clientHeight;
      }
      if ((width === 0 && swiper.isHorizontal()) || (height === 0 && swiper.isVertical())) {
        return;
      }

      // Subtract paddings
      width = width - parseInt($el.css('padding-left'), 10) - parseInt($el.css('padding-right'), 10);
      height = height - parseInt($el.css('padding-top'), 10) - parseInt($el.css('padding-bottom'), 10);

      Utils.extend(swiper, {
        width,
        height,
        size: swiper.isHorizontal() ? width : height,
      });
    }

    function updateSlides () {
      const swiper = this;
      const params = swiper.params;

      const {
        $wrapperEl, size: swiperSize, rtlTranslate: rtl, wrongRTL,
      } = swiper;
      const isVirtual = swiper.virtual && params.virtual.enabled;
      const previousSlidesLength = isVirtual ? swiper.virtual.slides.length : swiper.slides.length;
      const slides = $wrapperEl.children(`.${swiper.params.slideClass}`);
      const slidesLength = isVirtual ? swiper.virtual.slides.length : slides.length;
      let snapGrid = [];
      const slidesGrid = [];
      const slidesSizesGrid = [];

      function slidesForMargin(slideIndex) {
        if (!params.cssMode) return true;
        if (slideIndex === slides.length - 1) {
          return false;
        }
        return true;
      }

      let offsetBefore = params.slidesOffsetBefore;
      if (typeof offsetBefore === 'function') {
        offsetBefore = params.slidesOffsetBefore.call(swiper);
      }

      let offsetAfter = params.slidesOffsetAfter;
      if (typeof offsetAfter === 'function') {
        offsetAfter = params.slidesOffsetAfter.call(swiper);
      }

      const previousSnapGridLength = swiper.snapGrid.length;
      const previousSlidesGridLength = swiper.snapGrid.length;

      let spaceBetween = params.spaceBetween;
      let slidePosition = -offsetBefore;
      let prevSlideSize = 0;
      let index = 0;
      if (typeof swiperSize === 'undefined') {
        return;
      }
      if (typeof spaceBetween === 'string' && spaceBetween.indexOf('%') >= 0) {
        spaceBetween = (parseFloat(spaceBetween.replace('%', '')) / 100) * swiperSize;
      }

      swiper.virtualSize = -spaceBetween;

      // reset margins
      if (rtl) slides.css({ marginLeft: '', marginTop: '' });
      else slides.css({ marginRight: '', marginBottom: '' });

      let slidesNumberEvenToRows;
      if (params.slidesPerColumn > 1) {
        if (Math.floor(slidesLength / params.slidesPerColumn) === slidesLength / swiper.params.slidesPerColumn) {
          slidesNumberEvenToRows = slidesLength;
        } else {
          slidesNumberEvenToRows = Math.ceil(slidesLength / params.slidesPerColumn) * params.slidesPerColumn;
        }
        if (params.slidesPerView !== 'auto' && params.slidesPerColumnFill === 'row') {
          slidesNumberEvenToRows = Math.max(slidesNumberEvenToRows, params.slidesPerView * params.slidesPerColumn);
        }
      }

      // Calc slides
      let slideSize;
      const slidesPerColumn = params.slidesPerColumn;
      const slidesPerRow = slidesNumberEvenToRows / slidesPerColumn;
      const numFullColumns = Math.floor(slidesLength / params.slidesPerColumn);
      for (let i = 0; i < slidesLength; i += 1) {
        slideSize = 0;
        const slide = slides.eq(i);
        if (params.slidesPerColumn > 1) {
          // Set slides order
          let newSlideOrderIndex;
          let column;
          let row;
          if (params.slidesPerColumnFill === 'row' && params.slidesPerGroup > 1) {
            const groupIndex = Math.floor(i / (params.slidesPerGroup * params.slidesPerColumn));
            const slideIndexInGroup = i - params.slidesPerColumn * params.slidesPerGroup * groupIndex;
            const columnsInGroup = groupIndex === 0
              ? params.slidesPerGroup
              : Math.min(Math.ceil((slidesLength - groupIndex * slidesPerColumn * params.slidesPerGroup) / slidesPerColumn), params.slidesPerGroup);
            row = Math.floor(slideIndexInGroup / columnsInGroup);
            column = (slideIndexInGroup - row * columnsInGroup) + groupIndex * params.slidesPerGroup;

            newSlideOrderIndex = column + ((row * slidesNumberEvenToRows) / slidesPerColumn);
            slide
              .css({
                '-webkit-box-ordinal-group': newSlideOrderIndex,
                '-moz-box-ordinal-group': newSlideOrderIndex,
                '-ms-flex-order': newSlideOrderIndex,
                '-webkit-order': newSlideOrderIndex,
                order: newSlideOrderIndex,
              });
          } else if (params.slidesPerColumnFill === 'column') {
            column = Math.floor(i / slidesPerColumn);
            row = i - (column * slidesPerColumn);
            if (column > numFullColumns || (column === numFullColumns && row === slidesPerColumn - 1)) {
              row += 1;
              if (row >= slidesPerColumn) {
                row = 0;
                column += 1;
              }
            }
          } else {
            row = Math.floor(i / slidesPerRow);
            column = i - (row * slidesPerRow);
          }
          slide.css(
            `margin-${swiper.isHorizontal() ? 'top' : 'left'}`,
            (row !== 0 && params.spaceBetween) && (`${params.spaceBetween}px`)
          );
        }
        if (slide.css('display') === 'none') continue; // eslint-disable-line

        if (params.slidesPerView === 'auto') {
          const slideStyles = win.getComputedStyle(slide[0], null);
          const currentTransform = slide[0].style.transform;
          const currentWebKitTransform = slide[0].style.webkitTransform;
          if (currentTransform) {
            slide[0].style.transform = 'none';
          }
          if (currentWebKitTransform) {
            slide[0].style.webkitTransform = 'none';
          }
          if (params.roundLengths) {
            slideSize = swiper.isHorizontal()
              ? slide.outerWidth(true)
              : slide.outerHeight(true);
          } else {
            // eslint-disable-next-line
            if (swiper.isHorizontal()) {
              const width = parseFloat(slideStyles.getPropertyValue('width'));
              const paddingLeft = parseFloat(slideStyles.getPropertyValue('padding-left'));
              const paddingRight = parseFloat(slideStyles.getPropertyValue('padding-right'));
              const marginLeft = parseFloat(slideStyles.getPropertyValue('margin-left'));
              const marginRight = parseFloat(slideStyles.getPropertyValue('margin-right'));
              const boxSizing = slideStyles.getPropertyValue('box-sizing');
              if (boxSizing && boxSizing === 'border-box') {
                slideSize = width + marginLeft + marginRight;
              } else {
                slideSize = width + paddingLeft + paddingRight + marginLeft + marginRight;
              }
            } else {
              const height = parseFloat(slideStyles.getPropertyValue('height'));
              const paddingTop = parseFloat(slideStyles.getPropertyValue('padding-top'));
              const paddingBottom = parseFloat(slideStyles.getPropertyValue('padding-bottom'));
              const marginTop = parseFloat(slideStyles.getPropertyValue('margin-top'));
              const marginBottom = parseFloat(slideStyles.getPropertyValue('margin-bottom'));
              const boxSizing = slideStyles.getPropertyValue('box-sizing');
              if (boxSizing && boxSizing === 'border-box') {
                slideSize = height + marginTop + marginBottom;
              } else {
                slideSize = height + paddingTop + paddingBottom + marginTop + marginBottom;
              }
            }
          }
          if (currentTransform) {
            slide[0].style.transform = currentTransform;
          }
          if (currentWebKitTransform) {
            slide[0].style.webkitTransform = currentWebKitTransform;
          }
          if (params.roundLengths) slideSize = Math.floor(slideSize);
        } else {
          slideSize = (swiperSize - ((params.slidesPerView - 1) * spaceBetween)) / params.slidesPerView;
          if (params.roundLengths) slideSize = Math.floor(slideSize);

          if (slides[i]) {
            if (swiper.isHorizontal()) {
              slides[i].style.width = `${slideSize}px`;
            } else {
              slides[i].style.height = `${slideSize}px`;
            }
          }
        }
        if (slides[i]) {
          slides[i].swiperSlideSize = slideSize;
        }
        slidesSizesGrid.push(slideSize);


        if (params.centeredSlides) {
          slidePosition = slidePosition + (slideSize / 2) + (prevSlideSize / 2) + spaceBetween;
          if (prevSlideSize === 0 && i !== 0) slidePosition = slidePosition - (swiperSize / 2) - spaceBetween;
          if (i === 0) slidePosition = slidePosition - (swiperSize / 2) - spaceBetween;
          if (Math.abs(slidePosition) < 1 / 1000) slidePosition = 0;
          if (params.roundLengths) slidePosition = Math.floor(slidePosition);
          if ((index) % params.slidesPerGroup === 0) snapGrid.push(slidePosition);
          slidesGrid.push(slidePosition);
        } else {
          if (params.roundLengths) slidePosition = Math.floor(slidePosition);
          if ((index) % params.slidesPerGroup === 0) snapGrid.push(slidePosition);
          slidesGrid.push(slidePosition);
          slidePosition = slidePosition + slideSize + spaceBetween;
        }

        swiper.virtualSize += slideSize + spaceBetween;

        prevSlideSize = slideSize;

        index += 1;
      }
      swiper.virtualSize = Math.max(swiper.virtualSize, swiperSize) + offsetAfter;
      let newSlidesGrid;

      if (
        rtl && wrongRTL && (params.effect === 'slide' || params.effect === 'coverflow')) {
        $wrapperEl.css({ width: `${swiper.virtualSize + params.spaceBetween}px` });
      }
      if (params.setWrapperSize) {
        if (swiper.isHorizontal()) $wrapperEl.css({ width: `${swiper.virtualSize + params.spaceBetween}px` });
        else $wrapperEl.css({ height: `${swiper.virtualSize + params.spaceBetween}px` });
      }

      if (params.slidesPerColumn > 1) {
        swiper.virtualSize = (slideSize + params.spaceBetween) * slidesNumberEvenToRows;
        swiper.virtualSize = Math.ceil(swiper.virtualSize / params.slidesPerColumn) - params.spaceBetween;
        if (swiper.isHorizontal()) $wrapperEl.css({ width: `${swiper.virtualSize + params.spaceBetween}px` });
        else $wrapperEl.css({ height: `${swiper.virtualSize + params.spaceBetween}px` });
        if (params.centeredSlides) {
          newSlidesGrid = [];
          for (let i = 0; i < snapGrid.length; i += 1) {
            let slidesGridItem = snapGrid[i];
            if (params.roundLengths) slidesGridItem = Math.floor(slidesGridItem);
            if (snapGrid[i] < swiper.virtualSize + snapGrid[0]) newSlidesGrid.push(slidesGridItem);
          }
          snapGrid = newSlidesGrid;
        }
      }

      // Remove last grid elements depending on width
      if (!params.centeredSlides) {
        newSlidesGrid = [];
        for (let i = 0; i < snapGrid.length; i += 1) {
          let slidesGridItem = snapGrid[i];
          if (params.roundLengths) slidesGridItem = Math.floor(slidesGridItem);
          if (snapGrid[i] <= swiper.virtualSize - swiperSize) {
            newSlidesGrid.push(slidesGridItem);
          }
        }
        snapGrid = newSlidesGrid;
        if (Math.floor(swiper.virtualSize - swiperSize) - Math.floor(snapGrid[snapGrid.length - 1]) > 1) {
          snapGrid.push(swiper.virtualSize - swiperSize);
        }
      }
      if (snapGrid.length === 0) snapGrid = [0];

      if (params.spaceBetween !== 0) {
        if (swiper.isHorizontal()) {
          if (rtl) slides.filter(slidesForMargin).css({ marginLeft: `${spaceBetween}px` });
          else slides.filter(slidesForMargin).css({ marginRight: `${spaceBetween}px` });
        } else slides.filter(slidesForMargin).css({ marginBottom: `${spaceBetween}px` });
      }

      if (params.centeredSlides && params.centeredSlidesBounds) {
        let allSlidesSize = 0;
        slidesSizesGrid.forEach((slideSizeValue) => {
          allSlidesSize += slideSizeValue + (params.spaceBetween ? params.spaceBetween : 0);
        });
        allSlidesSize -= params.spaceBetween;
        const maxSnap = allSlidesSize - swiperSize;
        snapGrid = snapGrid.map((snap) => {
          if (snap < 0) return -offsetBefore;
          if (snap > maxSnap) return maxSnap + offsetAfter;
          return snap;
        });
      }

      if (params.centerInsufficientSlides) {
        let allSlidesSize = 0;
        slidesSizesGrid.forEach((slideSizeValue) => {
          allSlidesSize += slideSizeValue + (params.spaceBetween ? params.spaceBetween : 0);
        });
        allSlidesSize -= params.spaceBetween;
        if (allSlidesSize < swiperSize) {
          const allSlidesOffset = (swiperSize - allSlidesSize) / 2;
          snapGrid.forEach((snap, snapIndex) => {
            snapGrid[snapIndex] = snap - allSlidesOffset;
          });
          slidesGrid.forEach((snap, snapIndex) => {
            slidesGrid[snapIndex] = snap + allSlidesOffset;
          });
        }
      }

      Utils.extend(swiper, {
        slides,
        snapGrid,
        slidesGrid,
        slidesSizesGrid,
      });

      if (slidesLength !== previousSlidesLength) {
        swiper.emit('slidesLengthChange');
      }
      if (snapGrid.length !== previousSnapGridLength) {
        if (swiper.params.watchOverflow) swiper.checkOverflow();
        swiper.emit('snapGridLengthChange');
      }
      if (slidesGrid.length !== previousSlidesGridLength) {
        swiper.emit('slidesGridLengthChange');
      }

      if (params.watchSlidesProgress || params.watchSlidesVisibility) {
        swiper.updateSlidesOffset();
      }
    }

    function updateAutoHeight (speed) {
      const swiper = this;
      const activeSlides = [];
      let newHeight = 0;
      let i;
      if (typeof speed === 'number') {
        swiper.setTransition(speed);
      } else if (speed === true) {
        swiper.setTransition(swiper.params.speed);
      }
      // Find slides currently in view
      if (swiper.params.slidesPerView !== 'auto' && swiper.params.slidesPerView > 1) {
        for (i = 0; i < Math.ceil(swiper.params.slidesPerView); i += 1) {
          const index = swiper.activeIndex + i;
          if (index > swiper.slides.length) break;
          activeSlides.push(swiper.slides.eq(index)[0]);
        }
      } else {
        activeSlides.push(swiper.slides.eq(swiper.activeIndex)[0]);
      }

      // Find new height from highest slide in view
      for (i = 0; i < activeSlides.length; i += 1) {
        if (typeof activeSlides[i] !== 'undefined') {
          const height = activeSlides[i].offsetHeight;
          newHeight = height > newHeight ? height : newHeight;
        }
      }

      // Update Height
      if (newHeight) swiper.$wrapperEl.css('height', `${newHeight}px`);
    }

    function updateSlidesOffset () {
      const swiper = this;
      const slides = swiper.slides;
      for (let i = 0; i < slides.length; i += 1) {
        slides[i].swiperSlideOffset = swiper.isHorizontal() ? slides[i].offsetLeft : slides[i].offsetTop;
      }
    }

    function updateSlidesProgress (translate = (this && this.translate) || 0) {
      const swiper = this;
      const params = swiper.params;

      const { slides, rtlTranslate: rtl } = swiper;

      if (slides.length === 0) return;
      if (typeof slides[0].swiperSlideOffset === 'undefined') swiper.updateSlidesOffset();

      let offsetCenter = -translate;
      if (rtl) offsetCenter = translate;

      // Visible Slides
      slides.removeClass(params.slideVisibleClass);

      swiper.visibleSlidesIndexes = [];
      swiper.visibleSlides = [];

      for (let i = 0; i < slides.length; i += 1) {
        const slide = slides[i];
        const slideProgress = (
          (offsetCenter + (params.centeredSlides ? swiper.minTranslate() : 0)) - slide.swiperSlideOffset
        ) / (slide.swiperSlideSize + params.spaceBetween);
        if (params.watchSlidesVisibility) {
          const slideBefore = -(offsetCenter - slide.swiperSlideOffset);
          const slideAfter = slideBefore + swiper.slidesSizesGrid[i];
          const isVisible = (slideBefore >= 0 && slideBefore < swiper.size - 1)
                    || (slideAfter > 1 && slideAfter <= swiper.size)
                    || (slideBefore <= 0 && slideAfter >= swiper.size);
          if (isVisible) {
            swiper.visibleSlides.push(slide);
            swiper.visibleSlidesIndexes.push(i);
            slides.eq(i).addClass(params.slideVisibleClass);
          }
        }
        slide.progress = rtl ? -slideProgress : slideProgress;
      }
      swiper.visibleSlides = $$1(swiper.visibleSlides);
    }

    function updateProgress (translate) {
      const swiper = this;
      if (typeof translate === 'undefined') {
        const multiplier = swiper.rtlTranslate ? -1 : 1;
        // eslint-disable-next-line
        translate = (swiper && swiper.translate && (swiper.translate * multiplier)) || 0;
      }
      const params = swiper.params;
      const translatesDiff = swiper.maxTranslate() - swiper.minTranslate();
      let { progress, isBeginning, isEnd } = swiper;
      const wasBeginning = isBeginning;
      const wasEnd = isEnd;
      if (translatesDiff === 0) {
        progress = 0;
        isBeginning = true;
        isEnd = true;
      } else {
        progress = (translate - swiper.minTranslate()) / (translatesDiff);
        isBeginning = progress <= 0;
        isEnd = progress >= 1;
      }
      Utils.extend(swiper, {
        progress,
        isBeginning,
        isEnd,
      });

      if (params.watchSlidesProgress || params.watchSlidesVisibility) swiper.updateSlidesProgress(translate);

      if (isBeginning && !wasBeginning) {
        swiper.emit('reachBeginning toEdge');
      }
      if (isEnd && !wasEnd) {
        swiper.emit('reachEnd toEdge');
      }
      if ((wasBeginning && !isBeginning) || (wasEnd && !isEnd)) {
        swiper.emit('fromEdge');
      }

      swiper.emit('progress', progress);
    }

    function updateSlidesClasses () {
      const swiper = this;

      const {
        slides, params, $wrapperEl, activeIndex, realIndex,
      } = swiper;
      const isVirtual = swiper.virtual && params.virtual.enabled;

      slides.removeClass(`${params.slideActiveClass} ${params.slideNextClass} ${params.slidePrevClass} ${params.slideDuplicateActiveClass} ${params.slideDuplicateNextClass} ${params.slideDuplicatePrevClass}`);

      let activeSlide;
      if (isVirtual) {
        activeSlide = swiper.$wrapperEl.find(`.${params.slideClass}[data-swiper-slide-index="${activeIndex}"]`);
      } else {
        activeSlide = slides.eq(activeIndex);
      }

      // Active classes
      activeSlide.addClass(params.slideActiveClass);

      if (params.loop) {
        // Duplicate to all looped slides
        if (activeSlide.hasClass(params.slideDuplicateClass)) {
          $wrapperEl
            .children(`.${params.slideClass}:not(.${params.slideDuplicateClass})[data-swiper-slide-index="${realIndex}"]`)
            .addClass(params.slideDuplicateActiveClass);
        } else {
          $wrapperEl
            .children(`.${params.slideClass}.${params.slideDuplicateClass}[data-swiper-slide-index="${realIndex}"]`)
            .addClass(params.slideDuplicateActiveClass);
        }
      }
      // Next Slide
      let nextSlide = activeSlide.nextAll(`.${params.slideClass}`).eq(0).addClass(params.slideNextClass);
      if (params.loop && nextSlide.length === 0) {
        nextSlide = slides.eq(0);
        nextSlide.addClass(params.slideNextClass);
      }
      // Prev Slide
      let prevSlide = activeSlide.prevAll(`.${params.slideClass}`).eq(0).addClass(params.slidePrevClass);
      if (params.loop && prevSlide.length === 0) {
        prevSlide = slides.eq(-1);
        prevSlide.addClass(params.slidePrevClass);
      }
      if (params.loop) {
        // Duplicate to all looped slides
        if (nextSlide.hasClass(params.slideDuplicateClass)) {
          $wrapperEl
            .children(`.${params.slideClass}:not(.${params.slideDuplicateClass})[data-swiper-slide-index="${nextSlide.attr('data-swiper-slide-index')}"]`)
            .addClass(params.slideDuplicateNextClass);
        } else {
          $wrapperEl
            .children(`.${params.slideClass}.${params.slideDuplicateClass}[data-swiper-slide-index="${nextSlide.attr('data-swiper-slide-index')}"]`)
            .addClass(params.slideDuplicateNextClass);
        }
        if (prevSlide.hasClass(params.slideDuplicateClass)) {
          $wrapperEl
            .children(`.${params.slideClass}:not(.${params.slideDuplicateClass})[data-swiper-slide-index="${prevSlide.attr('data-swiper-slide-index')}"]`)
            .addClass(params.slideDuplicatePrevClass);
        } else {
          $wrapperEl
            .children(`.${params.slideClass}.${params.slideDuplicateClass}[data-swiper-slide-index="${prevSlide.attr('data-swiper-slide-index')}"]`)
            .addClass(params.slideDuplicatePrevClass);
        }
      }
    }

    function updateActiveIndex (newActiveIndex) {
      const swiper = this;
      const translate = swiper.rtlTranslate ? swiper.translate : -swiper.translate;
      const {
        slidesGrid, snapGrid, params, activeIndex: previousIndex, realIndex: previousRealIndex, snapIndex: previousSnapIndex,
      } = swiper;
      let activeIndex = newActiveIndex;
      let snapIndex;
      if (typeof activeIndex === 'undefined') {
        for (let i = 0; i < slidesGrid.length; i += 1) {
          if (typeof slidesGrid[i + 1] !== 'undefined') {
            if (translate >= slidesGrid[i] && translate < slidesGrid[i + 1] - ((slidesGrid[i + 1] - slidesGrid[i]) / 2)) {
              activeIndex = i;
            } else if (translate >= slidesGrid[i] && translate < slidesGrid[i + 1]) {
              activeIndex = i + 1;
            }
          } else if (translate >= slidesGrid[i]) {
            activeIndex = i;
          }
        }
        // Normalize slideIndex
        if (params.normalizeSlideIndex) {
          if (activeIndex < 0 || typeof activeIndex === 'undefined') activeIndex = 0;
        }
      }
      if (snapGrid.indexOf(translate) >= 0) {
        snapIndex = snapGrid.indexOf(translate);
      } else {
        snapIndex = Math.floor(activeIndex / params.slidesPerGroup);
      }
      if (snapIndex >= snapGrid.length) snapIndex = snapGrid.length - 1;
      if (activeIndex === previousIndex) {
        if (snapIndex !== previousSnapIndex) {
          swiper.snapIndex = snapIndex;
          swiper.emit('snapIndexChange');
        }
        return;
      }

      // Get real index
      const realIndex = parseInt(swiper.slides.eq(activeIndex).attr('data-swiper-slide-index') || activeIndex, 10);

      Utils.extend(swiper, {
        snapIndex,
        realIndex,
        previousIndex,
        activeIndex,
      });
      swiper.emit('activeIndexChange');
      swiper.emit('snapIndexChange');
      if (previousRealIndex !== realIndex) {
        swiper.emit('realIndexChange');
      }
      if (swiper.initialized || swiper.runCallbacksOnInit) {
        swiper.emit('slideChange');
      }
    }

    function updateClickedSlide (e) {
      const swiper = this;
      const params = swiper.params;
      const slide = $$1(e.target).closest(`.${params.slideClass}`)[0];
      let slideFound = false;
      if (slide) {
        for (let i = 0; i < swiper.slides.length; i += 1) {
          if (swiper.slides[i] === slide) slideFound = true;
        }
      }

      if (slide && slideFound) {
        swiper.clickedSlide = slide;
        if (swiper.virtual && swiper.params.virtual.enabled) {
          swiper.clickedIndex = parseInt($$1(slide).attr('data-swiper-slide-index'), 10);
        } else {
          swiper.clickedIndex = $$1(slide).index();
        }
      } else {
        swiper.clickedSlide = undefined;
        swiper.clickedIndex = undefined;
        return;
      }
      if (params.slideToClickedSlide && swiper.clickedIndex !== undefined && swiper.clickedIndex !== swiper.activeIndex) {
        swiper.slideToClickedSlide();
      }
    }

    var update = {
      updateSize,
      updateSlides,
      updateAutoHeight,
      updateSlidesOffset,
      updateSlidesProgress,
      updateProgress,
      updateSlidesClasses,
      updateActiveIndex,
      updateClickedSlide,
    };

    function getTranslate (axis = this.isHorizontal() ? 'x' : 'y') {
      const swiper = this;

      const {
        params, rtlTranslate: rtl, translate, $wrapperEl,
      } = swiper;

      if (params.virtualTranslate) {
        return rtl ? -translate : translate;
      }
      if (params.cssMode) {
        return translate;
      }

      let currentTranslate = Utils.getTranslate($wrapperEl[0], axis);
      if (rtl) currentTranslate = -currentTranslate;

      return currentTranslate || 0;
    }

    function setTranslate (translate, byController) {
      const swiper = this;
      const {
        rtlTranslate: rtl, params, $wrapperEl, wrapperEl, progress,
      } = swiper;
      let x = 0;
      let y = 0;
      const z = 0;

      if (swiper.isHorizontal()) {
        x = rtl ? -translate : translate;
      } else {
        y = translate;
      }

      if (params.roundLengths) {
        x = Math.floor(x);
        y = Math.floor(y);
      }

      if (params.cssMode) {
        wrapperEl[swiper.isHorizontal() ? 'scrollLeft' : 'scrollTop'] = swiper.isHorizontal() ? -x : -y;
      } else if (!params.virtualTranslate) {
        $wrapperEl.transform(`translate3d(${x}px, ${y}px, ${z}px)`);
      }
      swiper.previousTranslate = swiper.translate;
      swiper.translate = swiper.isHorizontal() ? x : y;

      // Check if we need to update progress
      let newProgress;
      const translatesDiff = swiper.maxTranslate() - swiper.minTranslate();
      if (translatesDiff === 0) {
        newProgress = 0;
      } else {
        newProgress = (translate - swiper.minTranslate()) / (translatesDiff);
      }
      if (newProgress !== progress) {
        swiper.updateProgress(translate);
      }

      swiper.emit('setTranslate', swiper.translate, byController);
    }

    function minTranslate () {
      return (-this.snapGrid[0]);
    }

    function maxTranslate () {
      return (-this.snapGrid[this.snapGrid.length - 1]);
    }

    function translateTo (translate = 0, speed = this.params.speed, runCallbacks = true, translateBounds = true, internal) {
      const swiper = this;

      const {
        params,
        wrapperEl,
      } = swiper;

      if (swiper.animating && params.preventInteractionOnTransition) {
        return false;
      }

      const minTranslate = swiper.minTranslate();
      const maxTranslate = swiper.maxTranslate();
      let newTranslate;
      if (translateBounds && translate > minTranslate) newTranslate = minTranslate;
      else if (translateBounds && translate < maxTranslate) newTranslate = maxTranslate;
      else newTranslate = translate;

      // Update progress
      swiper.updateProgress(newTranslate);

      if (params.cssMode) {
        const isH = swiper.isHorizontal();
        if (speed === 0) {
          wrapperEl[isH ? 'scrollLeft' : 'scrollTop'] = -newTranslate;
        } else {
          // eslint-disable-next-line
          if (wrapperEl.scrollTo) {
            wrapperEl.scrollTo({
              [isH ? 'left' : 'top']: -newTranslate,
              behavior: 'smooth',
            });
          } else {
            wrapperEl[isH ? 'scrollLeft' : 'scrollTop'] = -newTranslate;
          }
        }
        return true;
      }

      if (speed === 0) {
        swiper.setTransition(0);
        swiper.setTranslate(newTranslate);
        if (runCallbacks) {
          swiper.emit('beforeTransitionStart', speed, internal);
          swiper.emit('transitionEnd');
        }
      } else {
        swiper.setTransition(speed);
        swiper.setTranslate(newTranslate);
        if (runCallbacks) {
          swiper.emit('beforeTransitionStart', speed, internal);
          swiper.emit('transitionStart');
        }
        if (!swiper.animating) {
          swiper.animating = true;
          if (!swiper.onTranslateToWrapperTransitionEnd) {
            swiper.onTranslateToWrapperTransitionEnd = function transitionEnd(e) {
              if (!swiper || swiper.destroyed) return;
              if (e.target !== this) return;
              swiper.$wrapperEl[0].removeEventListener('transitionend', swiper.onTranslateToWrapperTransitionEnd);
              swiper.$wrapperEl[0].removeEventListener('webkitTransitionEnd', swiper.onTranslateToWrapperTransitionEnd);
              swiper.onTranslateToWrapperTransitionEnd = null;
              delete swiper.onTranslateToWrapperTransitionEnd;
              if (runCallbacks) {
                swiper.emit('transitionEnd');
              }
            };
          }
          swiper.$wrapperEl[0].addEventListener('transitionend', swiper.onTranslateToWrapperTransitionEnd);
          swiper.$wrapperEl[0].addEventListener('webkitTransitionEnd', swiper.onTranslateToWrapperTransitionEnd);
        }
      }

      return true;
    }

    var translate = {
      getTranslate,
      setTranslate,
      minTranslate,
      maxTranslate,
      translateTo,
    };

    function setTransition (duration, byController) {
      const swiper = this;

      if (!swiper.params.cssMode) {
        swiper.$wrapperEl.transition(duration);
      }

      swiper.emit('setTransition', duration, byController);
    }

    function transitionStart (runCallbacks = true, direction) {
      const swiper = this;
      const { activeIndex, params, previousIndex } = swiper;
      if (params.cssMode) return;
      if (params.autoHeight) {
        swiper.updateAutoHeight();
      }

      let dir = direction;
      if (!dir) {
        if (activeIndex > previousIndex) dir = 'next';
        else if (activeIndex < previousIndex) dir = 'prev';
        else dir = 'reset';
      }

      swiper.emit('transitionStart');

      if (runCallbacks && activeIndex !== previousIndex) {
        if (dir === 'reset') {
          swiper.emit('slideResetTransitionStart');
          return;
        }
        swiper.emit('slideChangeTransitionStart');
        if (dir === 'next') {
          swiper.emit('slideNextTransitionStart');
        } else {
          swiper.emit('slidePrevTransitionStart');
        }
      }
    }

    function transitionEnd$1 (runCallbacks = true, direction) {
      const swiper = this;
      const { activeIndex, previousIndex, params } = swiper;
      swiper.animating = false;
      if (params.cssMode) return;
      swiper.setTransition(0);

      let dir = direction;
      if (!dir) {
        if (activeIndex > previousIndex) dir = 'next';
        else if (activeIndex < previousIndex) dir = 'prev';
        else dir = 'reset';
      }

      swiper.emit('transitionEnd');

      if (runCallbacks && activeIndex !== previousIndex) {
        if (dir === 'reset') {
          swiper.emit('slideResetTransitionEnd');
          return;
        }
        swiper.emit('slideChangeTransitionEnd');
        if (dir === 'next') {
          swiper.emit('slideNextTransitionEnd');
        } else {
          swiper.emit('slidePrevTransitionEnd');
        }
      }
    }

    var transition$1 = {
      setTransition,
      transitionStart,
      transitionEnd: transitionEnd$1,
    };

    function slideTo (index = 0, speed = this.params.speed, runCallbacks = true, internal) {
      const swiper = this;
      let slideIndex = index;
      if (slideIndex < 0) slideIndex = 0;

      const {
        params, snapGrid, slidesGrid, previousIndex, activeIndex, rtlTranslate: rtl, wrapperEl,
      } = swiper;
      if (swiper.animating && params.preventInteractionOnTransition) {
        return false;
      }

      let snapIndex = Math.floor(slideIndex / params.slidesPerGroup);
      if (snapIndex >= snapGrid.length) snapIndex = snapGrid.length - 1;

      if ((activeIndex || params.initialSlide || 0) === (previousIndex || 0) && runCallbacks) {
        swiper.emit('beforeSlideChangeStart');
      }

      const translate = -snapGrid[snapIndex];

      // Update progress
      swiper.updateProgress(translate);

      // Normalize slideIndex
      if (params.normalizeSlideIndex) {
        for (let i = 0; i < slidesGrid.length; i += 1) {
          if (-Math.floor(translate * 100) >= Math.floor(slidesGrid[i] * 100)) {
            slideIndex = i;
          }
        }
      }
      // Directions locks
      if (swiper.initialized && slideIndex !== activeIndex) {
        if (!swiper.allowSlideNext && translate < swiper.translate && translate < swiper.minTranslate()) {
          return false;
        }
        if (!swiper.allowSlidePrev && translate > swiper.translate && translate > swiper.maxTranslate()) {
          if ((activeIndex || 0) !== slideIndex) return false;
        }
      }

      let direction;
      if (slideIndex > activeIndex) direction = 'next';
      else if (slideIndex < activeIndex) direction = 'prev';
      else direction = 'reset';


      // Update Index
      if ((rtl && -translate === swiper.translate) || (!rtl && translate === swiper.translate)) {
        swiper.updateActiveIndex(slideIndex);
        // Update Height
        if (params.autoHeight) {
          swiper.updateAutoHeight();
        }
        swiper.updateSlidesClasses();
        if (params.effect !== 'slide') {
          swiper.setTranslate(translate);
        }
        if (direction !== 'reset') {
          swiper.transitionStart(runCallbacks, direction);
          swiper.transitionEnd(runCallbacks, direction);
        }
        return false;
      }
      if (params.cssMode) {
        const isH = swiper.isHorizontal();
        if (speed === 0) {
          wrapperEl[isH ? 'scrollLeft' : 'scrollTop'] = -translate;
        } else {
          // eslint-disable-next-line
          if (wrapperEl.scrollTo) {
            wrapperEl.scrollTo({
              [isH ? 'left' : 'top']: -translate,
              behavior: 'smooth',
            });
          } else {
            wrapperEl[isH ? 'scrollLeft' : 'scrollTop'] = -translate;
          }
        }
        return true;
      }

      if (speed === 0) {
        swiper.setTransition(0);
        swiper.setTranslate(translate);
        swiper.updateActiveIndex(slideIndex);
        swiper.updateSlidesClasses();
        swiper.emit('beforeTransitionStart', speed, internal);
        swiper.transitionStart(runCallbacks, direction);
        swiper.transitionEnd(runCallbacks, direction);
      } else {
        swiper.setTransition(speed);
        swiper.setTranslate(translate);
        swiper.updateActiveIndex(slideIndex);
        swiper.updateSlidesClasses();
        swiper.emit('beforeTransitionStart', speed, internal);
        swiper.transitionStart(runCallbacks, direction);
        if (!swiper.animating) {
          swiper.animating = true;
          if (!swiper.onSlideToWrapperTransitionEnd) {
            swiper.onSlideToWrapperTransitionEnd = function transitionEnd(e) {
              if (!swiper || swiper.destroyed) return;
              if (e.target !== this) return;
              swiper.$wrapperEl[0].removeEventListener('transitionend', swiper.onSlideToWrapperTransitionEnd);
              swiper.$wrapperEl[0].removeEventListener('webkitTransitionEnd', swiper.onSlideToWrapperTransitionEnd);
              swiper.onSlideToWrapperTransitionEnd = null;
              delete swiper.onSlideToWrapperTransitionEnd;
              swiper.transitionEnd(runCallbacks, direction);
            };
          }
          swiper.$wrapperEl[0].addEventListener('transitionend', swiper.onSlideToWrapperTransitionEnd);
          swiper.$wrapperEl[0].addEventListener('webkitTransitionEnd', swiper.onSlideToWrapperTransitionEnd);
        }
      }

      return true;
    }

    function slideToLoop (index = 0, speed = this.params.speed, runCallbacks = true, internal) {
      const swiper = this;
      let newIndex = index;
      if (swiper.params.loop) {
        newIndex += swiper.loopedSlides;
      }

      return swiper.slideTo(newIndex, speed, runCallbacks, internal);
    }

    /* eslint no-unused-vars: "off" */
    function slideNext (speed = this.params.speed, runCallbacks = true, internal) {
      const swiper = this;
      const { params, animating } = swiper;
      if (params.loop) {
        if (animating) return false;
        swiper.loopFix();
        // eslint-disable-next-line
        swiper._clientLeft = swiper.$wrapperEl[0].clientLeft;
        return swiper.slideTo(swiper.activeIndex + params.slidesPerGroup, speed, runCallbacks, internal);
      }
      return swiper.slideTo(swiper.activeIndex + params.slidesPerGroup, speed, runCallbacks, internal);
    }

    /* eslint no-unused-vars: "off" */
    function slidePrev (speed = this.params.speed, runCallbacks = true, internal) {
      const swiper = this;
      const {
        params, animating, snapGrid, slidesGrid, rtlTranslate,
      } = swiper;

      if (params.loop) {
        if (animating) return false;
        swiper.loopFix();
        // eslint-disable-next-line
        swiper._clientLeft = swiper.$wrapperEl[0].clientLeft;
      }
      const translate = rtlTranslate ? swiper.translate : -swiper.translate;
      function normalize(val) {
        if (val < 0) return -Math.floor(Math.abs(val));
        return Math.floor(val);
      }
      const normalizedTranslate = normalize(translate);
      const normalizedSnapGrid = snapGrid.map((val) => normalize(val));
      const normalizedSlidesGrid = slidesGrid.map((val) => normalize(val));

      const currentSnap = snapGrid[normalizedSnapGrid.indexOf(normalizedTranslate)];
      let prevSnap = snapGrid[normalizedSnapGrid.indexOf(normalizedTranslate) - 1];
      if (typeof prevSnap === 'undefined' && params.cssMode) {
        snapGrid.forEach((snap) => {
          if (!prevSnap && normalizedTranslate >= snap) prevSnap = snap;
        });
      }
      let prevIndex;
      if (typeof prevSnap !== 'undefined') {
        prevIndex = slidesGrid.indexOf(prevSnap);
        if (prevIndex < 0) prevIndex = swiper.activeIndex - 1;
      }
      return swiper.slideTo(prevIndex, speed, runCallbacks, internal);
    }

    /* eslint no-unused-vars: "off" */
    function slideReset (speed = this.params.speed, runCallbacks = true, internal) {
      const swiper = this;
      return swiper.slideTo(swiper.activeIndex, speed, runCallbacks, internal);
    }

    /* eslint no-unused-vars: "off" */
    function slideToClosest (speed = this.params.speed, runCallbacks = true, internal, threshold = 0.5) {
      const swiper = this;
      let index = swiper.activeIndex;
      const snapIndex = Math.floor(index / swiper.params.slidesPerGroup);

      const translate = swiper.rtlTranslate ? swiper.translate : -swiper.translate;

      if (translate >= swiper.snapGrid[snapIndex]) {
        // The current translate is on or after the current snap index, so the choice
        // is between the current index and the one after it.
        const currentSnap = swiper.snapGrid[snapIndex];
        const nextSnap = swiper.snapGrid[snapIndex + 1];
        if ((translate - currentSnap) > (nextSnap - currentSnap) * threshold) {
          index += swiper.params.slidesPerGroup;
        }
      } else {
        // The current translate is before the current snap index, so the choice
        // is between the current index and the one before it.
        const prevSnap = swiper.snapGrid[snapIndex - 1];
        const currentSnap = swiper.snapGrid[snapIndex];
        if ((translate - prevSnap) <= (currentSnap - prevSnap) * threshold) {
          index -= swiper.params.slidesPerGroup;
        }
      }
      index = Math.max(index, 0);
      index = Math.min(index, swiper.snapGrid.length - 1);

      return swiper.slideTo(index, speed, runCallbacks, internal);
    }

    function slideToClickedSlide () {
      const swiper = this;
      const { params, $wrapperEl } = swiper;

      const slidesPerView = params.slidesPerView === 'auto' ? swiper.slidesPerViewDynamic() : params.slidesPerView;
      let slideToIndex = swiper.clickedIndex;
      let realIndex;
      if (params.loop) {
        if (swiper.animating) return;
        realIndex = parseInt($$1(swiper.clickedSlide).attr('data-swiper-slide-index'), 10);
        if (params.centeredSlides) {
          if (
            (slideToIndex < swiper.loopedSlides - (slidesPerView / 2))
            || (slideToIndex > (swiper.slides.length - swiper.loopedSlides) + (slidesPerView / 2))
          ) {
            swiper.loopFix();
            slideToIndex = $wrapperEl
              .children(`.${params.slideClass}[data-swiper-slide-index="${realIndex}"]:not(.${params.slideDuplicateClass})`)
              .eq(0)
              .index();

            Utils.nextTick(() => {
              swiper.slideTo(slideToIndex);
            });
          } else {
            swiper.slideTo(slideToIndex);
          }
        } else if (slideToIndex > swiper.slides.length - slidesPerView) {
          swiper.loopFix();
          slideToIndex = $wrapperEl
            .children(`.${params.slideClass}[data-swiper-slide-index="${realIndex}"]:not(.${params.slideDuplicateClass})`)
            .eq(0)
            .index();

          Utils.nextTick(() => {
            swiper.slideTo(slideToIndex);
          });
        } else {
          swiper.slideTo(slideToIndex);
        }
      } else {
        swiper.slideTo(slideToIndex);
      }
    }

    var slide = {
      slideTo,
      slideToLoop,
      slideNext,
      slidePrev,
      slideReset,
      slideToClosest,
      slideToClickedSlide,
    };

    function loopCreate () {
      const swiper = this;
      const { params, $wrapperEl } = swiper;
      // Remove duplicated slides
      $wrapperEl.children(`.${params.slideClass}.${params.slideDuplicateClass}`).remove();

      let slides = $wrapperEl.children(`.${params.slideClass}`);

      if (params.loopFillGroupWithBlank) {
        const blankSlidesNum = params.slidesPerGroup - (slides.length % params.slidesPerGroup);
        if (blankSlidesNum !== params.slidesPerGroup) {
          for (let i = 0; i < blankSlidesNum; i += 1) {
            const blankNode = $$1(doc.createElement('div')).addClass(`${params.slideClass} ${params.slideBlankClass}`);
            $wrapperEl.append(blankNode);
          }
          slides = $wrapperEl.children(`.${params.slideClass}`);
        }
      }

      if (params.slidesPerView === 'auto' && !params.loopedSlides) params.loopedSlides = slides.length;

      swiper.loopedSlides = Math.ceil(parseFloat(params.loopedSlides || params.slidesPerView, 10));
      swiper.loopedSlides += params.loopAdditionalSlides;
      if (swiper.loopedSlides > slides.length) {
        swiper.loopedSlides = slides.length;
      }

      const prependSlides = [];
      const appendSlides = [];
      slides.each((index, el) => {
        const slide = $$1(el);
        if (index < swiper.loopedSlides) appendSlides.push(el);
        if (index < slides.length && index >= slides.length - swiper.loopedSlides) prependSlides.push(el);
        slide.attr('data-swiper-slide-index', index);
      });
      for (let i = 0; i < appendSlides.length; i += 1) {
        $wrapperEl.append($$1(appendSlides[i].cloneNode(true)).addClass(params.slideDuplicateClass));
      }
      for (let i = prependSlides.length - 1; i >= 0; i -= 1) {
        $wrapperEl.prepend($$1(prependSlides[i].cloneNode(true)).addClass(params.slideDuplicateClass));
      }
    }

    function loopFix () {
      const swiper = this;

      swiper.emit('beforeLoopFix');

      const {
        activeIndex, slides, loopedSlides, allowSlidePrev, allowSlideNext, snapGrid, rtlTranslate: rtl,
      } = swiper;
      let newIndex;
      swiper.allowSlidePrev = true;
      swiper.allowSlideNext = true;

      const snapTranslate = -snapGrid[activeIndex];
      const diff = snapTranslate - swiper.getTranslate();

      // Fix For Negative Oversliding
      if (activeIndex < loopedSlides) {
        newIndex = (slides.length - (loopedSlides * 3)) + activeIndex;
        newIndex += loopedSlides;
        const slideChanged = swiper.slideTo(newIndex, 0, false, true);
        if (slideChanged && diff !== 0) {
          swiper.setTranslate((rtl ? -swiper.translate : swiper.translate) - diff);
        }
      } else if (activeIndex >= slides.length - loopedSlides) {
        // Fix For Positive Oversliding
        newIndex = -slides.length + activeIndex + loopedSlides;
        newIndex += loopedSlides;
        const slideChanged = swiper.slideTo(newIndex, 0, false, true);
        if (slideChanged && diff !== 0) {
          swiper.setTranslate((rtl ? -swiper.translate : swiper.translate) - diff);
        }
      }
      swiper.allowSlidePrev = allowSlidePrev;
      swiper.allowSlideNext = allowSlideNext;

      swiper.emit('loopFix');
    }

    function loopDestroy () {
      const swiper = this;
      const { $wrapperEl, params, slides } = swiper;
      $wrapperEl.children(`.${params.slideClass}.${params.slideDuplicateClass},.${params.slideClass}.${params.slideBlankClass}`).remove();
      slides.removeAttr('data-swiper-slide-index');
    }

    var loop = {
      loopCreate,
      loopFix,
      loopDestroy,
    };

    function setGrabCursor (moving) {
      const swiper = this;
      if (Support.touch || !swiper.params.simulateTouch || (swiper.params.watchOverflow && swiper.isLocked) || swiper.params.cssMode) return;
      const el = swiper.el;
      el.style.cursor = 'move';
      el.style.cursor = moving ? '-webkit-grabbing' : '-webkit-grab';
      el.style.cursor = moving ? '-moz-grabbin' : '-moz-grab';
      el.style.cursor = moving ? 'grabbing' : 'grab';
    }

    function unsetGrabCursor () {
      const swiper = this;
      if (Support.touch || (swiper.params.watchOverflow && swiper.isLocked) || swiper.params.cssMode) return;
      swiper.el.style.cursor = '';
    }

    var grabCursor = {
      setGrabCursor,
      unsetGrabCursor,
    };

    function appendSlide (slides) {
      const swiper = this;
      const { $wrapperEl, params } = swiper;
      if (params.loop) {
        swiper.loopDestroy();
      }
      if (typeof slides === 'object' && 'length' in slides) {
        for (let i = 0; i < slides.length; i += 1) {
          if (slides[i]) $wrapperEl.append(slides[i]);
        }
      } else {
        $wrapperEl.append(slides);
      }
      if (params.loop) {
        swiper.loopCreate();
      }
      if (!(params.observer && Support.observer)) {
        swiper.update();
      }
    }

    function prependSlide (slides) {
      const swiper = this;
      const { params, $wrapperEl, activeIndex } = swiper;

      if (params.loop) {
        swiper.loopDestroy();
      }
      let newActiveIndex = activeIndex + 1;
      if (typeof slides === 'object' && 'length' in slides) {
        for (let i = 0; i < slides.length; i += 1) {
          if (slides[i]) $wrapperEl.prepend(slides[i]);
        }
        newActiveIndex = activeIndex + slides.length;
      } else {
        $wrapperEl.prepend(slides);
      }
      if (params.loop) {
        swiper.loopCreate();
      }
      if (!(params.observer && Support.observer)) {
        swiper.update();
      }
      swiper.slideTo(newActiveIndex, 0, false);
    }

    function addSlide (index, slides) {
      const swiper = this;
      const { $wrapperEl, params, activeIndex } = swiper;
      let activeIndexBuffer = activeIndex;
      if (params.loop) {
        activeIndexBuffer -= swiper.loopedSlides;
        swiper.loopDestroy();
        swiper.slides = $wrapperEl.children(`.${params.slideClass}`);
      }
      const baseLength = swiper.slides.length;
      if (index <= 0) {
        swiper.prependSlide(slides);
        return;
      }
      if (index >= baseLength) {
        swiper.appendSlide(slides);
        return;
      }
      let newActiveIndex = activeIndexBuffer > index ? activeIndexBuffer + 1 : activeIndexBuffer;

      const slidesBuffer = [];
      for (let i = baseLength - 1; i >= index; i -= 1) {
        const currentSlide = swiper.slides.eq(i);
        currentSlide.remove();
        slidesBuffer.unshift(currentSlide);
      }

      if (typeof slides === 'object' && 'length' in slides) {
        for (let i = 0; i < slides.length; i += 1) {
          if (slides[i]) $wrapperEl.append(slides[i]);
        }
        newActiveIndex = activeIndexBuffer > index ? activeIndexBuffer + slides.length : activeIndexBuffer;
      } else {
        $wrapperEl.append(slides);
      }

      for (let i = 0; i < slidesBuffer.length; i += 1) {
        $wrapperEl.append(slidesBuffer[i]);
      }

      if (params.loop) {
        swiper.loopCreate();
      }
      if (!(params.observer && Support.observer)) {
        swiper.update();
      }
      if (params.loop) {
        swiper.slideTo(newActiveIndex + swiper.loopedSlides, 0, false);
      } else {
        swiper.slideTo(newActiveIndex, 0, false);
      }
    }

    function removeSlide (slidesIndexes) {
      const swiper = this;
      const { params, $wrapperEl, activeIndex } = swiper;

      let activeIndexBuffer = activeIndex;
      if (params.loop) {
        activeIndexBuffer -= swiper.loopedSlides;
        swiper.loopDestroy();
        swiper.slides = $wrapperEl.children(`.${params.slideClass}`);
      }
      let newActiveIndex = activeIndexBuffer;
      let indexToRemove;

      if (typeof slidesIndexes === 'object' && 'length' in slidesIndexes) {
        for (let i = 0; i < slidesIndexes.length; i += 1) {
          indexToRemove = slidesIndexes[i];
          if (swiper.slides[indexToRemove]) swiper.slides.eq(indexToRemove).remove();
          if (indexToRemove < newActiveIndex) newActiveIndex -= 1;
        }
        newActiveIndex = Math.max(newActiveIndex, 0);
      } else {
        indexToRemove = slidesIndexes;
        if (swiper.slides[indexToRemove]) swiper.slides.eq(indexToRemove).remove();
        if (indexToRemove < newActiveIndex) newActiveIndex -= 1;
        newActiveIndex = Math.max(newActiveIndex, 0);
      }

      if (params.loop) {
        swiper.loopCreate();
      }

      if (!(params.observer && Support.observer)) {
        swiper.update();
      }
      if (params.loop) {
        swiper.slideTo(newActiveIndex + swiper.loopedSlides, 0, false);
      } else {
        swiper.slideTo(newActiveIndex, 0, false);
      }
    }

    function removeAllSlides () {
      const swiper = this;

      const slidesIndexes = [];
      for (let i = 0; i < swiper.slides.length; i += 1) {
        slidesIndexes.push(i);
      }
      swiper.removeSlide(slidesIndexes);
    }

    var manipulation = {
      appendSlide,
      prependSlide,
      addSlide,
      removeSlide,
      removeAllSlides,
    };

    const Device = (function Device() {
      const platform = win.navigator.platform;
      const ua = win.navigator.userAgent;

      const device = {
        ios: false,
        android: false,
        androidChrome: false,
        desktop: false,
        iphone: false,
        ipod: false,
        ipad: false,
        edge: false,
        ie: false,
        firefox: false,
        macos: false,
        windows: false,
        cordova: !!(win.cordova || win.phonegap),
        phonegap: !!(win.cordova || win.phonegap),
        electron: false,
      };

      const screenWidth = win.screen.width;
      const screenHeight = win.screen.height;

      const android = ua.match(/(Android);?[\s\/]+([\d.]+)?/); // eslint-disable-line
      let ipad = ua.match(/(iPad).*OS\s([\d_]+)/);
      const ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/);
      const iphone = !ipad && ua.match(/(iPhone\sOS|iOS)\s([\d_]+)/);
      const ie = ua.indexOf('MSIE ') >= 0 || ua.indexOf('Trident/') >= 0;
      const edge = ua.indexOf('Edge/') >= 0;
      const firefox = ua.indexOf('Gecko/') >= 0 && ua.indexOf('Firefox/') >= 0;
      const windows = platform === 'Win32';
      const electron = ua.toLowerCase().indexOf('electron') >= 0;
      let macos = platform === 'MacIntel';

      // iPadOs 13 fix
      if (!ipad
        && macos
        && Support.touch
        && (
          (screenWidth === 1024 && screenHeight === 1366) // Pro 12.9
          || (screenWidth === 834 && screenHeight === 1194) // Pro 11
          || (screenWidth === 834 && screenHeight === 1112) // Pro 10.5
          || (screenWidth === 768 && screenHeight === 1024) // other
        )
      ) {
        ipad = ua.match(/(Version)\/([\d.]+)/);
        macos = false;
      }

      device.ie = ie;
      device.edge = edge;
      device.firefox = firefox;

      // Android
      if (android && !windows) {
        device.os = 'android';
        device.osVersion = android[2];
        device.android = true;
        device.androidChrome = ua.toLowerCase().indexOf('chrome') >= 0;
      }
      if (ipad || iphone || ipod) {
        device.os = 'ios';
        device.ios = true;
      }
      // iOS
      if (iphone && !ipod) {
        device.osVersion = iphone[2].replace(/_/g, '.');
        device.iphone = true;
      }
      if (ipad) {
        device.osVersion = ipad[2].replace(/_/g, '.');
        device.ipad = true;
      }
      if (ipod) {
        device.osVersion = ipod[3] ? ipod[3].replace(/_/g, '.') : null;
        device.ipod = true;
      }
      // iOS 8+ changed UA
      if (device.ios && device.osVersion && ua.indexOf('Version/') >= 0) {
        if (device.osVersion.split('.')[0] === '10') {
          device.osVersion = ua.toLowerCase().split('version/')[1].split(' ')[0];
        }
      }

      // Webview
      device.webView = !!((iphone || ipad || ipod) && (ua.match(/.*AppleWebKit(?!.*Safari)/i) || win.navigator.standalone))
        || (win.matchMedia && win.matchMedia('(display-mode: standalone)').matches);
      device.webview = device.webView;
      device.standalone = device.webView;

      // Desktop
      device.desktop = !(device.ios || device.android) || electron;
      if (device.desktop) {
        device.electron = electron;
        device.macos = macos;
        device.windows = windows;
        if (device.macos) {
          device.os = 'macos';
        }
        if (device.windows) {
          device.os = 'windows';
        }
      }

      // Pixel Ratio
      device.pixelRatio = win.devicePixelRatio || 1;

      // Export object
      return device;
    }());

    function onTouchStart (event) {
      const swiper = this;
      const data = swiper.touchEventsData;
      const { params, touches } = swiper;

      if (swiper.animating && params.preventInteractionOnTransition) {
        return;
      }
      let e = event;
      if (e.originalEvent) e = e.originalEvent;
      const $targetEl = $$1(e.target);

      if (params.touchEventsTarget === 'wrapper') {
        if (!$targetEl.closest(swiper.wrapperEl).length) return;
      }
      data.isTouchEvent = e.type === 'touchstart';
      if (!data.isTouchEvent && 'which' in e && e.which === 3) return;
      if (!data.isTouchEvent && 'button' in e && e.button > 0) return;
      if (data.isTouched && data.isMoved) return;
      if (params.noSwiping && $targetEl.closest(params.noSwipingSelector ? params.noSwipingSelector : `.${params.noSwipingClass}`)[0]) {
        swiper.allowClick = true;
        return;
      }
      if (params.swipeHandler) {
        if (!$targetEl.closest(params.swipeHandler)[0]) return;
      }

      touches.currentX = e.type === 'touchstart' ? e.targetTouches[0].pageX : e.pageX;
      touches.currentY = e.type === 'touchstart' ? e.targetTouches[0].pageY : e.pageY;
      const startX = touches.currentX;
      const startY = touches.currentY;

      // Do NOT start if iOS edge swipe is detected. Otherwise iOS app (UIWebView) cannot swipe-to-go-back anymore

      const edgeSwipeDetection = params.edgeSwipeDetection || params.iOSEdgeSwipeDetection;
      const edgeSwipeThreshold = params.edgeSwipeThreshold || params.iOSEdgeSwipeThreshold;
      if (
        edgeSwipeDetection
        && ((startX <= edgeSwipeThreshold)
        || (startX >= win.screen.width - edgeSwipeThreshold))
      ) {
        return;
      }

      Utils.extend(data, {
        isTouched: true,
        isMoved: false,
        allowTouchCallbacks: true,
        isScrolling: undefined,
        startMoving: undefined,
      });

      touches.startX = startX;
      touches.startY = startY;
      data.touchStartTime = Utils.now();
      swiper.allowClick = true;
      swiper.updateSize();
      swiper.swipeDirection = undefined;
      if (params.threshold > 0) data.allowThresholdMove = false;
      if (e.type !== 'touchstart') {
        let preventDefault = true;
        if ($targetEl.is(data.formElements)) preventDefault = false;
        if (
          doc.activeElement
          && $$1(doc.activeElement).is(data.formElements)
          && doc.activeElement !== $targetEl[0]
        ) {
          doc.activeElement.blur();
        }

        const shouldPreventDefault = preventDefault && swiper.allowTouchMove && params.touchStartPreventDefault;
        if (params.touchStartForcePreventDefault || shouldPreventDefault) {
          e.preventDefault();
        }
      }
      swiper.emit('touchStart', e);
    }

    function onTouchMove (event) {
      const swiper = this;
      const data = swiper.touchEventsData;
      const { params, touches, rtlTranslate: rtl } = swiper;
      let e = event;
      if (e.originalEvent) e = e.originalEvent;
      if (!data.isTouched) {
        if (data.startMoving && data.isScrolling) {
          swiper.emit('touchMoveOpposite', e);
        }
        return;
      }
      if (data.isTouchEvent && e.type === 'mousemove') return;
      const targetTouch = e.type === 'touchmove' && e.targetTouches && (e.targetTouches[0] || e.changedTouches[0]);
      const pageX = e.type === 'touchmove' ? targetTouch.pageX : e.pageX;
      const pageY = e.type === 'touchmove' ? targetTouch.pageY : e.pageY;
      if (e.preventedByNestedSwiper) {
        touches.startX = pageX;
        touches.startY = pageY;
        return;
      }
      if (!swiper.allowTouchMove) {
        // isMoved = true;
        swiper.allowClick = false;
        if (data.isTouched) {
          Utils.extend(touches, {
            startX: pageX,
            startY: pageY,
            currentX: pageX,
            currentY: pageY,
          });
          data.touchStartTime = Utils.now();
        }
        return;
      }
      if (data.isTouchEvent && params.touchReleaseOnEdges && !params.loop) {
        if (swiper.isVertical()) {
          // Vertical
          if (
            (pageY < touches.startY && swiper.translate <= swiper.maxTranslate())
            || (pageY > touches.startY && swiper.translate >= swiper.minTranslate())
          ) {
            data.isTouched = false;
            data.isMoved = false;
            return;
          }
        } else if (
          (pageX < touches.startX && swiper.translate <= swiper.maxTranslate())
          || (pageX > touches.startX && swiper.translate >= swiper.minTranslate())
        ) {
          return;
        }
      }
      if (data.isTouchEvent && doc.activeElement) {
        if (e.target === doc.activeElement && $$1(e.target).is(data.formElements)) {
          data.isMoved = true;
          swiper.allowClick = false;
          return;
        }
      }
      if (data.allowTouchCallbacks) {
        swiper.emit('touchMove', e);
      }
      if (e.targetTouches && e.targetTouches.length > 1) return;

      touches.currentX = pageX;
      touches.currentY = pageY;

      const diffX = touches.currentX - touches.startX;
      const diffY = touches.currentY - touches.startY;
      if (swiper.params.threshold && Math.sqrt((diffX ** 2) + (diffY ** 2)) < swiper.params.threshold) return;

      if (typeof data.isScrolling === 'undefined') {
        let touchAngle;
        if ((swiper.isHorizontal() && touches.currentY === touches.startY) || (swiper.isVertical() && touches.currentX === touches.startX)) {
          data.isScrolling = false;
        } else {
          // eslint-disable-next-line
          if ((diffX * diffX) + (diffY * diffY) >= 25) {
            touchAngle = (Math.atan2(Math.abs(diffY), Math.abs(diffX)) * 180) / Math.PI;
            data.isScrolling = swiper.isHorizontal() ? touchAngle > params.touchAngle : (90 - touchAngle > params.touchAngle);
          }
        }
      }
      if (data.isScrolling) {
        swiper.emit('touchMoveOpposite', e);
      }
      if (typeof data.startMoving === 'undefined') {
        if (touches.currentX !== touches.startX || touches.currentY !== touches.startY) {
          data.startMoving = true;
        }
      }
      if (data.isScrolling) {
        data.isTouched = false;
        return;
      }
      if (!data.startMoving) {
        return;
      }
      swiper.allowClick = false;
      if (!params.cssMode) {
        e.preventDefault();
      }
      if (params.touchMoveStopPropagation && !params.nested) {
        e.stopPropagation();
      }

      if (!data.isMoved) {
        if (params.loop) {
          swiper.loopFix();
        }
        data.startTranslate = swiper.getTranslate();
        swiper.setTransition(0);
        if (swiper.animating) {
          swiper.$wrapperEl.trigger('webkitTransitionEnd transitionend');
        }
        data.allowMomentumBounce = false;
        // Grab Cursor
        if (params.grabCursor && (swiper.allowSlideNext === true || swiper.allowSlidePrev === true)) {
          swiper.setGrabCursor(true);
        }
        swiper.emit('sliderFirstMove', e);
      }
      swiper.emit('sliderMove', e);
      data.isMoved = true;

      let diff = swiper.isHorizontal() ? diffX : diffY;
      touches.diff = diff;

      diff *= params.touchRatio;
      if (rtl) diff = -diff;

      swiper.swipeDirection = diff > 0 ? 'prev' : 'next';
      data.currentTranslate = diff + data.startTranslate;

      let disableParentSwiper = true;
      let resistanceRatio = params.resistanceRatio;
      if (params.touchReleaseOnEdges) {
        resistanceRatio = 0;
      }
      if ((diff > 0 && data.currentTranslate > swiper.minTranslate())) {
        disableParentSwiper = false;
        if (params.resistance) data.currentTranslate = (swiper.minTranslate() - 1) + ((-swiper.minTranslate() + data.startTranslate + diff) ** resistanceRatio);
      } else if (diff < 0 && data.currentTranslate < swiper.maxTranslate()) {
        disableParentSwiper = false;
        if (params.resistance) data.currentTranslate = (swiper.maxTranslate() + 1) - ((swiper.maxTranslate() - data.startTranslate - diff) ** resistanceRatio);
      }

      if (disableParentSwiper) {
        e.preventedByNestedSwiper = true;
      }

      // Directions locks
      if (!swiper.allowSlideNext && swiper.swipeDirection === 'next' && data.currentTranslate < data.startTranslate) {
        data.currentTranslate = data.startTranslate;
      }
      if (!swiper.allowSlidePrev && swiper.swipeDirection === 'prev' && data.currentTranslate > data.startTranslate) {
        data.currentTranslate = data.startTranslate;
      }


      // Threshold
      if (params.threshold > 0) {
        if (Math.abs(diff) > params.threshold || data.allowThresholdMove) {
          if (!data.allowThresholdMove) {
            data.allowThresholdMove = true;
            touches.startX = touches.currentX;
            touches.startY = touches.currentY;
            data.currentTranslate = data.startTranslate;
            touches.diff = swiper.isHorizontal() ? touches.currentX - touches.startX : touches.currentY - touches.startY;
            return;
          }
        } else {
          data.currentTranslate = data.startTranslate;
          return;
        }
      }

      if (!params.followFinger || params.cssMode) return;

      // Update active index in free mode
      if (params.freeMode || params.watchSlidesProgress || params.watchSlidesVisibility) {
        swiper.updateActiveIndex();
        swiper.updateSlidesClasses();
      }
      if (params.freeMode) {
        // Velocity
        if (data.velocities.length === 0) {
          data.velocities.push({
            position: touches[swiper.isHorizontal() ? 'startX' : 'startY'],
            time: data.touchStartTime,
          });
        }
        data.velocities.push({
          position: touches[swiper.isHorizontal() ? 'currentX' : 'currentY'],
          time: Utils.now(),
        });
      }
      // Update progress
      swiper.updateProgress(data.currentTranslate);
      // Update translate
      swiper.setTranslate(data.currentTranslate);
    }

    function onTouchEnd (event) {
      const swiper = this;
      const data = swiper.touchEventsData;

      const {
        params, touches, rtlTranslate: rtl, $wrapperEl, slidesGrid, snapGrid,
      } = swiper;
      let e = event;
      if (e.originalEvent) e = e.originalEvent;
      if (data.allowTouchCallbacks) {
        swiper.emit('touchEnd', e);
      }
      data.allowTouchCallbacks = false;
      if (!data.isTouched) {
        if (data.isMoved && params.grabCursor) {
          swiper.setGrabCursor(false);
        }
        data.isMoved = false;
        data.startMoving = false;
        return;
      }
      // Return Grab Cursor
      if (params.grabCursor && data.isMoved && data.isTouched && (swiper.allowSlideNext === true || swiper.allowSlidePrev === true)) {
        swiper.setGrabCursor(false);
      }

      // Time diff
      const touchEndTime = Utils.now();
      const timeDiff = touchEndTime - data.touchStartTime;

      // Tap, doubleTap, Click
      if (swiper.allowClick) {
        swiper.updateClickedSlide(e);
        swiper.emit('tap click', e);
        if (timeDiff < 300 && (touchEndTime - data.lastClickTime) < 300) {
          swiper.emit('doubleTap doubleClick', e);
        }
      }

      data.lastClickTime = Utils.now();
      Utils.nextTick(() => {
        if (!swiper.destroyed) swiper.allowClick = true;
      });

      if (!data.isTouched || !data.isMoved || !swiper.swipeDirection || touches.diff === 0 || data.currentTranslate === data.startTranslate) {
        data.isTouched = false;
        data.isMoved = false;
        data.startMoving = false;
        return;
      }
      data.isTouched = false;
      data.isMoved = false;
      data.startMoving = false;

      let currentPos;
      if (params.followFinger) {
        currentPos = rtl ? swiper.translate : -swiper.translate;
      } else {
        currentPos = -data.currentTranslate;
      }

      if (params.cssMode) {
        return;
      }

      if (params.freeMode) {
        if (currentPos < -swiper.minTranslate()) {
          swiper.slideTo(swiper.activeIndex);
          return;
        }
        if (currentPos > -swiper.maxTranslate()) {
          if (swiper.slides.length < snapGrid.length) {
            swiper.slideTo(snapGrid.length - 1);
          } else {
            swiper.slideTo(swiper.slides.length - 1);
          }
          return;
        }

        if (params.freeModeMomentum) {
          if (data.velocities.length > 1) {
            const lastMoveEvent = data.velocities.pop();
            const velocityEvent = data.velocities.pop();

            const distance = lastMoveEvent.position - velocityEvent.position;
            const time = lastMoveEvent.time - velocityEvent.time;
            swiper.velocity = distance / time;
            swiper.velocity /= 2;
            if (Math.abs(swiper.velocity) < params.freeModeMinimumVelocity) {
              swiper.velocity = 0;
            }
            // this implies that the user stopped moving a finger then released.
            // There would be no events with distance zero, so the last event is stale.
            if (time > 150 || (Utils.now() - lastMoveEvent.time) > 300) {
              swiper.velocity = 0;
            }
          } else {
            swiper.velocity = 0;
          }
          swiper.velocity *= params.freeModeMomentumVelocityRatio;

          data.velocities.length = 0;
          let momentumDuration = 1000 * params.freeModeMomentumRatio;
          const momentumDistance = swiper.velocity * momentumDuration;

          let newPosition = swiper.translate + momentumDistance;
          if (rtl) newPosition = -newPosition;

          let doBounce = false;
          let afterBouncePosition;
          const bounceAmount = Math.abs(swiper.velocity) * 20 * params.freeModeMomentumBounceRatio;
          let needsLoopFix;
          if (newPosition < swiper.maxTranslate()) {
            if (params.freeModeMomentumBounce) {
              if (newPosition + swiper.maxTranslate() < -bounceAmount) {
                newPosition = swiper.maxTranslate() - bounceAmount;
              }
              afterBouncePosition = swiper.maxTranslate();
              doBounce = true;
              data.allowMomentumBounce = true;
            } else {
              newPosition = swiper.maxTranslate();
            }
            if (params.loop && params.centeredSlides) needsLoopFix = true;
          } else if (newPosition > swiper.minTranslate()) {
            if (params.freeModeMomentumBounce) {
              if (newPosition - swiper.minTranslate() > bounceAmount) {
                newPosition = swiper.minTranslate() + bounceAmount;
              }
              afterBouncePosition = swiper.minTranslate();
              doBounce = true;
              data.allowMomentumBounce = true;
            } else {
              newPosition = swiper.minTranslate();
            }
            if (params.loop && params.centeredSlides) needsLoopFix = true;
          } else if (params.freeModeSticky) {
            let nextSlide;
            for (let j = 0; j < snapGrid.length; j += 1) {
              if (snapGrid[j] > -newPosition) {
                nextSlide = j;
                break;
              }
            }

            if (Math.abs(snapGrid[nextSlide] - newPosition) < Math.abs(snapGrid[nextSlide - 1] - newPosition) || swiper.swipeDirection === 'next') {
              newPosition = snapGrid[nextSlide];
            } else {
              newPosition = snapGrid[nextSlide - 1];
            }
            newPosition = -newPosition;
          }
          if (needsLoopFix) {
            swiper.once('transitionEnd', () => {
              swiper.loopFix();
            });
          }
          // Fix duration
          if (swiper.velocity !== 0) {
            if (rtl) {
              momentumDuration = Math.abs((-newPosition - swiper.translate) / swiper.velocity);
            } else {
              momentumDuration = Math.abs((newPosition - swiper.translate) / swiper.velocity);
            }
            if (params.freeModeSticky) {
              // If freeModeSticky is active and the user ends a swipe with a slow-velocity
              // event, then durations can be 20+ seconds to slide one (or zero!) slides.
              // It's easy to see this when simulating touch with mouse events. To fix this,
              // limit single-slide swipes to the default slide duration. This also has the
              // nice side effect of matching slide speed if the user stopped moving before
              // lifting finger or mouse vs. moving slowly before lifting the finger/mouse.
              // For faster swipes, also apply limits (albeit higher ones).
              const moveDistance = Math.abs((rtl ? -newPosition : newPosition) - swiper.translate);
              const currentSlideSize = swiper.slidesSizesGrid[swiper.activeIndex];
              if (moveDistance < currentSlideSize) {
                momentumDuration = params.speed;
              } else if (moveDistance < 2 * currentSlideSize) {
                momentumDuration = params.speed * 1.5;
              } else {
                momentumDuration = params.speed * 2.5;
              }
            }
          } else if (params.freeModeSticky) {
            swiper.slideToClosest();
            return;
          }

          if (params.freeModeMomentumBounce && doBounce) {
            swiper.updateProgress(afterBouncePosition);
            swiper.setTransition(momentumDuration);
            swiper.setTranslate(newPosition);
            swiper.transitionStart(true, swiper.swipeDirection);
            swiper.animating = true;
            $wrapperEl.transitionEnd(() => {
              if (!swiper || swiper.destroyed || !data.allowMomentumBounce) return;
              swiper.emit('momentumBounce');

              swiper.setTransition(params.speed);
              swiper.setTranslate(afterBouncePosition);
              $wrapperEl.transitionEnd(() => {
                if (!swiper || swiper.destroyed) return;
                swiper.transitionEnd();
              });
            });
          } else if (swiper.velocity) {
            swiper.updateProgress(newPosition);
            swiper.setTransition(momentumDuration);
            swiper.setTranslate(newPosition);
            swiper.transitionStart(true, swiper.swipeDirection);
            if (!swiper.animating) {
              swiper.animating = true;
              $wrapperEl.transitionEnd(() => {
                if (!swiper || swiper.destroyed) return;
                swiper.transitionEnd();
              });
            }
          } else {
            swiper.updateProgress(newPosition);
          }

          swiper.updateActiveIndex();
          swiper.updateSlidesClasses();
        } else if (params.freeModeSticky) {
          swiper.slideToClosest();
          return;
        }

        if (!params.freeModeMomentum || timeDiff >= params.longSwipesMs) {
          swiper.updateProgress();
          swiper.updateActiveIndex();
          swiper.updateSlidesClasses();
        }
        return;
      }

      // Find current slide
      let stopIndex = 0;
      let groupSize = swiper.slidesSizesGrid[0];
      for (let i = 0; i < slidesGrid.length; i += params.slidesPerGroup) {
        if (typeof slidesGrid[i + params.slidesPerGroup] !== 'undefined') {
          if (currentPos >= slidesGrid[i] && currentPos < slidesGrid[i + params.slidesPerGroup]) {
            stopIndex = i;
            groupSize = slidesGrid[i + params.slidesPerGroup] - slidesGrid[i];
          }
        } else if (currentPos >= slidesGrid[i]) {
          stopIndex = i;
          groupSize = slidesGrid[slidesGrid.length - 1] - slidesGrid[slidesGrid.length - 2];
        }
      }

      // Find current slide size
      const ratio = (currentPos - slidesGrid[stopIndex]) / groupSize;

      if (timeDiff > params.longSwipesMs) {
        // Long touches
        if (!params.longSwipes) {
          swiper.slideTo(swiper.activeIndex);
          return;
        }
        if (swiper.swipeDirection === 'next') {
          if (ratio >= params.longSwipesRatio) swiper.slideTo(stopIndex + params.slidesPerGroup);
          else swiper.slideTo(stopIndex);
        }
        if (swiper.swipeDirection === 'prev') {
          if (ratio > (1 - params.longSwipesRatio)) swiper.slideTo(stopIndex + params.slidesPerGroup);
          else swiper.slideTo(stopIndex);
        }
      } else {
        // Short swipes
        if (!params.shortSwipes) {
          swiper.slideTo(swiper.activeIndex);
          return;
        }
        const isNavButtonTarget = swiper.navigation && (e.target === swiper.navigation.nextEl || e.target === swiper.navigation.prevEl);
        if (!isNavButtonTarget) {
          if (swiper.swipeDirection === 'next') {
            swiper.slideTo(stopIndex + params.slidesPerGroup);
          }
          if (swiper.swipeDirection === 'prev') {
            swiper.slideTo(stopIndex);
          }
        } else if (e.target === swiper.navigation.nextEl) {
          swiper.slideTo(stopIndex + params.slidesPerGroup);
        } else {
          swiper.slideTo(stopIndex);
        }
      }
    }

    function onResize () {
      const swiper = this;

      const { params, el } = swiper;

      if (el && el.offsetWidth === 0) return;

      // Breakpoints
      if (params.breakpoints) {
        swiper.setBreakpoint();
      }

      // Save locks
      const { allowSlideNext, allowSlidePrev, snapGrid } = swiper;

      // Disable locks on resize
      swiper.allowSlideNext = true;
      swiper.allowSlidePrev = true;

      swiper.updateSize();
      swiper.updateSlides();

      swiper.updateSlidesClasses();
      if ((params.slidesPerView === 'auto' || params.slidesPerView > 1) && swiper.isEnd && !swiper.params.centeredSlides) {
        swiper.slideTo(swiper.slides.length - 1, 0, false, true);
      } else {
        swiper.slideTo(swiper.activeIndex, 0, false, true);
      }

      if (swiper.autoplay && swiper.autoplay.running && swiper.autoplay.paused) {
        swiper.autoplay.run();
      }
      // Return locks after resize
      swiper.allowSlidePrev = allowSlidePrev;
      swiper.allowSlideNext = allowSlideNext;

      if (swiper.params.watchOverflow && snapGrid !== swiper.snapGrid) {
        swiper.checkOverflow();
      }
    }

    function onClick (e) {
      const swiper = this;
      if (!swiper.allowClick) {
        if (swiper.params.preventClicks) e.preventDefault();
        if (swiper.params.preventClicksPropagation && swiper.animating) {
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      }
    }

    function onScroll () {
      const swiper = this;
      const { wrapperEl } = swiper;
      swiper.previousTranslate = swiper.translate;
      swiper.translate = swiper.isHorizontal() ? -wrapperEl.scrollLeft : -wrapperEl.scrollTop;
      // eslint-disable-next-line
      if (swiper.translate === -0) swiper.translate = 0;

      swiper.updateActiveIndex();
      swiper.updateSlidesClasses();

      let newProgress;
      const translatesDiff = swiper.maxTranslate() - swiper.minTranslate();
      if (translatesDiff === 0) {
        newProgress = 0;
      } else {
        newProgress = (swiper.translate - swiper.minTranslate()) / (translatesDiff);
      }
      if (newProgress !== swiper.progress) {
        swiper.updateProgress(swiper.translate);
      }

      swiper.emit('setTranslate', swiper.translate, false);
    }

    let dummyEventAttached = false;
    function dummyEventListener() {}

    function attachEvents() {
      const swiper = this;
      const {
        params, touchEvents, el, wrapperEl,
      } = swiper;

      swiper.onTouchStart = onTouchStart.bind(swiper);
      swiper.onTouchMove = onTouchMove.bind(swiper);
      swiper.onTouchEnd = onTouchEnd.bind(swiper);
      if (params.cssMode) {
        swiper.onScroll = onScroll.bind(swiper);
      }

      swiper.onClick = onClick.bind(swiper);

      const capture = !!params.nested;

      // Touch Events
      if (!Support.touch && Support.pointerEvents) {
        el.addEventListener(touchEvents.start, swiper.onTouchStart, false);
        doc.addEventListener(touchEvents.move, swiper.onTouchMove, capture);
        doc.addEventListener(touchEvents.end, swiper.onTouchEnd, false);
      } else {
        if (Support.touch) {
          const passiveListener = touchEvents.start === 'touchstart' && Support.passiveListener && params.passiveListeners ? { passive: true, capture: false } : false;
          el.addEventListener(touchEvents.start, swiper.onTouchStart, passiveListener);
          el.addEventListener(touchEvents.move, swiper.onTouchMove, Support.passiveListener ? { passive: false, capture } : capture);
          el.addEventListener(touchEvents.end, swiper.onTouchEnd, passiveListener);
          if (touchEvents.cancel) {
            el.addEventListener(touchEvents.cancel, swiper.onTouchEnd, passiveListener);
          }
          if (!dummyEventAttached) {
            doc.addEventListener('touchstart', dummyEventListener);
            dummyEventAttached = true;
          }
        }
        if ((params.simulateTouch && !Device.ios && !Device.android) || (params.simulateTouch && !Support.touch && Device.ios)) {
          el.addEventListener('mousedown', swiper.onTouchStart, false);
          doc.addEventListener('mousemove', swiper.onTouchMove, capture);
          doc.addEventListener('mouseup', swiper.onTouchEnd, false);
        }
      }
      // Prevent Links Clicks
      if (params.preventClicks || params.preventClicksPropagation) {
        el.addEventListener('click', swiper.onClick, true);
      }
      if (params.cssMode) {
        wrapperEl.addEventListener('scroll', swiper.onScroll);
      }

      // Resize handler
      if (params.updateOnWindowResize) {
        swiper.on((Device.ios || Device.android ? 'resize orientationchange observerUpdate' : 'resize observerUpdate'), onResize, true);
      } else {
        swiper.on('observerUpdate', onResize, true);
      }
    }

    function detachEvents() {
      const swiper = this;

      const {
        params, touchEvents, el, wrapperEl,
      } = swiper;

      const capture = !!params.nested;

      // Touch Events
      if (!Support.touch && Support.pointerEvents) {
        el.removeEventListener(touchEvents.start, swiper.onTouchStart, false);
        doc.removeEventListener(touchEvents.move, swiper.onTouchMove, capture);
        doc.removeEventListener(touchEvents.end, swiper.onTouchEnd, false);
      } else {
        if (Support.touch) {
          const passiveListener = touchEvents.start === 'onTouchStart' && Support.passiveListener && params.passiveListeners ? { passive: true, capture: false } : false;
          el.removeEventListener(touchEvents.start, swiper.onTouchStart, passiveListener);
          el.removeEventListener(touchEvents.move, swiper.onTouchMove, capture);
          el.removeEventListener(touchEvents.end, swiper.onTouchEnd, passiveListener);
          if (touchEvents.cancel) {
            el.removeEventListener(touchEvents.cancel, swiper.onTouchEnd, passiveListener);
          }
        }
        if ((params.simulateTouch && !Device.ios && !Device.android) || (params.simulateTouch && !Support.touch && Device.ios)) {
          el.removeEventListener('mousedown', swiper.onTouchStart, false);
          doc.removeEventListener('mousemove', swiper.onTouchMove, capture);
          doc.removeEventListener('mouseup', swiper.onTouchEnd, false);
        }
      }
      // Prevent Links Clicks
      if (params.preventClicks || params.preventClicksPropagation) {
        el.removeEventListener('click', swiper.onClick, true);
      }

      if (params.cssMode) {
        wrapperEl.removeEventListener('scroll', swiper.onScroll);
      }

      // Resize handler
      swiper.off((Device.ios || Device.android ? 'resize orientationchange observerUpdate' : 'resize observerUpdate'), onResize);
    }

    var events = {
      attachEvents,
      detachEvents,
    };

    function setBreakpoint () {
      const swiper = this;
      const {
        activeIndex, initialized, loopedSlides = 0, params, $el,
      } = swiper;
      const breakpoints = params.breakpoints;
      if (!breakpoints || (breakpoints && Object.keys(breakpoints).length === 0)) return;

      // Get breakpoint for window width and update parameters
      const breakpoint = swiper.getBreakpoint(breakpoints);

      if (breakpoint && swiper.currentBreakpoint !== breakpoint) {
        const breakpointOnlyParams = breakpoint in breakpoints ? breakpoints[breakpoint] : undefined;
        if (breakpointOnlyParams) {
          ['slidesPerView', 'spaceBetween', 'slidesPerGroup', 'slidesPerColumn'].forEach((param) => {
            const paramValue = breakpointOnlyParams[param];
            if (typeof paramValue === 'undefined') return;
            if (param === 'slidesPerView' && (paramValue === 'AUTO' || paramValue === 'auto')) {
              breakpointOnlyParams[param] = 'auto';
            } else if (param === 'slidesPerView') {
              breakpointOnlyParams[param] = parseFloat(paramValue);
            } else {
              breakpointOnlyParams[param] = parseInt(paramValue, 10);
            }
          });
        }

        const breakpointParams = breakpointOnlyParams || swiper.originalParams;
        const wasMultiRow = params.slidesPerColumn > 1;
        const isMultiRow = breakpointParams.slidesPerColumn > 1;
        if (wasMultiRow && !isMultiRow) {
          $el.removeClass(`${params.containerModifierClass}multirow ${params.containerModifierClass}multirow-column`);
        } else if (!wasMultiRow && isMultiRow) {
          $el.addClass(`${params.containerModifierClass}multirow`);
          if (breakpointParams.slidesPerColumnFill === 'column') {
            $el.addClass(`${params.containerModifierClass}multirow-column`);
          }
        }

        const directionChanged = breakpointParams.direction && breakpointParams.direction !== params.direction;
        const needsReLoop = params.loop && (breakpointParams.slidesPerView !== params.slidesPerView || directionChanged);

        if (directionChanged && initialized) {
          swiper.changeDirection();
        }

        Utils.extend(swiper.params, breakpointParams);

        Utils.extend(swiper, {
          allowTouchMove: swiper.params.allowTouchMove,
          allowSlideNext: swiper.params.allowSlideNext,
          allowSlidePrev: swiper.params.allowSlidePrev,
        });

        swiper.currentBreakpoint = breakpoint;

        if (needsReLoop && initialized) {
          swiper.loopDestroy();
          swiper.loopCreate();
          swiper.updateSlides();
          swiper.slideTo((activeIndex - loopedSlides) + swiper.loopedSlides, 0, false);
        }

        swiper.emit('breakpoint', breakpointParams);
      }
    }

    function getBreakpoint (breakpoints) {
      // Get breakpoint for window width
      if (!breakpoints) return undefined;
      let breakpoint = false;
      const points = [];
      Object.keys(breakpoints).forEach((point) => {
        points.push(point);
      });
      points.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        if (point <= win.innerWidth) {
          breakpoint = point;
        }
      }
      return breakpoint || 'max';
    }

    var breakpoints = { setBreakpoint, getBreakpoint };

    function addClasses () {
      const swiper = this;
      const {
        classNames, params, rtl, $el,
      } = swiper;
      const suffixes = [];

      suffixes.push('initialized');
      suffixes.push(params.direction);

      if (params.freeMode) {
        suffixes.push('free-mode');
      }
      if (params.autoHeight) {
        suffixes.push('autoheight');
      }
      if (rtl) {
        suffixes.push('rtl');
      }
      if (params.slidesPerColumn > 1) {
        suffixes.push('multirow');
        if (params.slidesPerColumnFill === 'column') {
          suffixes.push('multirow-column');
        }
      }
      if (Device.android) {
        suffixes.push('android');
      }
      if (Device.ios) {
        suffixes.push('ios');
      }

      if (params.cssMode) {
        suffixes.push('css-mode');
      }

      suffixes.forEach((suffix) => {
        classNames.push(params.containerModifierClass + suffix);
      });

      $el.addClass(classNames.join(' '));
    }

    function removeClasses () {
      const swiper = this;
      const { $el, classNames } = swiper;

      $el.removeClass(classNames.join(' '));
    }

    var classes = { addClasses, removeClasses };

    function loadImage (imageEl, src, srcset, sizes, checkForComplete, callback) {
      let image;
      function onReady() {
        if (callback) callback();
      }
      if (!imageEl.complete || !checkForComplete) {
        if (src) {
          image = new win.Image();
          image.onload = onReady;
          image.onerror = onReady;
          if (sizes) {
            image.sizes = sizes;
          }
          if (srcset) {
            image.srcset = srcset;
          }
          if (src) {
            image.src = src;
          }
        } else {
          onReady();
        }
      } else {
        // image already loaded...
        onReady();
      }
    }

    function preloadImages () {
      const swiper = this;
      swiper.imagesToLoad = swiper.$el.find('img');
      function onReady() {
        if (typeof swiper === 'undefined' || swiper === null || !swiper || swiper.destroyed) return;
        if (swiper.imagesLoaded !== undefined) swiper.imagesLoaded += 1;
        if (swiper.imagesLoaded === swiper.imagesToLoad.length) {
          if (swiper.params.updateOnImagesReady) swiper.update();
          swiper.emit('imagesReady');
        }
      }
      for (let i = 0; i < swiper.imagesToLoad.length; i += 1) {
        const imageEl = swiper.imagesToLoad[i];
        swiper.loadImage(
          imageEl,
          imageEl.currentSrc || imageEl.getAttribute('src'),
          imageEl.srcset || imageEl.getAttribute('srcset'),
          imageEl.sizes || imageEl.getAttribute('sizes'),
          true,
          onReady
        );
      }
    }

    var images = {
      loadImage,
      preloadImages,
    };

    function checkOverflow() {
      const swiper = this;
      const params = swiper.params;
      const wasLocked = swiper.isLocked;
      const lastSlidePosition = swiper.slides.length > 0 && (params.slidesOffsetBefore + (params.spaceBetween * (swiper.slides.length - 1)) + ((swiper.slides[0]).offsetWidth) * swiper.slides.length);

      if (params.slidesOffsetBefore && params.slidesOffsetAfter && lastSlidePosition) {
        swiper.isLocked = lastSlidePosition <= swiper.size;
      } else {
        swiper.isLocked = swiper.snapGrid.length === 1;
      }

      swiper.allowSlideNext = !swiper.isLocked;
      swiper.allowSlidePrev = !swiper.isLocked;

      // events
      if (wasLocked !== swiper.isLocked) swiper.emit(swiper.isLocked ? 'lock' : 'unlock');

      if (wasLocked && wasLocked !== swiper.isLocked) {
        swiper.isEnd = false;
        swiper.navigation.update();
      }
    }

    var checkOverflow$1 = { checkOverflow };

    var defaults = {
      init: true,
      direction: 'horizontal',
      touchEventsTarget: 'container',
      initialSlide: 0,
      speed: 300,
      cssMode: false,
      updateOnWindowResize: true,
      //
      preventInteractionOnTransition: false,

      // To support iOS's swipe-to-go-back gesture (when being used in-app, with UIWebView).
      edgeSwipeDetection: false,
      edgeSwipeThreshold: 20,

      // Free mode
      freeMode: false,
      freeModeMomentum: true,
      freeModeMomentumRatio: 1,
      freeModeMomentumBounce: true,
      freeModeMomentumBounceRatio: 1,
      freeModeMomentumVelocityRatio: 1,
      freeModeSticky: false,
      freeModeMinimumVelocity: 0.02,

      // Autoheight
      autoHeight: false,

      // Set wrapper width
      setWrapperSize: false,

      // Virtual Translate
      virtualTranslate: false,

      // Effects
      effect: 'slide', // 'slide' or 'fade' or 'cube' or 'coverflow' or 'flip'

      // Breakpoints
      breakpoints: undefined,

      // Slides grid
      spaceBetween: 0,
      slidesPerView: 1,
      slidesPerColumn: 1,
      slidesPerColumnFill: 'column',
      slidesPerGroup: 1,
      centeredSlides: false,
      centeredSlidesBounds: false,
      slidesOffsetBefore: 0, // in px
      slidesOffsetAfter: 0, // in px
      normalizeSlideIndex: true,
      centerInsufficientSlides: false,

      // Disable swiper and hide navigation when container not overflow
      watchOverflow: false,

      // Round length
      roundLengths: false,

      // Touches
      touchRatio: 1,
      touchAngle: 45,
      simulateTouch: true,
      shortSwipes: true,
      longSwipes: true,
      longSwipesRatio: 0.5,
      longSwipesMs: 300,
      followFinger: true,
      allowTouchMove: true,
      threshold: 0,
      touchMoveStopPropagation: false,
      touchStartPreventDefault: true,
      touchStartForcePreventDefault: false,
      touchReleaseOnEdges: false,

      // Unique Navigation Elements
      uniqueNavElements: true,

      // Resistance
      resistance: true,
      resistanceRatio: 0.85,

      // Progress
      watchSlidesProgress: false,
      watchSlidesVisibility: false,

      // Cursor
      grabCursor: false,

      // Clicks
      preventClicks: true,
      preventClicksPropagation: true,
      slideToClickedSlide: false,

      // Images
      preloadImages: true,
      updateOnImagesReady: true,

      // loop
      loop: false,
      loopAdditionalSlides: 0,
      loopedSlides: null,
      loopFillGroupWithBlank: false,

      // Swiping/no swiping
      allowSlidePrev: true,
      allowSlideNext: true,
      swipeHandler: null, // '.swipe-handler',
      noSwiping: true,
      noSwipingClass: 'swiper-no-swiping',
      noSwipingSelector: null,

      // Passive Listeners
      passiveListeners: true,

      // NS
      containerModifierClass: 'swiper-container-', // NEW
      slideClass: 'swiper-slide',
      slideBlankClass: 'swiper-slide-invisible-blank',
      slideActiveClass: 'swiper-slide-active',
      slideDuplicateActiveClass: 'swiper-slide-duplicate-active',
      slideVisibleClass: 'swiper-slide-visible',
      slideDuplicateClass: 'swiper-slide-duplicate',
      slideNextClass: 'swiper-slide-next',
      slideDuplicateNextClass: 'swiper-slide-duplicate-next',
      slidePrevClass: 'swiper-slide-prev',
      slideDuplicatePrevClass: 'swiper-slide-duplicate-prev',
      wrapperClass: 'swiper-wrapper',

      // Callbacks
      runCallbacksOnInit: true,
    };

    /* eslint no-param-reassign: "off" */

    const prototypes = {
      update,
      translate,
      transition: transition$1,
      slide,
      loop,
      grabCursor,
      manipulation,
      events,
      breakpoints,
      checkOverflow: checkOverflow$1,
      classes,
      images,
    };

    const extendedDefaults = {};

    class Swiper extends SwiperClass {
      constructor(...args) {
        let el;
        let params;
        if (args.length === 1 && args[0].constructor && args[0].constructor === Object) {
          params = args[0];
        } else {
          [el, params] = args;
        }
        if (!params) params = {};

        params = Utils.extend({}, params);
        if (el && !params.el) params.el = el;

        super(params);

        Object.keys(prototypes).forEach((prototypeGroup) => {
          Object.keys(prototypes[prototypeGroup]).forEach((protoMethod) => {
            if (!Swiper.prototype[protoMethod]) {
              Swiper.prototype[protoMethod] = prototypes[prototypeGroup][protoMethod];
            }
          });
        });

        // Swiper Instance
        const swiper = this;
        if (typeof swiper.modules === 'undefined') {
          swiper.modules = {};
        }
        Object.keys(swiper.modules).forEach((moduleName) => {
          const module = swiper.modules[moduleName];
          if (module.params) {
            const moduleParamName = Object.keys(module.params)[0];
            const moduleParams = module.params[moduleParamName];
            if (typeof moduleParams !== 'object' || moduleParams === null) return;
            if (!(moduleParamName in params && 'enabled' in moduleParams)) return;
            if (params[moduleParamName] === true) {
              params[moduleParamName] = { enabled: true };
            }
            if (
              typeof params[moduleParamName] === 'object'
              && !('enabled' in params[moduleParamName])
            ) {
              params[moduleParamName].enabled = true;
            }
            if (!params[moduleParamName]) params[moduleParamName] = { enabled: false };
          }
        });

        // Extend defaults with modules params
        const swiperParams = Utils.extend({}, defaults);
        swiper.useModulesParams(swiperParams);

        // Extend defaults with passed params
        swiper.params = Utils.extend({}, swiperParams, extendedDefaults, params);
        swiper.originalParams = Utils.extend({}, swiper.params);
        swiper.passedParams = Utils.extend({}, params);

        // Save Dom lib
        swiper.$ = $$1;

        // Find el
        const $el = $$1(swiper.params.el);
        el = $el[0];

        if (!el) {
          return undefined;
        }

        if ($el.length > 1) {
          const swipers = [];
          $el.each((index, containerEl) => {
            const newParams = Utils.extend({}, params, { el: containerEl });
            swipers.push(new Swiper(newParams));
          });
          return swipers;
        }

        el.swiper = swiper;
        $el.data('swiper', swiper);

        // Find Wrapper
        let $wrapperEl;
        if (el && el.shadowRoot && el.shadowRoot.querySelector) {
          $wrapperEl = $$1(el.shadowRoot.querySelector(`.${swiper.params.wrapperClass}`));
          // Children needs to return slot items
          $wrapperEl.children = (options) => $el.children(options);
        } else {
          $wrapperEl = $el.children(`.${swiper.params.wrapperClass}`);
        }
        // Extend Swiper
        Utils.extend(swiper, {
          $el,
          el,
          $wrapperEl,
          wrapperEl: $wrapperEl[0],

          // Classes
          classNames: [],

          // Slides
          slides: $$1(),
          slidesGrid: [],
          snapGrid: [],
          slidesSizesGrid: [],

          // isDirection
          isHorizontal() {
            return swiper.params.direction === 'horizontal';
          },
          isVertical() {
            return swiper.params.direction === 'vertical';
          },
          // RTL
          rtl: (el.dir.toLowerCase() === 'rtl' || $el.css('direction') === 'rtl'),
          rtlTranslate: swiper.params.direction === 'horizontal' && (el.dir.toLowerCase() === 'rtl' || $el.css('direction') === 'rtl'),
          wrongRTL: $wrapperEl.css('display') === '-webkit-box',

          // Indexes
          activeIndex: 0,
          realIndex: 0,

          //
          isBeginning: true,
          isEnd: false,

          // Props
          translate: 0,
          previousTranslate: 0,
          progress: 0,
          velocity: 0,
          animating: false,

          // Locks
          allowSlideNext: swiper.params.allowSlideNext,
          allowSlidePrev: swiper.params.allowSlidePrev,

          // Touch Events
          touchEvents: (function touchEvents() {
            const touch = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
            let desktop = ['mousedown', 'mousemove', 'mouseup'];
            if (Support.pointerEvents) {
              desktop = ['pointerdown', 'pointermove', 'pointerup'];
            }
            swiper.touchEventsTouch = {
              start: touch[0],
              move: touch[1],
              end: touch[2],
              cancel: touch[3],
            };
            swiper.touchEventsDesktop = {
              start: desktop[0],
              move: desktop[1],
              end: desktop[2],
            };
            return Support.touch || !swiper.params.simulateTouch ? swiper.touchEventsTouch : swiper.touchEventsDesktop;
          }()),
          touchEventsData: {
            isTouched: undefined,
            isMoved: undefined,
            allowTouchCallbacks: undefined,
            touchStartTime: undefined,
            isScrolling: undefined,
            currentTranslate: undefined,
            startTranslate: undefined,
            allowThresholdMove: undefined,
            // Form elements to match
            formElements: 'input, select, option, textarea, button, video',
            // Last click time
            lastClickTime: Utils.now(),
            clickTimeout: undefined,
            // Velocities
            velocities: [],
            allowMomentumBounce: undefined,
            isTouchEvent: undefined,
            startMoving: undefined,
          },

          // Clicks
          allowClick: true,

          // Touches
          allowTouchMove: swiper.params.allowTouchMove,

          touches: {
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            diff: 0,
          },

          // Images
          imagesToLoad: [],
          imagesLoaded: 0,

        });

        // Install Modules
        swiper.useModules();

        // Init
        if (swiper.params.init) {
          swiper.init();
        }

        // Return app instance
        return swiper;
      }

      slidesPerViewDynamic() {
        const swiper = this;
        const {
          params, slides, slidesGrid, size: swiperSize, activeIndex,
        } = swiper;
        let spv = 1;
        if (params.centeredSlides) {
          let slideSize = slides[activeIndex].swiperSlideSize;
          let breakLoop;
          for (let i = activeIndex + 1; i < slides.length; i += 1) {
            if (slides[i] && !breakLoop) {
              slideSize += slides[i].swiperSlideSize;
              spv += 1;
              if (slideSize > swiperSize) breakLoop = true;
            }
          }
          for (let i = activeIndex - 1; i >= 0; i -= 1) {
            if (slides[i] && !breakLoop) {
              slideSize += slides[i].swiperSlideSize;
              spv += 1;
              if (slideSize > swiperSize) breakLoop = true;
            }
          }
        } else {
          for (let i = activeIndex + 1; i < slides.length; i += 1) {
            if (slidesGrid[i] - slidesGrid[activeIndex] < swiperSize) {
              spv += 1;
            }
          }
        }
        return spv;
      }

      update() {
        const swiper = this;
        if (!swiper || swiper.destroyed) return;
        const { snapGrid, params } = swiper;
        // Breakpoints
        if (params.breakpoints) {
          swiper.setBreakpoint();
        }
        swiper.updateSize();
        swiper.updateSlides();
        swiper.updateProgress();
        swiper.updateSlidesClasses();

        function setTranslate() {
          const translateValue = swiper.rtlTranslate ? swiper.translate * -1 : swiper.translate;
          const newTranslate = Math.min(Math.max(translateValue, swiper.maxTranslate()), swiper.minTranslate());
          swiper.setTranslate(newTranslate);
          swiper.updateActiveIndex();
          swiper.updateSlidesClasses();
        }
        let translated;
        if (swiper.params.freeMode) {
          setTranslate();
          if (swiper.params.autoHeight) {
            swiper.updateAutoHeight();
          }
        } else {
          if ((swiper.params.slidesPerView === 'auto' || swiper.params.slidesPerView > 1) && swiper.isEnd && !swiper.params.centeredSlides) {
            translated = swiper.slideTo(swiper.slides.length - 1, 0, false, true);
          } else {
            translated = swiper.slideTo(swiper.activeIndex, 0, false, true);
          }
          if (!translated) {
            setTranslate();
          }
        }
        if (params.watchOverflow && snapGrid !== swiper.snapGrid) {
          swiper.checkOverflow();
        }
        swiper.emit('update');
      }

      changeDirection(newDirection, needUpdate = true) {
        const swiper = this;
        const currentDirection = swiper.params.direction;
        if (!newDirection) {
          // eslint-disable-next-line
          newDirection = currentDirection === 'horizontal' ? 'vertical' : 'horizontal';
        }
        if ((newDirection === currentDirection) || (newDirection !== 'horizontal' && newDirection !== 'vertical')) {
          return swiper;
        }

        swiper.$el
          .removeClass(`${swiper.params.containerModifierClass}${currentDirection}`)
          .addClass(`${swiper.params.containerModifierClass}${newDirection}`);

        swiper.params.direction = newDirection;

        swiper.slides.each((slideIndex, slideEl) => {
          if (newDirection === 'vertical') {
            slideEl.style.width = '';
          } else {
            slideEl.style.height = '';
          }
        });

        swiper.emit('changeDirection');
        if (needUpdate) swiper.update();

        return swiper;
      }

      init() {
        const swiper = this;
        if (swiper.initialized) return;

        swiper.emit('beforeInit');

        // Set breakpoint
        if (swiper.params.breakpoints) {
          swiper.setBreakpoint();
        }

        // Add Classes
        swiper.addClasses();

        // Create loop
        if (swiper.params.loop) {
          swiper.loopCreate();
        }

        // Update size
        swiper.updateSize();

        // Update slides
        swiper.updateSlides();

        if (swiper.params.watchOverflow) {
          swiper.checkOverflow();
        }

        // Set Grab Cursor
        if (swiper.params.grabCursor) {
          swiper.setGrabCursor();
        }

        if (swiper.params.preloadImages) {
          swiper.preloadImages();
        }

        // Slide To Initial Slide
        if (swiper.params.loop) {
          swiper.slideTo(swiper.params.initialSlide + swiper.loopedSlides, 0, swiper.params.runCallbacksOnInit);
        } else {
          swiper.slideTo(swiper.params.initialSlide, 0, swiper.params.runCallbacksOnInit);
        }

        // Attach events
        swiper.attachEvents();

        // Init Flag
        swiper.initialized = true;

        // Emit
        swiper.emit('init');
      }

      destroy(deleteInstance = true, cleanStyles = true) {
        const swiper = this;
        const {
          params, $el, $wrapperEl, slides,
        } = swiper;

        if (typeof swiper.params === 'undefined' || swiper.destroyed) {
          return null;
        }

        swiper.emit('beforeDestroy');

        // Init Flag
        swiper.initialized = false;

        // Detach events
        swiper.detachEvents();

        // Destroy loop
        if (params.loop) {
          swiper.loopDestroy();
        }

        // Cleanup styles
        if (cleanStyles) {
          swiper.removeClasses();
          $el.removeAttr('style');
          $wrapperEl.removeAttr('style');
          if (slides && slides.length) {
            slides
              .removeClass([
                params.slideVisibleClass,
                params.slideActiveClass,
                params.slideNextClass,
                params.slidePrevClass,
              ].join(' '))
              .removeAttr('style')
              .removeAttr('data-swiper-slide-index');
          }
        }

        swiper.emit('destroy');

        // Detach emitter events
        Object.keys(swiper.eventsListeners).forEach((eventName) => {
          swiper.off(eventName);
        });

        if (deleteInstance !== false) {
          swiper.$el[0].swiper = null;
          swiper.$el.data('swiper', null);
          Utils.deleteProps(swiper);
        }
        swiper.destroyed = true;

        return null;
      }

      static extendDefaults(newDefaults) {
        Utils.extend(extendedDefaults, newDefaults);
      }

      static get extendedDefaults() {
        return extendedDefaults;
      }

      static get defaults() {
        return defaults;
      }

      static get Class() {
        return SwiperClass;
      }

      static get $() {
        return $$1;
      }
    }

    var Device$1 = {
      name: 'device',
      proto: {
        device: Device,
      },
      static: {
        device: Device,
      },
    };

    var Support$1 = {
      name: 'support',
      proto: {
        support: Support,
      },
      static: {
        support: Support,
      },
    };

    const Browser = (function Browser() {
      function isSafari() {
        const ua = win.navigator.userAgent.toLowerCase();
        return (ua.indexOf('safari') >= 0 && ua.indexOf('chrome') < 0 && ua.indexOf('android') < 0);
      }
      return {
        isEdge: !!win.navigator.userAgent.match(/Edge/g),
        isSafari: isSafari(),
        isUiWebView: /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(win.navigator.userAgent),
      };
    }());

    var Browser$1 = {
      name: 'browser',
      proto: {
        browser: Browser,
      },
      static: {
        browser: Browser,
      },
    };

    var Resize = {
      name: 'resize',
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          resize: {
            resizeHandler() {
              if (!swiper || swiper.destroyed || !swiper.initialized) return;
              swiper.emit('beforeResize');
              swiper.emit('resize');
            },
            orientationChangeHandler() {
              if (!swiper || swiper.destroyed || !swiper.initialized) return;
              swiper.emit('orientationchange');
            },
          },
        });
      },
      on: {
        init() {
          const swiper = this;
          // Emit resize
          win.addEventListener('resize', swiper.resize.resizeHandler);

          // Emit orientationchange
          win.addEventListener('orientationchange', swiper.resize.orientationChangeHandler);
        },
        destroy() {
          const swiper = this;
          win.removeEventListener('resize', swiper.resize.resizeHandler);
          win.removeEventListener('orientationchange', swiper.resize.orientationChangeHandler);
        },
      },
    };

    const Observer = {
      func: win.MutationObserver || win.WebkitMutationObserver,
      attach(target, options = {}) {
        const swiper = this;

        const ObserverFunc = Observer.func;
        const observer = new ObserverFunc((mutations) => {
          // The observerUpdate event should only be triggered
          // once despite the number of mutations.  Additional
          // triggers are redundant and are very costly
          if (mutations.length === 1) {
            swiper.emit('observerUpdate', mutations[0]);
            return;
          }
          const observerUpdate = function observerUpdate() {
            swiper.emit('observerUpdate', mutations[0]);
          };

          if (win.requestAnimationFrame) {
            win.requestAnimationFrame(observerUpdate);
          } else {
            win.setTimeout(observerUpdate, 0);
          }
        });

        observer.observe(target, {
          attributes: typeof options.attributes === 'undefined' ? true : options.attributes,
          childList: typeof options.childList === 'undefined' ? true : options.childList,
          characterData: typeof options.characterData === 'undefined' ? true : options.characterData,
        });

        swiper.observer.observers.push(observer);
      },
      init() {
        const swiper = this;
        if (!Support.observer || !swiper.params.observer) return;
        if (swiper.params.observeParents) {
          const containerParents = swiper.$el.parents();
          for (let i = 0; i < containerParents.length; i += 1) {
            swiper.observer.attach(containerParents[i]);
          }
        }
        // Observe container
        swiper.observer.attach(swiper.$el[0], { childList: swiper.params.observeSlideChildren });

        // Observe wrapper
        swiper.observer.attach(swiper.$wrapperEl[0], { attributes: false });
      },
      destroy() {
        const swiper = this;
        swiper.observer.observers.forEach((observer) => {
          observer.disconnect();
        });
        swiper.observer.observers = [];
      },
    };

    var Observer$1 = {
      name: 'observer',
      params: {
        observer: false,
        observeParents: false,
        observeSlideChildren: false,
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          observer: {
            init: Observer.init.bind(swiper),
            attach: Observer.attach.bind(swiper),
            destroy: Observer.destroy.bind(swiper),
            observers: [],
          },
        });
      },
      on: {
        init() {
          const swiper = this;
          swiper.observer.init();
        },
        destroy() {
          const swiper = this;
          swiper.observer.destroy();
        },
      },
    };

    const Virtual = {
      update(force) {
        const swiper = this;
        const { slidesPerView, slidesPerGroup, centeredSlides } = swiper.params;
        const { addSlidesBefore, addSlidesAfter } = swiper.params.virtual;
        const {
          from: previousFrom,
          to: previousTo,
          slides,
          slidesGrid: previousSlidesGrid,
          renderSlide,
          offset: previousOffset,
        } = swiper.virtual;
        swiper.updateActiveIndex();
        const activeIndex = swiper.activeIndex || 0;

        let offsetProp;
        if (swiper.rtlTranslate) offsetProp = 'right';
        else offsetProp = swiper.isHorizontal() ? 'left' : 'top';

        let slidesAfter;
        let slidesBefore;
        if (centeredSlides) {
          slidesAfter = Math.floor(slidesPerView / 2) + slidesPerGroup + addSlidesBefore;
          slidesBefore = Math.floor(slidesPerView / 2) + slidesPerGroup + addSlidesAfter;
        } else {
          slidesAfter = slidesPerView + (slidesPerGroup - 1) + addSlidesBefore;
          slidesBefore = slidesPerGroup + addSlidesAfter;
        }
        const from = Math.max((activeIndex || 0) - slidesBefore, 0);
        const to = Math.min((activeIndex || 0) + slidesAfter, slides.length - 1);
        const offset = (swiper.slidesGrid[from] || 0) - (swiper.slidesGrid[0] || 0);

        Utils.extend(swiper.virtual, {
          from,
          to,
          offset,
          slidesGrid: swiper.slidesGrid,
        });

        function onRendered() {
          swiper.updateSlides();
          swiper.updateProgress();
          swiper.updateSlidesClasses();
          if (swiper.lazy && swiper.params.lazy.enabled) {
            swiper.lazy.load();
          }
        }

        if (previousFrom === from && previousTo === to && !force) {
          if (swiper.slidesGrid !== previousSlidesGrid && offset !== previousOffset) {
            swiper.slides.css(offsetProp, `${offset}px`);
          }
          swiper.updateProgress();
          return;
        }
        if (swiper.params.virtual.renderExternal) {
          swiper.params.virtual.renderExternal.call(swiper, {
            offset,
            from,
            to,
            slides: (function getSlides() {
              const slidesToRender = [];
              for (let i = from; i <= to; i += 1) {
                slidesToRender.push(slides[i]);
              }
              return slidesToRender;
            }()),
          });
          onRendered();
          return;
        }
        const prependIndexes = [];
        const appendIndexes = [];
        if (force) {
          swiper.$wrapperEl.find(`.${swiper.params.slideClass}`).remove();
        } else {
          for (let i = previousFrom; i <= previousTo; i += 1) {
            if (i < from || i > to) {
              swiper.$wrapperEl.find(`.${swiper.params.slideClass}[data-swiper-slide-index="${i}"]`).remove();
            }
          }
        }
        for (let i = 0; i < slides.length; i += 1) {
          if (i >= from && i <= to) {
            if (typeof previousTo === 'undefined' || force) {
              appendIndexes.push(i);
            } else {
              if (i > previousTo) appendIndexes.push(i);
              if (i < previousFrom) prependIndexes.push(i);
            }
          }
        }
        appendIndexes.forEach((index) => {
          swiper.$wrapperEl.append(renderSlide(slides[index], index));
        });
        prependIndexes.sort((a, b) => b - a).forEach((index) => {
          swiper.$wrapperEl.prepend(renderSlide(slides[index], index));
        });
        swiper.$wrapperEl.children('.swiper-slide').css(offsetProp, `${offset}px`);
        onRendered();
      },
      renderSlide(slide, index) {
        const swiper = this;
        const params = swiper.params.virtual;
        if (params.cache && swiper.virtual.cache[index]) {
          return swiper.virtual.cache[index];
        }
        const $slideEl = params.renderSlide
          ? $$1(params.renderSlide.call(swiper, slide, index))
          : $$1(`<div class="${swiper.params.slideClass}" data-swiper-slide-index="${index}">${slide}</div>`);
        if (!$slideEl.attr('data-swiper-slide-index')) $slideEl.attr('data-swiper-slide-index', index);
        if (params.cache) swiper.virtual.cache[index] = $slideEl;
        return $slideEl;
      },
      appendSlide(slides) {
        const swiper = this;
        if (typeof slides === 'object' && 'length' in slides) {
          for (let i = 0; i < slides.length; i += 1) {
            if (slides[i]) swiper.virtual.slides.push(slides[i]);
          }
        } else {
          swiper.virtual.slides.push(slides);
        }
        swiper.virtual.update(true);
      },
      prependSlide(slides) {
        const swiper = this;
        const activeIndex = swiper.activeIndex;
        let newActiveIndex = activeIndex + 1;
        let numberOfNewSlides = 1;

        if (Array.isArray(slides)) {
          for (let i = 0; i < slides.length; i += 1) {
            if (slides[i]) swiper.virtual.slides.unshift(slides[i]);
          }
          newActiveIndex = activeIndex + slides.length;
          numberOfNewSlides = slides.length;
        } else {
          swiper.virtual.slides.unshift(slides);
        }
        if (swiper.params.virtual.cache) {
          const cache = swiper.virtual.cache;
          const newCache = {};
          Object.keys(cache).forEach((cachedIndex) => {
            const $cachedEl = cache[cachedIndex];
            const cachedElIndex = $cachedEl.attr('data-swiper-slide-index');
            if (cachedElIndex) {
              $cachedEl.attr('data-swiper-slide-index', parseInt(cachedElIndex, 10) + 1);
            }
            newCache[parseInt(cachedIndex, 10) + numberOfNewSlides] = $cachedEl;
          });
          swiper.virtual.cache = newCache;
        }
        swiper.virtual.update(true);
        swiper.slideTo(newActiveIndex, 0);
      },
      removeSlide(slidesIndexes) {
        const swiper = this;
        if (typeof slidesIndexes === 'undefined' || slidesIndexes === null) return;
        let activeIndex = swiper.activeIndex;
        if (Array.isArray(slidesIndexes)) {
          for (let i = slidesIndexes.length - 1; i >= 0; i -= 1) {
            swiper.virtual.slides.splice(slidesIndexes[i], 1);
            if (swiper.params.virtual.cache) {
              delete swiper.virtual.cache[slidesIndexes[i]];
            }
            if (slidesIndexes[i] < activeIndex) activeIndex -= 1;
            activeIndex = Math.max(activeIndex, 0);
          }
        } else {
          swiper.virtual.slides.splice(slidesIndexes, 1);
          if (swiper.params.virtual.cache) {
            delete swiper.virtual.cache[slidesIndexes];
          }
          if (slidesIndexes < activeIndex) activeIndex -= 1;
          activeIndex = Math.max(activeIndex, 0);
        }
        swiper.virtual.update(true);
        swiper.slideTo(activeIndex, 0);
      },
      removeAllSlides() {
        const swiper = this;
        swiper.virtual.slides = [];
        if (swiper.params.virtual.cache) {
          swiper.virtual.cache = {};
        }
        swiper.virtual.update(true);
        swiper.slideTo(0, 0);
      },
    };

    var Virtual$1 = {
      name: 'virtual',
      params: {
        virtual: {
          enabled: false,
          slides: [],
          cache: true,
          renderSlide: null,
          renderExternal: null,
          addSlidesBefore: 0,
          addSlidesAfter: 0,
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          virtual: {
            update: Virtual.update.bind(swiper),
            appendSlide: Virtual.appendSlide.bind(swiper),
            prependSlide: Virtual.prependSlide.bind(swiper),
            removeSlide: Virtual.removeSlide.bind(swiper),
            removeAllSlides: Virtual.removeAllSlides.bind(swiper),
            renderSlide: Virtual.renderSlide.bind(swiper),
            slides: swiper.params.virtual.slides,
            cache: {},
          },
        });
      },
      on: {
        beforeInit() {
          const swiper = this;
          if (!swiper.params.virtual.enabled) return;
          swiper.classNames.push(`${swiper.params.containerModifierClass}virtual`);
          const overwriteParams = {
            watchSlidesProgress: true,
          };
          Utils.extend(swiper.params, overwriteParams);
          Utils.extend(swiper.originalParams, overwriteParams);

          if (!swiper.params.initialSlide) {
            swiper.virtual.update();
          }
        },
        setTranslate() {
          const swiper = this;
          if (!swiper.params.virtual.enabled) return;
          swiper.virtual.update();
        },
      },
    };

    const Keyboard = {
      handle(event) {
        const swiper = this;
        const { rtlTranslate: rtl } = swiper;
        let e = event;
        if (e.originalEvent) e = e.originalEvent; // jquery fix
        const kc = e.keyCode || e.charCode;
        // Directions locks
        if (!swiper.allowSlideNext && ((swiper.isHorizontal() && kc === 39) || (swiper.isVertical() && kc === 40) || kc === 34)) {
          return false;
        }
        if (!swiper.allowSlidePrev && ((swiper.isHorizontal() && kc === 37) || (swiper.isVertical() && kc === 38) || kc === 33)) {
          return false;
        }
        if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) {
          return undefined;
        }
        if (doc.activeElement && doc.activeElement.nodeName && (doc.activeElement.nodeName.toLowerCase() === 'input' || doc.activeElement.nodeName.toLowerCase() === 'textarea')) {
          return undefined;
        }
        if (swiper.params.keyboard.onlyInViewport && (kc === 33 || kc === 34 || kc === 37 || kc === 39 || kc === 38 || kc === 40)) {
          let inView = false;
          // Check that swiper should be inside of visible area of window
          if (swiper.$el.parents(`.${swiper.params.slideClass}`).length > 0 && swiper.$el.parents(`.${swiper.params.slideActiveClass}`).length === 0) {
            return undefined;
          }
          const windowWidth = win.innerWidth;
          const windowHeight = win.innerHeight;
          const swiperOffset = swiper.$el.offset();
          if (rtl) swiperOffset.left -= swiper.$el[0].scrollLeft;
          const swiperCoord = [
            [swiperOffset.left, swiperOffset.top],
            [swiperOffset.left + swiper.width, swiperOffset.top],
            [swiperOffset.left, swiperOffset.top + swiper.height],
            [swiperOffset.left + swiper.width, swiperOffset.top + swiper.height],
          ];
          for (let i = 0; i < swiperCoord.length; i += 1) {
            const point = swiperCoord[i];
            if (
              point[0] >= 0 && point[0] <= windowWidth
              && point[1] >= 0 && point[1] <= windowHeight
            ) {
              inView = true;
            }
          }
          if (!inView) return undefined;
        }
        if (swiper.isHorizontal()) {
          if (kc === 33 || kc === 34 || kc === 37 || kc === 39) {
            if (e.preventDefault) e.preventDefault();
            else e.returnValue = false;
          }
          if (((kc === 34 || kc === 39) && !rtl) || ((kc === 33 || kc === 37) && rtl)) swiper.slideNext();
          if (((kc === 33 || kc === 37) && !rtl) || ((kc === 34 || kc === 39) && rtl)) swiper.slidePrev();
        } else {
          if (kc === 33 || kc === 34 || kc === 38 || kc === 40) {
            if (e.preventDefault) e.preventDefault();
            else e.returnValue = false;
          }
          if (kc === 34 || kc === 40) swiper.slideNext();
          if (kc === 33 || kc === 38) swiper.slidePrev();
        }
        swiper.emit('keyPress', kc);
        return undefined;
      },
      enable() {
        const swiper = this;
        if (swiper.keyboard.enabled) return;
        $$1(doc).on('keydown', swiper.keyboard.handle);
        swiper.keyboard.enabled = true;
      },
      disable() {
        const swiper = this;
        if (!swiper.keyboard.enabled) return;
        $$1(doc).off('keydown', swiper.keyboard.handle);
        swiper.keyboard.enabled = false;
      },
    };

    var Keyboard$1 = {
      name: 'keyboard',
      params: {
        keyboard: {
          enabled: false,
          onlyInViewport: true,
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          keyboard: {
            enabled: false,
            enable: Keyboard.enable.bind(swiper),
            disable: Keyboard.disable.bind(swiper),
            handle: Keyboard.handle.bind(swiper),
          },
        });
      },
      on: {
        init() {
          const swiper = this;
          if (swiper.params.keyboard.enabled) {
            swiper.keyboard.enable();
          }
        },
        destroy() {
          const swiper = this;
          if (swiper.keyboard.enabled) {
            swiper.keyboard.disable();
          }
        },
      },
    };

    function isEventSupported() {
      const eventName = 'onwheel';
      let isSupported = eventName in doc;

      if (!isSupported) {
        const element = doc.createElement('div');
        element.setAttribute(eventName, 'return;');
        isSupported = typeof element[eventName] === 'function';
      }

      if (!isSupported
        && doc.implementation
        && doc.implementation.hasFeature
        // always returns true in newer browsers as per the standard.
        // @see http://dom.spec.whatwg.org/#dom-domimplementation-hasfeature
        && doc.implementation.hasFeature('', '') !== true
      ) {
        // This is the only way to test support for the `wheel` event in IE9+.
        isSupported = doc.implementation.hasFeature('Events.wheel', '3.0');
      }

      return isSupported;
    }
    const Mousewheel = {
      lastScrollTime: Utils.now(),
      lastEventBeforeSnap: undefined,
      recentWheelEvents: [],
      event() {
        if (win.navigator.userAgent.indexOf('firefox') > -1) return 'DOMMouseScroll';
        return isEventSupported() ? 'wheel' : 'mousewheel';
      },
      normalize(e) {
        // Reasonable defaults
        const PIXEL_STEP = 10;
        const LINE_HEIGHT = 40;
        const PAGE_HEIGHT = 800;

        let sX = 0;
        let sY = 0; // spinX, spinY
        let pX = 0;
        let pY = 0; // pixelX, pixelY

        // Legacy
        if ('detail' in e) {
          sY = e.detail;
        }
        if ('wheelDelta' in e) {
          sY = -e.wheelDelta / 120;
        }
        if ('wheelDeltaY' in e) {
          sY = -e.wheelDeltaY / 120;
        }
        if ('wheelDeltaX' in e) {
          sX = -e.wheelDeltaX / 120;
        }

        // side scrolling on FF with DOMMouseScroll
        if ('axis' in e && e.axis === e.HORIZONTAL_AXIS) {
          sX = sY;
          sY = 0;
        }

        pX = sX * PIXEL_STEP;
        pY = sY * PIXEL_STEP;

        if ('deltaY' in e) {
          pY = e.deltaY;
        }
        if ('deltaX' in e) {
          pX = e.deltaX;
        }

        if (e.shiftKey && !pX) { // if user scrolls with shift he wants horizontal scroll
          pX = pY;
          pY = 0;
        }

        if ((pX || pY) && e.deltaMode) {
          if (e.deltaMode === 1) { // delta in LINE units
            pX *= LINE_HEIGHT;
            pY *= LINE_HEIGHT;
          } else { // delta in PAGE units
            pX *= PAGE_HEIGHT;
            pY *= PAGE_HEIGHT;
          }
        }

        // Fall-back if spin cannot be determined
        if (pX && !sX) {
          sX = (pX < 1) ? -1 : 1;
        }
        if (pY && !sY) {
          sY = (pY < 1) ? -1 : 1;
        }

        return {
          spinX: sX,
          spinY: sY,
          pixelX: pX,
          pixelY: pY,
        };
      },
      handleMouseEnter() {
        const swiper = this;
        swiper.mouseEntered = true;
      },
      handleMouseLeave() {
        const swiper = this;
        swiper.mouseEntered = false;
      },
      handle(event) {
        let e = event;
        const swiper = this;
        const params = swiper.params.mousewheel;

        if (swiper.params.cssMode) {
          e.preventDefault();
        }

        if (!swiper.mouseEntered && !params.releaseOnEdges) return true;

        if (e.originalEvent) e = e.originalEvent; // jquery fix
        let delta = 0;
        const rtlFactor = swiper.rtlTranslate ? -1 : 1;

        const data = Mousewheel.normalize(e);

        if (params.forceToAxis) {
          if (swiper.isHorizontal()) {
            if (Math.abs(data.pixelX) > Math.abs(data.pixelY)) delta = data.pixelX * rtlFactor;
            else return true;
          } else if (Math.abs(data.pixelY) > Math.abs(data.pixelX)) delta = data.pixelY;
          else return true;
        } else {
          delta = Math.abs(data.pixelX) > Math.abs(data.pixelY) ? -data.pixelX * rtlFactor : -data.pixelY;
        }

        if (delta === 0) return true;

        if (params.invert) delta = -delta;

        if (!swiper.params.freeMode) {
          // Register the new event in a variable which stores the relevant data
          const newEvent = {
            time: Utils.now(),
            delta: Math.abs(delta),
            direction: Math.sign(delta),
            raw: event,
          };

          // Keep the most recent events
          const recentWheelEvents = swiper.mousewheel.recentWheelEvents;
          if (recentWheelEvents.length >= 2) {
            recentWheelEvents.shift(); // only store the last N events
          }
          const prevEvent = recentWheelEvents.length ? recentWheelEvents[recentWheelEvents.length - 1] : undefined;
          recentWheelEvents.push(newEvent);

          // If there is at least one previous recorded event:
          //   If direction has changed or
          //   if the scroll is quicker than the previous one:
          //     Animate the slider.
          // Else (this is the first time the wheel is moved):
          //     Animate the slider.
          if (prevEvent) {
            if (newEvent.direction !== prevEvent.direction || newEvent.delta > prevEvent.delta) {
              swiper.mousewheel.animateSlider(newEvent);
            }
          } else {
            swiper.mousewheel.animateSlider(newEvent);
          }

          // If it's time to release the scroll:
          //   Return now so you don't hit the preventDefault.
          if (swiper.mousewheel.releaseScroll(newEvent)) {
            return true;
          }
        } else {
          // Freemode or scrollContainer:

          // If we recently snapped after a momentum scroll, then ignore wheel events
          // to give time for the deceleration to finish. Stop ignoring after 500 msecs
          // or if it's a new scroll (larger delta or inverse sign as last event before
          // an end-of-momentum snap).
          const newEvent = { time: Utils.now(), delta: Math.abs(delta), direction: Math.sign(delta) };
          const { lastEventBeforeSnap } = swiper.mousewheel;
          const ignoreWheelEvents = lastEventBeforeSnap
            && newEvent.time < lastEventBeforeSnap.time + 500
            && newEvent.delta <= lastEventBeforeSnap.delta
            && newEvent.direction === lastEventBeforeSnap.direction;
          if (!ignoreWheelEvents) {
            swiper.mousewheel.lastEventBeforeSnap = undefined;

            if (swiper.params.loop) {
              swiper.loopFix();
            }
            let position = swiper.getTranslate() + (delta * params.sensitivity);
            const wasBeginning = swiper.isBeginning;
            const wasEnd = swiper.isEnd;

            if (position >= swiper.minTranslate()) position = swiper.minTranslate();
            if (position <= swiper.maxTranslate()) position = swiper.maxTranslate();

            swiper.setTransition(0);
            swiper.setTranslate(position);
            swiper.updateProgress();
            swiper.updateActiveIndex();
            swiper.updateSlidesClasses();

            if ((!wasBeginning && swiper.isBeginning) || (!wasEnd && swiper.isEnd)) {
              swiper.updateSlidesClasses();
            }

            if (swiper.params.freeModeSticky) {
              // When wheel scrolling starts with sticky (aka snap) enabled, then detect
              // the end of a momentum scroll by storing recent (N=15?) wheel events.
              // 1. do all N events have decreasing or same (absolute value) delta?
              // 2. did all N events arrive in the last M (M=500?) msecs?
              // 3. does the earliest event have an (absolute value) delta that's
              //    at least P (P=1?) larger than the most recent event's delta?
              // 4. does the latest event have a delta that's smaller than Q (Q=6?) pixels?
              // If 1-4 are "yes" then we're near the end of a momuntum scroll deceleration.
              // Snap immediately and ignore remaining wheel events in this scroll.
              // See comment above for "remaining wheel events in this scroll" determination.
              // If 1-4 aren't satisfied, then wait to snap until 500ms after the last event.
              clearTimeout(swiper.mousewheel.timeout);
              swiper.mousewheel.timeout = undefined;
              const recentWheelEvents = swiper.mousewheel.recentWheelEvents;
              if (recentWheelEvents.length >= 15) {
                recentWheelEvents.shift(); // only store the last N events
              }
              const prevEvent = recentWheelEvents.length ? recentWheelEvents[recentWheelEvents.length - 1] : undefined;
              const firstEvent = recentWheelEvents[0];
              recentWheelEvents.push(newEvent);
              if (prevEvent && (newEvent.delta > prevEvent.delta || newEvent.direction !== prevEvent.direction)) {
                // Increasing or reverse-sign delta means the user started scrolling again. Clear the wheel event log.
                recentWheelEvents.splice(0);
              } else if (recentWheelEvents.length >= 15
                  && newEvent.time - firstEvent.time < 500
                  && firstEvent.delta - newEvent.delta >= 1
                  && newEvent.delta <= 6
              ) {
                // We're at the end of the deceleration of a momentum scroll, so there's no need
                // to wait for more events. Snap ASAP on the next tick.
                // Also, because there's some remaining momentum we'll bias the snap in the
                // direction of the ongoing scroll because it's better UX for the scroll to snap
                // in the same direction as the scroll instead of reversing to snap.  Therefore,
                // if it's already scrolled more than 20% in the current direction, keep going.
                const snapToThreshold = delta > 0 ? 0.8 : 0.2;
                swiper.mousewheel.lastEventBeforeSnap = newEvent;
                recentWheelEvents.splice(0);
                swiper.mousewheel.timeout = Utils.nextTick(() => {
                  swiper.slideToClosest(swiper.params.speed, true, undefined, snapToThreshold);
                }, 0); // no delay; move on next tick
              }
              if (!swiper.mousewheel.timeout) {
                // if we get here, then we haven't detected the end of a momentum scroll, so
                // we'll consider a scroll "complete" when there haven't been any wheel events
                // for 500ms.
                swiper.mousewheel.timeout = Utils.nextTick(() => {
                  const snapToThreshold = 0.5;
                  swiper.mousewheel.lastEventBeforeSnap = newEvent;
                  recentWheelEvents.splice(0);
                  swiper.slideToClosest(swiper.params.speed, true, undefined, snapToThreshold);
                }, 500);
              }
            }

            // Emit event
            if (!ignoreWheelEvents) swiper.emit('scroll', e);

            // Stop autoplay
            if (swiper.params.autoplay && swiper.params.autoplayDisableOnInteraction) swiper.autoplay.stop();
            // Return page scroll on edge positions
            if (position === swiper.minTranslate() || position === swiper.maxTranslate()) return true;
          }
        }

        if (e.preventDefault) e.preventDefault();
        else e.returnValue = false;
        return false;
      },
      animateSlider(newEvent) {
        const swiper = this;
        // If the movement is NOT big enough and
        // if the last time the user scrolled was too close to the current one (avoid continuously triggering the slider):
        //   Don't go any further (avoid insignificant scroll movement).
        if (newEvent.delta >= 6 && Utils.now() - swiper.mousewheel.lastScrollTime < 60) {
          // Return false as a default
          return true;
        }
        // If user is scrolling towards the end:
        //   If the slider hasn't hit the latest slide or
        //   if the slider is a loop and
        //   if the slider isn't moving right now:
        //     Go to next slide and
        //     emit a scroll event.
        // Else (the user is scrolling towards the beginning) and
        // if the slider hasn't hit the first slide or
        // if the slider is a loop and
        // if the slider isn't moving right now:
        //   Go to prev slide and
        //   emit a scroll event.
        if (newEvent.direction < 0) {
          if ((!swiper.isEnd || swiper.params.loop) && !swiper.animating) {
            swiper.slideNext();
            swiper.emit('scroll', newEvent.raw);
          }
        } else if ((!swiper.isBeginning || swiper.params.loop) && !swiper.animating) {
          swiper.slidePrev();
          swiper.emit('scroll', newEvent.raw);
        }
        // If you got here is because an animation has been triggered so store the current time
        swiper.mousewheel.lastScrollTime = (new win.Date()).getTime();
        // Return false as a default
        return false;
      },
      releaseScroll(newEvent) {
        const swiper = this;
        const params = swiper.params.mousewheel;
        if (newEvent.direction < 0) {
          if (swiper.isEnd && !swiper.params.loop && params.releaseOnEdges) {
            // Return true to animate scroll on edges
            return true;
          }
        } else if (swiper.isBeginning && !swiper.params.loop && params.releaseOnEdges) {
          // Return true to animate scroll on edges
          return true;
        }
        return false;
      },
      enable() {
        const swiper = this;
        const event = Mousewheel.event();
        if (swiper.params.cssMode) {
          swiper.wrapperEl.removeEventListener(event, swiper.mousewheel.handle);
          return true;
        }
        if (!event) return false;
        if (swiper.mousewheel.enabled) return false;
        let target = swiper.$el;
        if (swiper.params.mousewheel.eventsTarged !== 'container') {
          target = $$1(swiper.params.mousewheel.eventsTarged);
        }
        target.on('mouseenter', swiper.mousewheel.handleMouseEnter);
        target.on('mouseleave', swiper.mousewheel.handleMouseLeave);
        target.on(event, swiper.mousewheel.handle);
        swiper.mousewheel.enabled = true;
        return true;
      },
      disable() {
        const swiper = this;
        const event = Mousewheel.event();
        if (swiper.params.cssMode) {
          swiper.wrapperEl.addEventListener(event, swiper.mousewheel.handle);
          return true;
        }
        if (!event) return false;
        if (!swiper.mousewheel.enabled) return false;
        let target = swiper.$el;
        if (swiper.params.mousewheel.eventsTarged !== 'container') {
          target = $$1(swiper.params.mousewheel.eventsTarged);
        }
        target.off(event, swiper.mousewheel.handle);
        swiper.mousewheel.enabled = false;
        return true;
      },
    };

    var Mousewheel$1 = {
      name: 'mousewheel',
      params: {
        mousewheel: {
          enabled: false,
          releaseOnEdges: false,
          invert: false,
          forceToAxis: false,
          sensitivity: 1,
          eventsTarged: 'container',
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          mousewheel: {
            enabled: false,
            enable: Mousewheel.enable.bind(swiper),
            disable: Mousewheel.disable.bind(swiper),
            handle: Mousewheel.handle.bind(swiper),
            handleMouseEnter: Mousewheel.handleMouseEnter.bind(swiper),
            handleMouseLeave: Mousewheel.handleMouseLeave.bind(swiper),
            animateSlider: Mousewheel.animateSlider.bind(swiper),
            releaseScroll: Mousewheel.releaseScroll.bind(swiper),
            lastScrollTime: Utils.now(),
            lastEventBeforeSnap: undefined,
            recentWheelEvents: [],
          },
        });
      },
      on: {
        init() {
          const swiper = this;
          if (!swiper.params.mousewheel.enabled && swiper.params.cssMode) {
            swiper.mousewheel.disable();
          }
          if (swiper.params.mousewheel.enabled) swiper.mousewheel.enable();
        },
        destroy() {
          const swiper = this;
          if (swiper.params.cssMode) {
            swiper.mousewheel.enable();
          }
          if (swiper.mousewheel.enabled) swiper.mousewheel.disable();
        },
      },
    };

    const Navigation = {
      update() {
        // Update Navigation Buttons
        const swiper = this;
        const params = swiper.params.navigation;

        if (swiper.params.loop) return;
        const { $nextEl, $prevEl } = swiper.navigation;

        if ($prevEl && $prevEl.length > 0) {
          if (swiper.isBeginning) {
            $prevEl.addClass(params.disabledClass);
          } else {
            $prevEl.removeClass(params.disabledClass);
          }
          $prevEl[swiper.params.watchOverflow && swiper.isLocked ? 'addClass' : 'removeClass'](params.lockClass);
        }
        if ($nextEl && $nextEl.length > 0) {
          if (swiper.isEnd) {
            $nextEl.addClass(params.disabledClass);
          } else {
            $nextEl.removeClass(params.disabledClass);
          }
          $nextEl[swiper.params.watchOverflow && swiper.isLocked ? 'addClass' : 'removeClass'](params.lockClass);
        }
      },
      onPrevClick(e) {
        const swiper = this;
        e.preventDefault();
        if (swiper.isBeginning && !swiper.params.loop) return;
        swiper.slidePrev();
      },
      onNextClick(e) {
        const swiper = this;
        e.preventDefault();
        if (swiper.isEnd && !swiper.params.loop) return;
        swiper.slideNext();
      },
      init() {
        const swiper = this;
        const params = swiper.params.navigation;
        if (!(params.nextEl || params.prevEl)) return;

        let $nextEl;
        let $prevEl;
        if (params.nextEl) {
          $nextEl = $$1(params.nextEl);
          if (
            swiper.params.uniqueNavElements
            && typeof params.nextEl === 'string'
            && $nextEl.length > 1
            && swiper.$el.find(params.nextEl).length === 1
          ) {
            $nextEl = swiper.$el.find(params.nextEl);
          }
        }
        if (params.prevEl) {
          $prevEl = $$1(params.prevEl);
          if (
            swiper.params.uniqueNavElements
            && typeof params.prevEl === 'string'
            && $prevEl.length > 1
            && swiper.$el.find(params.prevEl).length === 1
          ) {
            $prevEl = swiper.$el.find(params.prevEl);
          }
        }

        if ($nextEl && $nextEl.length > 0) {
          $nextEl.on('click', swiper.navigation.onNextClick);
        }
        if ($prevEl && $prevEl.length > 0) {
          $prevEl.on('click', swiper.navigation.onPrevClick);
        }

        Utils.extend(swiper.navigation, {
          $nextEl,
          nextEl: $nextEl && $nextEl[0],
          $prevEl,
          prevEl: $prevEl && $prevEl[0],
        });
      },
      destroy() {
        const swiper = this;
        const { $nextEl, $prevEl } = swiper.navigation;
        if ($nextEl && $nextEl.length) {
          $nextEl.off('click', swiper.navigation.onNextClick);
          $nextEl.removeClass(swiper.params.navigation.disabledClass);
        }
        if ($prevEl && $prevEl.length) {
          $prevEl.off('click', swiper.navigation.onPrevClick);
          $prevEl.removeClass(swiper.params.navigation.disabledClass);
        }
      },
    };

    var Navigation$1 = {
      name: 'navigation',
      params: {
        navigation: {
          nextEl: null,
          prevEl: null,

          hideOnClick: false,
          disabledClass: 'swiper-button-disabled',
          hiddenClass: 'swiper-button-hidden',
          lockClass: 'swiper-button-lock',
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          navigation: {
            init: Navigation.init.bind(swiper),
            update: Navigation.update.bind(swiper),
            destroy: Navigation.destroy.bind(swiper),
            onNextClick: Navigation.onNextClick.bind(swiper),
            onPrevClick: Navigation.onPrevClick.bind(swiper),
          },
        });
      },
      on: {
        init() {
          const swiper = this;
          swiper.navigation.init();
          swiper.navigation.update();
        },
        toEdge() {
          const swiper = this;
          swiper.navigation.update();
        },
        fromEdge() {
          const swiper = this;
          swiper.navigation.update();
        },
        destroy() {
          const swiper = this;
          swiper.navigation.destroy();
        },
        click(e) {
          const swiper = this;
          const { $nextEl, $prevEl } = swiper.navigation;
          if (
            swiper.params.navigation.hideOnClick
            && !$$1(e.target).is($prevEl)
            && !$$1(e.target).is($nextEl)
          ) {
            let isHidden;
            if ($nextEl) {
              isHidden = $nextEl.hasClass(swiper.params.navigation.hiddenClass);
            } else if ($prevEl) {
              isHidden = $prevEl.hasClass(swiper.params.navigation.hiddenClass);
            }
            if (isHidden === true) {
              swiper.emit('navigationShow', swiper);
            } else {
              swiper.emit('navigationHide', swiper);
            }
            if ($nextEl) {
              $nextEl.toggleClass(swiper.params.navigation.hiddenClass);
            }
            if ($prevEl) {
              $prevEl.toggleClass(swiper.params.navigation.hiddenClass);
            }
          }
        },
      },
    };

    const Pagination = {
      update() {
        // Render || Update Pagination bullets/items
        const swiper = this;
        const rtl = swiper.rtl;
        const params = swiper.params.pagination;
        if (!params.el || !swiper.pagination.el || !swiper.pagination.$el || swiper.pagination.$el.length === 0) return;
        const slidesLength = swiper.virtual && swiper.params.virtual.enabled ? swiper.virtual.slides.length : swiper.slides.length;
        const $el = swiper.pagination.$el;
        // Current/Total
        let current;
        const total = swiper.params.loop ? Math.ceil((slidesLength - (swiper.loopedSlides * 2)) / swiper.params.slidesPerGroup) : swiper.snapGrid.length;
        if (swiper.params.loop) {
          current = Math.ceil((swiper.activeIndex - swiper.loopedSlides) / swiper.params.slidesPerGroup);
          if (current > slidesLength - 1 - (swiper.loopedSlides * 2)) {
            current -= (slidesLength - (swiper.loopedSlides * 2));
          }
          if (current > total - 1) current -= total;
          if (current < 0 && swiper.params.paginationType !== 'bullets') current = total + current;
        } else if (typeof swiper.snapIndex !== 'undefined') {
          current = swiper.snapIndex;
        } else {
          current = swiper.activeIndex || 0;
        }
        // Types
        if (params.type === 'bullets' && swiper.pagination.bullets && swiper.pagination.bullets.length > 0) {
          const bullets = swiper.pagination.bullets;
          let firstIndex;
          let lastIndex;
          let midIndex;
          if (params.dynamicBullets) {
            swiper.pagination.bulletSize = bullets.eq(0)[swiper.isHorizontal() ? 'outerWidth' : 'outerHeight'](true);
            $el.css(swiper.isHorizontal() ? 'width' : 'height', `${swiper.pagination.bulletSize * (params.dynamicMainBullets + 4)}px`);
            if (params.dynamicMainBullets > 1 && swiper.previousIndex !== undefined) {
              swiper.pagination.dynamicBulletIndex += (current - swiper.previousIndex);
              if (swiper.pagination.dynamicBulletIndex > (params.dynamicMainBullets - 1)) {
                swiper.pagination.dynamicBulletIndex = params.dynamicMainBullets - 1;
              } else if (swiper.pagination.dynamicBulletIndex < 0) {
                swiper.pagination.dynamicBulletIndex = 0;
              }
            }
            firstIndex = current - swiper.pagination.dynamicBulletIndex;
            lastIndex = firstIndex + (Math.min(bullets.length, params.dynamicMainBullets) - 1);
            midIndex = (lastIndex + firstIndex) / 2;
          }
          bullets.removeClass(`${params.bulletActiveClass} ${params.bulletActiveClass}-next ${params.bulletActiveClass}-next-next ${params.bulletActiveClass}-prev ${params.bulletActiveClass}-prev-prev ${params.bulletActiveClass}-main`);
          if ($el.length > 1) {
            bullets.each((index, bullet) => {
              const $bullet = $$1(bullet);
              const bulletIndex = $bullet.index();
              if (bulletIndex === current) {
                $bullet.addClass(params.bulletActiveClass);
              }
              if (params.dynamicBullets) {
                if (bulletIndex >= firstIndex && bulletIndex <= lastIndex) {
                  $bullet.addClass(`${params.bulletActiveClass}-main`);
                }
                if (bulletIndex === firstIndex) {
                  $bullet
                    .prev()
                    .addClass(`${params.bulletActiveClass}-prev`)
                    .prev()
                    .addClass(`${params.bulletActiveClass}-prev-prev`);
                }
                if (bulletIndex === lastIndex) {
                  $bullet
                    .next()
                    .addClass(`${params.bulletActiveClass}-next`)
                    .next()
                    .addClass(`${params.bulletActiveClass}-next-next`);
                }
              }
            });
          } else {
            const $bullet = bullets.eq(current);
            const bulletIndex = $bullet.index();
            $bullet.addClass(params.bulletActiveClass);
            if (params.dynamicBullets) {
              const $firstDisplayedBullet = bullets.eq(firstIndex);
              const $lastDisplayedBullet = bullets.eq(lastIndex);
              for (let i = firstIndex; i <= lastIndex; i += 1) {
                bullets.eq(i).addClass(`${params.bulletActiveClass}-main`);
              }
              if (swiper.params.loop) {
                if (bulletIndex >= bullets.length - params.dynamicMainBullets) {
                  for (let i = params.dynamicMainBullets; i >= 0; i -= 1) {
                    bullets.eq(bullets.length - i).addClass(`${params.bulletActiveClass}-main`);
                  }
                  bullets.eq(bullets.length - params.dynamicMainBullets - 1).addClass(`${params.bulletActiveClass}-prev`);
                } else {
                  $firstDisplayedBullet
                    .prev()
                    .addClass(`${params.bulletActiveClass}-prev`)
                    .prev()
                    .addClass(`${params.bulletActiveClass}-prev-prev`);
                  $lastDisplayedBullet
                    .next()
                    .addClass(`${params.bulletActiveClass}-next`)
                    .next()
                    .addClass(`${params.bulletActiveClass}-next-next`);
                }
              } else {
                $firstDisplayedBullet
                  .prev()
                  .addClass(`${params.bulletActiveClass}-prev`)
                  .prev()
                  .addClass(`${params.bulletActiveClass}-prev-prev`);
                $lastDisplayedBullet
                  .next()
                  .addClass(`${params.bulletActiveClass}-next`)
                  .next()
                  .addClass(`${params.bulletActiveClass}-next-next`);
              }
            }
          }
          if (params.dynamicBullets) {
            const dynamicBulletsLength = Math.min(bullets.length, params.dynamicMainBullets + 4);
            const bulletsOffset = (((swiper.pagination.bulletSize * dynamicBulletsLength) - (swiper.pagination.bulletSize)) / 2) - (midIndex * swiper.pagination.bulletSize);
            const offsetProp = rtl ? 'right' : 'left';
            bullets.css(swiper.isHorizontal() ? offsetProp : 'top', `${bulletsOffset}px`);
          }
        }
        if (params.type === 'fraction') {
          $el.find(`.${params.currentClass}`).text(params.formatFractionCurrent(current + 1));
          $el.find(`.${params.totalClass}`).text(params.formatFractionTotal(total));
        }
        if (params.type === 'progressbar') {
          let progressbarDirection;
          if (params.progressbarOpposite) {
            progressbarDirection = swiper.isHorizontal() ? 'vertical' : 'horizontal';
          } else {
            progressbarDirection = swiper.isHorizontal() ? 'horizontal' : 'vertical';
          }
          const scale = (current + 1) / total;
          let scaleX = 1;
          let scaleY = 1;
          if (progressbarDirection === 'horizontal') {
            scaleX = scale;
          } else {
            scaleY = scale;
          }
          $el.find(`.${params.progressbarFillClass}`).transform(`translate3d(0,0,0) scaleX(${scaleX}) scaleY(${scaleY})`).transition(swiper.params.speed);
        }
        if (params.type === 'custom' && params.renderCustom) {
          $el.html(params.renderCustom(swiper, current + 1, total));
          swiper.emit('paginationRender', swiper, $el[0]);
        } else {
          swiper.emit('paginationUpdate', swiper, $el[0]);
        }
        $el[swiper.params.watchOverflow && swiper.isLocked ? 'addClass' : 'removeClass'](params.lockClass);
      },
      render() {
        // Render Container
        const swiper = this;
        const params = swiper.params.pagination;
        if (!params.el || !swiper.pagination.el || !swiper.pagination.$el || swiper.pagination.$el.length === 0) return;
        const slidesLength = swiper.virtual && swiper.params.virtual.enabled ? swiper.virtual.slides.length : swiper.slides.length;

        const $el = swiper.pagination.$el;
        let paginationHTML = '';
        if (params.type === 'bullets') {
          const numberOfBullets = swiper.params.loop ? Math.ceil((slidesLength - (swiper.loopedSlides * 2)) / swiper.params.slidesPerGroup) : swiper.snapGrid.length;
          for (let i = 0; i < numberOfBullets; i += 1) {
            if (params.renderBullet) {
              paginationHTML += params.renderBullet.call(swiper, i, params.bulletClass);
            } else {
              paginationHTML += `<${params.bulletElement} class="${params.bulletClass}"></${params.bulletElement}>`;
            }
          }
          $el.html(paginationHTML);
          swiper.pagination.bullets = $el.find(`.${params.bulletClass}`);
        }
        if (params.type === 'fraction') {
          if (params.renderFraction) {
            paginationHTML = params.renderFraction.call(swiper, params.currentClass, params.totalClass);
          } else {
            paginationHTML = `<span class="${params.currentClass}"></span>`
            + ' / '
            + `<span class="${params.totalClass}"></span>`;
          }
          $el.html(paginationHTML);
        }
        if (params.type === 'progressbar') {
          if (params.renderProgressbar) {
            paginationHTML = params.renderProgressbar.call(swiper, params.progressbarFillClass);
          } else {
            paginationHTML = `<span class="${params.progressbarFillClass}"></span>`;
          }
          $el.html(paginationHTML);
        }
        if (params.type !== 'custom') {
          swiper.emit('paginationRender', swiper.pagination.$el[0]);
        }
      },
      init() {
        const swiper = this;
        const params = swiper.params.pagination;
        if (!params.el) return;

        let $el = $$1(params.el);
        if ($el.length === 0) return;

        if (
          swiper.params.uniqueNavElements
          && typeof params.el === 'string'
          && $el.length > 1
          && swiper.$el.find(params.el).length === 1
        ) {
          $el = swiper.$el.find(params.el);
        }

        if (params.type === 'bullets' && params.clickable) {
          $el.addClass(params.clickableClass);
        }

        $el.addClass(params.modifierClass + params.type);

        if (params.type === 'bullets' && params.dynamicBullets) {
          $el.addClass(`${params.modifierClass}${params.type}-dynamic`);
          swiper.pagination.dynamicBulletIndex = 0;
          if (params.dynamicMainBullets < 1) {
            params.dynamicMainBullets = 1;
          }
        }
        if (params.type === 'progressbar' && params.progressbarOpposite) {
          $el.addClass(params.progressbarOppositeClass);
        }

        if (params.clickable) {
          $el.on('click', `.${params.bulletClass}`, function onClick(e) {
            e.preventDefault();
            let index = $$1(this).index() * swiper.params.slidesPerGroup;
            if (swiper.params.loop) index += swiper.loopedSlides;
            swiper.slideTo(index);
          });
        }

        Utils.extend(swiper.pagination, {
          $el,
          el: $el[0],
        });
      },
      destroy() {
        const swiper = this;
        const params = swiper.params.pagination;
        if (!params.el || !swiper.pagination.el || !swiper.pagination.$el || swiper.pagination.$el.length === 0) return;
        const $el = swiper.pagination.$el;

        $el.removeClass(params.hiddenClass);
        $el.removeClass(params.modifierClass + params.type);
        if (swiper.pagination.bullets) swiper.pagination.bullets.removeClass(params.bulletActiveClass);
        if (params.clickable) {
          $el.off('click', `.${params.bulletClass}`);
        }
      },
    };

    var Pagination$1 = {
      name: 'pagination',
      params: {
        pagination: {
          el: null,
          bulletElement: 'span',
          clickable: false,
          hideOnClick: false,
          renderBullet: null,
          renderProgressbar: null,
          renderFraction: null,
          renderCustom: null,
          progressbarOpposite: false,
          type: 'bullets', // 'bullets' or 'progressbar' or 'fraction' or 'custom'
          dynamicBullets: false,
          dynamicMainBullets: 1,
          formatFractionCurrent: (number) => number,
          formatFractionTotal: (number) => number,
          bulletClass: 'swiper-pagination-bullet',
          bulletActiveClass: 'swiper-pagination-bullet-active',
          modifierClass: 'swiper-pagination-', // NEW
          currentClass: 'swiper-pagination-current',
          totalClass: 'swiper-pagination-total',
          hiddenClass: 'swiper-pagination-hidden',
          progressbarFillClass: 'swiper-pagination-progressbar-fill',
          progressbarOppositeClass: 'swiper-pagination-progressbar-opposite',
          clickableClass: 'swiper-pagination-clickable', // NEW
          lockClass: 'swiper-pagination-lock',
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          pagination: {
            init: Pagination.init.bind(swiper),
            render: Pagination.render.bind(swiper),
            update: Pagination.update.bind(swiper),
            destroy: Pagination.destroy.bind(swiper),
            dynamicBulletIndex: 0,
          },
        });
      },
      on: {
        init() {
          const swiper = this;
          swiper.pagination.init();
          swiper.pagination.render();
          swiper.pagination.update();
        },
        activeIndexChange() {
          const swiper = this;
          if (swiper.params.loop) {
            swiper.pagination.update();
          } else if (typeof swiper.snapIndex === 'undefined') {
            swiper.pagination.update();
          }
        },
        snapIndexChange() {
          const swiper = this;
          if (!swiper.params.loop) {
            swiper.pagination.update();
          }
        },
        slidesLengthChange() {
          const swiper = this;
          if (swiper.params.loop) {
            swiper.pagination.render();
            swiper.pagination.update();
          }
        },
        snapGridLengthChange() {
          const swiper = this;
          if (!swiper.params.loop) {
            swiper.pagination.render();
            swiper.pagination.update();
          }
        },
        destroy() {
          const swiper = this;
          swiper.pagination.destroy();
        },
        click(e) {
          const swiper = this;
          if (
            swiper.params.pagination.el
            && swiper.params.pagination.hideOnClick
            && swiper.pagination.$el.length > 0
            && !$$1(e.target).hasClass(swiper.params.pagination.bulletClass)
          ) {
            const isHidden = swiper.pagination.$el.hasClass(swiper.params.pagination.hiddenClass);
            if (isHidden === true) {
              swiper.emit('paginationShow', swiper);
            } else {
              swiper.emit('paginationHide', swiper);
            }
            swiper.pagination.$el.toggleClass(swiper.params.pagination.hiddenClass);
          }
        },
      },
    };

    const Scrollbar = {
      setTranslate() {
        const swiper = this;
        if (!swiper.params.scrollbar.el || !swiper.scrollbar.el) return;
        const { scrollbar, rtlTranslate: rtl, progress } = swiper;
        const {
          dragSize, trackSize, $dragEl, $el,
        } = scrollbar;
        const params = swiper.params.scrollbar;

        let newSize = dragSize;
        let newPos = (trackSize - dragSize) * progress;
        if (rtl) {
          newPos = -newPos;
          if (newPos > 0) {
            newSize = dragSize - newPos;
            newPos = 0;
          } else if (-newPos + dragSize > trackSize) {
            newSize = trackSize + newPos;
          }
        } else if (newPos < 0) {
          newSize = dragSize + newPos;
          newPos = 0;
        } else if (newPos + dragSize > trackSize) {
          newSize = trackSize - newPos;
        }
        if (swiper.isHorizontal()) {
          $dragEl.transform(`translate3d(${newPos}px, 0, 0)`);
          $dragEl[0].style.width = `${newSize}px`;
        } else {
          $dragEl.transform(`translate3d(0px, ${newPos}px, 0)`);
          $dragEl[0].style.height = `${newSize}px`;
        }
        if (params.hide) {
          clearTimeout(swiper.scrollbar.timeout);
          $el[0].style.opacity = 1;
          swiper.scrollbar.timeout = setTimeout(() => {
            $el[0].style.opacity = 0;
            $el.transition(400);
          }, 1000);
        }
      },
      setTransition(duration) {
        const swiper = this;
        if (!swiper.params.scrollbar.el || !swiper.scrollbar.el) return;
        swiper.scrollbar.$dragEl.transition(duration);
      },
      updateSize() {
        const swiper = this;
        if (!swiper.params.scrollbar.el || !swiper.scrollbar.el) return;

        const { scrollbar } = swiper;
        const { $dragEl, $el } = scrollbar;

        $dragEl[0].style.width = '';
        $dragEl[0].style.height = '';
        const trackSize = swiper.isHorizontal() ? $el[0].offsetWidth : $el[0].offsetHeight;

        const divider = swiper.size / swiper.virtualSize;
        const moveDivider = divider * (trackSize / swiper.size);
        let dragSize;
        if (swiper.params.scrollbar.dragSize === 'auto') {
          dragSize = trackSize * divider;
        } else {
          dragSize = parseInt(swiper.params.scrollbar.dragSize, 10);
        }

        if (swiper.isHorizontal()) {
          $dragEl[0].style.width = `${dragSize}px`;
        } else {
          $dragEl[0].style.height = `${dragSize}px`;
        }

        if (divider >= 1) {
          $el[0].style.display = 'none';
        } else {
          $el[0].style.display = '';
        }
        if (swiper.params.scrollbar.hide) {
          $el[0].style.opacity = 0;
        }
        Utils.extend(scrollbar, {
          trackSize,
          divider,
          moveDivider,
          dragSize,
        });
        scrollbar.$el[swiper.params.watchOverflow && swiper.isLocked ? 'addClass' : 'removeClass'](swiper.params.scrollbar.lockClass);
      },
      getPointerPosition(e) {
        const swiper = this;
        if (swiper.isHorizontal()) {
          return ((e.type === 'touchstart' || e.type === 'touchmove') ? e.targetTouches[0].clientX : e.clientX);
        }
        return ((e.type === 'touchstart' || e.type === 'touchmove') ? e.targetTouches[0].clientY : e.clientY);
      },
      setDragPosition(e) {
        const swiper = this;
        const { scrollbar, rtlTranslate: rtl } = swiper;
        const {
          $el,
          dragSize,
          trackSize,
          dragStartPos,
        } = scrollbar;

        let positionRatio;
        positionRatio = ((scrollbar.getPointerPosition(e)) - $el.offset()[swiper.isHorizontal() ? 'left' : 'top']
          - (dragStartPos !== null ? dragStartPos : dragSize / 2)) / (trackSize - dragSize);
        positionRatio = Math.max(Math.min(positionRatio, 1), 0);
        if (rtl) {
          positionRatio = 1 - positionRatio;
        }

        const position = swiper.minTranslate() + ((swiper.maxTranslate() - swiper.minTranslate()) * positionRatio);

        swiper.updateProgress(position);
        swiper.setTranslate(position);
        swiper.updateActiveIndex();
        swiper.updateSlidesClasses();
      },
      onDragStart(e) {
        const swiper = this;
        const params = swiper.params.scrollbar;
        const { scrollbar, $wrapperEl } = swiper;
        const { $el, $dragEl } = scrollbar;
        swiper.scrollbar.isTouched = true;
        swiper.scrollbar.dragStartPos = (e.target === $dragEl[0] || e.target === $dragEl)
          ? scrollbar.getPointerPosition(e) - e.target.getBoundingClientRect()[swiper.isHorizontal() ? 'left' : 'top'] : null;
        e.preventDefault();
        e.stopPropagation();

        $wrapperEl.transition(100);
        $dragEl.transition(100);
        scrollbar.setDragPosition(e);

        clearTimeout(swiper.scrollbar.dragTimeout);

        $el.transition(0);
        if (params.hide) {
          $el.css('opacity', 1);
        }
        if (swiper.params.cssMode) {
          swiper.$wrapperEl.css('scroll-snap-type', 'none');
        }
        swiper.emit('scrollbarDragStart', e);
      },
      onDragMove(e) {
        const swiper = this;
        const { scrollbar, $wrapperEl } = swiper;
        const { $el, $dragEl } = scrollbar;

        if (!swiper.scrollbar.isTouched) return;
        if (e.preventDefault) e.preventDefault();
        else e.returnValue = false;
        scrollbar.setDragPosition(e);
        $wrapperEl.transition(0);
        $el.transition(0);
        $dragEl.transition(0);
        swiper.emit('scrollbarDragMove', e);
      },
      onDragEnd(e) {
        const swiper = this;

        const params = swiper.params.scrollbar;
        const { scrollbar, $wrapperEl } = swiper;
        const { $el } = scrollbar;

        if (!swiper.scrollbar.isTouched) return;
        swiper.scrollbar.isTouched = false;
        if (swiper.params.cssMode) {
          swiper.$wrapperEl.css('scroll-snap-type', '');
          $wrapperEl.transition('');
        }
        if (params.hide) {
          clearTimeout(swiper.scrollbar.dragTimeout);
          swiper.scrollbar.dragTimeout = Utils.nextTick(() => {
            $el.css('opacity', 0);
            $el.transition(400);
          }, 1000);
        }
        swiper.emit('scrollbarDragEnd', e);
        if (params.snapOnRelease) {
          swiper.slideToClosest();
        }
      },
      enableDraggable() {
        const swiper = this;
        if (!swiper.params.scrollbar.el) return;
        const {
          scrollbar, touchEventsTouch, touchEventsDesktop, params,
        } = swiper;
        const $el = scrollbar.$el;
        const target = $el[0];
        const activeListener = Support.passiveListener && params.passiveListeners ? { passive: false, capture: false } : false;
        const passiveListener = Support.passiveListener && params.passiveListeners ? { passive: true, capture: false } : false;
        if (!Support.touch) {
          target.addEventListener(touchEventsDesktop.start, swiper.scrollbar.onDragStart, activeListener);
          doc.addEventListener(touchEventsDesktop.move, swiper.scrollbar.onDragMove, activeListener);
          doc.addEventListener(touchEventsDesktop.end, swiper.scrollbar.onDragEnd, passiveListener);
        } else {
          target.addEventListener(touchEventsTouch.start, swiper.scrollbar.onDragStart, activeListener);
          target.addEventListener(touchEventsTouch.move, swiper.scrollbar.onDragMove, activeListener);
          target.addEventListener(touchEventsTouch.end, swiper.scrollbar.onDragEnd, passiveListener);
        }
      },
      disableDraggable() {
        const swiper = this;
        if (!swiper.params.scrollbar.el) return;
        const {
          scrollbar, touchEventsTouch, touchEventsDesktop, params,
        } = swiper;
        const $el = scrollbar.$el;
        const target = $el[0];
        const activeListener = Support.passiveListener && params.passiveListeners ? { passive: false, capture: false } : false;
        const passiveListener = Support.passiveListener && params.passiveListeners ? { passive: true, capture: false } : false;
        if (!Support.touch) {
          target.removeEventListener(touchEventsDesktop.start, swiper.scrollbar.onDragStart, activeListener);
          doc.removeEventListener(touchEventsDesktop.move, swiper.scrollbar.onDragMove, activeListener);
          doc.removeEventListener(touchEventsDesktop.end, swiper.scrollbar.onDragEnd, passiveListener);
        } else {
          target.removeEventListener(touchEventsTouch.start, swiper.scrollbar.onDragStart, activeListener);
          target.removeEventListener(touchEventsTouch.move, swiper.scrollbar.onDragMove, activeListener);
          target.removeEventListener(touchEventsTouch.end, swiper.scrollbar.onDragEnd, passiveListener);
        }
      },
      init() {
        const swiper = this;
        if (!swiper.params.scrollbar.el) return;
        const { scrollbar, $el: $swiperEl } = swiper;
        const params = swiper.params.scrollbar;

        let $el = $$1(params.el);
        if (swiper.params.uniqueNavElements && typeof params.el === 'string' && $el.length > 1 && $swiperEl.find(params.el).length === 1) {
          $el = $swiperEl.find(params.el);
        }

        let $dragEl = $el.find(`.${swiper.params.scrollbar.dragClass}`);
        if ($dragEl.length === 0) {
          $dragEl = $$1(`<div class="${swiper.params.scrollbar.dragClass}"></div>`);
          $el.append($dragEl);
        }

        Utils.extend(scrollbar, {
          $el,
          el: $el[0],
          $dragEl,
          dragEl: $dragEl[0],
        });

        if (params.draggable) {
          scrollbar.enableDraggable();
        }
      },
      destroy() {
        const swiper = this;
        swiper.scrollbar.disableDraggable();
      },
    };

    var Scrollbar$1 = {
      name: 'scrollbar',
      params: {
        scrollbar: {
          el: null,
          dragSize: 'auto',
          hide: false,
          draggable: false,
          snapOnRelease: true,
          lockClass: 'swiper-scrollbar-lock',
          dragClass: 'swiper-scrollbar-drag',
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          scrollbar: {
            init: Scrollbar.init.bind(swiper),
            destroy: Scrollbar.destroy.bind(swiper),
            updateSize: Scrollbar.updateSize.bind(swiper),
            setTranslate: Scrollbar.setTranslate.bind(swiper),
            setTransition: Scrollbar.setTransition.bind(swiper),
            enableDraggable: Scrollbar.enableDraggable.bind(swiper),
            disableDraggable: Scrollbar.disableDraggable.bind(swiper),
            setDragPosition: Scrollbar.setDragPosition.bind(swiper),
            getPointerPosition: Scrollbar.getPointerPosition.bind(swiper),
            onDragStart: Scrollbar.onDragStart.bind(swiper),
            onDragMove: Scrollbar.onDragMove.bind(swiper),
            onDragEnd: Scrollbar.onDragEnd.bind(swiper),
            isTouched: false,
            timeout: null,
            dragTimeout: null,
          },
        });
      },
      on: {
        init() {
          const swiper = this;
          swiper.scrollbar.init();
          swiper.scrollbar.updateSize();
          swiper.scrollbar.setTranslate();
        },
        update() {
          const swiper = this;
          swiper.scrollbar.updateSize();
        },
        resize() {
          const swiper = this;
          swiper.scrollbar.updateSize();
        },
        observerUpdate() {
          const swiper = this;
          swiper.scrollbar.updateSize();
        },
        setTranslate() {
          const swiper = this;
          swiper.scrollbar.setTranslate();
        },
        setTransition(duration) {
          const swiper = this;
          swiper.scrollbar.setTransition(duration);
        },
        destroy() {
          const swiper = this;
          swiper.scrollbar.destroy();
        },
      },
    };

    const Parallax = {
      setTransform(el, progress) {
        const swiper = this;
        const { rtl } = swiper;

        const $el = $$1(el);
        const rtlFactor = rtl ? -1 : 1;

        const p = $el.attr('data-swiper-parallax') || '0';
        let x = $el.attr('data-swiper-parallax-x');
        let y = $el.attr('data-swiper-parallax-y');
        const scale = $el.attr('data-swiper-parallax-scale');
        const opacity = $el.attr('data-swiper-parallax-opacity');

        if (x || y) {
          x = x || '0';
          y = y || '0';
        } else if (swiper.isHorizontal()) {
          x = p;
          y = '0';
        } else {
          y = p;
          x = '0';
        }

        if ((x).indexOf('%') >= 0) {
          x = `${parseInt(x, 10) * progress * rtlFactor}%`;
        } else {
          x = `${x * progress * rtlFactor}px`;
        }
        if ((y).indexOf('%') >= 0) {
          y = `${parseInt(y, 10) * progress}%`;
        } else {
          y = `${y * progress}px`;
        }

        if (typeof opacity !== 'undefined' && opacity !== null) {
          const currentOpacity = opacity - ((opacity - 1) * (1 - Math.abs(progress)));
          $el[0].style.opacity = currentOpacity;
        }
        if (typeof scale === 'undefined' || scale === null) {
          $el.transform(`translate3d(${x}, ${y}, 0px)`);
        } else {
          const currentScale = scale - ((scale - 1) * (1 - Math.abs(progress)));
          $el.transform(`translate3d(${x}, ${y}, 0px) scale(${currentScale})`);
        }
      },
      setTranslate() {
        const swiper = this;
        const {
          $el, slides, progress, snapGrid,
        } = swiper;
        $el.children('[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y], [data-swiper-parallax-opacity], [data-swiper-parallax-scale]')
          .each((index, el) => {
            swiper.parallax.setTransform(el, progress);
          });
        slides.each((slideIndex, slideEl) => {
          let slideProgress = slideEl.progress;
          if (swiper.params.slidesPerGroup > 1 && swiper.params.slidesPerView !== 'auto') {
            slideProgress += Math.ceil(slideIndex / 2) - (progress * (snapGrid.length - 1));
          }
          slideProgress = Math.min(Math.max(slideProgress, -1), 1);
          $$1(slideEl).find('[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y], [data-swiper-parallax-opacity], [data-swiper-parallax-scale]')
            .each((index, el) => {
              swiper.parallax.setTransform(el, slideProgress);
            });
        });
      },
      setTransition(duration = this.params.speed) {
        const swiper = this;
        const { $el } = swiper;
        $el.find('[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y], [data-swiper-parallax-opacity], [data-swiper-parallax-scale]')
          .each((index, parallaxEl) => {
            const $parallaxEl = $$1(parallaxEl);
            let parallaxDuration = parseInt($parallaxEl.attr('data-swiper-parallax-duration'), 10) || duration;
            if (duration === 0) parallaxDuration = 0;
            $parallaxEl.transition(parallaxDuration);
          });
      },
    };

    var Parallax$1 = {
      name: 'parallax',
      params: {
        parallax: {
          enabled: false,
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          parallax: {
            setTransform: Parallax.setTransform.bind(swiper),
            setTranslate: Parallax.setTranslate.bind(swiper),
            setTransition: Parallax.setTransition.bind(swiper),
          },
        });
      },
      on: {
        beforeInit() {
          const swiper = this;
          if (!swiper.params.parallax.enabled) return;
          swiper.params.watchSlidesProgress = true;
          swiper.originalParams.watchSlidesProgress = true;
        },
        init() {
          const swiper = this;
          if (!swiper.params.parallax.enabled) return;
          swiper.parallax.setTranslate();
        },
        setTranslate() {
          const swiper = this;
          if (!swiper.params.parallax.enabled) return;
          swiper.parallax.setTranslate();
        },
        setTransition(duration) {
          const swiper = this;
          if (!swiper.params.parallax.enabled) return;
          swiper.parallax.setTransition(duration);
        },
      },
    };

    const Zoom = {
      // Calc Scale From Multi-touches
      getDistanceBetweenTouches(e) {
        if (e.targetTouches.length < 2) return 1;
        const x1 = e.targetTouches[0].pageX;
        const y1 = e.targetTouches[0].pageY;
        const x2 = e.targetTouches[1].pageX;
        const y2 = e.targetTouches[1].pageY;
        const distance = Math.sqrt(((x2 - x1) ** 2) + ((y2 - y1) ** 2));
        return distance;
      },
      // Events
      onGestureStart(e) {
        const swiper = this;
        const params = swiper.params.zoom;
        const zoom = swiper.zoom;
        const { gesture } = zoom;
        zoom.fakeGestureTouched = false;
        zoom.fakeGestureMoved = false;
        if (!Support.gestures) {
          if (e.type !== 'touchstart' || (e.type === 'touchstart' && e.targetTouches.length < 2)) {
            return;
          }
          zoom.fakeGestureTouched = true;
          gesture.scaleStart = Zoom.getDistanceBetweenTouches(e);
        }
        if (!gesture.$slideEl || !gesture.$slideEl.length) {
          gesture.$slideEl = $$1(e.target).closest('.swiper-slide');
          if (gesture.$slideEl.length === 0) gesture.$slideEl = swiper.slides.eq(swiper.activeIndex);
          gesture.$imageEl = gesture.$slideEl.find('img, svg, canvas');
          gesture.$imageWrapEl = gesture.$imageEl.parent(`.${params.containerClass}`);
          gesture.maxRatio = gesture.$imageWrapEl.attr('data-swiper-zoom') || params.maxRatio;
          if (gesture.$imageWrapEl.length === 0) {
            gesture.$imageEl = undefined;
            return;
          }
        }
        gesture.$imageEl.transition(0);
        swiper.zoom.isScaling = true;
      },
      onGestureChange(e) {
        const swiper = this;
        const params = swiper.params.zoom;
        const zoom = swiper.zoom;
        const { gesture } = zoom;
        if (!Support.gestures) {
          if (e.type !== 'touchmove' || (e.type === 'touchmove' && e.targetTouches.length < 2)) {
            return;
          }
          zoom.fakeGestureMoved = true;
          gesture.scaleMove = Zoom.getDistanceBetweenTouches(e);
        }
        if (!gesture.$imageEl || gesture.$imageEl.length === 0) return;
        if (Support.gestures) {
          zoom.scale = e.scale * zoom.currentScale;
        } else {
          zoom.scale = (gesture.scaleMove / gesture.scaleStart) * zoom.currentScale;
        }
        if (zoom.scale > gesture.maxRatio) {
          zoom.scale = (gesture.maxRatio - 1) + (((zoom.scale - gesture.maxRatio) + 1) ** 0.5);
        }
        if (zoom.scale < params.minRatio) {
          zoom.scale = (params.minRatio + 1) - (((params.minRatio - zoom.scale) + 1) ** 0.5);
        }
        gesture.$imageEl.transform(`translate3d(0,0,0) scale(${zoom.scale})`);
      },
      onGestureEnd(e) {
        const swiper = this;
        const params = swiper.params.zoom;
        const zoom = swiper.zoom;
        const { gesture } = zoom;
        if (!Support.gestures) {
          if (!zoom.fakeGestureTouched || !zoom.fakeGestureMoved) {
            return;
          }
          if (e.type !== 'touchend' || (e.type === 'touchend' && e.changedTouches.length < 2 && !Device.android)) {
            return;
          }
          zoom.fakeGestureTouched = false;
          zoom.fakeGestureMoved = false;
        }
        if (!gesture.$imageEl || gesture.$imageEl.length === 0) return;
        zoom.scale = Math.max(Math.min(zoom.scale, gesture.maxRatio), params.minRatio);
        gesture.$imageEl.transition(swiper.params.speed).transform(`translate3d(0,0,0) scale(${zoom.scale})`);
        zoom.currentScale = zoom.scale;
        zoom.isScaling = false;
        if (zoom.scale === 1) gesture.$slideEl = undefined;
      },
      onTouchStart(e) {
        const swiper = this;
        const zoom = swiper.zoom;
        const { gesture, image } = zoom;
        if (!gesture.$imageEl || gesture.$imageEl.length === 0) return;
        if (image.isTouched) return;
        if (Device.android) e.preventDefault();
        image.isTouched = true;
        image.touchesStart.x = e.type === 'touchstart' ? e.targetTouches[0].pageX : e.pageX;
        image.touchesStart.y = e.type === 'touchstart' ? e.targetTouches[0].pageY : e.pageY;
      },
      onTouchMove(e) {
        const swiper = this;
        const zoom = swiper.zoom;
        const { gesture, image, velocity } = zoom;
        if (!gesture.$imageEl || gesture.$imageEl.length === 0) return;
        swiper.allowClick = false;
        if (!image.isTouched || !gesture.$slideEl) return;

        if (!image.isMoved) {
          image.width = gesture.$imageEl[0].offsetWidth;
          image.height = gesture.$imageEl[0].offsetHeight;
          image.startX = Utils.getTranslate(gesture.$imageWrapEl[0], 'x') || 0;
          image.startY = Utils.getTranslate(gesture.$imageWrapEl[0], 'y') || 0;
          gesture.slideWidth = gesture.$slideEl[0].offsetWidth;
          gesture.slideHeight = gesture.$slideEl[0].offsetHeight;
          gesture.$imageWrapEl.transition(0);
          if (swiper.rtl) {
            image.startX = -image.startX;
            image.startY = -image.startY;
          }
        }
        // Define if we need image drag
        const scaledWidth = image.width * zoom.scale;
        const scaledHeight = image.height * zoom.scale;

        if (scaledWidth < gesture.slideWidth && scaledHeight < gesture.slideHeight) return;

        image.minX = Math.min(((gesture.slideWidth / 2) - (scaledWidth / 2)), 0);
        image.maxX = -image.minX;
        image.minY = Math.min(((gesture.slideHeight / 2) - (scaledHeight / 2)), 0);
        image.maxY = -image.minY;

        image.touchesCurrent.x = e.type === 'touchmove' ? e.targetTouches[0].pageX : e.pageX;
        image.touchesCurrent.y = e.type === 'touchmove' ? e.targetTouches[0].pageY : e.pageY;

        if (!image.isMoved && !zoom.isScaling) {
          if (
            swiper.isHorizontal()
            && (
              (Math.floor(image.minX) === Math.floor(image.startX) && image.touchesCurrent.x < image.touchesStart.x)
              || (Math.floor(image.maxX) === Math.floor(image.startX) && image.touchesCurrent.x > image.touchesStart.x)
            )
          ) {
            image.isTouched = false;
            return;
          } if (
            !swiper.isHorizontal()
            && (
              (Math.floor(image.minY) === Math.floor(image.startY) && image.touchesCurrent.y < image.touchesStart.y)
              || (Math.floor(image.maxY) === Math.floor(image.startY) && image.touchesCurrent.y > image.touchesStart.y)
            )
          ) {
            image.isTouched = false;
            return;
          }
        }
        e.preventDefault();
        e.stopPropagation();

        image.isMoved = true;
        image.currentX = (image.touchesCurrent.x - image.touchesStart.x) + image.startX;
        image.currentY = (image.touchesCurrent.y - image.touchesStart.y) + image.startY;

        if (image.currentX < image.minX) {
          image.currentX = (image.minX + 1) - (((image.minX - image.currentX) + 1) ** 0.8);
        }
        if (image.currentX > image.maxX) {
          image.currentX = (image.maxX - 1) + (((image.currentX - image.maxX) + 1) ** 0.8);
        }

        if (image.currentY < image.minY) {
          image.currentY = (image.minY + 1) - (((image.minY - image.currentY) + 1) ** 0.8);
        }
        if (image.currentY > image.maxY) {
          image.currentY = (image.maxY - 1) + (((image.currentY - image.maxY) + 1) ** 0.8);
        }

        // Velocity
        if (!velocity.prevPositionX) velocity.prevPositionX = image.touchesCurrent.x;
        if (!velocity.prevPositionY) velocity.prevPositionY = image.touchesCurrent.y;
        if (!velocity.prevTime) velocity.prevTime = Date.now();
        velocity.x = (image.touchesCurrent.x - velocity.prevPositionX) / (Date.now() - velocity.prevTime) / 2;
        velocity.y = (image.touchesCurrent.y - velocity.prevPositionY) / (Date.now() - velocity.prevTime) / 2;
        if (Math.abs(image.touchesCurrent.x - velocity.prevPositionX) < 2) velocity.x = 0;
        if (Math.abs(image.touchesCurrent.y - velocity.prevPositionY) < 2) velocity.y = 0;
        velocity.prevPositionX = image.touchesCurrent.x;
        velocity.prevPositionY = image.touchesCurrent.y;
        velocity.prevTime = Date.now();

        gesture.$imageWrapEl.transform(`translate3d(${image.currentX}px, ${image.currentY}px,0)`);
      },
      onTouchEnd() {
        const swiper = this;
        const zoom = swiper.zoom;
        const { gesture, image, velocity } = zoom;
        if (!gesture.$imageEl || gesture.$imageEl.length === 0) return;
        if (!image.isTouched || !image.isMoved) {
          image.isTouched = false;
          image.isMoved = false;
          return;
        }
        image.isTouched = false;
        image.isMoved = false;
        let momentumDurationX = 300;
        let momentumDurationY = 300;
        const momentumDistanceX = velocity.x * momentumDurationX;
        const newPositionX = image.currentX + momentumDistanceX;
        const momentumDistanceY = velocity.y * momentumDurationY;
        const newPositionY = image.currentY + momentumDistanceY;

        // Fix duration
        if (velocity.x !== 0) momentumDurationX = Math.abs((newPositionX - image.currentX) / velocity.x);
        if (velocity.y !== 0) momentumDurationY = Math.abs((newPositionY - image.currentY) / velocity.y);
        const momentumDuration = Math.max(momentumDurationX, momentumDurationY);

        image.currentX = newPositionX;
        image.currentY = newPositionY;

        // Define if we need image drag
        const scaledWidth = image.width * zoom.scale;
        const scaledHeight = image.height * zoom.scale;
        image.minX = Math.min(((gesture.slideWidth / 2) - (scaledWidth / 2)), 0);
        image.maxX = -image.minX;
        image.minY = Math.min(((gesture.slideHeight / 2) - (scaledHeight / 2)), 0);
        image.maxY = -image.minY;
        image.currentX = Math.max(Math.min(image.currentX, image.maxX), image.minX);
        image.currentY = Math.max(Math.min(image.currentY, image.maxY), image.minY);

        gesture.$imageWrapEl.transition(momentumDuration).transform(`translate3d(${image.currentX}px, ${image.currentY}px,0)`);
      },
      onTransitionEnd() {
        const swiper = this;
        const zoom = swiper.zoom;
        const { gesture } = zoom;
        if (gesture.$slideEl && swiper.previousIndex !== swiper.activeIndex) {
          gesture.$imageEl.transform('translate3d(0,0,0) scale(1)');
          gesture.$imageWrapEl.transform('translate3d(0,0,0)');

          zoom.scale = 1;
          zoom.currentScale = 1;

          gesture.$slideEl = undefined;
          gesture.$imageEl = undefined;
          gesture.$imageWrapEl = undefined;
        }
      },
      // Toggle Zoom
      toggle(e) {
        const swiper = this;
        const zoom = swiper.zoom;

        if (zoom.scale && zoom.scale !== 1) {
          // Zoom Out
          zoom.out();
        } else {
          // Zoom In
          zoom.in(e);
        }
      },
      in(e) {
        const swiper = this;

        const zoom = swiper.zoom;
        const params = swiper.params.zoom;
        const { gesture, image } = zoom;

        if (!gesture.$slideEl) {
          gesture.$slideEl = swiper.clickedSlide ? $$1(swiper.clickedSlide) : swiper.slides.eq(swiper.activeIndex);
          gesture.$imageEl = gesture.$slideEl.find('img, svg, canvas');
          gesture.$imageWrapEl = gesture.$imageEl.parent(`.${params.containerClass}`);
        }
        if (!gesture.$imageEl || gesture.$imageEl.length === 0) return;

        gesture.$slideEl.addClass(`${params.zoomedSlideClass}`);

        let touchX;
        let touchY;
        let offsetX;
        let offsetY;
        let diffX;
        let diffY;
        let translateX;
        let translateY;
        let imageWidth;
        let imageHeight;
        let scaledWidth;
        let scaledHeight;
        let translateMinX;
        let translateMinY;
        let translateMaxX;
        let translateMaxY;
        let slideWidth;
        let slideHeight;

        if (typeof image.touchesStart.x === 'undefined' && e) {
          touchX = e.type === 'touchend' ? e.changedTouches[0].pageX : e.pageX;
          touchY = e.type === 'touchend' ? e.changedTouches[0].pageY : e.pageY;
        } else {
          touchX = image.touchesStart.x;
          touchY = image.touchesStart.y;
        }

        zoom.scale = gesture.$imageWrapEl.attr('data-swiper-zoom') || params.maxRatio;
        zoom.currentScale = gesture.$imageWrapEl.attr('data-swiper-zoom') || params.maxRatio;
        if (e) {
          slideWidth = gesture.$slideEl[0].offsetWidth;
          slideHeight = gesture.$slideEl[0].offsetHeight;
          offsetX = gesture.$slideEl.offset().left;
          offsetY = gesture.$slideEl.offset().top;
          diffX = (offsetX + (slideWidth / 2)) - touchX;
          diffY = (offsetY + (slideHeight / 2)) - touchY;

          imageWidth = gesture.$imageEl[0].offsetWidth;
          imageHeight = gesture.$imageEl[0].offsetHeight;
          scaledWidth = imageWidth * zoom.scale;
          scaledHeight = imageHeight * zoom.scale;

          translateMinX = Math.min(((slideWidth / 2) - (scaledWidth / 2)), 0);
          translateMinY = Math.min(((slideHeight / 2) - (scaledHeight / 2)), 0);
          translateMaxX = -translateMinX;
          translateMaxY = -translateMinY;

          translateX = diffX * zoom.scale;
          translateY = diffY * zoom.scale;

          if (translateX < translateMinX) {
            translateX = translateMinX;
          }
          if (translateX > translateMaxX) {
            translateX = translateMaxX;
          }

          if (translateY < translateMinY) {
            translateY = translateMinY;
          }
          if (translateY > translateMaxY) {
            translateY = translateMaxY;
          }
        } else {
          translateX = 0;
          translateY = 0;
        }
        gesture.$imageWrapEl.transition(300).transform(`translate3d(${translateX}px, ${translateY}px,0)`);
        gesture.$imageEl.transition(300).transform(`translate3d(0,0,0) scale(${zoom.scale})`);
      },
      out() {
        const swiper = this;

        const zoom = swiper.zoom;
        const params = swiper.params.zoom;
        const { gesture } = zoom;

        if (!gesture.$slideEl) {
          gesture.$slideEl = swiper.clickedSlide ? $$1(swiper.clickedSlide) : swiper.slides.eq(swiper.activeIndex);
          gesture.$imageEl = gesture.$slideEl.find('img, svg, canvas');
          gesture.$imageWrapEl = gesture.$imageEl.parent(`.${params.containerClass}`);
        }
        if (!gesture.$imageEl || gesture.$imageEl.length === 0) return;

        zoom.scale = 1;
        zoom.currentScale = 1;
        gesture.$imageWrapEl.transition(300).transform('translate3d(0,0,0)');
        gesture.$imageEl.transition(300).transform('translate3d(0,0,0) scale(1)');
        gesture.$slideEl.removeClass(`${params.zoomedSlideClass}`);
        gesture.$slideEl = undefined;
      },
      // Attach/Detach Events
      enable() {
        const swiper = this;
        const zoom = swiper.zoom;
        if (zoom.enabled) return;
        zoom.enabled = true;

        const passiveListener = swiper.touchEvents.start === 'touchstart' && Support.passiveListener && swiper.params.passiveListeners ? { passive: true, capture: false } : false;
        const activeListenerWithCapture = Support.passiveListener ? { passive: false, capture: true } : true;

        // Scale image
        if (Support.gestures) {
          swiper.$wrapperEl.on('gesturestart', '.swiper-slide', zoom.onGestureStart, passiveListener);
          swiper.$wrapperEl.on('gesturechange', '.swiper-slide', zoom.onGestureChange, passiveListener);
          swiper.$wrapperEl.on('gestureend', '.swiper-slide', zoom.onGestureEnd, passiveListener);
        } else if (swiper.touchEvents.start === 'touchstart') {
          swiper.$wrapperEl.on(swiper.touchEvents.start, '.swiper-slide', zoom.onGestureStart, passiveListener);
          swiper.$wrapperEl.on(swiper.touchEvents.move, '.swiper-slide', zoom.onGestureChange, activeListenerWithCapture);
          swiper.$wrapperEl.on(swiper.touchEvents.end, '.swiper-slide', zoom.onGestureEnd, passiveListener);
          if (swiper.touchEvents.cancel) {
            swiper.$wrapperEl.on(swiper.touchEvents.cancel, '.swiper-slide', zoom.onGestureEnd, passiveListener);
          }
        }

        // Move image
        swiper.$wrapperEl.on(swiper.touchEvents.move, `.${swiper.params.zoom.containerClass}`, zoom.onTouchMove, activeListenerWithCapture);
      },
      disable() {
        const swiper = this;
        const zoom = swiper.zoom;
        if (!zoom.enabled) return;

        swiper.zoom.enabled = false;

        const passiveListener = swiper.touchEvents.start === 'touchstart' && Support.passiveListener && swiper.params.passiveListeners ? { passive: true, capture: false } : false;
        const activeListenerWithCapture = Support.passiveListener ? { passive: false, capture: true } : true;

        // Scale image
        if (Support.gestures) {
          swiper.$wrapperEl.off('gesturestart', '.swiper-slide', zoom.onGestureStart, passiveListener);
          swiper.$wrapperEl.off('gesturechange', '.swiper-slide', zoom.onGestureChange, passiveListener);
          swiper.$wrapperEl.off('gestureend', '.swiper-slide', zoom.onGestureEnd, passiveListener);
        } else if (swiper.touchEvents.start === 'touchstart') {
          swiper.$wrapperEl.off(swiper.touchEvents.start, '.swiper-slide', zoom.onGestureStart, passiveListener);
          swiper.$wrapperEl.off(swiper.touchEvents.move, '.swiper-slide', zoom.onGestureChange, activeListenerWithCapture);
          swiper.$wrapperEl.off(swiper.touchEvents.end, '.swiper-slide', zoom.onGestureEnd, passiveListener);
          if (swiper.touchEvents.cancel) {
            swiper.$wrapperEl.off(swiper.touchEvents.cancel, '.swiper-slide', zoom.onGestureEnd, passiveListener);
          }
        }

        // Move image
        swiper.$wrapperEl.off(swiper.touchEvents.move, `.${swiper.params.zoom.containerClass}`, zoom.onTouchMove, activeListenerWithCapture);
      },
    };

    var Zoom$1 = {
      name: 'zoom',
      params: {
        zoom: {
          enabled: false,
          maxRatio: 3,
          minRatio: 1,
          toggle: true,
          containerClass: 'swiper-zoom-container',
          zoomedSlideClass: 'swiper-slide-zoomed',
        },
      },
      create() {
        const swiper = this;
        const zoom = {
          enabled: false,
          scale: 1,
          currentScale: 1,
          isScaling: false,
          gesture: {
            $slideEl: undefined,
            slideWidth: undefined,
            slideHeight: undefined,
            $imageEl: undefined,
            $imageWrapEl: undefined,
            maxRatio: 3,
          },
          image: {
            isTouched: undefined,
            isMoved: undefined,
            currentX: undefined,
            currentY: undefined,
            minX: undefined,
            minY: undefined,
            maxX: undefined,
            maxY: undefined,
            width: undefined,
            height: undefined,
            startX: undefined,
            startY: undefined,
            touchesStart: {},
            touchesCurrent: {},
          },
          velocity: {
            x: undefined,
            y: undefined,
            prevPositionX: undefined,
            prevPositionY: undefined,
            prevTime: undefined,
          },
        };

        ('onGestureStart onGestureChange onGestureEnd onTouchStart onTouchMove onTouchEnd onTransitionEnd toggle enable disable in out').split(' ').forEach((methodName) => {
          zoom[methodName] = Zoom[methodName].bind(swiper);
        });
        Utils.extend(swiper, {
          zoom,
        });

        let scale = 1;
        Object.defineProperty(swiper.zoom, 'scale', {
          get() {
            return scale;
          },
          set(value) {
            if (scale !== value) {
              const imageEl = swiper.zoom.gesture.$imageEl ? swiper.zoom.gesture.$imageEl[0] : undefined;
              const slideEl = swiper.zoom.gesture.$slideEl ? swiper.zoom.gesture.$slideEl[0] : undefined;
              swiper.emit('zoomChange', value, imageEl, slideEl);
            }
            scale = value;
          },
        });
      },
      on: {
        init() {
          const swiper = this;
          if (swiper.params.zoom.enabled) {
            swiper.zoom.enable();
          }
        },
        destroy() {
          const swiper = this;
          swiper.zoom.disable();
        },
        touchStart(e) {
          const swiper = this;
          if (!swiper.zoom.enabled) return;
          swiper.zoom.onTouchStart(e);
        },
        touchEnd(e) {
          const swiper = this;
          if (!swiper.zoom.enabled) return;
          swiper.zoom.onTouchEnd(e);
        },
        doubleTap(e) {
          const swiper = this;
          if (swiper.params.zoom.enabled && swiper.zoom.enabled && swiper.params.zoom.toggle) {
            swiper.zoom.toggle(e);
          }
        },
        transitionEnd() {
          const swiper = this;
          if (swiper.zoom.enabled && swiper.params.zoom.enabled) {
            swiper.zoom.onTransitionEnd();
          }
        },
        slideChange() {
          const swiper = this;
          if (swiper.zoom.enabled && swiper.params.zoom.enabled && swiper.params.cssMode) {
            swiper.zoom.onTransitionEnd();
          }
        },
      },
    };

    const Lazy = {
      loadInSlide(index, loadInDuplicate = true) {
        const swiper = this;
        const params = swiper.params.lazy;
        if (typeof index === 'undefined') return;
        if (swiper.slides.length === 0) return;
        const isVirtual = swiper.virtual && swiper.params.virtual.enabled;

        const $slideEl = isVirtual
          ? swiper.$wrapperEl.children(`.${swiper.params.slideClass}[data-swiper-slide-index="${index}"]`)
          : swiper.slides.eq(index);

        let $images = $slideEl.find(`.${params.elementClass}:not(.${params.loadedClass}):not(.${params.loadingClass})`);
        if ($slideEl.hasClass(params.elementClass) && !$slideEl.hasClass(params.loadedClass) && !$slideEl.hasClass(params.loadingClass)) {
          $images = $images.add($slideEl[0]);
        }
        if ($images.length === 0) return;

        $images.each((imageIndex, imageEl) => {
          const $imageEl = $$1(imageEl);
          $imageEl.addClass(params.loadingClass);

          const background = $imageEl.attr('data-background');
          const src = $imageEl.attr('data-src');
          const srcset = $imageEl.attr('data-srcset');
          const sizes = $imageEl.attr('data-sizes');

          swiper.loadImage($imageEl[0], (src || background), srcset, sizes, false, () => {
            if (typeof swiper === 'undefined' || swiper === null || !swiper || (swiper && !swiper.params) || swiper.destroyed) return;
            if (background) {
              $imageEl.css('background-image', `url("${background}")`);
              $imageEl.removeAttr('data-background');
            } else {
              if (srcset) {
                $imageEl.attr('srcset', srcset);
                $imageEl.removeAttr('data-srcset');
              }
              if (sizes) {
                $imageEl.attr('sizes', sizes);
                $imageEl.removeAttr('data-sizes');
              }
              if (src) {
                $imageEl.attr('src', src);
                $imageEl.removeAttr('data-src');
              }
            }

            $imageEl.addClass(params.loadedClass).removeClass(params.loadingClass);
            $slideEl.find(`.${params.preloaderClass}`).remove();
            if (swiper.params.loop && loadInDuplicate) {
              const slideOriginalIndex = $slideEl.attr('data-swiper-slide-index');
              if ($slideEl.hasClass(swiper.params.slideDuplicateClass)) {
                const originalSlide = swiper.$wrapperEl.children(`[data-swiper-slide-index="${slideOriginalIndex}"]:not(.${swiper.params.slideDuplicateClass})`);
                swiper.lazy.loadInSlide(originalSlide.index(), false);
              } else {
                const duplicatedSlide = swiper.$wrapperEl.children(`.${swiper.params.slideDuplicateClass}[data-swiper-slide-index="${slideOriginalIndex}"]`);
                swiper.lazy.loadInSlide(duplicatedSlide.index(), false);
              }
            }
            swiper.emit('lazyImageReady', $slideEl[0], $imageEl[0]);
          });

          swiper.emit('lazyImageLoad', $slideEl[0], $imageEl[0]);
        });
      },
      load() {
        const swiper = this;
        const {
          $wrapperEl, params: swiperParams, slides, activeIndex,
        } = swiper;
        const isVirtual = swiper.virtual && swiperParams.virtual.enabled;
        const params = swiperParams.lazy;

        let slidesPerView = swiperParams.slidesPerView;
        if (slidesPerView === 'auto') {
          slidesPerView = 0;
        }

        function slideExist(index) {
          if (isVirtual) {
            if ($wrapperEl.children(`.${swiperParams.slideClass}[data-swiper-slide-index="${index}"]`).length) {
              return true;
            }
          } else if (slides[index]) return true;
          return false;
        }
        function slideIndex(slideEl) {
          if (isVirtual) {
            return $$1(slideEl).attr('data-swiper-slide-index');
          }
          return $$1(slideEl).index();
        }

        if (!swiper.lazy.initialImageLoaded) swiper.lazy.initialImageLoaded = true;
        if (swiper.params.watchSlidesVisibility) {
          $wrapperEl.children(`.${swiperParams.slideVisibleClass}`).each((elIndex, slideEl) => {
            const index = isVirtual ? $$1(slideEl).attr('data-swiper-slide-index') : $$1(slideEl).index();
            swiper.lazy.loadInSlide(index);
          });
        } else if (slidesPerView > 1) {
          for (let i = activeIndex; i < activeIndex + slidesPerView; i += 1) {
            if (slideExist(i)) swiper.lazy.loadInSlide(i);
          }
        } else {
          swiper.lazy.loadInSlide(activeIndex);
        }
        if (params.loadPrevNext) {
          if (slidesPerView > 1 || (params.loadPrevNextAmount && params.loadPrevNextAmount > 1)) {
            const amount = params.loadPrevNextAmount;
            const spv = slidesPerView;
            const maxIndex = Math.min(activeIndex + spv + Math.max(amount, spv), slides.length);
            const minIndex = Math.max(activeIndex - Math.max(spv, amount), 0);
            // Next Slides
            for (let i = activeIndex + slidesPerView; i < maxIndex; i += 1) {
              if (slideExist(i)) swiper.lazy.loadInSlide(i);
            }
            // Prev Slides
            for (let i = minIndex; i < activeIndex; i += 1) {
              if (slideExist(i)) swiper.lazy.loadInSlide(i);
            }
          } else {
            const nextSlide = $wrapperEl.children(`.${swiperParams.slideNextClass}`);
            if (nextSlide.length > 0) swiper.lazy.loadInSlide(slideIndex(nextSlide));

            const prevSlide = $wrapperEl.children(`.${swiperParams.slidePrevClass}`);
            if (prevSlide.length > 0) swiper.lazy.loadInSlide(slideIndex(prevSlide));
          }
        }
      },
    };

    var Lazy$1 = {
      name: 'lazy',
      params: {
        lazy: {
          enabled: false,
          loadPrevNext: false,
          loadPrevNextAmount: 1,
          loadOnTransitionStart: false,

          elementClass: 'swiper-lazy',
          loadingClass: 'swiper-lazy-loading',
          loadedClass: 'swiper-lazy-loaded',
          preloaderClass: 'swiper-lazy-preloader',
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          lazy: {
            initialImageLoaded: false,
            load: Lazy.load.bind(swiper),
            loadInSlide: Lazy.loadInSlide.bind(swiper),
          },
        });
      },
      on: {
        beforeInit() {
          const swiper = this;
          if (swiper.params.lazy.enabled && swiper.params.preloadImages) {
            swiper.params.preloadImages = false;
          }
        },
        init() {
          const swiper = this;
          if (swiper.params.lazy.enabled && !swiper.params.loop && swiper.params.initialSlide === 0) {
            swiper.lazy.load();
          }
        },
        scroll() {
          const swiper = this;
          if (swiper.params.freeMode && !swiper.params.freeModeSticky) {
            swiper.lazy.load();
          }
        },
        resize() {
          const swiper = this;
          if (swiper.params.lazy.enabled) {
            swiper.lazy.load();
          }
        },
        scrollbarDragMove() {
          const swiper = this;
          if (swiper.params.lazy.enabled) {
            swiper.lazy.load();
          }
        },
        transitionStart() {
          const swiper = this;
          if (swiper.params.lazy.enabled) {
            if (swiper.params.lazy.loadOnTransitionStart || (!swiper.params.lazy.loadOnTransitionStart && !swiper.lazy.initialImageLoaded)) {
              swiper.lazy.load();
            }
          }
        },
        transitionEnd() {
          const swiper = this;
          if (swiper.params.lazy.enabled && !swiper.params.lazy.loadOnTransitionStart) {
            swiper.lazy.load();
          }
        },
        slideChange() {
          const swiper = this;
          if (swiper.params.lazy.enabled && swiper.params.cssMode) {
            swiper.lazy.load();
          }
        },
      },
    };

    /* eslint no-bitwise: ["error", { "allow": [">>"] }] */

    const Controller = {
      LinearSpline: function LinearSpline(x, y) {
        const binarySearch = (function search() {
          let maxIndex;
          let minIndex;
          let guess;
          return (array, val) => {
            minIndex = -1;
            maxIndex = array.length;
            while (maxIndex - minIndex > 1) {
              guess = maxIndex + minIndex >> 1;
              if (array[guess] <= val) {
                minIndex = guess;
              } else {
                maxIndex = guess;
              }
            }
            return maxIndex;
          };
        }());
        this.x = x;
        this.y = y;
        this.lastIndex = x.length - 1;
        // Given an x value (x2), return the expected y2 value:
        // (x1,y1) is the known point before given value,
        // (x3,y3) is the known point after given value.
        let i1;
        let i3;

        this.interpolate = function interpolate(x2) {
          if (!x2) return 0;

          // Get the indexes of x1 and x3 (the array indexes before and after given x2):
          i3 = binarySearch(this.x, x2);
          i1 = i3 - 1;

          // We have our indexes i1 & i3, so we can calculate already:
          // y2 := ((x2−x1) × (y3−y1)) ÷ (x3−x1) + y1
          return (((x2 - this.x[i1]) * (this.y[i3] - this.y[i1])) / (this.x[i3] - this.x[i1])) + this.y[i1];
        };
        return this;
      },
      // xxx: for now i will just save one spline function to to
      getInterpolateFunction(c) {
        const swiper = this;
        if (!swiper.controller.spline) {
          swiper.controller.spline = swiper.params.loop
            ? new Controller.LinearSpline(swiper.slidesGrid, c.slidesGrid)
            : new Controller.LinearSpline(swiper.snapGrid, c.snapGrid);
        }
      },
      setTranslate(setTranslate, byController) {
        const swiper = this;
        const controlled = swiper.controller.control;
        let multiplier;
        let controlledTranslate;
        function setControlledTranslate(c) {
          // this will create an Interpolate function based on the snapGrids
          // x is the Grid of the scrolled scroller and y will be the controlled scroller
          // it makes sense to create this only once and recall it for the interpolation
          // the function does a lot of value caching for performance
          const translate = swiper.rtlTranslate ? -swiper.translate : swiper.translate;
          if (swiper.params.controller.by === 'slide') {
            swiper.controller.getInterpolateFunction(c);
            // i am not sure why the values have to be multiplicated this way, tried to invert the snapGrid
            // but it did not work out
            controlledTranslate = -swiper.controller.spline.interpolate(-translate);
          }

          if (!controlledTranslate || swiper.params.controller.by === 'container') {
            multiplier = (c.maxTranslate() - c.minTranslate()) / (swiper.maxTranslate() - swiper.minTranslate());
            controlledTranslate = ((translate - swiper.minTranslate()) * multiplier) + c.minTranslate();
          }

          if (swiper.params.controller.inverse) {
            controlledTranslate = c.maxTranslate() - controlledTranslate;
          }
          c.updateProgress(controlledTranslate);
          c.setTranslate(controlledTranslate, swiper);
          c.updateActiveIndex();
          c.updateSlidesClasses();
        }
        if (Array.isArray(controlled)) {
          for (let i = 0; i < controlled.length; i += 1) {
            if (controlled[i] !== byController && controlled[i] instanceof Swiper) {
              setControlledTranslate(controlled[i]);
            }
          }
        } else if (controlled instanceof Swiper && byController !== controlled) {
          setControlledTranslate(controlled);
        }
      },
      setTransition(duration, byController) {
        const swiper = this;
        const controlled = swiper.controller.control;
        let i;
        function setControlledTransition(c) {
          c.setTransition(duration, swiper);
          if (duration !== 0) {
            c.transitionStart();
            if (c.params.autoHeight) {
              Utils.nextTick(() => {
                c.updateAutoHeight();
              });
            }
            c.$wrapperEl.transitionEnd(() => {
              if (!controlled) return;
              if (c.params.loop && swiper.params.controller.by === 'slide') {
                c.loopFix();
              }
              c.transitionEnd();
            });
          }
        }
        if (Array.isArray(controlled)) {
          for (i = 0; i < controlled.length; i += 1) {
            if (controlled[i] !== byController && controlled[i] instanceof Swiper) {
              setControlledTransition(controlled[i]);
            }
          }
        } else if (controlled instanceof Swiper && byController !== controlled) {
          setControlledTransition(controlled);
        }
      },
    };
    var Controller$1 = {
      name: 'controller',
      params: {
        controller: {
          control: undefined,
          inverse: false,
          by: 'slide', // or 'container'
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          controller: {
            control: swiper.params.controller.control,
            getInterpolateFunction: Controller.getInterpolateFunction.bind(swiper),
            setTranslate: Controller.setTranslate.bind(swiper),
            setTransition: Controller.setTransition.bind(swiper),
          },
        });
      },
      on: {
        update() {
          const swiper = this;
          if (!swiper.controller.control) return;
          if (swiper.controller.spline) {
            swiper.controller.spline = undefined;
            delete swiper.controller.spline;
          }
        },
        resize() {
          const swiper = this;
          if (!swiper.controller.control) return;
          if (swiper.controller.spline) {
            swiper.controller.spline = undefined;
            delete swiper.controller.spline;
          }
        },
        observerUpdate() {
          const swiper = this;
          if (!swiper.controller.control) return;
          if (swiper.controller.spline) {
            swiper.controller.spline = undefined;
            delete swiper.controller.spline;
          }
        },
        setTranslate(translate, byController) {
          const swiper = this;
          if (!swiper.controller.control) return;
          swiper.controller.setTranslate(translate, byController);
        },
        setTransition(duration, byController) {
          const swiper = this;
          if (!swiper.controller.control) return;
          swiper.controller.setTransition(duration, byController);
        },
      },
    };

    const a11y = {
      makeElFocusable($el) {
        $el.attr('tabIndex', '0');
        return $el;
      },
      addElRole($el, role) {
        $el.attr('role', role);
        return $el;
      },
      addElLabel($el, label) {
        $el.attr('aria-label', label);
        return $el;
      },
      disableEl($el) {
        $el.attr('aria-disabled', true);
        return $el;
      },
      enableEl($el) {
        $el.attr('aria-disabled', false);
        return $el;
      },
      onEnterKey(e) {
        const swiper = this;
        const params = swiper.params.a11y;
        if (e.keyCode !== 13) return;
        const $targetEl = $$1(e.target);
        if (swiper.navigation && swiper.navigation.$nextEl && $targetEl.is(swiper.navigation.$nextEl)) {
          if (!(swiper.isEnd && !swiper.params.loop)) {
            swiper.slideNext();
          }
          if (swiper.isEnd) {
            swiper.a11y.notify(params.lastSlideMessage);
          } else {
            swiper.a11y.notify(params.nextSlideMessage);
          }
        }
        if (swiper.navigation && swiper.navigation.$prevEl && $targetEl.is(swiper.navigation.$prevEl)) {
          if (!(swiper.isBeginning && !swiper.params.loop)) {
            swiper.slidePrev();
          }
          if (swiper.isBeginning) {
            swiper.a11y.notify(params.firstSlideMessage);
          } else {
            swiper.a11y.notify(params.prevSlideMessage);
          }
        }
        if (swiper.pagination && $targetEl.is(`.${swiper.params.pagination.bulletClass}`)) {
          $targetEl[0].click();
        }
      },
      notify(message) {
        const swiper = this;
        const notification = swiper.a11y.liveRegion;
        if (notification.length === 0) return;
        notification.html('');
        notification.html(message);
      },
      updateNavigation() {
        const swiper = this;

        if (swiper.params.loop || !swiper.navigation) return;
        const { $nextEl, $prevEl } = swiper.navigation;

        if ($prevEl && $prevEl.length > 0) {
          if (swiper.isBeginning) {
            swiper.a11y.disableEl($prevEl);
          } else {
            swiper.a11y.enableEl($prevEl);
          }
        }
        if ($nextEl && $nextEl.length > 0) {
          if (swiper.isEnd) {
            swiper.a11y.disableEl($nextEl);
          } else {
            swiper.a11y.enableEl($nextEl);
          }
        }
      },
      updatePagination() {
        const swiper = this;
        const params = swiper.params.a11y;
        if (swiper.pagination && swiper.params.pagination.clickable && swiper.pagination.bullets && swiper.pagination.bullets.length) {
          swiper.pagination.bullets.each((bulletIndex, bulletEl) => {
            const $bulletEl = $$1(bulletEl);
            swiper.a11y.makeElFocusable($bulletEl);
            swiper.a11y.addElRole($bulletEl, 'button');
            swiper.a11y.addElLabel($bulletEl, params.paginationBulletMessage.replace(/{{index}}/, $bulletEl.index() + 1));
          });
        }
      },
      init() {
        const swiper = this;

        swiper.$el.append(swiper.a11y.liveRegion);

        // Navigation
        const params = swiper.params.a11y;
        let $nextEl;
        let $prevEl;
        if (swiper.navigation && swiper.navigation.$nextEl) {
          $nextEl = swiper.navigation.$nextEl;
        }
        if (swiper.navigation && swiper.navigation.$prevEl) {
          $prevEl = swiper.navigation.$prevEl;
        }
        if ($nextEl) {
          swiper.a11y.makeElFocusable($nextEl);
          swiper.a11y.addElRole($nextEl, 'button');
          swiper.a11y.addElLabel($nextEl, params.nextSlideMessage);
          $nextEl.on('keydown', swiper.a11y.onEnterKey);
        }
        if ($prevEl) {
          swiper.a11y.makeElFocusable($prevEl);
          swiper.a11y.addElRole($prevEl, 'button');
          swiper.a11y.addElLabel($prevEl, params.prevSlideMessage);
          $prevEl.on('keydown', swiper.a11y.onEnterKey);
        }

        // Pagination
        if (swiper.pagination && swiper.params.pagination.clickable && swiper.pagination.bullets && swiper.pagination.bullets.length) {
          swiper.pagination.$el.on('keydown', `.${swiper.params.pagination.bulletClass}`, swiper.a11y.onEnterKey);
        }
      },
      destroy() {
        const swiper = this;
        if (swiper.a11y.liveRegion && swiper.a11y.liveRegion.length > 0) swiper.a11y.liveRegion.remove();

        let $nextEl;
        let $prevEl;
        if (swiper.navigation && swiper.navigation.$nextEl) {
          $nextEl = swiper.navigation.$nextEl;
        }
        if (swiper.navigation && swiper.navigation.$prevEl) {
          $prevEl = swiper.navigation.$prevEl;
        }
        if ($nextEl) {
          $nextEl.off('keydown', swiper.a11y.onEnterKey);
        }
        if ($prevEl) {
          $prevEl.off('keydown', swiper.a11y.onEnterKey);
        }

        // Pagination
        if (swiper.pagination && swiper.params.pagination.clickable && swiper.pagination.bullets && swiper.pagination.bullets.length) {
          swiper.pagination.$el.off('keydown', `.${swiper.params.pagination.bulletClass}`, swiper.a11y.onEnterKey);
        }
      },
    };
    var A11y = {
      name: 'a11y',
      params: {
        a11y: {
          enabled: true,
          notificationClass: 'swiper-notification',
          prevSlideMessage: 'Previous slide',
          nextSlideMessage: 'Next slide',
          firstSlideMessage: 'This is the first slide',
          lastSlideMessage: 'This is the last slide',
          paginationBulletMessage: 'Go to slide {{index}}',
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          a11y: {
            liveRegion: $$1(`<span class="${swiper.params.a11y.notificationClass}" aria-live="assertive" aria-atomic="true"></span>`),
          },
        });
        Object.keys(a11y).forEach((methodName) => {
          swiper.a11y[methodName] = a11y[methodName].bind(swiper);
        });
      },
      on: {
        init() {
          const swiper = this;
          if (!swiper.params.a11y.enabled) return;
          swiper.a11y.init();
          swiper.a11y.updateNavigation();
        },
        toEdge() {
          const swiper = this;
          if (!swiper.params.a11y.enabled) return;
          swiper.a11y.updateNavigation();
        },
        fromEdge() {
          const swiper = this;
          if (!swiper.params.a11y.enabled) return;
          swiper.a11y.updateNavigation();
        },
        paginationUpdate() {
          const swiper = this;
          if (!swiper.params.a11y.enabled) return;
          swiper.a11y.updatePagination();
        },
        destroy() {
          const swiper = this;
          if (!swiper.params.a11y.enabled) return;
          swiper.a11y.destroy();
        },
      },
    };

    const History = {
      init() {
        const swiper = this;
        if (!swiper.params.history) return;
        if (!win.history || !win.history.pushState) {
          swiper.params.history.enabled = false;
          swiper.params.hashNavigation.enabled = true;
          return;
        }
        const history = swiper.history;
        history.initialized = true;
        history.paths = History.getPathValues();
        if (!history.paths.key && !history.paths.value) return;
        history.scrollToSlide(0, history.paths.value, swiper.params.runCallbacksOnInit);
        if (!swiper.params.history.replaceState) {
          win.addEventListener('popstate', swiper.history.setHistoryPopState);
        }
      },
      destroy() {
        const swiper = this;
        if (!swiper.params.history.replaceState) {
          win.removeEventListener('popstate', swiper.history.setHistoryPopState);
        }
      },
      setHistoryPopState() {
        const swiper = this;
        swiper.history.paths = History.getPathValues();
        swiper.history.scrollToSlide(swiper.params.speed, swiper.history.paths.value, false);
      },
      getPathValues() {
        const pathArray = win.location.pathname.slice(1).split('/').filter((part) => part !== '');
        const total = pathArray.length;
        const key = pathArray[total - 2];
        const value = pathArray[total - 1];
        return { key, value };
      },
      setHistory(key, index) {
        const swiper = this;
        if (!swiper.history.initialized || !swiper.params.history.enabled) return;
        const slide = swiper.slides.eq(index);
        let value = History.slugify(slide.attr('data-history'));
        if (!win.location.pathname.includes(key)) {
          value = `${key}/${value}`;
        }
        const currentState = win.history.state;
        if (currentState && currentState.value === value) {
          return;
        }
        if (swiper.params.history.replaceState) {
          win.history.replaceState({ value }, null, value);
        } else {
          win.history.pushState({ value }, null, value);
        }
      },
      slugify(text) {
        return text.toString()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]+/g, '')
          .replace(/--+/g, '-')
          .replace(/^-+/, '')
          .replace(/-+$/, '');
      },
      scrollToSlide(speed, value, runCallbacks) {
        const swiper = this;
        if (value) {
          for (let i = 0, length = swiper.slides.length; i < length; i += 1) {
            const slide = swiper.slides.eq(i);
            const slideHistory = History.slugify(slide.attr('data-history'));
            if (slideHistory === value && !slide.hasClass(swiper.params.slideDuplicateClass)) {
              const index = slide.index();
              swiper.slideTo(index, speed, runCallbacks);
            }
          }
        } else {
          swiper.slideTo(0, speed, runCallbacks);
        }
      },
    };

    var History$1 = {
      name: 'history',
      params: {
        history: {
          enabled: false,
          replaceState: false,
          key: 'slides',
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          history: {
            init: History.init.bind(swiper),
            setHistory: History.setHistory.bind(swiper),
            setHistoryPopState: History.setHistoryPopState.bind(swiper),
            scrollToSlide: History.scrollToSlide.bind(swiper),
            destroy: History.destroy.bind(swiper),
          },
        });
      },
      on: {
        init() {
          const swiper = this;
          if (swiper.params.history.enabled) {
            swiper.history.init();
          }
        },
        destroy() {
          const swiper = this;
          if (swiper.params.history.enabled) {
            swiper.history.destroy();
          }
        },
        transitionEnd() {
          const swiper = this;
          if (swiper.history.initialized) {
            swiper.history.setHistory(swiper.params.history.key, swiper.activeIndex);
          }
        },
        slideChange() {
          const swiper = this;
          if (swiper.history.initialized && swiper.params.cssMode) {
            swiper.history.setHistory(swiper.params.history.key, swiper.activeIndex);
          }
        },
      },
    };

    const HashNavigation = {
      onHashCange() {
        const swiper = this;
        const newHash = doc.location.hash.replace('#', '');
        const activeSlideHash = swiper.slides.eq(swiper.activeIndex).attr('data-hash');
        if (newHash !== activeSlideHash) {
          const newIndex = swiper.$wrapperEl.children(`.${swiper.params.slideClass}[data-hash="${newHash}"]`).index();
          if (typeof newIndex === 'undefined') return;
          swiper.slideTo(newIndex);
        }
      },
      setHash() {
        const swiper = this;
        if (!swiper.hashNavigation.initialized || !swiper.params.hashNavigation.enabled) return;
        if (swiper.params.hashNavigation.replaceState && win.history && win.history.replaceState) {
          win.history.replaceState(null, null, (`#${swiper.slides.eq(swiper.activeIndex).attr('data-hash')}` || ''));
        } else {
          const slide = swiper.slides.eq(swiper.activeIndex);
          const hash = slide.attr('data-hash') || slide.attr('data-history');
          doc.location.hash = hash || '';
        }
      },
      init() {
        const swiper = this;
        if (!swiper.params.hashNavigation.enabled || (swiper.params.history && swiper.params.history.enabled)) return;
        swiper.hashNavigation.initialized = true;
        const hash = doc.location.hash.replace('#', '');
        if (hash) {
          const speed = 0;
          for (let i = 0, length = swiper.slides.length; i < length; i += 1) {
            const slide = swiper.slides.eq(i);
            const slideHash = slide.attr('data-hash') || slide.attr('data-history');
            if (slideHash === hash && !slide.hasClass(swiper.params.slideDuplicateClass)) {
              const index = slide.index();
              swiper.slideTo(index, speed, swiper.params.runCallbacksOnInit, true);
            }
          }
        }
        if (swiper.params.hashNavigation.watchState) {
          $$1(win).on('hashchange', swiper.hashNavigation.onHashCange);
        }
      },
      destroy() {
        const swiper = this;
        if (swiper.params.hashNavigation.watchState) {
          $$1(win).off('hashchange', swiper.hashNavigation.onHashCange);
        }
      },
    };
    var HashNavigation$1 = {
      name: 'hash-navigation',
      params: {
        hashNavigation: {
          enabled: false,
          replaceState: false,
          watchState: false,
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          hashNavigation: {
            initialized: false,
            init: HashNavigation.init.bind(swiper),
            destroy: HashNavigation.destroy.bind(swiper),
            setHash: HashNavigation.setHash.bind(swiper),
            onHashCange: HashNavigation.onHashCange.bind(swiper),
          },
        });
      },
      on: {
        init() {
          const swiper = this;
          if (swiper.params.hashNavigation.enabled) {
            swiper.hashNavigation.init();
          }
        },
        destroy() {
          const swiper = this;
          if (swiper.params.hashNavigation.enabled) {
            swiper.hashNavigation.destroy();
          }
        },
        transitionEnd() {
          const swiper = this;
          if (swiper.hashNavigation.initialized) {
            swiper.hashNavigation.setHash();
          }
        },
        slideChange() {
          const swiper = this;
          if (swiper.hashNavigation.initialized && swiper.params.cssMode) {
            swiper.hashNavigation.setHash();
          }
        },
      },
    };

    /* eslint no-underscore-dangle: "off" */

    const Autoplay = {
      run() {
        const swiper = this;
        const $activeSlideEl = swiper.slides.eq(swiper.activeIndex);
        let delay = swiper.params.autoplay.delay;
        if ($activeSlideEl.attr('data-swiper-autoplay')) {
          delay = $activeSlideEl.attr('data-swiper-autoplay') || swiper.params.autoplay.delay;
        }
        clearTimeout(swiper.autoplay.timeout);
        swiper.autoplay.timeout = Utils.nextTick(() => {
          if (swiper.params.autoplay.reverseDirection) {
            if (swiper.params.loop) {
              swiper.loopFix();
              swiper.slidePrev(swiper.params.speed, true, true);
              swiper.emit('autoplay');
            } else if (!swiper.isBeginning) {
              swiper.slidePrev(swiper.params.speed, true, true);
              swiper.emit('autoplay');
            } else if (!swiper.params.autoplay.stopOnLastSlide) {
              swiper.slideTo(swiper.slides.length - 1, swiper.params.speed, true, true);
              swiper.emit('autoplay');
            } else {
              swiper.autoplay.stop();
            }
          } else if (swiper.params.loop) {
            swiper.loopFix();
            swiper.slideNext(swiper.params.speed, true, true);
            swiper.emit('autoplay');
          } else if (!swiper.isEnd) {
            swiper.slideNext(swiper.params.speed, true, true);
            swiper.emit('autoplay');
          } else if (!swiper.params.autoplay.stopOnLastSlide) {
            swiper.slideTo(0, swiper.params.speed, true, true);
            swiper.emit('autoplay');
          } else {
            swiper.autoplay.stop();
          }
          if (swiper.params.cssMode && swiper.autoplay.running) swiper.autoplay.run();
        }, delay);
      },
      start() {
        const swiper = this;
        if (typeof swiper.autoplay.timeout !== 'undefined') return false;
        if (swiper.autoplay.running) return false;
        swiper.autoplay.running = true;
        swiper.emit('autoplayStart');
        swiper.autoplay.run();
        return true;
      },
      stop() {
        const swiper = this;
        if (!swiper.autoplay.running) return false;
        if (typeof swiper.autoplay.timeout === 'undefined') return false;

        if (swiper.autoplay.timeout) {
          clearTimeout(swiper.autoplay.timeout);
          swiper.autoplay.timeout = undefined;
        }
        swiper.autoplay.running = false;
        swiper.emit('autoplayStop');
        return true;
      },
      pause(speed) {
        const swiper = this;
        if (!swiper.autoplay.running) return;
        if (swiper.autoplay.paused) return;
        if (swiper.autoplay.timeout) clearTimeout(swiper.autoplay.timeout);
        swiper.autoplay.paused = true;
        if (speed === 0 || !swiper.params.autoplay.waitForTransition) {
          swiper.autoplay.paused = false;
          swiper.autoplay.run();
        } else {
          swiper.$wrapperEl[0].addEventListener('transitionend', swiper.autoplay.onTransitionEnd);
          swiper.$wrapperEl[0].addEventListener('webkitTransitionEnd', swiper.autoplay.onTransitionEnd);
        }
      },
    };

    var Autoplay$1 = {
      name: 'autoplay',
      params: {
        autoplay: {
          enabled: false,
          delay: 3000,
          waitForTransition: true,
          disableOnInteraction: true,
          stopOnLastSlide: false,
          reverseDirection: false,
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          autoplay: {
            running: false,
            paused: false,
            run: Autoplay.run.bind(swiper),
            start: Autoplay.start.bind(swiper),
            stop: Autoplay.stop.bind(swiper),
            pause: Autoplay.pause.bind(swiper),
            onVisibilityChange() {
              if (document.visibilityState === 'hidden' && swiper.autoplay.running) {
                swiper.autoplay.pause();
              }
              if (document.visibilityState === 'visible' && swiper.autoplay.paused) {
                swiper.autoplay.run();
                swiper.autoplay.paused = false;
              }
            },
            onTransitionEnd(e) {
              if (!swiper || swiper.destroyed || !swiper.$wrapperEl) return;
              if (e.target !== this) return;
              swiper.$wrapperEl[0].removeEventListener('transitionend', swiper.autoplay.onTransitionEnd);
              swiper.$wrapperEl[0].removeEventListener('webkitTransitionEnd', swiper.autoplay.onTransitionEnd);
              swiper.autoplay.paused = false;
              if (!swiper.autoplay.running) {
                swiper.autoplay.stop();
              } else {
                swiper.autoplay.run();
              }
            },
          },
        });
      },
      on: {
        init() {
          const swiper = this;
          if (swiper.params.autoplay.enabled) {
            swiper.autoplay.start();
            document.addEventListener('visibilitychange', swiper.autoplay.onVisibilityChange);
          }
        },
        beforeTransitionStart(speed, internal) {
          const swiper = this;
          if (swiper.autoplay.running) {
            if (internal || !swiper.params.autoplay.disableOnInteraction) {
              swiper.autoplay.pause(speed);
            } else {
              swiper.autoplay.stop();
            }
          }
        },
        sliderFirstMove() {
          const swiper = this;
          if (swiper.autoplay.running) {
            if (swiper.params.autoplay.disableOnInteraction) {
              swiper.autoplay.stop();
            } else {
              swiper.autoplay.pause();
            }
          }
        },
        touchEnd() {
          const swiper = this;
          if (swiper.params.cssMode && swiper.autoplay.paused && !swiper.params.autoplay.disableOnInteraction) {
            swiper.autoplay.run();
          }
        },
        destroy() {
          const swiper = this;
          if (swiper.autoplay.running) {
            swiper.autoplay.stop();
          }
          document.removeEventListener('visibilitychange', swiper.autoplay.onVisibilityChange);
        },
      },
    };

    const Fade = {
      setTranslate() {
        const swiper = this;
        const { slides } = swiper;
        for (let i = 0; i < slides.length; i += 1) {
          const $slideEl = swiper.slides.eq(i);
          const offset = $slideEl[0].swiperSlideOffset;
          let tx = -offset;
          if (!swiper.params.virtualTranslate) tx -= swiper.translate;
          let ty = 0;
          if (!swiper.isHorizontal()) {
            ty = tx;
            tx = 0;
          }
          const slideOpacity = swiper.params.fadeEffect.crossFade
            ? Math.max(1 - Math.abs($slideEl[0].progress), 0)
            : 1 + Math.min(Math.max($slideEl[0].progress, -1), 0);
          $slideEl
            .css({
              opacity: slideOpacity,
            })
            .transform(`translate3d(${tx}px, ${ty}px, 0px)`);
        }
      },
      setTransition(duration) {
        const swiper = this;
        const { slides, $wrapperEl } = swiper;
        slides.transition(duration);
        if (swiper.params.virtualTranslate && duration !== 0) {
          let eventTriggered = false;
          slides.transitionEnd(() => {
            if (eventTriggered) return;
            if (!swiper || swiper.destroyed) return;
            eventTriggered = true;
            swiper.animating = false;
            const triggerEvents = ['webkitTransitionEnd', 'transitionend'];
            for (let i = 0; i < triggerEvents.length; i += 1) {
              $wrapperEl.trigger(triggerEvents[i]);
            }
          });
        }
      },
    };

    var EffectFade = {
      name: 'effect-fade',
      params: {
        fadeEffect: {
          crossFade: false,
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          fadeEffect: {
            setTranslate: Fade.setTranslate.bind(swiper),
            setTransition: Fade.setTransition.bind(swiper),
          },
        });
      },
      on: {
        beforeInit() {
          const swiper = this;
          if (swiper.params.effect !== 'fade') return;
          swiper.classNames.push(`${swiper.params.containerModifierClass}fade`);
          const overwriteParams = {
            slidesPerView: 1,
            slidesPerColumn: 1,
            slidesPerGroup: 1,
            watchSlidesProgress: true,
            spaceBetween: 0,
            virtualTranslate: true,
          };
          Utils.extend(swiper.params, overwriteParams);
          Utils.extend(swiper.originalParams, overwriteParams);
        },
        setTranslate() {
          const swiper = this;
          if (swiper.params.effect !== 'fade') return;
          swiper.fadeEffect.setTranslate();
        },
        setTransition(duration) {
          const swiper = this;
          if (swiper.params.effect !== 'fade') return;
          swiper.fadeEffect.setTransition(duration);
        },
      },
    };

    const Cube = {
      setTranslate() {
        const swiper = this;
        const {
          $el, $wrapperEl, slides, width: swiperWidth, height: swiperHeight, rtlTranslate: rtl, size: swiperSize,
        } = swiper;
        const params = swiper.params.cubeEffect;
        const isHorizontal = swiper.isHorizontal();
        const isVirtual = swiper.virtual && swiper.params.virtual.enabled;
        let wrapperRotate = 0;
        let $cubeShadowEl;
        if (params.shadow) {
          if (isHorizontal) {
            $cubeShadowEl = $wrapperEl.find('.swiper-cube-shadow');
            if ($cubeShadowEl.length === 0) {
              $cubeShadowEl = $$1('<div class="swiper-cube-shadow"></div>');
              $wrapperEl.append($cubeShadowEl);
            }
            $cubeShadowEl.css({ height: `${swiperWidth}px` });
          } else {
            $cubeShadowEl = $el.find('.swiper-cube-shadow');
            if ($cubeShadowEl.length === 0) {
              $cubeShadowEl = $$1('<div class="swiper-cube-shadow"></div>');
              $el.append($cubeShadowEl);
            }
          }
        }
        for (let i = 0; i < slides.length; i += 1) {
          const $slideEl = slides.eq(i);
          let slideIndex = i;
          if (isVirtual) {
            slideIndex = parseInt($slideEl.attr('data-swiper-slide-index'), 10);
          }
          let slideAngle = slideIndex * 90;
          let round = Math.floor(slideAngle / 360);
          if (rtl) {
            slideAngle = -slideAngle;
            round = Math.floor(-slideAngle / 360);
          }
          const progress = Math.max(Math.min($slideEl[0].progress, 1), -1);
          let tx = 0;
          let ty = 0;
          let tz = 0;
          if (slideIndex % 4 === 0) {
            tx = -round * 4 * swiperSize;
            tz = 0;
          } else if ((slideIndex - 1) % 4 === 0) {
            tx = 0;
            tz = -round * 4 * swiperSize;
          } else if ((slideIndex - 2) % 4 === 0) {
            tx = swiperSize + (round * 4 * swiperSize);
            tz = swiperSize;
          } else if ((slideIndex - 3) % 4 === 0) {
            tx = -swiperSize;
            tz = (3 * swiperSize) + (swiperSize * 4 * round);
          }
          if (rtl) {
            tx = -tx;
          }

          if (!isHorizontal) {
            ty = tx;
            tx = 0;
          }

          const transform = `rotateX(${isHorizontal ? 0 : -slideAngle}deg) rotateY(${isHorizontal ? slideAngle : 0}deg) translate3d(${tx}px, ${ty}px, ${tz}px)`;
          if (progress <= 1 && progress > -1) {
            wrapperRotate = (slideIndex * 90) + (progress * 90);
            if (rtl) wrapperRotate = (-slideIndex * 90) - (progress * 90);
          }
          $slideEl.transform(transform);
          if (params.slideShadows) {
            // Set shadows
            let shadowBefore = isHorizontal ? $slideEl.find('.swiper-slide-shadow-left') : $slideEl.find('.swiper-slide-shadow-top');
            let shadowAfter = isHorizontal ? $slideEl.find('.swiper-slide-shadow-right') : $slideEl.find('.swiper-slide-shadow-bottom');
            if (shadowBefore.length === 0) {
              shadowBefore = $$1(`<div class="swiper-slide-shadow-${isHorizontal ? 'left' : 'top'}"></div>`);
              $slideEl.append(shadowBefore);
            }
            if (shadowAfter.length === 0) {
              shadowAfter = $$1(`<div class="swiper-slide-shadow-${isHorizontal ? 'right' : 'bottom'}"></div>`);
              $slideEl.append(shadowAfter);
            }
            if (shadowBefore.length) shadowBefore[0].style.opacity = Math.max(-progress, 0);
            if (shadowAfter.length) shadowAfter[0].style.opacity = Math.max(progress, 0);
          }
        }
        $wrapperEl.css({
          '-webkit-transform-origin': `50% 50% -${swiperSize / 2}px`,
          '-moz-transform-origin': `50% 50% -${swiperSize / 2}px`,
          '-ms-transform-origin': `50% 50% -${swiperSize / 2}px`,
          'transform-origin': `50% 50% -${swiperSize / 2}px`,
        });

        if (params.shadow) {
          if (isHorizontal) {
            $cubeShadowEl.transform(`translate3d(0px, ${(swiperWidth / 2) + params.shadowOffset}px, ${-swiperWidth / 2}px) rotateX(90deg) rotateZ(0deg) scale(${params.shadowScale})`);
          } else {
            const shadowAngle = Math.abs(wrapperRotate) - (Math.floor(Math.abs(wrapperRotate) / 90) * 90);
            const multiplier = 1.5 - (
              (Math.sin((shadowAngle * 2 * Math.PI) / 360) / 2)
              + (Math.cos((shadowAngle * 2 * Math.PI) / 360) / 2)
            );
            const scale1 = params.shadowScale;
            const scale2 = params.shadowScale / multiplier;
            const offset = params.shadowOffset;
            $cubeShadowEl.transform(`scale3d(${scale1}, 1, ${scale2}) translate3d(0px, ${(swiperHeight / 2) + offset}px, ${-swiperHeight / 2 / scale2}px) rotateX(-90deg)`);
          }
        }
        const zFactor = (Browser.isSafari || Browser.isUiWebView) ? (-swiperSize / 2) : 0;
        $wrapperEl
          .transform(`translate3d(0px,0,${zFactor}px) rotateX(${swiper.isHorizontal() ? 0 : wrapperRotate}deg) rotateY(${swiper.isHorizontal() ? -wrapperRotate : 0}deg)`);
      },
      setTransition(duration) {
        const swiper = this;
        const { $el, slides } = swiper;
        slides
          .transition(duration)
          .find('.swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left')
          .transition(duration);
        if (swiper.params.cubeEffect.shadow && !swiper.isHorizontal()) {
          $el.find('.swiper-cube-shadow').transition(duration);
        }
      },
    };

    var EffectCube = {
      name: 'effect-cube',
      params: {
        cubeEffect: {
          slideShadows: true,
          shadow: true,
          shadowOffset: 20,
          shadowScale: 0.94,
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          cubeEffect: {
            setTranslate: Cube.setTranslate.bind(swiper),
            setTransition: Cube.setTransition.bind(swiper),
          },
        });
      },
      on: {
        beforeInit() {
          const swiper = this;
          if (swiper.params.effect !== 'cube') return;
          swiper.classNames.push(`${swiper.params.containerModifierClass}cube`);
          swiper.classNames.push(`${swiper.params.containerModifierClass}3d`);
          const overwriteParams = {
            slidesPerView: 1,
            slidesPerColumn: 1,
            slidesPerGroup: 1,
            watchSlidesProgress: true,
            resistanceRatio: 0,
            spaceBetween: 0,
            centeredSlides: false,
            virtualTranslate: true,
          };
          Utils.extend(swiper.params, overwriteParams);
          Utils.extend(swiper.originalParams, overwriteParams);
        },
        setTranslate() {
          const swiper = this;
          if (swiper.params.effect !== 'cube') return;
          swiper.cubeEffect.setTranslate();
        },
        setTransition(duration) {
          const swiper = this;
          if (swiper.params.effect !== 'cube') return;
          swiper.cubeEffect.setTransition(duration);
        },
      },
    };

    const Flip = {
      setTranslate() {
        const swiper = this;
        const { slides, rtlTranslate: rtl } = swiper;
        for (let i = 0; i < slides.length; i += 1) {
          const $slideEl = slides.eq(i);
          let progress = $slideEl[0].progress;
          if (swiper.params.flipEffect.limitRotation) {
            progress = Math.max(Math.min($slideEl[0].progress, 1), -1);
          }
          const offset = $slideEl[0].swiperSlideOffset;
          const rotate = -180 * progress;
          let rotateY = rotate;
          let rotateX = 0;
          let tx = -offset;
          let ty = 0;
          if (!swiper.isHorizontal()) {
            ty = tx;
            tx = 0;
            rotateX = -rotateY;
            rotateY = 0;
          } else if (rtl) {
            rotateY = -rotateY;
          }

          $slideEl[0].style.zIndex = -Math.abs(Math.round(progress)) + slides.length;

          if (swiper.params.flipEffect.slideShadows) {
            // Set shadows
            let shadowBefore = swiper.isHorizontal() ? $slideEl.find('.swiper-slide-shadow-left') : $slideEl.find('.swiper-slide-shadow-top');
            let shadowAfter = swiper.isHorizontal() ? $slideEl.find('.swiper-slide-shadow-right') : $slideEl.find('.swiper-slide-shadow-bottom');
            if (shadowBefore.length === 0) {
              shadowBefore = $$1(`<div class="swiper-slide-shadow-${swiper.isHorizontal() ? 'left' : 'top'}"></div>`);
              $slideEl.append(shadowBefore);
            }
            if (shadowAfter.length === 0) {
              shadowAfter = $$1(`<div class="swiper-slide-shadow-${swiper.isHorizontal() ? 'right' : 'bottom'}"></div>`);
              $slideEl.append(shadowAfter);
            }
            if (shadowBefore.length) shadowBefore[0].style.opacity = Math.max(-progress, 0);
            if (shadowAfter.length) shadowAfter[0].style.opacity = Math.max(progress, 0);
          }
          $slideEl
            .transform(`translate3d(${tx}px, ${ty}px, 0px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
        }
      },
      setTransition(duration) {
        const swiper = this;
        const { slides, activeIndex, $wrapperEl } = swiper;
        slides
          .transition(duration)
          .find('.swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left')
          .transition(duration);
        if (swiper.params.virtualTranslate && duration !== 0) {
          let eventTriggered = false;
          // eslint-disable-next-line
          slides.eq(activeIndex).transitionEnd(function onTransitionEnd() {
            if (eventTriggered) return;
            if (!swiper || swiper.destroyed) return;
            // if (!$(this).hasClass(swiper.params.slideActiveClass)) return;
            eventTriggered = true;
            swiper.animating = false;
            const triggerEvents = ['webkitTransitionEnd', 'transitionend'];
            for (let i = 0; i < triggerEvents.length; i += 1) {
              $wrapperEl.trigger(triggerEvents[i]);
            }
          });
        }
      },
    };

    var EffectFlip = {
      name: 'effect-flip',
      params: {
        flipEffect: {
          slideShadows: true,
          limitRotation: true,
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          flipEffect: {
            setTranslate: Flip.setTranslate.bind(swiper),
            setTransition: Flip.setTransition.bind(swiper),
          },
        });
      },
      on: {
        beforeInit() {
          const swiper = this;
          if (swiper.params.effect !== 'flip') return;
          swiper.classNames.push(`${swiper.params.containerModifierClass}flip`);
          swiper.classNames.push(`${swiper.params.containerModifierClass}3d`);
          const overwriteParams = {
            slidesPerView: 1,
            slidesPerColumn: 1,
            slidesPerGroup: 1,
            watchSlidesProgress: true,
            spaceBetween: 0,
            virtualTranslate: true,
          };
          Utils.extend(swiper.params, overwriteParams);
          Utils.extend(swiper.originalParams, overwriteParams);
        },
        setTranslate() {
          const swiper = this;
          if (swiper.params.effect !== 'flip') return;
          swiper.flipEffect.setTranslate();
        },
        setTransition(duration) {
          const swiper = this;
          if (swiper.params.effect !== 'flip') return;
          swiper.flipEffect.setTransition(duration);
        },
      },
    };

    const Coverflow = {
      setTranslate() {
        const swiper = this;
        const {
          width: swiperWidth, height: swiperHeight, slides, $wrapperEl, slidesSizesGrid,
        } = swiper;
        const params = swiper.params.coverflowEffect;
        const isHorizontal = swiper.isHorizontal();
        const transform = swiper.translate;
        const center = isHorizontal ? -transform + (swiperWidth / 2) : -transform + (swiperHeight / 2);
        const rotate = isHorizontal ? params.rotate : -params.rotate;
        const translate = params.depth;
        // Each slide offset from center
        for (let i = 0, length = slides.length; i < length; i += 1) {
          const $slideEl = slides.eq(i);
          const slideSize = slidesSizesGrid[i];
          const slideOffset = $slideEl[0].swiperSlideOffset;
          const offsetMultiplier = ((center - slideOffset - (slideSize / 2)) / slideSize) * params.modifier;

          let rotateY = isHorizontal ? rotate * offsetMultiplier : 0;
          let rotateX = isHorizontal ? 0 : rotate * offsetMultiplier;
          // var rotateZ = 0
          let translateZ = -translate * Math.abs(offsetMultiplier);

          let translateY = isHorizontal ? 0 : params.stretch * (offsetMultiplier);
          let translateX = isHorizontal ? params.stretch * (offsetMultiplier) : 0;

          // Fix for ultra small values
          if (Math.abs(translateX) < 0.001) translateX = 0;
          if (Math.abs(translateY) < 0.001) translateY = 0;
          if (Math.abs(translateZ) < 0.001) translateZ = 0;
          if (Math.abs(rotateY) < 0.001) rotateY = 0;
          if (Math.abs(rotateX) < 0.001) rotateX = 0;

          const slideTransform = `translate3d(${translateX}px,${translateY}px,${translateZ}px)  rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

          $slideEl.transform(slideTransform);
          $slideEl[0].style.zIndex = -Math.abs(Math.round(offsetMultiplier)) + 1;
          if (params.slideShadows) {
            // Set shadows
            let $shadowBeforeEl = isHorizontal ? $slideEl.find('.swiper-slide-shadow-left') : $slideEl.find('.swiper-slide-shadow-top');
            let $shadowAfterEl = isHorizontal ? $slideEl.find('.swiper-slide-shadow-right') : $slideEl.find('.swiper-slide-shadow-bottom');
            if ($shadowBeforeEl.length === 0) {
              $shadowBeforeEl = $$1(`<div class="swiper-slide-shadow-${isHorizontal ? 'left' : 'top'}"></div>`);
              $slideEl.append($shadowBeforeEl);
            }
            if ($shadowAfterEl.length === 0) {
              $shadowAfterEl = $$1(`<div class="swiper-slide-shadow-${isHorizontal ? 'right' : 'bottom'}"></div>`);
              $slideEl.append($shadowAfterEl);
            }
            if ($shadowBeforeEl.length) $shadowBeforeEl[0].style.opacity = offsetMultiplier > 0 ? offsetMultiplier : 0;
            if ($shadowAfterEl.length) $shadowAfterEl[0].style.opacity = (-offsetMultiplier) > 0 ? -offsetMultiplier : 0;
          }
        }

        // Set correct perspective for IE10
        if (Support.pointerEvents || Support.prefixedPointerEvents) {
          const ws = $wrapperEl[0].style;
          ws.perspectiveOrigin = `${center}px 50%`;
        }
      },
      setTransition(duration) {
        const swiper = this;
        swiper.slides
          .transition(duration)
          .find('.swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left')
          .transition(duration);
      },
    };

    var EffectCoverflow = {
      name: 'effect-coverflow',
      params: {
        coverflowEffect: {
          rotate: 50,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: true,
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          coverflowEffect: {
            setTranslate: Coverflow.setTranslate.bind(swiper),
            setTransition: Coverflow.setTransition.bind(swiper),
          },
        });
      },
      on: {
        beforeInit() {
          const swiper = this;
          if (swiper.params.effect !== 'coverflow') return;

          swiper.classNames.push(`${swiper.params.containerModifierClass}coverflow`);
          swiper.classNames.push(`${swiper.params.containerModifierClass}3d`);

          swiper.params.watchSlidesProgress = true;
          swiper.originalParams.watchSlidesProgress = true;
        },
        setTranslate() {
          const swiper = this;
          if (swiper.params.effect !== 'coverflow') return;
          swiper.coverflowEffect.setTranslate();
        },
        setTransition(duration) {
          const swiper = this;
          if (swiper.params.effect !== 'coverflow') return;
          swiper.coverflowEffect.setTransition(duration);
        },
      },
    };

    const Thumbs = {
      init() {
        const swiper = this;
        const { thumbs: thumbsParams } = swiper.params;
        const SwiperClass = swiper.constructor;
        if (thumbsParams.swiper instanceof SwiperClass) {
          swiper.thumbs.swiper = thumbsParams.swiper;
          Utils.extend(swiper.thumbs.swiper.originalParams, {
            watchSlidesProgress: true,
            slideToClickedSlide: false,
          });
          Utils.extend(swiper.thumbs.swiper.params, {
            watchSlidesProgress: true,
            slideToClickedSlide: false,
          });
        } else if (Utils.isObject(thumbsParams.swiper)) {
          swiper.thumbs.swiper = new SwiperClass(Utils.extend({}, thumbsParams.swiper, {
            watchSlidesVisibility: true,
            watchSlidesProgress: true,
            slideToClickedSlide: false,
          }));
          swiper.thumbs.swiperCreated = true;
        }
        swiper.thumbs.swiper.$el.addClass(swiper.params.thumbs.thumbsContainerClass);
        swiper.thumbs.swiper.on('tap', swiper.thumbs.onThumbClick);
      },
      onThumbClick() {
        const swiper = this;
        const thumbsSwiper = swiper.thumbs.swiper;
        if (!thumbsSwiper) return;
        const clickedIndex = thumbsSwiper.clickedIndex;
        const clickedSlide = thumbsSwiper.clickedSlide;
        if (clickedSlide && $$1(clickedSlide).hasClass(swiper.params.thumbs.slideThumbActiveClass)) return;
        if (typeof clickedIndex === 'undefined' || clickedIndex === null) return;
        let slideToIndex;
        if (thumbsSwiper.params.loop) {
          slideToIndex = parseInt($$1(thumbsSwiper.clickedSlide).attr('data-swiper-slide-index'), 10);
        } else {
          slideToIndex = clickedIndex;
        }
        if (swiper.params.loop) {
          let currentIndex = swiper.activeIndex;
          if (swiper.slides.eq(currentIndex).hasClass(swiper.params.slideDuplicateClass)) {
            swiper.loopFix();
            // eslint-disable-next-line
            swiper._clientLeft = swiper.$wrapperEl[0].clientLeft;
            currentIndex = swiper.activeIndex;
          }
          const prevIndex = swiper.slides.eq(currentIndex).prevAll(`[data-swiper-slide-index="${slideToIndex}"]`).eq(0).index();
          const nextIndex = swiper.slides.eq(currentIndex).nextAll(`[data-swiper-slide-index="${slideToIndex}"]`).eq(0).index();
          if (typeof prevIndex === 'undefined') slideToIndex = nextIndex;
          else if (typeof nextIndex === 'undefined') slideToIndex = prevIndex;
          else if (nextIndex - currentIndex < currentIndex - prevIndex) slideToIndex = nextIndex;
          else slideToIndex = prevIndex;
        }
        swiper.slideTo(slideToIndex);
      },
      update(initial) {
        const swiper = this;
        const thumbsSwiper = swiper.thumbs.swiper;
        if (!thumbsSwiper) return;

        const slidesPerView = thumbsSwiper.params.slidesPerView === 'auto'
          ? thumbsSwiper.slidesPerViewDynamic()
          : thumbsSwiper.params.slidesPerView;

        if (swiper.realIndex !== thumbsSwiper.realIndex) {
          let currentThumbsIndex = thumbsSwiper.activeIndex;
          let newThumbsIndex;
          if (thumbsSwiper.params.loop) {
            if (thumbsSwiper.slides.eq(currentThumbsIndex).hasClass(thumbsSwiper.params.slideDuplicateClass)) {
              thumbsSwiper.loopFix();
              // eslint-disable-next-line
              thumbsSwiper._clientLeft = thumbsSwiper.$wrapperEl[0].clientLeft;
              currentThumbsIndex = thumbsSwiper.activeIndex;
            }
            // Find actual thumbs index to slide to
            const prevThumbsIndex = thumbsSwiper.slides.eq(currentThumbsIndex).prevAll(`[data-swiper-slide-index="${swiper.realIndex}"]`).eq(0).index();
            const nextThumbsIndex = thumbsSwiper.slides.eq(currentThumbsIndex).nextAll(`[data-swiper-slide-index="${swiper.realIndex}"]`).eq(0).index();
            if (typeof prevThumbsIndex === 'undefined') newThumbsIndex = nextThumbsIndex;
            else if (typeof nextThumbsIndex === 'undefined') newThumbsIndex = prevThumbsIndex;
            else if (nextThumbsIndex - currentThumbsIndex === currentThumbsIndex - prevThumbsIndex) newThumbsIndex = currentThumbsIndex;
            else if (nextThumbsIndex - currentThumbsIndex < currentThumbsIndex - prevThumbsIndex) newThumbsIndex = nextThumbsIndex;
            else newThumbsIndex = prevThumbsIndex;
          } else {
            newThumbsIndex = swiper.realIndex;
          }
          if (thumbsSwiper.visibleSlidesIndexes && thumbsSwiper.visibleSlidesIndexes.indexOf(newThumbsIndex) < 0) {
            if (thumbsSwiper.params.centeredSlides) {
              if (newThumbsIndex > currentThumbsIndex) {
                newThumbsIndex = newThumbsIndex - Math.floor(slidesPerView / 2) + 1;
              } else {
                newThumbsIndex = newThumbsIndex + Math.floor(slidesPerView / 2) - 1;
              }
            } else if (newThumbsIndex > currentThumbsIndex) {
              newThumbsIndex = newThumbsIndex - slidesPerView + 1;
            }
            thumbsSwiper.slideTo(newThumbsIndex, initial ? 0 : undefined);
          }
        }

        // Activate thumbs
        let thumbsToActivate = 1;
        const thumbActiveClass = swiper.params.thumbs.slideThumbActiveClass;

        if (swiper.params.slidesPerView > 1 && !swiper.params.centeredSlides) {
          thumbsToActivate = swiper.params.slidesPerView;
        }

        if (!swiper.params.thumbs.multipleActiveThumbs) {
          thumbsToActivate = 1;
        }

        thumbsToActivate = Math.floor(thumbsToActivate);

        thumbsSwiper.slides.removeClass(thumbActiveClass);
        if (thumbsSwiper.params.loop || (thumbsSwiper.params.virtual && thumbsSwiper.params.virtual.enabled)) {
          for (let i = 0; i < thumbsToActivate; i += 1) {
            thumbsSwiper.$wrapperEl.children(`[data-swiper-slide-index="${swiper.realIndex + i}"]`).addClass(thumbActiveClass);
          }
        } else {
          for (let i = 0; i < thumbsToActivate; i += 1) {
            thumbsSwiper.slides.eq(swiper.realIndex + i).addClass(thumbActiveClass);
          }
        }
      },
    };
    var Thumbs$1 = {
      name: 'thumbs',
      params: {
        thumbs: {
          multipleActiveThumbs: true,
          swiper: null,
          slideThumbActiveClass: 'swiper-slide-thumb-active',
          thumbsContainerClass: 'swiper-container-thumbs',
        },
      },
      create() {
        const swiper = this;
        Utils.extend(swiper, {
          thumbs: {
            swiper: null,
            init: Thumbs.init.bind(swiper),
            update: Thumbs.update.bind(swiper),
            onThumbClick: Thumbs.onThumbClick.bind(swiper),
          },
        });
      },
      on: {
        beforeInit() {
          const swiper = this;
          const { thumbs } = swiper.params;
          if (!thumbs || !thumbs.swiper) return;
          swiper.thumbs.init();
          swiper.thumbs.update(true);
        },
        slideChange() {
          const swiper = this;
          if (!swiper.thumbs.swiper) return;
          swiper.thumbs.update();
        },
        update() {
          const swiper = this;
          if (!swiper.thumbs.swiper) return;
          swiper.thumbs.update();
        },
        resize() {
          const swiper = this;
          if (!swiper.thumbs.swiper) return;
          swiper.thumbs.update();
        },
        observerUpdate() {
          const swiper = this;
          if (!swiper.thumbs.swiper) return;
          swiper.thumbs.update();
        },
        setTransition(duration) {
          const swiper = this;
          const thumbsSwiper = swiper.thumbs.swiper;
          if (!thumbsSwiper) return;
          thumbsSwiper.setTransition(duration);
        },
        beforeDestroy() {
          const swiper = this;
          const thumbsSwiper = swiper.thumbs.swiper;
          if (!thumbsSwiper) return;
          if (swiper.thumbs.swiperCreated && thumbsSwiper) {
            thumbsSwiper.destroy();
          }
        },
      },
    };

    // Swiper Class

    const components = [
      Device$1,
      Support$1,
      Browser$1,
      Resize,
      Observer$1,
      Virtual$1,
      Keyboard$1,
      Mousewheel$1,
      Navigation$1,
      Pagination$1,
      Scrollbar$1,
      Parallax$1,
      Zoom$1,
      Lazy$1,
      Controller$1,
      A11y,
      History$1,
      HashNavigation$1,
      Autoplay$1,
      EffectFade,
      EffectCube,
      EffectFlip,
      EffectCoverflow,
      Thumbs$1
    ];

    if (typeof Swiper.use === 'undefined') {
      Swiper.use = Swiper.Class.use;
      Swiper.installModule = Swiper.Class.installModule;
    }

    Swiper.use(components);

    var gallery = (function () {
      var slides = document.querySelectorAll('.js-categories-slide-with-gallery');

      if (slides.length) {
        slides.forEach(function (slide, index) {
          var thumbs = slide.querySelector('.gallery-thumbs');
          thumbs.classList.add("gallery-thumbs-".concat(index));
          var top = slide.querySelector('.gallery-top');
          top.classList.add("gallery-top-".concat(index));
          var galleryThumbs = new Swiper(".gallery-thumbs-".concat(index), {
            spaceBetween: 10,
            slidesPerView: 4,
            freeMode: true,
            // watchSlidesVisibility: true,
            watchSlidesProgress: true
          });
          var galleryTop = new Swiper(".gallery-top-".concat(index), {
            spaceBetween: 10,
            navigation: {
              nextEl: '.swiper-button-next',
              prevEl: '.swiper-button-prev'
            },
            thumbs: {
              swiper: galleryThumbs
            }
          });
        });
      }
    });

    openCloseMenu();
    sectionSlider();
    scenes();
    categoriesSlider();
    lazyLoadImages();
    showMore();
    modal();
    customSelect();
    gallery();

})));
