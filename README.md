# Sequelize-Revisions
Enables document revisions and the exact changes of each revision.
The changes make use of https://github.com/kpdecker/jsdiff to compose differences that might be displayed in a nice way:
<img src="https://raw.githubusercontent.com/kpdecker/jsdiff/master/images/node_example.png" alt="Example">

## Install
```shell
npm install sequelize-revisions --save
```

## Usage
```javascript
// Init sequelize
var sequelize = new Sequelize(..., {
   ...
});

// Init revisions
var Revisions = require("sequelize-revisions")(sequelize, options);

// Define your models
var User = app.db.define("User", {
   username: {
      type: Sequelize.TEXT,
      allowNull: false,
      unique: true
   },
   isAdmin: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
   }
});

// Enable revisions on model
User.enableRevisions();

// Define revision models
Revisions.defineModels();
```

## Options
```javascript
// Options and default values
var options = {
   // Exclude fields from audit
   exclude: ["id", "createdAt", "updatedAt"],
   // Revision field on other documents
   revisionAttribute: "revision",
   // Revision model name
   revisionModel: "Revision",
   // RevisionChanges model
   revisionChangeModel: "RevisionChanges",
   // Log
   log: console.log
}
```

## Get the current user
I don't know of any good implementation for this, as a workaround I inject a context object to documents I'm about to save. These get picked up by sequelize-revisions.
```javascript
User.findById(id).then(function(user){
   if(!user){
      return next(new Error("User with id " + id + " not found"));
   }

   user.context = { user: req.user }
   user.updateAttributes(req.body).then(function(user) {
      res.json(user);
   }).catch(next);
}).catch(next);

**Update: Use express middleware https://github.com/bkniffler/express-sequelize-user to get the current user into your objects.**
```

## Example output
**Revisions**
```json
[
  {
    "id": 1,
    "model": "User",
    "documentId": 1,
    "revision": 1,
    "document": "{'isAdmin':false,'revision':1,'id':1,'username':'bkniffler1','hash':'xxx','salt':'xxx','activationKey':'6addb6480f298340','updatedAt':'2015-07-31T15:02:35.111Z','createdAt':'2015-07-31T15:02:35.111Z','resetPasswordKey':null}",
    "createdAt": "2015-07-31 17:02:35.159+02",
    "updatedAt": "2015-07-31 17:02:35.159+02",
    "userId": 0
  },
  {
    "id": 2,
    "model": "User",
    "documentId": 1,
    "revision": 2,
    "document": "{'isAdmin':true,'revision':2,'id':1,'username':'bkniffler','hash':'xxx','salt':'xxx','activationKey':'6addb6480f298340','updatedAt':'2015-07-31T15:02:35.166Z','createdAt':'2015-07-31T15:02:35.111Z','resetPasswordKey':null}",
    "createdAt": "2015-07-31 17:02:35.198+02",
    "updatedAt": "2015-07-31 17:02:35.198+02",
    "userId": 1
  }
]
```
**RevisionChanges**
```json
[
  {
    "id": 1,
    "path": "username",
    "document": "{'kind':'N','path':['username'],'rhs':'bkniffler1'}",
    "diff": "[{'value':'bkniffler1','added':true}]",
    "createdAt": "2015-07-31 17:02:35.186+02",
    "updatedAt": "2015-07-31 17:02:35.211+02",
    "revisionId": 1
  },
  {
    "id": 2,
    "path": "isAdmin",
    "document": "{'kind':'N','path':['isAdmin'],'rhs':false}",
    "diff": "[{'value':'0','added':true}]",
    "createdAt": "2015-07-31 17:02:35.187+02",
    "updatedAt": "2015-07-31 17:02:35.226+02",
    "revisionId": 1
  },
  {
    "id": 3,
    "path": "username",
    "document": "{'kind':'E','path':['username'],'lhs':'bkniffler1','rhs':'bkniffler'}",
    "diff": "[{'count':9,'value':'bkniffler'},{",
    "createdAt": "2015-07-31 17:02:35.244+02",
    "updatedAt": "2015-07-31 17:02:35.284+02",
    "revisionId": 2
  },
  {
    "id": 4,
    "path": "isAdmin",
    "document": "{'kind':'E','path':['isAdmin'],'lhs':false,'rhs':true}",
    "diff": "[{'count':1,'removed':true,'value':'0'},{'count':1,'added':true,'value':'1'}]",
    "createdAt": "2015-07-31 17:02:35.245+02",
    "updatedAt": "2015-07-31 17:02:35.281+02",
    "revisionId": 2
  }
]
```
