var path = require('path');
var fs = require('fs');
var readline = require('readline');

var program = require('commander');
var ncp = require('ncp').ncp;
var chalk = require('chalk');
var rl = readline.createInterface(process.stdin, process.stdout);

var parseApk = require('./lib/parseApk');
var AdmZip=require('adm-zip');
var $ = require('shelljs');
function success() {
  process.exit(0);
}
function md5(file){
	return $.exec("md5sum "+file+" | awk '{print $1}'",{silent:true}).output.trim();
}

module.exports = function (callback) {

  program
    .version('1.0.0')
    .option('-t, --tablet', 'Create a tablet version')
    .option('-s, --scale', 'Enable application window scaling')
    .option('-n, --name [value]', 'Extension display name')
	.option('-b --backup','Create Backup')
    .usage('<path_to_apk_file ...>')
    .parse(process.argv);

  var apk = program.args[0];
  callback = callback || success;

  if (!apk) {
    throw new Error('Please provide a path to an APK file...');
  }

  parseApk(apk, function (err, data) {
   //console.log(data); 
   if (err) {
      console.log(chalk.yellow('Failed to load APK'));
    }
	
    var packageName = null;
    var realname = null;
	var info={};
	var l={};
    try {
      packageName = info.packageName = data.package.name;
      langs = data.locales;
      l['en']=data['application-label'].replace(/¿/, "'");//单引号冲突解决
      if(langs[0]!="-"){
           for(var i = 1; i < langs.length;i++){
              realname=data['application-label-'+langs[i]].replace(/¿/, "'");       
              if(realname && realname!=l['en']){
                l[langs[i]]=realname;
              }
          }
      }
     
      info.names=l;
      info.versionCode=data.package.versionCode;
      info.versionName=data.package.versionName;
      info.icon=data.application['icon'];
     
    } catch (e) {
    console.log(e);
      console.log(chalk.yellow('Failed to parse package name in the APK.'));
    }

    if (!packageName) {
      console.log(chalk.yellow('Unknown APK package.'));
      console.log('Please enter the package name (i.e "com.skype.raider", if you get this wrong your app will NOT work): ');
      rl.prompt();
      rl.on('line', function (text) {
        text = text.trim();

        if (/\.apk$/.test(text)) {
          console.log(chalk.red('Package names do not end with .apk'));
          console.log('They usually look like com.application.developer or com.website.www');
          process.exit(0);
        } else if (text.indexOf(' ') !== -1) {
          console.log(chalk.red('Package names do not contain spaces'));
          console.log('They usually look like com.application.developer or com.website.www');
          process.exit(0);
        }
        else {
          info['packageName']=text;
          createExtension(info,apk);
        }
      })
      .on('close', function () {
        process.exit(0);
      });
    } else {
      createExtension(info,apk);
      //console.log(test);
    }

    function createExtension(info,apk) {
      var packageName = info['packageName'];
      var langs = info['names'];
      var icon_url = info['icon'];
      var templatePath = path.join(__dirname, '_template');
      var appPath = path.join(packageName + '.android');
      var bak = "bak";
	  var tmp=''; 
	  
      // TODO: refactor this if needed in the future
      ncp(templatePath, appPath, function (err) {
        if (err) {
          throw err;
        }

/*set icon*/
		var zip=new AdmZip(apk);
    
		zip.extractEntryTo(icon_url,appPath, /*maintainEntryPath*/false, /*overwrite*/true);

    
              fs.renameSync(path.join(appPath,path.basename(icon_url)),path.join(appPath,"icon.png"));
          /*备份图片和apk*/
		info.apkHash = md5(apk);
		if(program.backup){
		      if(!fs.existsSync(bak)){
		            fs.mkdirSync(bak);
		      }
		      info.iconHash = md5(path.join(appPath,"icon.png")); 
		      fs.writeFileSync(path.join(bak,info.iconHash+".png"), fs.readFileSync(path.join(appPath,"icon.png")));
		      fs.writeFileSync(path.join(bak,info.apkHash+".apk"), fs.readFileSync(apk));
          }
          console.log(JSON.stringify(info));
        fs.writeFileSync(path.join(appPath, 'vendor', 'chromium', 'crx', 'custom-android-release-1400197.apk'), fs.readFileSync(apk));
		
        var manifest = JSON.parse(fs.readFileSync(path.join(templatePath, 'manifest.json')));
        var messages = JSON.parse(fs.readFileSync(path.join(templatePath, '_locales', 'en', 'messages.json')));
        
        manifest.arc_metadata.name = packageName;
        manifest.arc_metadata.packageName = packageName;
        manifest.version = '1337';

        if (program.tablet) {
          manifest.arc_metadata.formFactor = 'tablet';
          manifest.arc_metadata.orientation = 'landscape';
        }

        if (program.scale) {
          manifest.arc_metadata.resize = 'scale';
        }

        fs.writeFileSync(path.join(appPath, 'manifest.json'), JSON.stringify(manifest, null, 2));
        for(key in langs){   
        	if(langs[key]){
        		messages.extName.message = langs[key];
        	}else{
        		messages.extName.message = langs['en'];
        	}
        	tmp=path.join(appPath, '_locales', key);
        	if(!fs.existsSync(tmp)){
        		fs.mkdirSync(tmp);
        	}
        	fs.writeFileSync(path.join(appPath, '_locales', key, 'messages.json'), JSON.stringify(messages, null, 2));
        }
        callback(appPath);
        
      });
      
      
      
    }
  });

};

