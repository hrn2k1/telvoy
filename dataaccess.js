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
    VALUES(@UserID,@DeviceID,@FirstName,@LastName,@PhoneNo,@MasterEmail,@Password,@Location,GETDATE(),0)

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
    console.log('User object to add');
    console.log(entity);
   insertUserinfo(entity,function(error,result){
    if(error)
    {
        console.log("insertUser() error: "+error);
       response.setHeader("content-type", "text/plain");
       response.write('Error : ' + error);
       response.end();
    }
    else
    {
        console.log("Invitation inserted Successfully");
         response.setHeader("content-type", "text/plain");
         response.write('Success');
         response.end();
    }
});
   
    
}

//// Add method to add User's Other Emails 
function insertEmailAddress(response,userID,emailID)
{
    console.log('Adding Email Address');
    var addEmail=edge.func('sql',function(){/*
     INSERT INTO dbo.EmailAddresses(UserID,EmailAddress,isBlocked) VALUES(@UserID,@EmailAddress,0);
    */});
    var mail={UserID:userID,EmailAddress:emailID};
    console.log(mail);
    addEmail(mail,function(error,result){
    if(error)
    {
        console.log("insertEmail() error: "+error);
       response.setHeader("content-type", "text/plain");
       response.write('Error : ' + error);
       response.end();
    }
    else
    {
        console.log("EmailAddress inserted Successfully");
         response.setHeader("content-type", "text/plain");
         response.write('Success');
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
        console.log("deleteEmail() error: "+error);
       response.setHeader("content-type", "text/plain");
       response.write('Error : ' + error);
       response.end();
    }
    else
    {
        console.log("EmailAddress deleted Successfully");
         response.setHeader("content-type", "text/plain");
         response.write('Success');
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
        console.log("insertCallLog() error: "+error);
       response.setHeader("content-type", "text/plain");
       response.write('Error : ' + error);
       response.end();
    }
    else
    {
        console.log("CallLog inserted Successfully");
         response.setHeader("content-type", "text/plain");
         response.write('Success');
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
            console.error('insertPushURL() error: ' + error);
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
    INSERT INTO Invitations(ToEmails,FromEmail,InvDate,InvTime,Subject,Toll,PIN,AccessCode,Password,DialInProvider,TimeStamp,Agenda) 
    VALUES(@ToEmails,@FromEmail,@InvDate,@InvTime,@Subject,@Toll,@PIN,@AccessCode,@Password,@DialInProvider,GETDATE(),@Agenda);

*/});

var getMaxInvID = edge.func('sql', function () {/*
    SELECT ISNULL(MAX(ID),0) AS MXID FROM Invitations;

*/});
var insertInvitee = edge.func('sql', function () {/*
    INSERT INTO Invitees(UserID,EmailID,InvID) VALUES(@UserID,@EmailID,@InvID);

*/});
insertInvite(entity,function(error,result){
if(error)
{
    console.log("insertInvitation() error: "+error);
   throw error;
}
else
{
    console.log("Invitation inserted Successfully");
    getMaxInvID(null,function(error,result){
    if(error)
    {
        console.log("insertInvitation() error: "+error);
        throw error;
    }
    else
    {

        var MxInvID=result[0].MXID;
        console.log("Max Invitation ID  retrieved Successfully, ID: "+MxInvID);
        for (var i =0; i<addresses.length; i++) {
               
             attendee={UserID:addresses[i].address,EmailID:addresses[i].address,InvID:MxInvID};

             insertInvitee(attendee,function(error,result){
            if(error)
            {
                console.log("insertInvitee() error: "+error);
                return -1;
            }
            else
            {
                console.log("Invitee inserted Successfully");
                return result;;
            }
            });

        }
        console.log('End Invitation Save into sql database');

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
    console.log("PushNotification() error: "+error);
    return "Error: "+error;
}
else
{
    console.log("Total Eligible getNotifications: "+result.length);
    for(var i=0;i<result.length;i++){

        var tileObj={
            'title': result[i].Subject,
            'backTitle': "Next Conference",
            'backBackgroundImage': "/Assets/Tiles/BackTileBackground.png",
            'backContent': result[i].Agenda,
        };
        mpns.sendTile(result[i].PushURL,tileObj,function(){console.log('Pushed OK');});
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
    console.log("GetInvitation() error: "+error);
  
    var invites = {"Error":error};
          response.setHeader("content-type", "text/plain");
         response.write(JSON.stringify(invites));
        response.end();
}
else
{
        console.log(result);
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
    console.log(TimeFrom+"-"+TimeTo);
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
        console.log(entities);
        //return JSON.stringify(entities);
        response.setHeader("content-type", "text/plain");
         response.write(JSON.stringify(entities));
        response.end();
    }
    else
    {
         console.log(error);
        invites = {"Error":error};
          response.setHeader("content-type", "text/plain");
         response.write(JSON.stringify(invites));
        response.end();
    }
});
    
}

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


