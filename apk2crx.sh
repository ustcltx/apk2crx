#!/bin/bash
function program_is_installed {
  if ! type $1 &>/dev/null;then
	echo "Error: $1 is not found"
	exit
  fi
}


usage(){
	 echo "USAGE : ./`basename $0` [-t] [-b] <path_to_apk_file ...>
where:
	-h show help
	-t Create a tablet version
	-b backup apk icon 
"
 	 exit 1 
}

program_is_installed node
program_is_installed openssl


[[ $# -lt 1 ]] && usage  
 
while getopts "bth" OPTION
do
	case $OPTION in
		h) usage
		   exit
		;;
		b) BAK="-b"
		;;	
		t) ADD="-t";HD="-HD"
		;;
	esac
done

myPath=$(dirname $0)
libPath=$myPath/lib
jq=$libPath/jq

file="${@: -1}"
[[ ! -f $file ]] && usage
if [ ! -d "bak" ];then
	mkdir -p bak/
fi

### test apk ###
RE=`LANG=C;jarsigner -verify $file 2>/dev/null | grep "jar verified"`
if [ -z "$RE" ];then
	rm $file 2>/dev/null
	exit 
fi

INFO=`$myPath/main $file $ADD -s $BAK`

APK_PATH=`printf %s "$INFO" | $jq '.packageName' | sed s/\"//g`".android"
versionName=`printf %s "$INFO" | $jq '.versionName '| sed s/\"//g`

MD5=`printf %s "$INFO" | $jq '.apkHash '| sed s/\"//g`

PEM_PATH="bak/$MD5"$HD".pem"

if [ ! -f "$PEM_PATH" ];then
	openssl genrsa -out $PEM_PATH 2>/dev/null
fi

$myPath/tools/crxmake.sh $APK_PATH $PEM_PATH >/dev/null 2>/dev/null

CRX=$APK_PATH".crx"

if [ -f "$CRX" ];then
	MD5_TMP=`expr substr "$MD5" 1 6`

	if [ -n "$BAK" ] && [ ! -f "bak/$MD5.apk" ];then
		mv $file "bak/$MD5.apk"
		else
		rm $file 2>/dev/null
	fi
	if [ -n "$BAK" ];then
		mv $CRX $APK_PATH"-""$versionName""-"$MD5_TMP$HD".crx" 2>/dev/null
		echo $INFO
	fi
fi
if [ ! -n "$BAK" ];then
		rm bak -r 2>/dev/null
fi
## Clean ##
if [ -d "$APK_PATH" ];then  
	rm $APK_PATH -r 2>/dev/null
fi  

