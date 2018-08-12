/*
 * grunt-odata-downloader
 * https://github.com/chebotarev_sa/odata-downloader
 *
 * Copyright (c) 2018 Sergey A. Chebotarev
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

  const http = require('http');
  const https = require('https');
  const fs = require('fs');
  const url = require('url');
  const path = require('path');
  const parseString = require('xml2js').parseString;
  const async = require('async');
  var minimatch = require("minimatch");


  grunt.registerMultiTask('odata_downloader', 'The best Grunt plugin ever.', function () {

    const options = this.data.options;

    // oData service options
    options.metadata_suffix = "$metadata";
    options.metadata_file = "metadata.xml";
    if(options.url){
      options.metadata_url = url.resolve(options.url, options.metadata_suffix);
      grunt.verbose.ok("Service Metadata Document URL: " + options.metadata_url);
    }else{
      grunt.fail.fatal("oData service ULR not set");
    }

    // metdata target options
    if(options.metadata && options.metadata.path){
      if(!grunt.file.exists(options.metadata.path)){
        grunt.file.mkdir(options.metadata.path);
      }
      options.metadata.full_path = path.resolve(options.metadata.path, options.metadata_file);
      grunt.verbose.ok("Service Metadata Document download path: " + options.metadata.full_path);
    }else{
      grunt.verbose.writeln("Save Service Metadata Document will be skiped, download path not set");
    }

    // entity set data options
    if(options.entyty_set && options.entyty_set.path){
      if(!grunt.file.exists(options.entyty_set.path)){
        grunt.file.mkdir(options.entyty_set.path);
      }
      options.entyty_set.full_path = path.resolve(options.entyty_set.path);
      grunt.verbose.ok("Entity Set Data download path: " + options.entyty_set.full_path);
    }else{
      grunt.verbose.writeln("Save Entity Set data will be skiped, download path not set");
    }

    options.entyty_set.filter = options.entyty_set.filter ? options.entyty_set.filter : [];

    var done = this.async();

    async.waterfall( [ 
        function(callback){
          // Get Service Metadata Document
          grunt.log.writeln("Get Service Metadata Document: " + options.metadata_url)
          getDataByUrl(options.metadata_url, options.auth, callback)
        },
        function(data,callback){
          async.parallel([
            function(cb){
              if(options.metadata && options.metadata.full_path){
                // Save Service Metadata Document
                writeFile(options.metadata.full_path, data, cb);
              }
            },
            function(cb){
              // Buffer to String
              cb(null,data.toString())
            }
          ], function(err, result){
            if(err){
              grunt.fail.fatal(err);
            }
            callback(null, result[1]);
          })
        },
        function(data, callback){
          // parse  Service Metadata Document, get Entiy Set array
          getEntitySets(data,options.entyty_set.filter,callback);
        },
        function(data, callback){
         // download data for Entity Set
        async.each(data, function(entitySetName, cb){
            console.log(entitySetName);
            let entity_url = url.resolve(options.url, entitySetName);
            entity_url  = entity_url  + "?$format=json";
            async.waterfall([
              function(cb1){
                getDataByUrl(entity_url, options.auth, cb1);
              },
              function(data,cb1){
                 fransformEntitySetData(data, cb1);
              },
              function(data, cb1){
                let entity_path = path.resolve(options.entyty_set.full_path, entitySetName+".json");
                writeFile(entity_path, data, cb1);
              }
            ],function(err){
              if(err){
                cb(err);
              }else{
                cb(null);
              }      
            })
          },
          function(err, data){
            console.log(data);
            callback(null);
          })
        } 
      ],
    function(err, result){
      if (err) {
        done(err);
        grunt.fail.fatal(err);
        return;
      }
      done();
    });


    function fransformEntitySetData(data, callback){
      var oData = JSON.parse(data.toString());
      var buffer = Buffer.from(JSON.stringify(oData["d"]["results"], null, 2));
      callback(null, buffer);
    }

    function writeFile(path, data, callback){
      console.log(path);
      fs.open(path, 'w', (err, fd) => {  
        if (err) {
          callback(err); 
        }
        fs.write(fd, data, 0, data.length, null, function(err) {
            if (err){
              callback(err)
              throw 'could not write data: ' + err;
            };
            fs.close(fd, function() {
                callback(null, null);
                console.log('wrote the file successfully');
            });
        });
      });
    }

    function downloadEntityData(base_url, base_path, entitySetName){
      let entity_url = url.resolve(base_url, entitySetName);
      entity_url  = entity_url  + "?$format=json";
      let entity_path = path.resolve(base_path, entitySetName+".json");
      console.log(entity_url );
      getDataByUrl()
    } 

    // parse metadata and get EntitySet array
    function getEntitySets(data, filter, fCallback){
      parseString(data, function (err, result) {
        try{
          var aEntitySet = result['edmx:Edmx']['edmx:DataServices'][0]["Schema"][1]["EntityContainer"][0]["EntitySet"];
          aEntitySet = aEntitySet.map(entity=>entity["$"]["Name"]);
          // filter by options filter
          aEntitySet = aEntitySet.filter(entity=>{
            var include_flag = false;
            var not_exclude_flag = true;
            filter.forEach(element => {
              if(element[0] != '!'){
                include_flag =  include_flag?include_flag: minimatch(entity, element);
              }else{
                not_exclude_flag =  not_exclude_flag? minimatch(entity, element):not_exclude_flag;
              }   
            })
            if(filter.length > 0){
              return include_flag && not_exclude_flag;
            } else{
              return true;
            }
          });
          fCallback(null, aEntitySet);
        } catch(e){
          fCallback(e)
        }
      })
    }

    // get network resource as Buffer 
    function getDataByUrl(sURL, oAuth, fCallback){
      let oURL = new url.URL(sURL);
      let oRequest = null;

      // detect protocol;
      switch(oURL.protocol){
        case "http:":
          oRequest = http;
          break;
        case "https:":
          oRequest = https;
          break;
        default:
          fCallback(new Error("Protocol  " + oURL.protocol +  " not suport"));
      }

      let options = {
        protocol: oURL.protocol,
        host: oURL.host,
        port: oURL.port,
        path: oURL.pathname + oURL.search 
      };

      if(oAuth && oAuth.name && oAuth.password){
        options.auth = oAuth.name + ":" +  oAuth.password
      }

      oRequest.get(options, (res) => {
        let chanck = [];
        res.on('data', (data) => {
          chanck.push(data);
        });
        res.on('end', () => {
          let result = Buffer.concat(chanck);
          if(res.statusCode >= 300 ){
            fCallback(new Error(result.toString()))
          } else {
            fCallback(null, result);
          }
        });
      })
      .on('error', (err) => {
        fCallback(err);
      });
    };

  });
};