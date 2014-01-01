/* lib/mailee.js
 *
 * Reads unread mails from imap inbox defined in config.js.
 * Checks if sender is an user in SqERL and parses email
 * sender, subject, body and image attachment to new whatshot
 * item poster, title, body and image respectively. Mails
 * are then marked as read. This is currently run from app.js
 * peridiocally.
 */

var debug = false;
var markSeen = true;

var Imap = require('imap');
var MailParser = require('mailparser').MailParser;
var fs = require('fs');
var inspect = require('util').inspect;
var icalendar = require('icalendar');
var config = require('./config.js');
var dao=require('./dataaccess.js');
var mimelib = require("mimelib-noiconv");
var utility=require('./utility.js');
var querystring = require("querystring");

var imap = new Imap({
    user: config.PULL_EMAIL_ID,
    password: config.PULL_EMAIL_PASS,
    host: config.PULL_EMAIL_SERVER,
    port: config.PULL_EMAIL_SERVER_PORT,
    secure: true,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
});
/*var imap = new Imap({
    user: 'confme@ext.movial.com',
    password: 'aivohyiey0iePh',
    host: 'imap.gmail.com',
    port: 993,
    secure: true
});*/


//console.log(imap);
//var db_ = null;
var isUser = {}
var urlRegExp = new RegExp('https?://[-!*\'();:@&=+$,/?#\\[\\]A-Za-z0-9_.~%]+');

var mpns = require('mpns');

var pushUri = "";

var http = require("http");
var url = require("url");
var fs = require('fs');
var PARSE_RES = { "fetch" : "empty", "fetchMessage" : "Cold start, fetching in progress..."};



process.on('uncaughtException', function (err) {
    fs.writeFile("test.txt",  err, "utf8");    
})
http.createServer(function(request, response) {
    var uri = url.parse(request.url).pathname;
    //console.log(request.url);
    if (uri === "/conf") {
        var query = url.parse(request.url).query;
        var params=querystring.parse(query);
         dao.getInvitations(response,utility.Nullify(params['userID']),utility.Nullify(params['id']));
        /*response.setHeader("content-type", "text/plain");
        response.write(JSON.stringify(PARSE_RES));
        response.end();*/
    }
    else if (uri === "/notif") {
        console.log(request.url);
        dao.getNotifications(response);
        
    } 
    else if (uri === "/user") {
        var query = url.parse(request.url).query;
        var user=querystring.parse(query);
        //var u=utility.Nullify(user['u']);
        //console.log(user);
        dao.insertUser(response,utility.Nullify(user['userID']),utility.Nullify(user['deviceID']),utility.Nullify(user['firstName']),utility.Nullify(user['lastName']),utility.Nullify(user['phoneNo']),utility.Nullify(user['masterEmail']),utility.Nullify(user['password']),utility.Nullify(user['location']) );
        
    }
    else if (uri === "/pushurl") {
        var query = url.parse(request.url).query;
        var user=querystring.parse(query);
        //var u=utility.Nullify(user['u']);
        //console.log(u);
        dao.insertPushURL(response,utility.Nullify(user['deviceID']),utility.Nullify(user['userID']),utility.Nullify(user['pushURL']));
        
    }
    else if (uri === "/addemail") {
        var query = url.parse(request.url).query;
        var user=querystring.parse(query);
        //var u=utility.Nullify(user['u']);
        console.log(user);
        dao.insertEmailAddress(response,utility.Nullify(user['userID']),utility.Nullify(user['emailID']));
        
    }
    else if (uri === "/removeemail") {
        var query = url.parse(request.url).query;
        var user=querystring.parse(query);
        //var u=utility.Nullify(user['u']);
        //console.log(u);
        dao.deleteEmailAddress(response,utility.Nullify(user['userID']),utility.Nullify(user['emailID']));
        
    }
    else if (uri === "/editemail") {
        var query = url.parse(request.url).query;
        var user=querystring.parse(query);
        //var u=utility.Nullify(user['u']);
        //console.log(u);
        dao.updateEmailAddress(response,utility.Nullify(user['userID']),utility.Nullify(user['oldEmailID']),utility.Nullify(user['newEmailID']));
        
    }
    else if (uri === "/getemail") {
        var query = url.parse(request.url).query;
        var user=querystring.parse(query);
        //var u=utility.Nullify(user['u']);
        //console.log(u);
        dao.getEmailAddresses(response,utility.Nullify(user['userID']));
        
    }
    else if (uri === "/addcalllog") {
        var query = url.parse(request.url).query;
        var user=querystring.parse(query);
        //var u=utility.Nullify(user['u']);
        //console.log(u);
        dao.insertCallLog(response,utility.Nullify(user['userID']),new Date(Date.parse(utility.isNull(user['startTime'],''))),new Date(Date.parse(utility.isNull(user['endTime'],''))),utility.Nullify(user['callNo']));
        
    }
    else if (uri === "/toll") {
        var query = url.parse(request.url).query;
        var user=querystring.parse(query);
        //var u=utility.Nullify(user['u']);
        //console.log(u);

        dao.getTollNo(response,utility.isNull(user['area'],''),utility.isNull(user['dialInProvider'],'WebEx'));
        
    }
    else if (uri === "/credit") {
        var query = url.parse(request.url).query;
        var user=querystring.parse(query);
        //var u=utility.Nullify(user['u']);
        //console.log(u);

        dao.getCreditBalance(response,utility.Nullify(user['userID']));
        
    }
    else {
        response.setHeader("content-type", "text/plain");
        response.write(JSON.stringify(url.parse(request.url)));
        response.end();
    }
}).listen(process.env.port || 8080);


