var azure=require("azure");
var edge = require('edge');
var config=require('./config.js');
var utility=require('./utility.js');
function insertUser(response,deviceID,userID,firstName,lastName,phoneNo,masterEmail,password,location)
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
        Password : password,
        Location : location
        
    };

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

function insertInvitationEntity(entity,addresses){
    var insertInvite = edge.func('sql', function () {/*
    INSERT INTO Invitations(ToEmails,FromEmail,InvDate,InvTime,Subject,Toll,PIN,AccessCode,Password,DialInProvider,TimeStamp) 
    VALUES(@ToEmails,@FromEmail,@InvDate,@InvTime,@Subject,@Toll,@PIN,@AccessCode,@Password,@DialInProvider,GETDATE());

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

function insertNotification(notificationRemainderTime)
{
    var insertNotif=edge.func('sql',function(){/*
        INSERT INTO telvoy.notifications (text,InvID,InvEmails,complete)
        select Subject+ ' at '+CAST(InvTime AS VARCHAR),i.ID,i.ToEmails,0 from invitations i LEFT JOIN telvoy.notifications n ON i.ID=n.InvID
        where n.InvID IS NULL AND datediff(minute,GETDATE(),InvTime) between  -66666 and  @NotifTime
    */})

insertNotif({NotifTime:notificationRemainderTime},function(error,result){
if(error)
{
    console.log("insertNotification() error: "+error);
    return "Error: "+error;
}
else
{
    return "Success";
}
});

}

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
         response.write(JSON.stringify(result));
        response.end();
}
});
}

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
   
exports.insertUser=insertUser;
exports.insertPushURL=insertPushURL;
//exports.insertInvitation=insertInvitation;
exports.insertInvitationEntity=insertInvitationEntity;
exports.getInvitations=getInvitations;
exports.insertNotification=insertNotification
exports.getNotifications=getNotifications;


