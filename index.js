//console.log(process.stdout.writable);
var simplesmtp = require("simplesmtp");
var MailParser = require("mailparser").MailParser;
var request = require('request');
var cheerio = require('cheerio');
var express = require('express');
var dirty = require('dirty');

var linkInHtml = function(html, callback) {
    $ = cheerio.load(html);
    links = $('a');
    $(links).each(function (i, link) {
        var url = $(link).attr('href');
        callback(null, url);
    });
}

var linkRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

var linkInText = function(text, callback) {
    var match = text.match(linkRegex);

    var result = match? match[0] : null;
    callback(null, result);
};

var followUrl = function(url, callback) {
    console.log("# Found link: " + url);
    console.error(url);
    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("# Visited: " + url);
        } else {
            console.error("# Error on " + url + " :" + error);
        }
        if (callback)
            callback(error);
    })
}




module.exports = function(opts) {
    var db = null;
    var domains = {};
    function initDB(callback) {
        db = dirty(opts.db);
        db.on('load', function() {
            db.forEach(function(domainName,domainData){
                domains[domainName]=domainData;
            });
            db.on('drain', function() {
                console.log('All records are saved on disk now.');
            });

            callback();
        });
    }
    function addDomainFromIncomingEmail(email, callback){
        var domainName = email.replace(/.*@/, "");
        if (domainName) {
            domains[domainName] = {updated: new Date()};
            db.set(domainName, domains[domainName], function(){
                if (callback)
                    callback();
            });
        }
    }


    function createApiServer(callback){
        var app = express();
        var server = null;
        app.get("/domains",function(req, res){
          res.json({domains:Object.keys(domains)});
        });
        server = app.listen(opts.apiPort, callback);

    }
    function createMailServer(callback){
        simplesmtp.createSimpleServer({
            SMTPBanner: "Sendmail, sure."
        }, function (req) {
            process.stdout.write("\r\nNew Mail:\r\n");
            mailparser = new MailParser();
            mailparser.on("end", function (mail_object) {
                console.log("### received email " + req.from + " > " + req.to + ":\n -" + mail_object.subject);
                addDomainFromIncomingEmail(req.to[0]);
                if (mail_object.html) {
                    linkInHtml(mail_object.html, function(err, url){
                        if (url)
                            followUrl(url);
                    });
                } else if (mail_object.text) {
                    linkInText(mail_object.text, function(err, url){
                        if (url)
                            followUrl(url);
                    });
                };
            });
            req.pipe(mailparser);
            req.accept();
        }).listen(opts.smtpPort, callback); 
    }
    initDB(function(){
        createMailServer(function(){
            createApiServer()
        })
    });

}
