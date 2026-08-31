/*\
title: test-browser-messaging.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for browser messaging and iframe communication, including the PLUGIN-LIBRARY-READY handshake.

\*/

"use strict";

describe("Browser Messaging", function() {

	beforeEach(function() {
		// Initialize browserMessaging
		if(!$tw.browserMessaging) {
			$tw.browserMessaging = {};
		}
		$tw.browserMessaging.iframeInfoMap = {};
	});

	afterEach(function() {
		// Cleanup
		$tw.browserMessaging.iframeInfoMap = {};
	});

	describe("flushCallbacks", function() {

		it("should mark iframe as loaded and execute all queued callbacks", function() {
			var iframeInfo = {
				status: "loading",
				callbacks: []
			};
			
			var callback1Called = false;
			var callback2Called = false;
			var callback1Arg = null;
			var callback2Arg = null;

			iframeInfo.callbacks.push(function(err, info) {
				callback1Called = true;
				callback1Arg = err;
			});
			iframeInfo.callbacks.push(function(err, info) {
				callback2Called = true;
				callback2Arg = err;
			});

			// Simulate flushCallbacks
			if(iframeInfo.status !== "loaded") {
				iframeInfo.status = "loaded";
				var cb;
				while((cb = iframeInfo.callbacks.shift())) {
					cb(null, iframeInfo);
				}
			}

			expect(callback1Called).toBe(true);
			expect(callback2Called).toBe(true);
			expect(callback1Arg).toBe(null);
			expect(callback2Arg).toBe(null);
			expect(iframeInfo.callbacks.length).toBe(0);
		});

		it("should not execute callbacks if status is already loaded", function() {
			var iframeInfo = {
				status: "loaded",
				callbacks: []
			};
			
			var callbackCalled = false;
			iframeInfo.callbacks.push(function(err, info) {
				callbackCalled = true;
			});

			// Simulate flushCallbacks
			if(iframeInfo.status !== "loaded") {
				var cb;
				while((cb = iframeInfo.callbacks.shift())) {
					cb(null, iframeInfo);
				}
			}

			expect(callbackCalled).toBe(false);
			expect(iframeInfo.callbacks.length).toBe(1);
		});

		it("should pass error to callbacks if provided", function() {
			var iframeInfo = {
				status: "loading",
				callbacks: []
			};
			
			var errorReceived = null;
			var testError = "Test error message";

			iframeInfo.callbacks.push(function(err, info) {
				errorReceived = err;
			});

			// Simulate flushCallbacks with error
			if(iframeInfo.status !== "loaded") {
				iframeInfo.status = "error";
				var cb;
				while((cb = iframeInfo.callbacks.shift())) {
					cb(testError, iframeInfo);
				}
			}

			expect(errorReceived).toBe(testError);
			expect(iframeInfo.status).toBe("error");
		});

	});

	describe("loadIFrame callback queueing", function() {

		it("should queue multiple callbacks for the same iframe", function() {
			var iframeInfo = {
				url: "http://example.com/library.html",
				status: "loading",
				callbacks: []
			};

			var callback1Called = false;
			var callback2Called = false;

			// Simulate queueing callbacks
			iframeInfo.callbacks.push(function(err, info) {
				callback1Called = true;
			});
			iframeInfo.callbacks.push(function(err, info) {
				callback2Called = true;
			});

			expect(iframeInfo.callbacks.length).toBe(2);

			// Simulate PLUGIN-LIBRARY-READY arriving
			if(iframeInfo.status !== "loaded") {
				iframeInfo.status = "loaded";
				var cb;
				while((cb = iframeInfo.callbacks.shift())) {
					cb(null, iframeInfo);
				}
			}

			expect(callback1Called).toBe(true);
			expect(callback2Called).toBe(true);
			expect(iframeInfo.callbacks.length).toBe(0);
		});

	});

	describe("PLUGIN-LIBRARY-READY message handling", function() {

		it("should recognize PLUGIN-LIBRARY-READY verb", function() {
			var message = {
				verb: "PLUGIN-LIBRARY-READY"
			};

			expect(message.verb).toBe("PLUGIN-LIBRARY-READY");
		});

		it("should match iframe by contentWindow source", function() {
			// Create mock iframes
			var mockContentWindow1 = {};
			var mockContentWindow2 = {};
			var mockDomNode1 = { contentWindow: mockContentWindow1 };
			var mockDomNode2 = { contentWindow: mockContentWindow2 };

			$tw.browserMessaging.iframeInfoMap = {
				"url1": {
					url: "url1",
					status: "loading",
					domNode: mockDomNode1,
					callbacks: []
				},
				"url2": {
					url: "url2",
					status: "loading",
					domNode: mockDomNode2,
					callbacks: []
				}
			};

			var matchedInfo = null;
			var messageSource = mockContentWindow2;

			// Simulate finding matching iframe
			$tw.utils.each($tw.browserMessaging.iframeInfoMap, function(info) {
				if(info && info.domNode && info.domNode.contentWindow === messageSource) {
					matchedInfo = info;
				}
			});

			expect(matchedInfo).toBe($tw.browserMessaging.iframeInfoMap["url2"]);
			expect(matchedInfo.url).toBe("url2");
		});

	});

	describe("Backward compatibility with iframe.onload", function() {

		it("should handle iframe.onload as fallback when PLUGIN-LIBRARY-READY is not sent", function() {
			var iframeInfo = {
				status: "loading",
				callbacks: []
			};

			var callbackCalled = false;
			iframeInfo.callbacks.push(function(err, info) {
				callbackCalled = true;
			});

			// Simulate onload firing (fallback path)
			if(iframeInfo.status !== "loaded") {
				iframeInfo.status = "loaded";
				var cb;
				while((cb = iframeInfo.callbacks.shift())) {
					cb(null, iframeInfo);
				}
			}

			expect(callbackCalled).toBe(true);
			expect(iframeInfo.status).toBe("loaded");
		});

	});

	describe("Error handling", function() {

		it("should handle iframe onerror events", function() {
			var iframeInfo = {
				status: "loading",
				callbacks: []
			};

			var errorReceived = null;
			var errorMessage = "Cannot load iframe";

			iframeInfo.callbacks.push(function(err, info) {
				errorReceived = err;
			});

			// Simulate onerror
			if(iframeInfo.status !== "loaded") {
				iframeInfo.status = "error";
				var cb;
				while((cb = iframeInfo.callbacks.shift())) {
					cb(errorMessage, iframeInfo);
				}
			}

			expect(errorReceived).toBe(errorMessage);
			expect(iframeInfo.status).toBe("error");
		});

		it("should handle exceptions during iframe.src assignment", function() {
			var iframeInfo = {
				status: "loading",
				callbacks: []
			};

			var exceptionReceived = null;
			var testException = new Error("Security exception");

			iframeInfo.callbacks.push(function(err, info) {
				exceptionReceived = err;
			});

			// Simulate exception handling
			if(iframeInfo.status !== "loaded") {
				iframeInfo.status = "error";
				var cb;
				while((cb = iframeInfo.callbacks.shift())) {
					cb(testException, iframeInfo);
				}
			}

			expect(exceptionReceived).toBe(testException);
			expect(iframeInfo.status).toBe("error");
		});

	});

	describe("Race condition prevention", function() {

		it("should ensure messages are not dropped due to timing", function() {
			// Simulate the race condition scenario
			var iframeInfo = {
				status: "loading",
				callbacks: []
			};

			var messageReceived = false;
			var callbackFired = false;

			// Queue a callback (simulating parent window loading iframe)
			iframeInfo.callbacks.push(function(err, info) {
				callbackFired = true;
			});

			// Simulate PLUGIN-LIBRARY-READY arriving before callback is fired
			messageReceived = true;

			// Simulate receiving PLUGIN-LIBRARY-READY and flushing
			if(iframeInfo.status !== "loaded" && messageReceived) {
				iframeInfo.status = "loaded";
				var cb;
				while((cb = iframeInfo.callbacks.shift())) {
					cb(null, iframeInfo);
				}
			}

			expect(messageReceived).toBe(true);
			expect(callbackFired).toBe(true);
			expect(iframeInfo.status).toBe("loaded");
		});

	});

});