function checkConfMe(uri) {
    pushUri = uri;
    checkMails();
}

function checkMails() {
    /*console.log(imap);*/
    console.log('Connecting imap');
    imap.setMaxListeners(0);
     //console.log('Connecting imap...');
   /* imap.once('error', function(err) {
  console.log(err);
    });*/
    imap.connect(function(err) {
        if (err) {
            PARSE_RES['fetchMessage'] = 'Unable to connect imap: ' + err;
            console.log('Unable to connect imap '+err);
            return;
        }
        
        console.log('Connected imap');
        
        imap.openBox('INBOX', false, function(err, mailbox) {
            if (err) {
                PARSE_RES['fetchMessage'] = 'Unable to open inbox: ' + err;
                console.log(PARSE_RES['fetchMessage']);
                imap.logout();
                return;
            }

            imap.search([ 'FLAGGED', ['SINCE', 'June 01, 2013'] ], function(err, results) {
                console.log('err:'+inspect(err, false, Infinity)+' results:'+inspect(results, false, Infinity));
                
                if (err) {
                    PARSE_RES['fetchMessage'] = 'Cannot search inbox: ' + err;
                    console.log(PARSE_RES['fetchMessage']);
                    imap.logout();
                    return;
                }

                if ( !results || results.length <= 0 ) {
                    PARSE_RES['fetchMessage'] = 'No new mail';
                    console.log(PARSE_RES['fetchMessage']);
                    imap.logout();
                    return;
                }
                
                imap.fetch(results, { markSeen: markSeen }, { headers: { parse: false }, body: true, cb: fetchMailProcess}, fetchMailDone);
            });
        });
    });
}

function fetchMailProcess(fetch) {
    fetch.on('message', function(msg) {
        console.log('BEGIN SeqNo:'+msg.seqno);
        mailParser = new MailParser();

        mailParser.on('end', function(mail) {
            var out = parseMail(mail);
            if (!out)
                return;

            out['fetch'] = "success";
            PARSE_RES = out;
            var addressStr = out['to']; //'jack@smart.com, "Development, Business" <bizdev@smart.com>';
            var addresses = mimelib.parseAddresses(addressStr);
            console.log('No. of Attendees :'+ addresses.length);
            console.log('Starting Invitation Save into sql database...');
            var emailsto='';
        if(addresses.length>0)
         {
                
            for (var i =0; i<addresses.length; i++) {
                if(i >0) emailsto =emailsto +",";
                emailsto = emailsto+ addresses[i].address;
                
            //console.log(addresses[i].address);
            //console.log(addresses[i].name);
            }
        }
        else
        {
            emailsto='';
            //console.log('receipent not found');
            //console.log(utility.convertToDateTime(utility.Nullify(out['date']),utility.Nullify(out['time'])));
        /*var entity = {
                UserID : '',
                ToEmail:'',
                FromEmail: utility.isNull(out['from'],''),
                InvDate : new Date(Date.parse(utility.isNull(out['date'],''))),
                InvTime : utility.convertToDateTime(utility.isNull(out['date'],''),utility.isNull(out['time'],'')),
                Subject: utility.isNull(out['subject'],''),
                Toll:utility.isNull(out['toll'],''),
                PIN: utility.isNull(out['pin'],''),
                AccessCode: utility.isNull(out['code'],''),
                Password: utility.isNull(out['password'],''),
                DialInProvider:'WebEx'
                };
                //console.log(entity);
                 dao.insertInvitationEntity(entity);*/
        }
         console.log(addresses);
         console.log('EmailsTo: '+emailsto);
         var entity = {
                ToEmails : emailsto,
                FromEmail: utility.isNull(out['from'],''),
                InvDate : new Date(Date.parse(utility.isNull(out['date'],''))),
                InvTime : utility.convertToDateTime(utility.isNull(out['date'],''),utility.isNull(out['time'],'')),
                Subject: utility.isNull(out['subject'],''),
                Toll:utility.isNull(out['toll'],''),
                PIN: utility.isNull(out['pin'],''),
                AccessCode: utility.isNull(out['code'],''),
                Password: utility.isNull(out['password'],''),
                DialInProvider:'WebEx',
                Agenda:utility.isNull(out['agenda'],'')
                };
        console.log("db entity to insert");
        console.log(entity);
         dao.insertInvitationEntity(entity,addresses);

           //console.log('End Invitation Save into sql database');
            //sendPushNotification(out);
        });

        msg.on('data', function(data) {
            //console.log('data:'+data.toString('utf8'));
            mailParser.write(data.toString());
        });

        msg.on('end', function() {
            console.log('END SeqNo:'+msg.seqno);
            mailParser.end();
        });
    });

    fetch.on('error', function(error) {
        console.log(error);
    });
}

