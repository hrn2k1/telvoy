var mpns = require('mpns');
var azure=require("azure");
var edge = require('edge');
var config=require('./config.js');
var utility=require('./utility.js');

/// User Creation Method Exposed here
function insertUser(response,userID,deviceID,firstName,lastName,phoneNo,masterEmail,password,location)
{

var insertUserinfo = edge.func('sql', function () {/*
INSERT INTO dbo.Users(UserID,DeviceID,FirstName,LastName,PhoneNo,MasterEmail,Password,Location,RegistrationTime,IsBlackListed)
VALUES(@UserID,@DeviceID,@FirstName,@LastName,@PhoneNo,@MasterEmail,@Password,@Location,GETDATE(),0);
*/});
 var getUser=edge.func('sql',function(){/*
    SELECT * FROM dbo.Users WHERE UserID=@UserID;
 */});

var updateUser=edge.func('sql',function(){/*
UPDATE dbo.Users SET DeviceID=@DeviceID,FirstName=@FirstName,LastName=@LastName,PhoneNo=@PhoneNo,MasterEmail=@MasterEmail,Password=@Password,Location=@Location WHERE UserID=@UserID;
*/});
  var entity = {
        UserID : userID,
        DeviceID: deviceID,
        FirstName : firstName,
        LastName : lastName,
        PhoneNo : phoneNo,
        MasterEmail : masterEmail,
        Password : '',
        Location : location
        
    };
    utility.log('User object to add');
    utility.log(entity);
    getUser({UserID:userID},function(error,result){
        if(error)
        {
        utility.log("getUser() error: "+error,'ERROR');
       response.setHeader("content-type", "text/plain");
       response.write('{\"Status\":\"Unsuccess\"}');
       response.end();
        }
        else
        {
            if(result.length==0)
            {
                insertUserinfo(entity,function(error,result){
                    if(error)
                    {
                        utility.log("insertUser() error: "+error,'ERROR');
                       response.setHeader("content-type", "text/plain");
                       response.write('{\"Status\":\"Unsuccess\"}');
                       response.end();
                    }
                    else
                    {
                        utility.log("Invitation inserted Successfully");
                         response.setHeader("content-type", "text/plain");
                         response.write('{\"Status\":\"Success\"}');
                         response.end();
                    }
                });
            }
            else
            {
                updateUser(entity,function(error,result){
                    if(error)
                    {
                        utility.log("insertUser() error: "+error,'ERROR');
                       response.setHeader("content-type", "text/plain");
                       response.write('{\"Status\":\"Unsuccess\"}');
                       response.end();
                    }
                    else
                    {
                        utility.log("Invitation inserted Successfully");
                         response.setHeader("content-type", "text/plain");
                         response.write('{\"Status\":\"Success\"}');
                         response.end();
                    }
                });
            }
        }
    });
   
   
    
}

