/* global localStorage, document */


// thanks: https://stackoverflow.com/a/2880929
var urlParams;
(window.onpopstate = function () {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);
})();

function outstore( name, defaultObject, options ) {
    
    var data = localStorage.getItem( name );
    if ( !data ) {
        
        localStorage.setItem( name, JSON.stringify( defaultObject ) );
        data = localStorage.getItem( name );
        
    }
    var ret = JSON.parse( data );
    var items = [].concat( ret || [] );
    ( ( options || {} ).dates || [] ).forEach( key => items.forEach( item => {
        
        try {
    
            item[ key ] = new Date( item[ key ] );
            
        } catch( ex ) {
        
            console.error( key, ex );
        
        }
        
    } ) );
    ret._key_ = name;
    if ( options ) ret._options_ = JSON.parse( JSON.stringify( options ) );
    return ret;
    
}

function instore( obj, name, options ) {
    
    name = name || obj._key_;
    options = options || obj._options_ || {};
    if( !name ) throw new Error( "No key specified" );
    var dates = options.dates || [];
    
    var copy = JSON.parse( JSON.stringify( obj ) );
    delete copy._key_;
    delete copy._options_;

    var items = [].concat( copy || [] );
    
    dates.forEach( key => items.forEach( item => {
        
        try {
            
            item[ key ] = Object.assign( {}, item, { [ key ]: item[ key ].getTime() } );
            
        } catch( ex ) {
            
            console.error( key, ex );
            
        }
        
    } ) );
    localStorage.setItem( name, JSON.stringify( copy ) );
    
}

function sortBy( array, field ) {
    
    return array.sort( ( a, b ) => a[ field ] > b[ field ] ? 1 : a[ field ] < b[ field ] ? -1 : 0 );
    
}


var defaultTeams = [ { name: "Whirlybird", img: "whirlybird.png" }, { name: "Falcon", img: "falcon.png" } ];
var teams = sortBy(
    
    outstore( "teams", defaultTeams ),
    "name"
    
);
var team = ( teams.find( x => x.name === urlParams.team ) || {} );
var members = null;
var scores = null;
var menuItems = null;
var chosenMenuItem = null;
var login = localStorage.getItem( "login" );
var loginProvider = localStorage.getItem( "login-provider" );
var storage = localStorage.getItem( "storage" );
var storageProvider = 
    storage === "local" ? "Browser" : 
    storage === "google" ? "Google Drive" :
    "None (browser)";
    