function fetchMailDone(err) {
    if (err) {
        console.log('Mail fetching failed:'+err);
    }
    
    console.log('Mail fetching completed');
    imap.logout();
}

function sendPushNotification(obj)
{
    console.log("sending push notification");
    mpns.sendTile(pushUri,
        {
            'title': (debug ? hours + ":" + minutes + ":" + seconds + " " : "" ) + obj['subject'],
            'backTitle': "Next Conference",
            'backBackgroundImage': "/Assets/Tiles/BackTileBackground.png",
            'backContent': obj['time'] + ", " + obj['date'],
        },
        function(){}
    );
}

function parseMail(mail)
{
    //console.log(inspect(mail, false, Infinity));

    var out = null;

    if (mail.attachments)
        out = parseAttachments(mail.attachments);

    if (!out)
        out = parseBody(mail);

    console.log(inspect(out));

    if (!out || !out['toll'] || !out['code'] || !out['subject'] )
        return null;

    //if (out['date'] && out['time'])
    //    out['date_time'] = new Date(out['date'] + ", " + out['time']);

    //console.log(JSON.stringify(out));

    var currentTime = new Date()
    var hours = currentTime.getHours()
    var minutes = currentTime.getMinutes()
    var seconds = currentTime.getSeconds()
    out['timestamp'] = currentTime;

    return out;
}

function parseBody(mail)
{
    //console.log(inspect(mail));
    var out = null;
    if (mail.text) {
        console.log('##### fallback to parsing text BODY ######');
        out = parseString(mail.text, ':', '\n', true, false);
        //out["body"] = mail.text;
    } else if (mail.html) {
        console.log('##### fallback to parsing html BODY ######');
        var text = mail.html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>?|&nbsp;/gi, '');
        out = parseString(text, ':', '\n', true, false);
        //out["body"] = mail.html;
    } else {
        return null;
    }

    out["subject"] = mail.subject;
	
    return out;

    /*
    if ( mail.inReplyTo ) {
        // do not post replies, for example vacation notices
        return;
    }

    if ( mail.from ) {
        for ( var i=0; i<mail.from.length; i++ ) {
            var sender = mail.from[i].address.toLowerCase();
            if ( isUser[sender] ) {
                parseAttachments(mail);
                return;
            }
        }
    }

    if ( mail.replyTo ) {
        for ( var i=0; i<mail.replyTo.length; i++ ) {
            var sender = mail.replyTo[i].address.toLowerCase();
            if ( isUser[sender] ) {
                parseAttachments(mail);
                return;
            }
        }
    }

    if ( mail.headers && mail.headers.sender ) {
        var sender = mail.headers.sender.toLowerCase();
        if ( isUser[sender] ) {
            parseAttachments(mail);
            return;
        }
    }
    */

    //var sender = mail.headers && mail.headers.sender ? mail.headers.sender : 'nobody';
    //parseAttachments(mail);

    // X-Sender and other fields?
}