//// Add method to add User's Other Emails 
function insertEmailAddress(response,userID,emailID)
{
    utility.log('Adding Email Address');
    var addEmail=edge.func('sql',function(){/*
     INSERT INTO dbo.EmailAddresses(UserID,EmailAddress,isBlocked) VALUES(@UserID,@EmailAddress,0);
    */});
    var mail={UserID:userID,EmailAddress:emailID};
    utility.log(mail);
    addEmail(mail,function(error,result){
    if(error)
    {
        utility.log("insertEmail() error: "+error,'ERROR');
       response.setHeader("content-type", "text/plain");
      response.write('{\"Status\":\"Unsuccess\"}');
       response.end();
    }
    else
    {
        utility.log("EmailAddress inserted Successfully");
         response.setHeader("content-type", "text/plain");
         response.write('{\"Status\":\"Success\"}');
         response.end();
    }
    });
}
function deleteEmailAddress(response,userID,emailID)
{
    var delEmail=edge.func('sql',function(){/*
     DELETE FROM EmailAddresses WHERE UserID=@UserID AND EmailAddress=@EmailAddress;
    */});
    delEmail({UserID:userID,EmailAddress:emailID},function(error,result){
    if(error)
    {
        utility.log("deleteEmail() error: "+error,'ERROR');
       response.setHeader("content-type", "text/plain");
        response.write('{\"Status\":\"Unsuccess\"}');
       response.end();
    }
    else
    {
        utility.log("EmailAddress deleted Successfully");
         response.setHeader("content-type", "text/plain");
          response.write('{\"Status\":\"Success\"}');
         response.end();
    }
    });
}
function updateEmailAddress(response,userID,oldEmailID,newEmailID)
{
    var editEmail=edge.func('sql',function(){/*
     UPDATE EmailAddresses SET EmailAddress=@NewEmailID  WHERE UserID=@UserID AND EmailAddress=@OldEmailID;
    */});
    editEmail({UserID:userID,OldEmailID:oldEmailID,NewEmailID:newEmailID},function(error,result){
    if(error)
    {
        utility.log("updateEmail() error: "+error,'ERROR');
       response.setHeader("content-type", "text/plain");
        response.write('{\"Status\":\"Unsuccess\"}');
       response.end();
    }
    else
    {
        utility.log("EmailAddress updated Successfully");
         response.setHeader("content-type", "text/plain");
          response.write('{\"Status\":\"Success\"}');
         response.end();
    }
    });
}

function getEmailAddresses(response,userID)
{
    var getEmail=edge.func('sql',function(){/*
     SELECT * FROM  EmailAddresses WHERE UserID=@UserID;
    */});
    getEmail({UserID:userID},function(error,result){
    if(error)
    {
        utility.log("updateEmail() error: "+error,'ERROR');
       response.setHeader("content-type", "text/plain");
        response.write('{\"Status\":\"UnSuccess\"}');
       response.end();
    }
    else
    {
        utility.log("EmailAddress updated Successfully");
         response.setHeader("content-type", "text/plain");
         response.write("{\"Emails\":"+JSON.stringify(result)+"}");
         response.end();
    }
    });
}

/// User Call Log History
function insertCallLog(response,userID,startTime,endTime,callNo)
{
    var addCallLog=edge.func('sql',function(){/*
     INSERT INTO CallLog(TimeStamp,UserID,StartTime,EndTime,CallNo) VALUES(GETDATE(),@UserID,@StartTime,@EndTime,@CallNo);
    */});
    addCallLog({UserID:userID,StartTime:startTime,EndTime:endTime,CallNo:callNo},function(error,result){
    if(error)
    {
        utility.log("insertCallLog() error: "+error,'ERROR');
       response.setHeader("content-type", "text/plain");
       response.write('{\"Status\":\"Unsuccess\"}');
       response.end();
    }
    else
    {
        utility.log("CallLog inserted Successfully");
         response.setHeader("content-type", "text/plain");
         response.write('{\"Status\":\"Success\"}');
         response.end();
    }
    });
}
/// Mapping Dial In 
function getTollNo(response,area,dialInProvider)
{
 var getToll = edge.func('sql', function () {/*
    SELECT * FROM DialInNumbers WHERE Area=@Area AND Provider=@Provider;
*/});
 
 getToll({Area:area,Provider:dialInProvider},function(error,result){
if(error)
{
    utility.log("GetDialToll() error: "+error,'ERROR');
  
    var invites = {"Status":"Unsuccess"};
          response.setHeader("content-type", "text/plain");
         response.write(JSON.stringify(invites));
        response.end();
}
else
{
        utility.log(result);
        //return JSON.stringify(result);
        response.setHeader("content-type", "text/plain");
         response.write("{\"Tolls\":"+JSON.stringify(result)+"}");
        response.end();
}
});
}
/// Not used now
function insertPushURL(response,deviceID,userID,pushURL)
{
	var TABLE_NAME="PushURLs";	
var tableService = azure.createTableService(config.STORAGE_ACCOUNT_NAME, config.STORAGE_ACCOUNT_KEY);
tableService.createTableIfNotExists(TABLE_NAME, function(error) {
        if (error) {
            utility.log('insertPushURL() error: ' + error,'ERROR');
            //request.respond(statusCodes.BAD_REQUEST, error);
            
            response.setHeader("content-type", "text/plain");
            response.write('Error : ' + error);
            response.end();
        }
        else
        {
            response.setHeader("content-type", "text/plain");
            response.write('Success');
            response.end();
        }
    });


  var entity = {
        PartitionKey : 'default',
        RowKey : utility.generateUid(),
        UserID : userID,
        DeviceID: deviceID,
        PushURL : pushURL,
        IsActive : true
    };

    tableService.insertEntity(TABLE_NAME, entity, function(error) {
        if (error) {
            console.error('insertPushURL() error: ' + error);
            //request.respond(statusCodes.BAD_REQUEST, error);
            return 'Error : ' + error;
        }
        });

    return 'Success';
}


