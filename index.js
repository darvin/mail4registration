//console.log(process.stdout.writable);
var simplesmtp = require("simplesmtp");
var MailParser = require("mailparser").MailParser;
var request = require('request');
var cheerio = require('cheerio');


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
    var result = text.match(linkRegex)[0];
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
   simplesmtp.createSimpleServer({
        SMTPBanner: "Sendmail, sure."
    }, function (req) {
        process.stdout.write("\r\nNew Mail:\r\n");
        mailparser = new MailParser();
        mailparser.on("end", function (mail_object) {
            console.log("### received email " + req.from + " > " + req.to + ":\n -" + mail_object.subject);
            if (mail_object.html) {
                linkInHtml(mail_object.html, function(err, url){
                    followUrl(url);
                });
            } else if (mail_object.text) {
                linkInText(mail_object.text, function(err, url){
                    followUrl(url);
                });
            };
        });
        req.pipe(mailparser);
        req.accept();
    }).listen(opts.smtpPort, function (err) {
        if (!err) {
            console.log("SMTP server listening on port "+opts.smtpPort);
        } else {
            console.log("Could not start server on port "+opts.smtpPort+". Ports under 1000 require root privileges.");
            console.log(err.message);
        }
    }); 
}
