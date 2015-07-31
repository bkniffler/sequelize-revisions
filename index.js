var Sequelize = require("sequelize");
var diff = require("deep-diff").diff;
var objectPath = require("object-path");
var jsdiff = require("diff");
var _ = require('lodash');

var options = {
   // Exclude fields from audit
   exclude: ["id", "createdAt", "updatedAt"],
   // Revision field on other documents
   revisionAttribute: "revision",
   // Revision model name
   revisionModel: "Revision",
   // RevisionChanges model
   revisionChangeModel: "RevisionChange",
   // Log
   log: console.log
}

module.exports = function(sequelize, options){
   if(!options){
      options = {};
   }
   if(!options.exclude){
      options.exclude = [
         "id", "createdAt", "updatedAt"
      ];
   }
   if(!options.revisionAttribute){
      options.revisionAttribute = "revision";
   }
   if(!options.revisionModel){
      options.revisionModel = "Revision";
   }
   if(!options.revisionChangeModel){
      options.revisionChangeModel = "RevisionChange";
   }
   var log = options.log || console.log;

   // Extend model prototype with "isRevisionable" function
   // Call model.isRevisionable() to enable revisions for model
   _.extend(sequelize.Model.prototype, {
      enableRevisions: function () {
         log("Enable revisions on " + this.name);
         this.attributes["revision"] = {
            type: Sequelize.INTEGER,
            defaultValue: 0
         }
         this.revisionable = true;
         this.refreshAttributes();

         this.addHook("afterCreate", after);
         this.addHook("afterUpdate", after);
         this.addHook("beforeCreate", before);
         this.addHook("beforeUpdate", before);
         return this;
      }
   });

   // Before create/update augment revision
   var before = function(instance, opt){
      var changedValues = instance._changed;
      var changed = Object.keys(changedValues).some((x)=>changedValues[x] === true);

      if(changed === true){
         instance.set(options.revisionAttribute, (instance.get(options.revisionAttribute) || 0) + 1);
      }
   };

   // After create/update store diffs
   var after = function(instance, opt){
      if(instance._changed[options.revisionAttribute] === true){
         var Revision = sequelize.model(options.revisionModel);
         var RevisionChange = sequelize.model(options.revisionChangeModel);

         var previousVersion = instance._previousDataValues;
         var currentVersion = instance.dataValues;
         var user = instance.context && instance.context.user ? instance.context.user.id : null;

         // Get diffs
         var diffs = getDifferences(previousVersion, currentVersion, options.exclude);

         // Build revision
         var revision = Revision.build({
            model: opt.model.name,
            documentId: instance.get("id"),
            revision: instance.get(options.revisionAttribute),
            // Hacky, but necessary to get immutable current representation
            document: JSON.parse(JSON.stringify(currentVersion)),
            // Get user from instance.context, hacky workaround, any better idea?
            userId: options.userModel ? user : null
         });

         // Save revision
         revision.save().then(function(revision){
            // Loop diffs and create a revision-diff for each
            diffs.forEach(function(difference){
               var o = convertToString(difference.lhs);
               var n = convertToString(difference.rhs);
               var d = RevisionChange.build({
                  path: difference.path.join(","),
                  document: difference,
                  //revisionId: data.id,
                  diff: o || n ? jsdiff.diffChars(o, n) : []
               });
               d.save().then(function(d){
                  // Add diff to revision
                  revision.addRevisionChange(d);
               }).catch(log);
            });
         }).catch(log);
      }
   };

   return {
      // Return defineModels()
      defineModels: function(){
         // Revision model
         var Revision = sequelize.define(options.revisionModel, {
            model: {
               type: Sequelize.TEXT,
               allowNull: false
            },
            documentId: {
               type: Sequelize.INTEGER,
               allowNull: false
            },
            revision: {
               type: Sequelize.INTEGER,
               allowNull: false
            },
            document: {
               type: Sequelize.JSON,
               allowNull: false
            }
         });
         // RevisionChange model
         var RevisionChange = sequelize.define(options.revisionChangeModel, {
            path: {
               type: Sequelize.TEXT,
               allowNull: false
            },
            document: {
               type: Sequelize.JSON,
               allowNull: false
            },
            diff: {
               type: Sequelize.JSON,
               allowNull: false
            }
         });
         // Set associations
         Revision.hasMany(RevisionChange, {
            foreignKey: "revisionId",
            constraints: true
         });
         // Associate with user if necessary
         if (options.userModel) {
            Revision.belongsTo(sequelize.model(options.userModel), {
               foreignKey: "userId",
               constraints: true
            });
         }
         return Revision;
      }
   }
}

// Helper: Get differences between objects
var getDifferences = function(current, next, exclude){
   var di = diff(current, next);
   var diffs = di ? di.map(function(i){
      var str = JSON.stringify(i).replace("\"__data\",", "");
      return JSON.parse(str);
   }).filter(function(i){
      return i.path.join(",").indexOf("_") === -1;
   }).filter(function(i){
      return exclude.every(function(x){return i.path.indexOf(x) === -1; });
   }) : [];
   if(diffs.length > 0){
      return diffs;
   }
   else{
      return null;
   }
}

// Helper: Convert value to some senseful string representation for storage
var convertToString = function(val){
   if(typeof val === "undefined" || val === null){
      return "";
   }
   else if(val === true){
      return "1";
   }
   else if(val === false){
      return "0";
   }
   else if(typeof val === "string"){
      return val;
   }
   else if(!isNaN(val)){
      return String(val) + "";
   }
   else if(typeof val === "object"){
      return JSON.stringify(val) + "";
   }
   else if(Array.isArray(val)){
      return JSON.stringify(val) + "";
   }
   return "";
};
