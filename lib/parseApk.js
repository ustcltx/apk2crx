var $ = require('shelljs');
var parser = require('./badging_parser.js');

module.exports = function parseApk(apk, cb) {

  try {
	
    var manifest = parser.parse($.exec( __dirname+'/trim_aapt.sh '+apk,{silent:true}).output);
     
    cb(null, manifest);
  } catch (e) {
    cb(e);
  }
};