function parseAttachments(attachments)
{
    var out = {};

    for (var i = 0; i < attachments.length; i++) {
        var atch = attachments[i];
        console.log('##### parsing ATTACHMENT ' + i + ' ######');
        if (atch.contentType && atch.contentType.match(/calendar/) && atch.content) {
            var str_data = atch.content.toString('utf-8');

            var icalendar_res = icalendar.parse_calendar(str_data);

            //console.log(inspect(icalendar_res, false, Infinity));

            var res = {};
            while (!res['toll'] || !res['code']) {
                // case 1, phone and pin in LOCATION
                if (icalendar_res.events()[0].properties.LOCATION) {
                    var LOCATION = icalendar_res.events()[0].properties.LOCATION[0].value;
                    //console.log("<location>"+LOCATION+"</location>");
                    res = parseString(LOCATION, ':', '\\s*', false, true);
                    //console.log(res);
                    if (res['toll'] && res['code'])
                        break;
                }

                // case 2, search in DESCRIPTION
                if (icalendar_res.events()[0].properties.DESCRIPTION) {
                    var DESCRIPTION = icalendar_res.events()[0].properties.DESCRIPTION[0].value;
                    //console.log(DESCRIPTION);
                    var res = parseString(DESCRIPTION, ':', '\\n', true, false);
                    console.log(res);
                    if (res['toll'] && res['code'])
                        break;
                }

                break;
            }

            if (!res['toll'] || !res['code'])
                return null;

            out['toll'] = utility.Nullify(res['toll']);
            out['code'] = utility.Nullify(res['code']);
            out['password']=utility.Nullify(res['password']);
            //console.log("$$ :"+icalendar_res.events()[0].properties.DTSTART[0].value);
            var date = new Date(icalendar_res.events()[0].properties.DTSTART[0].value);
            out['date_time'] = date.toString();
            var date_split = out['date_time'].split(" ");
            out['date'] = date_split.slice(0, 4).join(" ");
            out['time'] = date;//date_split.slice(4).join(" ");;

            out['subject'] = icalendar_res.events()[0].properties.SUMMARY[0].value;

            return out;
        }
    }
}

function parseString(str, delimiter, endMarker, allowFuzzy, usePattern)
{
    var dict =
    [
        {
            keyword: 'toll', // TODO: rename to 'phone'
            alts: 'toll|bridge|dial-in',
            pattern: '[0-9\\-+]+',
            fuzzy: true,
        },
        {
            keyword: 'code', // TODO: rename to 'pin'
            alts: 'pin|code',
            pattern: '[0-9]+',
            fuzzy: true,
        },
        {
            keyword: 'password',
            alts: 'password',
            pattern: '.+',
            fuzzy: false,
        },
        {
            keyword: 'date',
            alts: 'date',
            pattern: '.+',
            fuzzy: false,
        },
        {
            keyword: 'time',
            alts: 'time',
            pattern: '.+',
            fuzzy: false,
        },
        {
            keyword: 'to',
            alts: 'to',
            pattern: '.+',
            fuzzy: false,
        },
        {
            keyword: 'from',
            alts: 'from',
            pattern: '.+',
            fuzzy: false,
        },
        {
            keyword: 'subject',
            alts: 'subject',
            pattern: '.+',
            fuzzy: false,
        },
        {
            keyword: 'agenda',
            alts: 'topic|agenda',
            pattern: '.+',
            fuzzy: false,
        },
    ];

    var out = {};

    for (i = 0; i < dict.length; i++) {
        var re = new RegExp('\\b(?:' + dict[i].alts + ')\\b' +
                            (allowFuzzy && dict[i].fuzzy ? '.*' : '(?:\\s*)?') + delimiter +
                            '\\s*(' + (usePattern ? dict[i].pattern : '.+') + ')' + endMarker, 'i');
        var match = str.match(re);
        if (match && match.length > 0) {
            out[dict[i].keyword] = match[1];
        }
    }

    return out;
}

/*function addItem(senderEmail, senderName, imgPath, title, link, content) {
    //console.log('addItem email:'+senderEmail+' name:'+senderName+' title:'+title+' link:'+link);
    //console.log('imgPath: '+imgPath+' content: '+content);

    var newItem = {
        pubDate: new Date(),
        title: title,
        link: link,
        description: content,
        content: content,
        security: 3,
        submitterName: senderName,
        submitterEmail: senderEmail,
        tags: [ "PUBLIC" ],
        likeCount: 0 };

    if ( imgPath )
        newItem['image'] = imgPath;

    db_.conn.model('WhatsHot').create(newItem, function(err, savedItem) {
        if (err)
            console.log(err);
        else
            console.log('Added whatshot');
    });
}

function populateIsUser(cb) {
    isUser = {};
    db_.User.find().exec(function(err, userList) {
        if ( err ) {
            console.log(err);
            cb(err);
            return;
        }

        for ( var i=0; i<userList.length; i++ ) {
            var isUserData = {};
            isUserData['security'] = userList[i].security;
            isUserData['fullName'] = userList[i].firstName+' '+userList[i].lastName;
            isUser[userList[i].email] = isUserData;
        }

        cb(null);
    });
}
*/

exports.checkConfMe = checkConfMe;
