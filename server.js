//console.log(process.stdout.writable);
var simplesmtp = require("simplesmtp");
var MailParser = require("mailparser").MailParser;
var request = require('request');
var cheerio = require('cheerio');

simplesmtp.createSimpleServer({SMTPBanner:"Sendmail, sure."}, function(req){
    process.stdout.write("\r\nNew Mail:\r\n");
mailparser = new MailParser();
mailparser.on("end", function(mail_object){
console.log("### received email "+req.from+" > "+req.to+":\n -"+mail_object.subject);
if (mail_object.html) {
  $ = cheerio.load(mail_object.html);
  links = $('a'); 
  $(links).each(function(i, link){
    var url = $(link).attr('href');
    console.log("# Found link: "+ $(link).text() + ':  ' + url);
request(url, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log("# Visited: "+url);
  } else {
    console.error("# Error on "+url+" :"+ error);
  }
})
  
});


};
});
req.pipe(mailparser);
    req.accept();
}).listen(25, function(err){
    if(!err){
        console.log("SMTP server listening on port 25");
    }else{
        console.log("Could not start server on port 25. Ports under 1000 require root privileges.");
        console.log(err.message);
    }
});