/// Method to Add an invitation to database after parsing invitation email

function insertInvitationEntity(entity,addresses){
    var insertInvite = edge.func('sql', function () {/*
    INSERT INTO Invitations(ToEmails,FromEmail,InvDate,InvTime,Subject,Toll,PIN,AccessCode,Password,DialInProvider,TimeStamp,Agenda,MessageID) 
    VALUES(@ToEmails,@FromEmail,@InvDate,@InvTime,@Subject,@Toll,@PIN,@AccessCode,@Password,@DialInProvider,GETDATE(),@Agenda,@MessageID);

*/});

var getMaxInvID = edge.func('sql', function () {/*
    SELECT ISNULL(MAX(ID),0) AS MXID FROM Invitations;

*/});
var insertInvitee = edge.func('sql', function () {/*
    INSERT INTO Invitees(UserID,EmailID,InvID) VALUES(@UserID,@EmailID,@InvID);

*/});

var getUserIDByEmail=edge.func('sql',function(){/*
SELECT u.UserID,a.Emailaddress FROM users u LEFT JOIN emailaddresses a ON u.UserID=a.UserID
WHERE  u.UserID=RTRIM(LTRIM(@Email)) OR a.emailaddress=RTRIM(LTRIM(@Email))
*/});

insertInvite(entity,function(error,result){
if(error)
{
    utility.log("insertInvitation() error: "+error,'ERROR');
   throw error;
}
else
{
    utility.log("Invitation inserted Successfully");
    getMaxInvID(null,function(error,result){
    if(error)
    {
        utility.log("insertInvitation() error: "+error,'ERROR');
        throw error;
    }
    else
    {

        var MxInvID=result[0].MXID;
        utility.log("Max Invitation ID  retrieved Successfully, ID: "+MxInvID);
        for (var i =0; i<addresses.length; i++) {
               
            var emailID=addresses[i].address;
            getUserIDByEmail({Email:emailID},function(error,result){
            if(error)
            {
                utility.log("getUserIDByEmail() error: "+error,'ERROR');
                return -1;
            }
            else
            {
              //console.log('loggggggggggg '+result.length);
              if(result.length==0)
              {

                utility.log(emailID+' not found in white list');
                //send email
                var mailer= require('./mailsender.js');
                mailer.sendMail(config.NOT_WHITELISTED_EMAIL_SUBJECT,config.NOT_WHITELISTED_EMAIL_BODY,emailID);
              }
              else
              {
                utility.log('UserID '+result[0].UserID+' found for '+emailID);
                  attendee={UserID:result[0].UserID,EmailID:emailID,InvID:MxInvID};

                  insertInvitee(attendee,function(error,result){
                  if(error)
                  {
                      utility.log("insertInvitee() error: "+error,'ERROR');
                      return -1;
                  }
                  else
                  {
                      utility.log("Invitee inserted Successfully");
                      return result;;
                  }
                  });
               }
            }
               });
            

        }
        utility.log('End Invitation Save into sql database');

    }
    });
}
});

}

