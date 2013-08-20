var chai = require("chai");
var expect = chai.expect;
var should = chai.should();
var fs = require('fs');
var request = require('request');
var mailserver = require("../");
var MAIL_SERVER_SMTP_PORT=2500;
var MAIL_SERVER_API_PORT=8000;
var MAIL_SERVER_HOST="localhost";
var MAIL_SERVER_DB = "/tmp/test_domains.db"
var MAIL_SERVER_FIRST_DOMAIN="mail4registration.com"
var FAKE_SERVER_URL="http://localhost:8080/confirm_registration?email=";
var SERVER_DOMAIN_LIST_URL="http://"+MAIL_SERVER_HOST+":"+MAIL_SERVER_API_PORT+"/domains";
var email   = require("emailjs");


function cleanDB(done){
	fs.unlink(MAIL_SERVER_DB, function(err) {
		done();
	});
}

var fakeServer = function(callback, receivedCallback) {
	var express = require('express');
	var app = express();
	var server = null;
	app.get("/confirm_registration",function(req, res){
	  var body = 'Confirmed!';
	  res.setHeader('Content-Type', 'text/plain');
	  res.setHeader('Content-Length', body.length);
	  res.end(body);
	  server.close();
	  receivedCallback(null, req.query.email);
	});
	server = app.listen(8080, callback);
}


describe('Mail4Registration server', function(){
	this.timeout(10000);
	var m = null;
	var client = null;
	before(function(done) {
		//run email server
		m = mailserver({
			smtpPort:MAIL_SERVER_SMTP_PORT, 
			apiPort:MAIL_SERVER_API_PORT,
			db:MAIL_SERVER_DB
		});
		client  = email.server.connect({
		   host:    MAIL_SERVER_HOST, 
		   port:    MAIL_SERVER_SMTP_PORT
		});

		cleanDB(done);
	});
	it('should have no one server in registry initially', function(done){
		request({url:SERVER_DOMAIN_LIST_URL, json:true}, function (error, response, body) {
			expect(error).to.be.null;
			response.statusCode.should.equal(200);
			console.error(body);
			expect(body.domains).to.be.eql([]);
			done();
		});

	});
	it('should follow the links in html emails', function(done){
		var email = "someone@"+MAIL_SERVER_FIRST_DOMAIN;

		fakeServer(function(err){
		  client.send({
			   subject:    "comfirm", 
			   from:    "you <username@gmail.com>", 
			   to:      "someone <"+email+">",
			   text: "confirm that NOLINK",
			   attachment: 
				   [
				      {data:"confirm that: <a href=\""+FAKE_SERVER_URL+email+"\"> bla</a>", alternative:true},

				   ]
			}, function(err, message) { console.log(err || message); });

		}, function(err, confirmedEmail){
			confirmedEmail.should.be.equal(email);
			done(err);
		});
	})

	it('should follow the links in text emails', function(done){
		var email = "someone2@"+MAIL_SERVER_FIRST_DOMAIN;

		fakeServer(function(err){
		  client.send({
			   subject:    "comfirm", 
			   from:    "you <username@gmail.com>", 
			   to:      "someone <"+email+">",
			   text: "confirm that: "+FAKE_SERVER_URL+email
			}, function(err, message) { console.log(err || message); });

		}, function(err, confirmedEmail){
			confirmedEmail.should.be.equal(email);
			done(err);
		});
	})
	it('should add servers from incoming emails to registry', function(done) {
		var NEW_DOMAIN = "newdomain.org";
		var DOMAINS_WITH_NEW_DOMAIN = [MAIL_SERVER_FIRST_DOMAIN];
		DOMAINS_WITH_NEW_DOMAIN.push(NEW_DOMAIN);
		client.send({ subject: "1", from: "you <username@gmail.com>", 
			to: "someperson@"+NEW_DOMAIN, text: "2" }, 
			function(err, message) {
				request({url:SERVER_DOMAIN_LIST_URL, json:true}, function (error, response, body) {
					response.statusCode.should.equal(200);
					expect(body.domains).to.be.eql(DOMAINS_WITH_NEW_DOMAIN);
					done();
				});

			});


	});
	it('should preserve server registry after restart', function(done){
		setTimeout(done, 3000);
	});
	after(cleanDB);
})
