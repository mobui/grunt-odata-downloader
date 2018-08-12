/*
 * grunt-odata-downloader
 * https://github.com/chebotarev_sa/odata-downloader
 *
 * Copyright (c) 2018 Sergey A. Chebotarev
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp']
    },

    // Configuration to be run (and then tested).
    odata_downloader: {
      zmob_elevator_weight: {
        options: {
          url: "https://services.odata.org/V2/Northwind/Northwind.svc/",
          auth: {
            name: "222",
            password: "222",
          },
          metadata: {
             path: "tmp/"
          },
          entyty_set: {
            path: "tmp/mockdata",
            filter: ["*", "!*_*"],
            format: "json",
            transform: "mockdata"
          }
        }
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js']
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'odata_downloader', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