/// Method to send/push notification to MPNS
function PushNotification(notificationRemainderTime)
{
    var getNotif=edge.func('sql',function(){/*
       SELECT [Subject],Agenda,UserID,EmailID,Handle AS PushURL
        FROM [dbo].[Invitations] i INNER JOIN dbo.Invitees a ON i.ID=a.InvID
        INNER JOIN telvoy.Registrations r ON 1=1  WHERE datediff(minute,GETDATE(),InvTime) between  0 and  @NotifTime
    */})

getNotif({NotifTime:notificationRemainderTime},function(error,result){
if(error)
{
    utility.log("PushNotification() error: "+error,'ERROR');
    return "Error: "+error;
}
else
{
    utility.log("Total Eligible getNotifications: "+result.length);
    for(var i=0;i<result.length;i++){

        var tileObj={
            'title': result[i].Subject,
            'backTitle': "Next Conference",
            'backBackgroundImage': "/Assets/Tiles/BackTileBackground.png",
            'backContent': result[i].Agenda,
        };
        mpns.sendTile(result[i].PushURL,tileObj,function(){utility.log('Pushed OK');});
    }
}
});

}

/// method to get latest invitation from Mobile set
function getInvitations(response,userID,id)
{
    if(userID==null) userID='jari.ala-ruona@movial.com';
    if(id==null) id=0;

     var getInviteByUserID = edge.func('sql', function () {/*
    SELECT i.*,a.UserID,a.EmailID FROM dbo.Invitations i INNER JOIN dbo.Invitees a ON i.ID=a.InvID WHERE a.UserID=@UserID AND i.ID>@ID ORDER BY TimeStamp DESC;
*/});
 
 getInviteByUserID({UserID:userID,ID:id},function(error,result){
if(error)
{
    utility.log("GetInvitation() error: "+error,'ERROR');
  
    var invites = {"Status":"Unsuccess"};
          response.setHeader("content-type", "text/plain");
         response.write(JSON.stringify(invites));
        response.end();
}
else
{
        utility.log(result);
        //return JSON.stringify(result);
        response.setHeader("content-type", "text/plain");
         response.write("{\"invitations\":"+JSON.stringify(result)+"}");
        response.end();
}
});
}

//// Not used now.
 function getNotifications(response)
{
    //console.log(new Date(Date.parse('2013-12-12T06:13:16.189Z')));
    var TimeFrom=new Date();
    var TimeTo=new Date(TimeFrom.getTime()+config.NOTIFICATION_DURATION);
    utility.log(TimeFrom+"-"+TimeTo);
    var TABLE_NAME="Invitations";   
    var tableService = azure.createTableService(config.STORAGE_ACCOUNT_NAME, config.STORAGE_ACCOUNT_KEY);
    var query = azure.TableQuery
    .select(subject)
    .from(TABLE_NAME)
    .where('Time gt ?', TimeFrom)
    .and('Time lt ?',TimeTo);
    var invites={"Success":"OK"};
    tableService.queryEntities(query, function(error, entities){
    if(!error){
        //entities contains an array of entities
        utility.log(entities);
        //return JSON.stringify(entities);
        response.setHeader("content-type", "text/plain");
         response.write(JSON.stringify(entities));
        response.end();
    }
    else
    {
         utility.log(error,'ERROR');
        invites = {"Error":error};
          response.setHeader("content-type", "text/plain");
         response.write(JSON.stringify(invites));
        response.end();
    }
});
    
}
////
function getCreditBalance(response,userID){
  utility.log('Getiing credit balance for '+userID);
    response.setHeader("content-type", "text/plain");
    response.write("{\"Credit\":10}");
    response.end();
    utility.log('balance: 10');
}
//////////////////////////////


/// Exposes all methods to call outsite this file, using its object   
exports.insertUser=insertUser;
exports.insertEmailAddress=insertEmailAddress;
exports.deleteEmailAddress=deleteEmailAddress;
exports.insertCallLog=insertCallLog;
exports.insertPushURL=insertPushURL;
exports.insertInvitationEntity=insertInvitationEntity;
exports.getInvitations=getInvitations;
exports.PushNotification=PushNotification
exports.getNotifications=getNotifications;
exports.getTollNo=getTollNo;
exports.updateEmailAddress=updateEmailAddress;
exports.getEmailAddresses=getEmailAddresses;
exports.getCreditBalance=getCreditBalance;