if ( team ) {
    
    var defaultMembers = [ { name: "Andrew" }, { name: "Gareth" }, { name: "Bob" }, { name: "Niämh" } ];
    members = sortBy( 
        
        outstore( "existing-team-members-" + team.name, defaultMembers ),
        urlParams[ "team-members-sort" ] || "name"
        
    );
    var defaultScores = [ { id: "2293162928136060324", when: 1513944691100, what: "Inventing trockermetrics.com", who: members[ 0 ].name, points: 10, description: "In pharetra porta urna at sodales. Interdum et malesuada fames ac ante ipsum primis in faucibus. Donec viverra ultrices mauris et vehicula. Maecenas ut ornare nunc. Vestibulum finibus accumsan tincidunt. Curabitur fringilla diam in mi congue condimentum. Fusce sem ante, molestie sed massa nec, gravida lacinia ante. Suspendisse quis nisl lobortis, posuere diam et, dapibus massa. Vivamus eros risus, condimentum at tristique in, sollicitudin et felis. Praesent vitae venenatis quam." } ];
    scores = sortBy(
        
        outstore( "existing-scores-" + team.name, defaultScores, { dates: [ "when" ] } ),
        urlParams[ "score-sort" ] || "when"
        
    );
    var defaultMenuItems = [ { id: "91827349182374234", what: "Being rude", points: 5, criteria: "Be rude to someone who deserves it. Team gets to vote on whether the rudeness was really deserved." } ];
    menuItems = sortBy(
        
        outstore( "menu-items-" + team.name, defaultMenuItems ),
        "what"
    
    );
    chosenMenuItem = menuItems.find( x => x.id == urlParams[ "chosen-menu-item" ] ) || null;
    
}
( function() {
    
    String.prototype.untemplate = function( name, value ) {
        
        var pattern = new RegExp( "\{" + name + "\}", "g" );
        return this.replace( pattern, value );
        
    };
    String.prototype.untemplateAttributes = function() {

        return this.replace( /(\s)template_([^\s]*)/g, "$1$2" );        
        
    };
    
    ( function addExistingTeamMemberOptions() {
    
        var existingMemberSelect = document.querySelectorAll( ".existing-member-select" );
        for( var select of existingMemberSelect ) {
            
            var options = members.map( function( member ) { return Object.assign( document.createElement( "OPTION" ), { value: member.name, text: member.name } ); } );
            for( var option of options ) {
                
                select.appendChild( option );
                
            }
            
        }
        
    }() );
    
    function pretty( value ) {
        
        if ( value instanceof Date ) return value.toISOString().substr( 0, 10 );
        if ( typeof value === "undefined" ) return "";
        return value;
        
    }
    
    function populateExisting( thingName, data ) {
        
        var listContainer = document.querySelector( "." + thingName + "s .existing" );
        var itemContainer = document.querySelector( "." + thingName + " .existing" );
        var template = document.querySelector( "#" + thingName + "-template" );
        var items = [].concat( data || [] );
        var item = items.find( x => x.id === urlParams.id );
        var dataMap = {};
        items.forEach( item => Object.keys( item ).forEach( key => {
                
            if ( !( key in dataMap ) ) dataMap[ key ] = new RegExp( "\{" + key + "\}", "g" );
                
        } ) );
        if ( listContainer && template && items.length ) {
            
            var htmls = data
                .map( dataItem => Object.keys( dataMap )
                    .reduce( ( html, key ) => 
                        html.replace( dataMap[ key ], pretty( dataItem[ key ] ) ),
                        template.innerHTML
                    )
                );
            var html = htmls.shift();
            var parser = document.createElement( "template" );
            while( html ) {
                
                parser.innerHTML = html;
                var node = document.importNode( parser.content, true );
                listContainer.appendChild( node );
                html = htmls.shift();
                
            }
            
        }
        if ( itemContainer && item ) {
            
            itemContainer.innerHTML = Object.keys( dataMap )
                .reduce( ( html, key ) =>
                    html.replace( dataMap[ key ], pretty( item[ key ] ) ),
                    itemContainer.innerHTML
                );
            
        }
        
    }
    populateExisting( "team-member", members );
    populateExisting( "score", scores );
    populateExisting( "team", teams );
    populateExisting( "menu-item", menuItems );
    
    document.body.innerHTML = document.body.innerHTML
        .untemplate( "team", team ? team.name : "?" )
        .untemplate( "team-img", team ? team.img : "?" )
        .untemplate( "now", ( new Date() ).toISOString().substr( 0, 10 ) )
        .untemplate( "chosen-what", chosenMenuItem ? chosenMenuItem.what : "" )
        .untemplate( "chosen-points", chosenMenuItem ? chosenMenuItem.points : "" )
        .untemplate( "login", login || "?" )
        .untemplate( "loginProvider", loginProvider || "-" )
        .untemplate( "storage", storage || "?" )
        .untemplate( "storageProvider", storageProvider || "-" )
        .untemplateAttributes();

    document.title = document.title.untemplate( "team", team ? team.name : "?" );
    
    ( function updateSelectLists() {

        Array.from( document.querySelectorAll( "[data-select-value]" ) ).forEach( select => {
            
            var selectValue = select.dataset.selectValue;
            select.value = selectValue;

        } );
        
    } () );

    function invoke( host ) {
        
        var behaviour = host && host.dataset.behaviour;
        if ( !behaviour ) { return false; }
        var content = host.querySelector( ".content" ) || host;
        switch( behaviour ) {
            
            case "if-not-logged-in":
                return !localStorage.login;

            default:
                content.innerHTML = "Unrecognised behaviour: " + behaviour; 
                return true;
                
        }
        
    }
    
    function polyfilledDialog( dialog ) {
        
        try {
            
            dialogPolyfill.registerDialog( dialog );
            
        } catch( ex ) {
            
            console.error( ex );
            
        }
        return dialog;
        
    }

    var toRemove = Array.from( document.querySelectorAll( "[data-conditional]" ) )
        .filter( c => !eval( c.dataset.conditional ) );
        
    while( toRemove.length ) { 
    
        var x = toRemove.pop();
        x.parentElement.removeChild( x );
        
    }
    
    Array.from( document.querySelectorAll( "input[type=radio]" ) )
        .forEach( radio => {
            
            var checkedCondition = radio.getAttribute( "checked" );
            if ( typeof checkedCondition === "boolean" ) return;
            if ( !checkedCondition ) return;
            try { radio.checked = eval( checkedCondition ); } catch( ex ) { console.error( ex ); }
            
        } );
    document.body.classList.add( "show" );
    Array.from( document.querySelectorAll( ".modaller" ) )
        .filter( modaller => invoke( modaller ) )
        .map( polyfilledDialog )
        .forEach( modaller => modaller.showModal() );
    Array.from( document.querySelectorAll( ".non-modaller" ) )
        .filter( nm => invoke( nm ) )
        .map( polyfilledDialog )
        .forEach( nm => nm.show() );

            
    
}() );

function endialog( selector ) {
    
    const dialog = document.querySelector( selector );
    if ( !dialog ) return;
    dialogPolyfill.registerDialog( dialog );
    dialog.showModal();
    
}

function closeDialog( source ) {
    
    while( source.tagName !== "DIALOG" && source.parentElement ) source = source.parentElement;
    if ( source.tagName !== "DIALOG" ) return;
    source.close();
    
}