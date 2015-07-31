# Sequelize-Revisions
Enables document revisions and the trails of each revision.
The trails make use of https://github.com/kpdecker/jsdiff to compose differences that might be displayed in a nice way:
<img src="https://raw.githubusercontent.com/kpdecker/jsdiff/master/images/node_example.png" alt="Example">

## Usage
```javascript
var sequelize = new Sequelize(..., {
   ...
});

var revs = require("sequelize-revisions")(sequelize, {...});
.. define other models, such as User
// Using after user definition
revs.defineModels();
```

## Example output
**Revisions**
```csv
"id";"model";"documentId";"revision";"document";"createdAt";"updatedAt";"userId"
"1";"User";"1";"1";"{"isAdmin":false,"revision":1,"id":1,"username":"bkniffler1","hash":"xxx","salt":"xxx","activationKey":"6addb6480f298340","updatedAt":"2015-07-31T15:02:35.111Z","createdAt":"2015-07-31T15:02:35.111Z","resetPasswordKey":null}";"2015-07-31 17:02:35.159+02";"2015-07-31 17:02:35.159+02";""
"2";"User";"1";"2";"{"isAdmin":true,"revision":2,"id":1,"username":"bkniffler","hash":"xxx","salt":"xxx","activationKey":"6addb6480f298340","updatedAt":"2015-07-31T15:02:35.166Z","createdAt":"2015-07-31T15:02:35.111Z","resetPasswordKey":null}";"2015-07-31 17:02:35.198+02";"2015-07-31 17:02:35.198+02";"1"
```
**RevisionTrails**
```csv
"id";"username";"document";"diff";"createdAt";"updatedAt";"userId"
"1";"username";"{"kind":"N","path":["username"],"rhs":"bkniffler1"}";"[{"value":"bkniffler1","added":true}]";"2015-07-31 17:02:35.186+02";"2015-07-31 17:02:35.211+02";"1"
"2";"isAdmin";"{"kind":"N","path":["isAdmin"],"rhs":false}";"[{"value":"0","added":true}]";"2015-07-31 17:02:35.187+02";"2015-07-31 17:02:35.226+02";"1"
"3";"username";"{"kind":"E","path":["username"],"lhs":"bkniffler1","rhs":"bkniffler"}";"[{"count":9,"value":"bkniffler"},{"count":1,"removed":true,"value":"1"}]";"2015-07-31 17:02:35.244+02";"2015-07-31 17:02:35.284+02";"2"
"4";"isAdmin";"{"kind":"E","path":["isAdmin"],"lhs":false,"rhs":true}";"[{"count":1,"removed":true,"value":"0"},{"count":1,"added":true,"value":"1"}]";"2015-07-31 17:02:35.245+02";"2015-07-31 17:02:35.281+02";"2"
```
## Options
```
var options = {
   // Exclude fields from audit
   exclude: ["id", "createdAt", "updatedAt"],
   // Revision field on other documents
   revisionAttribute: "revision",
   // Revision model name
   revisionModel: "Revision",
   // RevisionTrails model
   revisionTrailModel: "RevisionTrail",
   // Log
   log: console.log
}
```

## Get the current user
I don't know of any good implementation for this, as a workaround I inject a context object to documents I'm about to save. These get picked up by sequelize-revisions.
```
User.findById(id).then(function(user){
   if(!user){
      return next(new Error("User with id " + id + " not found"));
   }

   user.context = { user: req.user }
   user.updateAttributes(req.body).then(function(user) {
      res.json(user);
   }).catch(next);
}).catch(next);
```


