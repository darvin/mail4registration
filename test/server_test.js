var chai = require("chai");
var expect = chai.expect;
var should = chai.should();
var mailserver = require("../");
var MAIL_SERVER_SMTP_PORT=2500;
var MAIL_SERVER_API_PORT=8000;
var MAIL_SERVER_HOST="localhost";
var MAIL_SERVER_FIRST_DOMAIN="mail4registration.com"
var FAKE_SERVER_URL="http://localhost:8080/confirm_registration?email=";
var email   = require("emailjs");


function cleanDB(done){
	done();
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
		//run fake server
		//run email server
		m = mailserver({smtpPort:MAIL_SERVER_SMTP_PORT, apiPort:MAIL_SERVER_API_PORT});
		client  = email.server.connect({
		   host:    MAIL_SERVER_HOST, 
		   port:    MAIL_SERVER_SMTP_PORT
		});

		cleanDB(done);
	});
	it('should have one server in registry initially');
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
	it('should have add servers from incoming emails to registry');
	it('should preserve server registry after restart');
	after(cleanDB);
})
