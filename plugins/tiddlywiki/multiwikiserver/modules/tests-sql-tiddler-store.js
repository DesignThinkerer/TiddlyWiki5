/*\
title: tests-sql-tiddler-store.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests the SQL tiddler store

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

if($tw.node) {

describe("SQL tiddler store", function() {
	// Create and initialise the tiddler store
	var SqlTiddlerStore = require("$:/plugins/tiddlywiki/multiwikiserver/sql-tiddler-store.js").SqlTiddlerStore;
	const sqlTiddlerStore = new SqlTiddlerStore({
		adminWiki: new $tw.Wiki()
	});
	sqlTiddlerStore.createTables();
	// Create bags and recipes
	sqlTiddlerStore.createBag("bag-alpha");
	sqlTiddlerStore.createBag("bag-beta");
	sqlTiddlerStore.createBag("bag-gamma");
	sqlTiddlerStore.createRecipe("recipe-rho",["bag-alpha","bag-beta"]);
	sqlTiddlerStore.createRecipe("recipe-sigma",["bag-alpha","bag-gamma"]);
	sqlTiddlerStore.createRecipe("recipe-tau",["bag-alpha"]);
	sqlTiddlerStore.createRecipe("recipe-upsilon",["bag-alpha","bag-gamma","bag-beta"]);
	// Tear down
	afterAll(function() {
		// Close the database
		sqlTiddlerStore.close();
	});
	// Run tests
	it("should save and retrieve tiddlers", function() {
		// Save tiddlers
		sqlTiddlerStore.saveBagTiddler({title: "Another Tiddler",text: "I'm in alpha",tags: "one two three"},"bag-alpha");
		sqlTiddlerStore.saveBagTiddler({title: "Hello There",text: "I'm in alpha as well",tags: "one two three"},"bag-alpha");
		sqlTiddlerStore.saveBagTiddler({title: "Hello There",text: "I'm in beta",tags: "four five six"},"bag-beta");
		sqlTiddlerStore.saveBagTiddler({title: "Hello There",text: "I'm in gamma",tags: "seven eight nine"},"bag-gamma");
		// Verify what we've got
		expect(sqlTiddlerStore.getRecipeTiddlers("recipe-rho")).toEqual([ 
			{ title: 'Another Tiddler', bag_name: 'bag-alpha' },
			{ title: 'Hello There', bag_name: 'bag-beta' }
		]);
		expect(sqlTiddlerStore.getRecipeTiddlers("recipe-sigma")).toEqual([
			{ title: 'Another Tiddler', bag_name: 'bag-alpha' },
    		{ title: 'Hello There', bag_name: 'bag-gamma' }
		]);
		expect(sqlTiddlerStore.getRecipeTiddler("Hello There","recipe-rho").tiddler).toEqual({ title: "Hello There", text: "I'm in beta", tags: "four five six" });
		expect(sqlTiddlerStore.getRecipeTiddler("Missing Tiddler","recipe-rho")).toEqual(null);
		expect(sqlTiddlerStore.getRecipeTiddler("Another Tiddler","recipe-rho").tiddler).toEqual({ title: "Another Tiddler", text: "I'm in alpha", tags: "one two three" });
		expect(sqlTiddlerStore.getRecipeTiddler("Hello There","recipe-sigma").tiddler).toEqual({ title: "Hello There", text: "I'm in gamma", tags: "seven eight nine" });
		expect(sqlTiddlerStore.getRecipeTiddler("Another Tiddler","recipe-sigma").tiddler).toEqual({ title: "Another Tiddler", text: "I'm in alpha", tags: "one two three" });
		expect(sqlTiddlerStore.getRecipeTiddler("Hello There","recipe-upsilon").tiddler).toEqual({title: "Hello There",text: "I'm in beta",tags: "four five six"});
		// Delete a tiddlers to ensure the underlying tiddler in the recipe shows through
		sqlTiddlerStore.deleteTiddler("Hello There","bag-beta");
		expect(sqlTiddlerStore.getRecipeTiddlers("recipe-rho")).toEqual([
			{ title: 'Another Tiddler', bag_name: 'bag-alpha' },
    		{ title: 'Hello There', bag_name: 'bag-alpha' }
		]);
		expect(sqlTiddlerStore.getRecipeTiddlers("recipe-sigma")).toEqual([ 
			{ title: 'Another Tiddler', bag_name: 'bag-alpha' },
			{ title: 'Hello There', bag_name: 'bag-gamma' }
		]);
		expect(sqlTiddlerStore.getRecipeTiddler("Hello There","recipe-beta")).toEqual(null);
		sqlTiddlerStore.deleteTiddler("Another Tiddler","bag-alpha");
		expect(sqlTiddlerStore.getRecipeTiddlers("recipe-rho")).toEqual([ { title: 'Hello There', bag_name: 'bag-alpha' } ]);
		expect(sqlTiddlerStore.getRecipeTiddlers("recipe-sigma")).toEqual([ { title: 'Hello There', bag_name: 'bag-gamma' } ]);
		// Save a recipe tiddler
		expect(sqlTiddlerStore.saveRecipeTiddler({title: "More", text: "None"},"recipe-rho")).toEqual({tiddler_id: 5, bag_name: 'bag-beta'});
		expect(sqlTiddlerStore.getRecipeTiddler("More","recipe-rho").tiddler).toEqual({title: "More", text: "None"});
		
	});
});

}

})();
